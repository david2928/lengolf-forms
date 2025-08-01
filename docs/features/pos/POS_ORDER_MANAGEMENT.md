# POS Order Management System

## Overview

The Order Management System provides basic order handling with database storage in the `pos.orders` and `pos.order_items` tables. The current implementation includes API endpoints that return mock data for development purposes.

## Architecture

### Core Components

**Order Interface:**
- `POSInterface.tsx` - Main order management interface with running/current tabs
- Order state management with real-time synchronization across devices
- Staff-authorized item removal and modification system

**State Management:**
- `useOrderStore.ts` - Zustand-based order state management
- `OrderManagementService.ts` - Order lifecycle and business logic
- Real-time WebSocket integration for multi-device synchronization

### Database Schema

**Order Management:**
```sql
-- Main orders table (actual structure)
pos.orders (
  id UUID PRIMARY KEY,
  table_session_id UUID NOT NULL,
  order_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  tax_amount NUMERIC,
  subtotal_amount NUMERIC NOT NULL,
  staff_id INTEGER,
  customer_id UUID,
  booking_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by TEXT,
  notes TEXT
);

-- Order line items
pos.order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES pos.orders(id),
  product_id INTEGER REFERENCES pos.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT,
  customizations JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  added_by_staff_id INTEGER REFERENCES staff(id),
  removed_by_staff_id INTEGER,
  removed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order status tracking
pos.order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES pos.orders(id),
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  changed_by_staff_id INTEGER REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Reference

### Order Operations

**Create New Order**
```http
POST /api/pos/orders
Content-Type: application/json

{
  "table_session_id": 123,
  "staff_pin": "1234",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "notes": "No spicy",
      "customizations": {
        "spice_level": "mild",
        "extra_ingredients": ["cheese"]
      }
    }
  ],
  "notes": "Customer allergic to peanuts"
}
```

**Response:**
```json
{
  "order": {
    "id": 456,
    "order_number": "ORD-20240115-001",
    "table_session_id": 123,
    "status": "pending",
    "items": [
      {
        "id": 789,
        "product": {
          "id": 1,
          "name": "Thai Green Curry",
          "price": 280.00
        },
        "quantity": 2,
        "unit_price": 280.00,
        "total_price": 560.00,
        "notes": "No spicy",
        "customizations": {
          "spice_level": "mild",
          "extra_ingredients": ["cheese"]
        }
      }
    ],
    "subtotal": 560.00,
    "tax_amount": 39.20,
    "total_amount": 599.20,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Get Orders by Table Session**
```http
GET /api/pos/orders?table_session_id=123
```

**Update Order Status**
```http
PUT /api/pos/orders/[orderId]
Content-Type: application/json

{
  "status": "confirmed",
  "staff_pin": "1234",
  "notes": "Confirmed by kitchen"
}
```

**Add Items to Existing Order**
```http
POST /api/pos/table-sessions/[sessionId]/add-order
Content-Type: application/json

{
  "items": [
    {
      "product_id": 5,
      "quantity": 1,
      "notes": "Extra sauce"
    }
  ],
  "staff_pin": "1234"
}
```

**Remove Item (Staff Authorization Required)**
```http
DELETE /api/pos/table-sessions/[sessionId]/remove-item
Content-Type: application/json

{
  "order_item_id": 789,
  "staff_pin": "1234",
  "reason": "Customer changed mind"
}
```

## Component Implementation

### POSInterface Component

**Main Order Interface:**
```typescript
const POSInterface = () => {
  // State management
  const {
    currentOrders,
    runningTotal,
    selectedTable,
    addItem,
    removeItem,
    updateQuantity,
    confirmOrder,
    clearOrder
  } = useOrderStore();

  // Real-time synchronization
  const { data: tableOrders, mutate } = useSWR(
    selectedTable ? `/api/pos/orders?table_session_id=${selectedTable.session_id}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Handle product selection
  const handleProductSelect = async (product: Product) => {
    const orderItem = {
      product_id: product.id,
      quantity: 1,
      unit_price: product.price,
      notes: '',
      customizations: {}
    };

    await addItem(orderItem);
    
    // Update UI optimistically
    mutate();
  };

  // Handle item removal with staff authorization
  const handleRemoveItem = async (itemId: number) => {
    const staff_pin = await showStaffPinModal('Remove item authorization required');
    
    if (staff_pin) {
      await removeItem(itemId, staff_pin, 'Item removed by customer request');
      mutate();
      toast.success('Item removed successfully');
    }
  };

  return (
    <div className="flex h-full">
      {/* Product Catalog */}
      <div className="flex-1">
        <ProductCatalog onProductSelect={handleProductSelect} />
      </div>

      {/* Current Order Panel */}
      <div className="w-96 border-l bg-white flex flex-col">
        <OrderHeader 
          tableNumber={selectedTable?.table_number}
          orderCount={currentOrders.length}
        />

        <div className="flex-1 overflow-auto">
          {currentOrders.length === 0 ? (
            <EmptyOrderState />
          ) : (
            <OrderItemsList 
              items={currentOrders}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          )}
        </div>

        <OrderSummary 
          subtotal={runningTotal.subtotal}
          tax={runningTotal.tax}
          total={runningTotal.total}
          onConfirm={confirmOrder}
          onClear={clearOrder}
        />
      </div>
    </div>
  );
};
```

### Order State Management

**Zustand Store Implementation:**
```typescript
interface OrderState {
  currentOrders: OrderItem[];
  selectedTable: TableSession | null;
  runningTotal: OrderTotal;
  
  // Actions
  addItem: (item: Omit<OrderItem, 'id'>) => Promise<void>;
  removeItem: (itemId: number, staffPin: string, reason: string) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  confirmOrder: (staffPin: string) => Promise<void>;
  clearOrder: () => void;
  setSelectedTable: (table: TableSession) => void;
}

const useOrderStore = create<OrderState>((set, get) => ({
  currentOrders: [],
  selectedTable: null,
  runningTotal: { subtotal: 0, tax: 0, total: 0 },

  addItem: async (item) => {
    const { selectedTable } = get();
    if (!selectedTable) throw new Error('No table selected');

    // Check if item already exists
    const existingItem = get().currentOrders.find(
      existing => existing.product_id === item.product_id &&
      JSON.stringify(existing.customizations) === JSON.stringify(item.customizations)
    );

    if (existingItem) {
      // Update existing item quantity
      await get().updateQuantity(existingItem.id, existingItem.quantity + item.quantity);
    } else {
      // Add new item
      const response = await fetch('/api/pos/table-sessions/${selectedTable.id}/add-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] })
      });

      if (!response.ok) throw new Error('Failed to add item');

      const { order_item } = await response.json();
      
      set(state => ({
        currentOrders: [...state.currentOrders, order_item],
        runningTotal: calculateTotal([...state.currentOrders, order_item])
      }));
    }
  },

  removeItem: async (itemId, staffPin, reason) => {
    const { selectedTable } = get();
    if (!selectedTable) throw new Error('No table selected');

    const response = await fetch(`/api/pos/table-sessions/${selectedTable.id}/remove-item`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_item_id: itemId, staff_pin: staffPin, reason })
    });

    if (!response.ok) throw new Error('Failed to remove item');

    set(state => {
      const updatedOrders = state.currentOrders.filter(item => item.id !== itemId);
      return {
        currentOrders: updatedOrders,
        runningTotal: calculateTotal(updatedOrders)
      };
    });
  },

  updateQuantity: async (itemId, quantity) => {
    if (quantity <= 0) {
      // Require staff authorization for item removal
      const staffPin = await showStaffPinModal('Authorization required to remove item');
      if (staffPin) {
        await get().removeItem(itemId, staffPin, 'Quantity reduced to zero');
      }
      return;
    }

    // Update quantity in database
    const response = await fetch(`/api/pos/order-items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity })
    });

    if (!response.ok) throw new Error('Failed to update quantity');

    set(state => {
      const updatedOrders = state.currentOrders.map(item =>
        item.id === itemId ? { ...item, quantity, total_price: item.unit_price * quantity } : item
      );
      return {
        currentOrders: updatedOrders,
        runningTotal: calculateTotal(updatedOrders)
      };
    });
  },

  confirmOrder: async (staffPin) => {
    const { selectedTable, currentOrders } = get();
    if (!selectedTable || currentOrders.length === 0) return;

    const response = await fetch(`/api/pos/table-sessions/${selectedTable.id}/confirm-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_pin: staffPin })
    });

    if (!response.ok) throw new Error('Failed to confirm order');

    // Clear current order after confirmation
    set({ currentOrders: [], runningTotal: { subtotal: 0, tax: 0, total: 0 } });
  }
}));
```

## Order Status Management

### Status Lifecycle

**Order Statuses:**
1. **pending** - Order created, waiting for confirmation
2. **confirmed** - Order confirmed by staff, sent to kitchen
3. **preparing** - Kitchen started preparation
4. **ready** - Order ready for service
5. **served** - Order delivered to table
6. **completed** - Order fully completed
7. **cancelled** - Order cancelled

**Status Transitions:**
```typescript
const VALID_STATUS_TRANSITIONS = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['preparing', 'cancelled'],
  'preparing': ['ready', 'cancelled'],
  'ready': ['served'],
  'served': ['completed'],
  'completed': [],
  'cancelled': []
};

const validateStatusTransition = (from: string, to: string): boolean => {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
};
```

### Status Update Component

```typescript
const OrderStatusManager = ({ order }: { order: Order }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (newStatus: string) => {
    if (!validateStatusTransition(order.status, newStatus)) {
      toast.error('Invalid status transition');
      return;
    }

    setIsUpdating(true);
    try {
      const staffPin = await showStaffPinModal('Status update authorization required');
      
      await fetch(`/api/pos/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          staff_pin: staffPin,
          notes: `Status changed to ${newStatus}`
        })
      });

      toast.success('Order status updated successfully');
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const availableStatuses = VALID_STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded text-sm ${getStatusColor(order.status)}`}>
        {order.status.toUpperCase()}
      </span>
      
      {availableStatuses.length > 0 && (
        <select
          onChange={(e) => updateStatus(e.target.value)}
          disabled={isUpdating}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">Update Status</option>
          {availableStatuses.map(status => (
            <option key={status} value={status}>
              {status.toUpperCase()}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
```

## Real-Time Synchronization

### WebSocket Integration

**Order Updates Across Devices:**
```typescript
const useOrderSync = (tableSessionId: number) => {
  const { mutate } = useSWRConfig();
  
  useEffect(() => {
    const ws = new WebSocket(`${wsUrl}/pos/orders`);
    
    ws.onopen = () => {
      // Subscribe to order updates for this table
      ws.send(JSON.stringify({
        type: 'subscribe',
        table_session_id: tableSessionId
      }));
    };

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      switch (update.type) {
        case 'order_created':
        case 'order_updated':
        case 'item_added':
        case 'item_removed':
          // Revalidate order data
          mutate(`/api/pos/orders?table_session_id=${tableSessionId}`);
          
          // Show notification if update came from another device
          if (update.source !== 'current_device') {
            toast.info('Order updated from another device');
          }
          break;
          
        case 'status_changed':
          updateOrderStatus(update.order_id, update.new_status);
          break;
      }
    };

    return () => ws.close();
  }, [tableSessionId]);
};
```

### Optimistic Updates

**UI Responsiveness:**
```typescript
const useOptimisticOrderUpdates = () => {
  const { mutate } = useSWRConfig();

  const addItemOptimistic = async (tableSessionId: number, item: OrderItem) => {
    const key = `/api/pos/orders?table_session_id=${tableSessionId}`;
    
    // Optimistic update
    mutate(key, (currentData: any) => {
      if (!currentData) return currentData;
      
      return {
        ...currentData,
        orders: currentData.orders.map((order: Order) => {
          if (order.status === 'pending') {
            return {
              ...order,
              items: [...order.items, { ...item, id: `temp_${Date.now()}` }]
            };
          }
          return order;
        })
      };
    }, false);

    try {
      // API call
      const response = await fetch(`/api/pos/table-sessions/${tableSessionId}/add-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] })
      });

      if (!response.ok) throw new Error('Failed to add item');

      // Revalidate with server data
      mutate(key);
    } catch (error) {
      // Revert optimistic update on error
      mutate(key);
      throw error;
    }
  };

  return { addItemOptimistic };
};
```

## Staff Authorization System

### PIN-Based Item Removal

**Authorization Modal:**
```typescript
const StaffAuthModal = ({ onAuthorize, onCancel, action }: StaffAuthModalProps) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/pos/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action })
      });

      if (response.ok) {
        const { staff } = await response.json();
        onAuthorize(pin, staff);
      } else {
        const { error } = await response.json();
        setError(error || 'Invalid PIN');
      }
    } catch (error) {
      setError('Authorization failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80">
        <h3 className="text-lg font-semibold mb-4">
          Staff Authorization Required
        </h3>
        <p className="text-gray-600 mb-4">
          Action: {action}
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter 4-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full p-3 border rounded text-center text-xl tracking-widest"
            autoFocus
          />
          
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          
          <div className="flex space-x-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pin.length !== 4 || isVerifying}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Authorize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## Order Customization System

### Product Customizations

**Customization Interface:**
```typescript
interface ProductCustomization {
  spice_level?: 'mild' | 'medium' | 'hot' | 'very_hot';
  cooking_preference?: 'rare' | 'medium_rare' | 'medium' | 'well_done';
  extra_ingredients?: string[];
  removed_ingredients?: string[];
  special_instructions?: string;
}

const CustomizationModal = ({ product, onSave, onCancel }: CustomizationModalProps) => {
  const [customizations, setCustomizations] = useState<ProductCustomization>({});

  const handleSave = () => {
    onSave({
      product_id: product.id,
      quantity: 1,
      unit_price: product.price,
      customizations,
      notes: customizations.special_instructions || ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Customize {product.name}
        </h3>

        {/* Spice Level */}
        {product.category?.allows_spice_customization && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Spice Level</label>
            <div className="grid grid-cols-2 gap-2">
              {['mild', 'medium', 'hot', 'very_hot'].map(level => (
                <button
                  key={level}
                  onClick={() => setCustomizations(prev => ({ ...prev, spice_level: level }))}
                  className={cn(
                    "p-2 border rounded text-sm",
                    customizations.spice_level === level
                      ? "bg-blue-500 text-white"
                      : "bg-white hover:bg-gray-50"
                  )}
                >
                  {level.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Extra Ingredients */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Extra Ingredients</label>
          <div className="space-y-2">
            {product.available_extras?.map(extra => (
              <label key={extra.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={customizations.extra_ingredients?.includes(extra.name) || false}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCustomizations(prev => ({
                        ...prev,
                        extra_ingredients: [...(prev.extra_ingredients || []), extra.name]
                      }));
                    } else {
                      setCustomizations(prev => ({
                        ...prev,
                        extra_ingredients: prev.extra_ingredients?.filter(item => item !== extra.name)
                      }));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{extra.name} (+฿{extra.price})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Special Instructions</label>
          <textarea
            value={customizations.special_instructions || ''}
            onChange={(e) => setCustomizations(prev => ({ ...prev, special_instructions: e.target.value }))}
            placeholder="Any special requests..."
            className="w-full p-2 border rounded text-sm"
            rows={3}
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Performance Optimization

### Order Calculation Caching

**Memoized Calculations:**
```typescript
const useOrderCalculations = (items: OrderItem[]) => {
  return useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const extrasTotal = item.customizations?.extra_ingredients?.reduce(
        (extraSum, extra) => extraSum + (getExtraPrice(extra) || 0),
        0
      ) || 0;
      return sum + itemTotal + (extrasTotal * item.quantity);
    }, 0);

    const taxRate = 0.07; // 7% VAT
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [items]);
};
```

### Batch Operations

**Efficient Item Updates:**
```typescript
const useBatchOrderOperations = () => {
  const [pendingOperations, setPendingOperations] = useState<OrderOperation[]>([]);
  
  const debouncedFlush = useDebounce(() => {
    if (pendingOperations.length > 0) {
      flushOperations();
    }
  }, 1000);

  const addOperation = (operation: OrderOperation) => {
    setPendingOperations(prev => [...prev, operation]);
    debouncedFlush();
  };

  const flushOperations = async () => {
    const operations = [...pendingOperations];
    setPendingOperations([]);

    try {
      await fetch('/api/pos/orders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations })
      });
    } catch (error) {
      // Re-add failed operations
      setPendingOperations(prev => [...operations, ...prev]);
      throw error;
    }
  };

  return { addOperation, flushOperations };
};
```

## Troubleshooting

### Common Issues

**Orders Not Syncing:**
1. Check WebSocket connection status
2. Verify network connectivity
3. Review server-side error logs
4. Test with different devices

**Item Removal Failures:**
1. Verify staff PIN is correct
2. Check staff permissions in database
3. Review authorization flow
4. Confirm item exists and is removable

**Calculation Discrepancies:**
1. Verify tax rate configuration
2. Check extra ingredients pricing
3. Review customization price logic
4. Validate database constraints

### Debug Tools

**Order State Debugging:**
```typescript
// Debug current order state
const debugOrderState = () => {
  const state = useOrderStore.getState();
  console.log('Current Orders:', state.currentOrders);
  console.log('Running Total:', state.runningTotal);
  console.log('Selected Table:', state.selectedTable);
};

// Monitor WebSocket messages
const debugWebSocket = (ws: WebSocket) => {
  ws.addEventListener('message', (event) => {
    console.log('WebSocket Message:', JSON.parse(event.data));
  });
};
```

## Integration Points

### Table Management System
- Automatic order association with table sessions
- Real-time table status updates based on order activity
- Seamless transition between table and order management

### Payment Processing
- Order totals calculation for payment processing
- Integration with bill splitting functionality
- Automatic payment association with completed orders

### Kitchen Display System
- Order status updates to kitchen display
- Preparation time estimates
- Order priority management

## Future Enhancements

### Planned Features
- **Kitchen Display Integration** - Real-time order display for kitchen staff
- **Order Scheduling** - Advance order scheduling and timing
- **Customer Preferences** - Saved customer customization preferences
- **Order Analytics** - Detailed order performance metrics

### Technical Improvements
- **GraphQL Integration** - More efficient real-time updates
- **Enhanced Offline Mode** - Full offline order creation
- **Advanced Caching** - Intelligent order data caching
- **AI-Powered Insights** - Order pattern analysis and suggestions

## Related Documentation

- [POS Table Management](./POS_TABLE_MANAGEMENT.md) - Table session management
- [POS Payment Processing](./POS_PAYMENT_PROCESSING.md) - Payment handling
- [POS Staff Authentication](./POS_STAFF_AUTHENTICATION.md) - Authorization system
- [POS API Reference](./POS_API_REFERENCE.md) - Complete API documentation

---

*Last Updated: January 2025 | Version: 2.1.0*