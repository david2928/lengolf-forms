// Unified Receipt Formatter for Thermal Printers
// Consolidates ESC/POS generation for both Bluetooth and USB printing
// Supports both normal receipts and tax invoices

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
  };
  itemDiscountAmount?: number;
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

export interface DailyClosingData {
  closingDate: string;
  shiftIdentifier?: string;
  closedByStaffName: string;
  expectedCash: number;
  expectedCreditCard: number;
  qrPaymentsTotal: number;
  otherPaymentsTotal?: number;
  totalSales: number;
  actualCash: number;
  actualCreditCard: number;
  creditCardBatchReference?: string;
  cashVariance: number;
  creditCardVariance: number;
  transactionCount: number;
  voidedCount: number;
  voidedAmount: number;
  varianceNotes?: string;
  createdAt: string;
}

export class ReceiptFormatter {
  /**
   * Generate ESC/POS command sequence for thermal printer
   * Works for both normal receipts and tax invoices
   */
  static generateESCPOSData(data: ReceiptData): Uint8Array {
    // Ensure required arrays are defined to prevent forEach errors
    if (!data.items) {
      data.items = [];
    }
    if (!data.paymentMethods) {
      data.paymentMethods = [{ method: 'Cash', amount: data.total }];
    }
    
    const commands: number[] = [];
    
    // ESC/POS Commands
    const ESC = 0x1B;
    const GS = 0x1D;
    
    // Initialize printer
    commands.push(ESC, 0x40);
    
    // Header - centered
    commands.push(ESC, 0x61, 0x01); // Center alignment
    
    // Company name
    commands.push(ESC, 0x21, 0x30); // Double size
    this.addText(commands, 'LENGOLF CO. LTD.');
    commands.push(0x0A, 0x0A);
    
    commands.push(ESC, 0x21, 0x00); // Normal size
    
    // Business info
    this.addText(commands, '540 Mercury Tower, 4th Floor, Unit 407');
    commands.push(0x0A);
    this.addText(commands, 'Ploenchit Road, Lumpini, Pathumwan');
    commands.push(0x0A);
    this.addText(commands, 'Bangkok 10330');
    commands.push(0x0A);
    this.addText(commands, 'TAX ID: 0105566207013');
    commands.push(0x0A, 0x0A);
    
    // Receipt type header
    commands.push(ESC, 0x21, 0x20); // Double height
    if (data.isTaxInvoice) {
      this.addText(commands, 'Receipt / TAX Invoice');
      commands.push(0x0A);
      this.addText(commands, '(Original)');
    } else if (data.isBill) {
      this.addText(commands, 'BILL');
    } else {
      this.addText(commands, 'TAX Invoice (ABB)');
    }
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x00); // Reset
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Receipt details - left aligned
    commands.push(ESC, 0x61, 0x00);
    
    if (!data.isBill) {
      this.addText(commands, `Receipt No: ${data.receiptNumber}`);
      commands.push(0x0A);
    }
    
    if (data.staffName) {
      this.addText(commands, `Staff: ${data.staffName}`);
      commands.push(0x0A);
    }
    
    const guestCount = data.paxCount || 1;
    this.addText(commands, `Guests: ${guestCount}`);
    commands.push(0x0A);
    
    // Date and time
    const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();
    const dateStr = transactionDate.toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const timeStr = transactionDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dateText = `Date: ${dateStr}`;
    const timeText = `Time: ${timeStr}`;
    const spacing = ' '.repeat(Math.max(1, 48 - dateText.length - timeText.length));
    this.addText(commands, `${dateText}${spacing}${timeText}`);
    commands.push(0x0A);
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Items
    const items = data.items || [];
    items.forEach(item => {
      const qty = item.qty || 1;
      const originalPrice = item.originalPrice || item.price;
      const originalTotal = originalPrice; // Price is already line total, don't multiply by qty
      const qtyStr = qty.toString();
      const priceStr = originalTotal.toFixed(2);
      const nameMaxLength = 48 - qtyStr.length - priceStr.length - 4;
      const itemName = item.name.length > nameMaxLength ? 
        item.name.substring(0, nameMaxLength - 3) + '...' : item.name;
      
      const itemLine = `${qtyStr}    ${itemName}${' '.repeat(Math.max(1, 48 - qtyStr.length - 4 - itemName.length - priceStr.length))}${priceStr}`;
      this.addText(commands, itemLine);
      commands.push(0x0A);
      
      // Show item discount if applicable
      if (item.itemDiscount && item.itemDiscountAmount && item.itemDiscountAmount > 0) {
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Discount debug:', {
            title: item.itemDiscount.title,
            type: item.itemDiscount.type,
            value: item.itemDiscount.value,
            amount: item.itemDiscountAmount
          });
        }
        
        const discountLabel = `     ${item.itemDiscount.title}`;
        const discountAmount = `-${(item.itemDiscountAmount || 0).toFixed(2)}`;
        const discountSpacing = ' '.repeat(Math.max(1, 48 - discountLabel.length - discountAmount.length));
        const finalLine = `${discountLabel}${discountSpacing}${discountAmount}`;
        
        // Debug final output
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Final discount line:', JSON.stringify(finalLine));
        }
        
        this.addText(commands, finalLine);
        commands.push(0x0A);
      }
      
      if (item.notes) {
        this.addText(commands, `  Note: ${item.notes}`);
        commands.push(0x0A);
      }
    });
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    const itemCount = data.items.reduce((sum, item) => sum + (item.qty || 1), 0);
    this.addText(commands, `Items: ${itemCount}`);
    commands.push(0x0A, 0x0A);
    
    // Totals
    const leftAlign = 20;
    const width = 48;
    
    // Original subtotal (before discount)
    const originalSubtotal = (data.orderItemsTotal || data.subtotal || 0);
    const originalSubtotalStr = originalSubtotal.toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}Subtotal:${' '.repeat(width - leftAlign - 9 - originalSubtotalStr.length)}${originalSubtotalStr}`);
    commands.push(0x0A);
    
    // Receipt discount (if applicable)
    if (data.receiptDiscount && data.receiptDiscountAmount && data.receiptDiscountAmount > 0) {
      const discount = data.receiptDiscount;
      const discountAmount = data.receiptDiscountAmount;
      
      let discountLabel = '';
      let discountAmountStr = '';
      if (discount.type === 'percentage') {
        // Calculate the correct discount amount based on order items total
        const correctDiscountAmount = data.orderItemsTotal ? 
          (data.orderItemsTotal * discount.value / 100) : discountAmount;
        discountLabel = `Discount (${discount.value}%):`;
        discountAmountStr = `-${(correctDiscountAmount || 0).toFixed(2)}`;
      } else {
        discountLabel = 'Discount:';
        discountAmountStr = `-${(discountAmount || 0).toFixed(2)}`;
      }
      
      const discountSpacing = ' '.repeat(Math.max(1, width - leftAlign - discountLabel.length - discountAmountStr.length));
      this.addText(commands, `${' '.repeat(leftAlign)}${discountLabel}${discountSpacing}${discountAmountStr}`);
      commands.push(0x0A);
    }
    
    // VAT (calculated from final amount)
    const vatAmount = (data.tax || 0).toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}VAT(7%) incl.:${' '.repeat(width - leftAlign - 14 - vatAmount.length)}${vatAmount}`);
    commands.push(0x0A);
    
    this.addText(commands, `${' '.repeat(leftAlign)}============================`);
    commands.push(0x0A);
    
    const totalAmount = (data.total || 0).toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}Total:${' '.repeat(width - leftAlign - 6 - totalAmount.length)}${totalAmount}`);
    commands.push(0x0A, 0x0A);
    
    // Payment section
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    if (data.isBill) {
      // For bills, show amount due and available payment options
      commands.push(ESC, 0x21, 0x10); // Bold
      this.addText(commands, `AMOUNT DUE: THB ${(data.total || 0).toFixed(2)}`);
      commands.push(ESC, 0x21, 0x00); // Reset
      commands.push(0x0A, 0x0A);
      
      this.addText(commands, 'PAYMENT OPTIONS AVAILABLE:');
      commands.push(0x0A);
      this.addText(commands, '- Cash');
      commands.push(0x0A);
      this.addText(commands, '- PromptPay (QR Code)');
      commands.push(0x0A);
      this.addText(commands, '- Visa/Mastercard (EDC)');
      commands.push(0x0A);
      this.addText(commands, '- Alipay');
      commands.push(0x0A);
    } else {
      // For receipts, show actual payment methods used
      const paymentMethods = data.paymentMethods || [{ method: 'Cash', amount: data.total }];
      paymentMethods.forEach(payment => {
        const methodText = payment.method;
        const amountText = (payment.amount || 0).toFixed(2);
        const spacing = ' '.repeat(Math.max(1, 48 - methodText.length - amountText.length));
        this.addText(commands, `${methodText}${spacing}${amountText}`);
        commands.push(0x0A);
      });
    }
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Tax invoice customer information (right after payment)
    if (data.isTaxInvoice) {
      if (data.taxInvoiceData && data.taxInvoiceData.customerName) {
        this.addText(commands, `Customer Name: ${data.taxInvoiceData.customerName}`);
        commands.push(0x0A);
        
        if (data.taxInvoiceData.customerAddress) {
          this.addText(commands, `Address: ${data.taxInvoiceData.customerAddress}`);
        } else {
          this.addText(commands, `Address:`);
        }
        commands.push(0x0A);
        commands.push(0x0A); // Empty row between Address and TAX ID
        
        if (data.taxInvoiceData.customerTaxId) {
          this.addText(commands, `TAX ID: ${data.taxInvoiceData.customerTaxId}`);
        } else {
          this.addText(commands, `TAX ID:`);
        }
        commands.push(0x0A);
      } else {
        // Fallback when no tax invoice data
        this.addText(commands, `Customer Name:`);
        commands.push(0x0A);
        this.addText(commands, `Address:`);
        commands.push(0x0A);
        commands.push(0x0A); // Empty row
        this.addText(commands, `TAX ID:`);
        commands.push(0x0A);
      }
      commands.push(0x0A); // Empty row after customer info
    }
    
    // Tax invoice specific sections (before footer)
    if (data.isTaxInvoice) {
      // Signature section
      commands.push(0x0A);
      commands.push(ESC, 0x61, 0x01); // Center alignment
      this.addText(commands, '________________________');
      commands.push(0x0A);
      this.addText(commands, 'Signature Cashier');
      commands.push(0x0A, 0x0A);
      commands.push(ESC, 0x61, 0x00); // Reset to left alignment
      
      // ABB reference with lines around it
      this.addText(commands, '------------------------------------------------');
      commands.push(0x0A);
      this.addText(commands, `Issued to replace the TAX invoice (ABB)`);
      commands.push(0x0A);
      this.addText(commands, `number: ${data.receiptNumber}`);
      commands.push(0x0A);
      this.addText(commands, '------------------------------------------------');
      commands.push(0x0A, 0x0A);
    }
    
    // Footer
    commands.push(ESC, 0x61, 0x01); // Center
    this.addText(commands, 'You\'re tee-rific. Come back soon!');
    commands.push(0x0A, 0x0A);
    
    this.addText(commands, 'LENGOLF');
    commands.push(0x0A);
    this.addText(commands, '@lengolf | www.len.golf');
    commands.push(0x0A);
    this.addText(commands, 'Tel: 096-668-2335');
    commands.push(0x0A, 0x0A);
    
    // Add moderate line feeds
    commands.push(0x0A, 0x0A, 0x0A, 0x0A);
    
    // Feed and cut paper
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

  /**
   * Generate ESC/POS command sequence for daily closing report
   * Thermal receipt format as specified in POS_DAILY_CLOSING.md
   * Matches the working receipt/bill formatting pattern
   */
  static generateDailyClosingReport(data: DailyClosingData): Uint8Array {
    const commands: number[] = [];

    // ESC/POS Commands
    const ESC = 0x1B;
    const GS = 0x1D;
    const width = 48; // Standard thermal printer width

    // Initialize printer
    commands.push(ESC, 0x40);

    // Header - centered
    commands.push(ESC, 0x61, 0x01); // Center alignment

    // Company name
    commands.push(ESC, 0x21, 0x30); // Double size
    this.addText(commands, 'LENGOLF CO. LTD.');
    commands.push(0x0A, 0x0A);

    commands.push(ESC, 0x21, 0x00); // Normal size

    // Report title
    commands.push(ESC, 0x21, 0x20); // Double height
    this.addText(commands, 'DAILY CLOSING REPORT');
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x00); // Reset

    this.addText(commands, '========================================');
    commands.push(0x0A);

    // Report metadata - left aligned
    commands.push(ESC, 0x61, 0x00);

    const closingDate = new Date(data.closingDate);
    const dateStr = closingDate.toLocaleDateString('en-GB');
    this.addText(commands, `Date: ${dateStr}`);
    commands.push(0x0A);

    if (data.shiftIdentifier) {
      this.addText(commands, `Shift: ${data.shiftIdentifier}`);
      commands.push(0x0A);
    }

    this.addText(commands, `Closed By: ${data.closedByStaffName}`);
    commands.push(0x0A);

    const createdAt = new Date(data.createdAt);
    const timeStr = createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    this.addText(commands, `Time: ${timeStr}`);
    commands.push(0x0A, 0x0A);

    // Expected Amounts Section
    commands.push(ESC, 0x61, 0x01); // Center alignment
    this.addText(commands, '========================================');
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x10); // Bold
    this.addText(commands, 'EXPECTED AMOUNTS');
    commands.push(ESC, 0x21, 0x00); // Reset
    commands.push(0x0A);
    this.addText(commands, '========================================');
    commands.push(0x0A);

    commands.push(ESC, 0x61, 0x00); // Left alignment

    // Format helper - use plain numbers like working receipts
    const formatAmount = (label: string, amount: number) => {
      const amountStr = amount.toFixed(2);
      const spacing = ' '.repeat(Math.max(1, width - label.length - amountStr.length));
      return `${label}${spacing}${amountStr}`;
    };

    this.addText(commands, formatAmount('Cash:', data.expectedCash));
    commands.push(0x0A);
    this.addText(commands, formatAmount('Credit Card:', data.expectedCreditCard));
    commands.push(0x0A);
    this.addText(commands, formatAmount('QR Payments:', data.qrPaymentsTotal));
    commands.push(0x0A);

    if (data.otherPaymentsTotal && data.otherPaymentsTotal > 0) {
      this.addText(commands, formatAmount('Other:', data.otherPaymentsTotal));
      commands.push(0x0A);
    }

    this.addText(commands, '                          ------------');
    commands.push(0x0A);
    this.addText(commands, formatAmount('Total Sales:', data.totalSales));
    commands.push(0x0A, 0x0A);

    // Actual Amounts Section
    commands.push(ESC, 0x61, 0x01); // Center alignment
    this.addText(commands, '========================================');
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x10); // Bold
    this.addText(commands, 'ACTUAL AMOUNTS');
    commands.push(ESC, 0x21, 0x00); // Reset
    commands.push(0x0A);
    this.addText(commands, '========================================');
    commands.push(0x0A);

    commands.push(ESC, 0x61, 0x00); // Left alignment

    this.addText(commands, formatAmount('Cash Counted:', data.actualCash));
    commands.push(0x0A);
    this.addText(commands, formatAmount('Credit Card Batch:', data.actualCreditCard));
    commands.push(0x0A);

    if (data.creditCardBatchReference) {
      this.addText(commands, `Batch Ref: ${data.creditCardBatchReference}`);
      commands.push(0x0A);
    }
    commands.push(0x0A);

    // Variances Section
    commands.push(ESC, 0x61, 0x01); // Center alignment
    this.addText(commands, '========================================');
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x10); // Bold
    this.addText(commands, 'VARIANCES');
    commands.push(ESC, 0x21, 0x00); // Reset
    commands.push(0x0A);
    this.addText(commands, '========================================');
    commands.push(0x0A);

    commands.push(ESC, 0x61, 0x00); // Left alignment

    // Format variance with +/- sign, no Unicode symbols
    const formatVariance = (label: string, variance: number) => {
      const sign = variance >= 0 ? '+' : '-';
      const amountStr = `${sign}${Math.abs(variance).toFixed(2)}`;
      const spacing = ' '.repeat(Math.max(1, width - label.length - amountStr.length));
      return `${label}${spacing}${amountStr}`;
    };

    this.addText(commands, formatVariance('Cash Variance:', data.cashVariance) + (Math.abs(data.cashVariance) > 0.01 ? ' *' : ''));
    commands.push(0x0A);
    this.addText(commands, formatVariance('Credit Card Variance:', data.creditCardVariance) + (Math.abs(data.creditCardVariance) > 0.01 ? ' *' : ''));
    commands.push(0x0A, 0x0A);

    this.addText(commands, '* Negative = Under, Positive = Over');
    commands.push(0x0A, 0x0A);

    // Transaction Summary Section
    commands.push(ESC, 0x61, 0x01); // Center alignment
    this.addText(commands, '========================================');
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x10); // Bold
    this.addText(commands, 'TRANSACTION SUMMARY');
    commands.push(ESC, 0x21, 0x00); // Reset
    commands.push(0x0A);
    this.addText(commands, '========================================');
    commands.push(0x0A);

    commands.push(ESC, 0x61, 0x00); // Left alignment

    const formatNumber = (label: string, num: number) => {
      const numStr = num.toString();
      const spacing = ' '.repeat(Math.max(1, width - label.length - numStr.length));
      return `${label}${spacing}${numStr}`;
    };

    this.addText(commands, formatNumber('Total Transactions:', data.transactionCount));
    commands.push(0x0A);
    this.addText(commands, formatNumber('Voided Transactions:', data.voidedCount));
    commands.push(0x0A);
    this.addText(commands, formatAmount('Voided Amount:', data.voidedAmount));
    commands.push(0x0A, 0x0A);

    // Notes Section (if present)
    if (data.varianceNotes && data.varianceNotes.trim()) {
      commands.push(ESC, 0x61, 0x01); // Center alignment
      this.addText(commands, '========================================');
      commands.push(0x0A);
      commands.push(ESC, 0x21, 0x10); // Bold
      this.addText(commands, 'NOTES');
      commands.push(ESC, 0x21, 0x00); // Reset
      commands.push(0x0A);
      this.addText(commands, '========================================');
      commands.push(0x0A);

      commands.push(ESC, 0x61, 0x00); // Left alignment

      // Word wrap the notes to fit width
      const notes = data.varianceNotes.trim();
      const words = notes.split(' ');
      let currentLine = '';

      words.forEach((word) => {
        if ((currentLine + word).length > width) {
          if (currentLine) {
            this.addText(commands, currentLine.trim());
            commands.push(0x0A);
            currentLine = '';
          }
        }
        currentLine += word + ' ';
      });

      if (currentLine) {
        this.addText(commands, currentLine.trim());
        commands.push(0x0A);
      }

      commands.push(0x0A);
    }

    // Signature Section (like tax invoices)
    commands.push(0x0A);
    commands.push(ESC, 0x61, 0x01); // Center alignment
    this.addText(commands, '________________________');
    commands.push(0x0A);
    this.addText(commands, 'Staff Signature');
    commands.push(0x0A, 0x0A);

    // Final separator
    commands.push(ESC, 0x61, 0x01); // Center alignment
    this.addText(commands, '========================================');
    commands.push(0x0A, 0x0A, 0x0A);

    // Add line feeds
    commands.push(0x0A, 0x0A, 0x0A, 0x0A);

    // Feed and cut paper
    commands.push(ESC, 0x64, 0x03); // Feed 3 lines
    commands.push(GS, 0x56, 0x01);  // Cut paper

    return new Uint8Array(commands);
  }
}