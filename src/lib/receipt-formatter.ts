// Unified Receipt Formatter for Thermal Printers
// Consolidates ESC/POS generation for both Bluetooth and USB printing
// Supports both normal receipts and tax invoices

import { ReceiptPreview } from './receipt-preview';

export interface ReceiptItem {
  name: string;
  price: number;
  qty: number;
  notes?: string;
  // Item discount fields
  originalPrice?: number;
  itemDiscount?: {
    title: string;
    type: string;
    value: number;
    amount?: number; // Bill structure uses this
  };
  itemDiscountAmount?: number; // Receipt structure uses this
  // Bill-specific fields
  totalPrice?: number; // Bill structure has separate totalPrice
}

export interface ReceiptData {
  receiptNumber: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethods: Array<{ method: string; amount: number }>;
  tableNumber?: string;
  customerName?: string;
  staffName?: string;
  transactionDate?: string | Date;
  paxCount?: number;
  isTaxInvoice?: boolean;
  taxInvoiceData?: TaxInvoiceData;
  isBill?: boolean; // Flag to indicate this is a bill (pre-payment) vs receipt (post-payment)
  // Receipt discount fields
  receiptDiscount?: {
    id: string;
    title: string;
    type: string;
    value: number;
    amount: number;
  };
  receiptDiscountAmount?: number;
  orderItemsTotal?: number; // Original total before receipt discount
}

export interface TaxInvoiceData {
  customerName?: string;
  customerTaxId?: string;
  customerAddress?: string;
  isCompany?: boolean;
  invoiceDate?: string;
  dueDate?: string;
}

export class ReceiptFormatter {
  /**
   * Generate ESC/POS command sequence for thermal printer
   * Works for both normal receipts and tax invoices
   */
  static generateESCPOSData(data: ReceiptData): Uint8Array {
    const commands: number[] = [];
    
    // ESC/POS Commands
    const ESC = 0x1B;
    const GS = 0x1D;
    
    // Initialize printer
    commands.push(ESC, 0x40);
    
    // Get the text lines using shared preview component
    const isTaxInvoice = data.isTaxInvoice || false;
    const isBill = data.isBill || false;
    const lines = ReceiptPreview.generatePreviewLines(data, isTaxInvoice, isBill);
    
    // Convert text lines to ESC/POS commands
    let currentAlignment = 0; // 0=left, 1=center
    let currentSize = 0; // 0=normal, others=special
    
    lines.forEach((line, index) => {
      // Special formatting for specific lines
      if (line.includes('L E N G O L F   C O .   L T D .')) {
        // Company name - center and double size
        if (currentAlignment !== 1) {
          commands.push(ESC, 0x61, 0x01); // Center
          currentAlignment = 1;
        }
        if (currentSize !== 1) {
          commands.push(ESC, 0x21, 0x30); // Double size
          currentSize = 1;
        }
      } else if (line.includes('TAX Invoice') || line.includes('BILL') || line.includes('Receipt / TAX Invoice')) {
        // Receipt type - center and double height
        if (currentAlignment !== 1) {
          commands.push(ESC, 0x61, 0x01); // Center
          currentAlignment = 1;
        }
        if (currentSize !== 2) {
          commands.push(ESC, 0x21, 0x20); // Double height
          currentSize = 2;
        }
      } else if (line.includes('AMOUNT DUE:')) {
        // Amount due - bold
        if (currentSize !== 3) {
          commands.push(ESC, 0x21, 0x10); // Bold
          currentSize = 3;
        }
      } else if (line.includes('You\'re tee-rific') || line.includes('LENGOLF') || line.includes('@lengolf') || line.includes('Tel:') || line.includes('________________________') || line.includes('Signature Cashier')) {
        // Footer items - center
        if (currentAlignment !== 1) {
          commands.push(ESC, 0x61, 0x01); // Center
          currentAlignment = 1;
        }
        if (currentSize !== 0) {
          commands.push(ESC, 0x21, 0x00); // Normal
          currentSize = 0;
        }
      } else if (line.startsWith('Receipt No:') || line.startsWith('Staff:') || line.startsWith('Guests:') || line.startsWith('Date:') || line.match(/^\d+\s+/) || line.includes('Items:') || line.includes('Subtotal:') || line.includes('Discount') || line.includes('VAT') || line.includes('Total:') || line.includes('Mastercard') || line.includes('Cash') || line.includes('Customer Name:') || line.includes('Address:') || line.includes('TAX ID:') || line.includes('Issued to replace')) {
        // Receipt details, items, totals, payments - left align
        if (currentAlignment !== 0) {
          commands.push(ESC, 0x61, 0x00); // Left
          currentAlignment = 0;
        }
        if (currentSize !== 0) {
          commands.push(ESC, 0x21, 0x00); // Normal
          currentSize = 0;
        }
      } else if (line.includes('Mercury Tower') || line.includes('Ploenchit Road') || line.includes('Bangkok') || line.includes('TAX ID: 0105566207013')) {
        // Business info - center
        if (currentAlignment !== 1) {
          commands.push(ESC, 0x61, 0x01); // Center
          currentAlignment = 1;
        }
        if (currentSize !== 0) {
          commands.push(ESC, 0x21, 0x00); // Normal
          currentSize = 0;
        }
      } else {
        // Default - reset to normal
        if (currentSize !== 0) {
          commands.push(ESC, 0x21, 0x00); // Normal
          currentSize = 0;
        }
      }
      
      // Add the text line
      this.addText(commands, line);
      commands.push(0x0A); // Line feed
    });
    
    // Add moderate line feeds and cut paper
    commands.push(0x0A, 0x0A, 0x0A, 0x0A);
    commands.push(ESC, 0x64, 0x03); // Feed 3 lines
    commands.push(GS, 0x56, 0x01);  // Cut paper
    
    return new Uint8Array(commands);
  }

  /**
   * Add text to command array
   */
  private static addText(commands: number[], text: string): void {
    const bytes = new TextEncoder().encode(text);
    for (let i = 0; i < bytes.length; i++) {
      commands.push(bytes[i]);
    }
  }

  /**
   * Split data into chunks for transmission
   */
  static splitIntoChunks(data: Uint8Array, chunkSize: number): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Generate test receipt data for printer testing
   */
  static generateTestData(): ReceiptData {
    return {
      receiptNumber: `TEST-${Date.now()}`,
      items: [
        { name: 'Test Item 1', price: 100.00, qty: 2 },
        { name: 'Test Item 2', price: 50.00, qty: 1, notes: 'Test note' }
      ],
      subtotal: 233.64,
      tax: 16.36,
      total: 250.00,
      paymentMethods: [
        { method: 'Cash', amount: 250.00 }
      ],
      staffName: 'Test Staff',
      paxCount: 2,
      isTaxInvoice: false
    };
  }

  /**
   * Generate test bill data for printer testing
   */
  static generateTestBillData(): ReceiptData {
    return {
      receiptNumber: `BILL-${Date.now()}`,
      items: [
        { name: 'Thai Green Curry', price: 220.00, qty: 1 },
        { name: 'Chicken Fried Rice', price: 180.00, qty: 1 },
        { name: 'Thai Iced Tea', price: 60.00, qty: 2 }
      ],
      subtotal: 486.92,
      tax: 33.08,
      total: 520.00,
      paymentMethods: [], // No payment methods for bills
      tableNumber: 'T01',
      customerName: 'John Doe',
      staffName: 'Test Staff',
      paxCount: 3,
      isTaxInvoice: false,
      isBill: true
    };
  }
}