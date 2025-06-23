# Supplier Pricelist Merger - Project Scope

## Overview
A web application that allows users to upload multiple Excel supplier pricelists, merge them into a single consolidated spreadsheet with separate worksheets, and automatically calculate markup pricing based on detected cost price columns.

## Core Objectives
1. **Multi-file Upload**: Accept multiple Excel files simultaneously
2. **Large File Support**: Handle spreadsheets up to 2,500 lines efficiently
3. **Intelligent Merging**: Combine multiple pricelists into separate worksheets within one file
4. **Cost Price Detection**: Automatically identify cost price columns using pattern matching
5. **Markup Calculations**: Generate 5%, 10%, 15%, 20%, and 30% markup columns
6. **Professional UI**: Intuitive, modern interface suitable for business users

## Functional Requirements

### File Upload & Processing
- Support Excel formats (.xlsx, .xls)
- Multi-file upload with drag-and-drop interface
- Progress indicators for large file processing
- File validation and error handling
- Maximum file size: 50MB per file
- Maximum rows per file: 5,000

### Data Processing
- Parse Excel files and extract data
- Detect cost price columns using intelligent pattern matching:
  - Column headers containing: "cost", "price", "wholesale", "buy", "supplier"
  - Numerical data validation
  - Currency format detection
- Preserve original data structure and formatting where possible
- Handle missing or malformed data gracefully

### Markup Calculations
- Generate new columns for each markup percentage (5%, 10%, 15%, 20%, 30%)
- Calculate: `Markup Price = Cost Price × (1 + Markup Percentage)`
- Round to appropriate decimal places (2 for currency)
- Maintain formulas in Excel output for easy updates

### Output Generation
- Create consolidated Excel file with:
  - Separate worksheet for each uploaded pricelist
  - Original data preserved
  - New markup columns added
  - Consistent formatting across worksheets
  - Summary worksheet with source file information

### User Interface
- Clean, professional design
- Intuitive workflow with clear steps
- Real-time feedback and progress indicators
- Responsive design for desktop and tablet use
- Error messages and validation feedback
- Download management for processed files

## Technical Requirements

### Performance
- Process 2,500-line spreadsheets within 30 seconds
- Support concurrent processing of multiple files
- Efficient memory usage for large datasets
- Client-side processing where possible to reduce server load

### Compatibility
- Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Excel compatibility (.xlsx, .xls formats)
- Cross-platform support (Windows, macOS, Linux)

### Security
- File upload validation and sanitization
- No server-side storage of sensitive pricing data
- Client-side processing for data privacy
- Secure file handling and cleanup

## User Stories

### Primary User: Procurement Manager
- **As a** procurement manager
- **I want to** upload multiple supplier pricelists
- **So that** I can quickly compare pricing and calculate markup margins

### Secondary User: Sales Team
- **As a** sales representative  
- **I want to** see calculated markup prices
- **So that** I can quote customers with appropriate margins

## Success Criteria
1. **Usability**: New users can complete the workflow without training
2. **Performance**: Processes 2,500-line files in under 30 seconds
3. **Accuracy**: 99%+ accuracy in cost price column detection
4. **Reliability**: Handles edge cases and malformed data gracefully
5. **Professional Appearance**: UI suitable for executive presentations

## Out of Scope (Phase 1)
- Database storage of historical data
- User authentication and multi-tenancy
- Advanced data analytics or reporting
- Integration with external pricing systems
- Mobile app development
- Multi-language support

## Future Enhancements (Phase 2+)
- Custom markup percentage configuration
- Historical price tracking
- Supplier comparison analytics
- API integrations with ERP systems
- Batch processing automation
- Advanced data validation rules 