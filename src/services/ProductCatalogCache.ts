import { POSProduct, POSCategory } from './ProductCatalogService';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  oldestEntry?: number;
  newestEntry?: number;
}

export class ProductCatalogCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 60 * 60 * 1000, // 1 hour default
      maxSize: 1000,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Get cached data with automatic TTL validation
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update hit count and return data
    entry.hitCount++;
    this.hitCount++;
    return entry.data;
  }

  /**
   * Set cached data with custom TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const actualTTL = ttl || this.config.defaultTTL;
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: actualTTL,
      hitCount: 0
    });
  }

  /**
   * Cache products with optimized key
   */
  cacheProducts(products: POSProduct[], key: string, ttl?: number): void {
    this.set(`products:${key}`, products, ttl);
  }

  /**
   * Get cached products
   */
  getCachedProducts(key: string): POSProduct[] | null {
    return this.get(`products:${key}`);
  }

  /**
   * Cache categories with optimized key
   */
  cacheCategories(categories: POSCategory[], key: string = 'all', ttl?: number): void {
    this.set(`categories:${key}`, categories, ttl);
  }

  /**
   * Get cached categories
   */
  getCachedCategories(key: string = 'all'): POSCategory[] | null {
    return this.get(`categories:${key}`);
  }

  /**
   * Cache search results
   */
  cacheSearchResults(query: string, filters: any, results: POSProduct[], ttl: number = 5 * 60 * 1000): void {
    const searchKey = `search:${query}:${JSON.stringify(filters)}`;
    this.set(searchKey, results, ttl);
  }

  /**
   * Get cached search results
   */
  getCachedSearchResults(query: string, filters: any): POSProduct[] | null {
    const searchKey = `search:${query}:${JSON.stringify(filters)}`;
    return this.get(searchKey);
  }

  /**
   * Cache individual product
   */
  cacheProduct(product: POSProduct, ttl?: number): void {
    this.set(`product:${product.id}`, product, ttl);
  }

  /**
   * Get cached individual product
   */
  getCachedProduct(productId: string): POSProduct | null {
    return this.get(`product:${productId}`);
  }

  /**
   * Cache category hierarchy
   */
  cacheCategoryHierarchy(hierarchy: any, ttl?: number): void {
    this.set('category_hierarchy', hierarchy, ttl);
  }

  /**
   * Get cached category hierarchy
   */
  getCachedCategoryHierarchy(): any | null {
    return this.get('category_hierarchy');
  }

  /**
   * Invalidate specific cache entries
   */
  invalidate(pattern: string): number {
    let deletedCount = 0;
    const keysToDelete: string[] = [];

    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      deletedCount++;
    });

    return deletedCount;
  }

  /**
   * Invalidate all product-related cache
   */
  invalidateProducts(): number {
    return this.invalidate('products:') + this.invalidate('product:');
  }

  /**
   * Invalidate all category-related cache
   */
  invalidateCategories(): number {
    return this.invalidate('categories:') + this.invalidate('category_hierarchy');
  }

  /**
   * Invalidate search cache
   */
  invalidateSearch(): number {
    return this.invalidate('search:');
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hitCount + this.missCount;
    
    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : undefined
    };
  }

  /**
   * Get most accessed cache entries
   */
  getMostAccessed(limit: number = 10): Array<{ key: string; hitCount: number }> {
    const entries = Array.from(this.cache.entries());
    
    return entries
      .sort(([, a], [, b]) => b.hitCount - a.hitCount)
      .slice(0, limit)
      .map(([key, entry]) => ({ key, hitCount: entry.hitCount }));
  }

  /**
   * Prefetch commonly used data
   */
  async prefetchCommonData(): Promise<void> {
    // This would typically fetch and cache commonly used products/categories
    // Implementation depends on what data should be prefetched
    console.log('Prefetching common data...');
  }

  /**
   * Warm up cache with essential data
   */
  async warmUp(essentialKeys: string[]): Promise<void> {
    // Implementation would fetch and cache essential data
    console.log('Warming up cache with essential data...');
  }

  // Private methods

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;
    for (const [key, entry] of Array.from(this.cache.entries())) {
      size += key.length * 2; // UTF-16 string
      size += JSON.stringify(entry.data).length * 2; // Rough estimate
      size += 32; // Metadata overhead
    }
    return size;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Destroy cache and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Export singleton instance with optimized configuration for POS
export const productCatalogCache = new ProductCatalogCache({
  defaultTTL: 60 * 60 * 1000, // 1 hour for products
  maxSize: 2000, // Support large product catalogs
  cleanupInterval: 10 * 60 * 1000 // 10 minutes cleanup
});

// Export separate cache instance for search results (shorter TTL)
export const searchCache = new ProductCatalogCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for search results
  maxSize: 500,
  cleanupInterval: 2 * 60 * 1000 // 2 minutes cleanup
});