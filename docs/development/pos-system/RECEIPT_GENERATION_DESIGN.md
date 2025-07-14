# Receipt Generation System Design

## Table of Contents
1. [Overview](#overview)
2. [Receipt Types and Formats](#receipt-types-and-formats)
3. [Template System](#template-system)
4. [Printer Integration](#printer-integration)
5. [Digital Receipt Options](#digital-receipt-options)
6. [Data Requirements](#data-requirements)
7. [Localization Support](#localization-support)
8. [Error Handling](#error-handling)
9. [Performance Optimization](#performance-optimization)
10. [Implementation Details](#implementation-details)

## Overview

The Receipt Generation System provides comprehensive receipt printing and digital delivery capabilities for the POS system. It supports multiple receipt types, thermal printer integration, digital delivery options, and maintains compliance with Thai tax regulations while providing flexibility for various business scenarios.

### Key Features
- **Multi-format Support**: Thermal, standard paper, and digital receipts
- **Template Flexibility**: Customizable receipt layouts and branding
- **Tax Compliance**: Thai VAT and receipt format compliance
- **Digital Delivery**: Email, SMS, and QR code receipt options
- **Multi-language**: Thai and English receipt support
- **Reprint Capability**: Historical receipt regeneration
- **Brand Customization**: Logo, colors, and layout customization

### Business Requirements
Based on current operations and regulatory requirements:
- **Thai Tax Compliance**: Proper VAT display and receipt numbering
- **Thermal Printing**: Integration with POS thermal printers
- **Customer Options**: Choice between printed and digital receipts
- **Staff Efficiency**: Fast printing with error recovery
- **Audit Support**: Complete receipt history and reprinting

## Receipt Types and Formats

### Primary Receipt Types

#### 1. Sales Receipt (Standard Transaction)
```
═══════════════════════════════════════
              LENGOLF
         Golf Simulator & Lounge
        123 Example Street, Bangkok
           Tel: +66-2-xxx-xxxx
═══════════════════════════════════════

Date: 14/07/2025 14:30:25
Table: Bay 2
Staff: John Doe
Customer: Member #1234

Receipt #: INV-2025-001234
Tax ID: 0123456789012

───────────────────────────────────────
ITEMS:
───────────────────────────────────────
1x Bay Rental (1 Hour)        ฿500.00
2x Chang Beer                  ฿160.00
1x Chicken Wings               ฿180.00
1x Golf Ball Set               ฿300.00

───────────────────────────────────────
Subtotal:                    ฿1,140.00
VAT (7%):                      ฿79.80
───────────────────────────────────────
TOTAL:                       ฿1,219.80

Payment Method: Visa
Card: ****1234
Auth Code: 123456

Thank you for visiting Lengolf!
Visit us online: www.lengolf.com

VAT Reg: 0123456789012
═══════════════════════════════════════
```

#### 2. Void Receipt
```
═══════════════════════════════════════
              LENGOLF
         Golf Simulator & Lounge
═══════════════════════════════════════

        *** VOID RECEIPT ***

Original Receipt: INV-2025-001234
Void Date: 14/07/2025 15:45:12
Void By: Manager Jane Smith
Reason: Customer Request

Original Amount: ฿1,219.80
Refund Method: Visa ****1234

This transaction has been cancelled.
═══════════════════════════════════════
```

#### 3. Refund Receipt
```
═══════════════════════════════════════
              LENGOLF
         Golf Simulator & Lounge
═══════════════════════════════════════

        *** REFUND RECEIPT ***

Refund Receipt #: REF-2025-000123
Original Receipt: INV-2025-001234
Date: 14/07/2025 16:00:00

REFUNDED ITEMS:
───────────────────────────────────────
1x Chicken Wings               ฿180.00

───────────────────────────────────────
Refund Subtotal:               ฿168.22
VAT Refund:                     ฿11.78
───────────────────────────────────────
TOTAL REFUND:                  ฿180.00

Refund Method: Original Card
Processing Fee: ฿0.00

Processed By: Manager Jane Smith
═══════════════════════════════════════
```

### Receipt Format Specifications

#### Thai Tax Receipt Requirements
```typescript
interface ThaiTaxReceiptRequirements {
  businessName: string;
  businessAddress: string;
  taxId: string; // 13-digit tax registration number
  receiptNumber: string; // Sequential numbering
  issuedDate: Date;
  vatRegistration: string;
  
  // Required for VAT receipts > 2,000 THB
  customerName?: string;
  customerTaxId?: string;
  customerAddress?: string;
  
  // VAT breakdown
  vatableAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatRate: number; // 7% standard rate
}
```

## Template System

### Template Architecture

```typescript
interface ReceiptTemplate {
  id: string;
  name: string;
  type: 'sales' | 'void' | 'refund' | 'report';
  format: 'thermal_58mm' | 'thermal_80mm' | 'a4' | 'digital';
  sections: ReceiptSection[];
  styles: ReceiptStyles;
  localization: LocalizationConfig;
}

interface ReceiptSection {
  id: string;
  type: 'header' | 'items' | 'totals' | 'payment' | 'footer';
  template: string; // Handlebars template
  conditional?: string; // Show condition
  order: number;
}

interface ReceiptStyles {
  font: {
    family: string;
    size: {
      small: number;
      normal: number;
      large: number;
    };
  };
  spacing: {
    line: number;
    section: number;
  };
  alignment: {
    header: 'left' | 'center' | 'right';
    items: 'left' | 'right';
    totals: 'left' | 'right';
  };
  formatting: {
    currency: string;
    dateFormat: string;
    numberFormat: string;
  };
}
```

### Template Engine Implementation

```typescript
class ReceiptTemplateEngine {
  private handlebars: typeof Handlebars;
  private templates: Map<string, CompiledTemplate>;
  
  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
    this.templates = new Map();
  }
  
  private registerHelpers(): void {
    // Currency formatting helper
    this.handlebars.registerHelper('currency', (amount: number) => {
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
      }).format(amount);
    });
    
    // Date formatting helper
    this.handlebars.registerHelper('date', (date: Date, format: string) => {
      return moment(date).format(format);
    });
    
    // Thai language helper
    this.handlebars.registerHelper('thai', (text: string, context: any) => {
      return context.data.root.locale === 'th' ? 
        this.getThaiTranslation(text) : text;
    });
    
    // Alignment helper for thermal printing
    this.handlebars.registerHelper('align', (text: string, width: number, alignment: string) => {
      return this.alignText(text, width, alignment);
    });
  }
  
  async generateReceipt(
    templateId: string,
    data: ReceiptData,
    options: GenerationOptions = {}
  ): Promise<GeneratedReceipt> {
    const template = await this.getTemplate(templateId);
    const context = this.prepareContext(data, options);
    
    const content = template(context);
    
    return {
      content,
      format: template.format,
      metadata: {
        templateId,
        generatedAt: new Date(),
        dataHash: this.hashData(data)
      }
    };
  }
}
```

### Pre-built Templates

#### Thermal 58mm Template
```handlebars
{{align "LENGOLF" 32 "center"}}
{{align "Golf Simulator & Lounge" 32 "center"}}
{{align business.address 32 "center"}}
{{align business.phone 32 "center"}}
{{repeat "=" 32}}

Date: {{date timestamp "DD/MM/YYYY HH:mm:ss"}}
{{#if table}}Table: {{table}}{{/if}}
Staff: {{staff.name}}
{{#if customer}}Customer: {{customer.name}}{{/if}}

Receipt #: {{receiptNumber}}
{{#if business.taxId}}Tax ID: {{business.taxId}}{{/if}}

{{repeat "-" 32}}
ITEMS:
{{repeat "-" 32}}
{{#each items}}
{{align (concat quantity "x " name) 20 "left"}}{{align (currency total) 12 "right"}}
{{#if notes}}  Note: {{notes}}{{/if}}
{{/each}}

{{repeat "-" 32}}
{{align "Subtotal:" 20 "left"}}{{align (currency subtotal) 12 "right"}}
{{align (concat "VAT (" vatRate "%):") 20 "left"}}{{align (currency vatAmount) 12 "right"}}
{{repeat "-" 32}}
{{align "TOTAL:" 20 "left"}}{{align (currency total) 12 "right"}}

{{#if payment}}
Payment Method: {{payment.method}}
{{#if payment.card}}Card: {{payment.card.maskedNumber}}{{/if}}
{{#if payment.authCode}}Auth Code: {{payment.authCode}}{{/if}}
{{/if}}

{{#if footer}}
{{align footer.message 32 "center"}}
{{#if footer.website}}{{align footer.website 32 "center"}}{{/if}}
{{/if}}

{{#if business.vatReg}}VAT Reg: {{business.vatReg}}{{/if}}
{{repeat "=" 32}}
```

## Printer Integration

### Thermal Printer Support

```typescript
interface ThermalPrinter {
  id: string;
  name: string;
  type: 'epson' | 'star' | 'citizen';
  connection: 'usb' | 'network' | 'bluetooth';
  paperWidth: 58 | 80; // mm
  capabilities: PrinterCapabilities;
  settings: PrinterSettings;
}

class ThermalPrinterManager {
  async print(
    printerId: string,
    content: string,
    options: PrintOptions = {}
  ): Promise<PrintResult> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }
    
    try {
      // Convert content to printer commands
      const commands = await this.generatePrinterCommands(content, printer);
      
      // Send to printer
      const result = await this.sendToPrinter(printer, commands, options);
      
      // Open cash drawer if requested
      if (options.openCashDrawer && printer.capabilities.supportsCashDrawer) {
        await this.openCashDrawer(printer);
      }
      
      return {
        success: true,
        printerId,
        timestamp: new Date(),
        jobId: result.jobId
      };
    } catch (error) {
      return {
        success: false,
        printerId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
```

## Digital Receipt Options

### Email Receipt System

```typescript
class EmailReceiptService {
  async sendEmailReceipt(
    email: string,
    receiptData: ReceiptData,
    options: EmailReceiptOptions = {}
  ): Promise<EmailResult> {
    try {
      // Generate receipt content
      const receipt = await this.generateEmailReceipt(receiptData, options);
      
      // Create email message
      const message = {
        to: email,
        subject: this.getEmailSubject(receiptData),
        html: receipt.htmlContent,
        attachments: receipt.attachments
      };
      
      // Send email
      const result = await this.emailService.send(message);
      
      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
```

### QR Code Receipt Access

```typescript
class QRCodeReceiptService {
  async generateReceiptQR(receiptNumber: string): Promise<QRCodeResult> {
    // Create secure receipt access URL
    const accessToken = await this.generateReceiptAccessToken(receiptNumber);
    const receiptUrl = `${this.baseUrl}/receipt/${receiptNumber}?token=${accessToken}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(receiptUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return {
      qrCodeData: qrCode,
      accessUrl: receiptUrl,
      expiresAt: moment().add(30, 'days').toDate()
    };
  }
}
```

## Data Requirements

### Receipt Data Model

```typescript
interface ReceiptData {
  // Transaction information
  receiptNumber: string;
  transactionId: string;
  timestamp: Date;
  type: 'sale' | 'void' | 'refund' | 'report';
  
  // Business information
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    taxId: string;
    vatRegistration: string;
    logo?: string;
  };
  
  // Location and staff
  location?: {
    table: string;
    zone: string;
  };
  staff: {
    id: string;
    name: string;
    pin?: string;
  };
  
  // Customer information
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    taxId?: string;
    address?: string;
  };
  
  // Order items
  items: ReceiptItem[];
  
  // Financial calculations
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  discount?: {
    amount: number;
    reason: string;
    appliedBy: string;
  };
  total: number;
  
  // Payment information
  payment: {
    method: string;
    amount: number;
    change?: number;
    card?: {
      type: string;
      maskedNumber: string;
      authCode: string;
    };
    reference?: string;
  };
  
  // Additional metadata
  notes?: string;
  originalReceiptNumber?: string; // For voids/refunds
  voidReason?: string;
  refundReason?: string;
}
```

### Database Schema

```sql
-- Receipt generation log
CREATE TABLE pos.receipt_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) NOT NULL,
    transaction_id UUID NOT NULL,
    receipt_type VARCHAR(20) NOT NULL,
    format VARCHAR(20) NOT NULL,
    
    -- Generation details
    template_id VARCHAR(50),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by_staff_id UUID REFERENCES backoffice.staff(id),
    
    -- Content and metadata
    receipt_data JSONB NOT NULL,
    generated_content TEXT,
    content_hash VARCHAR(64),
    
    -- Delivery tracking
    print_status VARCHAR(20) DEFAULT 'pending',
    printer_id VARCHAR(50),
    printed_at TIMESTAMPTZ,
    
    email_status VARCHAR(20) DEFAULT 'not_requested',
    email_address VARCHAR(200),
    emailed_at TIMESTAMPTZ,
    
    sms_status VARCHAR(20) DEFAULT 'not_requested',
    sms_number VARCHAR(20),
    sms_sent_at TIMESTAMPTZ,
    
    -- Error tracking
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Localization Support

### Multi-language Templates

```typescript
class ReceiptLocalizationService {
  private translations = {
    en: {
      'receipt.title': 'RECEIPT',
      'receipt.date': 'Date',
      'receipt.table': 'Table',
      'receipt.staff': 'Staff',
      'receipt.customer': 'Customer',
      'receipt.items': 'ITEMS',
      'receipt.subtotal': 'Subtotal',
      'receipt.vat': 'VAT',
      'receipt.total': 'TOTAL',
      'receipt.payment_method': 'Payment Method',
      'receipt.thank_you': 'Thank you for visiting!',
    },
    th: {
      'receipt.title': 'ใบเสร็จรับเงิน',
      'receipt.date': 'วันที่',
      'receipt.table': 'โต๊ะ',
      'receipt.staff': 'พนักงาน',
      'receipt.customer': 'ลูกค้า',
      'receipt.items': 'รายการ',
      'receipt.subtotal': 'ยอดรวม',
      'receipt.vat': 'ภาษีมูลค่าเพิ่ม',
      'receipt.total': 'รวมทั้งสิ้น',
      'receipt.payment_method': 'วิธีการชำระเงิน',
      'receipt.thank_you': 'ขอบคุณที่ใช้บริการ!',
    }
  };
  
  translate(key: string, locale: string = 'en'): string {
    return this.translations[locale]?.[key] || this.translations.en[key] || key;
  }
  
  formatCurrency(amount: number, locale: string = 'en'): string {
    const options = locale === 'th' ? 
      { style: 'currency', currency: 'THB', locale: 'th-TH' } :
      { style: 'currency', currency: 'THB', locale: 'en-US' };
      
    return new Intl.NumberFormat(locale, options).format(amount);
  }
}
```

## Performance Optimization

### Caching Strategy

```typescript
class ReceiptCacheManager {
  private templateCache = new Map<string, CompiledTemplate>();
  private contentCache = new LRUCache<string, string>({ max: 1000 });
  
  async getCachedTemplate(templateId: string): Promise<CompiledTemplate> {
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }
    
    const template = await this.loadTemplate(templateId);
    const compiled = this.compileTemplate(template);
    
    this.templateCache.set(templateId, compiled);
    return compiled;
  }
  
  async getCachedContent(
    cacheKey: string,
    generator: () => Promise<string>
  ): Promise<string> {
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey)!;
    }
    
    const content = await generator();
    this.contentCache.set(cacheKey, content);
    return content;
  }
}
```

## Implementation Details

### API Endpoints

```typescript
export class ReceiptController {
  // Generate and print receipt
  async POST_generateReceipt(req: GenerateReceiptRequest): Promise<ReceiptResponse> {
    const { transactionId, options } = req.body;
    
    // Get transaction data
    const transaction = await this.getTransactionData(transactionId);
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }
    
    // Generate receipt
    const receipt = await this.receiptService.generateReceipt(transaction, options);
    
    // Queue for processing
    const jobId = await this.processingQueue.queueReceiptGeneration(receipt, options);
    
    return {
      success: true,
      receiptId: receipt.id,
      jobId,
      printStatus: 'queued'
    };
  }
  
  // Reprint existing receipt
  async POST_reprintReceipt(req: ReprintReceiptRequest): Promise<ReceiptResponse> {
    const { receiptNumber, printerId } = req.body;
    
    // Get original receipt data
    const originalReceipt = await this.getReceiptByNumber(receiptNumber);
    if (!originalReceipt) {
      return { success: false, error: 'Receipt not found' };
    }
    
    // Reprint with original data
    const result = await this.printerService.print(
      printerId,
      originalReceipt.content
    );
    
    return {
      success: result.success,
      receiptId: originalReceipt.id,
      printStatus: result.success ? 'printed' : 'failed'
    };
  }
}
```

---

## Implementation Roadmap

### Phase 1: Core Receipt Generation (Week 1-2)
- [ ] Basic thermal receipt templates
- [ ] Receipt data model and database schema
- [ ] Template engine implementation
- [ ] Basic printer integration

### Phase 2: Enhanced Features (Week 3-4)
- [ ] Multi-language support
- [ ] Digital receipt options (email/SMS)
- [ ] QR code receipt access
- [ ] Receipt reprinting functionality

### Phase 3: Advanced Features (Week 5-6)
- [ ] Advanced template customization
- [ ] Error handling and recovery
- [ ] Performance optimization
- [ ] Receipt analytics and reporting

### Phase 4: Integration & Testing (Week 7-8)
- [ ] POS system integration
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Production deployment

---

**Maintained by**: Lengolf Development Team  
**Last Updated**: July 14, 2025  
**Next Review**: August 2025

## Related Documents
- [System Architecture](./LENGOLF_POS_SYSTEM_ARCHITECTURE.md)
- [Transaction Processing Design](./TRANSACTION_PROCESSING_DESIGN.md)
- [Payment Processing Design](./PAYMENT_PROCESSING_DESIGN.md)
- [Void Transaction System](./VOID_TRANSACTION_SYSTEM.md)