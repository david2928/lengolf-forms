// Reconciliation system TypeScript interfaces
// Based on lengolf-reconciliation analysis and POS data structure

export type ReconciliationType = 'restaurant' | 'golf_coaching_ratchavin' | 'golf_coaching_boss';

export type ReconciliationStatus = 'processing' | 'completed' | 'failed';

export type ItemType = 'matched' | 'invoice_only' | 'pos_only';

export type MatchType = 'exact' | 'fuzzy_name' | 'fuzzy_amount';

export type ResolutionStatus = 'unresolved' | 'approved' | 'disputed' | 'adjusted';

// Base invoice item (parsed from CSV/Excel)
export interface InvoiceItem {
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

// POS sales record from database
export interface POSSalesRecord {
  id: number;
  date: string;           // YYYY-MM-DD format
  customerName: string;
  productName: string;
  productCategory: string;
  skuNumber?: string;
  quantity: number;
  totalAmount: number;
  receiptNumber?: string;
  paymentMethod?: string;
  isVoided: boolean;
}

// Golf coaching specific POS record (aggregated)
export interface GolfCoachingSalesRecord {
  date: string;           // YYYY-MM-DD format
  customerName: string;
  productName: string;    // '1 Golf Lesson Used' variants
  totalQuantity: number;  // SUM(item_cnt)
  totalAmount: number;    // SUM(item_price_incl_vat)
  transactionCount: number; // COUNT(*)
}

// Matched reconciliation item
export interface MatchedItem {
  id: string;
  invoiceItem: InvoiceItem;
  posRecord: POSSalesRecord | GolfCoachingSalesRecord;
  matchType: MatchType;
  confidence: number;     // 0-1 matching confidence
  variance: {
    amountDiff: number;
    quantityDiff: number;
  };
  status: ResolutionStatus;
  resolutionNotes?: string;
}

// Reconciliation summary metrics
export interface ReconciliationSummary {
  totalInvoiceItems: number;
  totalPOSRecords: number;
  matchedCount: number;
  matchRate: number;      // Percentage matched (0-100)
  totalInvoiceAmount: number;
  totalPOSAmount: number;
  varianceAmount: number;
  variancePercentage: number;
}

// Complete reconciliation result
export interface ReconciliationResult {
  sessionId: string;
  matched: MatchedItem[];
  invoiceOnly: InvoiceItem[];     // Items in invoice but not in POS
  posOnly: (POSSalesRecord | GolfCoachingSalesRecord)[];  // Items in POS but not in invoice
  summary: ReconciliationSummary;
  metadata: {
    reconciliationType: ReconciliationType;
    dateRange: { start: string; end: string; };
    fileName: string;
    fileSize: number;
    processingTime: number; // milliseconds
  };
}

// Database session record
export interface ReconciliationSession {
  id: string;
  adminUserId: string;
  reconciliationType: ReconciliationType;
  fileName: string;
  fileSizeBytes: number;
  dateRangeStart: string;   // DATE format
  dateRangeEnd: string;     // DATE format
  
  // Summary metrics
  totalInvoiceItems: number;
  totalPosRecords: number;
  matchedItems: number;
  matchRate: number;        // Percentage
  
  totalInvoiceAmount: number;
  totalPosAmount: number;
  varianceAmount: number;
  variancePercentage: number;
  
  // Processing status
  status: ReconciliationStatus;
  errorMessage?: string;
  
  // Timestamps
  createdAt: string;
  completedAt?: string;
  
  // Metadata
  reconciliationOptions?: ReconciliationOptions;
  fileMetadata?: FileMetadata;
}

// Database reconciliation item record
export interface ReconciliationItem {
  id: string;
  sessionId: string;
  
  itemType: ItemType;
  matchType?: MatchType;
  confidence?: number;      // 0.00 to 1.00
  
  // Original data (JSON storage)
  invoiceData?: InvoiceItem;
  posData?: POSSalesRecord | GolfCoachingSalesRecord;
  
  // Variance tracking
  amountVariance?: number;
  quantityVariance?: number;
  
  // Resolution tracking
  status: ResolutionStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  
  createdAt: string;
}

// File parsing configuration
export interface ReconciliationOptions {
  amountTolerance?: number;     // Tolerance for amount matching
  nameSimilarityThreshold?: number; // 0-1 for fuzzy name matching
  autoResolveExactMatches?: boolean;
  dateFormat?: string;          // Expected date format in files
  currencySymbols?: string[];   // Symbols to clean from amounts
}

// File metadata for tracking
export interface FileMetadata {
  originalName: string;
  mimeType: string;
  encoding?: string;
  headers?: string[];           // CSV/Excel headers detected
  sheetNames?: string[];        // Excel sheets
  recordCount: number;
  parseErrors?: string[];
}

// API request/response interfaces

export interface POSDataRequest {
  startDate: string;        // YYYY-MM-DD format
  endDate: string;          // YYYY-MM-DD format
  reconciliationType: ReconciliationType;
}

export interface POSDataResponse {
  data: POSSalesRecord[] | GolfCoachingSalesRecord[];
  summary: {
    totalRecords: number;
    totalAmount: number;
    dateRange: { start: string; end: string; };
    reconciliationType: ReconciliationType;
  };
}

export interface FileUploadRequest {
  file: File;
  reconciliationType: ReconciliationType;
  dateRange: { start: string; end: string; };
  options?: Partial<ReconciliationOptions>;
}

export interface ParsedInvoiceData {
  items: InvoiceItem[];
  summary: {
    totalItems: number;
    totalAmount: number;
    parseErrors: string[];
  };
  metadata: FileMetadata;
}

export interface ReconciliationRequest {
  invoiceData: InvoiceItem[];
  posData: (POSSalesRecord | GolfCoachingSalesRecord)[];
  reconciliationType: ReconciliationType;
  options?: ReconciliationOptions;
}

// UI component props
export interface FileUploadProps {
  onFileSelect: (file: File, type: ReconciliationType) => void;
  supportedTypes: string[];
  maxSize: number;
  isLoading?: boolean;
}

export interface ReconciliationResultsProps {
  result: ReconciliationResult;
  onExport: (format: 'csv' | 'xlsx') => void;
  onResolveDiscrepancy: (itemId: string, resolution: string) => void;
}

export interface SummaryCardsProps {
  summary: ReconciliationSummary;
  isLoading?: boolean;
}

// Export options for results
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  includeMatched: boolean;
  includeDiscrepancies: boolean;
  includeSummary: boolean;
  filterByStatus?: ResolutionStatus[];
}

// CSV parsing configuration
export interface CSVParsingConfig {
  reconciliationType: ReconciliationType;
  expectedColumns: {
    date: string[];          // ['Date', 'Lesson Date', 'Transaction Date']
    customer: string[];      // ['Name', 'Customer', 'Student']
    quantity: string[];      // ['Qty', 'Quantity', 'Lessons']
    amount: string[];        // ['Amount', 'Total', 'Price']
    unitPrice?: string[];    // ['Unit Price', 'Per Lesson']
    productType?: string[];  // ['Type', 'Product', 'Item']
  };
  dateFormats: string[];     // ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
  currencySymbols: string[]; // ['฿', 'THB', '$']
  hasHeaders: boolean;
  delimiter: string;
  quote: string;
}

// Error types for better error handling
export interface ReconciliationError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  line?: number;
}

export class ParseError extends Error {
  constructor(
    message: string,
    public code: string,
    public line?: number,
    public field?: string
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class ReconciliationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ReconciliationError';
  }
}

// Utility types
export type ReconciliationSessionListItem = Pick<
  ReconciliationSession, 
  'id' | 'fileName' | 'reconciliationType' | 'matchRate' | 'varianceAmount' | 'status' | 'createdAt'
>;

export type CreateReconciliationSessionData = Omit<
  ReconciliationSession, 
  'id' | 'createdAt' | 'completedAt'
>;

export type UpdateReconciliationSessionData = Partial<
  Pick<ReconciliationSession, 'status' | 'errorMessage' | 'completedAt' | 'matchRate' | 'varianceAmount'>
>; 