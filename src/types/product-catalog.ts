// Product Catalog TypeScript Types
// Comprehensive type definitions for the POS Product Catalog system

export interface ProductCatalogOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sortBy?: 'name' | 'price' | 'category' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
}

export interface CategoryFilter {
  categoryId?: string;
  posTabCategory?: 'DRINK' | 'FOOD' | 'GOLF' | 'PACKAGES' | 'OTHER';
  includeSubcategories?: boolean;
}

export interface PriceRange {
  min?: number;
  max?: number;
  currency?: 'THB' | 'USD';
}

export interface ProductAvailability {
  isActive: boolean;
  inStock: boolean;
  stockQuantity?: number;
  isLowStock?: boolean;
  lowStockThreshold?: number;
}

// Enhanced Product Types
export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  thumbnailUrl?: string;
  displayOrder: number;
}

export interface ProductNutrition {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  sugar?: number;
  allergens?: string[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
  isDefault: boolean;
  attributes: Record<string, string>; // size: "Large", flavor: "Vanilla"
  availability: ProductAvailability;
}

export interface EnhancedPOSProduct {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  price: number;
  unit: string;
  sku?: string;
  barcode?: string;
  
  // Category information
  categoryId: string;
  categoryName: string;
  categoryPath: string[]; // ["Drinks", "Hot Beverages", "Coffee"]
  posTabCategory: 'DRINK' | 'FOOD' | 'GOLF' | 'PACKAGES' | 'OTHER';
  
  // Visual and display
  images: ProductImage[];
  primaryImageUrl?: string;
  posDisplayColor?: string;
  icon?: string;
  
  // Modifiers and variants
  modifiers: ProductModifier[];
  variants: ProductVariant[];
  hasModifiers: boolean;
  hasVariants: boolean;
  
  // Availability and stock
  availability: ProductAvailability;
  
  // Nutritional information (for food/drink items)
  nutrition?: ProductNutrition;
  
  // Search and discovery
  tags: string[];
  searchKeywords: string[];
  relevanceScore?: number;
  popularity?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Cache metadata
  cachedAt?: number;
  cacheVersion?: string;
}

// Category Types
export interface CategoryImage {
  url: string;
  altText?: string;
}

export interface EnhancedPOSCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  posTabCategory: 'DRINK' | 'FOOD' | 'GOLF' | 'PACKAGES' | 'OTHER';
  
  // Display properties
  displayOrder: number;
  colorTheme: string;
  icon?: string;
  image?: CategoryImage;
  
  // Hierarchy information
  level: number;
  path: string[];
  breadcrumbs: string[];
  children: EnhancedPOSCategory[];
  parentCategory?: EnhancedPOSCategory;
  
  // Product counts
  productCount: number;
  totalProductCount: number; // Including subcategories
  activeProductCount: number;
  
  // Availability
  isActive: boolean;
  isVisible: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Product Modifier Types
export interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  modifiers: ProductModifier[];
}

export interface ProductModifier {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceType: 'fixed' | 'percentage';
  isRequired: boolean;
  isDefault: boolean;
  displayOrder: number;
  availability: ProductAvailability;
  groupId?: string;
  group?: ModifierGroup;
  
  // Nutritional impact
  nutritionalImpact?: Partial<ProductNutrition>;
}

export interface SelectedModifier {
  modifierId: string;
  modifierName: string;
  price: number;
  priceType: 'fixed' | 'percentage';
  quantity: number;
  groupId?: string;
  groupName?: string;
}

// Search Types
export interface SearchContext {
  query: string;
  category?: string;
  posTabCategory?: string;
  filters: ProductSearchFilters;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface ProductSearchFilters {
  priceRange?: PriceRange;
  categories?: string[];
  posTabCategories?: Array<'DRINK' | 'FOOD' | 'GOLF' | 'PACKAGES' | 'OTHER'>;
  availability?: {
    activeOnly?: boolean;
    inStockOnly?: boolean;
    lowStockIncluded?: boolean;
  };
  tags?: string[];
  hasModifiers?: boolean;
  hasVariants?: boolean;
  sortBy?: 'relevance' | 'name' | 'price_asc' | 'price_desc' | 'popularity' | 'newest';
  limit?: number;
}

export interface SearchResult {
  products: EnhancedPOSProduct[];
  facets: SearchFacets;
  metadata: SearchMetadata;
}

export interface SearchFacets {
  categories: Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
  }>;
  priceRanges: Array<{
    min: number;
    max: number;
    productCount: number;
    label: string;
  }>;
  tags: Array<{
    tag: string;
    productCount: number;
  }>;
  availability: {
    active: number;
    inactive: number;
    inStock: number;
    outOfStock: number;
  };
}

export interface SearchMetadata {
  query: string;
  totalResults: number;
  searchTime: number;
  appliedFilters: ProductSearchFilters;
  suggestions: string[];
  correctedQuery?: string;
  searchId: string;
  timestamp: Date;
}

// Cache Types
export interface ProductCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
  version: string;
  tags: string[];
}

export interface CacheInvalidation {
  type: 'product' | 'category' | 'search' | 'all';
  keys?: string[];
  tags?: string[];
  reason?: string;
  timestamp: Date;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  averageResponseTime: number;
  cacheSize: number;
  memoryUsage: number;
  lastCleanup: Date;
}

// Performance Types
export interface PerformanceMetrics {
  searchResponseTime: number;
  cacheHitRate: number;
  databaseQueryTime: number;
  indexingTime: number;
  totalRequestTime: number;
  memoryUsage: number;
  cpuUsage?: number;
}

export interface PerformanceBenchmark {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  sampleSize: number;
  timestamp: Date;
}

// Analytics Types
export interface ProductAnalytics {
  productId: string;
  views: number;
  searches: number;
  addToCart: number;
  purchases: number;
  revenue: number;
  popularSearchTerms: string[];
  conversionRate: number;
  averageRating?: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueSearches: number;
  averageResultsPerSearch: number;
  mostPopularQueries: Array<{
    query: string;
    count: number;
    averageResults: number;
  }>;
  noResultQueries: Array<{
    query: string;
    count: number;
  }>;
  searchToCartRate: number;
  searchToPurchaseRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

// API Response Types
export interface ProductCatalogApiResponse {
  products: EnhancedPOSProduct[];
  categories: EnhancedPOSCategory[];
  pagination: PaginationInfo;
  facets?: SearchFacets;
  metadata: {
    totalProducts: number;
    totalCategories: number;
    searchTime?: number;
    cacheHit?: boolean;
    lastUpdated: string;
    version: string;
  };
}

export interface CategoryHierarchyApiResponse {
  hierarchy: EnhancedPOSCategory[];
  tabHierarchy: Record<string, EnhancedPOSCategory[]>;
  flatCategories: EnhancedPOSCategory[];
  categoryBreadcrumbs: Record<string, string[]>;
  tabStats: Record<string, {
    categoryCount: number;
    productCount: number;
    activeProductCount: number;
    maxDepth: number;
  }>;
  metadata: {
    totalCategories: number;
    maxDepth: number;
    tabCount: number;
    lastUpdated: string;
    version: string;
  };
}

export interface ProductSearchApiResponse {
  products: EnhancedPOSProduct[];
  suggestions: string[];
  facets: SearchFacets;
  metadata: SearchMetadata;
  pagination?: PaginationInfo;
  analytics?: {
    similarSearches: string[];
    trendingProducts: string[];
    recommendedFilters: ProductSearchFilters;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Error Types
export interface ProductCatalogError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  stack?: string;
}

export interface ValidationError extends ProductCatalogError {
  field: string;
  value: any;
  constraint: string;
}

export interface SearchError extends ProductCatalogError {
  query: string;
  filters?: ProductSearchFilters;
  retryable: boolean;
  retryAfter?: number;
}

// Event Types for Real-time Updates
export interface ProductCatalogEvent {
  type: 'product_updated' | 'product_created' | 'product_deleted' | 
        'category_updated' | 'category_created' | 'category_deleted' |
        'inventory_updated' | 'price_changed';
  payload: {
    productId?: string;
    categoryId?: string;
    changes?: Record<string, any>;
    timestamp: Date;
    userId?: string;
  };
}

export interface RealTimeUpdateConfig {
  enabled: boolean;
  channels: string[];
  reconnectInterval: number;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
}

// Configuration Types
export interface ProductCatalogConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  cache: {
    enabled: boolean;
    defaultTTL: number;
    maxSize: number;
    cleanupInterval: number;
  };
  search: {
    debounceMs: number;
    minQueryLength: number;
    maxResults: number;
    enableSuggestions: boolean;
    enableAnalytics: boolean;
  };
  realtime: RealTimeUpdateConfig;
  performance: {
    enableMetrics: boolean;
    benchmarkInterval: number;
    slowQueryThreshold: number;
  };
}