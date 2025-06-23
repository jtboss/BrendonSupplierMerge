# Coding Standards - Supplier Pricelist Merger

## TypeScript Configuration

### Strict Type Checking
```typescript
// tsconfig.json standards
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Type Definitions
- All functions must have explicit return types
- Use interfaces over type aliases for object shapes
- Prefer union types over enums for string constants
- Generic types should have meaningful constraints

```typescript
// Good
interface PricelistData {
  readonly headers: string[];
  readonly rows: readonly DataRow[];
}

// Avoid
type PricelistData = {
  headers: string[];
  rows: DataRow[];
};
```

## Naming Conventions

### Files and Directories
- **kebab-case**: All file and directory names
- **Descriptive names**: `cost-price-detector.ts` not `detector.ts`
- **Component files**: Match component name exactly

```
components/
├── upload/
│   ├── file-upload-zone.tsx
│   ├── upload-progress.tsx
│   └── file-validation.tsx
└── processing/
    ├── markup-calculator.tsx
    └── column-detector.tsx
```

### Variables and Functions
- **camelCase**: Variables, functions, methods
- **Descriptive names**: No abbreviations unless universally understood
- **Boolean prefix**: `is`, `has`, `should`, `can`
- **Action verbs**: Functions should start with verbs

```typescript
// Good
const isValidExcelFile = (file: File): boolean => { };
const calculateMarkupPrice = (cost: number, markup: number): number => { };
const hasNumericData = (column: unknown[]): boolean => { };

// Avoid
const valid = (f: File): boolean => { };
const calc = (c: number, m: number): number => { };
const numeric = (col: unknown[]): boolean => { };
```

### Classes and Interfaces
- **PascalCase**: Classes, interfaces, types, enums
- **Interface prefix**: Use `I` prefix only when necessary for disambiguation
- **Service suffix**: Business logic classes end with `Service`
- **Error suffix**: Custom error classes end with `Error`

```typescript
// Good
interface ExcelProcessingOptions { }
class PriceCalculationService { }
class InvalidFileFormatError extends Error { }

// Avoid
interface iPriceList { }
class priceCalculator { }
class fileError extends Error { }
```

## Code Organization

### Service Layer Structure
```typescript
export class ExcelProcessingService {
  constructor(
    private readonly validator: FileValidator,
    private readonly parser: ExcelParser,
    private readonly detector: CostPriceDetector
  ) { }

  public async processFiles(files: File[]): Promise<ProcessedPricelist[]> {
    // Implementation
  }

  private validateFile(file: File): ValidationResult {
    // Implementation
  }
}
```

### Error Handling Patterns
```typescript
// Result pattern for operations that can fail
type ProcessingResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: ProcessingError;
};

// Custom error hierarchy
export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export class FileValidationError extends ProcessingError {
  constructor(message: string, public readonly filename: string) {
    super(message, 'FILE_VALIDATION_ERROR', { filename });
    this.name = 'FileValidationError';
  }
}
```

## React Component Standards

### Component Structure
```typescript
// Component props interface
interface FileUploadZoneProps {
  readonly onFilesSelected: (files: File[]) => void;
  readonly maxFiles?: number;
  readonly maxFileSize?: number;
  readonly disabled?: boolean;
  readonly className?: string;
}

// Component implementation
export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
  className
}) => {
  // Hooks at the top
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Event handlers
  const handleDrop = useCallback((event: React.DragEvent) => {
    // Implementation
  }, [onFilesSelected]);

  // Render
  return (
    <div className={cn("upload-zone", className)}>
      {/* JSX */}
    </div>
  );
};
```

### Hook Patterns
```typescript
// Custom hook naming: use + action
export const useFileProcessor = () => {
  const [state, setState] = useState<ProcessingState>({
    files: [],
    status: 'idle',
    progress: 0,
    errors: []
  });

  const processFiles = useCallback(async (files: File[]) => {
    // Implementation
  }, []);

  return {
    ...state,
    processFiles
  } as const;
};
```

## Performance Standards

### Memory Management
```typescript
// Use readonly arrays for large datasets
interface LargeDataset {
  readonly rows: readonly DataRow[];
}

// Implement proper cleanup
export class FileProcessor {
  private worker?: Worker;

  public destroy(): void {
    this.worker?.terminate();
    this.worker = undefined;
  }
}
```

### Async Operations
```typescript
// Always handle async operations properly
export const processLargeFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProcessingResult<ProcessedData>> => {
  try {
    const data = await parseFileInChunks(file, onProgress);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: new FileProcessingError(
        `Failed to process file: ${file.name}`,
        error
      )
    };
  }
};
```

## Testing Standards

### Unit Test Structure
```typescript
describe('CostPriceDetector', () => {
  let detector: CostPriceDetector;

  beforeEach(() => {
    detector = new CostPriceDetector();
  });

  describe('detectCostPriceColumn', () => {
    it('should detect cost column by header name', () => {
      // Arrange
      const headers = ['Product', 'Cost Price', 'Description'];
      const rows = [
        ['Product A', 10.50, 'Description A'],
        ['Product B', 15.25, 'Description B']
      ];

      // Act
      const result = detector.detectCostPriceColumn(headers, rows);

      // Assert
      expect(result.columnIndex).toBe(1);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle edge case with no numeric columns', () => {
      // Test implementation
    });
  });
});
```

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadZone } from './file-upload-zone';

describe('FileUploadZone', () => {
  it('should call onFilesSelected when files are dropped', async () => {
    const mockOnFilesSelected = jest.fn();
    render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />);

    const dropZone = screen.getByTestId('file-drop-zone');
    const file = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    });

    expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
  });
});
```

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Detects the cost price column in a pricelist dataset using multiple strategies.
 * 
 * Uses header text matching, data type validation, and position-based heuristics
 * to identify the most likely column containing cost prices.
 * 
 * @param headers - Array of column headers from the Excel file
 * @param rows - 2D array of data rows, should contain at least 5 rows for accurate detection
 * @param options - Configuration options for detection algorithm
 * @returns Detection result with column index and confidence score
 * 
 * @throws {InvalidDataError} When headers and rows don't match or data is malformed
 * 
 * @example
 * ```typescript
 * const detector = new CostPriceDetector();
 * const result = detector.detectCostPriceColumn(
 *   ['Product', 'Cost', 'Description'],
 *   [['A', 10.50, 'Desc'], ['B', 15.25, 'Desc']]
 * );
 * console.log(result.columnIndex); // 1
 * console.log(result.confidence); // 0.95
 * ```
 */
public detectCostPriceColumn(
  headers: readonly string[],
  rows: readonly unknown[][],
  options: DetectionOptions = {}
): DetectionResult {
  // Implementation
}
```

### README Requirements
- Clear installation instructions
- Usage examples with code snippets
- API documentation for public interfaces
- Troubleshooting section
- Contributing guidelines

## Code Quality Tools

### ESLint Configuration
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## File Processing Specific Standards

### Excel Data Handling
```typescript
// Always validate Excel data structure
interface ExcelValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

// Use specific types for different data representations
type CellValue = string | number | Date | boolean | null;
type ExcelRow = readonly CellValue[];
type ExcelSheet = readonly ExcelRow[];

// Handle large datasets efficiently
const processInChunks = async <T, R>(
  items: readonly T[],
  processor: (chunk: readonly T[]) => Promise<R[]>,
  chunkSize = 100
): Promise<R[]> => {
  // Implementation
};
```

### Markup Calculation Standards
```typescript
// Use precise decimal calculations
import { Decimal } from 'decimal.js';

export const calculateMarkup = (
  costPrice: number,
  markupPercentage: number
): number => {
  const cost = new Decimal(costPrice);
  const markup = new Decimal(markupPercentage).div(100);
  const markupPrice = cost.mul(markup.plus(1));
  
  return markupPrice.toDecimalPlaces(2).toNumber();
};
```

## Security Standards

### File Validation
```typescript
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
] as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const validateFile = (file: File): ValidationResult => {
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only Excel files are allowed.'
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File size exceeds maximum limit of 50MB.'
    };
  }
  
  return { isValid: true };
};
``` 