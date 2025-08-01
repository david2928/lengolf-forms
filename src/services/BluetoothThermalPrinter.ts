// Bluetooth Thermal Printer Service for Android tablets/phones
// Uses Web Bluetooth API to connect directly to ESC/POS thermal printers
// Optimized version using shared ReceiptFormatter

import { ReceiptFormatter, type ReceiptData } from '@/lib/receipt-formatter';

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

export class BluetoothThermalPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isConnected: boolean = false;
  private lastConnectedDevice: string | null = null;

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
   * @param printerName Optional: Connect to specific printer by name (e.g., "printer001")
   */
  async connect(printerName?: string): Promise<boolean> {
    try {
      if (!BluetoothThermalPrinter.isSupported()) {
        throw new Error('Web Bluetooth is not supported on this device');
      }

      console.log('🔍 Scanning for Bluetooth thermal printers...');

      // Build request options
      const requestOptions: any = {
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // ESC/POS
          '0000ff00-0000-1000-8000-00805f9b34fb', // Generic printer
          '49535341-fe7d-4ae5-8fa9-9fafd205e455'  // Common thermal printer
        ]
      };

      if (printerName) {
        // Connect to specific printer by name
        console.log('🎯 Looking for specific printer:', printerName);
        requestOptions.filters = [{ name: printerName }];
      } else {
        // Scan for any thermal printer
        requestOptions.filters = [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // ESC/POS service
          { namePrefix: 'MTP-' }, // Common thermal printer prefix
          { namePrefix: 'BlueTooth Printer' },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'printer' } // lowercase variant
        ];
      }

      // Request device with thermal printer services
      this.device = await (navigator as any).bluetooth.requestDevice(requestOptions);

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

      // Try multiple characteristic UUIDs commonly used by thermal printers
      const characteristicUUIDs = [
        '0000ff02-0000-1000-8000-00805f9b34fb', // Common write characteristic
        '0000ffe1-0000-1000-8000-00805f9b34fb', // Alternative write characteristic
        '00002af1-0000-1000-8000-00805f9b34fb', // Xprinter characteristic
        '49535343-1e4d-4bd9-ba61-23c647249616', // Another common UUID
        '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART write
        '0000fff2-0000-1000-8000-00805f9b34fb', // Alternative UUID
        '0000ff01-0000-1000-8000-00805f9b34fb'  // Another alternative
      ];

      let foundCharacteristic = false;
      for (const charUUID of characteristicUUIDs) {
        try {
          this.characteristic = await service.getCharacteristic(charUUID);
          console.log('✅ Found writable characteristic:', charUUID);
          foundCharacteristic = true;
          break;
        } catch (e) {
          console.log('⚠️ Characteristic not found:', charUUID);
          continue;
        }
      }

      if (!foundCharacteristic) {
        // Last resort: try to get all characteristics and find a writable one
        try {
          console.log('🔍 Attempting to discover all characteristics...');
          // This is a fallback - some printers might have custom UUIDs
          const characteristics = await (service as any).getCharacteristics();
          console.log('📋 Available characteristics:', characteristics.map((c: any) => c.uuid));
          
          // Try the first characteristic that supports writing
          for (const char of characteristics) {
            if ((char as any).properties && (char as any).properties.write) {
              this.characteristic = char;
              console.log('✅ Found writable characteristic via discovery:', char.uuid);
              foundCharacteristic = true;
              break;
            }
          }
        } catch (discoveryError) {
          console.log('⚠️ Characteristic discovery failed:', discoveryError);
        }
      }

      if (!foundCharacteristic) {
        throw new Error('Could not find writable characteristic. This printer may not be ESC/POS compatible or may require pairing in Android Bluetooth settings first.');
      }

      this.isConnected = true;
      this.lastConnectedDevice = this.device.name || this.device.id;
      
      // Store last connected device in localStorage for quick access
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lastBluetoothPrinter', this.lastConnectedDevice);
      }
      
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
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Not connected to printer. Call connect() first.');
    }

    try {
      console.log('🖨️ Printing receipt via Bluetooth...');
      
      const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
      
      // Split data into chunks - use moderate size for compatibility
      const chunkSize = 100; // Balance between speed and compatibility
      const chunks = ReceiptFormatter.splitIntoChunks(escposData, chunkSize);
      
      console.log(`📤 Sending ${chunks.length} chunks of ${chunkSize} bytes each...`);
      console.log(`📊 Total data size: ${escposData.length} bytes`);
      
      for (let i = 0; i < chunks.length; i++) {
        try {
          await this.characteristic.writeValue(chunks[i]);
          
          // Add small delay between chunks to ensure printer can process
          if (i > 0 && i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 30)); // Small delay every 5 chunks
          } else if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 10)); // Minimal delay between chunks
          }
          
          // Progress logging for debugging
          if (i % 20 === 0) {
            console.log(`📤 Progress: ${Math.round((i / chunks.length) * 100)}%`);
          }
        } catch (error) {
          console.error(`❌ Error sending chunk ${i}:`, error);
          // If chunk fails, retry with smaller chunk
          if (error instanceof Error) {
            console.warn('⚠️ Retrying with smaller chunk size...');
            const smallerChunks = ReceiptFormatter.splitIntoChunks(chunks[i], 20);
            for (const smallChunk of smallerChunks) {
              await this.characteristic.writeValue(smallChunk);
              await new Promise(resolve => setTimeout(resolve, 20));
            }
          } else {
            throw error;
          }
        }
      }
      
      // Final delay to ensure all data is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
      0x0A, 0x0A, 0x0A, 0x0A, // Moderate feed lines
      0x1B, 0x64, 0x03, // Feed 3 lines (ESC d n)
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
  getDeviceInfo(): { name?: string; id?: string } | null {
    if (!this.device) return null;
    return {
      name: this.device.name,
      id: this.device.id
    };
  }

  /**
   * Get last connected device name from localStorage
   */
  getLastConnectedDevice(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('lastBluetoothPrinter');
    }
    return null;
  }

  /**
   * Quick connect to last used device
   */
  async quickConnect(): Promise<boolean> {
    const lastDevice = this.getLastConnectedDevice();
    if (lastDevice) {
      console.log('🔄 Attempting quick connect to:', lastDevice);
      return await this.connect(lastDevice);
    }
    console.log('ℹ️ No previous device found, use regular connect()');
    return await this.connect();
  }
}

// Export singleton instance
export const bluetoothThermalPrinter = new BluetoothThermalPrinter();