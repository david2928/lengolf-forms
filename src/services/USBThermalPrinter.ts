// USB Thermal Printer Service using WebUSB API
// Direct USB connection - faster and more reliable than Bluetooth

// Type declarations for WebUSB API
declare global {
  interface Navigator {
    usb: USB;
  }
  
  interface USB {
    requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
    getDevices(): Promise<USBDevice[]>;
  }
  
  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }
  
  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
  }
  
  interface USBDevice {
    vendorId: number;
    productId: number;
    deviceClass: number;
    deviceSubclass: number;
    deviceProtocol: number;
    productName?: string;
    manufacturerName?: string;
    serialNumber?: string;
    configuration?: USBConfiguration;
    configurations: USBConfiguration[];
    opened: boolean;
    usbVersionMajor: number;
    usbVersionMinor: number;
    usbVersionSubminor: number;
    deviceVersionMajor: number;
    deviceVersionMinor: number;
    deviceVersionSubminor: number;
    
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  }
  
  interface USBConfiguration {
    configurationValue: number;
    configurationName?: string;
    interfaces: USBInterface[];
  }
  
  interface USBInterface {
    interfaceNumber: number;
    alternate: USBAlternateInterface;
    alternates: USBAlternateInterface[];
    claimed: boolean;
  }
  
  interface USBAlternateInterface {
    alternateSetting: number;
    interfaceClass: number;
    interfaceSubclass: number;
    interfaceProtocol: number;
    interfaceName?: string;
    endpoints: USBEndpoint[];
  }
  
  interface USBEndpoint {
    endpointNumber: number;
    direction: "in" | "out";
    type: "bulk" | "interrupt" | "isochronous";
    packetSize: number;
  }
  
  interface USBOutTransferResult {
    bytesWritten: number;
    status: "ok" | "stall" | "babble";
  }
  
  interface USBInTransferResult {
    data?: DataView;
    status: "ok" | "stall" | "babble";
  }
}

export interface USBReceiptData {
  receiptNumber: string;
  items: Array<{
    name: string;
    price: number;
    qty: number;
    notes?: string;
  }>;
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

export class USBThermalPrinter {
  private device: USBDevice | null = null;
  private endpointOut: number | null = null;
  private interfaceNumber: number | null = null;
  private isConnected: boolean = false;

  /**
   * Check if WebUSB is supported
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 
           'usb' in navigator && 
           typeof (navigator as any).usb.requestDevice === 'function';
  }

  /**
   * Connect to USB thermal printer
   */
  async connect(): Promise<boolean> {
    try {
      if (!USBThermalPrinter.isSupported()) {
        throw new Error('WebUSB is not supported on this device');
      }

      console.log('🔍 Scanning for USB thermal printers...');

      // Common thermal printer vendor IDs
      const filters = [
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0525 }, // Star Micronics
        { vendorId: 0x0fe6 }, // ICS Electronics
        { vendorId: 0x154f }, // Wincor Nixdorf
        { vendorId: 0x28e9 }, // GigaDevice (common for generic printers)
        { vendorId: 0x1fc9 }, // NXP (some thermal printers)
        { vendorId: 0x0483 }, // STMicroelectronics (some thermal printers)
        { classCode: 7 }       // Printer class
      ];

      this.device = await navigator.usb.requestDevice({ filters });

      if (!this.device) {
        throw new Error('No USB printer selected');
      }

      console.log('📱 Selected USB printer:', {
        manufacturer: this.device.manufacturerName,
        product: this.device.productName,
        vendorId: this.device.vendorId.toString(16),
        productId: this.device.productId.toString(16)
      });

      // Open device
      await this.device.open();
      
      // Select configuration (usually configuration 1)
      if (this.device.configuration === undefined) {
        await this.device.selectConfiguration(1);
      }

      // Find bulk OUT endpoint for sending data
      const configuration = this.device.configuration!;
      let foundInterface = false;

      for (const iface of configuration.interfaces) {
        // Look for printer interface (class 7) or first available interface
        const alt = iface.alternate;
        if (alt.interfaceClass === 7 || !foundInterface) {
          this.interfaceNumber = iface.interfaceNumber;
          
          // Claim the interface
          await this.device.claimInterface(this.interfaceNumber);
          
          // Find bulk OUT endpoint
          for (const endpoint of alt.endpoints) {
            if (endpoint.direction === 'out' && endpoint.type === 'bulk') {
              this.endpointOut = endpoint.endpointNumber;
              console.log('✅ Found bulk OUT endpoint:', this.endpointOut);
              foundInterface = true;
              break;
            }
          }
          
          if (foundInterface) break;
        }
      }

      if (!foundInterface || this.endpointOut === null) {
        throw new Error('Could not find suitable interface or endpoint for printing');
      }

      this.isConnected = true;
      console.log('🎉 Successfully connected to USB thermal printer!');
      return true;

    } catch (error) {
      console.error('❌ Failed to connect to USB printer:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    try {
      if (this.device) {
        if (this.interfaceNumber !== null) {
          await this.device.releaseInterface(this.interfaceNumber);
        }
        await this.device.close();
      }
      
      this.device = null;
      this.endpointOut = null;
      this.interfaceNumber = null;
      this.isConnected = false;
      
      console.log('📴 Disconnected from USB printer');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }

  /**
   * Print receipt to USB thermal printer
   */
  async printReceipt(receiptData: USBReceiptData): Promise<void> {
    if (!this.isConnected || !this.device || this.endpointOut === null) {
      throw new Error('Not connected to USB printer. Call connect() first.');
    }

    try {
      console.log('🖨️ Printing receipt via USB...');
      
      const escposData = this.generateESCPOSData(receiptData);
      
      // Send data in chunks for reliability
      const chunkSize = 1024; // USB can handle larger chunks than Bluetooth
      const chunks = this.splitIntoChunks(escposData, chunkSize);
      
      console.log(`📤 Sending ${chunks.length} chunks of up to ${chunkSize} bytes each...`);
      
      for (let i = 0; i < chunks.length; i++) {
        const result = await this.device.transferOut(this.endpointOut, chunks[i]);
        
        if (result.status !== 'ok') {
          throw new Error(`USB transfer failed: ${result.status}`);
        }
        
        console.log(`📤 Sent chunk ${i + 1}/${chunks.length} (${result.bytesWritten} bytes)`);
      }
      
      console.log('✅ Receipt printed successfully via USB!');
      
    } catch (error) {
      console.error('❌ Failed to print receipt:', error);
      throw error;
    }
  }

  /**
   * Test print functionality
   */
  async testPrint(): Promise<void> {
    if (!this.isConnected || !this.device || this.endpointOut === null) {
      throw new Error('Not connected to USB printer. Call connect() first.');
    }

    const testData = new Uint8Array([
      0x1B, 0x40, // Initialize
      0x1B, 0x61, 0x01, // Center align
      ...Array.from(new TextEncoder().encode('LENGOLF USB TEST PRINT\n')),
      ...Array.from(new TextEncoder().encode('USB Connection OK\n')),
      ...Array.from(new TextEncoder().encode(new Date().toLocaleString() + '\n')),
      0x0A, 0x0A, 0x0A, 0x0A, // Feed lines
      0x1B, 0x64, 0x03, // Feed 3 lines
      0x1D, 0x56, 0x01 // Cut paper
    ]);

    try {
      const result = await this.device.transferOut(this.endpointOut, testData);
      if (result.status === 'ok') {
        console.log('✅ USB test print sent successfully!');
      } else {
        throw new Error(`USB test print failed: ${result.status}`);
      }
    } catch (error) {
      console.error('❌ USB test print failed:', error);
      throw error;
    }
  }

  /**
   * Generate ESC/POS commands for thermal printer (same as Bluetooth version)
   */
  private generateESCPOSData(data: USBReceiptData): Uint8Array {
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
    
    // TAX INVOICE
    commands.push(ESC, 0x21, 0x20); // Double height
    this.addText(commands, 'TAX INVOICE (ABB)');
    commands.push(0x0A);
    commands.push(ESC, 0x21, 0x00); // Reset
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    // Receipt details - left aligned
    commands.push(ESC, 0x61, 0x00);
    
    this.addText(commands, `Receipt No: ${data.receiptNumber}`);
    commands.push(0x0A);
    
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
    data.items.forEach(item => {
      const qty = item.qty || 1;
      const itemTotal = item.price * qty;
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
    
    const itemCount = data.items.reduce((sum, item) => sum + (item.qty || 1), 0);
    this.addText(commands, `Items: ${itemCount}`);
    commands.push(0x0A, 0x0A);
    
    // Totals
    const leftAlign = 20;
    
    const subtotalAmount = data.subtotal.toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}Subtotal:${' '.repeat(48 - leftAlign - 9 - subtotalAmount.length)}${subtotalAmount}`);
    commands.push(0x0A);
    
    const vatAmount = data.tax.toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}VAT(7%):${' '.repeat(48 - leftAlign - 8 - vatAmount.length)}${vatAmount}`);
    commands.push(0x0A);
    
    this.addText(commands, `${' '.repeat(leftAlign)}============================`);
    commands.push(0x0A);
    
    const totalAmount = data.total.toFixed(2);
    this.addText(commands, `${' '.repeat(leftAlign)}Total:${' '.repeat(48 - leftAlign - 6 - totalAmount.length)}${totalAmount}`);
    commands.push(0x0A, 0x0A);
    
    // Payment methods
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A);
    
    data.paymentMethods.forEach(payment => {
      const methodText = payment.method;
      const amountText = payment.amount.toFixed(2);
      const spacing = ' '.repeat(Math.max(1, 48 - methodText.length - amountText.length));
      this.addText(commands, `${methodText}${spacing}${amountText}`);
      commands.push(0x0A);
    });
    
    this.addText(commands, '------------------------------------------------');
    commands.push(0x0A, 0x0A);
    
    // Footer
    commands.push(ESC, 0x61, 0x01); // Center
    this.addText(commands, 'May your next round be under par!');
    commands.push(0x0A);
    this.addText(commands, 'www.len.golf');
    commands.push(0x0A, 0x0A);
    
    this.addText(commands, `Generated: ${new Date().toLocaleString('th-TH')}`);
    commands.push(0x0A);
    this.addText(commands, 'Powered by Lengolf POS System');
    
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
  private addText(commands: number[], text: string): void {
    const bytes = new TextEncoder().encode(text);
    for (let i = 0; i < bytes.length; i++) {
      commands.push(bytes[i]);
    }
  }

  /**
   * Split data into chunks for USB transmission
   */
  private splitIntoChunks(data: Uint8Array, chunkSize: number): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get connected device info
   */
  getDeviceInfo(): { manufacturer?: string; product?: string; vendorId?: string; productId?: string } | null {
    if (!this.device) return null;
    return {
      manufacturer: this.device.manufacturerName,
      product: this.device.productName,
      vendorId: this.device.vendorId.toString(16),
      productId: this.device.productId.toString(16)
    };
  }
}

// Export singleton instance
export const usbThermalPrinter = new USBThermalPrinter();