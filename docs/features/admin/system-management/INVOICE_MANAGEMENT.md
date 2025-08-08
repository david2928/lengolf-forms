# Invoice Management System

## Overview

A professional invoicing system integrated into the LENGOLF admin panel for generating invoices with suppliers. Features PDF generation, supplier management, and withholding tax (WHT) calculations.

## Core Features

- **Invoice Generation**: Create invoices with automatic numbering and PDF export
- **Supplier Management**: CRUD operations for supplier information with defaults
- **PDF Export**: Professional PDF invoices with company branding
- **Multi-Item Support**: Multiple line items with automatic calculations
- **Withholding Tax**: Automatic WHT calculations (default 3%)
- **Invoice History**: Search and browse generated invoices
- **Settings Management**: Configure company information and tax rates

## System Architecture

### Frontend Structure
- **Main Page**: `app/admin/invoices/page.tsx` - Tab-based interface
- **Components**: 
  - `src/components/admin/invoices/create-invoice-tab.tsx` - Invoice creation
  - `src/components/admin/invoices/suppliers-tab.tsx` - Supplier management
  - `src/components/admin/invoices/invoice-history-tab.tsx` - History browser
  - `src/components/admin/invoices/settings-tab.tsx` - Configuration

### API Endpoints

| Endpoint | Method | Purpose |
|----------|---------|---------|
| `/api/admin/invoices` | GET | Fetch invoice history |
| `/api/admin/invoices/generate` | POST | Generate new invoice with PDF |
| `/api/admin/invoices/suppliers` | GET/POST/PUT/DELETE | Supplier operations |
| `/api/admin/invoices/settings` | GET/POST | Settings management |
| `/api/admin/invoices/[id]/download` | GET | Download PDF |

### Database Schema (backoffice)

**invoices**
- id, invoice_number (unique), supplier_id, invoice_date
- subtotal, tax_rate, tax_amount, total_amount
- pdf_file_path, created_by, created_at, updated_at

**invoice_suppliers**
- id, name, address_line1, address_line2, tax_id (unique)
- default_description, default_unit_price
- bank_name, bank_account

**invoice_items**
- id, invoice_id, description, quantity, unit_price, line_total

**invoice_settings** 
- key, value (key-value configuration store)

## Key Workflows

### Invoice Creation
1. Select supplier from dropdown
2. Add line items with descriptions, quantities, prices
3. System calculates subtotal, WHT (3%), and final total
4. Generate PDF and store in database
5. Download generated PDF

### Supplier Management
- Add/edit suppliers with address and tax information
- Set default description and unit price for quick invoice creation
- Unique tax ID validation
- Delete protection (cannot delete suppliers with invoices)

### Business Logic

**Tax Calculation (WHT)**:
```typescript
const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
const tax_amount = subtotal * (tax_rate / 100)  // Default 3%
const total = subtotal - tax_amount  // WHT deducted from subtotal
```

**Invoice Numbering**: Auto-generated YYYYMM format (e.g., "202501")

## PDF Generation

Uses `src/lib/pdf-generator.ts` to create professional invoices with:
- Company header and branding
- Supplier billing information  
- Itemized services/products table
- Tax calculations and totals
- Professional styling

## Configuration

### Settings (invoice_settings table)
- `default_wht_rate`: Withholding tax percentage
- `lengolf_name`: Company name
- `lengolf_address_line1`, `lengolf_address_line2`: Company address
- `lengolf_tax_id`: Company tax ID

## Security & Access

- **Admin Only**: All endpoints require admin authentication
- **Session Validation**: Server-side session checks
- **Input Validation**: Sanitized inputs and business rule validation
- **RLS Policies**: Row-level security on all invoice tables

## Current Limitations

- **No Manual Status Updates**: Invoices don't track sent/paid status
- **No Email Integration**: PDFs must be manually sent
- **Single Currency**: Thai Baht only
- **No Recurring Invoices**: One-time generation only

## Related Documentation

- **[Admin Panel](./ADMIN_PANEL.md)** - Admin panel architecture
- **[API Reference](../api/API_REFERENCE.md)** - Complete API documentation
- **[Authentication System](../technical/AUTHENTICATION_SYSTEM.md)** - Security implementation

---

**Status**: ✅ Fully Implemented  
**Last Updated**: January 2025 