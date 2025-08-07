/**
 * Product Management Types
 * TypeScript definitions for the product management system
 */

// Database Types
export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  color_code?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Pricing & Cost
  price: number;
  cost?: number;
  profit_margin?: number;
  
  // Product Identifiers
  sku?: string;
  external_code?: string;
  
  // Basic Properties
  unit?: string;
  is_sim_usage: boolean;
  
  // Modifiers
  has_modifiers: boolean;
  
  // Status & Display
  is_active: boolean;
  display_order: number;
  pos_display_color?: string;
  
  // Custom product tracking
  is_custom_product: boolean;
  show_in_staff_ui: boolean;
  custom_created_by?: string;
  
  // Legacy Migration
  legacy_qashier_id?: string;
  legacy_pos_name?: string;
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ProductModifier {
  id: string;
  product_id: string;
  modifier_type: 'time' | 'quantity';
  name: string;
  price: number;
  cost_multiplier: number;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  old_price?: number;
  new_price: number;
  old_cost?: number;
  new_cost?: number;
  reason?: string;
  changed_by: string;
  changed_at: string;
}

// Enhanced Types with Relations
export interface CategoryWithProducts extends Category {
  products?: Product[];
  parent?: Category;
  children?: Category[];
  product_count?: number;
  total_value?: number;
  avg_price?: number;
}

export interface ProductWithCategory extends Product {
  category?: Category;
  category_path?: string; // e.g., "Drink > Bottle beer"
  price_history?: PriceHistory[];
  modifiers?: ProductModifier[];
}

export interface ProductWithModifiers extends Product {
  modifiers: ProductModifier[];
  modifier_type?: 'time' | 'quantity';
  default_modifier?: ProductModifier;
}

export interface CategoryHierarchy {
  id: string;
  name: string;
  slug: string;
  children: CategoryHierarchy[];
  product_count: number;
  total_value: number;
}

// Form Types
export interface ProductFormData {
  name: string;
  category_id: string;
  description?: string;
  price: number;
  cost?: number;
  sku?: string;
  external_code?: string;
  unit?: string;
  is_sim_usage: boolean;
  is_active: boolean;
  show_in_staff_ui?: boolean;
  display_order?: number;
  pos_display_color?: string;
  has_modifiers?: boolean;
}

export interface ModifierFormData {
  name: string;
  price: number;
  cost_multiplier: number;
  modifier_type: 'time' | 'quantity';
  is_default?: boolean;
  display_order?: number;
}

export interface CategoryFormData {
  name: string;
  parent_id?: string;
  description?: string;
  display_order?: number;
  color_code?: string;
  icon?: string;
  is_active: boolean;
}

export interface BulkUpdateData {
  product_ids: string[];
  updates: Partial<ProductFormData>;
  reason?: string;
}

export interface PriceUpdateData {
  product_id: string;
  new_price: number;
  new_cost?: number;
  reason?: string;
}

// Filter & Search Types
export interface ProductFilters {
  search?: string;
  category_id?: string;
  is_active?: boolean;
  is_sim_usage?: boolean;
  is_custom_product?: boolean;
  show_in_staff_ui?: boolean;
  price_min?: number;
  price_max?: number;
  has_cost?: boolean;
  profit_margin_min?: number;
  profit_margin_max?: number;
  created_after?: string;
  created_before?: string;
}

export interface CategoryFilters {
  search?: string;
  parent_id?: string;
  is_active?: boolean;
  has_products?: boolean;
}

export interface ProductSort {
  field: 'name' | 'price' | 'cost' | 'profit_margin' | 'created_at' | 'updated_at' | 'display_order';
  direction: 'asc' | 'desc';
}

export interface CategorySort {
  field: 'name' | 'display_order' | 'created_at' | 'product_count';
  direction: 'asc' | 'desc';
}

// Pagination Types
export interface PaginationParams {
  page: number;
  per_page: number;
  sort?: ProductSort | CategorySort;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: PaginatedResponse<any>['pagination'];
    filters?: any;
    total_count?: number;
  };
}

export interface ProductListResponse extends APIResponse<Product[]> {
  data: ProductWithCategory[];
  meta: {
    pagination: PaginatedResponse<any>['pagination'];
    filters: ProductFilters;
    categories: Category[];
    total_count: number;
  };
}

export interface CategoryListResponse extends APIResponse<Category[]> {
  data: CategoryWithProducts[];
  meta: {
    pagination: PaginatedResponse<any>['pagination'];
    filters: CategoryFilters;
    hierarchy: CategoryHierarchy[];
    total_count: number;
  };
}

// Analytics Types
export interface ProductAnalytics {
  total_products: number;
  active_products: number;
  inactive_products: number;
  custom_products: number;
  hidden_products: number;
  total_catalog_value: number;
  avg_price: number;
  avg_profit_margin: number;
  categories_count: number;
  products_without_cost: number;
  recent_changes: number;
}

export interface CategoryAnalytics {
  category_id: string;
  category_name: string;
  product_count: number;
  total_value: number;
  avg_price: number;
  avg_profit_margin: number;
  most_expensive_product: Product;
  least_expensive_product: Product;
  recent_changes: number;
}

export interface PriceAnalytics {
  product_id: string;
  product_name: string;
  current_price: number;
  price_changes_30d: number;
  price_trend: 'increasing' | 'decreasing' | 'stable';
  profit_margin: number;
  margin_trend: 'improving' | 'declining' | 'stable';
  last_updated: string;
}

// Import/Export Types
export interface ImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: any;
  }>;
  warnings: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  include_inactive?: boolean;
  include_custom?: boolean;
  category_ids?: string[];
  fields?: Array<keyof Product>;
}

// POS Integration Types
export interface POSProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  category_color?: string;
  sku?: string;
  is_active: boolean;
  display_color?: string;
  is_sim_usage: boolean;
  unit?: string;
}

export interface POSCategory {
  id: string;
  name: string;
  slug: string;
  color_code?: string;
  icon?: string;
  display_order: number;
  products: POSProduct[];
}

// UI State Types
export interface ProductManagementState {
  products: ProductWithCategory[];
  categories: CategoryWithProducts[];
  filters: ProductFilters;
  sort: ProductSort;
  pagination: PaginatedResponse<any>['pagination'];
  loading: boolean;
  error: string | null;
  selectedProducts: string[];
  analytics: ProductAnalytics | null;
}

export interface CategoryManagementState {
  categories: CategoryWithProducts[];
  hierarchy: CategoryHierarchy[];
  filters: CategoryFilters;
  sort: CategorySort;
  pagination: PaginatedResponse<any>['pagination'];
  loading: boolean;
  error: string | null;
  selectedCategory: string | null;
  expandedCategories: string[];
}

// Component Props Types
export interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface CategoryFormProps {
  category?: Category;
  parentCategories: Category[];
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface ProductListProps {
  products: ProductWithCategory[];
  categories: Category[];
  filters: ProductFilters;
  sort: ProductSort;
  pagination: PaginatedResponse<any>['pagination'];
  onFiltersChange: (filters: ProductFilters) => void;
  onSortChange: (sort: ProductSort) => void;
  onPageChange: (page: number) => void;
  onProductSelect: (productIds: string[]) => void;
  selectedProducts: string[];
  loading?: boolean;
}

export interface BulkActionsProps {
  selectedProducts: string[];
  categories: Category[];
  onBulkUpdate: (data: BulkUpdateData) => Promise<void>;
  onBulkDelete: (productIds: string[]) => Promise<void>;
  onPriceUpdate: (updates: PriceUpdateData[]) => Promise<void>;
  loading?: boolean;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Constants
export const PRODUCT_UNITS = [
  'pieces',
  'bottles',
  'hours',
  'packages',
  'servings',
  'plates',
  'glasses',
  'buckets',
  'sets'
] as const;

export type ProductUnit = typeof PRODUCT_UNITS[number];

export const PRICE_RANGES = [
  { label: 'Under ฿50', min: 0, max: 50 },
  { label: '฿50 - ฿200', min: 50, max: 200 },
  { label: '฿200 - ฿500', min: 200, max: 500 },
  { label: '฿500 - ฿1,000', min: 500, max: 1000 },
  { label: '฿1,000 - ฿5,000', min: 1000, max: 5000 },
  { label: 'Over ฿5,000', min: 5000, max: Infinity }
] as const;

export const PROFIT_MARGIN_RANGES = [
  { label: 'Low (0-30%)', min: 0, max: 30 },
  { label: 'Medium (30-60%)', min: 30, max: 60 },
  { label: 'High (60%+)', min: 60, max: Infinity }
] as const;