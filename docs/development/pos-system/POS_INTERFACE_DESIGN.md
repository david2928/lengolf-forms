# Point of Sale Interface Design

## Table of Contents
1. [Overview](#overview)
2. [User Experience Design](#user-experience-design)
3. [Interface Layout](#interface-layout)
4. [Component Specifications](#component-specifications)
5. [Order Management](#order-management)
6. [Customer Integration](#customer-integration)
7. [Staff Authentication](#staff-authentication)
8. [Mobile Optimization](#mobile-optimization)
9. [Accessibility](#accessibility)
10. [Implementation Details](#implementation-details)

## Overview

The Point of Sale Interface is the primary interaction layer where staff members create, modify, and manage customer orders. This interface needs to be intuitive, fast, and error-resistant while integrating seamlessly with the table management system, product catalog, and customer database.

### Key Design Principles
- **Touch-First Design**: Optimized for tablet and touchscreen interaction
- **Speed and Efficiency**: Minimize taps and navigation for common operations
- **Visual Clarity**: Clear product representation and order status
- **Error Prevention**: Built-in validation and confirmation for critical actions
- **Context Awareness**: Smart defaults based on table, customer, and historical data

### Business Requirements
Based on the current Qashier system analysis, the interface must support:
- **Multi-category Product Selection**: DRINK, FOOD, GOLF, PACKAGES
- **Item Customization**: Quantities, notes, modifiers, discounts
- **Real-time Calculations**: Subtotals, VAT, discounts, final totals
- **Customer Assignment**: Link orders to existing customers
- **Order Management**: Add, remove, modify items before payment
- **Staff Attribution**: Track who created and modified orders

## User Experience Design

### Primary User Workflows

#### 1. New Order Creation Flow
```
Staff Authentication → Table Selection → Customer Assignment (Optional) → 
Product Browsing → Item Selection → Customization → Add to Order → 
Review Order → Apply Discounts → Proceed to Payment
```

#### 2. Order Modification Flow
```
Table Selection → View Current Order → Select Item to Modify → 
Update Quantity/Notes/Modifiers → Confirm Changes → Update Totals
```

#### 3. Quick Service Flow (Walk-in Customers)
```
Skip Table → Direct Product Selection → Build Order → 
Customer Details (Optional) → Payment Processing
```

### Interface States

#### Loading States
- **Initial Load**: Skeleton screens for product categories
- **Product Search**: Loading indicators for search results  
- **Order Processing**: Progress indicators for order operations
- **Payment Processing**: Clear status during payment operations

#### Error States
- **Network Errors**: Offline mode with local storage fallback
- **Validation Errors**: Clear messaging for invalid operations
- **Permission Errors**: Staff authorization failure handling
- **Product Unavailable**: Clear indication of out-of-stock items

#### Success States
- **Item Added**: Visual confirmation of successful additions
- **Order Updated**: Clear indication of order modifications
- **Payment Complete**: Success confirmation with receipt options

## Interface Layout

### Main POS Interface Structure

```tsx
<POSInterface>
  <Header>
    <Logo />
    <TableInfo /> {/* Current table and customer info */}
    <StaffInfo /> {/* Logged in staff member */}
    <QuickActions /> {/* New order, table switch, etc. */}
  </Header>
  
  <MainContent>
    <ProductCatalog> {/* Left side - 60% width */}
      <CategoryTabs />
      <ProductGrid />
      <SearchBar />
    </ProductCatalog>
    
    <OrderPanel> {/* Right side - 40% width */}
      <OrderHeader />
      <OrderItems />
      <OrderTotals />
      <ActionButtons />
    </OrderPanel>
  </MainContent>
  
  <Footer>
    <SystemStatus />
    <QuickHelp />
  </Footer>
</POSInterface>
```

### Layout Specifications

#### Screen Dimensions
- **Minimum Resolution**: 1024x768 (tablet landscape)
- **Optimal Resolution**: 1366x768 or higher
- **Aspect Ratio**: 16:10 or 16:9
- **Touch Target Size**: Minimum 44px x 44px

#### Layout Proportions
- **Product Catalog**: 60% width (left panel)
- **Order Panel**: 40% width (right panel)
- **Header**: 80px height
- **Footer**: 60px height
- **Main Content**: Remaining vertical space

### Visual Design System

#### Color Palette
```css
:root {
  /* Primary Colors */
  --primary-green: #10B981;      /* Golf/nature theme */
  --primary-dark: #059669;       /* Darker green for accents */
  
  /* Neutral Colors */
  --gray-50: #F9FAFB;           /* Light backgrounds */
  --gray-100: #F3F4F6;         /* Card backgrounds */
  --gray-200: #E5E7EB;         /* Borders */
  --gray-800: #1F2937;         /* Text primary */
  --gray-600: #4B5563;         /* Text secondary */
  
  /* Functional Colors */
  --success: #10B981;           /* Success states */
  --warning: #F59E0B;           /* Warning states */
  --error: #EF4444;             /* Error states */
  --info: #3B82F6;              /* Information */
}
```

#### Typography
```css
/* Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;     /* 12px - Small labels */
--text-sm: 0.875rem;    /* 14px - Secondary text */
--text-base: 1rem;      /* 16px - Body text */
--text-lg: 1.125rem;    /* 18px - Subheadings */
--text-xl: 1.25rem;     /* 20px - Headings */
--text-2xl: 1.5rem;     /* 24px - Large headings */
--text-3xl: 1.875rem;   /* 30px - Display text */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### Spacing System
```css
/* Spacing Scale */
--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;     /* 12px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
```

## Component Specifications

### Header Component

```tsx
interface HeaderProps {
  currentTable?: TableInfo;
  currentStaff: StaffMember;
  onTableSwitch: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentTable,
  currentStaff,
  onTableSwitch,
  onLogout
}) => {
  return (
    <header className="header">
      <div className="header-left">
        <Logo />
        <TableSelector 
          currentTable={currentTable}
          onSwitch={onTableSwitch}
        />
      </div>
      
      <div className="header-center">
        <SystemTime />
        <ConnectionStatus />
      </div>
      
      <div className="header-right">
        <StaffInfo 
          staff={currentStaff}
          onLogout={onLogout}
        />
        <QuickActions />
      </div>
    </header>
  );
};
```

### Product Catalog Component

```tsx
interface ProductCatalogProps {
  categories: Category[];
  products: Product[];
  onProductSelect: (product: Product) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({
  categories,
  products,
  onProductSelect,
  searchQuery,
  onSearchChange
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  
  return (
    <div className="product-catalog">
      <SearchBar 
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search products..."
      />
      
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      
      <ProductGrid
        products={filteredProducts}
        onProductSelect={onProductSelect}
        layout="responsive"
      />
    </div>
  );
};
```

### Product Grid Component

```tsx
interface ProductGridProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  layout: 'fixed' | 'responsive';
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onProductSelect,
  layout
}) => {
  const gridColumns = layout === 'fixed' ? 4 : 'auto-fit';
  
  return (
    <div 
      className="product-grid"
      style={{
        gridTemplateColumns: layout === 'fixed' 
          ? 'repeat(4, 1fr)' 
          : 'repeat(auto-fit, minmax(120px, 1fr))'
      }}
    >
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductSelect(product)}
        />
      ))}
    </div>
  );
};
```

### Product Card Component

```tsx
interface ProductCardProps {
  product: Product;
  onClick: () => void;
  disabled?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
  disabled = false
}) => {
  const cardStyle = {
    backgroundColor: product.pos_display_color || '#F3F4F6',
    opacity: disabled ? 0.5 : 1
  };
  
  return (
    <button
      className="product-card"
      style={cardStyle}
      onClick={onClick}
      disabled={disabled}
    >
      {product.image && (
        <img 
          src={product.image} 
          alt={product.name}
          className="product-image"
        />
      )}
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-price">
          {formatCurrency(product.price)}
        </p>
        
        {product.description && (
          <p className="product-description">
            {product.description}
          </p>
        )}
      </div>
      
      {!product.is_active && (
        <div className="unavailable-overlay">
          <span>Unavailable</span>
        </div>
      )}
    </button>
  );
};
```

## Order Management

### Order Panel Component

```tsx
interface OrderPanelProps {
  order: Order;
  onItemUpdate: (itemId: string, updates: OrderItemUpdates) => void;
  onItemRemove: (itemId: string) => void;
  onDiscountApply: (discount: Discount) => void;
  onCustomerAssign: (customer: Customer) => void;
  onProceedToPayment: () => void;
}

const OrderPanel: React.FC<OrderPanelProps> = ({
  order,
  onItemUpdate,
  onItemRemove,
  onDiscountApply,
  onCustomerAssign,
  onProceedToPayment
}) => {
  return (
    <div className="order-panel">
      <OrderHeader
        orderNumber={order.orderNumber}
        table={order.table}
        customer={order.customer}
        onCustomerAssign={onCustomerAssign}
      />
      
      <OrderItemsList
        items={order.items}
        onItemUpdate={onItemUpdate}
        onItemRemove={onItemRemove}
      />
      
      <OrderTotals
        subtotal={order.subtotal}
        vatAmount={order.vatAmount}
        discountAmount={order.discountAmount}
        total={order.total}
      />
      
      <OrderActions
        onDiscountApply={onDiscountApply}
        onProceedToPayment={onProceedToPayment}
        disabled={order.items.length === 0}
      />
    </div>
  );
};
```

### Order Item Component

```tsx
interface OrderItemProps {
  item: OrderItem;
  onUpdate: (updates: OrderItemUpdates) => void;
  onRemove: () => void;
}

const OrderItem: React.FC<OrderItemProps> = ({
  item,
  onUpdate,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div className="order-item">
      <div className="item-info">
        <h4 className="item-name">{item.productName}</h4>
        {item.notes && (
          <p className="item-notes">{item.notes}</p>
        )}
      </div>
      
      <div className="item-controls">
        <QuantityControl
          quantity={item.quantity}
          onQuantityChange={(quantity) => onUpdate({ quantity })}
          min={1}
          max={99}
        />
        
        <div className="item-price">
          {formatCurrency(item.total)}
        </div>
        
        <ActionMenu
          onEdit={() => setIsEditing(true)}
          onRemove={onRemove}
        />
      </div>
      
      {isEditing && (
        <ItemEditModal
          item={item}
          onSave={(updates) => {
            onUpdate(updates);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};
```

### Quantity Control Component

```tsx
interface QuantityControlProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

const QuantityControl: React.FC<QuantityControlProps> = ({
  quantity,
  onQuantityChange,
  min = 1,
  max = 99
}) => {
  const handleDecrease = () => {
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  };
  
  const handleIncrease = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    }
  };
  
  return (
    <div className="quantity-control">
      <button
        className="quantity-button decrease"
        onClick={handleDecrease}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      
      <input
        type="number"
        className="quantity-input"
        value={quantity}
        onChange={(e) => {
          const newQuantity = parseInt(e.target.value);
          if (newQuantity >= min && newQuantity <= max) {
            onQuantityChange(newQuantity);
          }
        }}
        min={min}
        max={max}
      />
      
      <button
        className="quantity-button increase"
        onClick={handleIncrease}
        disabled={quantity >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
};
```

## Customer Integration

### Customer Selection Component

```tsx
interface CustomerSelectionProps {
  onCustomerSelect: (customer: Customer) => void;
  onCreateNew: () => void;
}

const CustomerSelection: React.FC<CustomerSelectionProps> = ({
  onCustomerSelect,
  onCreateNew
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchCustomers = useDebouncedCallback(async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const results = await customerService.search(query);
      setCustomers(results);
    } catch (error) {
      console.error('Customer search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, 300);
  
  useEffect(() => {
    searchCustomers(searchQuery);
  }, [searchQuery]);
  
  return (
    <div className="customer-selection">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search customers..."
        loading={isLoading}
      />
      
      <CustomerList
        customers={customers}
        onCustomerSelect={onCustomerSelect}
        emptyMessage="No customers found"
      />
      
      <ActionButton
        onClick={onCreateNew}
        variant="secondary"
        fullWidth
      >
        Create New Customer
      </ActionButton>
    </div>
  );
};
```

## Staff Authentication

### PIN Authentication Component

```tsx
interface PINAuthenticationProps {
  onAuthenticationSuccess: (staff: StaffMember) => void;
  onAuthenticationFailure: (error: string) => void;
}

const PINAuthentication: React.FC<PINAuthenticationProps> = ({
  onAuthenticationSuccess,
  onAuthenticationFailure
}) => {
  const [pin, setPin] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const maxAttempts = 3;
  const isLocked = attempts >= maxAttempts;
  
  const handlePINSubmit = async () => {
    if (pin.length < 4) {
      onAuthenticationFailure('PIN must be at least 4 digits');
      return;
    }
    
    setIsAuthenticating(true);
    
    try {
      const staff = await authService.authenticateWithPIN(pin);
      
      if (staff) {
        onAuthenticationSuccess(staff);
        setAttempts(0);
      } else {
        setAttempts(attempts + 1);
        onAuthenticationFailure('Invalid PIN');
      }
    } catch (error) {
      setAttempts(attempts + 1);
      onAuthenticationFailure('Authentication failed');
    } finally {
      setIsAuthenticating(false);
      setPin('');
    }
  };
  
  return (
    <div className="pin-authentication">
      <h2>Staff Login</h2>
      
      <PINInput
        value={pin}
        onChange={setPin}
        maxLength={6}
        secureEntry
        disabled={isLocked || isAuthenticating}
      />
      
      <NumericKeypad
        onDigitPress={(digit) => {
          if (pin.length < 6) {
            setPin(pin + digit);
          }
        }}
        onBackspace={() => {
          setPin(pin.slice(0, -1));
        }}
        onClear={() => setPin('')}
        disabled={isLocked || isAuthenticating}
      />
      
      <ActionButton
        onClick={handlePINSubmit}
        disabled={pin.length < 4 || isLocked || isAuthenticating}
        loading={isAuthenticating}
        fullWidth
      >
        {isAuthenticating ? 'Authenticating...' : 'Login'}
      </ActionButton>
      
      {isLocked && (
        <ErrorMessage>
          Too many failed attempts. Please contact a manager.
        </ErrorMessage>
      )}
      
      {attempts > 0 && !isLocked && (
        <WarningMessage>
          {maxAttempts - attempts} attempts remaining
        </WarningMessage>
      )}
    </div>
  );
};
```

## Mobile Optimization

### Responsive Design Strategy

#### Breakpoint System
```css
/* Mobile-first responsive breakpoints */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

#### Touch Optimization
- **Minimum Touch Target**: 44px x 44px
- **Gesture Support**: Swipe, pinch, long press
- **Haptic Feedback**: Touch confirmation (where supported)
- **Scroll Optimization**: Smooth scrolling with momentum

#### Performance Optimization
- **Lazy Loading**: Load product images on demand
- **Virtual Scrolling**: Handle large product catalogs efficiently
- **Debounced Search**: Reduce API calls during typing
- **Cached Data**: Local storage for frequently accessed data

### Mobile Layout Adaptations

#### Portrait Mode (< 768px width)
```tsx
const MobileLayout: React.FC = () => {
  return (
    <div className="mobile-layout">
      <Header compact />
      
      <Tabs>
        <TabPanel label="Products">
          <ProductCatalog />
        </TabPanel>
        
        <TabPanel label="Order" badge={orderItemCount}>
          <OrderPanel />
        </TabPanel>
        
        <TabPanel label="Tables">
          <TableManagement />
        </TabPanel>
      </Tabs>
    </div>
  );
};
```

#### Landscape Mode (>= 768px width)
```tsx
const TabletLayout: React.FC = () => {
  return (
    <div className="tablet-layout">
      <Header />
      
      <MainContent>
        <ProductCatalog width="60%" />
        <OrderPanel width="40%" />
      </MainContent>
      
      <Footer />
    </div>
  );
};
```

## Implementation Details

### State Management

```typescript
interface POSState {
  // Authentication
  currentStaff: StaffMember | null;
  isAuthenticated: boolean;
  
  // Current context
  currentTable: Table | null;
  currentOrder: Order | null;
  currentCustomer: Customer | null;
  
  // Product catalog
  categories: Category[];
  products: Product[];
  searchQuery: string;
  activeCategory: string;
  
  // UI state
  isLoading: boolean;
  errors: ErrorState[];
  notifications: Notification[];
  
  // System state
  isOnline: boolean;
  printerStatus: PrinterStatus;
  systemHealth: SystemHealth;
}

class POSStore {
  private state: POSState = initialState;
  private listeners = new Set<StateListener>();
  
  // State getters
  get currentStaff() { return this.state.currentStaff; }
  get currentOrder() { return this.state.currentOrder; }
  get products() { return this.state.products; }
  
  // State setters
  setCurrentStaff(staff: StaffMember) {
    this.setState({ currentStaff: staff, isAuthenticated: true });
  }
  
  setCurrentOrder(order: Order) {
    this.setState({ currentOrder: order });
  }
  
  // Order operations
  addItemToOrder(product: Product, quantity: number = 1) {
    const currentOrder = this.state.currentOrder || this.createNewOrder();
    const existingItem = currentOrder.items.find(item => item.productId === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total = existingItem.quantity * existingItem.unitPrice;
    } else {
      currentOrder.items.push({
        id: generateId(),
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        total: product.price * quantity,
        notes: ''
      });
    }
    
    this.recalculateOrderTotals(currentOrder);
    this.setCurrentOrder(currentOrder);
  }
  
  private recalculateOrderTotals(order: Order) {
    order.subtotal = order.items.reduce((sum, item) => sum + item.total, 0);
    order.vatAmount = order.subtotal * order.vatRate;
    order.total = order.subtotal + order.vatAmount - (order.discountAmount || 0);
  }
}
```

### API Integration

```typescript
class POSApiService {
  private baseUrl = '/api';
  
  // Product operations
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${this.baseUrl}/products?${params}`);
    return response.json();
  }
  
  async searchProducts(query: string): Promise<Product[]> {
    const response = await fetch(`${this.baseUrl}/products/search?q=${encodeURIComponent(query)}`);
    return response.json();
  }
  
  // Order operations
  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return response.json();
  }
  
  async updateOrder(orderId: string, updates: OrderUpdates): Promise<Order> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }
  
  // Customer operations
  async searchCustomers(query: string): Promise<Customer[]> {
    const response = await fetch(`${this.baseUrl}/customers/search?q=${encodeURIComponent(query)}`);
    return response.json();
  }
  
  async createCustomer(customerData: CreateCustomerRequest): Promise<Customer> {
    const response = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    return response.json();
  }
}
```

---

## Implementation Roadmap

### Phase 1: Core Interface (Week 1-2)
- [ ] Basic layout and navigation
- [ ] Product catalog display
- [ ] Simple order creation
- [ ] Staff authentication

### Phase 2: Enhanced Features (Week 3-4)
- [ ] Advanced order management
- [ ] Customer integration
- [ ] Search and filtering
- [ ] Real-time updates

### Phase 3: Mobile Optimization (Week 5-6)
- [ ] Responsive design implementation
- [ ] Touch gesture support
- [ ] Performance optimization
- [ ] Offline capabilities

### Phase 4: Polish & Testing (Week 7-8)
- [ ] User experience refinement
- [ ] Accessibility compliance
- [ ] Performance testing
- [ ] Staff training materials

---

**Maintained by**: Lengolf Development Team  
**Last Updated**: July 14, 2025  
**Next Review**: August 2025

## Related Documents
- [System Architecture](./LENGOLF_POS_SYSTEM_ARCHITECTURE.md)
- [Table Management System](./TABLE_MANAGEMENT_SYSTEM.md)
- [Product Catalog Integration](./PRODUCT_CATALOG_INTEGRATION.md)
- [Transaction Processing Design](./TRANSACTION_PROCESSING_DESIGN.md)