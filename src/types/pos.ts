// POS System TypeScript Types
// Table Management System Types

export interface Zone {
  id: string;
  name: string;
  displayName: string;
  zoneType: 'bar' | 'bay';
  colorTheme: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Table {
  id: string;
  zoneId: string;
  tableNumber: number;
  displayName: string;
  maxPax: number;
  position: {
    x: number;
    y: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  zone: Zone;
  currentSession?: TableSession;
}

export type TableStatus = 'occupied' | 'paid' | 'closed';

export interface TableSession {
  id: string;
  tableId: string;
  status: TableStatus;
  paxCount: number;
  bookingId?: string; // Optional for walk-ins initially
  staffPin?: string; // Staff who opened via PIN login
  sessionStart?: Date;
  sessionEnd?: Date;
  totalAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  orders: TableOrder[];
  customer?: Customer;
  assignedStaff?: Staff;
  table?: Table;
  booking?: Booking;
}

export interface TableOrder {
  id: string;
  tableSessionId: string;
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  orderStatus: string;
  createdAt: Date;
}

// Supporting types from existing systems
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface Staff {
  id: string;
  name: string;
  pin: string;
  role: string;
  isActive: boolean;
}

export interface Booking {
  id: string;
  customerId?: string;
  name: string;
  email: string;
  phoneNumber: string;
  phone?: string; // Add phone property for compatibility
  date: string;
  startTime: string;
  duration: number;
  numberOfPeople: number;
  status: string;
  bay?: string;
  bookingType?: string;
  packageName?: string;
  customerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Table Management API Types
export interface GetTablesResponse {
  tables: Table[];
  zones: Zone[];
  summary: TableSummary;
}

export interface TableSummary {
  totalTables: number;
  occupiedTables: number;
  availableTables: number;
  totalRevenue: number;
  byZone: ZoneSummary[];
}

export interface ZoneSummary {
  zoneName: string;
  total: number;
  occupied: number;
  available: number;
}

export interface OpenTableRequest {
  bookingId?: string; // Optional for walk-ins initially
  staffPin?: string; // Legacy: From current PIN session
  staffId?: number; // Preferred: Staff ID from authenticated session
  paxCount?: number; // Optional override of booking.numberOfPeople
  notes?: string;
}

export interface OpenTableResponse {
  success: boolean;
  session: TableSession;
  message?: string;
}

export interface UpdateTableStatusRequest {
  status: TableStatus;
  reason?: string;
}

export interface UpdateTableStatusResponse {
  success: boolean;
  session: TableSession;
  message?: string;
}

export interface CloseTableRequest {
  reason?: string;
  finalAmount?: number;
  staffPin?: string;
  forceClose?: boolean; // Set to true for cancellations, allows closing with unpaid orders
}

export interface CloseTableResponse {
  success: boolean;
  closedSession: TableSession;
  message?: string;
}

export interface TransferTableRequest {
  fromTableId: string;
  toTableId: string;
  staffPin: string; // Required for staff validation
  orderIds?: string[]; // Optional: specific orders to transfer
  transferAll?: boolean;
}

export interface TransferTableResponse {
  success: boolean;
  fromSession: TableSession;
  toSession: TableSession;
  transferredOrders: TableOrder[];
  message?: string;
}

// Real-time Event Types
export interface TableEventMessage {
  type: 'subscribe' | 'unsubscribe' | 'update_status';
  payload: {
    tableIds?: string[];
    zoneIds?: string[];
    status?: TableStatus;
    sessionData?: Partial<TableSession>;
  };
}

export interface TableUpdateEvent {
  type: 'table_updated' | 'session_created' | 'session_closed' | 'order_added';
  payload: {
    tableId: string;
    session?: TableSession;
    order?: TableOrder;
    timestamp: string;
  };
}

// Component Props Types
export interface TableCardProps {
  table: Table;
  onClick: (table: Table) => void;
  onStatusChange: (tableId: string, status: TableStatus) => void;
  onPayment?: (table: Table) => void;
  closeTable: (tableId: string, request?: CloseTableRequest) => Promise<CloseTableResponse>;
  isSelected?: boolean;
}

export interface TableDetailModalProps {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  onOpenTable: (request: OpenTableRequest) => Promise<void>;
}

export interface ZoneSectionProps {
  zone: Zone;
  tables: Table[];
  onTableClick: (table: Table) => void;
  onTableStatusChange: (tableId: string, status: TableStatus) => void;
  closeTable: (tableId: string, request?: CloseTableRequest) => Promise<CloseTableResponse>;
}

// Store Types
export interface TableStore {
  tables: Table[];
  zones: Zone[];
  selectedTable: Table | null;
  wsConnection: WebSocket | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  initializeRealtime: () => void;
  refreshTables: () => Promise<void>;
  openTable: (tableId: string, request: OpenTableRequest) => Promise<void>;
  closeTable: (tableId: string, request?: CloseTableRequest) => Promise<void>;
  transferTable: (request: TransferTableRequest) => Promise<void>;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  setSelectedTable: (table: Table | null) => void;
  handleTableUpdate: (event: TableUpdateEvent) => void;
}

export interface POSStore {
  // Cached data for performance
  products: Map<string, Product>;
  customers: Map<string, Customer>;
  recentBookings: Booking[];
  
  // Cache management
  updateProductCache: (products: Product[]) => void;
  updateCustomerCache: (customers: Customer[]) => void;
  getCachedProduct: (id: string) => Product | null;
  getCachedCustomer: (id: string) => Customer | null;
  preloadData: () => Promise<void>;
}

// Product types for POS system
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
  cachedAt: number;
}

// Enhanced Product types for POS Interface
export interface POSProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  categoryId: string;
  categoryName?: string;
  sku?: string;
  description?: string;
  posDisplayColor?: string;
  imageUrl?: string;
  modifiers: any[];
  isActive: boolean;
  relevanceScore?: number;
}

export interface POSCategory {
  id: string;
  name: string;
  parentId?: string;
  displayOrder: number;
  colorTheme: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  productCount?: number;
  totalProductCount?: number;
  children?: POSCategory[];
  level?: number;
  path?: string[];
}

// Product Catalog API Response Types
export interface ProductCatalogResponse {
  products: POSProduct[];
  categories: POSCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata: {
    totalProducts: number;
    categoriesCount: number;
    lastUpdated: string;
  };
}

export interface ProductSearchResponse {
  products: POSProduct[];
  suggestions: string[];
  metadata: {
    query: string;
    totalResults: number;
    searchTime: number;
    appliedFilters: {
      category?: string;
      minPrice?: string;
      maxPrice?: string;
      sortBy: string;
    };
  };
}

export interface CategoryHierarchyResponse {
  hierarchy: POSCategory[];
  tabHierarchy: {
    DRINK: POSCategory[];
    FOOD: POSCategory[];
    GOLF: POSCategory[];
    PACKAGES: POSCategory[];
    OTHER: POSCategory[];
  };
  flatCategories: POSCategory[];
  categoryBreadcrumbs: Record<string, string[]>;
  tabStats: Record<string, { categories: number; totalProducts: number; maxDepth: number }>;
  metadata: {
    totalCategories: number;
    maxDepth: number;
    tabCount: number;
    includeProductCount: boolean;
    activeOnly: boolean;
    lastUpdated: string;
  };
}

// Product Selection and Order Types
export interface ProductModifier {
  id: string;
  name: string;
  price: number;
  required: boolean;
  options?: ProductModifierOption[];
}

export interface ProductModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: SelectedModifier[];
  notes?: string;
  categoryId: string;
  categoryName: string;
}

export interface SelectedModifier {
  modifierId: string;
  modifierName: string;
  price: number;
  priceType: 'fixed' | 'percentage';
  quantity: number;
  selectedOptions: {
    optionId: string;
    optionName: string;
    priceAdjustment: number;
  }[];
}

export interface Order {
  id: string;
  orderNumber: string;
  tableSessionId?: string;
  customerId?: string;
  staffPin: string;
  items: OrderItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  discountAmount: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Error types
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Conflict resolution types
export interface ConflictData {
  currentStatus?: TableStatus;
  currentSession?: TableSession;
  sourceStatus?: TableStatus;
  destinationStatus?: TableStatus;
}

export interface TableOperation {
  type: 'open_table' | 'close_table' | 'transfer_table' | 'update_status';
  tableId: string;
  data?: any;
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

// Cache configuration
export interface CacheConfig {
  products: {
    ttl: number;
    strategy: 'stale-while-revalidate' | 'cache-first' | 'network-first' | 'network-only';
  };
  customers: {
    ttl: number;
    strategy: 'stale-while-revalidate' | 'cache-first' | 'network-first' | 'network-only';
  };
  tableStates: {
    ttl: number;
    strategy: 'stale-while-revalidate' | 'cache-first' | 'network-first' | 'network-only';
  };
  bookings: {
    ttl: number;
    strategy: 'stale-while-revalidate' | 'cache-first' | 'network-first' | 'network-only';
  };
}

// Payment-related types (extending POS system)
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface PaymentTransaction {
  id: string;
  transactionId: string;
  receiptNumber: string;
  orderId: string;
  tableSessionId: string;
  
  // Totals
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  discountAmount: number;
  
  // Payment details
  paymentMethods: string; // JSON string or formatted string for lengolf_sales compatibility
  paymentStatus: PaymentStatus;
  
  // Context
  staffPin: string;
  customerId?: string;
  customerName?: string;
  tableNumber?: string;
  
  // Timestamps
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Order interface to include payment status
export interface OrderWithPayment extends Order {
  paymentStatus?: PaymentStatus;
  paymentTransaction?: PaymentTransaction;
  canProcessPayment: boolean;
}

// Extended TableSession to include payment tracking
export interface TableSessionWithPayment extends TableSession {
  hasUnpaidOrders: boolean;
  totalUnpaidAmount: number;
  paymentTransactions: PaymentTransaction[];
}