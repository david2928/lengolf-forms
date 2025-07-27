// Modern Thermal Printer Service using node-thermal-printer
// Research-backed solution for Windows thermal printing

import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';

export interface ReceiptItem {
  name: string;
  price: number;
  qty?: number;
  notes?: string;
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
}

export class ModernThermalPrinter {
  private printer: ThermalPrinter;
  private printerName: string;

  constructor(printerName: string = 'LENGOLF') {
    this.printerName = printerName;
    
    // Initialize thermal printer with Windows configuration
    this.printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,  // ESC/POS compatible
      interface: `//./PIPE/${printerName}`,  // Windows printer pipe
      driver: require('printer'),  // Windows printer driver
      characterSet: CharacterSet.PC852_LATIN2,
      options: {
        timeout: 5000,
      },
    });
  }

  /**
   * Print receipt using modern thermal printer library
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      console.log(`🖨️ Printing receipt ${receiptData.receiptNumber} to ${this.printerName}...`);
      
      // Check printer connection
      const isConnected = await this.printer.isPrinterConnected();
      if (!isConnected) {
        throw new Error(`Printer '${this.printerName}' is not connected or not found`);
      }

      // Clear any previous content
      this.printer.clear();

      // Build receipt content
      await this.buildReceiptContent(receiptData);

      // Execute print
      const result = await this.printer.execute();
      
      console.log('✅ Receipt printed successfully!');
      console.log('Print result:', result);

    } catch (error) {
      console.error('❌ Failed to print receipt:', error);
      throw new Error(`Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the receipt content using thermal printer commands
   */
  private async buildReceiptContent(data: ReceiptData): Promise<void> {
    const p = this.printer;

    // Header - Business Info
    p.alignCenter();
    p.setTextSize(1, 1);
    p.bold(true);
    p.println('LENGOLF GOLF CLUB');
    p.bold(false);
    p.setTextNormal();
    p.println('123 Golf Course Road');
    p.println('Bangkok 10120');
    p.println('Tax ID: 1234567890123');
    p.println('Tel: 02-123-4567');
    p.drawLine();

    // Receipt Information
    p.alignLeft();
    p.println(`Receipt No: ${data.receiptNumber}`);
    p.println(`Date: ${new Date().toLocaleString('th-TH')}`);
    
    if (data.tableNumber) {
      p.println(`Table: ${data.tableNumber}`);
    }
    if (data.customerName) {
      p.println(`Customer: ${data.customerName}`);
    }
    if (data.staffName) {
      p.println(`Staff: ${data.staffName}`);
    }
    
    p.drawLine();

    // Items Header
    p.bold(true);
    p.tableCustom([
      { text: 'ITEM', align: 'LEFT', width: 0.6 },
      { text: 'QTY', align: 'CENTER', width: 0.2 },
      { text: 'PRICE', align: 'RIGHT', width: 0.2 }
    ]);
    p.bold(false);
    p.drawLine('-');

    // Items
    data.items.forEach(item => {
      const qty = item.qty || 1;
      const itemTotal = item.price * qty;
      const itemName = item.name.length > 24 ? item.name.substring(0, 21) + '...' : item.name;

      p.tableCustom([
        { text: itemName, align: 'LEFT', width: 0.6 },
        { text: qty.toString(), align: 'CENTER', width: 0.2 },
        { text: itemTotal.toFixed(2), align: 'RIGHT', width: 0.2 }
      ]);

      if (item.notes) {
        p.println(`  Note: ${item.notes}`);
      }
    });

    p.drawLine('-');

    // Totals
    p.tableCustom([
      { text: 'Subtotal:', align: 'LEFT', width: 0.7 },
      { text: data.subtotal.toFixed(2), align: 'RIGHT', width: 0.3 }
    ]);
    
    p.tableCustom([
      { text: 'VAT (7%):', align: 'LEFT', width: 0.7 },
      { text: data.tax.toFixed(2), align: 'RIGHT', width: 0.3 }
    ]);

    p.drawLine('=');
    
    // Total (emphasized)
    p.bold(true);
    p.setTextSize(1, 1);
    p.tableCustom([
      { text: 'TOTAL:', align: 'LEFT', width: 0.7 },
      { text: data.total.toFixed(2), align: 'RIGHT', width: 0.3 }
    ]);
    p.setTextNormal();
    p.bold(false);
    
    p.drawLine('=');

    // Payment Methods
    p.newLine();
    p.bold(true);
    p.println('PAYMENT:');
    p.bold(false);
    
    data.paymentMethods.forEach(payment => {
      p.tableCustom([
        { text: `  ${payment.method}:`, align: 'LEFT', width: 0.7 },
        { text: payment.amount.toFixed(2), align: 'RIGHT', width: 0.3 }
      ]);
    });

    // Footer
    p.newLine();
    p.drawLine('=');
    p.alignCenter();
    p.bold(true);
    p.println('Thank you for dining with us!');
    p.bold(false);
    p.newLine();
    p.println('Visit us again soon!');
    p.println('www.lengolf.com');
    p.newLine();
    p.setTextSize(0, 0);
    p.println(`Generated: ${new Date().toLocaleString('th-TH')}`);
    p.println('Powered by Lengolf POS');
    
    // Cut paper
    p.cut();
  }

  /**
   * Print plain text (fallback method)
   */
  async printPlainText(text: string): Promise<void> {
    try {
      this.printer.clear();
      this.printer.println(text);
      this.printer.cut();
      
      await this.printer.execute();
      console.log('✅ Plain text printed successfully!');
    } catch (error) {
      console.error('❌ Failed to print plain text:', error);
      throw error;
    }
  }

  /**
   * Test printer connectivity
   */
  async testPrinter(): Promise<boolean> {
    try {
      const isConnected = await this.printer.isPrinterConnected();
      console.log(`🔍 Printer '${this.printerName}' connected:`, isConnected);
      
      if (isConnected) {
        // Print test page
        this.printer.clear();
        this.printer.alignCenter();
        this.printer.bold(true);
        this.printer.println('PRINTER TEST');
        this.printer.bold(false);
        this.printer.drawLine();
        this.printer.println(`Printer: ${this.printerName}`);
        this.printer.println(`Time: ${new Date().toLocaleString()}`);
        this.printer.println('✅ Connection successful!');
        this.printer.cut();
        
        await this.printer.execute();
        console.log('✅ Test page printed!');
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ Printer test failed:', error);
      return false;
    }
  }

  /**
   * Get printer status
   */
  async getPrinterStatus(): Promise<any> {
    try {
      // Check if printer is connected/initialized
      return { 
        connected: this.printer !== null,
        ready: true 
      };
    } catch (error) {
      console.error('Failed to get printer status:', error);
      return null;
    }
  }
}

// Export singleton instance for LENGOLF printer
export const lengolfPrinter = new ModernThermalPrinter('LENGOLF');