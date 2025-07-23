import { productCatalogService, POSProduct, SearchOptions } from './ProductCatalogService';

export interface SearchResult {
  products: POSProduct[];
  suggestions: string[];
  metadata: {
    query: string;
    totalResults: number;
    searchTime: number;
    appliedFilters: any;
  };
}

export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'relevance' | 'name' | 'price_asc' | 'price_desc';
  inStock?: boolean;
}

export interface SearchHistory {
  query: string;
  timestamp: Date;
  resultCount: number;
}

export class ProductSearchEngine {
  private searchHistory: SearchHistory[] = [];
  private recentQueries: Set<string> = new Set();
  private cache: Map<string, { result: SearchResult; timestamp: number; ttl: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_HISTORY = 50;
  private readonly MAX_RECENT_QUERIES = 10;

  /**
   * Main search function with caching and analytics
   */
  async search(query: string, filters: SearchFilters = {}): Promise<SearchResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(query, filters);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.result;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    try {
      // Prepare search options
      const searchOptions: SearchOptions = {
        query,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sortBy: filters.sortBy || 'relevance',
        limit: 50
      };

      // Perform search
      const result = await productCatalogService.searchProducts(searchOptions);

      // Filter by stock if requested
      if (filters.inStock) {
        result.products = result.products.filter(product => product.isActive);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      // Add to search history
      this.addToHistory(query, result.products.length);

      // Add to recent queries
      this.addToRecentQueries(query);

      return result;

    } catch (error) {
      console.error('Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get search suggestions based on query and history
   */
  async getSuggestions(query: string, category?: string): Promise<string[]> {
    if (query.length < 2) {
      return this.getRecentQueries();
    }

    try {
      // Get suggestions from the service
      const serviceSuggestions = await productCatalogService.getProductSuggestions(query, category);
      
      // Combine with recent queries that match
      const recentMatches = Array.from(this.recentQueries)
        .filter(q => q.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      // Combine and deduplicate
      const allSuggestions = Array.from(new Set([...serviceSuggestions, ...recentMatches]));
      
      return allSuggestions.slice(0, 8);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return this.getRecentQueries();
    }
  }

  /**
   * Quick search for instant results (used with debouncing)
   */
  async quickSearch(query: string, category?: string): Promise<POSProduct[]> {
    if (query.length < 2) return [];

    try {
      const result = await this.search(query, { category, sortBy: 'relevance' });
      return result.products.slice(0, 10); // Return top 10 results for quick search
    } catch (error) {
      console.error('Quick search failed:', error);
      return [];
    }
  }

  /**
   * Search by SKU (exact match preferred)
   */
  async searchBySKU(sku: string): Promise<POSProduct[]> {
    try {
      const result = await this.search(sku, { sortBy: 'relevance' });
      
      // Prioritize exact SKU matches
      return result.products.sort((a, b) => {
        const aExact = a.sku?.toLowerCase() === sku.toLowerCase() ? 1 : 0;
        const bExact = b.sku?.toLowerCase() === sku.toLowerCase() ? 1 : 0;
        return bExact - aExact;
      });
    } catch (error) {
      console.error('SKU search failed:', error);
      return [];
    }
  }

  /**
   * Search within a specific category
   */
  async searchInCategory(query: string, categoryId: string): Promise<POSProduct[]> {
    try {
      const result = await this.search(query, { category: categoryId });
      return result.products;
    } catch (error) {
      console.error('Category search failed:', error);
      return [];
    }
  }

  /**
   * Get trending/popular searches
   */
  getTrendingSearches(limit: number = 5): string[] {
    // Count frequency of searches in history
    const queryFrequency = new Map<string, number>();
    
    this.searchHistory.forEach(entry => {
      const count = queryFrequency.get(entry.query) || 0;
      queryFrequency.set(entry.query, count + 1);
    });

    // Sort by frequency and return top results
    return Array.from(queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query);
  }

  /**
   * Get recent search queries
   */
  getRecentQueries(): string[] {
    return Array.from(this.recentQueries).slice(0, this.MAX_RECENT_QUERIES);
  }

  /**
   * Get search history
   */
  getSearchHistory(): SearchHistory[] {
    return [...this.searchHistory].reverse(); // Most recent first
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
    this.recentQueries.clear();
    this.cache.clear();
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics() {
    const totalSearches = this.searchHistory.length;
    const uniqueQueries = new Set(this.searchHistory.map(h => h.query)).size;
    const averageResults = this.searchHistory.reduce((sum, h) => sum + h.resultCount, 0) / totalSearches || 0;
    
    const queryFrequency = new Map<string, number>();
    this.searchHistory.forEach(entry => {
      const count = queryFrequency.get(entry.query) || 0;
      queryFrequency.set(entry.query, count + 1);
    });

    return {
      totalSearches,
      uniqueQueries,
      averageResults: Math.round(averageResults * 100) / 100,
      mostSearchedQueries: Array.from(queryFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count })),
      cacheHitRate: this.getCacheHitRate()
    };
  }

  // Private helper methods

  private getCacheKey(query: string, filters: SearchFilters): string {
    return `search:${query}:${JSON.stringify(filters)}`;
  }

  private addToHistory(query: string, resultCount: number): void {
    this.searchHistory.push({
      query,
      timestamp: new Date(),
      resultCount
    });

    // Keep only recent history
    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(-this.MAX_HISTORY);
    }
  }

  private addToRecentQueries(query: string): void {
    this.recentQueries.delete(query); // Remove if exists to avoid duplicates
    this.recentQueries.add(query);

    // Keep only recent queries
    if (this.recentQueries.size > this.MAX_RECENT_QUERIES) {
      const firstQuery = this.recentQueries.values().next().value;
      if (firstQuery) {
        this.recentQueries.delete(firstQuery);
      }
    }
  }

  private getCacheHitRate(): number {
    // This is a simplified calculation - in a real implementation,
    // you'd track cache hits vs misses
    return this.cache.size > 0 ? 0.85 : 0; // Placeholder value
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of Array.from(this.cache.entries())) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Preload popular searches for better performance
   */
  async preloadPopularSearches(): Promise<void> {
    const popularQueries = ['drink', 'food', 'beer', 'coffee', 'package'];
    
    try {
      await Promise.all(
        popularQueries.map(query => this.search(query))
      );
    } catch (error) {
      console.error('Failed to preload popular searches:', error);
    }
  }

  // Start cleanup interval when engine is created
  constructor() {
    // Clean up cache every 5 minutes
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }
}

// Export singleton instance
export const productSearchEngine = new ProductSearchEngine();