# Lengolf POS System - Complete Implementation Documentation

**Document Version**: 5.0  
**Last Updated**: January 2025  
**System Status**: ✅ **PRODUCTION READY WITH THERMAL PRINTING**

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Current Implementation - Frontend](#current-implementation---frontend)
4. [Current Implementation - Backend APIs](#current-implementation---backend-apis)
5. [Database Schema](#database-schema)
6. [Key Features & Workflows](#key-features--workflows)
7. [Security & Authentication](#security--authentication)
8. [Mobile Optimization](#mobile-optimization)
9. [Performance Considerations](#performance-considerations)
10. [Not Yet Implemented Features](#not-yet-implemented-features)
11. [Deployment & Configuration](#deployment--configuration)

---

## Executive Summary

The Lengolf POS system is a fully operational, production-ready point-of-sale solution that replaces the existing Qashier system. Built with Next.js 14, TypeScript, and Supabase, it provides seamless integration with existing booking, customer, and staff management systems.

### Core Capabilities
- **Table Management**: Real-time table status tracking across Bar and Bay zones
- **Product Catalog**: Hierarchical category navigation with 1000+ products
- **Order Management**: Dual-mode system (Running Tab / Current Order)
- **Payment Processing**: Multiple payment methods with split payment support
- **Staff Authentication**: PIN-based security with 8-hour sessions
- **Receipt Generation**: Multi-format receipts (JSON/HTML/thermal-ready)
- **Thermal Printing**: Windows (win32print) + Android (Bluetooth) support
- **Mobile Responsive**: Full mobile optimization with dedicated interfaces

### Production Readiness
All core POS operations are fully implemented and tested. The system can process orders, handle payments, manage tables, and generate receipts without any external dependencies except the database.

---

## System Architecture

### Technology Stack
```
Frontend:  Next.js 14, TypeScript, React, Tailwind CSS, Framer Motion
Backend:   Next.js API Routes, Supabase (PostgreSQL)
Auth:      NextAuth.js + Custom Staff PIN System
State:     React Context + SWR for data fetching
Mobile:    Responsive design + dedicated mobile components
```

### Directory Structure
```
lengolf-forms/
├── app/
│   ├── pos/                    # Main POS page
│   └── api/pos/               # POS API endpoints
├── src/
│   ├── components/pos/        # POS React components
│   ├── services/              # Business logic services
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript definitions
└── docs/                      # Documentation
```

### Database Schema Overview
The POS system uses multiple PostgreSQL schemas:
- `pos.*` - Core POS tables (orders, transactions, sessions)
- `products.*` - Product catalog and categories
- `backoffice.*` - Staff management
- `public.*` - Customers and bookings

---

## Current Implementation - Frontend

### 1. Main Entry Points

#### `/app/pos/page.tsx`
The main POS page that handles:
- Staff authentication via `POSStaffProvider`
- View switching between table management and POS interface
- Session persistence with 8-hour timeout

```typescript
Components:
- POSContent (authenticated view)
- StaffLoginModal (PIN entry)
- POSInterface or TableManagementDashboard (based on state)
```

### 2. Table Management System

#### Core Components

**`TableManagementDashboard.tsx`** (446 lines)
- Central hub for table operations
- Real-time status updates via polling
- Zone-based organization (Bar/Bay)
- Integration with payment processing

**`TableCard.tsx`** (120 lines)
- Individual table representation
- Visual status indicators
- Touch-optimized interaction
- Payment-ready state handling

**`TableDetailModal.tsx`** (250 lines)
- Table opening workflow
- Booking integration
- Staff PIN verification
- Walk-in support

**`OccupiedTableDetailsPanel.tsx`** (180 lines)
- Occupied table management
- Quick actions (add order, payment, cancel)
- Session information display

### 3. Product Catalog System

#### Core Components

**`ProductCatalog.tsx`** (320 lines)
- Main product browsing interface
- Category navigation (DRINK, FOOD, GOLF, PACKAGES)
- Search integration
- Responsive grid layout

**`ProductGrid.tsx` / `LazyProductGrid.tsx`** (200 lines)
- Performance-optimized product display
- Virtual scrolling for large catalogs
- 2-6 column responsive layout
- Lazy loading implementation

**`ProductCard.tsx`** (150 lines)
- Visual product representation
- Color-coded by category
- Quick-add functionality
- Price display with VAT

**`ProductSearch.tsx`** (180 lines)
- Real-time search with debouncing
- Autocomplete suggestions
- Category filtering
- Search history

### 4. Order Management System

#### Core Components

**`SimplifiedOrderPanel.tsx`** (450 lines)
- Dual-mode order system
- Running Tab (confirmed orders)
- Current Order (pending items)
- Real-time calculations

**`OrderItemsList.tsx`** (220 lines)
- Order item display
- Quantity management
- Item removal with authorization
- Visual feedback animations

**`RemoveItemModal.tsx`** (280 lines)
- Staff-authorized item removal
- Partial quantity removal
- Audit trail creation
- Animated feedback

**`QuantityControl.tsx`** (100 lines)
- Touch-optimized controls
- Direct input support
- Minimum/maximum validation

### 5. Payment Processing System

#### Core Components

**`PaymentInterface.tsx`** (824 lines)
- Complete payment workflow
- Method selection screen
- Split payment management
- Success confirmation

**`SimplifiedPaymentModal.tsx`** (400 lines)
- Full-screen payment UI
- Multiple payment methods
- PromptPay QR generation
- Staff PIN verification

**`StaffPinModal.tsx`** (180 lines)
- Reusable PIN entry
- Numeric keypad interface
- Error handling
- Session management

### 6. Mobile-Specific Components

**`MobilePOSContainer.tsx`**
- Full-screen mobile interface
- Gesture navigation support
- Performance optimizations

**`MobileProductGrid.tsx`**
- Touch-optimized layout
- Swipe gesture support
- Mobile-specific grid sizing

---

## Current Implementation - Backend APIs

### 1. Table Management APIs

#### `GET /api/pos/tables`
```typescript
Response: {
  tables: Table[],
  zones: Zone[],
  summary: {
    totalTables: number,
    occupiedTables: number,
    availableTables: number,
    totalRevenue: number,
    byZone: ZoneSummary[]
  }
}
Features:
- Real-time session data
- Zone grouping
- Booking integration
- No-cache headers
```

#### `POST /api/pos/tables/[tableId]/open`
```typescript
Request: {
  bookingId?: string,
  staffPin?: string,
  staffId?: number,
  paxCount?: number,
  notes?: string
}
Features:
- Staff verification
- Booking validation
- Orphaned session cleanup
- Customer ID resolution
```

#### `POST /api/pos/tables/[tableId]/close`
```typescript
Request: {
  reason?: string,
  staffPin?: string,
  forceClose?: boolean
}
Features:
- Payment validation
- Force close for cancellations
- Session finalization
```

### 2. Product Catalog APIs

#### `GET /api/pos/products`
```typescript
Parameters: {
  page?: number,
  limit?: number,
  category?: string,
  search?: string,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  all?: boolean
}
Response: {
  products: POSProduct[],
  categories: POSCategory[],
  pagination: {...},
  metadata: {...}
}
```

#### `GET /api/pos/products/categories/hierarchy`
```typescript
Response: {
  hierarchy: POSCategory[],
  tabHierarchy: {
    DRINK: POSCategory[],
    FOOD: POSCategory[],
    GOLF: POSCategory[],
    PACKAGES: POSCategory[]
  },
  flatCategories: POSCategory[],
  categoryBreadcrumbs: Record<string, string[]>
}
```

### 3. Order Management APIs

#### `POST /api/pos/table-sessions/[sessionId]/confirm-order`
```typescript
Request: {
  orderItems: OrderItem[],
  notes?: string
}
Features:
- Server-side price validation
- VAT calculation (7%)
- Product verification
- Order number generation
```

#### `POST /api/pos/table-sessions/[sessionId]/remove-item`
```typescript
Request: {
  itemId: string,
  reason: string,
  staffPin: string,
  quantityToRemove?: number
}
Features:
- Partial removal support
- Audit trail (pos.item_removals)
- Order total recalculation
- Staff authorization
```

### 4. Payment Processing APIs

#### `POST /api/pos/payments/process`
```typescript
Request: {
  tableSessionId: string,
  paymentMethods: PaymentAllocation[],
  staffPin: string,
  staffId?: number,
  customerName?: string,
  tableNumber?: string,
  closeTableSession?: boolean
}
Response: {
  success: boolean,
  transaction: Transaction,
  receiptNumber: string,
  redirectToTables: boolean
}
```

#### `GET /api/pos/receipts/[receiptNumber]`
```typescript
Parameters: {
  format?: 'json' | 'html' | 'thermal',
  language?: 'en' | 'th'
}
Features:
- Multi-format support
- Thermal printer ready
- Order reconstruction
- Multi-language
```

#### `POST /api/pos/print-win32`
```typescript
Request: {
  receiptNumber: string,
  testPrint?: boolean
}
Features:
- Windows thermal printing via Python win32print
- Real-time receipt data reconstruction
- Bangkok timezone timestamps
- Staff name resolution
- Guest count from table sessions
```

#### `POST /api/pos/print-bluetooth`
```typescript
Request: {
  receiptNumber: string
}
Response: {
  success: boolean,
  receiptData: BluetoothReceiptData,
  method: 'Web Bluetooth API'
}
Features:
- Android Bluetooth printing preparation
- Client-side printing via Web Bluetooth API
- Same receipt format as Windows
```

### 5. Staff Authentication API

#### `POST /api/pos/staff/verify-pin`
```typescript
Request: {
  pin: string,
  deviceId?: string
}
Response: {
  success: boolean,
  staff?: {
    id: number,
    name: string
  },
  is_locked?: boolean,
  lock_expires_at?: string
}
```

---

## Database Schema

### Core POS Tables

```sql
-- Table Sessions (Active tables)
pos.table_sessions (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES pos.tables,
  status VARCHAR, -- 'occupied', 'paid', 'closed'
  pax_count INTEGER,
  booking_id UUID REFERENCES bookings,
  staff_id INTEGER REFERENCES backoffice.staff,
  customer_id UUID REFERENCES customers,
  session_start TIMESTAMP,
  session_end TIMESTAMP,
  total_amount DECIMAL,
  current_order_items JSONB, -- Legacy support
  notes TEXT
)

-- Orders (Normalized storage)
pos.orders (
  id UUID PRIMARY KEY,
  table_session_id UUID REFERENCES pos.table_sessions,
  order_number VARCHAR UNIQUE,
  status VARCHAR, -- 'draft', 'confirmed', 'completed'
  total_amount DECIMAL,
  tax_amount DECIMAL,
  subtotal_amount DECIMAL,
  staff_id INTEGER,
  customer_id UUID,
  booking_id UUID,
  confirmed_by VARCHAR,
  notes TEXT
)

-- Order Items (Normalized)
pos.order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES pos.orders,
  product_id UUID REFERENCES products.products,
  quantity INTEGER,
  unit_price DECIMAL,
  total_price DECIMAL,
  modifiers JSONB,
  notes TEXT
)

-- Transactions (Payment records)
pos.transactions (
  id UUID PRIMARY KEY,
  transaction_id UUID UNIQUE,
  receipt_number VARCHAR UNIQUE,
  table_session_id UUID,
  subtotal_amount DECIMAL,
  vat_amount DECIMAL,
  total_amount DECIMAL,
  status VARCHAR,
  staff_id INTEGER REFERENCES backoffice.staff,
  customer_id UUID REFERENCES customers,
  booking_id UUID REFERENCES bookings,
  transaction_date TIMESTAMP
)

-- Transaction Items (Line items)
pos.transaction_items (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES pos.transactions,
  line_number INTEGER,
  product_id UUID,
  item_cnt INTEGER,
  unit_price_incl_vat DECIMAL,
  line_total_incl_vat DECIMAL,
  is_voided BOOLEAN DEFAULT false
)

-- Item Removals (Audit trail)
pos.item_removals (
  id UUID PRIMARY KEY,
  table_session_id UUID,
  item_id UUID,
  item_name VARCHAR,
  item_quantity INTEGER,
  item_total_price DECIMAL,
  removal_reason TEXT,
  staff_pin VARCHAR,
  removed_by VARCHAR,
  removed_at TIMESTAMP
)
```

---

## Key Features & Workflows

### 1. Table Opening Workflow
```
1. Staff selects available table
2. System shows booking selector
3. Staff selects booking or "Walk-in"
4. Staff enters pax count if needed
5. System creates table_session record
6. Table status changes to "occupied"
7. Staff redirected to POS interface
```

### 2. Order Creation Workflow
```
1. Staff browses products by category
2. Products added to "Current Order"
3. Staff reviews and confirms order
4. System creates pos.orders record
5. Items saved to pos.order_items
6. Order moves to "Running Tab"
7. Table session total updated
```

### 3. Payment Processing Workflow
```
1. Staff initiates payment from occupied table
2. System shows payment method selection
3. Staff selects method(s) and amounts
4. Staff enters PIN for authorization
5. System creates transaction records
6. Receipt number generated
7. Table session marked as "paid"
8. Optional: Print receipt
```

### 4. Item Removal Workflow
```
1. Staff selects item from Running Tab
2. System shows removal modal
3. Staff enters quantity to remove
4. Staff provides reason and PIN
5. System creates audit record
6. Order totals recalculated
7. Animation confirms removal
```

---

## Security & Authentication

### Staff Authentication System
- **PIN-based**: 6-digit PIN verification
- **bcrypt hashing**: Secure password storage
- **Session management**: 8-hour persistent sessions
- **Rate limiting**: Protection against brute force
- **Audit trails**: All actions logged with staff ID

### API Security
- **NextAuth integration**: Session-based authentication
- **Staff verification**: PIN required for sensitive operations
- **Input validation**: TypeScript + runtime validation
- **SQL injection prevention**: Parameterized queries
- **CORS protection**: Same-origin policy enforced

### Data Security
- **Foreign key constraints**: Data integrity
- **Row-level security**: Supabase RLS policies
- **Audit logging**: Complete transaction history
- **No sensitive data exposure**: PINs never returned

---

## Mobile Optimization

### Responsive Design
- **Breakpoints**: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
- **Touch targets**: Minimum 44x44px
- **Grid adaptation**: 2 columns (mobile) to 6 columns (desktop)
- **Font scaling**: Readable on all devices

### Mobile-Specific Features
- **Full-screen views**: Product/Order switching
- **Bottom navigation**: Quick access controls
- **Swipe gestures**: Category navigation (planned)
- **Animated transitions**: Smooth view changes
- **Virtual keyboard**: Optimized input fields

### Performance
- **Lazy loading**: Products load on demand
- **Virtual scrolling**: Handle 1000+ products
- **Image optimization**: Next.js Image component
- **Code splitting**: Route-based splitting
- **Minimal bundle**: ~300KB initial load

---

## Performance Considerations

### Optimizations Implemented
1. **Staff ID caching**: 5-minute TTL reduces database queries
2. **Batch operations**: Payment methods mapped in single query
3. **Virtual scrolling**: LazyProductGrid for large catalogs
4. **No-cache headers**: Real-time table status updates
5. **Indexed queries**: Optimized database indexes

### Performance Metrics
- **Initial load**: ~2-3 seconds
- **Product search**: <300ms response
- **Payment processing**: ~1-2 seconds
- **Table refresh**: <500ms
- **Memory usage**: Stable over 8-hour sessions

---

## Not Yet Implemented Features

### 1. ❌ Discount System
**Current Status**: No discount functionality exists

**Missing Components**:
- Discount application UI
- Percentage/fixed amount calculations
- Coupon/voucher system
- Manager authorization
- Discount tracking in transactions

**Database Impact**: 
- `discount_amount` columns exist but unused
- No discount rules table
- No coupon management system

**Implementation Estimate**: 1-2 weeks

### 2. ❌ Void/Refund System
**Current Status**: Backend method exists, no UI integration

**Implemented**:
```typescript
transactionService.voidTransaction(transactionId, reason, staffPin)
```

**Missing Components**:
- Void transaction UI
- Refund workflow
- Manager authorization levels
- Partial void/refund
- Void reason categorization

**Database Ready**: 
- `is_voided`, `voided_at`, `voided_by` columns exist
- Transaction reversal logic needed

**Implementation Estimate**: 1 week

### 3. ✅ Thermal Printer Integration
**Current Status**: ✅ **FULLY IMPLEMENTED AND PRODUCTION READY**

**Implemented**:
- ✅ Receipt generation in thermal format
- ✅ ESC/POS compatible output
- ✅ Multi-platform support (Windows + Android)
- ✅ Windows printing via Python win32print
- ✅ Android Bluetooth printing via Web Bluetooth API
- ✅ Auto-detection of platform and printing method
- ✅ Bangkok timezone timestamp display
- ✅ Real staff names from database
- ✅ Actual guest count from table sessions
- ✅ Production-ready receipt formatting

**Supported Platforms**:
- **Windows**: Python win32print (desktop/laptop POS)
- **Android**: Web Bluetooth API (tablet/phone POS)
- **Hardware**: Xprinter, Epson TM-series, Star TSP-series

**API Endpoints**:
- `/api/pos/print-win32` - Windows thermal printing
- `/api/pos/print-bluetooth` - Android Bluetooth printing
- `/api/pos/receipts/preview` - Receipt preview

**Test Pages**:
- `/test-thermal` - Windows printer testing
- `/test-bluetooth` - Android Bluetooth testing

### 4. ❌ Offline Mode
**Current Status**: Complete online dependency

**Missing Components**:
- Local storage strategy
- Offline order queue
- Sync mechanism
- Conflict resolution
- Offline indicator UI
- Product catalog caching

**Technical Requirements**:
- Service Worker implementation
- IndexedDB for local storage
- Background sync API
- Conflict resolution algorithm

**Implementation Estimate**: 2-3 weeks

### 5. ⚠️ Advanced Bill Splitting
**Current Status**: Basic split by payment method works

**Implemented**:
- Split by payment method
- Multiple payment allocations
- Split payment UI

**Missing Components**:
- Item-level allocation
- Split by percentage
- Guest assignment
- Individual receipts
- Split history tracking

**Existing Code**: 
- `BillSplitModal.tsx` (not integrated)
- `ItemAllocationGrid.tsx` (not integrated)

**Implementation Estimate**: 1 week

### 6. ⚠️ Product Modifiers
**Current Status**: UI exists, system not integrated

**Implemented**:
- `ProductModifierModal.tsx` component
- Modifier data structure in types

**Missing Components**:
- Database schema for modifiers
- Price calculation logic
- Inventory tracking
- Required modifier validation
- Kitchen display integration

**Implementation Estimate**: 1-2 weeks

### 7. ❌ Inventory Management
**Current Status**: No inventory tracking

**Missing Components**:
- Stock level tracking
- Low stock alerts
- Automatic disable when out
- Stock adjustment UI
- Cost tracking (COGS)
- Supplier management

**Implementation Estimate**: 2-3 weeks

### 8. ❌ Advanced Analytics
**Current Status**: Basic summary only

**Missing Components**:
- Sales dashboards
- Staff performance
- Peak hour analysis
- Product popularity
- Customer insights
- Export functionality

**Implementation Estimate**: 2-3 weeks

### 9. ❌ Customer Loyalty
**Current Status**: Customer data exists, no loyalty features

**Missing Components**:
- Points system
- Reward redemption
- Tier management
- Purchase history
- Special pricing

**Implementation Estimate**: 2-3 weeks

### 10. ❌ Multi-Location Support
**Current Status**: Single location only

**Missing Components**:
- Location selection
- Location-specific catalogs
- Inter-location transfers
- Consolidated reporting
- Location-based staff

**Implementation Estimate**: 3-4 weeks

---

## Deployment & Configuration

### Environment Variables
```bash
# Required for POS
NEXT_PUBLIC_REFAC_SUPABASE_URL=
REFAC_SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
SKIP_AUTH=false  # Set true for development

# Optional POS settings
POS_TAX_RATE=0.07
POS_CURRENCY=THB
POS_RECEIPT_PRINTER_URL=
```

### Deployment Steps
1. Set environment variables
2. Run database migrations
3. Configure staff PINs
4. Set up zones and tables
5. Import product catalog
6. Test payment methods
7. Configure receipt templates

### Production Checklist
- [ ] Disable `SKIP_AUTH`
- [ ] Configure SSL certificates
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test all payment methods
- [ ] Train staff on workflows
- [ ] Prepare rollback plan

---

## Conclusion

The Lengolf POS system is fully operational for all core point-of-sale functions. The architecture is scalable, secure, and maintainable. Optional features can be added incrementally without disrupting operations.

**For support or questions, contact the development team.**

---

**End of Document**