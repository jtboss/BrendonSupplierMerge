# Master Tab Implementation Plan

## Overview
This document outlines the implementation plan for adding a "Master" tab to the Supplier Pricelist Merger application. The Master tab will display all uploaded pricelists merged into a single consolidated view while maintaining the existing individual file tabs.

## Current State Analysis
- **Current UI**: Single page application with a list view of uploaded files
- **Data Structure**: Individual `SupplierPricelist` objects stored in Zustand store
- **Processing**: Each file is processed independently with markup calculations
- **Export**: Creates consolidated Excel file with separate worksheets

## Proposed Solution

### 1. Tab Navigation System
Create a tab-based interface with the following tabs:
- **Individual File Tabs**: One tab per uploaded pricelist (existing functionality)
- **Master Tab**: Consolidated view of all pricelists combined
- **Upload Tab**: File upload interface (existing functionality)

### 2. Master Tab Features
- **Unified Data Grid**: Display all rows from all pricelists in a single table
- **Source Identification**: Add a "Source File" column to identify which pricelist each row comes from
- **Unified Cost Detection**: Show the detected cost columns across all files
- **Combined Markup Calculations**: Display markup calculations for all data
- **Filtering & Search**: Allow filtering by source file or other criteria
- **Summary Statistics**: Show totals, averages, and other aggregate data

### 3. Data Structure Enhancements

#### New Types (to be added to `src/types/index.ts`)
```typescript
// Master view data structure
export interface MasterViewRow {
  readonly id: string;
  readonly sourceFileId: string;
  readonly sourceFileName: string;
  readonly originalRowIndex: number;
  readonly data: readonly unknown[];
  readonly costPrice?: number;
  readonly markupPrices?: readonly number[];
}

export interface MasterViewData {
  readonly rows: readonly MasterViewRow[];
  readonly combinedHeaders: readonly string[];
  readonly sourceFiles: readonly string[];
  readonly totalRows: number;
  readonly averageCostPrice?: number;
  readonly totalValue?: number;
}

// Tab management
export type TabType = 'upload' | 'master' | 'individual';

export interface TabState {
  readonly activeTab: TabType;
  readonly activeFileId?: string;
}
```

#### Store Enhancements (to be added to `src/store/pricelist.store.ts`)
```typescript
// Add to PricelistStore interface
export interface PricelistStore {
  // ... existing properties
  readonly tabState: TabState;
  readonly masterViewData?: MasterViewData;
  
  // ... existing methods
  setActiveTab: (tabType: TabType, fileId?: string) => void;
  generateMasterView: () => void;
  refreshMasterView: () => void;
}
```

### 4. Component Architecture

#### New Components to Create

1. **`src/components/navigation/tab-navigation.tsx`**
   - Main tab navigation bar
   - Switch between upload, master, and individual file tabs
   - Tab indicators and active state management

2. **`src/components/master/master-view.tsx`**
   - Main master tab component
   - Consolidated data grid
   - Filtering and search functionality
   - Summary statistics panel

3. **`src/components/master/master-data-grid.tsx`**
   - Data table component for master view
   - Virtual scrolling for performance
   - Column sorting and filtering
   - Source file identification

4. **`src/components/master/master-summary.tsx`**
   - Summary statistics component
   - Aggregate calculations
   - Key metrics display

5. **`src/components/individual/file-tab-view.tsx`**
   - Individual file view component
   - Moved from main page logic
   - File-specific data and actions

#### Modified Components

1. **`src/app/page.tsx`**
   - Add tab navigation
   - Conditional rendering based on active tab
   - Integrate master view component

2. **`src/store/pricelist.store.ts`**
   - Add tab state management
   - Add master view data generation
   - Update existing methods to refresh master view

### 5. Implementation Phases

#### Phase 1: Tab Navigation Infrastructure
1. Create tab navigation component
2. Add tab state to store
3. Update main page to use tabs
4. Move existing file list to individual tab view

#### Phase 2: Master View Data Layer
1. Add master view types
2. Implement master view data generation in store
3. Create data transformation logic
4. Add refresh mechanisms

#### Phase 3: Master View UI Components
1. Create master data grid component
2. Implement virtual scrolling for performance
3. Add filtering and search functionality
4. Create summary statistics component

#### Phase 4: Integration & Polish
1. Integrate master view into main application
2. Add proper loading states
3. Implement error handling
4. Add responsive design
5. Performance optimization

### 6. Technical Considerations

#### Performance
- **Virtual Scrolling**: Use `react-window` or similar for large datasets
- **Memoization**: Memo expensive calculations and renders
- **Lazy Loading**: Load master view data only when tab is active
- **Debounced Search**: Optimize filtering operations

#### Data Consistency
- **Auto-refresh**: Update master view when files are added/removed
- **State Synchronization**: Keep individual and master views in sync
- **Error Handling**: Handle cases where files fail to process

#### User Experience
- **Loading States**: Show progress during master view generation
- **Empty States**: Handle no files uploaded scenario
- **Responsive Design**: Ensure mobile compatibility
- **Keyboard Navigation**: Tab accessibility

### 7. Success Criteria

#### Functional Requirements
- [ ] Master tab displays all pricelist data in unified view
- [ ] Source file identification for each row
- [ ] Filtering by source file works correctly
- [ ] Summary statistics are accurate
- [ ] Individual file tabs remain functional
- [ ] Export functionality includes master view option

#### Performance Requirements
- [ ] Master view loads within 3 seconds for 10,000+ rows
- [ ] Smooth scrolling and filtering
- [ ] Responsive UI updates

#### User Experience Requirements
- [ ] Intuitive tab navigation
- [ ] Clear visual indicators
- [ ] Consistent styling with existing UI
- [ ] Mobile-friendly design

### 8. Testing Strategy

#### Unit Tests
- Master view data generation logic
- Tab state management
- Filtering and search functions
- Summary calculations

#### Integration Tests
- Tab navigation flow
- Data synchronization between views
- Export functionality with master data

#### Performance Tests
- Large dataset handling (5,000+ rows)
- Memory usage optimization
- Render performance

### 9. Future Enhancements
- **Advanced Filtering**: Multi-column filters, date ranges
- **Data Export**: Export master view as separate Excel sheet
- **Column Management**: Show/hide columns, reorder
- **Data Validation**: Cross-file validation and conflict detection
- **Comparison Tools**: Side-by-side file comparison
- **Bulk Operations**: Mass edit markup percentages

## Implementation Timeline
- **Phase 1**: 2-3 days (Tab infrastructure)
- **Phase 2**: 2-3 days (Data layer)
- **Phase 3**: 3-4 days (UI components)
- **Phase 4**: 2-3 days (Integration & polish)

**Total Estimated Time**: 9-13 days

## Risk Mitigation
- **Performance**: Implement virtual scrolling early
- **Complexity**: Start with simple master view, add features incrementally
- **Testing**: Test with large datasets throughout development
- **Compatibility**: Ensure backward compatibility with existing features 