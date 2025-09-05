# Vendor Notifications System

## Overview

The Vendor Notifications system automatically detects when orders contain vendor-supplied items (currently Smith & Co) and prompts staff to send LINE notifications to the vendor. This streamlines the ordering process and ensures vendors receive timely notifications with proper order numbering.

## How It Works

### Order Detection
When staff confirm an order in the POS system:
1. System automatically checks if any items have vendor SKU mappings
2. Items with SKU numbers containing "lengolf" are identified as Smith & Co items
3. If vendor items are found, a notification modal appears
4. If no vendor items are found, the order completes normally

### Vendor Item Identification
**Smith & Co items are identified by:**
- Having a SKU number in the `pos.lengolf_sales` table
- SKU number contains "lengolf" (case-insensitive)
- SKU number is not empty, "-", or placeholder values

**Current Smith & Co Products:**
- BBQ Brisket Sando, Sliders, Roll
- Classic Cheese Burger, Signature Smash Burger
- Calamari
- French Fries, Sweet Potato Fries (all variations)
- Pulled Pork Sando, Shrimp Ebiko Sando
- Crispy Chicken Sliders, Beef Steak Sliders
- Various sides: Bacon, Hash Brown, Mixed Salad, etc.

## User Interface

### Vendor Notification Modal
When vendor items are detected, a modal appears with:

**Order Items Section:**
- Lists all vendor items with quantities
- Input fields for special instructions per item
- Notes automatically update the message preview

**Editable Message Section:**
- Shows LINE message with Bangkok timezone timestamp
- Displays daily order number (resets each day)
- Fully editable textarea for custom messaging
- "Reset to Auto" button if manually edited

**Message Format:**
```
15:30 LENGOLF Order 1:
1 Calamari (no sauce)
2 Classic Cheese Burger
```

### Daily Order Numbering
- Order numbers reset daily at Bangkok midnight (Asia/Bangkok timezone)
- Each vendor has independent numbering: Order 1, 2, 3, etc.
- Numbers are assigned when notification is sent (not when modal opens)

## Staff Workflow

### Normal Orders (No Vendor Items)
1. Add items to order (drinks, non-vendor food, etc.)
2. Click "Confirm Order"
3. ✅ Order confirmed → Returns to table management

### Vendor Orders
1. Add Smith & Co items to order
2. Click "Confirm Order" 
3. ✅ Order confirmed → Vendor notification modal appears
4. **Review items** and add special instructions if needed
5. **Edit message** if custom wording required
6. Click "Send to Smith & Co"
7. ✅ LINE notification sent → Returns to table management

### Message Customization
- **Auto-generated message** updates when item notes change
- **Manual editing** locks message (prevents auto-updates)
- **Reset to Auto** button restores auto-generated format
- **Bangkok timezone** ensures accurate local timestamps

## Technical Implementation

### Database Schema

**Vendor Orders Tracking (`pos.vendor_orders`):**
```sql
CREATE TABLE pos.vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor VARCHAR(100) NOT NULL,
  daily_order_number INTEGER NOT NULL,
  order_date DATE NOT NULL,           -- Bangkok timezone date
  original_order_id UUID REFERENCES pos.orders(id),
  line_message_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  items JSONB NOT NULL,               -- Item details and notes
  staff_name VARCHAR(255),
  UNIQUE(vendor, order_date, daily_order_number)
);
```

**Detection Logic:**
```sql
-- Items with meaningful SKU mappings are vendor items
SELECT product_id, product_name FROM order_items oi
JOIN pos.lengolf_sales ls ON oi.product_id = ls.product_id  
WHERE ls.sku_number LIKE '%lengolf%'
  AND ls.sku_number != '' 
  AND ls.sku_number != '-';
```

### API Endpoints

**Get Next Order Number:**
```http
POST /api/pos/vendor-order-number
Content-Type: application/json

{
  "vendor": "Smith & Co"
}

Response: {
  "success": true,
  "vendor": "Smith & Co", 
  "nextOrderNumber": 3
}
```

**Send Vendor Notification:**
```http
POST /api/pos/vendor-notifications
Content-Type: application/json

{
  "orderId": "uuid",
  "vendorItems": [{
    "vendor": "Smith & Co",
    "items": [
      {
        "productId": "uuid",
        "productName": "Calamari", 
        "quantity": 1,
        "notes": "no sauce"
      }
    ]
  }],
  "customMessage": "Optional custom message text"
}
```

### LINE Integration

**Requirements:**
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Messaging API token
- `LINE_GROUP_SMITH_CO_ID` - Target group ID for Smith & Co

**Message Delivery:**
- Uses LINE Messaging API push messages
- Sent to vendor-specific groups
- Automatic delivery status tracking
- Error handling with user notifications

## Configuration

### Environment Variables
```bash
# Required for LINE integration
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_GROUP_SMITH_CO_ID=your_group_id
```

### Adding New Vendors
1. **Database:** Add vendor-specific group ID environment variable
2. **Code:** Update `sendVendorNotification()` switch statement
3. **SKU Mapping:** Ensure products have proper SKU mappings
4. **Testing:** Verify detection and notification flow

### Timezone Configuration
- System uses **Asia/Bangkok** timezone for all operations
- Daily order numbering resets at Bangkok midnight
- LINE message timestamps show Bangkok time
- Database `order_date` stores Bangkok dates

## Monitoring & Troubleshooting

### Logging
The system provides detailed console logging:
```
🕐 Bangkok date for order numbering: 2025-01-15
🔢 Next order number for Smith & Co on 2025-01-15: 3
💾 Saved vendor order for Smith & Co on 2025-01-15 - Order #3
🔍 Products with SKU mappings: ["product-id-1", "product-id-2"]
```

### Common Issues

**Modal doesn't appear for vendor items:**
- Check if product has proper SKU mapping in `pos.lengolf_sales`
- Verify SKU contains "lengolf" and isn't "-" or empty
- Review browser console for detection logs

**Wrong timezone/order numbers:**
- Verify server timezone configuration
- Check Bangkok timezone calculation in logs
- Confirm `order_date` uses Bangkok date

**LINE delivery failures:**
- Verify `LINE_CHANNEL_ACCESS_TOKEN` and group IDs
- Check LINE API quotas and permissions
- Review network connectivity to LINE servers

### Database Queries

**Check vendor orders:**
```sql
SELECT vendor, daily_order_number, order_date, 
       line_message_sent, items::jsonb 
FROM pos.vendor_orders 
ORDER BY created_at DESC LIMIT 10;
```

**Verify SKU mappings:**
```sql
SELECT p.name, ls.sku_number 
FROM products.products p 
JOIN pos.lengolf_sales ls ON p.id = ls.product_id 
WHERE ls.sku_number LIKE '%lengolf%'
ORDER BY p.name;
```

## Security Considerations

- LINE tokens stored as environment variables only
- Staff authentication required for all operations
- Vendor-specific group permissions enforced
- Audit trail maintained in database
- No sensitive data in LINE messages

## Future Enhancements

### Planned Features
- **Multi-vendor support** - Additional vendors beyond Smith & Co
- **Message templates** - Predefined message formats per vendor
- **Delivery confirmation** - Two-way LINE integration
- **Analytics dashboard** - Vendor order statistics and trends
- **Automated scheduling** - Time-based delivery preferences

### Technical Improvements
- **Webhook integration** - LINE delivery status callbacks
- **Retry mechanisms** - Automatic retry for failed deliveries
- **Message queuing** - Handle high-volume periods
- **Mobile optimization** - Enhanced tablet/mobile interface

---

## Quick Reference

**Staff Actions:**
- Add vendor items → Confirm order → Review modal → Send notification
- Edit message before sending if needed
- Check daily order numbers reset each day

**Admin Actions:**  
- Monitor vendor orders in database
- Configure new vendor groups via environment variables
- Review LINE API usage and delivery status

**Developer Actions:**
- Check console logs for debugging
- Verify SKU mappings for new products
- Test timezone calculations for order numbering

---

*Last Updated: January 2025 | Version: 1.0.0*