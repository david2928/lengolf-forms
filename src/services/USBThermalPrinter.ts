// USB Thermal Printer Service using WebUSB API
// Direct USB connection - faster and more reliable than Bluetooth
// Optimized version using shared ReceiptFormatter

import { ReceiptFormatter, type ReceiptData } from '@/lib/receipt-formatter';

// WebUSB API is available in modern browsers but types may not be complete

export class USBThermalPrinter {
  private device: USBDevice | null = null;
  private endpointOut: number | null = null;
  private interfaceNumber: number | null = null;
  private isConnected: boolean = false;

  /**
   * Check if WebUSB is supported
   */
  static isSupported(): boolean {
    const supported = typeof navigator !== 'undefined' && 
           'usb' in navigator && 
           typeof (navigator as any).usb?.requestDevice === 'function';
    
    if (!supported) {
      console.warn('❌ WebUSB not supported:', {
        hasNavigator: typeof navigator !== 'undefined',
        hasUSB: typeof navigator !== 'undefined' && 'usb' in navigator,
        hasRequestDevice: typeof navigator !== 'undefined' && 'usb' in navigator && typeof (navigator as any).usb?.requestDevice === 'function',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        isHTTPS: typeof location !== 'undefined' ? location.protocol === 'https:' : 'unknown'
      });
    }
    
    return supported;
  }

  /**
   * Debug method to list all available USB devices
   */
  static async debugListDevices(): Promise<void> {
    if (!USBThermalPrinter.isSupported()) {
      console.error('❌ WebUSB not supported for device listing');
      return;
    }

    try {
      const devices = await (navigator as any).usb.getDevices();
      console.log('🔍 Currently paired USB devices:', devices.map((device: any) => ({
        manufacturer: device.manufacturerName,
        product: device.productName,
        vendorId: '0x' + device.vendorId.toString(16),
        productId: '0x' + device.productId.toString(16)
      })));
    } catch (error) {
      console.error('❌ Failed to list USB devices:', error);
    }
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

      // Expanded thermal printer vendor IDs including common USB-to-serial chips
      const filters = [
        // Brand name thermal printers
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0525 }, // Star Micronics
        { vendorId: 0x0fe6 }, // ICS Electronics
        { vendorId: 0x154f }, // Wincor Nixdorf
        { vendorId: 0x28e9 }, // GigaDevice (common for generic printers)
        { vendorId: 0x1fc9 }, // NXP (some thermal printers)
        { vendorId: 0x0483 }, // STMicroelectronics (some thermal printers)
        
        // Common USB-to-serial chips used in thermal printers
        { vendorId: 0x1a86 }, // CH340/CH341 (very common in cheap thermal printers)
        { vendorId: 0x0403 }, // FTDI (FT232, FT234, etc.)
        { vendorId: 0x10c4 }, // Silicon Labs CP210x series
        { vendorId: 0x067b }, // Prolific PL2303
        { vendorId: 0x16c0 }, // Van Ooijen Technische Informatica (V-USB)
        
        // Generic/broader filters
        { classCode: 7 },      // USB Printer class
        { classCode: 3 }       // USB HID class (some thermal printers)
      ];

      this.device = await (navigator as any).usb.requestDevice({ filters });

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
      console.error('🔍 USB Connection Debug Info:', {
        isSupported: USBThermalPrinter.isSupported(),
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        deviceSelected: !!this.device,
        deviceInfo: this.device ? {
          manufacturer: this.device.manufacturerName,
          product: this.device.productName,
          vendorId: '0x' + this.device.vendorId.toString(16),
          productId: '0x' + this.device.productId.toString(16)
        } : null
      });
      
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
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    if (!this.isConnected || !this.device || this.endpointOut === null) {
      throw new Error('Not connected to USB printer. Call connect() first.');
    }

    try {
      console.log('🖨️ Printing receipt via USB...');
      
      const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
      
      // Send data in chunks for reliability
      const chunkSize = 1024; // USB can handle larger chunks than Bluetooth
      const chunks = ReceiptFormatter.splitIntoChunks(escposData, chunkSize);
      
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
   * Test print functionality using shared test data
   */
  async testPrintWithDefaults(): Promise<void> {
    const testData = ReceiptFormatter.generateTestData();
    await this.printReceipt(testData);
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