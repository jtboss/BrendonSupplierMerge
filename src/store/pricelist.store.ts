import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  PricelistStore,
  SupplierPricelist,
  ProcessingStatus,
  ExportConfiguration,
  MarkupConfiguration,
  ProcessedData,
  DEFAULT_MARKUP_PERCENTAGES,
} from '@/types';
import { excelParsingService } from '@/services/excel-parsing.service';
import { costPriceDetectionService } from '@/services/cost-price-detection.service';
import { markupCalculationService } from '@/services/markup-calculation.service';
import { excelExportService } from '@/services/excel-export.service';

interface PricelistStoreState extends PricelistStore {
  // Internal state
  _nextId: number;
  // Internal methods
  parseAndProcessFile: (id: string, file: File) => Promise<void>;
  processIndividualFile: (id: string) => Promise<void>;
}

/**
 * Zustand store for managing pricelist application state
 * Handles file uploads, processing, and export operations
 */
export const usePricelistStore = create<PricelistStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    files: [],
    isProcessing: false,
    globalProgress: 0,
    errors: [],
    markupConfig: {
      percentages: DEFAULT_MARKUP_PERCENTAGES,
      decimalPlaces: 2,
      currencySymbol: 'R',
    },
    _nextId: 1,

    // Actions
    addFiles: async (files: File[]) => {
      const { _nextId } = get();
      const newPricelists: SupplierPricelist[] = [];
      let nextId = _nextId;

      for (const file of files) {
        const pricelist: SupplierPricelist = {
          id: `pricelist-${nextId++}`,
          filename: file.name,
          originalData: [],
          status: 'idle',
          progress: 0,
          errors: [],
          uploadedAt: new Date(),
        };

        newPricelists.push(pricelist);

        // Start parsing immediately
        setTimeout(() => {
          get().parseAndProcessFile(pricelist.id, file);
        }, 100);
      }

      set((state) => ({
        files: [...state.files, ...newPricelists],
        _nextId: nextId,
      }));
    },

    removeFile: (id: string) => {
      set((state) => ({
        files: state.files.filter((file) => file.id !== id),
      }));
    },

    updateCostColumn: (id: string, columnIndex: number) => {
      set((state) => ({
        files: state.files.map((file) =>
          file.id === id && file.processedData
            ? {
                ...file,
                processedData: {
                  ...file.processedData,
                  detectedCostColumn: columnIndex,
                },
              }
            : file
        ),
      }));
    },

    processFiles: async () => {
      const { files } = get();
      const unprocessedFiles = files.filter((file) => file.status === 'idle');

      if (unprocessedFiles.length === 0) {
        return;
      }

      set({ isProcessing: true, globalProgress: 0 });

      try {
        for (let i = 0; i < unprocessedFiles.length; i++) {
          const file = unprocessedFiles[i];
          await get().processIndividualFile(file.id);
          
          const progress = ((i + 1) / unprocessedFiles.length) * 100;
          set({ globalProgress: progress });
        }
      } finally {
        set({ isProcessing: false, globalProgress: 100 });
      }
    },

    exportConsolidated: async (config: ExportConfiguration) => {
      const { files } = get();
      
      const result = await excelExportService.generateConsolidatedWorkbook(files, config);
      
      if (result.success) {
        // Trigger download
        const url = URL.createObjectURL(result.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = config.filename || 'consolidated-pricelists.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        set((state) => ({
          errors: [...state.errors, result.error],
        }));
      }
    },

    clearErrors: () => {
      set({ errors: [] });
    },

    updateMarkupConfig: (config: Partial<MarkupConfiguration>) => {
      set((state) => ({
        markupConfig: { ...state.markupConfig, ...config },
      }));
    },

    reset: () => {
      set({
        files: [],
        isProcessing: false,
        globalProgress: 0,
        errors: [],
        markupConfig: {
          percentages: DEFAULT_MARKUP_PERCENTAGES,
          decimalPlaces: 2,
          currencySymbol: 'R',
        },
        _nextId: 1,
      });
    },

    // Internal helper methods
    parseAndProcessFile: async (id: string, file: File) => {
      // Update status to parsing
      set((state) => ({
        files: state.files.map((f) =>
          f.id === id ? { ...f, status: 'parsing' as ProcessingStatus, progress: 10 } : f
        ),
      }));

      // Parse the file
      const parseResult = await excelParsingService.parseFile(file);
      
      if (!parseResult.success) {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  errors: [parseResult.error],
                }
              : f
          ),
        }));
        return;
      }

      // Update with parsed data
      set((state) => ({
        files: state.files.map((f) =>
          f.id === id
            ? {
                ...f,
                originalData: parseResult.data,
                status: 'detecting',
                progress: 50,
              }
            : f
        ),
      }));

      // Process the parsed data
      await get().processIndividualFile(id);
    },

    processIndividualFile: async (id: string) => {
      const { files, markupConfig } = get();
      const file = files.find((f) => f.id === id);
      
      if (!file || file.originalData.length === 0) {
        return;
      }

      try {
        // Update status to detecting
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, status: 'detecting' as ProcessingStatus, progress: 60 } : f
          ),
        }));

        const headers = file.originalData[0];
        const dataRows = file.originalData.slice(1);

        // Detect cost price column
        const stringHeaders = headers.map(h => String(h || ''));
        const detection = costPriceDetectionService.detectCostPriceColumn(stringHeaders, dataRows);

        // Update status to calculating
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, status: 'calculating' as ProcessingStatus, progress: 80 } : f
          ),
        }));

        // Calculate markup columns
        const markupResult = markupCalculationService.calculateMarkupColumns(
          file.originalData,
          detection.columnIndex,
          markupConfig
        );

        if (!markupResult.success) {
          set((state) => ({
            files: state.files.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: 'error',
                    progress: 0,
                    errors: [markupResult.error],
                  }
                : f
            ),
          }));
          return;
        }

        // Apply markup calculations to the data
        const dataWithMarkup = markupCalculationService.applyMarkupCalculations(
          file.originalData,
          detection.columnIndex,
          markupResult.data,
          markupConfig
        );

        // Create processed data
        const processedData: ProcessedData = {
          headers: headers.map(String),
          rows: dataRows,
          totalRows: dataRows.length,
          detectedCostColumn: detection.columnIndex,
          confidence: detection.confidence,
          markupColumns: markupResult.data,
          dataWithMarkup,
        };

        // Update with completed processing
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id
              ? {
                  ...f,
                  processedData,
                  status: 'completed',
                  progress: 100,
                  processedAt: new Date(),
                }
              : f
          ),
        }));
      } catch (error) {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  errors: [
                    {
                      code: 'PROCESSING_ERROR',
                      message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    },
                  ],
                }
              : f
          ),
        }));
      }
    },
  }))
); 