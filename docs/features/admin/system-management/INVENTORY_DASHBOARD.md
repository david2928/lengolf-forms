# Inventory Dashboard Documentation

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [KPI Metrics](#kpi-metrics)
5. [Product Management](#product-management)
6. [Data Sources](#data-sources)
7. [Filtering & Search](#filtering--search)
8. [API Endpoints](#api-endpoints)
9. [Component Structure](#component-structure)
10. [Usage Guide](#usage-guide)
11. [Performance Considerations](#performance-considerations)
12. [Future Enhancements](#future-enhancements)

## Overview

The Inventory Dashboard is a comprehensive stock management tool that provides real-time insights into the golf academy's inventory status. Built with React and focused on operational efficiency, it offers stock level monitoring, reorder alerts, and detailed product management to ensure optimal inventory levels.

### Key Capabilities
- **Real-time Stock Monitoring**: Live inventory levels with automatic threshold alerts
- **Reorder Management**: Intelligent reorder notifications based on configurable thresholds
- **Product Search & Filtering**: Advanced search and category-based filtering capabilities
- **Stock Status Categorization**: Products grouped by urgency (Needs Reorder, Low Stock, Sufficient Stock)
- **Mobile Responsive**: Optimized for desktop and mobile viewing for on-the-go stock checks
- **Performance Optimized**: Efficient data loading with 30-second refresh intervals
- **Error Resilience**: Comprehensive error boundaries and fallback states

## Features

### Core Features
1. **KPI Summary Cards**: Essential inventory metrics at a glance
2. **Stock Level Monitoring**: Real-time tracking of all product stock levels
3. **Reorder Alerts**: Automated notifications for products below threshold
4. **Category Management**: Organized product groupings for easy navigation
5. **Search & Filter**: Powerful search and filtering capabilities
6. **Product Management**: Individual product updates and threshold adjustments
7. **Supplier Integration**: Supplier information and purchase links

### Dashboard Controls
- **Search Bar**: Real-time product name search with instant results
- **Category Filter**: Filter by product categories (All, Golf Equipment, F&B, etc.)
- **Clear Filters**: One-click filter reset functionality  
- **Refresh Control**: Manual data refresh with loading indicators
- **Product Actions**: Quick access to product editing and purchase links

### Enhanced User Experience
- **Clean Interface**: Admin header is hidden for distraction-free monitoring
- **Status-Based Grouping**: Products organized by urgency (Needs Reorder → Low Stock → Sufficient Stock)
- **Visual Indicators**: Color-coded badges and status indicators for quick recognition
- **Result Counters**: Display filtered vs total product counts
- **Empty States**: Informative messages when no products match filters or status

## Architecture

### Technology Stack
- **Frontend**: React with TypeScript
- **State Management**: React hooks with SWR for data caching
- **UI Components**: Radix UI with Tailwind CSS
- **Data Fetching**: Custom hooks with automatic error handling
- **Search**: Client-side filtering with real-time updates

### Component Hierarchy
```
InventoryDashboard
├── Summary KPI Cards
│   ├── Total Inventory Value
│   ├── Needs Reorder Count
│   ├── Low Stock Count
│   └── Sufficient Stock Count
├── Search & Filter Controls
│   ├── Product Search Input
│   ├── Category Selector
│   ├── Filter Result Counters
│   └── Clear Filters Button
└── Product Status Sections
    ├── Needs Reorder Section
    │   └── ProductCard[] (Critical Priority)
    ├── Low Stock Section
    │   └── ProductCard[] (Warning Priority)
    └── Sufficient Stock Section
        └── ProductCard[] (Normal Status)
```

## KPI Metrics

### Summary Metrics
```typescript
interface InventorySummary {
  total_inventory_value: number;
  needs_reorder_count: number;
  low_stock_count: number;
  sufficient_stock_count: number;
}
```

#### Total Inventory Value
- **Description**: Combined value of all current inventory
- **Calculation**: `SUM(current_stock * unit_cost)` across all products
- **Display**: Currency format with clear valuation
- **Purpose**: Financial overview of inventory investment

#### Needs Reorder Count
- **Description**: Number of products below reorder threshold
- **Calculation**: Count where `current_stock <= reorder_threshold`
- **Display**: Red badge with alert icon for urgent attention
- **Purpose**: Immediate action items for procurement

#### Low Stock Count
- **Description**: Products approaching reorder threshold
- **Calculation**: Count where `current_stock <= low_stock_threshold`
- **Display**: Amber badge with warning indication
- **Purpose**: Early warning for upcoming reorder needs

#### Sufficient Stock Count
- **Description**: Products with adequate inventory levels
- **Calculation**: Count where `current_stock > low_stock_threshold`
- **Display**: Green badge indicating healthy stock
- **Purpose**: Confirmation of well-managed inventory

## Product Management

### Product Card Components
Each product is displayed in a detailed card showing:

```typescript
interface AdminInventoryProductWithStatus {
  id: string;
  name: string;
  category_name: string;
  current_stock: number;
  reorder_threshold: number;
  low_stock_threshold: number;
  unit_cost: number;
  supplier?: string;
  supplier_url?: string;
  last_updated: string;
  status: 'needs_reorder' | 'low_stock' | 'sufficient_stock';
}
```

#### Stock Status Indicators
- **Needs Reorder**: Red border and badge, high priority display
- **Low Stock**: Amber border and badge, medium priority
- **Sufficient Stock**: Green border and badge, normal status

#### Product Actions
1. **Edit Product**: Modify thresholds, supplier info, and metadata
2. **Purchase Link**: Direct access to supplier ordering pages
3. **View Trends**: Historical stock level analysis (future feature)
4. **Update Stock**: Manual stock level adjustments

### Threshold Management
```typescript
interface StockThresholds {
  reorder_threshold: number;    // Critical level requiring immediate reorder
  low_stock_threshold: number;  // Warning level for planning
  max_stock_level: number;      // Optimal maximum stock level
}
```

## Data Sources

### Primary Database Source

The Inventory Dashboard uses inventory data from the `public` schema.

#### **Primary Data Table: `inventory_submission`**
```sql
-- Current inventory levels from daily submissions
SELECT 
  is.product_id,
  ip.name,
  ic.name as category_name,
  is.value_numeric as current_stock,
  ip.reorder_threshold,
  ip.supplier,
  is.date as last_updated
FROM inventory_submission is
JOIN inventory_products ip ON is.product_id = ip.id
JOIN inventory_categories ic ON ip.category_id = ic.id
WHERE is.date = (
  SELECT MAX(date) FROM inventory_submission 
  WHERE product_id = is.product_id
);
```

#### **Supporting Tables**
```sql
-- Product definitions and thresholds
inventory_products (product metadata, thresholds, supplier info)

-- Category organization
inventory_categories (product groupings, display order)

-- Historical stock levels
inventory_submission (daily stock submissions by staff)
```

### Real-time Data Processing

#### **Stock Level Calculations**
```sql
-- Stock status determination
CASE 
  WHEN current_stock <= reorder_threshold THEN 'needs_reorder'
  WHEN current_stock <= low_stock_threshold THEN 'low_stock'
  ELSE 'sufficient_stock'
END as status
```

#### **Inventory Value Calculation**
```sql
-- Total inventory valuation
SUM(current_stock * COALESCE(unit_cost, 0)) as total_inventory_value
```

## Filtering & Search

### Search Functionality
```typescript
interface SearchFilters {
  searchQuery: string;           // Product name search
  selectedCategory: string;      // Category filter ('all' or specific category)
  resultCounts: {
    total: number;               // Total products available
    filtered: number;            // Products matching current filters
  };
}
```

### Filter Implementation
```typescript
const filterProducts = (products: AdminInventoryProductWithStatus[]) => {
  return products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      product.category_name === selectedCategory;

    return matchesSearch && matchesCategory;
  });
};
```

### Category Management
- **Dynamic Categories**: Extracted from product data
- **"All" Option**: View all products regardless of category
- **Category Counts**: Show number of products per category
- **Alphabetical Sorting**: Categories sorted for consistent presentation

## API Endpoints

### Inventory Overview API

#### **Primary Endpoint**
```
GET /api/admin/inventory/overview
```

**Response Structure**:
```typescript
interface AdminInventoryOverview {
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
```

#### **Product Management APIs**
```
PUT /api/admin/inventory/products/{id}     # Update product metadata
GET /api/admin/inventory/trends/{id}       # Product trend analysis
POST /api/admin/inventory/reorder/{id}     # Trigger reorder process
```

### Data Fetching Hook
```typescript
export function useAdminInventoryOverview() {
  const { data, error, mutate, isLoading } = useSWR<AdminInventoryOverview>(
    '/api/admin/inventory/overview',
    fetcher,
    {
      refreshInterval: 30000,     // 30-second refresh
      revalidateOnFocus: true,
      errorRetryCount: 3,
    }
  );

  return { data, isLoading, error, mutate };
}
```

## Component Structure

### Main Dashboard Component
```typescript
export function InventoryDashboard() {
  const { data, isLoading, error, mutate } = useAdminInventoryOverview();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter logic and category extraction
  const { categories, filteredData, resultCounts } = useMemo(() => {
    // Product filtering logic
    // Category extraction
    // Result counting
  }, [data, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      <SummaryCards data={data?.summary} loading={isLoading} />
      <SearchFilters 
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        categories={categories}
        resultCounts={resultCounts}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
      />
      <ProductSections 
        data={filteredData?.products} 
        loading={isLoading}
        onUpdate={mutate}
      />
    </div>
  );
}
```

### Product Card Component
```typescript
interface ProductCardProps {
  product: AdminInventoryProductWithStatus;
  onUpdate: () => void;
}

export function ProductCard({ product, onUpdate }: ProductCardProps) {
  return (
    <Card className={`border-l-4 ${getStatusBorderColor(product.status)}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium">
            {product.name}
          </CardTitle>
          <StatusBadge status={product.status} />
        </div>
      </CardHeader>
      <CardContent>
        <StockMetrics product={product} />
        <ProductActions product={product} onUpdate={onUpdate} />
      </CardContent>
    </Card>
  );
}
```

## Usage Guide

### Accessing the Dashboard
1. **Authentication Required**: Must be logged in with admin privileges
2. **Navigation**: Admin menu → Inventory (now links to admin dashboard)
3. **URL**: `/admin/inventory`

### Key Interactions
1. **Monitor Stock Levels**: Review KPI cards for overall inventory health
2. **Search Products**: Use search bar for quick product lookup
3. **Filter by Category**: Select specific product categories
4. **Review Alerts**: Focus on "Needs Reorder" section for urgent items
5. **Manage Products**: Click product cards for detailed management
6. **Refresh Data**: Use refresh button for latest inventory data

### Workflow Examples

#### Daily Stock Review
1. Check KPI summary for overall health
2. Review "Needs Reorder" section for urgent actions
3. Plan procurement for "Low Stock" items
4. Verify "Sufficient Stock" levels are maintained

#### Product Search
1. Enter product name in search bar
2. Optionally filter by category
3. Review matching products
4. Clear filters to return to full view

## Performance Considerations

### Data Optimization
- **Client-side Filtering**: Real-time search without server calls
- **SWR Caching**: 30-second cache with background updates
- **Memoized Calculations**: Efficient filtering and categorization
- **Component Memoization**: Prevent unnecessary re-renders

### Loading Strategy
```typescript
// Progressive loading implementation
const LoadingStrategy = {
  skeleton: 'Show skeleton cards during initial load',
  progressiveData: 'Load summary cards first, then product details',
  errorBoundaries: 'Graceful degradation for failed sections',
  retryLogic: 'Automatic retry with exponential backoff'
};
```

### Memory Management
- **Efficient Data Structures**: Minimized object creation
- **Filter Optimization**: Debounced search inputs
- **Component Cleanup**: Proper useEffect cleanup
- **SWR Configuration**: Appropriate cache sizes and TTL

## Future Enhancements

### Planned Features
1. **Historical Trends**: Stock level charts and trend analysis
2. **Automated Reordering**: Integration with supplier APIs for automatic ordering
3. **Predictive Analytics**: AI-powered demand forecasting
4. **Mobile App**: Dedicated mobile interface for stock checks
5. **Barcode Scanning**: Mobile barcode integration for quick updates
6. **Cost Analytics**: Detailed cost analysis and optimization suggestions

### Technical Improvements
1. **Real-time Updates**: WebSocket integration for live stock updates
2. **Offline Support**: Progressive Web App capabilities
3. **Advanced Search**: Full-text search with relevance scoring
4. **Bulk Operations**: Multi-product management capabilities
5. **Data Export**: CSV/Excel export for external analysis
6. **Integration APIs**: Connect with external inventory management systems

### Business Logic Enhancements
1. **Supplier Management**: Comprehensive supplier relationship management
2. **Cost Tracking**: Detailed cost analysis and trend monitoring
3. **Seasonal Patterns**: Recognition of seasonal demand patterns
4. **Alert Customization**: Configurable alert thresholds per product category
5. **Approval Workflows**: Multi-level approval for large orders
6. **Budget Integration**: Link with financial systems for budget monitoring

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: Lengolf Development Team

**Note**: This dashboard complements the daily inventory submission form (`/inventory`) used by staff members. While staff use the form for daily stock entries, administrators use this dashboard for monitoring and management. 