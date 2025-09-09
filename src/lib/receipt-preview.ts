// Shared Receipt Preview Generator
// Used by both ReceiptFormatter and test-printer page to ensure consistency

import type { ReceiptData } from './receipt-formatter';

export class ReceiptPreview {
  private static readonly THERMAL_WIDTH = 48; // 80mm thermal printer width in characters

  /**
   * Generate thermal receipt preview as text lines
   * Used by both ESC/POS formatter and HTML preview
   */
  static generatePreviewLines(data: ReceiptData, isTaxInvoice: boolean = false, isBill: boolean = false): string[] {
    // Ensure required arrays are defined to prevent errors
    if (!data.items) {
      data.items = [];
    }
    if (!data.paymentMethods) {
      data.paymentMethods = [{ method: 'Cash', amount: data.total }];
    }
    
    const lines: string[] = [];
    const width = this.THERMAL_WIDTH;
    
    // Company name (larger effect)
    lines.push(this.centerText('L E N G O L F   C O .   L T D .', width));
    lines.push('');
    
    // Business info
    lines.push(this.centerText('540 Mercury Tower, 4th Floor, Unit 407', width));
    lines.push(this.centerText('Ploenchit Road, Lumpini, Pathumwan', width));
    lines.push(this.centerText('Bangkok 10330', width));
    lines.push(this.centerText('TAX ID: 0105566207013', width));
    lines.push('');
    
    // Receipt type
    if (isTaxInvoice) {
      lines.push(this.centerText('Receipt / TAX Invoice (Original)', width));
    } else if (isBill) {
      lines.push(this.centerText('BILL', width));
    } else {
      lines.push(this.centerText('TAX Invoice (ABB)', width));
    }
    lines.push('------------------------------------------------');
    
    // Receipt details
    if (!isBill) {
      lines.push(`Receipt No: ${data.receiptNumber}`);
    }
    
    if (data.staffName) {
      lines.push(`Staff: ${data.staffName}`);
    }
    
    // Guest count
    const guestCount = data.paxCount || 1;
    lines.push(`Guests: ${guestCount}`);
    
    // Date and time
    const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();
    const dateStr = transactionDate.toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const timeStr = transactionDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dateText = `Date: ${dateStr}`;
    const timeText = `Time: ${timeStr}`;
    const totalLength = dateText.length + timeText.length;
    const spacing = ' '.repeat(Math.max(1, width - totalLength));
    lines.push(`${dateText}${spacing}${timeText}`);
    
    lines.push('------------------------------------------------');
    
    // Items
    const items = data.items || [];
    items.forEach(item => {
      const qty = item.qty || 1;
      
      // Handle different data structures:
      // - Bills: item.price is unit price, item.totalPrice is line total
      // - Receipts: item.price is already line total, no totalPrice field
      let originalTotal;
      if (isBill && item.totalPrice !== undefined) {
        // Bill structure: for discounted items, show original price + discount line
        if (item.itemDiscount && (item.itemDiscount.amount || 0) > 0) {
          // Show original price before discount
          originalTotal = item.totalPrice + (item.itemDiscount.amount || 0);
        } else {
          // No discount, use totalPrice directly
          originalTotal = item.totalPrice;
        }
      } else {
        // Receipt structure: item.price is already line total
        const originalPrice = item.originalPrice || item.price;
        originalTotal = originalPrice;
      }
      
      const qtyStr = qty.toString();
      const priceStr = originalTotal.toFixed(2);
      const nameMaxLength = width - qtyStr.length - priceStr.length - 4;
      const itemName = item.name.length > nameMaxLength ? 
        item.name.substring(0, nameMaxLength - 3) + '...' : item.name;
      
      const spaces = ' '.repeat(Math.max(1, width - qtyStr.length - 4 - itemName.length - priceStr.length));
      lines.push(`${qtyStr}    ${itemName}${spaces}${priceStr}`);
      
      // Show item discount if applicable - handle both bill and receipt structures
      if (item.itemDiscount) {
        // Bill structure uses item.itemDiscount.amount, receipt uses item.itemDiscountAmount
        const discountAmount = item.itemDiscountAmount || item.itemDiscount.amount || 0;
        if (discountAmount > 0) {
          const discountLabel = `     ${item.itemDiscount.title}`;
          const discountAmountStr = `-${discountAmount.toFixed(2)}`;
          const discountSpacing = ' '.repeat(Math.max(1, width - discountLabel.length - discountAmountStr.length));
          lines.push(`${discountLabel}${discountSpacing}${discountAmountStr}`);
        }
      }
      
      if (item.notes) {
        lines.push(`  Note: ${item.notes}`);
      }
    });
    
    lines.push('------------------------------------------------');
    
    // Items count - count line items, not quantities
    const itemCount = items.length;
    lines.push(`Items: ${itemCount}`);
    lines.push('');
    
    // Totals section
    const leftAlign = 20;
    
    // Original subtotal (before discount)
    const originalSubtotal = (data.orderItemsTotal || data.subtotal || 0);
    const originalSubtotalStr = originalSubtotal.toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}Subtotal:${' '.repeat(width - leftAlign - 9 - originalSubtotalStr.length)}${originalSubtotalStr}`);
    
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
      lines.push(`${' '.repeat(leftAlign)}${discountLabel}${discountSpacing}${discountAmountStr}`);
    }
    
    // VAT (calculated from final amount)
    const vatAmount = (data.tax || 0).toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}VAT(7%) incl.:${' '.repeat(width - leftAlign - 14 - vatAmount.length)}${vatAmount}`);
    
    // Double line under VAT
    lines.push(`${' '.repeat(leftAlign)}============================`);
    
    // Total
    const totalAmount = (data.total || 0).toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}Total:${' '.repeat(width - leftAlign - 6 - totalAmount.length)}${totalAmount}`);
    
    lines.push('');
    lines.push('------------------------------------------------');
    
    if (isBill) {
      // For bills, show amount due and available payment options
      const totalAmount = (data.total || 0);
      lines.push(`AMOUNT DUE: THB ${totalAmount.toFixed(2)}`);
      lines.push('');
      
      lines.push('PAYMENT OPTIONS AVAILABLE:');
      lines.push('- Cash');
      lines.push('- PromptPay (QR Code)');
      lines.push('- Visa/Mastercard (EDC)');
      lines.push('- Alipay');
    } else {
      // Payment method
      if (data.paymentMethods && data.paymentMethods.length > 0) {
        data.paymentMethods.forEach((payment) => {
          const methodText = payment.method;
          const amountText = payment.amount.toFixed(2);
          const paymentSpacing = ' '.repeat(Math.max(1, width - methodText.length - amountText.length));
          lines.push(`${methodText}${paymentSpacing}${amountText}`);
        });
      }
    }
    
    lines.push('------------------------------------------------');
    
    // Tax invoice customer information (right after payment)
    if (isTaxInvoice) {
      // Use stored tax invoice customer information if available
      if (data.taxInvoiceData && data.taxInvoiceData.customerName) {
        lines.push(`Customer Name: ${data.taxInvoiceData.customerName}`);
        
        if (data.taxInvoiceData.customerAddress) {
          // Split long addresses into multiple lines
          const addressLines = data.taxInvoiceData.customerAddress.match(/.{1,46}/g) || [data.taxInvoiceData.customerAddress];
          addressLines.forEach((line: string, index: number) => {
            lines.push(index === 0 ? `Address: ${line}` : `         ${line}`);
          });
        } else {
          lines.push(`Address: [To be filled by customer]`);
        }
        lines.push('');
        
        if (data.taxInvoiceData.customerTaxId) {
          lines.push(`TAX ID: ${data.taxInvoiceData.customerTaxId}`);
        } else {
          lines.push(`TAX ID: [To be filled by customer]`);
        }
      } else {
        // Fallback to basic customer name or placeholders
        lines.push(`Customer Name: ${data.customerName || '[To be filled by customer]'}`);
        lines.push(`Address: [To be filled by customer]`);
        lines.push('');
        lines.push(`TAX ID: [To be filled by customer]`);
      }
      
      lines.push('');
    }
    
    // Tax invoice specific sections (before footer)
    if (isTaxInvoice) {
      // Signature section
      lines.push('');
      lines.push(this.centerText('________________________', width));
      lines.push(this.centerText('Signature Cashier', width));
      lines.push('');
      
      // ABB reference with lines around it
      lines.push('------------------------------------------------');
      lines.push(`Issued to replace the TAX invoice (ABB)`);
      lines.push(`number: ${data.receiptNumber}`);
      lines.push('------------------------------------------------');
      lines.push('');
    }
    
    // Footer
    lines.push(this.centerText('You\'re tee-rific. Come back soon!', width));
    lines.push('');
    
    lines.push(this.centerText('LENGOLF', width));
    lines.push(this.centerText('@lengolf | www.len.golf', width));
    lines.push(this.centerText('Tel: 096-668-2335', width));
    lines.push('');
    
    return lines;
  }

  /**
   * Generate thermal receipt preview as a single string
   * Used by test-printer page for HTML display
   */
  static generatePreviewText(data: ReceiptData, isTaxInvoice: boolean = false, isBill: boolean = false): string {
    const lines = this.generatePreviewLines(data, isTaxInvoice, isBill);
    return lines.join('\n');
  }

  /**
   * Helper function to center text
   */
  private static centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }
}