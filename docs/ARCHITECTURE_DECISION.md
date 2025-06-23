# Architecture Decision Record - Supplier Pricelist Merger

## Technology Stack Decision

### Frontend Framework: Next.js 14 with TypeScript
**Decision**: Use Next.js 14 with App Router and TypeScript for the frontend

**Rationale**:
- **Server-Side Rendering**: Better SEO and initial load performance
- **TypeScript**: Type safety for complex data processing logic
- **React Ecosystem**: Rich component libraries for professional UI
- **File System Routing**: Simplified project structure
- **Built-in Optimization**: Automatic code splitting and performance optimizations

### File Processing: Client-Side with SheetJS
**Decision**: Process Excel files on the client-side using SheetJS (xlsx library)

**Rationale**:
- **Privacy**: Sensitive pricing data never leaves the user's browser
- **Performance**: Reduces server load and latency
- **Scalability**: No server storage or processing requirements
- **Security**: Eliminates server-side attack vectors for file uploads
- **SheetJS**: Industry standard for Excel file processing in JavaScript

### UI Framework: Tailwind CSS + Shadcn/ui
**Decision**: Use Tailwind CSS for styling with Shadcn/ui component library

**Rationale**:
- **Professional Design**: Pre-built components with consistent styling
- **Customization**: Highly customizable while maintaining design system
- **Developer Experience**: Utility-first approach for rapid development
- **Accessibility**: Built-in accessibility features
- **Responsive**: Mobile-first responsive design patterns

### State Management: Zustand
**Decision**: Use Zustand for client-side state management

**Rationale**:
- **Simplicity**: Less boilerplate compared to Redux
- **TypeScript Support**: Excellent TypeScript integration
- **Performance**: Optimized re-renders and minimal bundle size
- **File Processing State**: Ideal for managing upload progress and processing status

## Architecture Patterns

### Layered Architecture
```
┌─────────────────────────────────────┐
│           Presentation Layer         │
│         (React Components)          │
├─────────────────────────────────────┤
│            Service Layer            │
│        (Business Logic)             │
├─────────────────────────────────────┤
│           Processing Layer          │
│      (Excel File Operations)       │
├─────────────────────────────────────┤
│            Utility Layer            │
│    (Helper Functions & Types)       │
└─────────────────────────────────────┘
```

### Component Structure
- **Pages**: Next.js app router pages
- **Components**: Reusable UI components
- **Services**: Business logic and file processing
- **Types**: TypeScript interfaces and types
- **Utils**: Helper functions and constants
- **Hooks**: Custom React hooks for state and side effects

### File Processing Flow
```
File Upload → Validation → Parsing → Cost Price Detection → 
Markup Calculation → Worksheet Generation → Download
```

## Key Design Decisions

### 1. Cost Price Detection Algorithm
**Decision**: Multi-strategy pattern matching with confidence scoring

**Implementation**:
- Header text matching (case-insensitive)
- Column data type validation (numeric values)
- Currency format detection
- Position-based heuristics (common column positions)
- User confirmation for ambiguous cases

### 2. Memory Management
**Decision**: Streaming and chunked processing for large files

**Implementation**:
- Process files in chunks to prevent browser freezing
- Use Web Workers for heavy processing tasks
- Implement progress callbacks for user feedback
- Garbage collection optimization for large datasets

### 3. Error Handling Strategy
**Decision**: Graceful degradation with detailed error reporting

**Implementation**:
- File validation before processing
- Detailed error messages with suggested fixes
- Partial processing support (skip corrupted rows)
- User-friendly error reporting with technical details available

### 4. Data Structure Design
```typescript
interface SupplierPricelist {
  id: string;
  filename: string;
  originalData: ExcelData;
  processedData: ProcessedData;
  costPriceColumn: number;
  markupColumns: MarkupColumn[];
  errors: ProcessingError[];
  status: ProcessingStatus;
}

interface ProcessedData {
  headers: string[];
  rows: DataRow[];
  totalRows: number;
  detectedCostColumn: number;
  confidence: number;
}
```

### 5. Performance Optimizations
- **Virtualization**: For displaying large datasets in UI
- **Memoization**: Cache processed data and calculations
- **Code Splitting**: Lazy load processing components
- **Web Workers**: Offload heavy computations from main thread

## Security Considerations

### Client-Side Processing Benefits
- No server-side storage of sensitive pricing data
- Data remains in user's browser memory only
- No network transmission of raw pricing data
- Eliminates server-side security vulnerabilities

### File Validation
- MIME type validation
- File size limits
- Excel format verification
- Malicious macro detection (basic)

## Scalability Considerations

### Horizontal Scaling
- Client-side processing naturally scales with users
- CDN distribution for static assets
- Serverless deployment option available

### Performance Monitoring
- Client-side error tracking
- Processing time metrics
- Memory usage monitoring
- User experience analytics

## Development Workflow

### Project Structure
```
src/
├── app/                 # Next.js app router
│   ├── page.tsx        # Main upload interface
│   └── layout.tsx      # Root layout
├── components/         # React components
│   ├── ui/            # Shadcn/ui components
│   ├── upload/        # File upload components
│   └── processing/    # Data processing components
├── services/          # Business logic
│   ├── excel.ts       # Excel processing service
│   ├── pricing.ts     # Markup calculation service
│   └── detection.ts   # Cost price detection service
├── types/             # TypeScript definitions
├── utils/             # Helper functions
└── hooks/             # Custom React hooks
```

### Testing Strategy
- **Unit Tests**: Service layer functions
- **Integration Tests**: File processing workflows
- **Component Tests**: UI component behavior
- **E2E Tests**: Complete user workflows

## Deployment Strategy

### Recommended Platform: Vercel
- **Rationale**: Optimized for Next.js applications
- **Benefits**: Automatic deployments, CDN, edge functions
- **Cost**: Free tier suitable for initial deployment
- **Scalability**: Automatic scaling based on usage

### Alternative Options
- **Netlify**: Similar benefits for static site generation
- **AWS S3 + CloudFront**: For full control over infrastructure
- **Docker**: For containerized deployment on any platform

## Migration and Maintenance

### Future Architecture Considerations
- **API Layer**: For future server-side features
- **Database Integration**: If data persistence is needed
- **Microservices**: For complex business logic separation
- **Mobile Support**: PWA capabilities for mobile access

### Monitoring and Analytics
- **Error Tracking**: Sentry or similar service
- **Performance Monitoring**: Web Vitals tracking
- **Usage Analytics**: Privacy-focused analytics solution
- **User Feedback**: Integrated feedback collection system 