// Inventory Management Type Definitions
// Following existing patterns from package-form.ts and booking.ts

export interface InventoryCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryProduct {
  id: string;
  category_id: string;
  name: string;
  unit?: string;
  input_type: 'number' | 'checkbox' | 'textarea' | 'select' | 'stock_slider' | 'glove_sizes';
  input_options?: {
    options: string[];
    type: 'single_select' | 'multi_select';
  };
  reorder_threshold?: number;
  supplier?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Simplified submission structure
export interface InventorySubmission {
  id: string;
  date: string; // YYYY-MM-DD format (submission date)
  staff: string; // staff member name
  product_id: string;
  category_id: string;
  value_numeric?: number; // For numeric values (counts, amounts)
  value_text?: string; // For text values (notes, status) 
  value_json?: any; // For complex values (glove sizes breakdown)
  note?: string; // individual product note
  created_at: string;
  updated_at: string;
}

// Legacy submission interface for backward compatibility
export interface LegacyInventorySubmission {
  id: string;
  staff_name: string;
  submission_date: string; // YYYY-MM-DD format
  inventory_data: Record<string, string | number>; // { "product_id": "value" }
  reorder_alerts?: Record<string, boolean>;
  notes?: string;
  submitted_at: string;
  created_by?: string;
}

// Form-specific types
export interface InventoryFormData {
  staff_name: string;
  submission_date: string;
  products: Record<string, string | number>;
  notes?: string;
}

// API Response types
export interface ProductsApiResponse {
  categories: {
    id: string;
    name: string;
    display_order: number;
    products: InventoryProduct[];
  }[];
}

export interface SubmissionsApiResponse {
  submissions: InventorySubmission[];
  total: number;
  page: number;
  limit: number;
}

// Staff options (matching current Google Form)
export const STAFF_OPTIONS = ['Net', 'Dolly', 'May'] as const;
export type StaffName = typeof STAFF_OPTIONS[number];

// Form state management (following package-form pattern)
export interface InventoryFormState {
  categories: InventoryCategory[];
  products: InventoryProduct[];
  isLoading: boolean;
  error: string | null;
  selectedStaff: string;
  submissionDate: Date | null;
  formData: Record<string, string | number | GloveSizeData>;
  isSubmitting: boolean;
  showConfirmation: boolean;
}

// Product input type helpers
export interface ProductInputProps {
  product: InventoryProduct;
  value: string | number | GloveSizeData | undefined;
  onChange: (productId: string, value: string | number) => void;
  error?: string;
}

// Category section props
export interface CategorySectionProps {
  category: {
    id: string;
    name: string;
    display_order: number;
    products: InventoryProduct[];
  };
  formData: Record<string, string | number | GloveSizeData>;
  onChange: (productId: string, value: string | number) => void;
  errors?: Record<string, string>;
}

// API request/response types for redesigned submissions
export interface CreateSubmissionRequest {
  staff_name: string;
  submission_date: string;
  products: ProductSubmissionData[];
  general_notes?: string; // Overall submission notes
}

export interface ProductSubmissionData {
  product_id: string;
  category_id: string;
  value_numeric?: number;
  value_text?: string;
  value_json?: any;
  note?: string; // Individual product note
}

export interface CreateSubmissionResponse {
  success: boolean;
  submissions?: InventorySubmission[]; // Array since we create one per product
  error?: string;
}

// Legacy API types for backward compatibility
export interface LegacyCreateSubmissionRequest {
  staff_name: string;
  submission_date: string;
  inventory_data: Record<string, string | number>;
  notes?: string;
}

export interface LegacyCreateSubmissionResponse {
  success: boolean;
  submission?: LegacyInventorySubmission;
  error?: string;
}

// Hook return types (following existing hook patterns)
export interface UseInventoryProductsReturn {
  data: ProductsApiResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  mutate: () => void;
}

export interface UseInventorySubmissionReturn {
  submit: (data: CreateSubmissionRequest) => Promise<CreateSubmissionResponse>;
  isLoading: boolean;
  error: Error | null;
}

// Stock level slider values (Change #2)
export const STOCK_LEVEL_VALUES = {
  1: 'Out of Stock',
  2: 'Need to Order', 
  3: 'Enough Stock'
} as const;

export type StockLevelValue = keyof typeof STOCK_LEVEL_VALUES;

// Golf glove sizes (Change #3)  
export const GLOVE_SIZES = ['18', '19', '20', '21', '22', '23', '24', '25'] as const;
export type GloveSize = typeof GLOVE_SIZES[number];
export type GloveSizeData = Record<GloveSize, number>;

// Admin Dashboard Types
export interface AdminInventoryProductWithStatus {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  current_stock: number;
  current_stock_text?: string; // For stock slider products showing "Out of Stock", "Need to Order", etc.
  reorder_threshold: number;
  unit_cost?: number;
  image_url?: string;
  purchase_link?: string;
  supplier?: string;
  unit?: string;
  input_type: 'number' | 'checkbox' | 'textarea' | 'select' | 'stock_slider' | 'glove_sizes';
  last_updated_by?: string;
  last_updated_at?: string;
  reorder_status: 'REORDER_NEEDED' | 'LOW_STOCK' | 'ADEQUATE';
  stock_difference?: number;
  inventory_value?: number;
}

// Admin product update request type
export interface UpdateProductMetadataRequest {
  unit_cost?: number;
  image_url?: string;
  purchase_link?: string;
  reorder_threshold?: number;
}

// Product trend data for admin dashboard charts
export interface ProductTrendData {
  product_id: string;
  trend_data: {
    date: string;
    value: number;
    staff: string;
  }[];
}

export interface AdminInventoryOverview {
  summary: {
    total_inventory_value: number;
    needs_reorder_count: number;
    low_stock_count: number;
    sufficient_stock_count: number;
  };
  products: {
    needs_reorder: AdminInventoryProductWithStatus[];
    low_stock: AdminInventoryProductWithStatus[];
    sufficient_stock: AdminInventoryProductWithStatus[];
  };
} 