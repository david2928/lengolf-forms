# Product Mapping System

## Overview

The Product Mapping System is a comprehensive administrative tool that allows staff to map historical POS product names to current products in the catalog. This system enables **overwriting historical product names** in sales data with modern product IDs, ensuring all transaction data is properly linked to current products while preserving the ability to restore mappings when sales data is reloaded.

## System Architecture

### Database Integration
- **POS Schema**: 
  - `pos.lengolf_sales_staging` for unmapped product data detection
  - `pos.lengolf_sales` for historical sales data updates
  - `pos.product_mappings` for persistent mapping storage
- **Products Schema**: Manages `products.products` and `products.categories` tables
- **Mapping Persistence**: Survives sales data reloads through dedicated mapping table

### Core Components
- **API Endpoint**: `/api/admin/products/unmapped`
- **Admin Interface**: `/admin/products/mapping`
- **Database Functions**: `get_unmapped_products()`, `apply_product_mappings()`
- **Mapping Table**: `pos.product_mappings` for persistent POS name → product ID mappings

## Key Features

### 1. Unmapped Product Detection
- Automatically identifies POS products not mapped to catalog products
- Shows usage statistics and transaction frequency
- Provides priority classification (High/Medium/Low) based on usage

### 2. Mapping Options
- **Map to Existing Product**: Link historical POS name to current catalog product
- **Create New Product**: Generate new catalog product from POS data
- **Multiple Mappings**: Allow multiple POS names to map to the same product
- **Historical Data Updates**: Automatically backfill product IDs into sales data

### 3. Progress Tracking
- Real-time statistics dashboard
- Session-based mapping counters
- Historical mapping progress

### 4. Enhanced Product Selection
- **Searchable Product Dropdown**: Find products quickly with real-time search
- **All Active Products Available**: No restrictions on which products can be mapped
- **Product Information Display**: Shows price, cost, and category information
- **Smart Filtering**: Search by product name or SKU

## Technical Implementation

### API Endpoints

#### GET `/api/admin/products/unmapped`
Fetches unmapped products with usage statistics.

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "pos_product_name": "Festilia (Shogun Orange)",
      "usage_count": 45,
      "is_unmapped": true
    }
  ],
  "stats": {
    "total_pos_products": 150,
    "mapped_products": 120,
    "unmapped_products": 30
  }
}
```

#### POST `/api/admin/products/unmapped`
Processes product mapping actions with automatic sales data updates.

**Request Body:**
```json
{
  "pos_product_name": "Weekday 1H",
  "action": "map_existing", // or "create_new"
  "product_id": "uuid", // for map_existing
  // Additional fields for create_new
  "name": "Weekday 1H General",
  "category_id": "uuid",
  "price": 700.00,
  "cost": 0.00,
  "sku": "GOLF-WD1H"
}
```

**Processing Steps:**
1. **Map Existing**: Creates mapping in `pos.product_mappings` + updates `pos.lengolf_sales` with product_id
2. **Create New**: Creates product + mapping + updates sales data

### Database Functions

#### `get_unmapped_products()`
Returns POS products not in the mapping table with usage statistics.

```sql
SELECT 
    staging.transaction_item as pos_product_name,
    COUNT(*)::BIGINT as usage_count,
    TRUE as is_unmapped
FROM pos.lengolf_sales_staging staging
LEFT JOIN pos.product_mappings mappings ON TRIM(staging.transaction_item) = TRIM(mappings.pos_product_name)
WHERE mappings.id IS NULL
    AND staging.transaction_item IS NOT NULL
    AND staging.transaction_item != ''
GROUP BY staging.transaction_item
ORDER BY usage_count DESC;
```

#### `apply_product_mappings()`
Bulk applies all stored mappings to sales data (used after data reloads).

```sql
UPDATE pos.lengolf_sales 
SET product_id = pm.product_id
FROM pos.product_mappings pm
WHERE pos.lengolf_sales.product_name = pm.pos_product_name
AND pos.lengolf_sales.product_id IS NULL;
```

## User Interface

### Statistics Dashboard
Four key metrics cards:
- **Total POS Products**: All unique products from POS system
- **Mapped Products**: Products successfully linked to catalog
- **Unmapped Products**: Products requiring mapping action
- **Mapped Today**: Session-based progress counter

### Product Table
- **Product Information**: Name, usage count, priority level
- **Action Buttons**: Map Existing, Create New
- **Visual Indicators**: Color-coded priority badges
- **Responsive Design**: Mobile-friendly table layout

### Mapping Modals

#### Map to Existing Product Modal
- Searchable product dropdown
- Product preview with price/cost information
- Validation for existing mappings

#### Create New Product Modal
- Pre-populated product name from POS data
- Category selection dropdown
- Price and cost input fields
- SKU and description fields
- Golf simulator usage checkbox

## Database Schema Integration

### Products Table Structure
```sql
CREATE TABLE products.products (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    slug VARCHAR UNIQUE,
    category_id UUID REFERENCES products.categories(id),
    price DECIMAL(10,2),
    cost DECIMAL(10,2),
    sku VARCHAR,
    description TEXT,
    is_sim_usage BOOLEAN DEFAULT FALSE,
    legacy_pos_name VARCHAR, -- Key field for POS mapping
    created_by VARCHAR,
    updated_by VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### ETL Integration
The system integrates with the POS data pipeline ETL process:

```sql
-- Updated transform_sales_data() function
LEFT JOIN products.products AS products ON TRIM(staging.transaction_item) = TRIM(products.legacy_pos_name)
LEFT JOIN products.categories AS cat ON products.category_id = cat.id
```

## Security and Permissions

### Authentication
- Requires admin session authentication
- Uses development authentication bypass in dev environment
- Service role database access for POS schema

### Data Validation
- Input sanitization for all form fields
- Duplicate mapping prevention
- Required field validation
- SQL injection protection

## Performance Considerations

### Database Optimization
- Indexed `legacy_pos_name` field for fast lookups
- Efficient JOIN operations in ETL process
- Cached product and category data

### UI Performance
- Debounced search functionality
- Paginated results for large datasets
- Optimistic UI updates

## Error Handling

### API Error Responses
- **401 Unauthorized**: Invalid or missing authentication
- **400 Bad Request**: Invalid request parameters
- **500 Internal Server Error**: Database or system errors

### User Experience
- Toast notifications for success/error states
- Loading states during API calls
- Graceful degradation for network issues

## Integration Points

### POS Data Pipeline
- Seamless integration with existing ETL process
- Automatic cost retrieval from mapped products
- Support for date-based data replacement

### Admin Framework
- Follows established admin UI patterns
- Consistent styling with other admin pages
- Role-based access control integration

## Migration Strategy

### Phase 1: Parallel Operation
- Both `pos.dim_product` and `products.products` supported
- Gradual migration of product mappings
- Fallback mechanisms for unmapped products

### Phase 2: Full Migration
- Complete transition to `products.products`
- Removal of `pos.dim_product` dependencies
- Data validation and cleanup

## Monitoring and Analytics

### Usage Metrics
- Mapping completion rates
- Most frequently mapped products
- Staff productivity tracking

### Data Quality
- Unmapped product alerts
- Cost accuracy monitoring
- Mapping consistency checks

## Future Enhancements

### Planned Features
- **Bulk Import**: CSV import for mass product creation
- **Auto-Mapping**: AI-powered product matching
- **Audit Trail**: Complete mapping history tracking
- **Advanced Filters**: Category-based filtering, date ranges

### System Improvements
- **Performance**: Caching layer for frequently accessed data
- **UX**: Improved search with fuzzy matching
- **Reporting**: Analytics dashboard for mapping insights

## Troubleshooting

### Common Issues

#### "Permission denied for schema pos"
**Cause**: API using incorrect database client
**Solution**: Use service role client with pos schema access

#### "No unmapped products found"
**Cause**: All products already mapped or no staging data
**Solution**: Verify staging data exists and ETL process running

#### "Failed to create product"
**Cause**: Missing required fields or duplicate constraints
**Solution**: Check category_id exists and product name is unique

### Development Tips
- Use `SKIP_AUTH=true` for local development
- Monitor server logs for SQL errors
- Test with various product name formats
- Verify schema permissions for database functions

## Documentation References

- **[POS Data Pipeline](./POS_DATA_PIPELINE.md)** - ETL process integration
- **[Admin Framework](../legacy/ADMIN_FRAMEWORK.md)** - UI patterns and conventions
- **[Database Schema](../database/DATABASE_DOCUMENTATION_INDEX.md)** - Complete schema documentation
- **[API Reference](../api/API_REFERENCE.md)** - Detailed API documentation

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Production Ready  
**Maintainer**: Development Team