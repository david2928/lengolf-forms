// Bluetooth Thermal Printer Service for Android tablets/phones
// Uses Web Bluetooth API to connect directly to ESC/POS thermal printers

// Type declarations for Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }
  
  interface Bluetooth {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  }
  
  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    acceptAllDevices?: boolean;
    optionalServices?: BluetoothServiceUUID[];
  }
  
  interface BluetoothLEScanFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }
  
  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: string, listener: EventListener): void;
  }
  
  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    writeValue(value: BufferSource): Promise<void>;
  }
  
  type BluetoothServiceUUID = string;
  type BluetoothCharacteristicUUID = string;
}

export interface BluetoothReceiptData {
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

export class BluetoothThermalPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isConnected: boolean = false;

  /**
   * Check if Web Bluetooth is supported
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 
           'bluetooth' in navigator && 
           typeof (navigator as any).bluetooth.requestDevice === 'function';
  }

  /**
   * Connect to Bluetooth thermal printer
   */
  async connect(): Promise<boolean> {
    try {
      if (!BluetoothThermalPrinter.isSupported()) {
        throw new Error('Web Bluetooth is not supported on this device');
      }

      console.log('🔍 Scanning for Bluetooth thermal printers...');

      // Request device with thermal printer services
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // ESC/POS service
          { namePrefix: 'MTP-' }, // Common thermal printer prefix
          { namePrefix: 'BlueTooth Printer' },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' }
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // ESC/POS
          '0000ff00-0000-1000-8000-00805f9b34fb', // Generic printer
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Common thermal printer
        ]
      });

      if (!this.device) {
        throw new Error('No printer selected');
      }

      console.log('📱 Connecting to printer:', this.device.name);

      // Connect to GATT server
      const server = await this.device.gatt!.connect();
      
      // Try different service UUIDs commonly used by thermal printers
      const serviceUUIDs = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'
      ];

      let service;
      for (const serviceUUID of serviceUUIDs) {
        try {
          service = await server.getPrimaryService(serviceUUID);
          console.log('✅ Connected to service:', serviceUUID);
          break;
        } catch (e) {
          console.log('⚠️ Service not found:', serviceUUID);
          continue;
        }
      }

      if (!service) {
        throw new Error('Could not find compatible printer service');
      }

      // Get characteristic for writing (common UUIDs for thermal printers)
      try {
        this.characteristic = await service.getCharacteristic('0000ff02-0000-1000-8000-00805f9b34fb');
        console.log('✅ Found writable characteristic: 0000ff02-0000-1000-8000-00805f9b34fb');
      } catch {
        try {
          // Try alternative characteristic UUID
          this.characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
          console.log('✅ Found writable characteristic: 0000ffe1-0000-1000-8000-00805f9b34fb');
        } catch {
          throw new Error('Could not find writable characteristic');
        }
      }

      this.isConnected = true;
      console.log('🎉 Successfully connected to Bluetooth printer!');
      return true;

    } catch (error) {
      console.error('❌ Failed to connect to Bluetooth printer:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    try {
      if (this.device && this.device.gatt?.connected) {
        await this.device.gatt.disconnect();
      }
      this.device = null;
      this.characteristic = null;
      this.isConnected = false;
      console.log('📴 Disconnected from Bluetooth printer');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }

  /**
   * Print receipt to Bluetooth thermal printer
   */
  async printReceipt(receiptData: BluetoothReceiptData): Promise<void> {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Not connected to printer. Call connect() first.');
    }

    try {
      console.log('🖨️ Printing receipt via Bluetooth...');
      
      const escposData = this.generateESCPOSData(receiptData);
      
      // Split data into chunks (most Bluetooth devices have MTU limits)
      const chunkSize = 20; // Conservative chunk size for Bluetooth LE
      const chunks = this.splitIntoChunks(escposData, chunkSize);
      
      for (let i = 0; i < chunks.length; i++) {
        await this.characteristic.writeValue(chunks[i]);
        console.log(`📤 Sent chunk ${i + 1}/${chunks.length}`);
        
        // Small delay between chunks to prevent buffer overflow
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      console.log('✅ Receipt printed successfully via Bluetooth!');
      
    } catch (error) {
      console.error('❌ Failed to print receipt:', error);
      throw error;
    }
  }

  /**
   * Test print functionality
   */
  async testPrint(): Promise<void> {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Not connected to printer. Call connect() first.');
    }

    const testData = new Uint8Array([
      0x1B, 0x40, // Initialize
      0x1B, 0x61, 0x01, // Center align
      ...Array.from(new TextEncoder().encode('LENGOLF TEST PRINT\n')),
      ...Array.from(new TextEncoder().encode('Bluetooth Connection OK\n')),
      ...Array.from(new TextEncoder().encode(new Date().toLocaleString() + '\n')),
      0x0A, 0x0A, 0x0A, // Feed lines
      0x1D, 0x56, 0x01 // Cut paper
    ]);

    try {
      await this.characteristic.writeValue(testData);
      console.log('✅ Test print sent successfully!');
    } catch (error) {
      console.error('❌ Test print failed:', error);
      throw error;
    }
  }

  /**
   * Generate ESC/POS commands for thermal printer
   */
  private generateESCPOSData(data: BluetoothReceiptData): Uint8Array {
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
    commands.push(0x0A, 0x0A, 0x0A, 0x0A);
    
    // Cut paper
    commands.push(GS, 0x56, 0x01);
    
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
   * Split data into chunks for Bluetooth transmission
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
  getDeviceInfo(): { name?: string; id?: string } | null {
    if (!this.device) return null;
    return {
      name: this.device.name,
      id: this.device.id
    };
  }
}

// Export singleton instance
export const bluetoothThermalPrinter = new BluetoothThermalPrinter();