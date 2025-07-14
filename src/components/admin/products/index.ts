// Product Management UI Components
// Modern, responsive components for the product management system

// Overview and Analytics
export { ProductOverviewCards, QuickStats } from './product-overview-cards';

// Product List and Table
export { ProductListTable } from './product-list-table';

// Filters and Search
export { ProductFiltersComponent } from './product-filters';

// Bulk Operations
export { BulkActions } from './bulk-actions';

// Pagination
export { ProductPagination, SimplePagination } from './product-pagination';

// Forms
export { ProductForm } from './product-form';
export { CategoryForm } from './category-form';

// Quick Actions
export { QuickActions, QuickSearch, ActionBar } from './quick-actions';

// Re-export types for convenience
export type {
  ProductWithCategory,
  Category,
  ProductFilters,
  ProductSort,
  ProductFormData,
  CategoryFormData
} from '@/types/product-management';