# POS Receipt Printing System Documentation

**Document Version**: 3.0  
**Last Updated**: January 2025  
**Status**: ✅ **PRODUCTION READY - CONSOLIDATED ARCHITECTURE**

## Table of Contents
1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Thermal Printer Testing](#thermal-printer-testing)
4. [API Endpoints](#api-endpoints)
5. [Testing Tools](#testing-tools)
6. [Bluetooth Printer Integration](#bluetooth-printer-integration)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Lengolf POS system includes a **consolidated receipt printing system** optimized for tablet-based operations:
- **Thermal receipts** (ESC/POS compatible)
- **HTML receipts** (for browser printing)
- **JSON data** (for API integrations)

### Key Features
- ✅ **Tablet-optimized printing** - Bluetooth + USB only (no server-side Win32)
- ✅ **Consolidated architecture** - Single ESC/POS generator, unified data service
- ✅ **Production-ready receipts** - Real product/staff names, guest counts
- ✅ **Bangkok timezone** - Accurate transaction timestamps
- ✅ **Real-time data** - Direct database integration
- ✅ **Tax compliance** - Thai VAT calculations and formatting
- ✅ **Streamlined codebase** - ~600 lines of duplicate code eliminated
- ✅ **Clean setup** - Both tax invoices and normal receipts use same architecture
- ✅ **Business branding** - Company info, tax ID, contact details

---

## Current Implementation

### Core Files (Consolidated Architecture)
```
# Shared Libraries
src/lib/receipt-formatter.ts                  # Unified ESC/POS generation
src/lib/receipt-data-service.ts               # Consolidated database queries

# Thermal Printer Services (Updated)
src/services/BluetoothThermalPrinter.ts       # Bluetooth printing (uses shared libraries)
src/services/USBThermalPrinter.ts             # USB printing (uses shared libraries)

# API Endpoints (Migrated)
app/api/pos/print-bluetooth/route.ts          # Bluetooth print API
app/api/pos/print-usb/route.ts                # USB print API
app/api/pos/receipts/[receiptNumber]/route.ts # Receipt data API (migrated)
app/api/pos/receipts/route.ts                 # Receipt generation API (migrated)
app/api/pos/reprint/route.ts                  # Reprint API (migrated)
app/api/test/receipt-generator/route.ts       # Test API (migrated)

# Test Interface (Unified)
app/test-printer/page.tsx                     # Single test interface for both Bluetooth & USB

# Components (Updated)
src/components/pos/receipt/ReceiptPreview.tsx  # Preview component (migrated)
```

### Service Architecture (Consolidated)
```typescript
// Shared Receipt Formatter (NEW)
class ReceiptFormatter {
  static generateESCPOSData(data: ReceiptData): Uint8Array  // Single ESC/POS generator
  // Supports both normal receipts and tax invoices
  // Used by both Bluetooth and USB printers
}

// Shared Data Service (NEW)
class ReceiptDataService {
  static getReceiptData(receiptNumber: string): Promise<ReceiptData>
  static getTaxInvoiceData(receiptNumber: string): Promise<ReceiptData>
  static getReceiptSummary(receiptData: ReceiptData): ReceiptSummary
  static isValidReceiptNumber(receiptNumber: string): boolean
  // Consolidates all database queries for receipt data
}

// Updated Bluetooth Printer Service
class BluetoothThermalPrinter {
  connect()                 // Web Bluetooth API connection
  printReceipt()            // Uses shared ReceiptFormatter
  testPrint()               // Test print functionality
  // No more duplicate ESC/POS generation code
}

// Updated USB Printer Service
class USBThermalPrinter {
  connect()                 // WebUSB API connection
  printReceipt()            // Uses shared ReceiptFormatter
  testPrint()               // Test print functionality
  // No more duplicate ESC/POS generation code
}
```

### Database Integration (Consolidated)
The **ReceiptDataService** consolidates all database queries:
- **Primary**: Direct transaction lookup by receipt number
- **Joins**: Order items, staff names, customer data
- **Calculations**: VAT, totals, payment methods
- **Formatting**: Bangkok timezone, proper product names

**Key Benefits**:
- **Single source of truth** for receipt data queries
- **Eliminates duplicate database logic** across endpoints
- **Consistent data formatting** for all receipt types
- **Optimized queries** with proper error handling
- **Support for both normal receipts and tax invoices**

---

## Thermal Printer Testing

### Consolidation Results (January 2025)
- ✅ **Architecture consolidated**: Single ESC/POS generator replaces 5 services
- ✅ **Code reduction**: ~600 lines of duplicate code eliminated
- ✅ **Tablet-optimized**: Bluetooth/USB only (no server-side dependencies)
- ✅ **Unified data service**: All endpoints use same database queries
- ✅ **Clean setup**: Tax invoices and normal receipts use same architecture
- ✅ **Receipt generation**: Production-ready with real data
- ✅ **ESC/POS compatibility**: Standard thermal printer commands
- ✅ **Database integration**: Real-time transaction data retrieval

### Sample Thermal Output
```
       Lengolf Golf Club
123 Golf Course Road, Bangkok 10120
     Tax ID: 1234567890123
        Tel: 02-123-4567
================================

      TAX INVOICE (ABB)

27/01/25                     14:32
Guest: 3
Staff: John Smith

Received Chicken Fried Rice
1                           180.00
Received Thai Green Curry
1                           220.00
Received Thai Iced Tea
2                           120.00


Subtotal                    486.92
VAT 7%                       33.08
================================
Total                       520.00
================================

Cash                        520.00


R20250727-0146
```

---

## API Endpoints

### 1. Bluetooth Thermal Printing
```http
POST /api/pos/print-bluetooth
```

**Request Body:**
```json
{
  "receiptNumber": "R20250127-0001"
}
```

**Response:**
```json
{
  "success": true,
  "receiptData": {
    "receiptNumber": "R20250127-0001",
    "items": [...],
    "total": 520.00,
    "staffName": "John Smith",
    "transactionDate": "2025-01-27T14:32:00+07:00",
    "paxCount": 3
  },
  "method": "Web Bluetooth API"
}
```

### 3. Receipt Preview
```http
GET /api/pos/receipts/preview?receiptNumber=R20250127-0001
```

**Features:**
- HTML preview of thermal receipt
- Same formatting as actual printer output
- Real product names and data

### 4. Get Receipt Data (Consolidated)
```http
GET /api/pos/receipts/[receiptNumber]?format=thermal&taxInvoice=false
```

**Parameters:**
- `format`: `json` | `html` | `thermal` (default: `json`)
- `taxInvoice`: `true` | `false` (default: `false`)

**Response:**
- `thermal`: ESC/POS thermal data using ReceiptFormatter
- `html`: Simple HTML receipt
- `json`: Structured receipt data from ReceiptDataService

### 5. Test Receipt Generator (Consolidated)
```http
POST /api/test/receipt-generator
```

**Request Body:**
```json
{
  "testData": {
    "receiptNumber": "TEST-001",
    "tableNumber": "T-05",
    "customerName": "Test Customer",
    "staffName": "Test Staff",
    "items": [...],
    "subtotal": 467.29,
    "vatAmount": 32.71,
    "totalAmount": 500.00,
    "paymentMethods": [...]
  },
  "format": "thermal",
  "language": "en"
}
```

---

## Testing Tools

### 1. Windows Thermal Printer Testing
**URL**: `http://localhost:3000/test-thermal`

**Features:**
- Direct Windows thermal printing via Python
- Test with actual receipt numbers
- Real-time database data retrieval
- Production-ready formatting

### 2. Android Bluetooth Printer Testing
**URL**: `http://localhost:3000/test-bluetooth`

**Features:**
- Web Bluetooth API connection testing
- Compatible with Chrome/Edge browsers
- Connect to any ESC/POS Bluetooth printer
- Test print and receipt printing functionality

### 3. Unified Test Interface
**URL**: `http://localhost:3000/test-printer`

**Features:**
- **Single interface** for both Bluetooth and USB testing
- Generate test receipts with sample data
- Test existing receipts from database
- Download thermal files
- Print preview for browser testing
- **Consolidated architecture** - uses ReceiptFormatter

### 4. API Testing Commands
```bash
# Test Windows thermal printing
curl -X POST "http://localhost:3000/api/pos/print-win32" \
  -H "Content-Type: application/json" \
  -d '{"receiptNumber":"R20250127-0001"}'

# Test Android Bluetooth printing data
curl -X POST "http://localhost:3000/api/pos/print-bluetooth" \
  -H "Content-Type: application/json" \
  -d '{"receiptNumber":"R20250127-0001"}'

# Get receipt preview
curl "http://localhost:3000/api/pos/receipts/preview?receiptNumber=R20250127-0001"

# Legacy: Generate test thermal receipt
curl -X POST "http://localhost:3000/api/test/receipt-generator" \
  -H "Content-Type: application/json" \
  -d '{"testData":{...},"format":"thermal","language":"en"}' \
  > test_receipt.txt

# Legacy: Get existing receipt
curl "http://localhost:3000/api/pos/receipts/R20250127-0001?format=thermal&language=en" \
  > actual_receipt.txt
```

### 3. PowerShell Print Helpers
```powershell
# List available printers
.\print_to_bluetooth.ps1

# Print to specific printer
.\print_to_bluetooth.ps1 "printer001" "thermal_receipt_test.txt"

# Direct COM port method (XP-S200M on COM4)
.\send_to_thermal_COM4.ps1 "thermal_receipt_test.txt"

# Original generic method
.\send_to_thermal.ps1 "COM4" "thermal_receipt_test.txt"
```

### 4. Quick Test Commands for XP-S200M
```powershell
# Test printer connectivity
echo "Hello XP-S200M" > test.txt
.\send_to_thermal_COM4.ps1 "test.txt"

# Generate and print test receipt
curl -X POST "http://localhost:3003/api/test/receipt-generator" -H "Content-Type: application/json" -d '{"format":"thermal","language":"en"}' > test_receipt.txt
.\send_to_thermal_COM4.ps1 "test_receipt.txt"
```

---

## Multi-Platform Printer Integration

### Compatible Printers
- **Xprinter series** (XP-80mm, XP-D451B, XP-S200M) ✅ Tested
- **Epson TM series** (TM-T88V, TM-T20, TM-T82)
- **Star TSP series** (TSP100, TSP650, TSP143)
- **Any ESC/POS compatible** 58mm or 80mm thermal printer

### Platform Support (Tablet-Optimized)

#### Tablet POS (Primary Architecture)
- **Method**: Web Bluetooth API + WebUSB API
- **Connection**: Bluetooth pairing or USB connection
- **Browser**: Chrome or Edge (Safari/Firefox not supported)
- **APIs**: `/api/pos/print-bluetooth`, `/api/pos/print-usb`
- **Status**: ✅ Production Ready - Consolidated Architecture
- **Benefits**: No server-side dependencies, runs entirely in browser

### Current Test Configuration
- **Printer Model**: Xprinter XP-S200M
- **Windows**: USB/Serial via COM4 port
- **Android**: Bluetooth pairing
- **Paper Width**: 58mm thermal paper
- **Baud Rate**: 9600 (standard for XP-S200M)
- **Data Bits**: 8
- **Parity**: None
- **Stop Bits**: 1

### Integration Methods

#### Method 1: Web Bluetooth API (Primary - Tablet)
```javascript
// Consolidated ESC/POS generation
const receiptData = await ReceiptDataService.getReceiptData(receiptNumber);
const escposData = ReceiptFormatter.generateESCPOSData(receiptData);

// Web Bluetooth API for tablets
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
});
const server = await device.gatt.connect();
const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
await characteristic.writeValue(escposData);
```

#### Method 2: WebUSB API (Primary - Tablet)
```javascript
// Web Bluetooth API for Android
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
});
const server = await device.gatt.connect();
const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
await characteristic.writeValue(new TextEncoder().encode(receiptContent));
```

#### Method 3: WebUSB API (Tablet USB)
```javascript
// Consolidated ESC/POS generation (same as Bluetooth)
const receiptData = await ReceiptDataService.getReceiptData(receiptNumber);
const escposData = ReceiptFormatter.generateESCPOSData(receiptData);

// WebUSB API for direct USB connection
const device = await navigator.usb.requestDevice({
  filters: [{ vendorId: 0x04B8 }] // Epson, etc.
});
await device.open();
await device.selectConfiguration(1);
await device.claimInterface(0);
await device.transferOut(1, escposData); // Endpoint 1
```

#### Method 4: Legacy PowerShell (Not recommended)
```powershell
# For XP-S200M printer on COM4
$port = new-Object System.IO.Ports.SerialPort "COM4", 9600, "None", 8, "One"
$port.Open()
$port.Write($receiptContent)
$port.Close()
```

#### Method 4: PowerShell Direct COM4 Script
```powershell
# send_to_thermal_COM4.ps1 - Optimized for XP-S200M
param(
    [string]$FilePath = "thermal_receipt_test.txt"
)

try {
    $port = New-Object System.IO.Ports.SerialPort "COM4", 9600, "None", 8, "One"
    $port.Open()
    
    # Initialize printer (ESC/POS command)
    $port.Write([char]27 + "@")
    
    # Send receipt content
    $content = Get-Content $FilePath -Raw
    $port.Write($content)
    
    # Feed and cut paper
    $port.Write("`n`n`n")  # Feed 3 lines
    $port.Write([char]27 + "d" + [char]3)  # Feed lines
    $port.Write([char]29 + "V" + [char]1)  # Cut paper
    
    $port.Close()
    Write-Host "✅ Receipt sent to XP-S200M on COM4 successfully!"
} catch {
    Write-Host "❌ Error printing to COM4: $($_.Exception.Message)"
    if ($port -and $port.IsOpen) {
        $port.Close()
    }
}
```

#### Method 5: ESC/POS Commands
```javascript
// Enhanced thermal output with ESC/POS
const escInit = '\x1B@';      // Initialize
const escCut = '\x1DV\x01';   // Cut paper
const escFeed = '\n\n\n';     // Feed paper

const output = escInit + receiptContent + escFeed + escCut;
```

---

## Troubleshooting

### Common Issues

#### 1. "StartDocPrinter call was not issued"
**Cause**: Windows printer spooler issue  
**Solution**: 
- Restart Print Spooler service
- Use alternative printing method
- Try printer manufacturer's software

#### 2. "Drive with name 'COM3' does not exist"
**Cause**: COM port not properly configured  
**Solution**:
- Check Device Manager for COM ports
- Reinstall Bluetooth printer drivers
- Use manufacturer's pairing software

#### 3. Receipt cuts off or formatting issues
**Cause**: Printer width/font size mismatch  
**Solution**:
- Verify 58mm width setting
- Adjust font size in thermal generator
- Check printer DPI settings

#### 4. Characters not printing correctly
**Cause**: Character encoding issues  
**Solution**:
- Use UTF-8 encoding
- Test with English-only content first
- Check printer's character set support

### Debug Steps

#### Tablet Debugging
1. **Test browser support**
   ```javascript
   console.log('Bluetooth support:', 'bluetooth' in navigator);
   console.log('WebUSB support:', 'usb' in navigator);
   ```

2. **Test API endpoint**
   ```bash
   curl -X POST "http://localhost:3000/api/pos/print-bluetooth" \
     -H "Content-Type: application/json" \
     -d '{"receiptNumber":"R20250127-0001"}'
   ```

3. **Test consolidated formatter**
   ```bash
   curl "http://localhost:3000/api/pos/receipts/R20250127-0001?format=thermal"
   ```
1. **Check Bluetooth support**
   ```javascript
   console.log('Bluetooth support:', 'bluetooth' in navigator);
   ```

2. **Test browser compatibility**
   - ✅ Chrome: Full support
   - ✅ Edge: Full support
   - ❌ Firefox: Not supported
   - ❌ Safari: Not supported

3. **Verify printer pairing**
   ```
   Android Settings > Bluetooth > Paired Devices
   ```

4. **Test connection**
   ```
   Visit: http://localhost:3000/test-bluetooth
   Click: "Connect Printer"
   ```

#### General Debugging
5. **Verify thermal format**
   ```bash
   # Check line length (should be ~44 characters)
   wc -L thermal_receipt_test.txt
   ```

6. **Test with simple text**
   ```
   echo "Hello World" > simple_test.txt
   # Try printing simple_test.txt first
   ```

---

## Production Features (Implemented)

### ✅ Current Production Features (Consolidated Architecture)
- [x] **Tablet-optimized architecture** - Bluetooth + USB only
- [x] **Consolidated codebase** - Single ESC/POS generator, unified data service
- [x] **Code reduction** - ~600 lines of duplicate code eliminated
- [x] **Real-time data** - Live database integration via ReceiptDataService
- [x] **Production receipts** - Actual product/staff names
- [x] **Bangkok timezone** - Accurate transaction timestamps
- [x] **Guest count tracking** - Table session pax_count
- [x] **ESC/POS compatibility** - Standard thermal printer commands
- [x] **Unified test interface** - Single interface for both connection types
- [x] **Clean setup** - Tax invoices and normal receipts use same architecture

### 🔄 Future Enhancements
- [ ] **Auto-print on payment** - Automatic printing after successful payment
- [ ] **Print queue management** - Handle multiple print jobs
- [ ] **Printer status monitoring** - Paper level, connectivity status
- [ ] **Receipt templates** - Customizable layouts using ReceiptFormatter
- [ ] **QR code integration** - Digital receipt links
- [ ] **Enhanced error handling** - Better retry logic for tablet printing

### ESC/POS Command Enhancement
```typescript
// Enhanced thermal output with more ESC/POS commands
class EnhancedThermalGenerator {
  addBarcodes()     // Receipt number as barcode
  addQRCode()       // Digital receipt link
  setFontSizes()    // Different font sizes for headers
  addLogos()        // Company logo printing
  setCutOptions()   // Full/partial cut options
}
```

---

## Production Deployment

### Checklist (Consolidated Architecture)
- [x] **Test with actual thermal printer** - Xprinter XP-S200M tested
- [x] **Verify receipt format** - Thai VAT tax invoice format compliant
- [x] **Production data integration** - Real transaction/product/staff data
- [x] **Consolidated architecture** - ReceiptFormatter + ReceiptDataService deployed
- [x] **Tablet deployment** - Web Bluetooth + WebUSB API implementation ready
- [x] **Code optimization** - Duplicate services removed, codebase streamlined
- [x] **Unified testing** - Single test interface for both connection types
- [ ] **Auto-print integration** - POS workflow integration (manual for now)
- [ ] **Configure printer drivers** - On production tablet hardware
- [ ] **Set up printer monitoring** - Alerts for paper/connectivity
- [ ] **Document maintenance** - Printer maintenance procedures

### Environment Configuration
```bash
# .env.local - Production thermal printing
POS_RECEIPT_AUTO_PRINT=false     # Auto-print after payment (set true when ready)
POS_RECEIPT_COPIES=1             # Number of copies
POS_RECEIPT_LANGUAGE=en          # Default language
POS_RECEIPT_PRINTER_URL=         # Network printer URL (optional)

# Windows Python printing
PYTHON_THERMAL_PRINTER=true      # Enable Python thermal printing

# Android Bluetooth printing
BLUETOOTH_PRINTING_ENABLED=true  # Enable Bluetooth printing features
```

---

## Contact Information

For printer integration support or questions:
- Check manufacturer documentation for ESC/POS commands
- Test with manufacturer's mobile app first
- Verify Bluetooth pairing and driver installation

**Document maintained by**: Development Team  
**Last updated**: January 31, 2025  
**Architecture**: Consolidated (v3.0)  
**Printers tested**: 
- Xprinter XP-S200M (Bluetooth + USB via tablet)
- Production deployment ready with consolidated architecture  
**Code reduction**: ~600 lines of duplicate code eliminated

---

**End of Document**