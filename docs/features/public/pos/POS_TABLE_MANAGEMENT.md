# POS Table Management System

## Overview

The Table Management System provides comprehensive restaurant table and zone management with real-time status tracking, session management, and order coordination. Built for high-traffic restaurant environments with robust state synchronization.

## Architecture

### Core Components

**Main Interface:**
- `TableManagementDashboard.tsx` - Primary management interface with real-time updates
- `ZoneSection.tsx` - Zone-based table organization with visual theming
- `TableDetailModal.tsx` - Individual table session management
- `OccupiedTableDetailsPanel.tsx` - Active session details and controls

**State Management:**
- `TableSessionService.ts` - Session lifecycle management
- `useTableManagement.ts` - React hook for table operations
- Real-time WebSocket integration for status updates

### Database Schema

**Core Tables:**
```sql
-- Zone management
pos.zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color_theme VARCHAR(20),
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true
);

-- Table configuration  
pos.tables (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES pos.zones(id),
  table_number VARCHAR(10) NOT NULL,
  capacity INTEGER DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available',
  x_position REAL,
  y_position REAL,
  is_active BOOLEAN DEFAULT true
);

-- Active sessions
pos.table_sessions (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES pos.tables(id),
  staff_id INTEGER REFERENCES staff(id),
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active'
);
```

## API Reference

### Table Operations

**Get All Tables with Status**
```http
GET /api/pos/tables
```

**Response:**
```json
{
  "zones": [
    {
      "id": 1,
      "name": "Main Dining",
      "color_theme": "blue",
      "tables": [
        {
          "id": 1,
          "table_number": "T01",
          "capacity": 4,
          "status": "occupied",
          "current_session": {
            "id": 123,
            "staff_name": "John Doe",
            "opened_at": "2024-01-15T10:30:00Z",
            "order_count": 2,
            "total_amount": 450.00
          }
        }
      ]
    }
  ]
}
```

**Open Table Session**
```http
POST /api/pos/tables/[tableId]/open
Content-Type: application/json

{
  "staff_pin": "1234",
  "notes": "VIP guests"
}
```

**Close Table Session**
```http
POST /api/pos/tables/[tableId]/close
Content-Type: application/json

{
  "staff_pin": "1234",
  "payment_completed": true
}
```

**Transfer Orders Between Tables**
```http
POST /api/pos/tables/transfer
Content-Type: application/json

{
  "from_table_id": 1,
  "to_table_id": 2,
  "staff_pin": "1234",
  "order_ids": [123, 124]
}
```

## Component Implementation

### TableManagementDashboard

**Features:**
- Real-time table status updates via WebSocket
- Zone-based filtering and navigation
- Touch-optimized interface for tablet POS
- Comprehensive session statistics

**Key Functions:**
```typescript
// Real-time status updates
const { tables, zones, refreshTables } = useTableManagement();

// Handle table selection
const handleTableSelect = (tableId: number) => {
  setSelectedTable(tableId);
  setShowTableDetail(true);
};

// Open new session
const handleOpenTable = async (tableId: number, staffPin: string) => {
  const result = await openTableSession(tableId, staffPin);
  if (result.success) {
    refreshTables();
    toast.success('Table opened successfully');
  }
};
```

### ZoneSection Component

**Visual Organization:**
- Color-coded zones for quick identification
- Drag-and-drop table layout (future enhancement)
- Responsive grid layout adapting to screen size

**Status Indicators:**
- 🟢 Available - Ready for seating
- 🔴 Occupied - Active session with orders
- 🟡 Reserved - Held for specific time/customer
- ⚫ Maintenance - Out of service

## Session Management

### Session Lifecycle

1. **Opening Session**
   - Staff PIN verification required
   - Automatic timestamp recording
   - Status change to 'occupied'
   - Optional customer assignment

2. **Active Session**
   - Real-time order tracking
   - Running total calculations
   - Staff activity logging
   - Time tracking for service metrics

3. **Closing Session**
   - Payment verification required
   - Final total calculation
   - Status change to 'available'
   - Session archival

### Session Data Model

```typescript
interface TableSession {
  id: number;
  table_id: number;
  staff_id: number;
  opened_at: string;
  closed_at?: string;
  total_amount: number;
  status: 'active' | 'closing' | 'closed';
  orders: Order[];
  customer_id?: number;
  notes?: string;
}
```

## Real-Time Features

### WebSocket Integration

**Connection Management:**
```typescript
// Establish WebSocket connection
const ws = new WebSocket(`${wsUrl}/pos/tables`);

// Handle table status updates
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateTableStatus(update.table_id, update.status);
};

// Broadcast status changes
const broadcastTableUpdate = (tableId: number, status: string) => {
  ws.send(JSON.stringify({
    type: 'table_update',
    table_id: tableId,
    status: status,
    timestamp: new Date().toISOString()
  }));
};
```

### Status Synchronization

- Automatic status updates across all connected clients
- Conflict resolution for simultaneous operations
- Offline capability with sync on reconnection

## Mobile Optimization

### Responsive Design

**Breakpoints:**
- Mobile: 320px - 767px (single column layout)
- Tablet: 768px - 1023px (2-3 column grid)
- Desktop: 1024px+ (full grid layout)

**Touch Interface:**
- Minimum 44px touch targets
- Swipe gestures for navigation
- Long-press for additional options
- Haptic feedback on supported devices

### Progressive Web App Features

- Offline table status caching
- Background sync for status updates
- Push notifications for urgent table events
- Home screen installation prompt

## Security & Authorization

### Staff Authentication

**PIN-Based Access:**
- Secure PIN verification for all table operations
- Session timeout after inactivity
- Audit trail for all table actions

**Authorization Levels:**
```typescript
// Staff permissions
interface StaffPermissions {
  can_open_tables: boolean;
  can_close_tables: boolean;
  can_transfer_orders: boolean;
  can_override_status: boolean;
  max_concurrent_sessions: number;
}
```

### Audit Trail

**Logged Events:**
- Table opening/closing with staff identification
- Order transfers between tables
- Status overrides and manual adjustments
- Payment completion timestamps

## Performance Optimization

### Caching Strategy

- Table configuration cached locally
- Zone layouts stored in browser storage
- Real-time status updates via efficient WebSocket protocol
- Lazy loading of historical session data

### Database Optimization

**Indexes:**
```sql
-- Performance indexes
CREATE INDEX idx_tables_zone_status ON pos.tables(zone_id, status);
CREATE INDEX idx_sessions_active ON pos.table_sessions(status) WHERE status = 'active';
CREATE INDEX idx_sessions_table_time ON pos.table_sessions(table_id, opened_at);
```

## Troubleshooting

### Common Issues

**Tables Not Updating in Real-Time:**
1. Check WebSocket connection status
2. Verify browser WebSocket support
3. Check network connectivity
4. Review server WebSocket configuration

**Session Opening Failures:**
1. Verify staff PIN is correct
2. Check table availability status
3. Review database connection
4. Confirm staff permissions

**Status Synchronization Issues:**
1. Clear browser cache and localStorage
2. Refresh WebSocket connection
3. Check for database lock conflicts
4. Review concurrent session limits

### Debug Commands

```typescript
// Debug table status in browser console
console.log('Table Status:', await fetch('/api/pos/tables').then(r => r.json()));

// Check WebSocket connection
console.log('WebSocket State:', ws.readyState);

// Verify staff permissions
console.log('Staff Permissions:', await fetch('/api/staff/permissions').then(r => r.json()));
```

## Integration Points

### Order Management System
- Automatic order creation when table is occupied
- Order status updates reflect in table management
- Seamless transition between table and order views

### Payment Processing
- Table closure triggers payment interface
- Payment completion updates table status
- Integration with receipt generation system

### Customer Management
- Optional customer assignment to table sessions
- Loyalty program integration
- Previous visit history display

## Future Enhancements

### Planned Features
- **Visual Table Layout Editor** - Drag-and-drop table positioning
- **Advanced Reservations** - Time-based table reservations
- **Waitlist Management** - Queue management for busy periods
- **Analytics Dashboard** - Table turnover and efficiency metrics

### Technical Improvements
- **GraphQL Integration** - More efficient real-time updates
- **Enhanced Offline Mode** - Full offline operation capability
- **Advanced Caching** - Predictive pre-loading of session data
- **AI-Powered Insights** - Table assignment optimization

## Related Documentation

- [POS Order Management](./POS_ORDER_MANAGEMENT.md) - Managing orders within table sessions
- [POS Staff Authentication](./POS_STAFF_AUTHENTICATION.md) - PIN verification system
- [POS Payment Processing](./POS_PAYMENT_PROCESSING.md) - Payment handling for table sessions
- [POS API Reference](./POS_API_REFERENCE.md) - Complete API documentation

---

*Last Updated: January 2025 | Version: 2.1.0*