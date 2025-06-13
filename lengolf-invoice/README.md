# LENGOLF Invoice Generator

A simple web-based invoice generator for LENGOLF golf simulator business.

## Features

- Directory of service suppliers with ability to add new ones
- Invoice generation with customizable items and quantities
- Automatic calculation of subtotal, tax (WHT), and total
- PDF generation with professional invoice layout
- Local storage of supplier information

## How to Use

1. **Open the Application**
   - Simply open `index.html` in any modern web browser

2. **Manage Suppliers with CSV**
   - A sample `suppliers.csv` file is included in the project
   - Edit this file in any spreadsheet program (Excel, Google Sheets, etc.)
   - Each row should contain: Name, ID, Address, Bank (optional), Account (optional)
   - Save as CSV and upload using the "Suppliers CSV File" button
   - You can also create your own CSV file following this format

3. **Select a Supplier**
   - Choose from the dropdown after loading the CSV file
   - Supplier details will be automatically populated in the form

4. **Set Invoice Details**
   - The system automatically suggests an invoice number (YYYYM format) and today's date
   - Modify if needed

5. **Add Invoice Items**
   - Enter description, quantity, and unit price for each service item
   - Click "Add Item" to add more rows
   - The amount is calculated automatically

6. **Review Totals**
   - Subtotal is calculated automatically
   - Default WHT tax rate is 3% (adjustable)
   - Total is calculated as (Subtotal - Tax)

7. **Generate PDF**
   - Click "Generate PDF" to create the invoice
   - The PDF will be saved with the filename format: `LENGOLF_supplier-name_invoice-number.pdf`

## CSV Format
```
Name,ID,Address,Bank,Account
Poraputr Srethabutr,3100601482127,"664/10 ม.วัดจันทร์ แขวงบางคอแหลม กรุงเทพมหานคร",SCB,4180940637
```

- If your address contains commas, make sure to wrap it in double quotes as shown above
- Bank and Account fields are optional

## Notes

- All supplier data is stored in your browser's local storage
- The application works entirely in your browser - no internet connection required
- For best results, use Chrome, Firefox, or Edge

## Requirements

- Modern web browser with JavaScript enabled
- No internet connection required after initial page load 