# POS Product Catalog System

## Overview

The Product Catalog System provides comprehensive product management with hierarchical categories, advanced search capabilities, and real-time inventory integration. Designed for high-performance product browsing with intelligent caching and mobile optimization.

### 🆕 Custom Product Feature

**Added January 2025** - Staff can now create custom products on-the-fly during POS operations without polluting the main product catalog.

**Key Features:**
- **Full-screen tablet-friendly modal** for easy product creation
- **Automatic database integration** - custom products stored in `products.products` table
- **Seamless order integration** - custom products work exactly like regular products
- **Clean catalog separation** - custom products hidden from main catalog (`show_in_staff_ui = false`)
- **Complete audit trail** - all custom products tracked with creator information

**Usage:** Click "Add Custom Product" button (located subtly at bottom of category/product views) → Enter name, price, and optional description → Product immediately added to current order.

## Architecture

### Core Components

**Catalog Interface:**
- `ProductCatalog.tsx` - Main catalog with category navigation and search
- `ProductListItem.tsx` - Individual product display with responsive design
- `CustomProductModal.tsx` - Full-screen modal for creating custom products
- Category breadcrumb navigation with touch optimization

**Data Management:**
- `ProductCatalogService.ts` - Caching and data management layer
- `ProductSearchEngine.ts` - Advanced search with type-ahead suggestions
- `ProductCatalogCache.ts` - Intelligent caching system

**Navigation & Search:**
- `useCategoryNavigation.ts` - Category browsing logic
- `useProductSearch.ts` - Search functionality with debouncing
- `useCategorySwipes.ts` - Touch gesture navigation

### Database Schema

**Product Management:**
```sql
-- Product categories with hierarchy
pos.product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id INTEGER REFERENCES pos.product_categories(id),
  description TEXT,
  image_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Products with comprehensive details
pos.products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES pos.product_categories(id),
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  barcode VARCHAR(50),
  sku VARCHAR(50) UNIQUE,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  requires_age_verification BOOLEAN DEFAULT false,
  allergen_info TEXT,
  nutritional_info JSONB,
  preparation_time_minutes INTEGER,
  is_available BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5
);

-- Category hierarchy view
CREATE VIEW pos.category_hierarchy AS
WITH RECURSIVE category_path AS (
  SELECT id, name, parent_id, name as path, 0 as level
  FROM pos.product_categories
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT c.id, c.name, c.parent_id, 
         cp.path || ' > ' || c.name as path,
         cp.level + 1
  FROM pos.product_categories c
  JOIN category_path cp ON c.parent_id = cp.id
)
SELECT * FROM category_path;
```

## API Reference

### Product Catalog

**Get Products with Filtering**
```http
GET /api/pos/products
Query Parameters:
  - category_id: Filter by category
  - search: Search term
  - available_only: true/false
  - limit: Number of results (default: 50)
  - offset: Pagination offset
```

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Thai Green Curry",
      "description": "Authentic Thai curry with coconut milk",
      "category": {
        "id": 5,
        "name": "Thai Cuisine",
        "path": "Main Course > Thai Cuisine"
      },
      "price": 280.00,
      "image_url": "/images/products/thai-green-curry.jpg",
      "is_available": true,
      "stock_quantity": 15,
      "preparation_time_minutes": 12,
      "allergen_info": "Contains coconut, may contain traces of peanuts",
      "nutritional_info": {
        "calories": 420,
        "protein": 25,
        "carbs": 35,
        "fat": 18
      }
    }
  ],
  "total_count": 120,
  "categories": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "has_next": true
  }
}
```

**Get Category Hierarchy**
```http
GET /api/pos/products/categories/hierarchy
```

**Real-Time Search**
```http
GET /api/pos/products/search
Query Parameters:
  - q: Search query
  - limit: Results limit (default: 10)
```

### Category Management

**Get All Categories**
```http
GET /api/pos/products/categories
```

**Get Category Details**
```http
GET /api/pos/products/categories/[id]
```

## Component Implementation

### ProductCatalog Component

**Features:**
- Virtual scrolling for large product lists
- Category-based filtering with visual hierarchy
- Real-time search with type-ahead suggestions
- Touch-optimized navigation
- Lazy loading of product images

**Key Functions:**
```typescript
const ProductCatalog = () => {
  // State management
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleProducts, setVisibleProducts] = useState<Product[]>([]);

  // Data fetching with SWR
  const { data: products, isLoading } = useProducts({
    category_id: selectedCategory,
    search: searchQuery,
    available_only: true
  });

  // Virtual scrolling implementation
  const {
    virtualItems,
    totalSize,
    scrollElement
  } = useVirtualizer({
    count: products?.length || 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 5
  });

  // Category navigation
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
    scrollToTop();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Category Navigation */}
      <CategoryBreadcrumb 
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategorySelect}
      />
      
      {/* Search Interface */}
      <SearchBar 
        query={searchQuery}
        onQueryChange={setSearchQuery}
        suggestions={searchSuggestions}
      />
      
      {/* Product Grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div style={{ height: totalSize }}>
          {virtualItems.map((virtualItem) => (
            <ProductListItem
              key={virtualItem.index}
              product={products[virtualItem.index]}
              onSelect={handleProductSelect}
              style={{
                position: 'absolute',
                top: virtualItem.start,
                left: 0,
                width: '100%',
                height: virtualItem.size
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### ProductListItem Component

**Responsive Design:**
```typescript
const ProductListItem = ({ product, onSelect }: ProductListItemProps) => {
  const { isMobile } = useScreenSize();
  
  return (
    <div 
      className={cn(
        "flex items-center p-4 border-b cursor-pointer hover:bg-gray-50",
        "transition-colors duration-200",
        isMobile ? "flex-col space-y-2" : "flex-row space-x-4"
      )}
      onClick={() => onSelect(product)}
    >
      {/* Product Image */}
      <div className={cn(
        "flex-shrink-0 rounded-lg overflow-hidden",
        isMobile ? "w-full h-32" : "w-16 h-16"
      )}>
        <Image
          src={product.image_url || '/images/placeholder-product.jpg'}
          alt={product.name}
          width={isMobile ? 300 : 64}
          height={isMobile ? 128 : 64}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2">
          {product.description}
        </p>
        
        {/* Price and Availability */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-semibold text-blue-600">
            ฿{product.price.toFixed(2)}
          </span>
          
          <div className="flex items-center space-x-2">
            {/* Stock Status */}
            <StockIndicator 
              quantity={product.stock_quantity}
              threshold={product.low_stock_threshold}
            />
            
            {/* Preparation Time */}
            {product.preparation_time_minutes && (
              <span className="text-xs text-gray-400">
                {product.preparation_time_minutes}min
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Search System

### ProductSearchEngine Service

**Features:**
- Full-text search across product names and descriptions
- Category-aware search results
- Fuzzy matching for typos and partial matches
- Search result ranking and relevance scoring

**Implementation:**
```typescript
class ProductSearchEngine {
  private searchIndex: Map<string, Product[]> = new Map();
  private fuzzySearch: Fuse<Product>;

  constructor(products: Product[]) {
    this.buildSearchIndex(products);
    this.fuzzySearch = new Fuse(products, {
      keys: ['name', 'description', 'category.name'],
      threshold: 0.3,
      includeScore: true
    });
  }

  search(query: string, options: SearchOptions = {}): SearchResult {
    const {
      category_id,
      max_results = 20,
      include_unavailable = false
    } = options;

    // Exact matches first
    const exactMatches = this.findExactMatches(query);
    
    // Fuzzy search for partial matches
    const fuzzyMatches = this.fuzzySearch.search(query)
      .slice(0, max_results)
      .map(result => ({
        ...result.item,
        relevance_score: 1 - (result.score || 0)
      }));

    // Combine and deduplicate results
    const combinedResults = this.combineResults(exactMatches, fuzzyMatches);

    // Apply filters
    return this.applyFilters(combinedResults, {
      category_id,
      include_unavailable
    });
  }

  private buildSearchIndex(products: Product[]) {
    products.forEach(product => {
      const searchTerms = [
        product.name.toLowerCase(),
        product.description?.toLowerCase() || '',
        product.category?.name.toLowerCase() || ''
      ];

      searchTerms.forEach(term => {
        const words = term.split(/\s+/);
        words.forEach(word => {
          if (word.length > 2) {
            const existing = this.searchIndex.get(word) || [];
            this.searchIndex.set(word, [...existing, product]);
          }
        });
      });
    });
  }
}
```

### Search Suggestions

**Type-Ahead Implementation:**
```typescript
const useSearchSuggestions = (query: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery).then(setSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  return suggestions;
};

const fetchSuggestions = async (query: string): Promise<string[]> => {
  const response = await fetch(`/api/pos/products/search?q=${encodeURIComponent(query)}&suggestions=true`);
  const data = await response.json();
  return data.suggestions;
};
```

## Caching System

### ProductCatalogCache Service

**Multi-Level Caching:**
```typescript
class ProductCatalogCache {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getProducts(params: ProductQueryParams): Promise<Product[]> {
    const cacheKey = this.generateCacheKey(params);
    
    // Check memory cache first
    const cached = this.memoryCache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }

    // Check localStorage
    const localData = this.getFromLocalStorage(cacheKey);
    if (localData && !this.isExpired(localData)) {
      this.memoryCache.set(cacheKey, localData);
      return localData.data;
    }

    // Fetch from API
    const products = await this.fetchFromAPI(params);
    const cacheEntry: CacheEntry = {
      data: products,
      timestamp: Date.now(),
      expires: Date.now() + this.CACHE_DURATION
    };

    // Store in both caches
    this.memoryCache.set(cacheKey, cacheEntry);
    this.setInLocalStorage(cacheKey, cacheEntry);

    return products;
  }

  invalidateCategory(categoryId: number) {
    // Remove all cache entries related to this category
    const keysToRemove = Array.from(this.memoryCache.keys())
      .filter(key => key.includes(`category_${categoryId}`));
    
    keysToRemove.forEach(key => {
      this.memoryCache.delete(key);
      localStorage.removeItem(`product_cache_${key}`);
    });
  }
}
```

## Mobile Optimization

### Touch Navigation

**Category Swipe Navigation:**
```typescript
const useCategorySwipes = (categories: Category[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setCurrentIndex(prev => 
        Math.min(prev + 1, categories.length - 1)
      );
    },
    onSwipedRight: () => {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    },
    trackMouse: true,
    preventScrollOnSwipe: true
  });

  return {
    currentCategory: categories[currentIndex],
    currentIndex,
    setCurrentIndex,
    swipeHandlers
  };
};
```

### Responsive Layout

**Adaptive Grid System:**
```typescript
const getGridColumns = (screenWidth: number): number => {
  if (screenWidth < 640) return 1;  // Mobile
  if (screenWidth < 768) return 2;  // Large mobile
  if (screenWidth < 1024) return 3; // Tablet
  if (screenWidth < 1280) return 4; // Small desktop
  return 5; // Large desktop
};

const ProductGrid = ({ products }: ProductGridProps) => {
  const { width } = useScreenSize();
  const columns = getGridColumns(width);
  
  return (
    <div 
      className="grid gap-4 p-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
      }}
    >
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

## Performance Optimization

### Virtual Scrolling

**Large List Handling:**
```typescript
const VirtualizedProductList = ({ products }: VirtualizedProductListProps) => {
  const {
    virtualItems,
    totalSize,
    scrollElementRef
  } = useVirtualizer({
    count: products.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 120,
    overscan: 10
  });

  return (
    <div
      ref={scrollElementRef}
      className="h-full overflow-auto"
    >
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map(virtualItem => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              left: 0,
              width: '100%',
              height: virtualItem.size
            }}
          >
            <ProductListItem product={products[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Image Optimization

**Lazy Loading with Intersection Observer:**
```typescript
const LazyImage = ({ src, alt, ...props }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="relative">
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};
```

## Inventory Integration

### Real-Time Stock Updates

**Stock Level Monitoring:**
```typescript
const useProductStock = (productIds: number[]) => {
  const [stockLevels, setStockLevels] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    // WebSocket connection for real-time stock updates
    const ws = new WebSocket(`${wsUrl}/inventory/stock`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'stock_update') {
        setStockLevels(prev => new Map(prev.set(update.product_id, update.quantity)));
      }
    };

    // Subscribe to product stock updates
    ws.send(JSON.stringify({
      type: 'subscribe',
      product_ids: productIds
    }));

    return () => ws.close();
  }, [productIds]);

  return stockLevels;
};
```

### Stock Indicators

**Visual Stock Status:**
```typescript
const StockIndicator = ({ quantity, threshold }: StockIndicatorProps) => {
  const getStockStatus = (): StockStatus => {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= threshold) return 'low_stock';
    return 'in_stock';
  };

  const status = getStockStatus();

  const statusConfig = {
    out_of_stock: {
      color: 'red',
      text: 'Out of Stock',
      icon: '❌'
    },
    low_stock: {
      color: 'yellow',
      text: `Low Stock (${quantity})`,
      icon: '⚠️'
    },
    in_stock: {
      color: 'green',
      text: `In Stock (${quantity})`,
      icon: '✅'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`text-xs px-2 py-1 rounded-full bg-${config.color}-100 text-${config.color}-800`}>
      {config.icon} {config.text}
    </span>
  );
};
```

## Troubleshooting

### Common Issues

**Slow Product Loading:**
1. Check cache effectiveness
2. Verify image optimization
3. Review virtual scrolling implementation
4. Monitor network requests

**Search Not Working:**
1. Verify search index building
2. Check API endpoint connectivity
3. Review search query encoding
4. Validate search parameters

**Category Navigation Issues:**
1. Check category hierarchy data
2. Verify breadcrumb navigation logic
3. Review touch gesture handlers
4. Test on different screen sizes

### Debug Tools

**Performance Monitoring:**
```typescript
// Monitor component render times
const useRenderTracker = (componentName: string) => {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`${componentName} rendered in ${end - start}ms`);
    };
  });
};

// Cache effectiveness metrics
const getCacheMetrics = () => {
  const cache = ProductCatalogCache.getInstance();
  return {
    hit_rate: cache.getHitRate(),
    cache_size: cache.getSize(),
    memory_usage: cache.getMemoryUsage()
  };
};
```

## Integration Points

### Order Management
- Direct product selection for order creation
- Real-time inventory updates during ordering
- Product modifications and customizations

### Payment Processing
- Product pricing integration
- Tax calculation for different product categories
- Discount and promotion applications

### Inventory Management
- Stock level monitoring and alerts
- Automatic reorder point notifications
- Purchase order generation for low stock items

## Future Enhancements

### Planned Features
- **AI-Powered Recommendations** - Personalized product suggestions
- **Advanced Filtering** - Multi-criteria filtering system
- **Product Customization** - Configurable product options
- **Nutrition Information** - Detailed nutritional data display

### Technical Improvements
- **GraphQL Integration** - More efficient data fetching
- **Enhanced Caching** - Redis-based distributed caching
- **Image CDN** - Optimized image delivery
- **Offline Catalog** - Full offline product browsing

## Related Documentation

- [POS Order Management](./POS_ORDER_MANAGEMENT.md) - Adding products to orders
- [POS Mobile Interface](./POS_MOBILE_INTERFACE.md) - Mobile optimization details
- [POS API Reference](./POS_API_REFERENCE.md) - Complete API documentation
- [Inventory Management](../INVENTORY_MANAGEMENT.md) - Stock management system

---

*Last Updated: January 2025 | Version: 2.1.0*