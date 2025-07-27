// Direct COM Port Printer Service for LENGOLF on COM4
// Uses direct serial communication for reliable thermal printing

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
}

export class DirectCOMPrinter {
  constructor(private comPort: string = 'COM4') {}

  /**
   * Print receipt using direct COM port communication
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      console.log(`🖨️ Printing receipt ${receiptData.receiptNumber} to ${this.comPort}...`);
      
      // Generate ESC/POS commands for thermal printer
      const escposData = this.generateESCPOSData(receiptData);
      
      // Send directly to COM port
      await this.sendToCOMPort(escposData);
      
      console.log('✅ Receipt printed successfully to COM4!');
      
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
      console.log(`🔍 Testing printer on ${this.comPort}...`);
      
      const testData = this.generateTestData();
      await this.sendToCOMPort(testData);
      
      console.log('✅ Test data sent successfully!');
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
    
    // Store name (larger font)
    commands.push(ESC, 0x21, 0x30); // ESC ! 0x30 - Double height and width
    this.addText(commands, 'LENGOLF GOLF CLUB');
    commands.push(0x0A); // Line feed
    
    // Reset font size
    commands.push(ESC, 0x21, 0x00); // ESC ! 0x00 - Normal font
    
    // Business info
    this.addText(commands, '123 Golf Course Road');
    commands.push(0x0A);
    this.addText(commands, 'Bangkok 10120');
    commands.push(0x0A);
    this.addText(commands, 'Tax ID: 1234567890123');
    commands.push(0x0A);
    this.addText(commands, 'Tel: 02-123-4567');
    commands.push(0x0A, 0x0A);
    
    // Separator line
    this.addText(commands, '================================================');
    commands.push(0x0A);
    
    // Receipt details - left aligned
    commands.push(ESC, 0x61, 0x00); // ESC a 0 - Left alignment
    
    this.addText(commands, `Receipt No: ${data.receiptNumber}`);
    commands.push(0x0A);
    
    this.addText(commands, `Date: ${new Date().toLocaleString('th-TH')}`);
    commands.push(0x0A);
    
    if (data.tableNumber) {
      this.addText(commands, `Table: ${data.tableNumber}`);
      commands.push(0x0A);
    }
    
    if (data.customerName) {
      this.addText(commands, `Customer: ${data.customerName}`);
      commands.push(0x0A);
    }
    
    if (data.staffName) {
      this.addText(commands, `Staff: ${data.staffName}`);
      commands.push(0x0A);
    }
    
    this.addText(commands, '================================================');
    commands.push(0x0A);
    
    // Items header
    this.addText(commands, 'ITEM                              QTY    PRICE');
    commands.push(0x0A);
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Items
    data.items.forEach(item => {
      const qty = item.qty || 1;
      const itemTotal = item.price * qty;
      
      // Item name (truncate if too long)
      const itemName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
      this.addText(commands, itemName);
      commands.push(0x0A);
      
      // Quantity and price on next line
      const qtyPriceLine = `${qty}x @ ${item.price.toFixed(2)}`.padStart(32) + itemTotal.toFixed(2).padStart(16);
      this.addText(commands, qtyPriceLine);
      commands.push(0x0A);
      
      if (item.notes) {
        this.addText(commands, `  Note: ${item.notes}`);
        commands.push(0x0A);
      }
      
      commands.push(0x0A); // Empty line between items
    });
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A, 0x0A);
    
    // Totals
    const subtotalLine = `Subtotal:`.padEnd(40) + data.subtotal.toFixed(2).padStart(8);
    this.addText(commands, subtotalLine);
    commands.push(0x0A);
    
    const vatLine = `VAT (7%):`.padEnd(40) + data.tax.toFixed(2).padStart(8);
    this.addText(commands, vatLine);
    commands.push(0x0A);
    
    this.addText(commands, '================================================');
    commands.push(0x0A);
    
    // Total (emphasized)
    commands.push(ESC, 0x21, 0x20); // ESC ! 0x20 - Double height
    const totalLine = `TOTAL:`.padEnd(32) + data.total.toFixed(2).padStart(16);
    this.addText(commands, totalLine);
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x00); // Reset font
    
    this.addText(commands, '================================================');
    commands.push(0x0A, 0x0A);
    
    // Payment methods
    this.addText(commands, 'PAYMENT:');
    commands.push(0x0A);
    data.paymentMethods.forEach(payment => {
      const paymentLine = `  ${payment.method}:`.padEnd(40) + payment.amount.toFixed(2).padStart(8);
      this.addText(commands, paymentLine);
      commands.push(0x0A);
    });
    
    commands.push(0x0A);
    this.addText(commands, '================================================');
    commands.push(0x0A, 0x0A);
    
    // Footer - centered
    commands.push(ESC, 0x61, 0x01); // Center alignment
    this.addText(commands, 'Thank you for dining with us!');
    commands.push(0x0A, 0x0A);
    this.addText(commands, 'Visit us again soon!');
    commands.push(0x0A);
    this.addText(commands, 'www.lengolf.com');
    commands.push(0x0A, 0x0A);
    
    this.addText(commands, `Generated: ${new Date().toLocaleString('th-TH')}`);
    commands.push(0x0A);
    this.addText(commands, 'Powered by Lengolf POS System');
    commands.push(0x0A, 0x0A, 0x0A, 0x0A);
    
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
    this.addText(commands, 'COM4 Connection Test');
    commands.push(0x0A, 0x0A);
    
    this.addText(commands, `Time: ${new Date().toLocaleString()}`);
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
   * Send data directly to COM port using PowerShell
   */
  private async sendToCOMPort(data: Buffer): Promise<void> {
    // Write binary data to temporary file
    const tempFile = path.join(os.tmpdir(), `lengolf_print_${Date.now()}.bin`);
    fs.writeFileSync(tempFile, data);
    
    try {
      // Use PowerShell to send binary data to COM port
      const command = `powershell -Command "
        try {
          # Open COM port for writing
          \\$port = New-Object System.IO.Ports.SerialPort '${this.comPort}', 9600, 'None', 8, 'One'
          \\$port.ReadTimeout = 500
          \\$port.WriteTimeout = 2000
          \\$port.Open()
          
          # Read binary data and send to COM port
          \\$data = [System.IO.File]::ReadAllBytes('${tempFile}')
          \\$port.Write(\\$data, 0, \\$data.Length)
          
          # Wait for transmission
          Start-Sleep -Milliseconds 500
          
          \\$port.Close()
          Write-Output 'SUCCESS: Data sent to ${this.comPort}'
        } catch {
          Write-Error \\"COM port error: \$(\$_.Exception.Message)\\"
        }
      "`;

      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(`COM port error: ${stderr}`);
      }
      
      console.log('✅ COM port output:', stdout.trim());
      
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }
}

// Export singleton instance for COM4 (LENGOLF printer)
export const lengolfCOMPrinter = new DirectCOMPrinter('COM4');