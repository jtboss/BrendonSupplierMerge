import { Decimal } from 'decimal.js';
import {
  MarkupCalculationService,
  MarkupColumn,
  MarkupConfiguration,
  ExcelSheet,
  ExcelRow,
  CellValue,
  ProcessingResult,
  ProcessingError,
} from '@/types';

/**
 * Service for calculating markup prices with precise decimal arithmetic
 * Generates new columns with markup percentages applied to cost prices
 */
export class MarkupCalculationServiceImpl implements MarkupCalculationService {
  /**
   * Calculates markup columns for given data and cost column
   * @param data - Excel sheet data with headers and rows
   * @param costColumnIndex - Index of the cost price column
   * @param config - Markup configuration with percentages and formatting
   * @returns Processing result with markup columns or error
   */
  public calculateMarkupColumns(
    data: ExcelSheet,
    costColumnIndex: number,
    config: MarkupConfiguration
  ): ProcessingResult<readonly MarkupColumn[]> {
    try {
      // Validate inputs
      const validation = this.validateInputs(data, costColumnIndex, config);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error!,
        };
      }

      if (data.length === 0) {
        return {
          success: false,
          error: {
            code: 'EMPTY_DATA',
            message: 'Cannot calculate markup for empty dataset',
          },
        };
      }

      const headers = data[0];
      const dataRows = data.slice(1);

      // Generate markup columns
      const markupColumns: MarkupColumn[] = [];
      let nextColumnIndex = headers.length;

      for (const percentage of config.percentages) {
        const markupColumn: MarkupColumn = {
          percentage,
          columnIndex: nextColumnIndex,
          header: this.generateMarkupHeader(percentage, config.currencySymbol),
        };

        markupColumns.push(markupColumn);
        nextColumnIndex++;
      }

      // Validate that we can calculate markups for the cost column
      const costColumnValidation = this.validateCostColumn(dataRows, costColumnIndex);
      if (!costColumnValidation.isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_COST_COLUMN',
            message: costColumnValidation.message,
          },
        };
      }

      return {
        success: true,
        data: markupColumns,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MARKUP_CALCULATION_ERROR',
          message: `Failed to calculate markup columns: ${this.getErrorMessage(error)}`,
          details: error,
        },
      };
    }
  }

  /**
   * Applies markup calculations to the actual data
   * @param data - Original Excel sheet data
   * @param costColumnIndex - Index of cost price column
   * @param markupColumns - Markup column definitions
   * @param config - Markup configuration
   * @returns New Excel sheet with markup columns added
   */
  public applyMarkupCalculations(
    data: ExcelSheet,
    costColumnIndex: number,
    markupColumns: readonly MarkupColumn[],
    config: MarkupConfiguration
  ): ExcelSheet {
    if (data.length === 0) {
      return data;
    }

    const [headerRow, ...dataRows] = data;
    
    // Debug: Show original structure
    console.log('Original headers before cleaning:', headerRow);
    console.log('Original cost column index:', costColumnIndex);
    console.log('Original detected header:', headerRow[costColumnIndex]);
    
    // Detect and remove empty columns
    const cleanedData = this.removeEmptyColumns([headerRow, ...dataRows]);
    const [cleanedHeaderRow, ...cleanedDataRows] = cleanedData;
    
    // Adjust cost column index after removing empty columns
    const adjustedCostColumnIndex = this.adjustColumnIndex(headerRow, cleanedHeaderRow, costColumnIndex);
    
    // Debug: Log column adjustment
    console.log('Original cost column index:', costColumnIndex);
    console.log('Original header:', headerRow[costColumnIndex]);
    console.log('Adjusted cost column index:', adjustedCostColumnIndex);
    console.log('Cleaned header:', cleanedHeaderRow[adjustedCostColumnIndex]);
    
    // Additional debug: Show all headers to help identify the right column
    console.log('All cleaned headers:', cleanedHeaderRow);
    console.log('Looking for UNIT PRICE or similar...');
    
    // Create new header row with markup columns
    const newHeaders = [
      ...cleanedHeaderRow,
      ...markupColumns.map(col => col.header),
    ];

    // Process each data row
    const newDataRows = cleanedDataRows.map((row: readonly CellValue[]) => {
      const newRow = [...row];
      const costValue = row[adjustedCostColumnIndex];

      for (const markupColumn of markupColumns) {
        const markupPrice = this.calculateSingleMarkup(
          costValue,
          markupColumn.percentage,
          config.decimalPlaces
        );
        // Debug: Log when calculation fails (only for non-text values)
        if (markupPrice === null && costValue !== null && costValue !== undefined && costValue !== '' && 
            typeof costValue === 'number') {
          console.warn('Markup calculation failed for numeric value:', costValue);
        }
        // Push markup price or empty string if calculation failed
        newRow.push(markupPrice !== null ? markupPrice : '');
      }

      return newRow;
    });

    return [newHeaders, ...newDataRows];
  }

  /**
   * Calculates a single markup price from cost and percentage
   * @param costValue - The cost price value
   * @param markupPercentage - Markup percentage (e.g., 20 for 20%)
   * @param decimalPlaces - Number of decimal places to round to
   * @returns Calculated markup price or null if cost is invalid
   */
  public calculateSingleMarkup(
    costValue: CellValue,
    markupPercentage: number,
    decimalPlaces: number
  ): number | null {
    // Validate cost value
    if (costValue === null || costValue === undefined) {
      return null;
    }

    let numericCost: number;
    
    if (typeof costValue === 'number') {
      numericCost = costValue;
    } else if (typeof costValue === 'string') {
      const parsed = this.parseNumericValue(costValue);
      if (parsed === null) {
        return null;
      }
      numericCost = parsed;
    } else {
      // Handle any other types by trying to convert to string first
      const stringValue = String(costValue);
      const parsed = this.parseNumericValue(stringValue);
      if (parsed === null) {
        return null;
      }
      numericCost = parsed;
    }

    // Validate numeric cost - allow zero values for markup calculation
    if (isNaN(numericCost) || !isFinite(numericCost) || numericCost < 0) {
      return null;
    }

    // Return zero for zero cost (no markup)
    if (numericCost === 0) {
      return 0;
    }

    try {
      // Use Decimal.js for precise calculations
      const cost = new Decimal(numericCost);
      const markupMultiplier = new Decimal(markupPercentage).div(100).plus(1);
      const markupPrice = cost.mul(markupMultiplier);
      
      return markupPrice.toDecimalPlaces(decimalPlaces).toNumber();
    } catch (error) {
      // Return null for any calculation errors
      return null;
    }
  }

  /**
   * Validates inputs for markup calculation
   */
  private validateInputs(
    data: ExcelSheet,
    costColumnIndex: number,
    config: MarkupConfiguration
  ): { isValid: boolean; error?: ProcessingError } {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_DATA_FORMAT',
          message: 'Data must be an array of rows',
        },
      };
    }

    if (data.length === 0) {
      return {
        isValid: false,
        error: {
          code: 'EMPTY_DATA',
          message: 'Data cannot be empty',
        },
      };
    }

    const headers = data[0];
    if (!Array.isArray(headers) || headers.length === 0) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_HEADERS',
          message: 'First row must contain column headers',
        },
      };
    }

    if (costColumnIndex < 0 || costColumnIndex >= headers.length) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_COST_COLUMN_INDEX',
          message: `Cost column index ${costColumnIndex} is out of range (0-${headers.length - 1})`,
        },
      };
    }

    if (!Array.isArray(config.percentages) || config.percentages.length === 0) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_MARKUP_PERCENTAGES',
          message: 'Markup percentages must be a non-empty array',
        },
      };
    }

    for (const percentage of config.percentages) {
      if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 0) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_MARKUP_PERCENTAGE',
            message: `Invalid markup percentage: ${percentage}. Must be a non-negative number`,
          },
        };
      }
    }

    if (typeof config.decimalPlaces !== 'number' || config.decimalPlaces < 0 || config.decimalPlaces > 10) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_DECIMAL_PLACES',
          message: 'Decimal places must be a number between 0 and 10',
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Validates that the cost column contains usable numeric data
   */
  private validateCostColumn(
    dataRows: readonly ExcelRow[],
    costColumnIndex: number
  ): { isValid: boolean; message: string } {
    if (dataRows.length === 0) {
      return {
        isValid: false,
        message: 'No data rows available for cost column validation',
      };
    }

    let validCostValues = 0;
    let totalRows = 0;

    for (const row of dataRows) {
      if (Array.isArray(row) && row.length > costColumnIndex) {
        totalRows++;
        const costValue = row[costColumnIndex];
        
        if (this.isValidCostValue(costValue)) {
          validCostValues++;
        }
      }
    }

    if (totalRows === 0) {
      return {
        isValid: false,
        message: 'Cost column contains no data',
      };
    }

         const validRatio = validCostValues / totalRows;
     if (validRatio < 0.005) {
       return {
         isValid: false,
         message: `Cost column contains too few valid numeric values (${Math.round(validRatio * 100)}% valid, minimum 0.5% required)`,
       };
     }

    return { isValid: true, message: '' };
  }

  /**
   * Checks if a value is a valid cost price
   */
  private isValidCostValue(value: CellValue): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value) && value >= 0;
    }

         if (typeof value === 'string') {
       const parsed = this.parseNumericValue(value);
       return parsed !== null && parsed >= 0;
     }

     // Handle Date objects that might contain numeric values
     if (value instanceof Date) {
       return false; // Dates are not valid cost values
     }

    return false;
  }

  /**
   * Parses a string value as a number (handles currency symbols, etc.)
   */
     private parseNumericValue(value: string): number | null {
     if (!value) {
       return null;
     }

     // Convert to string if it's not already
     const stringValue = String(value).trim();
     
     // Handle empty or clearly non-numeric values
     if (stringValue === '' || stringValue === '-' || stringValue === 'N/A' || stringValue === 'n/a' || 
         stringValue === 'NULL' || stringValue === 'null' || stringValue === '#N/A' || stringValue === 'TBC' ||
         stringValue === 'tbc' || stringValue === 'TBA' || stringValue === 'tba' || stringValue === 'POA' ||
         stringValue === 'poa' || stringValue === 'CALL' || stringValue === 'call') {
       return null;
     }

     // Try parsing as a simple number first (handles most common cases like "27", "42", "110", "719.8505568")
     const directParse = parseFloat(stringValue);
     if (!isNaN(directParse) && isFinite(directParse)) {
       // Don't use Math.abs here - keep the original value for debugging
       return directParse >= 0 ? directParse : Math.abs(directParse);
     }

     // If direct parsing failed, try cleaning the string more aggressively
     let cleaned = stringValue
       .replace(/[$£€¥₹R]/gi, '') // Currency symbols (case insensitive)
       .replace(/[,\s\u00A0\u2000-\u200B\u2028\u2029]/g, '') // Commas, spaces, and various Unicode spaces
       .replace(/[()]/g, '') // Parentheses
       .replace(/['"]/g, '') // Quotes
       .replace(/[^\d.-]/g, ''); // Remove any non-numeric characters except dots and minus

     // Handle empty string after cleaning
     if (!cleaned) {
       return null;
     }

     // Handle percentage values (convert to decimal)
     if (stringValue.includes('%')) {
       const numericPart = cleaned.replace(/%/g, '');
       const parsed = parseFloat(numericPart);
       if (!isNaN(parsed) && isFinite(parsed)) {
         return parsed / 100; // Convert percentage to decimal
       }
       return null;
     }

     // Final attempt with cleaned value
     const finalParse = parseFloat(cleaned);
     if (!isNaN(finalParse) && isFinite(finalParse)) {
       return finalParse >= 0 ? finalParse : Math.abs(finalParse);
     }

     return null;
   }

  /**
   * Removes empty columns from the data (more conservative approach)
   */
  private removeEmptyColumns(data: ExcelSheet): ExcelSheet {
    if (data.length === 0) {
      return data;
    }

    const maxColumns = Math.max(...data.map(row => row.length));
    const columnsToKeep: number[] = [];

    // Check each column to see if it has meaningful data
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      let hasData = false;
      let nonEmptyCount = 0;
      
      for (const row of data) {
        const cellValue = row[colIndex];
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          nonEmptyCount++;
          hasData = true;
        }
      }
      
      // Keep column if it has ANY data OR if it's a header that looks important
      const header = data[0] && data[0][colIndex];
      const headerStr = String(header || '').toLowerCase();
      const isImportantHeader = headerStr.includes('price') || headerStr.includes('cost') || 
                               headerStr.includes('unit') || headerStr.includes('amount') ||
                               headerStr.includes('value') || headerStr.includes('carton');
      
      // Keep column if it has data OR if header suggests it might contain prices
      if (hasData || isImportantHeader) {
        columnsToKeep.push(colIndex);
        console.log(`Keeping column ${colIndex}: header="${header}", hasData=${hasData}, nonEmptyCount=${nonEmptyCount}`);
      } else {
        console.log(`Removing column ${colIndex}: header="${header}", completely empty`);
      }
    }

    console.log('Columns to keep:', columnsToKeep);
    
    // Return data with only meaningful columns
    return data.map(row => columnsToKeep.map(colIndex => row[colIndex] || ''));
  }

  /**
   * Adjusts column index after removing empty columns
   */
  private adjustColumnIndex(
    originalHeaders: readonly CellValue[],
    cleanedHeaders: readonly CellValue[],
    originalIndex: number
  ): number {
    if (originalIndex >= originalHeaders.length) {
      return this.findBestPriceColumn(cleanedHeaders);
    }

    const originalHeader = originalHeaders[originalIndex];
    const newIndex = cleanedHeaders.findIndex(header => header === originalHeader);
    
    // If we can't find the original header, try to find a better price column
    if (newIndex < 0) {
      return this.findBestPriceColumn(cleanedHeaders);
    }
    
    // Verify the found column actually looks like a price column
    const headerStr = String(cleanedHeaders[newIndex] || '').toLowerCase();
    const isPriceHeader = headerStr.includes('price') || headerStr.includes('cost') || headerStr.includes('unit');
    
    if (!isPriceHeader) {
      console.warn('Detected column does not look like a price column:', cleanedHeaders[newIndex]);
      return this.findBestPriceColumn(cleanedHeaders);
    }
    
    return newIndex;
  }

  /**
   * Finds the best price column from available headers
   */
  private findBestPriceColumn(headers: readonly CellValue[]): number {
    const priceKeywords = [
      'unit price',
      'price for carton',
      'price for',
      'unit cost',
      'selling price',
      'list price', 
      'price',
      'cost',
      'amount',
      'value'
    ];
    
    console.log('Searching for price column in headers:', headers);
    
    for (const keyword of priceKeywords) {
      const index = headers.findIndex(header => 
        String(header || '').toLowerCase().includes(keyword.toLowerCase())
      );
      if (index >= 0) {
        console.log('Found better price column:', headers[index], 'at index:', index);
        return index;
      }
    }
    
    // If no specific price keyword found, look for columns with numeric data
    console.log('No price keyword found, checking for numeric columns...');
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '');
      // Skip obvious non-price columns
      if (header.toLowerCase().includes('code') || 
          header.toLowerCase().includes('description') ||
          header.toLowerCase().includes('size') ||
          header.toLowerCase().includes('colour') ||
          header.toLowerCase().includes('availability') ||
          header.toLowerCase().includes('effective') ||
          header.toLowerCase().includes('remark')) {
        continue;
      }
      
      console.log('Considering column for numeric data:', header, 'at index:', i);
      return i; // Return first non-excluded column
    }
    
    console.warn('Could not find a good price column, using index 0');
    return 0;
  }

  /**
   * Generates a header name for a markup column
   */
  private generateMarkupHeader(percentage: number, currencySymbol?: string): string {
    const symbol = currencySymbol || '';
    const percentageStr = percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(1);
    return `${symbol}${percentageStr}% Markup`;
  }

  /**
   * Extracts error message from unknown error type
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
export const markupCalculationService = new MarkupCalculationServiceImpl(); 