// Payment Processing TypeScript Types
// Matches existing pos.lengolf_sales payment_method values

export enum PaymentMethod {
  CASH = 'Cash',
  VISA_MANUAL = 'Visa Manual',
  MASTERCARD_MANUAL = 'Mastercard Manual',
  PROMPTPAY_MANUAL = 'PromptPay Manual',
  ALIPAY = 'Alipay1'
}

export interface PaymentMethodConfig {
  method: PaymentMethod;
  displayName: string;
  icon: string;
  color: string;
  requiresAmount?: boolean;
  requiresConfirmation?: boolean;
  supportsPartialPayment?: boolean;
  instructions?: string;
}

export interface PaymentAllocation {
  method: PaymentMethod;
  amount: number;
  percentage?: number;
  reference?: string;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  itemSequence: number;
  
  // Order linking
  orderId: string;
  tableSessionId: string;
  productId?: string;
  
  // Product details
  productName: string;
  productCategory?: string;
  productParentCategory?: string;
  skuNumber?: string;
  
  // Pricing
  itemCount: number;
  itemPriceInclVat: number;
  itemPriceExclVat: number;
  itemDiscount: number;
  salesTotal: number;
  salesNet: number;
  
  // Payment allocation
  paymentMethod?: PaymentMethod;
  paymentAmountAllocated?: number;
  
  // Context
  staffPin: string;
  customerId?: string;
  customerName?: string;
  tableNumber?: string;
  isSimUsage: boolean;
  itemNotes?: string;
  
  // Void handling
  isVoided: boolean;
  voidedAt?: Date;
  voidedBy?: string;
  
  // Timestamps
  salesTimestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  transactionId: string;
  receiptNumber: string;
  
  // Totals
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  discountAmount: number;
  
  // Payment details
  paymentMethods: PaymentAllocation[];
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  
  // Context
  tableSessionId: string;
  orderId: string;
  staffPin: string;
  customerId?: string;
  customerName?: string;
  tableNumber?: string;
  
  // Timestamps
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Related data
  items?: TransactionItem[];
}

// Split payment types
export enum BillSplitType {
  EVEN = 'even',
  BY_ITEM = 'by_item', 
  BY_AMOUNT = 'by_amount'
}

export interface BillSplit {
  id: string;
  type: BillSplitType;
  totalAmount: number;
  splits: BillSplitPart[];
}

export interface BillSplitPart {
  id: string;
  customerInfo?: string;
  items: string[]; // Transaction item IDs
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'completed';
  promptPayQR?: string;
}

// API request/response types
export interface PaymentInitializationRequest {
  orderId: string;
  tableSessionId: string;
  totalAmount: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    categoryId?: string;
    categoryName?: string;
    skuNumber?: string;
  }[];
  customerId?: string;
  staffPin: string;
  tableNumber?: string;
}

export interface PaymentProcessingRequest {
  orderId: string;
  tableSessionId: string;
  paymentMethods: PaymentAllocation[];
  staffPin?: string; // Legacy support
  staffId?: number; // New preferred method
  staffName?: string; // New preferred method
  customerName?: string;
  tableNumber?: string;
  closeTableSession?: boolean;
  notes?: string;
  splitBill?: BillSplit;
}

export interface PaymentProcessingResponse {
  success: boolean;
  transaction?: Transaction;
  receiptNumber?: string;
  message?: string;
  errors?: string[];
  redirectToTables?: boolean;
  requiresStaffAuth?: boolean; // Indicates that staff re-authentication is needed
}

// PromptPay specific types
export interface PromptPayConfig {
  phoneNumber?: string;
  nationalId?: string;
  eWalletId?: string;
}

export interface PromptPayQRRequest {
  amount: number;
  ref1?: string;
  ref2?: string;
}

export interface PromptPayQRResponse {
  qrCodeDataURL: string;
  payload: string;
  amount: number;
  expiresAt: Date;
}

// Receipt types
export interface ReceiptData {
  transactionId: string;
  receiptNumber: string;
  businessInfo: {
    name: string;
    address: string;
    taxId: string;
    phone: string;
  };
  transaction: {
    date: Date;
    tableNumber?: string;
    staffName: string;
    customerName?: string;
    items: ReceiptItem[];
    subtotal: number;
    vatAmount: number;
    totalAmount: number;
    paymentMethods: PaymentAllocation[];
  };
  footer: {
    thankYouMessage: string;
    returnPolicy?: string;
  };
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// Error types
export class PaymentError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class PaymentValidationError extends PaymentError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'PaymentValidationError';
  }
}

export class PaymentProcessingError extends PaymentError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'PROCESSING_ERROR');
    this.name = 'PaymentProcessingError';
  }
}