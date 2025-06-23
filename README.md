# Supplier Pricelist Merger

A professional web application for merging multiple supplier pricelists into a single consolidated Excel file with automatic markup calculations.

## 🚀 Features

- **Multi-file Upload**: Upload multiple Excel files (.xlsx, .xls) simultaneously
- **Intelligent Price Detection**: AI-powered detection of cost price columns using multiple strategies
- **Automatic Markup Calculations**: Generate 5%, 10%, 15%, 20%, and 30% markup columns
- **Consolidated Export**: Download a single Excel file with separate worksheets for each supplier
- **Real-time Processing**: Live progress updates and error handling
- **Professional UI**: Clean, intuitive interface suitable for business users

## 🔧 Technical Stack

- **Frontend**: Next.js 14 with TypeScript and App Router
- **Styling**: Tailwind CSS v4 with custom design system
- **State Management**: Zustand for client-side state
- **File Processing**: SheetJS (xlsx) for Excel file parsing and generation
- **UI Components**: Custom components with Radix UI primitives
- **Math**: Decimal.js for precise decimal calculations

## 📁 Project Structure

```
src/
├── app/                  # Next.js app router
│   ├── page.tsx         # Main application page
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/          # React components
│   ├── ui/             # Base UI components
│   └── upload/         # File upload components
├── services/           # Business logic services
│   ├── excel-parsing.service.ts       # Excel file parsing
│   ├── cost-price-detection.service.ts # Price column detection
│   ├── markup-calculation.service.ts   # Markup calculations
│   └── excel-export.service.ts        # Excel file generation
├── store/              # State management
│   └── pricelist.store.ts             # Zustand store
├── types/              # TypeScript type definitions
│   └── index.ts        # All application types
└── lib/                # Utility functions
    └── utils.ts        # Helper functions
```

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd suppliermergev3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 How to Use

### Step 1: Upload Excel Files
- Drag and drop Excel files (.xlsx or .xls) onto the upload zone
- Or click to browse and select files
   - Maximum 10 files, 50MB each, up to 5,000 rows per file

### Step 2: Automatic Processing
The application will automatically:
- **Parse** each Excel file and extract data
- **Detect** cost price columns using intelligent algorithms
- **Calculate** markup prices (5%, 10%, 15%, 20%, 30%)
- **Validate** data quality and handle errors

### Step 3: Review Results
- View processing status for each file
- Check detected cost price columns and confidence scores
- Review any errors or warnings

### Step 4: Export Consolidated File
- Click "Export Consolidated" to download the merged Excel file
- File includes separate worksheets for each supplier
- Original data preserved with new markup columns added

## 🔍 Cost Price Detection

The application uses multiple strategies to automatically detect cost price columns:

1. **Header Exact Match**: Looks for exact matches with price-related keywords
2. **Header Partial Match**: Finds headers containing price-related terms
3. **Data Pattern Analysis**: Analyzes column data for numeric price patterns
4. **Position Heuristics**: Uses common column positions for price data

**Keywords used**: cost, price, wholesale, buy, supplier, purchase, unit cost, base price

## 💼 Business Logic

### Markup Calculations
- Uses precise decimal arithmetic (Decimal.js) to avoid floating-point errors
- Formula: `Markup Price = Cost Price × (1 + Markup Percentage / 100)`
- Results rounded to 2 decimal places for currency formatting

### File Processing Pipeline
1. **Validation**: File type, size, and format checks
2. **Parsing**: Excel data extraction with type normalization
3. **Detection**: Cost price column identification
4. **Calculation**: Markup price generation
5. **Export**: Consolidated workbook creation

## 🔒 Security & Privacy

- **Client-side Processing**: All data processing happens in your browser
- **No Server Storage**: Files are never uploaded to or stored on servers
- **Privacy First**: Sensitive pricing data never leaves your device

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## 🏗️ Building for Production

Build the application:

```bash
npm run build
```

Start production server:

```bash
npm start
```

## 📊 Performance

- **Large Files**: Efficiently handles spreadsheets up to 5,000 rows
- **Memory Management**: Optimized for processing multiple large files
- **Progress Tracking**: Real-time feedback for long-running operations
- **Error Recovery**: Graceful handling of malformed data

## 🔧 Configuration

### Markup Percentages
Default markup percentages can be modified in `src/types/index.ts`:

```typescript
export const DEFAULT_MARKUP_PERCENTAGES = [5, 10, 15, 20, 30] as const;
```

### File Limits
Adjust file processing limits in `src/types/index.ts`:

```typescript
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_ROWS_PER_FILE = 2500;
```

## 🚨 Error Handling

The application provides comprehensive error handling:

- **File Validation Errors**: Invalid format, size, or empty files
- **Parsing Errors**: Corrupted or unreadable Excel files
- **Processing Errors**: Data analysis or calculation failures
- **Export Errors**: File generation issues

All errors include descriptive messages and suggested solutions.

## 📈 Future Enhancements

- Custom markup percentage configuration
- Historical price tracking and analytics
- Multiple currency support
- API integrations with ERP systems
- Batch processing automation
- Advanced data validation rules

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please:
1. Check the documentation in the `/docs` folder
2. Review the troubleshooting section
3. Open an issue with detailed error information

## 🔗 Architecture Documentation

For detailed technical documentation, see:
- [Project Scope](docs/PROJECT_SCOPE.md)
- [Architecture Decisions](docs/ARCHITECTURE_DECISION.md)
- [Coding Standards](docs/CODING_STANDARDS.md)
