# POS Product Management & Inventory System

## Overview

The Product Management System provides comprehensive product lifecycle management including inventory tracking, product mappings, pricing management, and stock control. Built around the `pos.dim_product` and `pos.product_mappings` tables with real-time inventory updates.

## Architecture

### Core Components

**Product Management:**
- Product catalog with hierarchical categories
- Inventory tracking and stock alerts
- Price management and promotional pricing
- Product mapping between different systems

**Database Integration:**
- `pos.dim_product` - Master product dimension table
- `pos.product_mappings` - Product mapping across systems
- Integration with transaction items for stock tracking

### Database Schema

**Product Management Tables:**
```sql
-- Master product dimension
pos.dim_product (
  -- Product master data with full specifications
  -- Includes pricing, categories, and inventory details
);

-- Product mappings across systems
pos.product_mappings (
  -- Maps products between POS, inventory, and external systems
  -- Handles SKU variations and supplier codes
);

-- Payment methods configuration
pos.payment_methods_enum (
  -- Available payment methods for transactions
);

pos.payment_methods_frontend (
  -- Frontend display configuration for payment methods
);
```

## API Reference

### Product Operations

**Get Products with Inventory**
```http
GET /api/pos/products
Query Parameters:
  - category: Filter by category
  - in_stock: true/false
  - price_range: min-max pricing
  - search: Product name/SKU search
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Thai Green Curry",
      "sku": "FOOD-001",
      "category": "Main Course",
      "price": 280.00,
      "cost_price": 150.00,
      "stock_quantity": 25,
      "low_stock_threshold": 5,
      "is_active": true,
      "supplier_code": "SUP-THAI-001"
    }
  ]
}
```

## Stock Management

### Inventory Tracking

**Real-time Stock Updates:**
- Automatic stock reduction on transaction completion
- Low stock alerts and notifications
- Supplier reorder integration
- Stock movement audit trail

```typescript
const updateProductStock = async (productId: string, quantity: number, reason: string) => {
  // Update stock levels with audit trail
  await supabase
    .from('pos.dim_product')
    .update({ 
      stock_quantity: quantity,
      last_updated: new Date().toISOString()
    })
    .eq('id', productId);
    
  // Log stock movement
  await logStockMovement({
    product_id: productId,
    quantity_change: quantity,
    reason,
    staff_id: getCurrentStaff().id
  });
};
```

### Low Stock Alerts

**Automated Stock Monitoring:**
```typescript
const checkLowStock = async () => {
  const { data: lowStockProducts } = await supabase
    .from('pos.dim_product')
    .select('*')
    .lt('stock_quantity', 'low_stock_threshold')
    .eq('is_active', true);
    
  // Send alerts to management
  if (lowStockProducts?.length > 0) {
    await sendLowStockAlert(lowStockProducts);
  }
};
```

## Product Mapping System

### Cross-System Integration

**Product Mapping Management:**
```typescript
const mapProduct = async (internalId: string, externalSystem: string, externalId: string) => {
  await supabase
    .from('pos.product_mappings')
    .insert({
      internal_product_id: internalId,
      external_system: externalSystem,
      external_product_id: externalId,
      mapping_type: 'product_sync',
      is_active: true
    });
};
```

### Supplier Integration

**Supplier Code Management:**
- Map internal SKUs to supplier product codes
- Handle multiple suppliers per product
- Automated purchase order generation

## Payment Methods Configuration

### Frontend Payment Methods

**Dynamic Payment Method Display:**
```sql
-- Payment methods for frontend display
pos.payment_methods_frontend (
  id,
  method_name,
  display_name,
  icon_class,
  is_active,
  sort_order,
  requires_reference,
  max_amount
);
```

```typescript
const getActivePaymentMethods = async () => {
  const { data } = await supabase
    .from('pos.payment_methods_frontend')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
    
  return data;
};
```

## Pricing Management

### Dynamic Pricing

**Price Management System:**
```typescript
interface ProductPricing {
  base_price: number;
  promotional_price?: number;
  discount_percentage?: number;
  valid_from: string;
  valid_until: string;
}

const updateProductPricing = async (productId: string, pricing: ProductPricing) => {
  // Update product pricing with validity periods
  await supabase
    .from('pos.dim_product')
    .update({
      current_price: pricing.promotional_price || pricing.base_price,
      base_price: pricing.base_price,
      promotional_price: pricing.promotional_price,
      promotion_valid_from: pricing.valid_from,
      promotion_valid_until: pricing.valid_until
    })
    .eq('id', productId);
};
```

### Category-Based Pricing

**Bulk Price Updates:**
```typescript
const updateCategoryPricing = async (categoryId: string, discountPercentage: number) => {
  // Apply discount to entire category
  const { data: products } = await supabase
    .from('pos.dim_product')
    .select('id, base_price')
    .eq('category_id', categoryId);
    
  const updates = products?.map(product => ({
    id: product.id,
    promotional_price: product.base_price * (1 - discountPercentage / 100)
  }));
  
  // Bulk update promotional prices
  await supabase
    .from('pos.dim_product')
    .upsert(updates);
};
```

## Integration Points

### Transaction System
- Real-time stock deduction on sales
- Product information in transaction items
- Cost tracking for profit analysis

### Inventory Management
- Automated reorder points
- Supplier integration for purchase orders
- Stock movement tracking

### Reporting System
- Product performance analytics
- Inventory turnover reports
- Profit margin analysis by product

## Performance Optimization

### Product Caching

**Efficient Product Lookups:**
```typescript
class ProductCache {
  private cache = new Map<string, Product>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  async getProduct(productId: string): Promise<Product> {
    const cached = this.cache.get(productId);
    if (cached && this.isValid(cached)) {
      return cached;
    }

    const product = await this.fetchFromDatabase(productId);
    this.cache.set(productId, {
      ...product,
      cached_at: Date.now()
    });
    
    return product;
  }
}
```

### Bulk Operations

**Efficient Stock Updates:**
```typescript
const bulkUpdateStock = async (updates: StockUpdate[]) => {
  // Use bulk operations for multiple stock updates
  const { error } = await supabase
    .from('pos.dim_product')
    .upsert(updates, { onConflict: 'id' });
    
  if (!error) {
    // Invalidate cache for updated products
    updates.forEach(update => {
      productCache.invalidate(update.id);
    });
  }
};
```

## Security & Validation

### Stock Movement Validation

**Inventory Controls:**
```typescript
const validateStockMovement = (product: Product, requestedQuantity: number): ValidationResult => {
  // Prevent negative stock
  if (product.stock_quantity + requestedQuantity < 0) {
    return {
      valid: false,
      error: 'Insufficient stock available'
    };
  }
  
  // Check maximum order quantities
  if (requestedQuantity > product.max_order_quantity) {
    return {
      valid: false,
      error: 'Quantity exceeds maximum order limit'
    };
  }
  
  return { valid: true };
};
```

### Price Change Authorization

**Price Update Security:**
```typescript
const authorizeProductPriceChange = async (staffPin: string, productId: string, newPrice: number) => {
  // Verify staff authorization for price changes
  const staff = await verifyStaffPin(staffPin);
  if (!staff.success || !staff.permissions.can_modify_prices) {
    throw new Error('Unauthorized to modify product prices');
  }
  
  // Log price change for audit
  await logPriceChange({
    product_id: productId,
    old_price: product.current_price,
    new_price: newPrice,
    changed_by: staff.staff_name,
    reason: 'Manual price adjustment'
  });
};
```

## Troubleshooting

### Common Issues

**Stock Synchronization Problems:**
1. Check transaction item completion status
2. Verify stock movement logging
3. Review concurrent transaction handling

**Product Mapping Failures:**
1. Validate external system connectivity
2. Check mapping table consistency
3. Verify SKU format compatibility

**Price Display Issues:**
1. Check promotional price validity periods
2. Verify category pricing inheritance
3. Review cache invalidation timing

## Future Enhancements

### Planned Features
- **Advanced Inventory Forecasting** - AI-powered stock prediction
- **Multi-Location Inventory** - Stock tracking across multiple venues
- **Supplier Portal Integration** - Direct supplier ordering system
- **Product Lifecycle Management** - Seasonal products and menu rotation

### Technical Improvements
- **Real-time Stock Synchronization** - WebSocket-based stock updates
- **Enhanced Product Search** - Full-text search with fuzzy matching
- **Batch Processing** - Optimized bulk operations for large catalogs
- **API Rate Limiting** - Prevent inventory system overload

---

*Last Updated: January 2025 | Version: 1.0.0*