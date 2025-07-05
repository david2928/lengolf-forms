# Reconciliation System

**Status**: Implemented ✅  
**Type**: Administrative Tool  
**Access Level**: Admin Only  
**Last Updated**: June 2025

## Overview

The Reconciliation System is a comprehensive data matching tool that automatically reconciles invoice data with POS (Point of Sale) sales records. It supports three distinct reconciliation types: restaurant reconciliation (matching invoices with food/beverage sales), and golf coaching reconciliation for both Pro Ratchavin and Pro Boss (matching lesson invoices with lesson usage records).

## Features

### Core Functionality
- **Multi-Type Reconciliation**: Support for restaurant and golf coaching (2 instructors)
- **Automatic File Processing**: Drag-and-drop file upload with instant processing
- **Smart Data Matching**: Exact and fuzzy matching algorithms with confidence scoring
- **Real-Time Results**: Immediate reconciliation processing and detailed results display
- **Comprehensive Analytics**: Match rates, variance analysis, and detailed breakdowns

### User Experience
- **Streamlined Workflow**: 2-step process (select type → upload file)
- **Auto-Detection**: Automatic date range detection from invoice data
- **Progress Tracking**: Real-time processing status with progress indicators
- **Detailed Results**: Tabbed interface showing matches, discrepancies, and summaries

### File Support
- **CSV Files**: Advanced parsing with auto-detection and error handling
- **Excel Files**: Multi-sheet Excel parsing with XLSX library support
- **Validation**: File size limits, format validation, and comprehensive error reporting
- **Preview**: File preview with summary statistics before processing

## Technical Architecture

### Database Schema

#### Reconciliation Sessions
```sql
-- Tracks reconciliation sessions and metadata
CREATE TABLE backoffice.reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type TEXT NOT NULL, -- 'restaurant', 'golf_coaching_ratchavin', 'golf_coaching_boss'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_invoice_items INTEGER NOT NULL,
  total_pos_records INTEGER NOT NULL,
  matched_count INTEGER NOT NULL,
  match_rate DECIMAL(5,2) NOT NULL,
  total_invoice_amount DECIMAL(10,2) NOT NULL,
  total_pos_amount DECIMAL(10,2) NOT NULL,
  variance_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL
);
```

#### Reconciliation Items
```sql
-- Stores detailed reconciliation results
CREATE TABLE backoffice.reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES backoffice.reconciliation_sessions(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL, -- 'exact', 'fuzzy_name', 'fuzzy_amount', 'fuzzy_both', 'unmatched'
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  invoice_data JSONB NOT NULL,
  pos_data JSONB,
  variance_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints

#### POS Data Fetching
```typescript
// GET /api/admin/reconciliation/pos-data
interface POSDataRequest {
  startDate: string;        // YYYY-MM-DD format
  endDate: string;          // YYYY-MM-DD format
  type: 'restaurant' | 'golf_coaching_ratchavin' | 'golf_coaching_boss';
}

interface POSDataResponse {
  data: POSSalesRecord[];
  summary: {
    totalRecords: number;
    totalAmount: number;
    dateRange: { start: string; end: string; };
  };
}
```

#### File Upload & Processing
```typescript
// POST /api/admin/reconciliation/upload
interface FileUploadRequest {
  file: File;                // CSV or Excel file
  reconciliationType: string;
  dateRange?: { start: string; end: string; };
}

interface ParsedInvoiceData {
  data: {
    items: InvoiceItem[];
  };
  preview: any[];
  autoDetectedDateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalItems: number;
    totalAmount: number;
    parseErrors: string[];
  };
}
```

#### Reconciliation Processing
```typescript
// POST /api/admin/reconciliation/reconcile
interface ReconciliationRequest {
  invoiceData: InvoiceItem[];
  reconciliationType: string;
  dateRange: { start: string; end: string; };
  options: {
    toleranceAmount: number;      // Amount matching tolerance (e.g., 50 THB)
    tolerancePercentage: number;  // Percentage tolerance (e.g., 5%)
    nameSimilarityThreshold: number; // Name similarity threshold (e.g., 0.8)
  };
}

interface ReconciliationResult {
  matched: MatchedItem[];
  invoiceOnly: InvoiceItem[];     // Items in invoice but not in POS
  posOnly: POSSalesRecord[];      // Items in POS but not in invoice
  summary: ReconciliationSummary;
  sessionId: string;
}
```

### Core Data Types

```typescript
// Base invoice item (parsed from CSV/Excel)
interface InvoiceItem {
  id: string;
  date: string;           // YYYY-MM-DD format
  customerName: string;
  productType?: string;   // Golf lesson type, menu item, etc.
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
  rawData: Record<string, any>;  // Original parsed row
}

// POS sales record
interface POSSalesRecord {
  id: number;
  date: string;
  customerName: string;
  productName: string;
  productCategory: string;
  quantity: number;
  totalAmount: number;
  skuNumber: string;
  isVoided: boolean;
}

// Matched reconciliation item
interface MatchedItem {
  invoiceItem: InvoiceItem;
  posRecord: POSSalesRecord;
  matchType: 'exact' | 'fuzzy_name' | 'fuzzy_amount' | 'fuzzy_both';
  confidence: number;      // 0-1 matching confidence
  variance: {
    amountDiff: number;
    quantityDiff: number;
    nameSimilarity: number;
  };
}

// Reconciliation summary
interface ReconciliationSummary {
  totalInvoiceItems: number;
  totalPOSRecords: number;
  matchedCount: number;
  matchRate: number;       // Percentage matched
  totalInvoiceAmount: number;
  totalPOSAmount: number;
  varianceAmount: number;
  variancePercentage: number;
}
```

## Reconciliation Types

### 1. Restaurant Reconciliation

**Purpose**: Match restaurant invoices with POS food/beverage sales data.

**POS Data Query**:
```sql
SELECT 
  id, date, customer_name, product_name, product_category,
  sku_number, item_cnt as quantity, item_price_incl_vat as amount,
  receipt_number, payment_method
FROM pos.lengolf_sales
WHERE date BETWEEN $1 AND $2           
  AND sku_number <> '-'                 -- Items with valid SKU
  AND is_voided = false                 -- Exclude voided transactions
  AND sku_number IS NOT NULL            
ORDER BY date ASC, customer_name;
```

**Matching Logic**:
- Primary: Date + Customer Name + Amount
- Secondary: Fuzzy customer name matching with Levenshtein distance
- Tertiary: Amount tolerance matching (configurable ±50 THB or ±5%)

**Expected Data**: Food items, beverages, merchandise with SKU numbers

### 2. Golf Coaching - Pro Ratchavin

**Purpose**: Match golf lesson invoices with lesson usage records for Pro Ratchavin.

**POS Data Query**:
```sql
SELECT 
  date, customer_name, product_name,
  SUM(item_cnt) as total_quantity,
  SUM(item_price_incl_vat) as total_amount,
  COUNT(*) as transaction_count
FROM pos.lengolf_sales
WHERE date BETWEEN $1 AND $2           
  AND (
    product_name = '1 Golf Lesson Used' 
    OR product_name = '1 Golf Lesson Used (Ratchavin)'
  )
  AND is_voided = false                 
GROUP BY date, customer_name, product_name
ORDER BY date ASC, customer_name;
```

**Matching Logic**:
- Primary: Date + Customer Name + Lesson Count
- Secondary: Fuzzy customer name matching for similar names
- Aggregation: Multiple lessons on same day grouped together

**Expected Data**: Golf lesson usage records, student names, lesson dates

### 3. Golf Coaching - Pro Boss

**Purpose**: Match golf lesson invoices with lesson usage records for Pro Boss.

**POS Data Query**:
```sql
SELECT 
  date, customer_name, product_name,
  SUM(item_cnt) as total_quantity,
  SUM(item_price_incl_vat) as total_amount,
  COUNT(*) as transaction_count
FROM pos.lengolf_sales
WHERE date BETWEEN $1 AND $2           
  AND (
    product_name = '1 Golf Lesson Used' 
    OR product_name = '1 Golf Lesson Used (Boss)'
  )
  AND is_voided = false                 
GROUP BY date, customer_name, product_name
ORDER BY date ASC, customer_name;
```

**Matching Logic**: Same as Pro Ratchavin but filtered for Pro Boss lessons.

## User Interface

### Component Architecture

```
app/admin/reconciliation/
├── page.tsx                           # Main reconciliation page
├── components/
│   ├── FileUploadForm.tsx            # Drag & drop file upload with validation
│   ├── ReconciliationTypeSelector.tsx # Type selection cards
│   ├── ReconciliationResults.tsx      # Comprehensive results display
│   └── [Additional components...]     # Future expansion components
```

### User Workflow

1. **Type Selection**
   - Clean card-based interface for selecting reconciliation type
   - Visual icons and descriptions for each type
   - Instant selection feedback

2. **File Upload**
   - Drag & drop interface with file validation
   - Automatic processing on file selection
   - Progress indicators and status updates

3. **Automatic Processing**
   - File parsing and validation
   - POS data fetching based on detected date range
   - Reconciliation algorithm execution

4. **Results Display**
   - Summary cards showing match rates and totals
   - Detailed tables with matched and unmatched items
   - Interactive filtering and sorting capabilities

### UI Features

- **Responsive Design**: Works on desktop and mobile devices
- **Real-Time Updates**: Progress tracking during processing
- **Error Handling**: Comprehensive error messages and recovery options
- **Clean Interface**: Minimal, focused design without clutter
- **Automatic Flow**: No manual intervention required after file upload

## File Format Support

### CSV Files
```csv
Date,Customer,Product,Quantity,Unit Price,Total Amount
2025-01-15,"John Doe","Golf Lesson - Pro Ratchavin",1,1000,1000
2025-01-15,"Jane Smith","Chicken Burger",2,250,500
```

### Excel Files
- Support for multiple sheets
- Automatic header detection
- Excel date format handling
- Formula value extraction

### Required Columns

#### Restaurant Reconciliation
- Date (various formats supported)
- Customer Name
- Product/Item Description
- Quantity
- Unit Price or Total Amount

#### Golf Coaching Reconciliation
- Date
- Student/Customer Name
- Lesson Type (optional)
- Number of Lessons
- Total Amount

## Matching Algorithm

### Exact Matching
1. **Date Match**: Exact date comparison (YYYY-MM-DD)
2. **Customer Match**: Case-insensitive exact name match
3. **Amount Match**: Precise amount comparison

### Fuzzy Matching
1. **Name Similarity**: Levenshtein distance calculation
   - Threshold: 80% similarity (configurable)
   - Handles typos, spacing differences, abbreviations
2. **Amount Tolerance**: 
   - Fixed tolerance: ±50 THB (configurable)
   - Percentage tolerance: ±5% (configurable)
3. **Date Proximity**: Future enhancement for near-date matching

### Confidence Scoring
- **1.0**: Exact match on all criteria
- **0.9-0.99**: Minor variations (amount tolerance, name similarity >95%)
- **0.8-0.89**: Moderate fuzzy matching (name similarity 80-95%)
- **0.7-0.79**: Higher tolerance matching
- **<0.7**: Low confidence (requires manual review)

## Performance Optimization

### Database Indexes
```sql
-- Restaurant reconciliation optimization
CREATE INDEX idx_lengolf_sales_reconciliation_restaurant 
ON pos.lengolf_sales (date, sku_number, is_voided, customer_name);

-- Golf coaching optimization  
CREATE INDEX idx_lengolf_sales_reconciliation_golf
ON pos.lengolf_sales (date, product_name, is_voided, customer_name);

-- Session management
CREATE INDEX idx_reconciliation_sessions_type_date
ON backoffice.reconciliation_sessions (session_type, start_date, end_date);

-- Items lookup
CREATE INDEX idx_reconciliation_items_session
ON backoffice.reconciliation_items (session_id, match_type);
```

### Query Performance
- **Restaurant queries**: ~100-500ms for 30-day periods
- **Golf coaching queries**: ~50-200ms for 30-day periods  
- **File processing**: <5 seconds for typical invoice files
- **Reconciliation algorithm**: <10 seconds for 1000+ records

## Security & Access Control

### Authentication
- **Admin Only Access**: Reconciliation features restricted to admin users
- **NextAuth Integration**: Uses existing authentication system
- **Session Validation**: Each request validates admin permissions

### Audit Logging
- **Session Tracking**: All reconciliation sessions logged with user and timestamp
- **Data Access**: POS data access logged for compliance
- **File Processing**: Upload and processing activities tracked

### Data Protection
- **Temporary Files**: Uploaded files automatically cleaned up after processing
- **Session Data**: Reconciliation sessions stored with proper retention policies
- **PII Handling**: Customer names handled according to privacy policies

## Error Handling

### File Processing Errors
- **Format Validation**: Unsupported file formats rejected with clear messages
- **Size Limits**: Large files (>10MB) blocked with helpful guidance
- **Parsing Errors**: Invalid data rows identified and reported with line numbers
- **Column Mapping**: Missing required columns detected and reported

### Data Matching Errors
- **POS Data Unavailable**: Clear messaging when POS data is missing for date range
- **Network Timeouts**: Graceful handling of API timeouts with retry options
- **Processing Failures**: Algorithm errors captured and reported to administrators

### User Experience
- **Progressive Enhancement**: Basic functionality works even if advanced features fail
- **Clear Messaging**: All error states have user-friendly explanations
- **Recovery Options**: Users can modify parameters and retry failed operations

## Future Enhancements

### Phase 2 Features
- **Export Functionality**: CSV/Excel export of reconciliation results
- **Manual Matching**: Interface for manually resolving discrepancies
- **Historical Analysis**: Trending and pattern analysis across reconciliation sessions
- **Bulk Processing**: Support for processing multiple files simultaneously

### Advanced Matching
- **Date Proximity**: Match items within ±1-2 days for timing discrepancies
- **Partial Matching**: Handle split invoices or partial payments
- **Category-Based Matching**: Enhanced matching based on product categories

### Integration Enhancements
- **Automated Scheduling**: Scheduled reconciliation for regular invoice files
- **Email Notifications**: Automated reports and discrepancy alerts
- **CRM Integration**: Link reconciliation results with customer management system

## Troubleshooting

### Common Issues

1. **No POS Records Found**
   - Verify date range covers transaction period
   - Check reconciliation type matches invoice content
   - Confirm POS data availability for selected dates

2. **Low Match Rates**
   - Review customer name consistency between invoice and POS
   - Verify amount calculations include/exclude taxes as expected
   - Consider adjusting fuzzy matching thresholds

3. **File Upload Failures**
   - Ensure file format is CSV or Excel (.xlsx, .xls)
   - Check file size is under 10MB limit
   - Verify file contains required columns

4. **Processing Timeouts**
   - Reduce date range for large datasets
   - Split large invoice files into smaller batches
   - Contact administrator if issues persist

### Performance Issues
- **Slow Processing**: Large date ranges may require optimization
- **Memory Usage**: Very large files may need to be processed in chunks
- **Database Load**: High reconciliation volume may impact other operations

---

## Documentation References

- **[Admin Panel](./ADMIN_PANEL.md)** - Administrative interface integration
- **[POS Data Pipeline](./POS_DATA_PIPELINE.md)** - Source data structure and flow
- **[Authentication System](../technical/AUTHENTICATION_SYSTEM.md)** - Access control implementation
- **[API Reference](../api/API_REFERENCE.md)** - Complete API documentation

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Production Ready