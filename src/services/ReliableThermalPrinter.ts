// Reliable Thermal Printer Service using PowerShell
// Best solution for Windows environments based on research

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

export class ReliableThermalPrinter {
  constructor(private printerName: string = 'LENGOLF') {}

  /**
   * Print receipt directly to thermal printer - FASTEST method
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      console.log(`🖨️ Printing receipt ${receiptData.receiptNumber} to ${this.printerName}...`);
      
      // Generate optimized thermal content
      const thermalContent = this.generateThermalContent(receiptData);
      
      // Print using direct PowerShell method
      await this.printDirectPowerShell(thermalContent);
      
      console.log('✅ Receipt printed successfully to LENGOLF!');
      
    } catch (error) {
      console.error('❌ Failed to print receipt:', error);
      throw new Error(`Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test printer connectivity and print test page
   */
  async testPrinter(): Promise<boolean> {
    try {
      console.log(`🔍 Testing LENGOLF printer connectivity...`);
      
      // Check if printer exists
      const printerExists = await this.checkPrinterExists();
      if (!printerExists) {
        console.log(`❌ Printer '${this.printerName}' not found`);
        return false;
      }
      
      // Print test page
      const testContent = this.generateTestPage();
      await this.printDirectPowerShell(testContent);
      
      console.log('✅ Test page printed successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Printer test failed:', error);
      return false;
    }
  }

  /**
   * Generate optimized thermal receipt content (80mm width)
   */
  private generateThermalContent(data: ReceiptData): string {
    const lines: string[] = [];
    const width = 48; // 80mm thermal printer width
    
    // Header with ESC/POS styling
    lines.push(this.centerText('*** LENGOLF RECEIPT ***', width));
    lines.push(this.printLine(width, '='));
    lines.push('');
    lines.push(this.centerText('LENGOLF GOLF CLUB', width));
    lines.push(this.centerText('123 Golf Course Road, Bangkok 10120', width));
    lines.push(this.centerText('Tax ID: 1234567890123', width));
    lines.push(this.centerText('Tel: 02-123-4567', width));
    lines.push('');
    lines.push(this.printLine(width, '='));
    
    // Receipt info
    lines.push(this.padText('Receipt No:', data.receiptNumber, '', width));
    lines.push(this.padText('Date:', new Date().toLocaleString('th-TH'), '', width));
    if (data.tableNumber) {
      lines.push(this.padText('Table:', data.tableNumber, '', width));
    }
    if (data.customerName) {
      lines.push(this.padText('Customer:', data.customerName, '', width));
    }
    if (data.staffName) {
      lines.push(this.padText('Staff:', data.staffName, '', width));
    }
    lines.push(this.printLine(width, '='));
    
    // Items header
    lines.push(this.padText('ITEM', 'QTY', 'PRICE', width));
    lines.push(this.printLine(width, '-'));
    
    // Items
    data.items.forEach(item => {
      const qty = item.qty || 1;
      const itemTotal = item.price * qty;
      const itemName = this.truncateText(item.name, width - 20);
      
      lines.push(itemName);
      lines.push(this.padText(`${qty}x`, `@ ${item.price.toFixed(2)}`, itemTotal.toFixed(2), width));
      
      if (item.notes) {
        lines.push(`  Note: ${this.truncateText(item.notes, width - 8)}`);
      }
      lines.push(''); // Space between items
    });
    
    lines.push(this.printLine(width, '-'));
    
    // Totals
    lines.push('');
    lines.push(this.padText('Subtotal:', '', data.subtotal.toFixed(2), width));
    lines.push(this.padText('VAT (7%):', '', `+ ${data.tax.toFixed(2)}`, width));
    lines.push(this.printLine(width, '='));
    lines.push(this.padText('TOTAL:', '', data.total.toFixed(2), width));
    lines.push(this.printLine(width, '='));
    
    // Payment methods
    lines.push('');
    lines.push(this.centerText('PAYMENT DETAILS', width));
    lines.push(this.printLine(width, '-'));
    data.paymentMethods.forEach(payment => {
      lines.push(this.padText(payment.method, '', payment.amount.toFixed(2), width));
    });
    
    // Footer
    lines.push(this.printLine(width, '='));
    lines.push('');
    lines.push(this.centerText('🎉 Thank you for dining with us! 🎉', width));
    lines.push('');
    lines.push(this.centerText('Visit us again soon!', width));
    lines.push(this.centerText('www.lengolf.com', width));
    lines.push('');
    lines.push(this.centerText(`Generated: ${new Date().toLocaleString('th-TH')}`, width));
    lines.push(this.centerText('Powered by Lengolf POS System', width));
    lines.push(this.printLine(width, '='));
    
    // Extra lines for cutting
    lines.push('', '', '');
    
    return lines.join('\n');
  }

  /**
   * Generate test page
   */
  private generateTestPage(): string {
    const lines: string[] = [];
    const width = 48;
    
    lines.push(this.printLine(width, '='));
    lines.push(this.centerText('LENGOLF PRINTER TEST', width));
    lines.push(this.printLine(width, '='));
    lines.push('');
    lines.push(this.padText('Printer:', this.printerName, '', width));
    lines.push(this.padText('Date:', new Date().toLocaleString('th-TH'), '', width));
    lines.push(this.padText('Status:', 'Connected ✅', '', width));
    lines.push('');
    lines.push(this.centerText('If you can read this clearly,', width));
    lines.push(this.centerText('your thermal printer is working!', width));
    lines.push('');
    lines.push(this.printLine(width, '='));
    lines.push('', '', '');
    
    return lines.join('\n');
  }

  /**
   * Print using direct PowerShell - FASTEST method
   */
  private async printDirectPowerShell(content: string): Promise<void> {
    // Create temporary file with thermal content
    const tempFile = path.join(os.tmpdir(), `thermal_receipt_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, content, 'utf8');
    
    try {
      // Use PowerShell for immediate printing
      const command = `powershell -Command "
        try {
          # Print directly to LENGOLF printer
          Get-Content '${tempFile}' -Raw | Out-Printer -Name '${this.printerName}'
          Write-Output 'SUCCESS: Printed to ${this.printerName}'
        } catch {
          Write-Error \\"Print failed: \$(\$_.Exception.Message)\\"
        }
      "`;

      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(`PowerShell error: ${stderr}`);
      }
      
      console.log('✅ PowerShell print output:', stdout.trim());
      
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Check if printer exists in Windows
   */
  async checkPrinterExists(): Promise<boolean> {
    try {
      const command = `powershell -Command "Get-Printer -Name '${this.printerName}' -ErrorAction SilentlyContinue | Select-Object Name"`;
      const { stdout } = await execAsync(command);
      
      return stdout.includes(this.printerName);
    } catch {
      return false;
    }
  }

  /**
   * List all available printers
   */
  async listPrinters(): Promise<string[]> {
    try {
      const command = `powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"`;
      const { stdout } = await execAsync(command);
      
      const result = JSON.parse(stdout);
      if (Array.isArray(result)) {
        return result.map(p => p.Name);
      } else if (result.Name) {
        return [result.Name];
      }
      return [];
    } catch (error) {
      console.error('Failed to list printers:', error);
      return [];
    }
  }

  // Helper methods for formatting
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
}

// Export singleton instance for LENGOLF printer
export const lengolfThermalPrinter = new ReliableThermalPrinter('LENGOLF');