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
    const isThaiPrimary = language === 'th';
    const lines: string[] = [];
    
    // Header
    lines.push(this.centerText(receiptData.businessInfo.name, 32));
    lines.push(this.centerText(receiptData.businessInfo.address, 32));
    lines.push(this.centerText(`Tax ID: ${receiptData.businessInfo.taxId}`, 32));
    lines.push(this.centerText(`Tel: ${receiptData.businessInfo.phone}`, 32));
    lines.push(this.printLine(32));
    
    // Receipt info
    lines.push(`Receipt No: ${receiptData.receiptNumber}`);
    lines.push(`Date: ${this.formatDateTime(receiptData.transaction.date)}`);
    if (receiptData.transaction.tableNumber) {
      lines.push(`Table: ${receiptData.transaction.tableNumber}`);
    }
    if (receiptData.transaction.customerName) {
      lines.push(`Customer: ${receiptData.transaction.customerName}`);
    }
    lines.push(`Staff: ${receiptData.transaction.staffName}`);
    lines.push(this.printLine(32));
    
    // Items
    lines.push(this.padText('Item', 'Qty', 'Price', 32));
    lines.push(this.printLine(32, '-'));
    
    receiptData.transaction.items.forEach(item => {
      const name = this.truncateText(item.name, 20);
      lines.push(name);
      const qtyPrice = `${item.quantity}x${this.formatCurrency(item.unitPrice, false)}`;
      const total = this.formatCurrency(item.totalPrice, false);
      lines.push(this.padText('', qtyPrice, total, 32));
      if (item.notes) {
        lines.push(`  Note: ${this.truncateText(item.notes, 28)}`);
      }
    });
    
    lines.push(this.printLine(32, '-'));
    
    // Totals
    lines.push(this.padText('Subtotal:', '', this.formatCurrency(receiptData.transaction.subtotal, false), 32));
    lines.push(this.padText('VAT (7%):', '', this.formatCurrency(receiptData.transaction.vatAmount, false), 32));
    lines.push(this.padText('TOTAL:', '', this.formatCurrency(receiptData.transaction.totalAmount, false), 32));
    lines.push(this.printLine(32));
    
    // Payment methods
    lines.push('Payment:');
    receiptData.transaction.paymentMethods.forEach(payment => {
      const methodName = this.truncateText(payment.method, 15);
      const amount = this.formatCurrency(payment.amount, false);
      lines.push(this.padText(`  ${methodName}:`, '', amount, 32));
    });
    
    lines.push(this.printLine(32));
    
    // Footer
    lines.push(this.centerText(receiptData.footer.thankYouMessage, 32));
    if (receiptData.footer.returnPolicy) {
      lines.push('');
      lines.push(this.centerText('Return Policy:', 32));
      lines.push(this.wrapText(receiptData.footer.returnPolicy, 32));
    }
    
    lines.push('');
    lines.push(this.centerText(`Generated: ${this.formatDateTime(new Date())}`, 32));
    
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
      itemCount: receiptData.transaction.items.length,
      paymentMethods: receiptData.transaction.paymentMethods.map(p => p.method),
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
    const itemsRows = receiptData.transaction.items.map(item => `
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
        ${receiptData.transaction.paymentMethods.map(payment => `
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
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export singleton instance
export const receiptGenerator = new ReceiptGenerator();