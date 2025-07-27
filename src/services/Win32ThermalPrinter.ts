// Win32 Thermal Printer Service
// Uses Python win32print for direct Windows printer API access
// This bridges the gap between Node.js and Windows printing

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// ESCPOSImageProcessor import removed - logo is now embedded directly

const execAsync = promisify(exec);

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
  transactionDate?: string | Date;
  paxCount?: number;
}

export class Win32ThermalPrinter {
  constructor(private printerName: string = 'LENGOLF') {}

  /**
   * Print receipt using Python win32print - matches working solution
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      console.log(`🖨️ Printing receipt ${receiptData.receiptNumber} to ${this.printerName} via win32print...`);
      
      // Generate ESC/POS commands for thermal printer
      const escposData = this.generateESCPOSData(receiptData);
      
      // Create Python script for win32print
      await this.printViaWin32Print(escposData);
      
      console.log('✅ Receipt printed successfully via Python win32print!');
      
    } catch (error) {
      console.error('❌ Failed to print receipt:', error);
      throw new Error(`Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test printer by sending simple test data
   */
  async testPrinter(): Promise<boolean> {
    try {
      console.log(`🔍 Testing printer ${this.printerName} via win32print...`);
      
      const testData = this.generateTestData();
      await this.printViaWin32Print(testData);
      
      console.log('✅ Test data sent successfully via win32print!');
      return true;
      
    } catch (error) {
      console.error('❌ Printer test failed:', error);
      return false;
    }
  }

  /**
   * Generate ESC/POS command sequence for thermal printer
   */
  private generateESCPOSData(data: ReceiptData): Buffer {
    const commands: number[] = [];
    
    // ESC/POS Commands
    const ESC = 0x1B;
    const GS = 0x1D;
    
    // Initialize printer
    commands.push(ESC, 0x40); // ESC @ - Initialize
    
    // Set character encoding to handle special characters
    commands.push(ESC, 0x74, 0x01); // ESC t 1 - Character code table
    
    // Header - centered
    commands.push(ESC, 0x61, 0x01); // ESC a 1 - Center alignment
    
    // Company name (larger font) - centered
    commands.push(ESC, 0x21, 0x30); // ESC ! 0x30 - Double height and width
    this.addText(commands, 'LENGOLF CO. LTD.');
    commands.push(0x0A, 0x0A); // Line feed
    
    // Reset font size
    commands.push(ESC, 0x21, 0x00); // ESC ! 0x00 - Normal font
    
    // Business info - centered
    this.addText(commands, '540 Mercury Tower, 4th Floor, Unit 407');
    commands.push(0x0A);
    this.addText(commands, 'Ploenchit Road, Lumpini, Pathumwan');
    commands.push(0x0A);
    this.addText(commands, 'Bangkok 10330');
    commands.push(0x0A);
    this.addText(commands, 'TAX ID: 0105566207013');
    commands.push(0x0A, 0x0A);
    
    // TAX INVOICE (ABB) - Bold and prominent
    commands.push(ESC, 0x21, 0x20); // Double height for emphasis
    this.addText(commands, 'TAX INVOICE (ABB)');
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x00); // Reset font
    
    // Separator line - single line
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Receipt details - left aligned
    commands.push(ESC, 0x61, 0x00); // ESC a 0 - Left alignment
    
    this.addText(commands, `Receipt No: ${data.receiptNumber}`);
    commands.push(0x0A);
    
    // Remove table number display
    
    if (data.staffName) {
      this.addText(commands, `Staff: ${data.staffName}`);
      commands.push(0x0A);
    }
    
    // Guest count from actual table session data
    const guestCount = data.paxCount || 1;
    this.addText(commands, `Guests: ${guestCount}`);
    commands.push(0x0A);
    
    // Date on left, time on right (same line) - use transaction date
    const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();
    const dateStr = transactionDate.toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' }); // DD/MM/YY format
    const timeStr = transactionDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }); // HH:MM format
    const dateText = `Date: ${dateStr}`;
    const timeText = `Time: ${timeStr}`;
    const totalLength = dateText.length + timeText.length;
    const spacing = ' '.repeat(Math.max(1, 48 - totalLength));
    this.addText(commands, `${dateText}${spacing}${timeText}`);
    commands.push(0x0A);
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Items - consistent 48-character width
    data.items.forEach(item => {
      const qty = item.qty || 1;
      const itemTotal = item.price * qty;
      
      // Quantity on left, item name, price on right
      const qtyStr = qty.toString();
      const priceStr = itemTotal.toFixed(2);
      const nameMaxLength = 48 - qtyStr.length - priceStr.length - 4;
      const itemName = item.name.length > nameMaxLength ? 
        item.name.substring(0, nameMaxLength - 3) + '...' : item.name;
      
      const itemLine = `${qtyStr}    ${itemName}${' '.repeat(Math.max(1, 48 - qtyStr.length - 4 - itemName.length - priceStr.length))}${priceStr}`;
      this.addText(commands, itemLine);
      commands.push(0x0A);
    });
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Calculate totals based on items (like the example)
    const itemsTotal = data.items.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
    const itemCount = data.items.reduce((sum, item) => sum + (item.qty || 1), 0);
    
    this.addText(commands, `Items: ${itemCount}`);
    commands.push(0x0A, 0x0A);
    
    // Totals section - labels aligned to left, amounts to right like restaurant example
    const leftAlign = 20; // Position where labels start
    
    // Subtotal
    const subtotalAmount = data.subtotal.toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}Subtotal:${' '.repeat(48 - leftAlign - 9 - subtotalAmount.length)}${subtotalAmount}`);
    commands.push(0x0A);
    
    // VAT
    const vatAmount = data.tax.toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}VAT(7%):${' '.repeat(48 - leftAlign - 8 - vatAmount.length)}${vatAmount}`);
    commands.push(0x0A);
    
    // Double line under VAT (before Total) - full width to right
    this.addText(commands, `${' '.repeat(leftAlign)}============================`);
    commands.push(0x0A);
    
    // Total
    const totalAmount = data.total.toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}Total:${' '.repeat(48 - leftAlign - 6 - totalAmount.length)}${totalAmount}`);
    commands.push(0x0A);
    
    commands.push(0x0A);
    
    // Single line before payment
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Payment methods - payment method on left, amount on right (like Master Card BBL style)
    data.paymentMethods.forEach((payment, index) => {
      const methodText = payment.method;
      const amountText = payment.amount.toFixed(2);
      const spacing = ' '.repeat(Math.max(1, 48 - methodText.length - amountText.length));
      this.addText(commands, `${methodText}${spacing}${amountText}`);
      commands.push(0x0A);
    });
    
    // Single line only after payment - remove extra line
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A, 0x0A);
    
    // Footer - centered
    commands.push(ESC, 0x61, 0x01); // Center alignment
    this.addText(commands, 'May your next round be under par!');
    commands.push(0x0A);
    this.addText(commands, 'www.len.golf');
    commands.push(0x0A, 0x0A);
    
    this.addText(commands, `Generated: ${new Date().toLocaleString('th-TH')}`);
    commands.push(0x0A);
    this.addText(commands, 'Powered by Lengolf POS System');
    commands.push(0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x0A); // Extra space for cutting
    
    // Cut paper
    commands.push(GS, 0x56, 0x01); // GS V 1 - Full cut
    
    return Buffer.from(commands);
  }

  /**
   * Generate simple test data
   */
  private generateTestData(): Buffer {
    const commands: number[] = [];
    const ESC = 0x1B;
    const GS = 0x1D;
    
    // Initialize
    commands.push(ESC, 0x40);
    
    // Center alignment
    commands.push(ESC, 0x61, 0x01);
    
    // Test message
    commands.push(ESC, 0x21, 0x30); // Double size
    this.addText(commands, 'LENGOLF TEST');
    commands.push(0x0A);
    
    commands.push(ESC, 0x21, 0x00); // Normal size
    this.addText(commands, 'Win32Print Connection Test');
    commands.push(0x0A, 0x0A);
    
    this.addText(commands, `Time: ${new Date().toLocaleString()}`);
    commands.push(0x0A);
    this.addText(commands, 'Method: Python win32print');
    commands.push(0x0A);
    this.addText(commands, 'Status: SUCCESS');
    commands.push(0x0A, 0x0A);
    
    this.addText(commands, 'If you see this, printing works!');
    commands.push(0x0A, 0x0A, 0x0A, 0x0A);
    
    // Cut
    commands.push(GS, 0x56, 0x01);
    
    return Buffer.from(commands);
  }

  /**
   * Add text to command array (converts string to bytes)
   */
  private addText(commands: number[], text: string): void {
    const bytes = Buffer.from(text, 'utf8');
    for (let i = 0; i < bytes.length; i++) {
      commands.push(bytes[i]);
    }
  }

  /**
   * Create a larger LENGOLF bitmap (384x80 pixels)
   * Maximum width for 80mm printer, properly inverted
   */
  private createLargeLengolfBitmap(): number[] {
    const GS = 0x1D;
    const commands: number[] = [];
    
    // GS v 0 command for 384x80 bitmap (maximum width!)
    commands.push(GS, 0x76, 0x30, 0x00);
    commands.push(0x30, 0x00); // 48 bytes width (384 pixels - full width)
    commands.push(0x50, 0x00); // 80 pixels height
    
    // Create a large block pattern with inverted colors
    // This creates a black rectangle with white border effect
    
    for (let row = 0; row < 80; row++) {
      for (let col = 0; col < 48; col++) {
        // Create border effect
        if (row < 5 || row >= 75 || col < 2 || col >= 46) {
          // Border area - white
          commands.push(0xFF);
        } else if (row >= 20 && row < 60) {
          // Middle area for text effect
          if (col >= 8 && col < 40) {
            // Create simple block pattern for visibility
            if ((row + col) % 4 < 2) {
              commands.push(0x00); // Black
            } else {
              commands.push(0xFF); // White
            }
          } else {
            commands.push(0x00); // Black background
          }
        } else {
          // Top and bottom areas - black
          commands.push(0x00);
        }
      }
    }
    
    return commands;
  }

  /**
   * Print using Python win32print - exact same method as working Python solution
   */
  private async printViaWin32Print(data: Buffer): Promise<void> {
    // Write binary data to temporary file
    const tempDataFile = path.join(os.tmpdir(), `lengolf_print_data_${Date.now()}.bin`);
    const tempPyFile = path.join(os.tmpdir(), `lengolf_printer_${Date.now()}.py`);
    
    fs.writeFileSync(tempDataFile, data);
    
    // Create Python script that matches the working solution
    const pythonScript = `
import win32print
import sys
import os

def print_to_thermal(printer_name, data_file):
    try:
        # Read binary data
        with open(data_file, 'rb') as f:
            raw_data = f.read()
        
        # Open printer handle
        hPrinter = win32print.OpenPrinter(printer_name)
        
        try:
            # Start print job with RAW data type
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("LENGOLF Receipt", None, "RAW"))
            
            try:
                win32print.StartPagePrinter(hPrinter)
                
                # Write raw ESC/POS data
                win32print.WritePrinter(hPrinter, raw_data)
                
                win32print.EndPagePrinter(hPrinter)
                print("SUCCESS: Receipt printed to", printer_name)
                
            finally:
                win32print.EndDocPrinter(hPrinter)
                
        finally:
            win32print.ClosePrinter(hPrinter)
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    printer_name = "${this.printerName}"
    data_file = "${tempDataFile.replace(/\\/g, '\\\\')}"
    
    print(f"Printing to {printer_name} using win32print...")
    print_to_thermal(printer_name, data_file)
`;

    fs.writeFileSync(tempPyFile, pythonScript, 'utf8');
    
    try {
      // Execute Python script with win32print
      const command = `python "${tempPyFile}"`;
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      
      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(`Python error: ${stderr}`);
      }
      
      if (!stdout.includes('SUCCESS')) {
        throw new Error(`Print failed: ${stdout}`);
      }
      
      console.log('✅ Win32Print output:', stdout.trim());
      
    } finally {
      // Clean up temp files
      if (fs.existsSync(tempDataFile)) {
        fs.unlinkSync(tempDataFile);
      }
      if (fs.existsSync(tempPyFile)) {
        fs.unlinkSync(tempPyFile);
      }
    }
  }

  /**
   * Check if Python and win32print are available
   */
  async checkPythonWin32Print(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('python -c "import win32print; print(\'Available\')"');
      return stdout.includes('Available');
    } catch {
      return false;
    }
  }

  /**
   * List available printers using Python win32print
   */
  async listPrintersWin32(): Promise<string[]> {
    try {
      const command = 'python -c "import win32print; printers = [printer[2] for printer in win32print.EnumPrinters(2)]; print(\',\'.join(printers))"';
      const { stdout } = await execAsync(command);
      
      return stdout.trim().split(',').filter(name => name.length > 0);
    } catch (error) {
      console.error('Failed to list printers via win32print:', error);
      return [];
    }
  }
}

// Export singleton instance for LENGOLF printer
export const lengolfWin32Printer = new Win32ThermalPrinter('LENGOLF');