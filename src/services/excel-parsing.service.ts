import * as XLSX from 'xlsx';
import {
  ExcelParsingService,
  ExcelSheet,
  ProcessingResult,
  ValidationResult,

  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_ROWS_PER_FILE,
} from '@/types';

/**
 * Service for parsing and validating Excel files
 * Handles file validation, parsing, and data extraction with error handling
 */
export class ExcelParsingServiceImpl implements ExcelParsingService {
  /**
   * Validates an Excel file before processing
   * @param file - The file to validate
   * @returns Validation result with success status and any errors
   */
  public validateFile(file: File): ValidationResult {
    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      return {
        isValid: false,
        error: `Invalid file type. Only Excel files (.xlsx, .xls) are allowed. Received: ${file.type}`,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = Math.round(file.size / (1024 * 1024));
      const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
      return {
        isValid: false,
        error: `File size (${sizeMB}MB) exceeds maximum limit of ${maxSizeMB}MB`,
      };
    }

    // Check for empty file
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'File is empty',
      };
    }

    return { isValid: true };
  }

  /**
   * Parses an Excel file and extracts data
   * @param file - The Excel file to parse
   * @returns Processing result with extracted data or error
   */
  public async parseFile(file: File): Promise<ProcessingResult<ExcelSheet>> {
    try {
      // Validate file first
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'FILE_VALIDATION_ERROR',
            message: validation.error!,
            filename: file.name,
          },
        };
      }

      // Read file as array buffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      // Parse with SheetJS
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        codepage: 65001, // UTF-8 encoding
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          error: {
            code: 'NO_WORKSHEETS',
            message: 'Excel file contains no worksheets',
            filename: file.name,
          },
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        return {
          success: false,
          error: {
            code: 'EMPTY_WORKSHEET',
            message: 'First worksheet is empty',
            filename: file.name,
          },
        };
      }

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        blankrows: false,
      }) as unknown[][];

      // Validate data structure
      if (jsonData.length === 0) {
        return {
          success: false,
          error: {
            code: 'EMPTY_DATA',
            message: 'No data found in the Excel file',
            filename: file.name,
          },
        };
      }

      if (jsonData.length > MAX_ROWS_PER_FILE) {
        return {
          success: false,
          error: {
            code: 'TOO_MANY_ROWS',
            message: `File contains ${jsonData.length} rows, maximum allowed is ${MAX_ROWS_PER_FILE}`,
            filename: file.name,
          },
        };
      }

      // Find the actual header row using smart detection
      const headerRowIndex = this.findHeaderRow(jsonData);
      console.log(`Smart header detection found header at row: ${headerRowIndex}`);
      
      if (headerRowIndex === -1) {
        return {
          success: false,
          error: {
            code: 'NO_HEADERS_FOUND',
            message: 'Could not identify column headers in the Excel file',
            filename: file.name,
          },
        };
      }

      // Extract data starting from the header row
      const dataWithHeaders = jsonData.slice(headerRowIndex);
      
      // Ensure we have at least headers and one data row
      if (dataWithHeaders.length < 2) {
        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_DATA',
            message: 'File must contain at least a header row and one data row',
            filename: file.name,
          },
        };
      }

      // Clean and normalize data
      const cleanedData = this.cleanExcelData(dataWithHeaders);

      return {
        success: true,
        data: cleanedData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PARSING_ERROR',
          message: `Failed to parse Excel file: ${this.getErrorMessage(error)}`,
          filename: file.name,
          details: error,
        },
      };
    }
  }

  /**
   * Reads a file as ArrayBuffer using FileReader
   * @param file - The file to read
   * @returns Promise that resolves to ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('FileReader error occurred'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Finds the actual header row in the Excel data using intelligent detection
   * @param rawData - Raw data from Excel parsing
   * @returns Index of the header row, or -1 if not found
   */
  private findHeaderRow(rawData: unknown[][]): number {
    // Common header keywords to look for
    const headerKeywords = [
      // Generic columns
      'name', 'code', 'id', 'description', 'item', 'product', 'style',
      // Price related
      'price', 'cost', 'unit', 'amount', 'value', 'rate', 'total',
      // Quantity related  
      'qty', 'quantity', 'stock', 'availability', 'carton', 'pack',
      // Attributes
      'size', 'colour', 'color', 'brand', 'category', 'type', 'model',
      // Additional common headers
      'supplier', 'vendor', 'manufacturer', 'sku', 'barcode', 'ref'
    ];

    // Look through the first 10 rows to find headers
    const maxRowsToCheck = Math.min(10, rawData.length);
    let bestHeaderRow = -1;
    let bestScore = 0;

    for (let rowIndex = 0; rowIndex < maxRowsToCheck; rowIndex++) {
      const row = rawData[rowIndex];
      if (!row || row.length === 0) continue;

      // Score this row based on how "header-like" it is
      let score = 0;
      let nonNullCount = 0;
      let headerMatchCount = 0;

      for (const cell of row) {
        if (cell !== null && cell !== undefined && cell !== '') {
          nonNullCount++;
          
          const cellStr = String(cell).toLowerCase().trim();
          
          // Check if this cell matches any header keywords
          for (const keyword of headerKeywords) {
            if (cellStr.includes(keyword)) {
              headerMatchCount++;
              score += 10; // High score for matching keywords
              break;
            }
          }

          // Bonus points for certain patterns
          if (cellStr.includes('price') || cellStr.includes('cost')) {
            score += 15; // Extra bonus for price columns
          }
          if (cellStr.includes('unit') && (cellStr.includes('price') || cellStr.includes('cost'))) {
            score += 20; // Extra bonus for "unit price" type columns
          }
          
          // Penalize purely numeric or date values (less likely to be headers)
          if (!isNaN(Number(cellStr)) || cellStr.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
            score -= 5;
          }
        }
      }

      // Bonus for having multiple non-null values (good header rows have many columns)
      if (nonNullCount >= 3) {
        score += nonNullCount * 2;
      }

      // Bonus for having header-like words
      if (headerMatchCount >= 2) {
        score += headerMatchCount * 5;
      }

      console.log(`Row ${rowIndex} score: ${score}, non-null: ${nonNullCount}, header matches: ${headerMatchCount}`);
      console.log(`Row ${rowIndex} content:`, row.slice(0, 10)); // Log first 10 cells

      if (score > bestScore) {
        bestScore = score;
        bestHeaderRow = rowIndex;
      }
    }

    console.log(`Best header row: ${bestHeaderRow} with score: ${bestScore}`);
    return bestHeaderRow;
  }

  /**
   * Cleans and normalizes Excel data
   * @param rawData - Raw data from Excel parsing
   * @returns Cleaned Excel sheet data
   */
  private cleanExcelData(rawData: unknown[][]): ExcelSheet {
    return rawData.map((row) => {
      return row.map((cell) => {
        // Handle various cell types
        if (cell === undefined || cell === '') {
          return null;
        }
        
        // Convert Excel dates to JavaScript dates
        if (cell instanceof Date) {
          return cell;
        }
        
        // Handle boolean values
        if (typeof cell === 'boolean') {
          return cell;
        }
        
        // Handle numeric values
        if (typeof cell === 'number') {
          return cell;
        }
        
        // Handle string values (including those that might be numeric)
        if (typeof cell === 'string') {
          const trimmed = cell.trim();
          
          // Try to parse as number if it looks numeric
          const numericValue = this.parseNumericValue(trimmed);
          if (numericValue !== null) {
            return numericValue;
          }
          
          return trimmed;
        }
        
        // For any other types, convert to string or return null
        if (cell === null) {
          return null;
        }
        
        return String(cell);
      });
    });
  }

  /**
   * Attempts to parse a string value as a number
   * @param value - String value to parse
   * @returns Parsed number or null if not numeric
   */
  private parseNumericValue(value: string): number | null {
    // Remove common currency symbols and separators
    const cleaned = value
      .replace(/[$£€¥₹]/g, '') // Currency symbols
      .replace(/[,\s]/g, '') // Commas and spaces
      .replace(/[()]/g, ''); // Parentheses (for negative values)
    
    // Check if it looks like a number
    if (/^-?\d*\.?\d+$/.test(cleaned)) {
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && isFinite(parsed)) {
        return parsed;
      }
    }
    
    return null;
  }

  /**
   * Extracts error message from unknown error type
   * @param error - The error to extract message from
   * @returns Error message string
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }
}

// Export singleton instance
export const excelParsingService = new ExcelParsingServiceImpl(); 