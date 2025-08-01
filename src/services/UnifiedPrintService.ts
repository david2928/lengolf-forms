// Unified Print Service - Single interface for all printing operations
// Handles smart printer selection and routing to appropriate endpoints

import { bluetoothThermalPrinter } from './BluetoothThermalPrinter';
import { usbThermalPrinter } from './USBThermalPrinter';

export enum PrintType {
  TAX_INV_ABB = 'TAX_INV_ABB',        // After payment - Tax Invoice ABB format
  TAX_INV_RECEIPT = 'TAX_INV_RECEIPT', // From transaction management - Tax Invoice Receipt  
  BILL = 'BILL'                       // Before payment - Bill/check
}

export type PrintMethod = 'auto' | 'usb' | 'bluetooth';

export interface PrintRequest {
  type: PrintType;
  id: string;                         // receiptNumber or tableSessionId
  options?: {
    method?: PrintMethod;
    format?: 'thermal' | 'html';
    language?: 'en' | 'th';
  };
}

export interface PrintResponse {
  success: boolean;
  message: string;
  method: 'USB' | 'BLUETOOTH';
  data?: any;
  error?: string;
}

interface DeviceCapabilities {
  usb: boolean;
  bluetooth: boolean;
}

interface ServiceMapping {
  endpoints: {
    bluetooth: string;
    usb: string;
  };
  requiresTableSession: boolean;
}

export class UnifiedPrintService {
  private static instance: UnifiedPrintService;

  static getInstance(): UnifiedPrintService {
    if (!UnifiedPrintService.instance) {
      UnifiedPrintService.instance = new UnifiedPrintService();
    }
    return UnifiedPrintService.instance;
  }

  /**
   * Get device capabilities for printing
   */
  private getDeviceCapabilities(): DeviceCapabilities {
    return {
      usb: typeof navigator !== 'undefined' && 'usb' in navigator,
      bluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator
    };
  }

  /**
   * Smart printer method selection based on device and preferences
   */
  private selectPrinterMethod(preferredMethod?: PrintMethod): PrintMethod {
    if (preferredMethod && preferredMethod !== 'auto') {
      return preferredMethod;
    }

    const capabilities = this.getDeviceCapabilities();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

    // Smart selection logic:
    // 1. Desktop: prefer USB (faster, more reliable)
    // 2. Mobile: prefer Bluetooth (better compatibility)
    // 3. Fallback based on availability

    if (!isMobile && capabilities.usb) {
      return 'usb';
    } else if (isMobile && capabilities.bluetooth) {
      return 'bluetooth';
    } else if (capabilities.bluetooth) {
      return 'bluetooth';
    } else if (capabilities.usb) {
      return 'usb';
    }

    throw new Error('No compatible printer method available on this device');
  }

  /**
   * Get service mapping for print type
   */
  private getServiceMapping(type: PrintType): ServiceMapping {
    const mappings: Record<PrintType, ServiceMapping> = {
      [PrintType.TAX_INV_ABB]: {
        endpoints: {
          bluetooth: '/api/pos/print-bluetooth',
          usb: '/api/pos/print-bluetooth' // Same data, different printer
        },
        requiresTableSession: false
      },
      [PrintType.TAX_INV_RECEIPT]: {
        endpoints: {
          bluetooth: '/api/pos/print-tax-invoice-bluetooth', 
          usb: '/api/pos/print-tax-invoice-bluetooth' // Same data, different printer
        },
        requiresTableSession: false
      },
      [PrintType.BILL]: {
        endpoints: {
          bluetooth: '/api/pos/print-bill-bluetooth',
          usb: '/api/pos/print-bill-usb'
        },
        requiresTableSession: true
      }
    };

    return mappings[type];
  }

  /**
   * Get appropriate request body based on print type
   */
  private getRequestBody(type: PrintType, id: string): any {
    const mapping = this.getServiceMapping(type);
    
    if (mapping.requiresTableSession) {
      return { tableSessionId: id };
    } else {
      return { receiptNumber: id };
    }
  }

  /**
   * Check if printer service is connected
   */
  private isPrinterConnected(method: PrintMethod): boolean {
    switch (method) {
      case 'usb':
        return usbThermalPrinter.getConnectionStatus();
      case 'bluetooth':
        return bluetoothThermalPrinter.getConnectionStatus();
      default:
        return false;
    }
  }

  /**
   * Connect to printer service
   */
  private async connectPrinter(method: PrintMethod): Promise<boolean> {
    try {
      switch (method) {
        case 'usb':
          return await usbThermalPrinter.connect();
        case 'bluetooth':
          return await bluetoothThermalPrinter.connect();
        default:
          throw new Error(`Unsupported printer method: ${method}`);
      }
    } catch (error) {
      console.error(`❌ Failed to connect to ${method} printer:`, error);
      return false;
    }
  }

  /**
   * Print using printer service
   */
  private async printWithService(method: PrintMethod, receiptData: any): Promise<void> {
    switch (method) {
      case 'usb':
        await usbThermalPrinter.printReceipt(receiptData);
        break;
      case 'bluetooth':
        await bluetoothThermalPrinter.printReceipt(receiptData);
        break;
      default:
        throw new Error(`Unsupported printer method: ${method}`);
    }
  }

  /**
   * Main print method - unified interface for all printing operations
   */
  async print(request: PrintRequest): Promise<PrintResponse>;
  async print(type: PrintType, id: string, options?: PrintRequest['options']): Promise<PrintResponse>;
  async print(
    typeOrRequest: PrintType | PrintRequest, 
    id?: string, 
    options?: PrintRequest['options']
  ): Promise<PrintResponse> {
    try {
      // Handle overloaded parameters
      let request: PrintRequest;
      if (typeof typeOrRequest === 'string') {
        request = { type: typeOrRequest, id: id!, options };
      } else {
        request = typeOrRequest;
      }

      const { type, id: identifier, options: requestOptions = {} } = request;
      const { method = 'auto', format = 'thermal' } = requestOptions;

      console.log(`🖨️ Unified Print Service: Starting print job`, {
        type,
        id: identifier,
        method,
        format
      });

      // Select printer method
      const selectedMethod = this.selectPrinterMethod(method);
      console.log(`🎯 Selected printer method: ${selectedMethod}`);

      // Use unified API endpoint
      const endpoint = '/api/pos/print';
      const requestBody = {
        type: type,
        id: identifier,
        options: {
          method: selectedMethod,
          format: format,
          language: requestOptions.language || 'en'
        }
      };

      console.log(`📡 Calling unified API endpoint: ${endpoint}`, requestBody);

      // Call unified API endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Print API returned failure');
      }

      console.log(`✅ API call successful, data prepared for ${selectedMethod} printing`);

      // Handle client-side printing based on format
      if (format === 'thermal' && result.data) {
        const printData = result.data;
        
        // Ensure printer is connected
        if (!this.isPrinterConnected(selectedMethod)) {
          console.log(`🔗 Connecting to ${selectedMethod} printer...`);
          const connected = await this.connectPrinter(selectedMethod);
          if (!connected) {
            throw new Error(`Failed to connect to ${selectedMethod} printer`);
          }
        }

        // Print using appropriate service
        await this.printWithService(selectedMethod, printData);
        console.log(`🎉 Print completed successfully via ${selectedMethod.toUpperCase()}`);
      }

      return {
        success: true,
        message: `Print completed successfully via ${selectedMethod.toUpperCase()}`,
        method: selectedMethod.toUpperCase() as 'USB' | 'BLUETOOTH',
        data: result
      };

    } catch (error) {
      console.error('❌ Unified Print Service: Print failed:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown printing error',
        method: 'UNKNOWN' as any,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test print functionality
   */
  async testPrint(method: PrintMethod = 'auto'): Promise<PrintResponse> {
    try {
      const selectedMethod = this.selectPrinterMethod(method);
      console.log(`🧪 Testing ${selectedMethod} printer...`);

      // Ensure printer is connected
      if (!this.isPrinterConnected(selectedMethod)) {
        const connected = await this.connectPrinter(selectedMethod);
        if (!connected) {
          throw new Error(`Failed to connect to ${selectedMethod} printer`);
        }
      }

      // Perform test print
      if (selectedMethod === 'usb') {
        await usbThermalPrinter.testPrint();
      } else {
        await bluetoothThermalPrinter.testPrint();
      }

      return {
        success: true,
        message: `Test print successful via ${selectedMethod.toUpperCase()}`,
        method: selectedMethod.toUpperCase() as 'USB' | 'BLUETOOTH'
      };

    } catch (error) {
      console.error('❌ Test print failed:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Test print failed',
        method: 'UNKNOWN' as any,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get connection status for all printer methods
   */
  getConnectionStatus(): { usb: boolean; bluetooth: boolean; capabilities: DeviceCapabilities } {
    return {
      usb: usbThermalPrinter.getConnectionStatus(),
      bluetooth: bluetoothThermalPrinter.getConnectionStatus(),
      capabilities: this.getDeviceCapabilities()
    };
  }

  /**
   * Get device information for connected printers
   */
  getDeviceInfo(): { usb: any; bluetooth: any } {
    return {
      usb: usbThermalPrinter.getDeviceInfo(),
      bluetooth: bluetoothThermalPrinter.getDeviceInfo()
    };
  }

  /**
   * Connect to printer with smart method selection
   */
  async connect(method: PrintMethod = 'auto'): Promise<PrintResponse> {
    try {
      const selectedMethod = this.selectPrinterMethod(method);
      console.log(`🔗 Connecting via ${selectedMethod}...`);

      const connected = await this.connectPrinter(selectedMethod);

      return {
        success: connected,
        message: connected 
          ? `Connected successfully via ${selectedMethod.toUpperCase()}` 
          : `Failed to connect via ${selectedMethod.toUpperCase()}`,
        method: selectedMethod.toUpperCase() as 'USB' | 'BLUETOOTH'
      };

    } catch (error) {
      console.error('❌ Connection failed:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        method: 'UNKNOWN' as any,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Disconnect from all printers
   */
  async disconnectAll(): Promise<void> {
    try {
      await Promise.all([
        bluetoothThermalPrinter.disconnect(),
        usbThermalPrinter.disconnect()
      ]);
      console.log('📴 Disconnected from all printers');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }
}

// Export singleton instance
export const unifiedPrintService = UnifiedPrintService.getInstance();