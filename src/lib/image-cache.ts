/**
 * Image caching system for LINE chat images
 * Stores images in memory and IndexedDB for persistent caching
 */

interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
  objectUrl: string;
}

class ImageCache {
  private memoryCache = new Map<string, CachedImage>();
  private dbName = 'LineImageCache';
  private storeName = 'images';
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private maxMemorySize = 50; // Max images in memory

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get image from cache (memory first, then IndexedDB, then network)
   */
  async getImage(url: string): Promise<string> {
    // Check memory cache first
    const memoryImage = this.memoryCache.get(url);
    if (memoryImage && !this.isExpired(memoryImage)) {
      return memoryImage.objectUrl;
    }

    // Check IndexedDB
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const request = store.get(url);
      const result = await new Promise<CachedImage | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (result && !this.isExpired(result)) {
        // Add to memory cache
        const objectUrl = URL.createObjectURL(result.blob);
        const cachedImage = { ...result, objectUrl };
        this.addToMemoryCache(url, cachedImage);
        return objectUrl;
      }
    } catch (error) {
      console.warn('IndexedDB cache miss:', error);
    }

    // Fetch from network and cache
    return this.fetchAndCache(url);
  }

  /**
   * Fetch image from network and cache it
   */
  private async fetchAndCache(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const timestamp = Date.now();

      const cachedImage: CachedImage = {
        url,
        blob,
        timestamp,
        objectUrl
      };

      // Add to memory cache
      this.addToMemoryCache(url, cachedImage);

      // Store in IndexedDB
      try {
        const db = await this.initDB();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        // Store without objectUrl (can't serialize)
        const dbData = { url, blob, timestamp };
        store.put(dbData);
      } catch (error) {
        console.warn('Failed to cache in IndexedDB:', error);
      }

      return objectUrl;
    } catch (error) {
      console.error('Failed to fetch image:', error);
      // Return original URL as fallback
      return url;
    }
  }

  /**
   * Add image to memory cache with size limit
   */
  private addToMemoryCache(url: string, image: CachedImage) {
    // Remove oldest if at capacity
    if (this.memoryCache.size >= this.maxMemorySize) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        const oldImage = this.memoryCache.get(oldestKey);
        if (oldImage) {
          URL.revokeObjectURL(oldImage.objectUrl);
          this.memoryCache.delete(oldestKey);
        }
      }
    }

    this.memoryCache.set(url, image);
  }

  /**
   * Check if cached image is expired
   */
  private isExpired(image: CachedImage): boolean {
    return Date.now() - image.timestamp > this.maxAge;
  }

  /**
   * Preload images for a conversation
   */
  async preloadImages(imageUrls: string[]): Promise<void> {
    const promises = imageUrls.map(url =>
      this.getImage(url).catch(error => {
        console.warn(`Failed to preload image: ${url}`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Clear expired images from IndexedDB
   */
  async clearExpiredImages(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');

      const cutoffTime = Date.now() - this.maxAge;
      const range = IDBKeyRange.upperBound(cutoffTime);

      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('Failed to clear expired images:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clearAllImages(): Promise<void> {
    // Clear memory cache
    this.memoryCache.forEach((image) => {
      URL.revokeObjectURL(image.objectUrl);
    });
    this.memoryCache.clear();

    // Clear IndexedDB
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.clear();
    } catch (error) {
      console.warn('Failed to clear IndexedDB cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { memoryCount: number; memoryUrls: string[] } {
    return {
      memoryCount: this.memoryCache.size,
      memoryUrls: Array.from(this.memoryCache.keys())
    };
  }
}

// Singleton instance
export const imageCache = new ImageCache();

// Clear expired images on load
if (typeof window !== 'undefined') {
  imageCache.clearExpiredImages();
}