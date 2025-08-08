# POS Receipt System

## Overview

The Receipt System provides **consolidated receipt generation** optimized for tablet-based POS operations. Features thermal printing support, unified printer interfaces, Thai VAT compliance, and streamlined architecture. Built with ~600 lines of duplicate code eliminated and a clean, maintainable codebase.

## Architecture

### Core Components

**Consolidated Architecture:**
- `ReceiptFormatter.ts` - **Single ESC/POS generator** for all printing (replaces 5 services)
- `ReceiptDataService.ts` - **Unified database queries** for all receipt data
- Receipt formatting with line-by-line control and character encoding
- VAT information generation for Thai tax requirements

**Printing Services (Updated):**
- `BluetoothThermalPrinter.ts` - Bluetooth ESC/POS printing (uses shared ReceiptFormatter)
- `USBThermalPrinter.ts` - USB thermal printer support (uses shared ReceiptFormatter)
- **Eliminated services**: Win32ThermalPrinter, ModernThermalPrinter, ReliableThermalPrinter, DirectCOMPrinter, FastPaymentProcessor

**Image Processing:**
- `ESCPOSImageProcessor.ts` - Image processing for thermal printers
- Logo and image embedding in receipts

### Database Schema

**Receipt Management:**
```sql
-- Receipt records
pos.receipts (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES pos.transactions(id),
  receipt_number VARCHAR(20) UNIQUE NOT NULL,
  receipt_type VARCHAR(20) DEFAULT 'sale', -- 'sale', 'refund', 'void'
  receipt_data JSONB NOT NULL, -- Complete receipt content
  printed_at TIMESTAMP,
  reprinted_count INTEGER DEFAULT 0,
  last_reprint_at TIMESTAMP,
  created_by_staff_id INTEGER REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Print jobs and status
pos.print_jobs (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES pos.receipts(id),
  printer_id VARCHAR(100) NOT NULL,
  printer_type VARCHAR(20) NOT NULL, -- 'bluetooth', 'usb', 'win32'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'printing', 'completed', 'failed'
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Printer configuration
pos.printers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  connection_string VARCHAR(200),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  paper_width INTEGER DEFAULT 80, -- millimeters
  characters_per_line INTEGER DEFAULT 48,
  supports_images BOOLEAN DEFAULT true,
  configuration JSONB,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Reference

### Receipt Operations

**Generate Receipt**
```http
GET /api/pos/receipts/[receiptNumber]
```

**Response:**
```json
{
  "receipt": {
    "id": 123,
    "receipt_number": "RCP-20240115-001",
    "transaction_id": 456,
    "receipt_type": "sale",
    "receipt_data": {
      "header": {
        "business_name": "LenGolf Restaurant",
        "address": "123 Golf Course Road, Bangkok 10110",
        "tax_id": "1234567890123",
        "phone": "+66-2-123-4567"
      },
      "transaction": {
        "date": "2024-01-15T10:30:00Z",
        "table_number": "T01",
        "server": "John Doe",
        "items": [...],
        "subtotal": 520.00,
        "vat": 36.40,
        "total": 556.40
      },
      "payment": {
        "methods": [
          { "type": "cash", "amount": 600.00 },
          { "type": "change", "amount": 43.60 }
        ]
      },
      "footer": {
        "thank_you_message": "Thank you for dining with us!",
        "return_policy": "Returns accepted within 7 days"
      }
    }
  }
}
```

**Preview Receipt**
```http
POST /api/pos/receipts/preview
Content-Type: application/json

{
  "transaction_id": 456,
  "format": "thermal", // 'thermal', 'a4', 'email'
  "printer_width": 80
}
```

**Print Receipt**
```http
POST /api/pos/print-thermal
Content-Type: application/json

{
  "receipt_number": "RCP-20240115-001",
  "printer_id": "bluetooth_printer_001",
  "copies": 1
}
```

**Reprint Receipt**
```http
POST /api/pos/reprint
Content-Type: application/json

{
  "receipt_number": "RCP-20240115-001",
  "staff_pin": "1234",
  "reason": "Customer copy requested"
}
```

### Printer Management

**Get Available Printers**
```http
GET /api/pos/printers
```

**Response:**
```json
{
  "printers": [
    {
      "id": "bluetooth_printer_001",
      "name": "Kitchen Printer",
      "type": "bluetooth",
      "is_default": true,
      "is_active": true,
      "paper_width": 80,
      "characters_per_line": 48,
      "last_used_at": "2024-01-15T09:15:00Z"
    }
  ]
}
```

## Component Implementation

### ReceiptFormatter Service (Consolidated)

**Single ESC/POS Generator:**
```typescript
class ReceiptFormatter {
  // Single static method replaces all duplicate receipt generation
  static generateESCPOSData(receiptData: ReceiptData): Uint8Array {
    const commands: number[] = [];
    
    // Initialize printer
    commands.push(0x1B, 0x40); // ESC @
    
    // Header section
    this.addBusinessHeader(commands, receiptData);
    
    // Receipt info
    this.addReceiptInfo(commands, receiptData);
    
    // Items
    this.addItems(commands, receiptData.items);
    
    // Totals
    this.addTotals(commands, receiptData);
    
    // Payment information
    this.addPaymentInfo(commands, receiptData.paymentMethods);
    
    // Footer
    this.addFooter(commands, receiptData);
    
    // Cut paper
    commands.push(0x1D, 0x56, 0x00); // GS V 0
    
    return new Uint8Array(commands);
  }
  
  // Used by both BluetoothThermalPrinter and USBThermalPrinter
  // Supports both normal receipts and tax invoices
  // Eliminates ~400 lines of duplicate ESC/POS code
}

  private addHeader(receipt: ThermalReceipt, transaction: Transaction, lineWidth: number) {
    // Business logo (if supported)
    receipt.commands.push({
      type: 'image',
      data: '/images/logo-thermal.bmp',
      alignment: 'center'
    });

    // Business information
    receipt.lines.push(this.centerText('LENGOLF RESTAURANT', lineWidth));
    receipt.lines.push(this.centerText('123 Golf Course Road', lineWidth));
    receipt.lines.push(this.centerText('Bangkok 10110', lineWidth));
    receipt.lines.push(this.centerText('Tel: +66-2-123-4567', lineWidth));
    receipt.lines.push(this.centerText('TAX ID: 1234567890123', lineWidth));
    
    // Separator
    receipt.lines.push('='.repeat(lineWidth));
    receipt.lines.push('');
  }

  private addTransactionInfo(receipt: ThermalReceipt, transaction: Transaction, lineWidth: number) {
    const dateTime = new Date(transaction.created_at).toLocaleString('th-TH');
    
    receipt.lines.push(`Receipt: ${transaction.receipt_number}`);
    receipt.lines.push(`Date: ${dateTime}`);
    receipt.lines.push(`Table: ${transaction.table_number || 'N/A'}`);
    receipt.lines.push(`Server: ${transaction.staff_name}`);
    
    if (transaction.customer_name) {
      receipt.lines.push(`Customer: ${transaction.customer_name}`);
    }
    
    receipt.lines.push('');
    receipt.lines.push('-'.repeat(lineWidth));
  }

  private addItems(receipt: ThermalReceipt, items: TransactionItem[], lineWidth: number) {
    receipt.lines.push(this.formatLine('ITEM', 'QTY', 'PRICE', lineWidth));
    receipt.lines.push('-'.repeat(lineWidth));

    items.forEach(item => {
      // Main item line
      const itemName = item.product_name.length > (lineWidth - 15) 
        ? item.product_name.substring(0, lineWidth - 18) + '...'
        : item.product_name;
      
      const qtyStr = `${item.quantity}x`;
      const priceStr = `${item.total_price.toFixed(2)}`;
      
      receipt.lines.push(this.formatLine(itemName, qtyStr, priceStr, lineWidth));

      // Customizations
      if (item.customizations && Object.keys(item.customizations).length > 0) {
        Object.entries(item.customizations).forEach(([key, value]) => {
          if (value) {
            receipt.lines.push(`  + ${key}: ${value}`);
          }
        });
      }

      // Notes
      if (item.notes) {
        receipt.lines.push(`  Note: ${item.notes}`);
      }
    });

    receipt.lines.push('-'.repeat(lineWidth));
  }

  private addTotals(receipt: ThermalReceipt, transaction: Transaction, lineWidth: number, includeVAT: boolean) {
    const formatAmount = (amount: number) => `฿${amount.toFixed(2)}`;

    receipt.lines.push(this.formatLine('Subtotal:', '', formatAmount(transaction.subtotal), lineWidth));
    
    if (transaction.discount_amount > 0) {
      receipt.lines.push(this.formatLine('Discount:', '', `-${formatAmount(transaction.discount_amount)}`, lineWidth));
    }

    if (includeVAT && transaction.tax_amount > 0) {
      receipt.lines.push(this.formatLine('VAT (7%):', '', formatAmount(transaction.tax_amount), lineWidth));
    }

    if (transaction.service_charge > 0) {
      receipt.lines.push(this.formatLine('Service Charge:', '', formatAmount(transaction.service_charge), lineWidth));
    }

    receipt.lines.push('='.repeat(lineWidth));
    
    // Total with emphasis
    receipt.commands.push({ type: 'bold', value: true });
    receipt.lines.push(this.formatLine('TOTAL:', '', formatAmount(transaction.total_amount), lineWidth));
    receipt.commands.push({ type: 'bold', value: false });
    
    receipt.lines.push('='.repeat(lineWidth));
  }

  private addPaymentInfo(receipt: ThermalReceipt, payments: TransactionPayment[], lineWidth: number) {
    if (payments.length === 0) return;

    receipt.lines.push('');
    receipt.lines.push('PAYMENT DETAILS:');
    receipt.lines.push('-'.repeat(lineWidth));

    payments.forEach(payment => {
      const methodName = this.getPaymentMethodName(payment.payment_method);
      const amount = `฿${payment.amount.toFixed(2)}`;
      
      receipt.lines.push(this.formatLine(methodName, '', amount, lineWidth));
      
      if (payment.reference_number) {
        receipt.lines.push(`  Ref: ${payment.reference_number}`);
      }
    });

    // Calculate change
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const change = totalPaid - transaction.total_amount;
    
    if (change > 0) {
      receipt.lines.push('-'.repeat(lineWidth));
      receipt.lines.push(this.formatLine('Change:', '', `฿${change.toFixed(2)}`, lineWidth));
    }
  }

  private addFooter(receipt: ThermalReceipt, transaction: Transaction, lineWidth: number) {
    receipt.lines.push('');
    receipt.lines.push('='.repeat(lineWidth));
    
    // VAT information (Thai requirement)
    receipt.lines.push(this.centerText('TAX INVOICE / ใบกำกับภาษี', lineWidth));
    receipt.lines.push(this.centerText(`VAT REG: กทม-1234567890123-000`, lineWidth));
    
    receipt.lines.push('');
    receipt.lines.push(this.centerText('Thank you for dining with us!', lineWidth));
    receipt.lines.push(this.centerText('ขอบคุณที่ใช้บริการ', lineWidth));
    
    receipt.lines.push('');
    receipt.lines.push(this.centerText('Visit us again soon!', lineWidth));
    
    // QR code for feedback (if supported)
    receipt.commands.push({
      type: 'qr_code',
      data: `https://lengolf.com/feedback/${transaction.receipt_number}`,
      size: 'medium',
      alignment: 'center'
    });

    receipt.lines.push('');
    receipt.lines.push('');
    receipt.lines.push('');
    
    // Cut paper
    receipt.commands.push({ type: 'cut_paper' });
  }

  private formatLine(left: string, center: string, right: string, lineWidth: number): string {
    const centerSpace = center ? center.length + 2 : 0;
    const availableWidth = lineWidth - right.length - centerSpace;
    const leftTruncated = left.length > availableWidth ? left.substring(0, availableWidth - 3) + '...' : left;
    
    const padding = lineWidth - leftTruncated.length - centerSpace - right.length;
    const centerPadded = center ? ` ${center} ` : '';
    
    return leftTruncated + ' '.repeat(Math.max(0, padding)) + centerPadded + right;
  }

  private centerText(text: string, lineWidth: number): string {
    if (text.length >= lineWidth) return text.substring(0, lineWidth);
    
    const padding = Math.floor((lineWidth - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  private getPaymentMethodName(method: string): string {
    const methodNames = {
      'cash': 'Cash',
      'credit_card': 'Credit Card',
      'promptpay': 'PromptPay',
      'bank_transfer': 'Bank Transfer'
    };
    return methodNames[method] || method.toUpperCase();
  }
}
```

### ReceiptDataService (Consolidated)

**Unified Database Queries:**
```typescript
class ReceiptDataService {
  // Single source of truth for receipt data queries
  static async getReceiptData(receiptNumber: string): Promise<ReceiptData> {
    // Consolidated database query logic
    // Replaces duplicate queries across 4 API endpoints
    const transactionData = await this.fetchTransactionData(receiptNumber);
    const orderData = await this.fetchOrderData(transactionData.id);
    const staffData = await this.fetchStaffData(transactionData.staff_id);
    
    return this.formatReceiptData(transactionData, orderData, staffData);
  }
  
  static async getTaxInvoiceData(receiptNumber: string): Promise<ReceiptData> {
    // Same base query with tax invoice formatting
    const baseData = await this.getReceiptData(receiptNumber);
    return { ...baseData, isTaxInvoice: true };
  }
  
  static getReceiptSummary(receiptData: ReceiptData): ReceiptSummary {
    // Standardized summary generation
    return {
      receiptNumber: receiptData.receiptNumber,
      totalAmount: receiptData.total,
      itemCount: receiptData.items.length,
      paymentMethods: receiptData.paymentMethods.map(p => p.method),
      date: new Date(receiptData.transactionDate).toLocaleDateString()
    };
  }
  
  // Eliminates ~200 lines of duplicate database query code
}

  protected processCommand(command: ThermalCommand): number[] {
    switch (command.type) {
      case 'bold':
        return command.value ? this.ESC_BOLD_ON : this.ESC_BOLD_OFF;
      
      case 'align_center':
        return this.ESC_ALIGN_CENTER;
      
      case 'align_left':
        return this.ESC_ALIGN_LEFT;
      
      case 'cut_paper':
        return this.ESC_CUT_PAPER;
      
      case 'image':
        return this.processImage(command.data);
      
      case 'qr_code':
        return this.processQRCode(command.data, command.size);
      
      default:
        return [];
    }
  }

  // ESC/POS Commands
  private readonly ESC_INIT = [0x1B, 0x40]; // Initialize
  private readonly ESC_BOLD_ON = [0x1B, 0x45, 0x01]; // Bold on
  private readonly ESC_BOLD_OFF = [0x1B, 0x45, 0x00]; // Bold off
  private readonly ESC_ALIGN_LEFT = [0x1B, 0x61, 0x00]; // Align left
  private readonly ESC_ALIGN_CENTER = [0x1B, 0x61, 0x01]; // Align center
  private readonly ESC_CUT_PAPER = [0x1D, 0x56, 0x00]; // Cut paper
  private readonly ESC_CHARSET_UTF8 = [0x1B, 0x74, 0x06]; // UTF-8 encoding
}
```

**Updated Bluetooth Thermal Printer:**
```typescript
class BluetoothThermalPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(): Promise<boolean> {
    try {
      // Request Bluetooth device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Common thermal printer service
          { namePrefix: 'POS-' },
          { namePrefix: 'Thermal' }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      if (!this.device.gatt) {
        throw new Error('GATT not available');
      }

      // Connect to GATT server
      const server = await this.device.gatt.connect();
      
      // Get service and characteristic
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      return true;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  async printReceipt(receiptNumber: string): Promise<PrintResult> {
    if (!this.characteristic) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      // Use consolidated services
      const receiptData = await ReceiptDataService.getReceiptData(receiptNumber);
      const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
      
      // Split data into chunks for Bluetooth transmission
      const chunkSize = 20; // Bluetooth LE characteristic limit
      for (let i = 0; i < escposData.length; i += chunkSize) {
        const chunk = escposData.slice(i, i + chunkSize);
        await this.characteristic.writeValue(chunk);
        
        // Small delay between chunks to prevent buffer overflow
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // No more duplicate ESC/POS generation code - uses shared ReceiptFormatter

  async getStatus(): Promise<PrinterStatus> {
    if (!this.device?.gatt?.connected) {
      return { connected: false, paperStatus: 'unknown', error: 'Not connected' };
    }

    try {
      // Send status request command
      const statusCommand = new Uint8Array([0x1D, 0x72, 0x01]); // GS r 1
      await this.characteristic?.writeValue(statusCommand);

      // Read status response (implementation depends on printer)
      return { connected: true, paperStatus: 'ok' };
    } catch (error) {
      return { connected: false, paperStatus: 'unknown', error: error.message };
    }
  }
}
```

**Updated USB Thermal Printer:**
```typescript
class USBThermalPrinter {
  private device: USBDevice | null = null;
  private interface: USBInterface | null = null;
  private endpoint: USBEndpoint | null = null;

  async connect(): Promise<boolean> {
    try {
      // Request USB device
      this.device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x04B8 }, // Epson
          { vendorId: 0x0519 }, // Star
          { vendorId: 0x04E8 }  // Samsung/Bixolon
        ]
      });

      await this.device.open();
      
      // Select configuration
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Claim interface
      this.interface = this.device.configuration.interfaces[0];
      await this.device.claimInterface(this.interface.interfaceNumber);

      // Find bulk OUT endpoint
      this.endpoint = this.interface.alternates[0].endpoints.find(
        ep => ep.direction === 'out' && ep.type === 'bulk'
      ) || null;

      return this.endpoint !== null;
    } catch (error) {
      console.error('USB connection failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      if (this.interface) {
        await this.device.releaseInterface(this.interface.interfaceNumber);
      }
      await this.device.close();
    }
    
    this.device = null;
    this.interface = null;
    this.endpoint = null;
  }

  async printReceipt(receiptNumber: string): Promise<PrintResult> {
    if (!this.device || !this.endpoint) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      // Use consolidated services
      const receiptData = await ReceiptDataService.getReceiptData(receiptNumber);
      const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
      
      // Send data to printer
      const result = await this.device.transferOut(this.endpoint.endpointNumber, escposData);
      
      if (result.status === 'ok') {
        return { success: true };
      } else {
        return { success: false, error: `Transfer failed: ${result.status}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // No more duplicate ESC/POS generation code - uses shared ReceiptFormatter

  async getStatus(): Promise<PrinterStatus> {
    if (!this.device) {
      return { connected: false, paperStatus: 'unknown', error: 'Not connected' };
    }

    // USB status checking implementation
    return { connected: true, paperStatus: 'ok' };
  }
}
```

### Consolidated API Endpoints

**Updated Receipt APIs:**
```typescript
// /api/pos/receipts/[receiptNumber] - Updated to use consolidated services
export async function GET(request: NextRequest, { params }: { params: { receiptNumber: string } }) {
  const { receiptNumber } = params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const isTaxInvoice = searchParams.get('taxInvoice') === 'true';

  // Use consolidated data service
  const receiptData = isTaxInvoice 
    ? await ReceiptDataService.getTaxInvoiceData(receiptNumber)
    : await ReceiptDataService.getReceiptData(receiptNumber);

  switch (format) {
    case 'thermal':
      // Use consolidated formatter
      const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
      const thermalText = Array.from(escposData).map(byte => String.fromCharCode(byte)).join('');
      return new NextResponse(thermalText, {
        headers: { 'Content-Type': 'text/plain' }
      });
    
    case 'html':
      // Simple HTML generation
      const htmlContent = generateHTMLReceipt(receiptData);
      return new NextResponse(htmlContent, {
        headers: { 'Content-Type': 'text/html' }
      });
    
    default:
      return NextResponse.json({
        success: true,
        receiptData: receiptData,
        summary: ReceiptDataService.getReceiptSummary(receiptData)
      });
  }
}
  private retryConfig: RetryConfig;

  constructor(printers: ThermalPrinter[], retryConfig: RetryConfig = {}) {
    this.printers = printers;
    this.retryConfig = {
      maxRetries: retryConfig.maxRetries || 3,
      retryDelay: retryConfig.retryDelay || 1000,
      backoffMultiplier: retryConfig.backoffMultiplier || 2
    };
  }

  async print(receipt: ThermalReceipt): Promise<PrintResult> {
    const errors: string[] = [];

    for (const printer of this.printers) {
      const result = await this.printWithRetry(printer, receipt);
      
      if (result.success) {
        return result;
      } else {
        errors.push(`${printer.constructor.name}: ${result.error}`);
      }
    }

    return {
      success: false,
      error: `All printers failed: ${errors.join('; ')}`
    };
  }

  private async printWithRetry(printer: ThermalPrinter, receipt: ThermalReceipt): Promise<PrintResult> {
    let lastError = '';
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Ensure printer is connected
        const connected = await printer.connect();
        if (!connected) {
          throw new Error('Failed to connect to printer');
        }

        // Attempt to print
        const result = await printer.print(receipt);
        
        if (result.success) {
          return result;
        } else {
          lastError = result.error || 'Unknown error';
        }
      } catch (error) {
        lastError = error.message;
      }

      // Wait before retry (with exponential backoff)
      if (attempt < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, error: lastError };
  }
}
```

## Thai VAT Compliance

### Tax Receipt Requirements

**Thai Tax Invoice Format:**
```typescript
interface ThaiVATReceipt {
  tax_invoice_number: string; // ใบกำกับภาษีเลขที่
  business_name: string; // ชื่อสถานประกอบการ
  address: string; // ที่อยู่
  tax_id: string; // เลขประจำตัวผู้เสียภาษี
  branch_code: string; // รหัสสาขา (00000 = สำนักงานใหญ่)
  issue_date: string; // วันที่ออกใบกำกับภาษี
  customer_name?: string; // ชื่อลูกค้า
  customer_tax_id?: string; // เลขประจำตัวผู้เสียภาษีลูกค้า
  items: VATReceiptItem[];
  subtotal: number; // มูลค่าสินค้าหรือบริการ
  vat_amount: number; // ภาษีมูลค่าเพิ่ม
  total: number; // จำนวนเงินรวมทั้งสิ้น
}

const generateThaiVATReceipt = (transaction: Transaction): ThaiVATReceipt => {
  return {
    tax_invoice_number: `TI-${transaction.receipt_number}`,
    business_name: 'LenGolf Restaurant Co., Ltd.',
    address: '123 Golf Course Road, Pathumwan, Bangkok 10330',
    tax_id: '1234567890123',
    branch_code: '00000',
    issue_date: new Date(transaction.created_at).toLocaleDateString('th-TH'),
    customer_name: transaction.customer_name,
    items: transaction.items.map(item => ({
      description: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.total_price
    })),
    subtotal: transaction.subtotal,
    vat_amount: transaction.tax_amount,
    total: transaction.total_amount
  };
};
```

## Performance Optimization

### Print Queue Management

**Efficient Print Processing:**
```typescript
class PrintQueueManager {
  private queue: PrintJob[] = [];
  private processing = false;
  private maxConcurrent = 3;
  private activeJobs = 0;

  async addJob(job: PrintJob): Promise<void> {
    this.queue.push(job);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.activeJobs >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    while (this.queue.length > 0 && this.activeJobs < this.maxConcurrent) {
      const job = this.queue.shift()!;
      this.processJob(job);
    }

    this.processing = false;
  }

  private async processJob(job: PrintJob): Promise<void> {
    this.activeJobs++;
    
    try {
      await this.updateJobStatus(job.id, 'printing');
      
      const result = await job.printer.print(job.receipt);
      
      if (result.success) {
        await this.updateJobStatus(job.id, 'completed');
      } else {
        await this.updateJobStatus(job.id, 'failed', result.error);
        
        // Retry if configured
        if (job.retryCount < job.maxRetries) {
          job.retryCount++;
          this.queue.unshift(job); // Add back to front of queue
        }
      }
    } catch (error) {
      await this.updateJobStatus(job.id, 'failed', error.message);
    } finally {
      this.activeJobs--;
      this.processQueue(); // Process next job
    }
  }

  private async updateJobStatus(jobId: number, status: string, error?: string): Promise<void> {
    await supabase
      .from('pos.print_jobs')
      .update({
        status,
        error_message: error,
        completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null
      })
      .eq('id', jobId);
  }
}
```

## Troubleshooting

### Common Issues

**Printing Failures:**
1. Check printer connection (Bluetooth/USB)
2. Verify printer power and paper
3. Test with simple text print
4. Review ESC/POS command compatibility
5. Check character encoding issues

**Receipt Formatting Issues:**
1. Verify paper width settings
2. Check character per line calculations
3. Review text truncation logic
4. Test with different content lengths
5. Validate special character handling

**Thai Text Display Problems:**
1. Verify UTF-8 encoding support
2. Check thermal printer font capabilities
3. Test with Thai character set
4. Review printer configuration
5. Validate character mapping

### Debug Tools

**Print Debug Console:**
```typescript
// Debug receipt generation
const debugReceipt = (transaction: Transaction) => {
  const generator = new ReceiptGenerator();
  const receipt = generator.generateThermalReceipt(transaction);
  
  console.log('Receipt Debug:', {
    line_count: receipt.lines.length,
    command_count: receipt.commands?.length || 0,
    total_characters: receipt.lines.join('').length,
    sample_lines: receipt.lines.slice(0, 5)
  });
};

// Test printer connectivity
const testPrinter = async (printer: ThermalPrinter) => {
  console.log('Testing printer connection...');
  
  const connected = await printer.connect();
  console.log('Connection status:', connected);
  
  if (connected) {
    const status = await printer.getStatus();
    console.log('Printer status:', status);
    
    // Test print
    const testReceipt = {
      lines: ['Test Print', 'Hello World', ''],
      commands: [{ type: 'cut_paper' }]
    };
    
    const result = await printer.print(testReceipt);
    console.log('Print test result:', result);
  }
};
```

## Integration Points

### Transaction System
- Automatic receipt generation upon payment completion
- Receipt data integration from transaction details
- Support for refund and void receipts

### Order Management
- Order details integration for receipt items
- Customization information display
- Staff and table information inclusion

### Customer Management
- Customer information on receipts
- Loyalty program integration
- Tax ID inclusion for business customers

## Future Enhancements

### Planned Features
- **Email Receipts** - Digital receipt delivery
- **Mobile Receipt Viewing** - QR code scanning for digital receipts
- **Receipt Templates** - Customizable receipt layouts
- **Multi-Language Support** - Automatic language detection

### Technical Improvements
- **Cloud Printing** - Remote printer management
- **Advanced Analytics** - Print job performance monitoring
- **Enhanced Error Recovery** - Automatic error resolution
- **Eco-Friendly Options** - Digital-first receipt options

## Architecture Benefits

### Code Reduction
- **~600 lines eliminated**: Consolidated duplicate ESC/POS generation
- **5 services removed**: Win32ThermalPrinter, ModernThermalPrinter, ReliableThermalPrinter, DirectCOMPrinter, FastPaymentProcessor
- **4 API endpoints migrated**: Updated to use shared services
- **Single source of truth**: ReceiptDataService handles all database queries

### Maintenance Benefits
- **Easier updates**: ESC/POS changes only need to be made in one place
- **Consistent formatting**: All printers use the same formatting logic
- **Simplified testing**: Single test interface for all connection types
- **Reduced bugs**: Eliminates inconsistencies between duplicate implementations

### Performance Benefits
- **Optimized queries**: ReceiptDataService uses efficient database queries
- **Reduced bundle size**: Eliminated duplicate code
- **Better caching**: Single formatter allows for better caching strategies
- **Tablet-optimized**: No server-side dependencies, runs entirely in browser

## Related Documentation

- [POS Receipt Printing](../POS_RECEIPT_PRINTING.md) - Complete printing documentation
- [POS Payment Processing](./POS_PAYMENT_PROCESSING.md) - Payment integration
- [POS Order Management](./POS_ORDER_MANAGEMENT.md) - Order details integration
- [POS Staff Authentication](./POS_STAFF_AUTHENTICATION.md) - Staff information on receipts
- [POS API Reference](./POS_API_REFERENCE.md) - Complete API documentation

---

*Last Updated: January 2025 | Version: 3.0.0 - Consolidated Architecture*