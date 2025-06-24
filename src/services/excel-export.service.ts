import * as XLSX from 'xlsx';
import {
  ExcelExportService,
  SupplierPricelist,
  ProcessingResult,
} from '@/types';

/**
 * Service for exporting processed pricelists to consolidated Excel workbooks
 */
export class ExcelExportServiceImpl implements ExcelExportService {
  /**
   * Generates a consolidated Excel workbook from multiple supplier pricelists
   */
  public async generateConsolidatedWorkbook(
    pricelists: readonly SupplierPricelist[]
  ): Promise<ProcessingResult<Blob>> {
    try {
      if (pricelists.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_PRICELISTS',
            message: 'No pricelists provided for export',
          },
        };
      }

      const workbook = XLSX.utils.book_new();
      let worksheetCount = 0;
      const completedPricelists = pricelists.filter(p => p.status === 'completed' && p.processedData);

      // Add Master worksheet first (consolidated data from all pricelists)
      if (completedPricelists.length > 0) {
        const masterData = this.generateMasterData(completedPricelists);
        const masterWorksheet = XLSX.utils.aoa_to_sheet(masterData);
        
        // Apply formatting to master worksheet
        if (masterData[0]) {
          const columnWidths = masterData[0].map(() => ({ wch: 15 }));
          masterWorksheet['!cols'] = columnWidths;
        }
        
        XLSX.utils.book_append_sheet(workbook, masterWorksheet, 'Master');
      }

      // Add worksheet for each completed pricelist
      for (const pricelist of completedPricelists) {
        const worksheetName = this.generateWorksheetName(pricelist.filename, worksheetCount);
        const dataToExport = this.generateWorksheetData(pricelist);
        
        // Convert readonly array to mutable array for XLSX
        const mutableData = dataToExport.map(row => [...row]);
        const worksheet = XLSX.utils.aoa_to_sheet(mutableData);
        
        // Apply basic formatting
        if (dataToExport[0]) {
          const columnWidths = dataToExport[0].map(() => ({ wch: 15 }));
          worksheet['!cols'] = columnWidths;
        }
        
        XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);
        worksheetCount++;
      }

      if (worksheetCount === 0) {
        return {
          success: false,
          error: {
            code: 'NO_DATA_TO_EXPORT',
            message: 'No completed pricelists with data available for export',
          },
        };
      }

      // Generate Excel buffer
      const buffer = XLSX.write(workbook, {
        type: 'array',
        bookType: 'xlsx',
      });

      // Create blob
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      return {
        success: true,
        data: blob,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: `Failed to generate workbook: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

    private generateMasterData(pricelists: readonly SupplierPricelist[]): string[][] {
    const masterRows: string[][] = [];
    
    // Create master headers by combining all unique headers and adding markup columns
    const allHeaders = new Set<string>();
    const markupPercentages = [5, 10, 15, 20, 30]; // Default markup percentages
    
    // Collect all unique headers from all pricelists (excluding empty headers)
    pricelists.forEach(pricelist => {
      if (pricelist.originalData && pricelist.originalData.length > 0) {
        // First row contains headers
        const headers = pricelist.originalData[0];
        headers.forEach(header => {
          const headerStr = String(header || '').trim();
          if (headerStr) { // Only add non-empty headers
            allHeaders.add(headerStr);
          }
        });
      }
    });
    
    // Create master header row
    const masterHeaders = [
      'Source File',
      ...Array.from(allHeaders),
      'Cost Price',
      ...markupPercentages.map(p => `${p}% Markup`)
    ];
    masterRows.push(masterHeaders);
    
    // Add data from all pricelists
    pricelists.forEach(pricelist => {
      if (pricelist.originalData && pricelist.processedData && pricelist.originalData.length > 1) {
        const { detectedCostColumn } = pricelist.processedData;
        const headers = pricelist.originalData[0];
        const dataRows = pricelist.originalData.slice(1); // Skip header row
        
        dataRows.forEach((row: readonly unknown[]) => {
          const masterRow: string[] = [];
          
          // Add source file name
          masterRow.push(pricelist.filename);
          
          // Add data for each header in master headers order
          Array.from(allHeaders).forEach(header => {
            const headerIndex = headers.findIndex(h => String(h || '').trim() === header);
            const cellValue = headerIndex >= 0 ? row[headerIndex] : '';
            masterRow.push(String(cellValue || ''));
          });
          
          // Add cost price - try detected column first, then fallback to any price column
          let costPrice: number | undefined;
          
          if (detectedCostColumn !== undefined && row[detectedCostColumn]) {
            costPrice = parseFloat(row[detectedCostColumn]?.toString() || '0');
          } else {
            // Fallback: look for any column with "price" in header
            const priceColumnIndex = headers.findIndex(h => 
              String(h || '').toLowerCase().includes('price')
            );
            if (priceColumnIndex >= 0 && row[priceColumnIndex]) {
              costPrice = parseFloat(row[priceColumnIndex]?.toString() || '0');
            }
          }
          
          masterRow.push(costPrice !== undefined && !isNaN(costPrice) ? costPrice.toFixed(2) : '');
          
          // Add markup prices
          if (costPrice !== undefined && !isNaN(costPrice)) {
            markupPercentages.forEach(percentage => {
              const markupPrice = costPrice * (1 + percentage / 100);
              masterRow.push(markupPrice.toFixed(2));
            });
          } else {
            markupPercentages.forEach(() => masterRow.push(''));
          }
          
          masterRows.push(masterRow);
        });
      }
    });
    
    return masterRows;
  }

    private generateWorksheetData(pricelist: SupplierPricelist): string[][] {
    if (!pricelist.originalData || !pricelist.processedData || pricelist.originalData.length === 0) {
      return [];
    }
    
    const { detectedCostColumn } = pricelist.processedData;
    const markupPercentages = [5, 10, 15, 20, 30]; // Default markup percentages
    const headers = pricelist.originalData[0];
    const dataRows = pricelist.originalData.slice(1); // Skip header row
    
    // Create headers with markup columns (filter out empty headers)
    const filteredHeaders = headers
      .map(h => String(h || '').trim())
      .filter(h => h); // Remove empty headers
    
    const worksheetHeaders = [
      ...filteredHeaders,
      'Cost Price',
      ...markupPercentages.map(p => `${p}% Markup`)
    ];
    
    const worksheetData: string[][] = [worksheetHeaders];
    
    // Add data rows with markup calculations
    dataRows.forEach((row: readonly unknown[]) => {
      const worksheetRow: string[] = [];
      
      // Add original data (only for non-empty header columns)
      headers.forEach((header, index) => {
        const headerStr = String(header || '').trim();
        if (headerStr) { // Only include data for non-empty headers
          worksheetRow.push(String(row[index] || ''));
        }
      });
      
      // Add cost price - try detected column first, then fallback to any price column
      let costPrice: number | undefined;
      
      if (detectedCostColumn !== undefined && row[detectedCostColumn]) {
        costPrice = parseFloat(row[detectedCostColumn]?.toString() || '0');
      } else {
        // Fallback: look for any column with "price" in header
        const priceColumnIndex = headers.findIndex(h => 
          String(h || '').toLowerCase().includes('price')
        );
        if (priceColumnIndex >= 0 && row[priceColumnIndex]) {
          costPrice = parseFloat(row[priceColumnIndex]?.toString() || '0');
        }
      }
      
      worksheetRow.push(costPrice !== undefined && !isNaN(costPrice) ? costPrice.toFixed(2) : '');
      
      // Add markup prices
      if (costPrice !== undefined && !isNaN(costPrice)) {
        markupPercentages.forEach(percentage => {
          const markupPrice = costPrice * (1 + percentage / 100);
          worksheetRow.push(markupPrice.toFixed(2));
        });
      } else {
        markupPercentages.forEach(() => worksheetRow.push(''));
      }
      
      worksheetData.push(worksheetRow);
    });
    
    return worksheetData;
  }

  private generateWorksheetName(filename: string, index: number): string {
    let name = filename.replace(/\.[^/.]+$/, '');
    name = name.replace(/[\\\/\*\?\[\]:]/g, '_');
    
    if (name.length > 25) {
      name = name.substring(0, 25);
    }
    
    return name || `Sheet${index + 1}`;
  }
}

export const excelExportService = new ExcelExportServiceImpl(); 