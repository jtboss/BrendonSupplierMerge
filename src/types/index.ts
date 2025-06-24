/**
 * Core data types for the Supplier Pricelist Merger application
 */

// Base Excel data structures
export type CellValue = string | number | Date | boolean | null;
export type ExcelRow = readonly CellValue[];
export type ExcelSheet = readonly ExcelRow[];

// File processing status
export type ProcessingStatus = 
  | 'idle'
  | 'validating'
  | 'parsing'
  | 'detecting'
  | 'calculating'
  | 'generating'
  | 'completed'
  | 'error';

// Error handling
export interface ProcessingError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly filename?: string;
}

// File validation
export interface ValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
  readonly warnings?: readonly string[];
}

// Cost price detection
export interface DetectionResult {
  readonly columnIndex: number;
  readonly confidence: number;
  readonly detectionMethod: DetectionMethod;
  readonly alternativeColumns?: readonly number[];
}

export type DetectionMethod = 
  | 'header_exact_match'
  | 'header_partial_match'
  | 'data_pattern_match'
  | 'position_heuristic'
  | 'user_selected'
  | 'forced_numeric';

export interface DetectionOptions {
  readonly minConfidence?: number;
  readonly requiredDataRows?: number;
  readonly customPriceKeywords?: readonly string[];
}

// Markup calculations
export interface MarkupColumn {
  readonly percentage: number;
  readonly columnIndex: number;
  readonly header: string;
}

export interface MarkupConfiguration {
  readonly percentages: readonly number[];
  readonly decimalPlaces: number;
  readonly currencySymbol?: string;
}

// Processed data structures
export interface ProcessedData {
  readonly headers: readonly string[];
  readonly rows: readonly ExcelRow[];
  readonly totalRows: number;
  readonly detectedCostColumn: number;
  readonly confidence: number;
  readonly markupColumns: readonly MarkupColumn[];
  readonly dataWithMarkup: ExcelSheet; // Data with markup columns applied
}

export interface SupplierPricelist {
  readonly id: string;
  readonly filename: string;
  readonly originalData: ExcelSheet;
  readonly processedData?: ProcessedData;
  readonly status: ProcessingStatus;
  readonly progress: number;
  readonly errors: readonly ProcessingError[];
  readonly uploadedAt: Date;
  readonly processedAt?: Date;
}

// Application state
export interface AppState {
  readonly files: readonly SupplierPricelist[];
  readonly isProcessing: boolean;
  readonly globalProgress: number;
  readonly errors: readonly ProcessingError[];
  readonly markupConfig: MarkupConfiguration;
}

// Processing results
export type ProcessingResult<T> = {
  readonly success: true;
  readonly data: T;
} | {
  readonly success: false;
  readonly error: ProcessingError;
};

// Excel export configuration
export interface ExportConfiguration {
  readonly includeOriginalData: boolean;
  readonly includeMarkupColumns: boolean;
  readonly separateWorksheets: boolean;
  readonly includeSummarySheet: boolean;
  readonly filename?: string;
}

// UI component props types
export interface FileUploadZoneProps {
  readonly onFilesSelected: (files: File[]) => void;
  readonly maxFiles?: number;
  readonly maxFileSize?: number;
  readonly disabled?: boolean;
  readonly className?: string;
}

export interface ProcessingProgressProps {
  readonly files: readonly SupplierPricelist[];
  readonly globalProgress: number;
  readonly isProcessing: boolean;
}

export interface PricelistPreviewProps {
  readonly pricelist: SupplierPricelist;
  readonly onCostColumnChange?: (columnIndex: number) => void;
  readonly onRemove?: () => void;
}

// Service interfaces
export interface ExcelParsingService {
  parseFile(file: File): Promise<ProcessingResult<ExcelSheet>>;
  validateFile(file: File): ValidationResult;
}

export interface CostPriceDetectionService {
  detectCostPriceColumn(
    headers: readonly string[],
    rows: readonly ExcelRow[],
    options?: DetectionOptions
  ): DetectionResult;
}

export interface MarkupCalculationService {
  calculateMarkupColumns(
    data: ExcelSheet,
    costColumnIndex: number,
    config: MarkupConfiguration
  ): ProcessingResult<readonly MarkupColumn[]>;
}

export interface ExcelExportService {
  generateConsolidatedWorkbook(
    pricelists: readonly SupplierPricelist[]
  ): Promise<ProcessingResult<Blob>>;
}

// Store interface
export interface PricelistStore {
  // State
  readonly files: readonly SupplierPricelist[];
  readonly isProcessing: boolean;
  readonly globalProgress: number;
  readonly errors: readonly ProcessingError[];
  readonly markupConfig: MarkupConfiguration;

  // Actions
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  updateCostColumn: (id: string, columnIndex: number) => void;
  processFiles: () => Promise<void>;
  exportConsolidated: (config: ExportConfiguration) => Promise<void>;
  clearErrors: () => void;
  updateMarkupConfig: (config: Partial<MarkupConfiguration>) => void;
  reset: () => void;
}

// Constants
export const DEFAULT_MARKUP_PERCENTAGES = [5, 10, 15, 20, 30] as const;
export const COST_PRICE_KEYWORDS = [
  'cost',
  'price',
  'wholesale',
  'buy',
  'supplier',
  'purchase',
  'unit cost',
  'base price',
  'price for carton qty',
  'price for carton',
  'carton price',
  'price per carton',
  'unit price',
  'selling price',
  'list price',
  'carton',
  'qty',
  'amount',
  'value',
  'rate',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_ROWS_PER_FILE = 5000;
export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const; 