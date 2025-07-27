// Receipt Generation Service
// Handles Thai tax-compliant receipt generation for POS transactions

import { 
  ReceiptData, 
  ReceiptItem, 
  Transaction, 
  PaymentAllocation 
} from '@/types/payment';
import { Order } from '@/types/pos';
import { RECEIPT_CONFIG } from '@/config/payment-methods';

export class ReceiptGenerator {
  
  /**
   * Generate receipt data from transaction
   */
  generateReceiptData(
    transaction: Transaction,
    order: Order,
    options: {
      customerName?: string;
      tableNumber?: string;
      staffName?: string;
      includeItemDetails?: boolean;
    } = {}
  ): ReceiptData {
    
    const receiptItems: ReceiptItem[] = order.items.map(item => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      notes: item.notes
    }));

    return {
      transactionId: transaction.transactionId,
      receiptNumber: transaction.receiptNumber,
      businessInfo: {
        name: RECEIPT_CONFIG.businessInfo.name,
        address: RECEIPT_CONFIG.businessInfo.address,
        taxId: RECEIPT_CONFIG.businessInfo.taxId,
        phone: RECEIPT_CONFIG.businessInfo.phone
      },
      transaction: {
        date: transaction.transactionDate,
        tableNumber: options.tableNumber || transaction.tableNumber,
        staffName: options.staffName || `Staff-${transaction.staffPin}`,
        customerName: options.customerName || transaction.customerName,
        items: receiptItems,
        subtotal: transaction.subtotal,
        vatAmount: transaction.vatAmount,
        totalAmount: transaction.totalAmount,
        paymentMethods: transaction.paymentMethods
      },
      footer: {
        thankYouMessage: RECEIPT_CONFIG.footer.thankYouMessage,
        returnPolicy: RECEIPT_CONFIG.footer.returnPolicy
      }
    };
  }

  /**
   * Generate HTML receipt for printing
   */
  generateHTMLReceipt(receiptData: ReceiptData, language: 'th' | 'en' = 'en'): string {
    const isThaiPrimary = language === 'th';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt ${receiptData.receiptNumber}</title>
    <style>
        ${this.getReceiptCSS()}
    </style>
</head>
<body>
    <div class="receipt">
        ${this.generateReceiptHeader(receiptData, isThaiPrimary)}
        ${this.generateReceiptBody(receiptData, isThaiPrimary)}
        ${this.generateReceiptFooter(receiptData, isThaiPrimary)}
    </div>
</body>
</html>`;
  }

  /**
   * Generate receipt for thermal printer (58mm width)
   */
  generateThermalReceipt(receiptData: ReceiptData, language: 'th' | 'en' = 'en'): string {
    return this.generateThermalReceiptWithWidth(receiptData, language, 32);
  }

  /**
   * Generate receipt for 80mm thermal printer (wider format)
   */
  generateThermalReceipt80mm(receiptData: ReceiptData, language: 'th' | 'en' = 'en'): string {
    return this.generateThermalReceiptWithWidth(receiptData, language, 48);
  }

  /**
   * Generate thermal receipt with configurable width
   */
  private generateThermalReceiptWithWidth(receiptData: ReceiptData, language: 'th' | 'en' = 'en', width: number): string {
    const isThaiPrimary = language === 'th';
    const lines: string[] = [];
    const isWide = width >= 40; // 80mm printer has ~48 chars width
    
    // Header with enhanced formatting for 80mm
    if (isWide) {
      lines.push(this.printLine(width, '='));
      lines.push(this.centerText('*** RECEIPT ***', width));
      lines.push(this.printLine(width, '='));
      lines.push('');
      lines.push(this.centerText(receiptData.businessInfo.name.toUpperCase(), width));
      lines.push(this.centerText(receiptData.businessInfo.address, width));
      lines.push(this.centerText(`Tax ID: ${receiptData.businessInfo.taxId}`, width));
      lines.push(this.centerText(`Tel: ${receiptData.businessInfo.phone}`, width));
      lines.push('');
      lines.push(this.printLine(width, '='));
    } else {
      // Original 58mm format
      lines.push(this.centerText(receiptData.businessInfo.name, width));
      lines.push(this.centerText(receiptData.businessInfo.address, width));
      lines.push(this.centerText(`Tax ID: ${receiptData.businessInfo.taxId}`, width));
      lines.push(this.centerText(`Tel: ${receiptData.businessInfo.phone}`, width));
      lines.push(this.printLine(width));
    }
    
    // Receipt info with better formatting for 80mm
    if (isWide) {
      lines.push(this.padText('Receipt No:', receiptData.receiptNumber, '', width));
      lines.push(this.padText('Date:', this.formatDateTime(receiptData.transaction.date), '', width));
      if (receiptData.transaction.tableNumber) {
        lines.push(this.padText('Table:', receiptData.transaction.tableNumber, '', width));
      }
      if (receiptData.transaction.customerName) {
        lines.push(this.padText('Customer:', this.truncateText(receiptData.transaction.customerName, 25), '', width));
      }
      lines.push(this.padText('Staff:', receiptData.transaction.staffName, '', width));
    } else {
      lines.push(`Receipt No: ${receiptData.receiptNumber}`);
      lines.push(`Date: ${this.formatDateTime(receiptData.transaction.date)}`);
      if (receiptData.transaction.tableNumber) {
        lines.push(`Table: ${receiptData.transaction.tableNumber}`);
      }
      if (receiptData.transaction.customerName) {
        lines.push(`Customer: ${receiptData.transaction.customerName}`);
      }
      lines.push(`Staff: ${receiptData.transaction.staffName}`);
    }
    
    lines.push(this.printLine(width, '='));
    
    // Items header with better spacing for 80mm
    if (isWide) {
      lines.push(this.padText('ITEM', 'QTY', 'PRICE', width));
      lines.push(this.printLine(width, '-'));
      
      (receiptData.transaction.items || []).forEach(item => {
        const itemName = this.truncateText(item.name, width - 20);
        lines.push(itemName);
        
        const qtyText = `${item.quantity}x`;
        const unitPriceText = this.formatCurrency(item.unitPrice, false);
        const totalPriceText = this.formatCurrency(item.totalPrice, false);
        
        lines.push(this.padText(qtyText, unitPriceText, totalPriceText, width));
        
        if (item.notes) {
          lines.push(`  Note: ${this.truncateText(item.notes, width - 8)}`);
        }
        lines.push(''); // Empty line between items for better readability
      });
    } else {
      // Original 58mm format
      lines.push(this.padText('Item', 'Qty', 'Price', width));
      lines.push(this.printLine(width, '-'));
      
      (receiptData.transaction.items || []).forEach(item => {
        const name = this.truncateText(item.name, 20);
        lines.push(name);
        const qtyPrice = `${item.quantity}x${this.formatCurrency(item.unitPrice, false)}`;
        const total = this.formatCurrency(item.totalPrice, false);
        lines.push(this.padText('', qtyPrice, total, width));
        if (item.notes) {
          lines.push(`  Note: ${this.truncateText(item.notes, width - 8)}`);
        }
      });
    }
    
    lines.push(this.printLine(width, '-'));
    
    // Totals with enhanced formatting for 80mm
    if (isWide) {
      lines.push('');
      lines.push(this.padText('Subtotal:', '', this.formatCurrency(receiptData.transaction.subtotal, false), width));
      lines.push(this.padText('VAT (7%):', '', `+ ${this.formatCurrency(receiptData.transaction.vatAmount, false)}`, width));
      lines.push(this.printLine(width, '='));
      lines.push(this.padText('TOTAL:', '', this.formatCurrency(receiptData.transaction.totalAmount, false), width));
      lines.push(this.printLine(width, '='));
    } else {
      lines.push(this.padText('Subtotal:', '', this.formatCurrency(receiptData.transaction.subtotal, false), width));
      lines.push(this.padText('VAT (7%):', '', this.formatCurrency(receiptData.transaction.vatAmount, false), width));
      lines.push(this.padText('TOTAL:', '', this.formatCurrency(receiptData.transaction.totalAmount, false), width));
      lines.push(this.printLine(width));
    }
    
    // Payment methods with better formatting
    lines.push('');
    if (isWide) {
      lines.push(this.centerText('PAYMENT DETAILS', width));
      lines.push(this.printLine(width, '-'));
      (receiptData.transaction.paymentMethods || []).forEach(payment => {
        const methodName = payment.method;
        const amount = this.formatCurrency(payment.amount, false);
        lines.push(this.padText(methodName, '', amount, width));
      });
    } else {
      lines.push('Payment:');
      (receiptData.transaction.paymentMethods || []).forEach(payment => {
        const methodName = this.truncateText(payment.method, 15);
        const amount = this.formatCurrency(payment.amount, false);
        lines.push(this.padText(`  ${methodName}:`, '', amount, width));
      });
    }
    
    lines.push(this.printLine(width, '='));
    
    // Footer with enhanced formatting for 80mm
    lines.push('');
    if (isWide) {
      lines.push(this.centerText('🎉 ' + receiptData.footer.thankYouMessage + ' 🎉', width));
      lines.push('');
      if (receiptData.footer.returnPolicy) {
        lines.push(this.centerText('RETURN POLICY', width));
        lines.push(this.printLine(width, '-'));
        lines.push(this.wrapText(receiptData.footer.returnPolicy, width));
        lines.push('');
      }
      lines.push(this.centerText('Visit us again soon!', width));
      lines.push(this.centerText('www.lengolf.com', width));
    } else {
      lines.push(this.centerText(receiptData.footer.thankYouMessage, width));
      if (receiptData.footer.returnPolicy) {
        lines.push('');
        lines.push(this.centerText('Return Policy:', width));
        lines.push(this.wrapText(receiptData.footer.returnPolicy, width));
      }
    }
    
    lines.push('');
    lines.push(this.printLine(width, '='));
    lines.push(this.centerText(`Generated: ${this.formatDateTime(new Date())}`, width));
    if (isWide) {
      lines.push(this.centerText('Powered by Lengolf POS System', width));
    }
    lines.push(this.printLine(width, '='));
    
    return lines.join('\n');
  }

  /**
   * Generate receipt summary for display
   */
  generateReceiptSummary(receiptData: ReceiptData): {
    receiptNumber: string;
    totalAmount: number;
    itemCount: number;
    paymentMethods: string[];
    date: string;
  } {
    return {
      receiptNumber: receiptData.receiptNumber,
      totalAmount: receiptData.transaction.totalAmount,
      itemCount: receiptData.transaction.items?.length || 0,
      paymentMethods: receiptData.transaction.paymentMethods?.map(p => p.method) || [],
      date: this.formatDate(receiptData.transaction.date)
    };
  }

  // Private helper methods

  private getReceiptCSS(): string {
    return `
      @page { 
        size: A4; 
        margin: 1cm; 
      }
      
      .receipt {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        border: 1px solid #ddd;
      }
      
      .receipt-header {
        text-align: center;
        border-bottom: 2px solid #333;
        padding-bottom: 15px;
        margin-bottom: 15px;
      }
      
      .business-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .business-info {
        font-size: 10px;
        color: #666;
      }
      
      .receipt-info {
        margin-bottom: 15px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 10px;
      }
      
      .receipt-info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
      }
      
      .items-table {
        width: 100%;
        margin-bottom: 15px;
        border-collapse: collapse;
      }
      
      .items-table th,
      .items-table td {
        text-align: left;
        padding: 5px 8px;
        border-bottom: 1px solid #eee;
      }
      
      .items-table th {
        background-color: #f5f5f5;
        font-weight: bold;
        border-bottom: 2px solid #ddd;
      }
      
      .item-name {
        font-weight: 500;
      }
      
      .item-notes {
        font-size: 10px;
        color: #666;
        font-style: italic;
      }
      
      .totals-section {
        margin-top: 15px;
        padding-top: 10px;
        border-top: 2px solid #333;
      }
      
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      
      .total-row.final-total {
        font-weight: bold;
        font-size: 14px;
        border-top: 1px solid #333;
        padding-top: 5px;
        margin-top: 10px;
      }
      
      .payment-methods {
        margin-top: 15px;
        padding-top: 10px;
        border-top: 1px solid #ddd;
      }
      
      .payment-method {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
      }
      
      .receipt-footer {
        text-align: center;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 2px solid #333;
        font-size: 10px;
        color: #666;
      }
      
      .thank-you {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #333;
      }
      
      @media print {
        body { margin: 0; }
        .receipt { border: none; box-shadow: none; }
      }
    `;
  }

  private generateReceiptHeader(receiptData: ReceiptData, isThaiPrimary: boolean): string {
    return `
      <div class="receipt-header">
        <div class="business-name">${receiptData.businessInfo.name}</div>
        <div class="business-info">
          <div>${receiptData.businessInfo.address}</div>
          <div>Tax ID: ${receiptData.businessInfo.taxId}</div>
          <div>Tel: ${receiptData.businessInfo.phone}</div>
        </div>
      </div>
    `;
  }

  private generateReceiptBody(receiptData: ReceiptData, isThaiPrimary: boolean): string {
    const itemsRows = (receiptData.transaction.items || []).map(item => `
      <tr>
        <td class="item-name">${this.escapeHtml(item.name)}</td>
        <td>${item.quantity}</td>
        <td>${this.formatCurrency(item.unitPrice)}</td>
        <td>${this.formatCurrency(item.totalPrice)}</td>
      </tr>
      ${item.notes ? `<tr><td colspan="4" class="item-notes">Note: ${this.escapeHtml(item.notes)}</td></tr>` : ''}
    `).join('');

    return `
      <div class="receipt-info">
        <div class="receipt-info-row">
          <span>Receipt No:</span>
          <span>${receiptData.receiptNumber}</span>
        </div>
        <div class="receipt-info-row">
          <span>Date:</span>
          <span>${this.formatDateTime(receiptData.transaction.date)}</span>
        </div>
        ${receiptData.transaction.tableNumber ? `
        <div class="receipt-info-row">
          <span>Table:</span>
          <span>${receiptData.transaction.tableNumber}</span>
        </div>` : ''}
        ${receiptData.transaction.customerName ? `
        <div class="receipt-info-row">
          <span>Customer:</span>
          <span>${this.escapeHtml(receiptData.transaction.customerName)}</span>
        </div>` : ''}
        <div class="receipt-info-row">
          <span>Staff:</span>
          <span>${this.escapeHtml(receiptData.transaction.staffName)}</span>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${this.formatCurrency(receiptData.transaction.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>VAT (7%):</span>
          <span>${this.formatCurrency(receiptData.transaction.vatAmount)}</span>
        </div>
        <div class="total-row final-total">
          <span>TOTAL:</span>
          <span>${this.formatCurrency(receiptData.transaction.totalAmount)}</span>
        </div>
      </div>

      <div class="payment-methods">
        <strong>Payment:</strong>
        ${(receiptData.transaction.paymentMethods || []).map(payment => `
          <div class="payment-method">
            <span>${payment.method}:</span>
            <span>${this.formatCurrency(payment.amount)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  private generateReceiptFooter(receiptData: ReceiptData, isThaiPrimary: boolean): string {
    return `
      <div class="receipt-footer">
        <div class="thank-you">${receiptData.footer.thankYouMessage}</div>
        ${receiptData.footer.returnPolicy ? `
          <div>Return Policy: ${receiptData.footer.returnPolicy}</div>
        ` : ''}
        <div style="margin-top: 10px;">
          Generated: ${this.formatDateTime(new Date())}
        </div>
      </div>
    `;
  }

  // Thermal printer helper methods
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private padText(left: string, center: string, right: string, width: number): string {
    const rightLen = right.length;
    const leftLen = left.length;
    const centerLen = center.length;
    
    const availableSpace = width - rightLen - leftLen;
    const centerPadding = Math.max(0, availableSpace - centerLen);
    
    return left + center + ' '.repeat(centerPadding) + right;
  }

  private printLine(width: number, char: string = '='): string {
    return char.repeat(width);
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    const str = String(text);
    return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
  }

  private wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length > width) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          lines.push(word);
        }
      } else {
        currentLine += word + ' ';
      }
    });

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines.join('\n');
  }

  // Formatting helper methods
  private formatCurrency(amount: number, includeSymbol: boolean = true): string {
    const formatted = amount.toFixed(2);
    return includeSymbol ? `฿${formatted}` : formatted;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Export singleton instance
export const receiptGenerator = new ReceiptGenerator();