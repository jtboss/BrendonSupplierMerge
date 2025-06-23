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

      // Add worksheet for each completed pricelist
      for (const pricelist of pricelists) {
        if (pricelist.status === 'completed' && pricelist.processedData) {
          const worksheetName = this.generateWorksheetName(pricelist.filename, worksheetCount);
          // Use processed data with markup columns if available, otherwise use original data
          const dataToExport = pricelist.processedData.dataWithMarkup || pricelist.originalData;
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