// Thermal Printer Service using PowerShell bridge
// Optimized for Windows environments with direct printer access

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

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

export class ThermalPrinter {
  constructor(private printerName: string = 'LENGOLF') {}

  /**
   * Print receipt directly to thermal printer using ESC/POS commands
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      const escPosContent = this.generateESCPOSReceipt(receiptData);
      await this.printESCPOS(escPosContent);
      console.log('✅ Receipt printed successfully to', this.printerName);
    } catch (error) {
      console.error('❌ Failed to print receipt:', error);
      throw error;
    }
  }

  /**
   * Print plain text receipt (fallback method)
   */
  async printTextReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      const textContent = this.generateTextReceipt(receiptData);
      await this.printText(textContent);
      console.log('✅ Text receipt printed successfully to', this.printerName);
    } catch (error) {
      console.error('❌ Failed to print text receipt:', error);
      throw error;
    }
  }

  /**
   * Generate ESC/POS formatted receipt with proper commands
   */
  private generateESCPOSReceipt(data: ReceiptData): Buffer {
    const commands: Buffer[] = [];

    // ESC/POS Commands
    const ESC = '\x1B';
    const GS = '\x1D';
    
    // Initialize printer
    commands.push(Buffer.from(`${ESC}@`)); // Initialize
    
    // Header - Store info
    commands.push(Buffer.from(`${ESC}a\x01`)); // Center align
    commands.push(Buffer.from(`${ESC}!\x18`)); // Double height
    commands.push(Buffer.from('LENGOLF GOLF CLUB\n'));
    commands.push(Buffer.from(`${ESC}!\x00`)); // Normal size
    commands.push(Buffer.from('123 Golf Course Road\n'));
    commands.push(Buffer.from('Bangkok 10120\n'));
    commands.push(Buffer.from('Tax ID: 1234567890123\n'));
    commands.push(Buffer.from('Tel: 02-123-4567\n\n'));
    
    // Receipt header
    commands.push(Buffer.from('================================\n'));
    commands.push(Buffer.from(`Receipt No: ${data.receiptNumber}\n`));
    commands.push(Buffer.from(`Date: ${new Date().toLocaleString('th-TH')}\n`));
    if (data.tableNumber) {
      commands.push(Buffer.from(`Table: ${data.tableNumber}\n`));
    }
    if (data.customerName) {
      commands.push(Buffer.from(`Customer: ${data.customerName}\n`));
    }
    if (data.staffName) {
      commands.push(Buffer.from(`Staff: ${data.staffName}\n`));
    }
    commands.push(Buffer.from('================================\n'));

    // Items
    commands.push(Buffer.from(`${ESC}a\x00`)); // Left align
    commands.push(Buffer.from('ITEM                    QTY  PRICE\n'));
    commands.push(Buffer.from('--------------------------------\n'));
    
    data.items.forEach(item => {
      const qty = item.qty || 1;
      const itemTotal = item.price * qty;
      const itemName = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name;
      const line = `${itemName.padEnd(20)} ${qty.toString().padStart(3)} ${itemTotal.toFixed(2).padStart(6)}\n`;
      commands.push(Buffer.from(line));
      
      if (item.notes) {
        commands.push(Buffer.from(`  Note: ${item.notes}\n`));
      }
    });

    commands.push(Buffer.from('--------------------------------\n'));
    
    // Totals
    commands.push(Buffer.from(`${'Subtotal:'.padEnd(26)}${data.subtotal.toFixed(2).padStart(6)}\n`));
    commands.push(Buffer.from(`${'VAT (7%):'.padEnd(26)}${data.tax.toFixed(2).padStart(6)}\n`));
    commands.push(Buffer.from('================================\n'));
    commands.push(Buffer.from(`${ESC}!\x18`)); // Double height for total
    commands.push(Buffer.from(`${'TOTAL:'.padEnd(13)}${data.total.toFixed(2).padStart(6)}\n`));
    commands.push(Buffer.from(`${ESC}!\x00`)); // Normal size
    commands.push(Buffer.from('================================\n'));

    // Payment methods
    commands.push(Buffer.from('\nPAYMENT:\n'));
    data.paymentMethods.forEach(payment => {
      commands.push(Buffer.from(`  ${payment.method}: ${payment.amount.toFixed(2)}\n`));
    });

    // Footer
    commands.push(Buffer.from('\n================================\n'));
    commands.push(Buffer.from(`${ESC}a\x01`)); // Center align
    commands.push(Buffer.from('Thank you for dining with us!\n\n'));
    commands.push(Buffer.from('Visit us again soon!\n'));
    commands.push(Buffer.from('www.lengolf.com\n\n'));
    
    commands.push(Buffer.from(`Generated: ${new Date().toLocaleString('th-TH')}\n`));
    commands.push(Buffer.from('Powered by Lengolf POS\n'));

    // Feed and cut
    commands.push(Buffer.from('\n\n\n')); // Feed lines
    commands.push(Buffer.from(`${GS}V\x01`)); // Full cut

    return Buffer.concat(commands);
  }

  /**
   * Generate plain text receipt (fallback)
   */
  private generateTextReceipt(data: ReceiptData): string {
    const lines: string[] = [];
    
    // Header
    lines.push('        LENGOLF GOLF CLUB');
    lines.push('    123 Golf Course Road');
    lines.push('       Bangkok 10120');
    lines.push('   Tax ID: 1234567890123');
    lines.push('      Tel: 02-123-4567');
    lines.push('================================');
    lines.push(`Receipt No: ${data.receiptNumber}`);
    lines.push(`Date: ${new Date().toLocaleString('th-TH')}`);
    if (data.tableNumber) lines.push(`Table: ${data.tableNumber}`);
    if (data.customerName) lines.push(`Customer: ${data.customerName}`);
    if (data.staffName) lines.push(`Staff: ${data.staffName}`);
    lines.push('================================');
    
    // Items
    lines.push('ITEM                    QTY  PRICE');
    lines.push('--------------------------------');
    data.items.forEach(item => {
      const qty = item.qty || 1;
      const itemTotal = item.price * qty;
      const itemName = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name;
      lines.push(`${itemName.padEnd(20)} ${qty.toString().padStart(3)} ${itemTotal.toFixed(2).padStart(6)}`);
      if (item.notes) {
        lines.push(`  Note: ${item.notes}`);
      }
    });
    
    lines.push('--------------------------------');
    lines.push(`${'Subtotal:'.padEnd(26)}${data.subtotal.toFixed(2).padStart(6)}`);
    lines.push(`${'VAT (7%):'.padEnd(26)}${data.tax.toFixed(2).padStart(6)}`);
    lines.push('================================');
    lines.push(`${'TOTAL:'.padEnd(26)}${data.total.toFixed(2).padStart(6)}`);
    lines.push('================================');
    
    // Payment
    lines.push('');
    lines.push('PAYMENT:');
    data.paymentMethods.forEach(payment => {
      lines.push(`  ${payment.method}: ${payment.amount.toFixed(2)}`);
    });
    
    // Footer
    lines.push('');
    lines.push('================================');
    lines.push('   Thank you for dining with us!');
    lines.push('');
    lines.push('     Visit us again soon!');
    lines.push('      www.lengolf.com');
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleString('th-TH')}`);
    lines.push('   Powered by Lengolf POS');
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Print ESC/POS data to printer using PowerShell
   */
  private async printESCPOS(data: Buffer): Promise<void> {
    // Save ESC/POS data to temporary file
    const tempFile = path.join(process.cwd(), 'temp_receipt.bin');
    fs.writeFileSync(tempFile, data);

    try {
      // Use PowerShell to send raw data to printer
      const command = `powershell -Command "
        try {
          $bytes = [System.IO.File]::ReadAllBytes('${tempFile}')
          $printer = Get-Printer -Name '${this.printerName}' -ErrorAction Stop
          
          # Create print job with raw data
          $printJob = [System.Drawing.Printing.PrintDocument]::new()
          $printJob.PrinterSettings.PrinterName = '${this.printerName}'
          
          Add-Type -AssemblyName System.Drawing
          $printJob.add_PrintPage({
            param($sender, $e)
            $rawBytes = [System.IO.File]::ReadAllBytes('${tempFile}')
            $stream = [System.IO.MemoryStream]::new($rawBytes)
            $e.Graphics.DrawString([System.Text.Encoding]::UTF8.GetString($rawBytes), [System.Drawing.Font]::new('Courier New', 8), [System.Drawing.Brushes]::Black, 0, 0)
          })
          
          $printJob.Print()
          Write-Output 'SUCCESS: Receipt printed to ${this.printerName}'
        } catch {
          Write-Error $_.Exception.Message
        }
      "`;

      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(`PowerShell error: ${stderr}`);
      }
      console.log('PowerShell output:', stdout);

    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Print plain text using PowerShell Out-Printer
   */
  private async printText(text: string): Promise<void> {
    const escapedText = text.replace(/'/g, "''").replace(/"/g, '""');
    const command = `powershell -Command "
      try {
        '${escapedText}' | Out-Printer -Name '${this.printerName}'
        Write-Output 'SUCCESS: Text printed to ${this.printerName}'
      } catch {
        Write-Error $_.Exception.Message
      }
    "`;

    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`Print failed: ${stderr}`);
    }
    console.log('Print output:', stdout);
  }

  /**
   * List available printers
   */
  async listPrinters(): Promise<string[]> {
    try {
      const command = `powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"`;
      const { stdout } = await execAsync(command);
      const printers = JSON.parse(stdout);
      
      if (Array.isArray(printers)) {
        return printers.map(p => p.Name);
      } else if (printers.Name) {
        return [printers.Name];
      }
      return [];
    } catch (error) {
      console.error('Failed to list printers:', error);
      return [];
    }
  }

  /**
   * Check if specific printer exists
   */
  async printerExists(): Promise<boolean> {
    try {
      const printers = await this.listPrinters();
      return printers.includes(this.printerName);
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const thermalPrinter = new ThermalPrinter('LENGOLF');