import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export interface ProductCatalogOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sortBy?: 'name' | 'price' | 'category';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
}

export interface SearchOptions {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'relevance' | 'name' | 'price_asc' | 'price_desc';
  limit?: number;
}

export interface CategoryHierarchyOptions {
  includeProductCount?: boolean;
  activeOnly?: boolean;
}

export interface POSProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  categoryId: string;
  categoryName?: string;
  posTabCategory?: string;
  sku?: string;
  description?: string;
  posDisplayColor?: string;
  imageUrl?: string;
  hasModifiers: boolean;
  modifiers: any[];
  isActive: boolean;
  relevanceScore?: number;
}

export interface POSCategory {
  id: string;
  name: string;
  parentId?: string;
  posTabCategory?: string;
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

export class ProductCatalogService {
  private baseUrl = '/api/pos/products';

  /**
   * Fetch products with pagination and filtering
   */
  async getProducts(options: ProductCatalogOptions = {}): Promise<ProductCatalogResponse> {
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.category) params.append('category', options.category);
    if (options.search) params.append('search', options.search);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search products with advanced filtering and ranking
   */
  async searchProducts(options: SearchOptions): Promise<ProductSearchResponse> {
    const params = new URLSearchParams();
    
    params.append('q', options.query);
    if (options.category) params.append('category', options.category);
    if (options.minPrice) params.append('minPrice', options.minPrice.toString());
    if (options.maxPrice) params.append('maxPrice', options.maxPrice.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${this.baseUrl}/search?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search products: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get category hierarchy for navigation
   */
  async getCategoryHierarchy(options: CategoryHierarchyOptions = {}): Promise<CategoryHierarchyResponse> {
    const params = new URLSearchParams();
    
    if (options.includeProductCount) params.append('includeProductCount', 'true');
    if (options.activeOnly === false) params.append('activeOnly', 'false');

    const response = await fetch(`${this.baseUrl}/categories/hierarchy?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch category hierarchy: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get categories with optional product counts
   */
  async getCategories(includeProductCount: boolean = false, activeOnly: boolean = true) {
    const params = new URLSearchParams();
    
    if (includeProductCount) params.append('includeProductCount', 'true');
    if (!activeOnly) params.append('activeOnly', 'false');

    const response = await fetch(`${this.baseUrl}/categories?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get products by category with caching support
   */
  async getProductsByCategory(categoryId: string, options: Omit<ProductCatalogOptions, 'category'> = {}): Promise<ProductCatalogResponse> {
    return this.getProducts({ ...options, category: categoryId });
  }

  /**
   * Get product suggestions for autocomplete
   */
  async getProductSuggestions(query: string, category?: string): Promise<string[]> {
    if (query.length < 2) return [];

    try {
      const response = await this.searchProducts({ 
        query, 
        category, 
        limit: 5 
      });
      return response.suggestions;
    } catch (error) {
      console.error('Failed to get product suggestions:', error);
      return [];
    }
  }

  /**
   * Get popular products for quick access
   */
  async getPopularProducts(limit: number = 20): Promise<POSProduct[]> {
    try {
      // This could be enhanced with actual popularity metrics
      const response = await this.getProducts({ 
        limit, 
        sortBy: 'name',
        sortOrder: 'asc' 
      });
      return response.products;
    } catch (error) {
      console.error('Failed to get popular products:', error);
      return [];
    }
  }

  /**
   * Get products by tab category (DRINK, FOOD, GOLF, PACKAGES)
   */
  async getProductsByTab(tabCategory: string, options: Omit<ProductCatalogOptions, 'category'> = {}): Promise<POSProduct[]> {
    try {
      // First get categories for this tab
      const categoryResponse = await this.getCategories(false, true);
      const tabCategories = categoryResponse.tabCategories[tabCategory] || [];
      
      if (tabCategories.length === 0) return [];

      // Get products from all categories in this tab
      const allProducts: POSProduct[] = [];
      
      for (const category of tabCategories) {
        const productResponse = await this.getProductsByCategory(category.id, options);
        allProducts.push(...productResponse.products);
      }

      return allProducts;
    } catch (error) {
      console.error(`Failed to get products for tab ${tabCategory}:`, error);
      return [];
    }
  }

  /**
   * Check if service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?limit=1`);
      return response.ok;
    } catch (error) {
      console.error('Product catalog service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const productCatalogService = new ProductCatalogService();