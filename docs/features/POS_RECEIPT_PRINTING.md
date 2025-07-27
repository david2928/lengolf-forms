# POS Receipt Printing System Documentation

**Document Version**: 2.0  
**Last Updated**: January 2025  
**Status**: ✅ **PRODUCTION READY WITH MULTI-PLATFORM SUPPORT**

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

The Lengolf POS system includes a comprehensive receipt printing system that supports multiple output formats:
- **Thermal receipts** (58mm width, ESC/POS compatible)
- **HTML receipts** (A4 format for laser printers)
- **JSON data** (for custom integrations)

### Key Features
- ✅ **Multi-platform printing** - Windows (win32print) + Android (Bluetooth)
- ✅ **Multi-format support** - Thermal, HTML, JSON
- ✅ **Production-ready receipts** - Proper product names, staff names, guest counts
- ✅ **Bangkok timezone** - Accurate transaction timestamps
- ✅ **Real-time data** - Direct database integration with transaction_details view
- ✅ **Tax compliance** - Thai VAT calculations and formatting
- ✅ **Complete itemization** - Products, quantities, prices, notes
- ✅ **Payment methods** - Multiple payment types supported
- ✅ **Business branding** - Company info, tax ID, contact details

---

## Current Implementation

### Core Files
```
# Thermal Printer Services
src/services/Win32ThermalPrinter.ts           # Windows thermal printing
src/services/BluetoothThermalPrinter.ts       # Android Bluetooth printing

# API Endpoints
app/api/pos/print-win32/route.ts              # Windows thermal print API
app/api/pos/print-bluetooth/route.ts          # Android Bluetooth print API
app/api/pos/receipts/preview/route.ts         # Receipt preview API
app/api/pos/receipts/[receiptNumber]/route.ts # Receipt data API

# Test Interfaces
app/test-thermal/page.tsx                     # Windows printer testing
app/test-bluetooth/page.tsx                   # Android Bluetooth testing

# Legacy Files (still available)
src/services/ReceiptGenerator.ts              # Original receipt generator
app/test-printer/page.tsx                     # Browser-based test interface
```

### Service Architecture
```typescript
// Windows Thermal Printer Service
class Win32ThermalPrinter {
  formatReceipt()           // ESC/POS thermal formatting
  printReceipt()            // Windows win32print integration
  generateReceiptContent()  // Full receipt content generation
}

// Android Bluetooth Printer Service
class BluetoothThermalPrinter {
  connect()                 // Web Bluetooth API connection
  printReceipt()            // Client-side Bluetooth printing
  testPrint()               // Test print functionality
  formatForBluetooth()      // ESC/POS command generation
}

// Legacy Receipt Generator Service (still available)
class ReceiptGenerator {
  generateReceiptData()     // Creates receipt data structure
  generateHTMLReceipt()     // HTML format for A4 printing
  generateThermalReceipt()  // 58mm thermal format
  generateReceiptSummary()  // Summary data
}
```

### Database Integration
The system retrieves receipt data from:
- **`pos.transaction_details` view** - Complete transaction data with joins
- `pos.transactions` - Core transaction records
- `pos.orders` - Order details with order_items
- `pos.order_items` - Individual line items
- `pos.table_sessions` - Table and guest information
- `products.products` - Actual product names
- `backoffice.staff` - Real staff names (not "Staff-")

**Key Enhancement**: The `transaction_details` view provides:
- Staff names from `backoffice.staff` table
- Bangkok timezone conversion (`sales_timestamp_bkk`)
- Guest count (`pax_count`) from table sessions
- Complete transaction data in a single query

---

## Thermal Printer Testing

### Test Results (January 2025)
- ✅ **Receipt generation**: Production-ready with real data
- ✅ **Windows printing**: Python win32print integration working
- ✅ **Android Bluetooth**: Web Bluetooth API implementation complete
- ✅ **Format output**: 58mm thermal format with proper alignment
- ✅ **Content accuracy**: Real product names, staff names, timestamps
- ✅ **ESC/POS compatibility**: Standard thermal printer commands
- ✅ **Multi-platform**: Windows desktop + Android mobile deployment
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

### 1. Windows Thermal Printing
```http
POST /api/pos/print-win32
```

**Request Body:**
```json
{
  "receiptNumber": "R20250127-0001",
  "testPrint": false
}
```

**Features:**
- Direct Windows thermal printing via Python win32print
- Real-time receipt data reconstruction
- Bangkok timezone timestamps
- Staff name resolution from database
- Guest count from table sessions

### 2. Android Bluetooth Printing
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

### 4. Get Receipt Data (Legacy)
```http
GET /api/pos/receipts/[receiptNumber]?format=thermal&language=en
```

**Parameters:**
- `format`: `json` | `html` | `thermal` (default: `json`)
- `language`: `en` | `th` (default: `en`)

**Response:**
- `thermal`: Plain text thermal printer format
- `html`: Formatted HTML for browser printing
- `json`: Structured receipt data

### 5. Test Receipt Generator (Legacy)
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

### 3. Browser Test Interface (Legacy)
**URL**: `http://localhost:3000/test-printer`

**Features:**
- Generate test receipts with sample data
- Test existing receipts from database
- Download thermal files
- Print preview for browser testing

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

### Platform Support

#### Windows Desktop/Laptop POS
- **Method**: Python win32print integration
- **Connection**: USB, Serial (COM), or Bluetooth
- **API**: `/api/pos/print-win32`
- **Status**: ✅ Production Ready

#### Android Tablet/Phone POS
- **Method**: Web Bluetooth API
- **Connection**: Bluetooth pairing required
- **Browser**: Chrome or Edge (Safari/Firefox not supported)
- **API**: `/api/pos/print-bluetooth`
- **Status**: ✅ Production Ready

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

#### Method 1: Windows Python Integration (Primary)
```python
# Direct Windows printing via win32print
import win32print
import win32api

printer_name = win32print.GetDefaultPrinter()
hJob = win32print.StartDocPrinter(hPrinter, 1, ("Thermal Receipt", None, "RAW"))
win32print.WritePrinter(hPrinter, receipt_content.encode('utf-8'))
win32print.EndDocPrinter(hPrinter)
```

#### Method 2: Android Web Bluetooth API (Primary)
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

#### Method 3: Windows PowerShell (Alternative)
```powershell
# Install printer driver, then use PowerShell
Get-Content "receipt.txt" -Raw | Out-Printer -Name "YourPrinterName"
```

#### Method 4: Direct Serial Communication (XP-S200M on COM4)
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

#### Windows Debugging
1. **Test Windows printing first**
   ```
   Windows Settings > Printers > Print Test Page
   ```

2. **Test API endpoint**
   ```bash
   curl -X POST "http://localhost:3000/api/pos/print-win32" \
     -H "Content-Type: application/json" \
     -d '{"receiptNumber":"R20250127-0001"}'
   ```

3. **Check printer status**
   ```powershell
   Get-Printer | Select-Object Name, PrinterStatus
   ```

#### Android Debugging
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

### ✅ Current Production Features
- [x] **Multi-platform support** - Windows + Android deployment
- [x] **Real-time data** - Live database integration
- [x] **Production receipts** - Actual product/staff names
- [x] **Bangkok timezone** - Accurate transaction timestamps
- [x] **Guest count tracking** - Table session pax_count
- [x] **ESC/POS compatibility** - Standard thermal printer commands
- [x] **Auto-detection** - Platform-specific printing methods
- [x] **Test interfaces** - Both Windows and Android testing

### 🔄 Future Enhancements
- [ ] **Auto-print on payment** - Automatic printing after successful payment
- [ ] **Print queue management** - Handle multiple print jobs
- [ ] **Printer status monitoring** - Paper level, connectivity status
- [ ] **Custom receipt templates** - Different layouts for different businesses
- [ ] **QR code integration** - Digital receipt links
- [ ] **Duplicate receipt protection** - Prevent accidental reprints

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

### Checklist
- [x] **Test with actual thermal printer** - Xprinter XP-S200M tested
- [x] **Verify receipt format** - Thai VAT tax invoice format compliant
- [x] **Production data integration** - Real transaction/product/staff data
- [x] **Windows deployment** - Python win32print integration ready
- [x] **Android deployment** - Web Bluetooth API implementation ready
- [ ] **Auto-print integration** - POS workflow integration (manual for now)
- [ ] **Configure printer drivers** - On production hardware
- [ ] **Test network connectivity** - If using network printers
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
**Last tested**: January 27, 2025  
**Printers tested**: 
- Xprinter XP-S200M (Windows COM4 + Android Bluetooth)
- Production deployment ready for both platforms

---

**End of Document**