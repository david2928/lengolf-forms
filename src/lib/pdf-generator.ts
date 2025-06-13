export interface InvoiceData {
  invoice_number: string
  invoice_date: string
  supplier: {
    name: string
    address_line1: string
    address_line2?: string
    tax_id?: string
  }
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    line_total: number
  }>
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  company_info: {
    name: string
    address_line1: string
    address_line2: string
    tax_id: string
  }
}

// Simple HTML template for invoice PDF generation
export function generateInvoiceHTML(invoiceData: InvoiceData): string {
  const {
    invoice_number,
    invoice_date,
    supplier,
    items,
    subtotal,
    tax_rate,
    tax_amount,
    total_amount,
    company_info
  } = invoiceData

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice_number}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 30px;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: #fff;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
        
        /* Header with invoice number in top right */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #333;
        }
        
        .supplier-info {
            flex: 1;
        }
        
        .supplier-name {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        
        .supplier-details {
            font-size: 14px;
            line-height: 1.6;
            color: #666;
        }
        
        .invoice-number-section {
            text-align: right;
            background: #333;
            color: white;
            padding: 20px 25px;
            border-radius: 8px;
            min-width: 220px;
        }
        
        .invoice-label {
            font-size: 16px;
            font-weight: normal;
            margin-bottom: 8px;
            color: #ccc;
        }
        
        .invoice-number {
            font-size: 24px;
            font-weight: bold;
            font-family: monospace;
            color: white;
            margin-bottom: 12px;
        }
        
        .invoice-date {
            font-size: 14px;
            color: #ccc;
        }
        
        /* Bill To Section */
        .bill-to-section {
            margin-bottom: 40px;
            background: #f8f9fa;
            border-left: 4px solid #666;
        }
        
        .bill-to-header {
            background: #666;
            color: white;
            padding: 12px 20px;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 0;
        }
        
        .bill-to-content {
            padding: 20px;
            font-size: 14px;
            line-height: 1.6;
        }
        
        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
            border: 1px solid #ddd;
        }
        
        .items-table th {
            background: #333;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: bold;
            font-size: 14px;
        }
        
        .items-table th:nth-child(2),
        .items-table th:nth-child(3),
        .items-table th:nth-child(4) {
            text-align: center;
        }
        
        .items-table td {
            border: 1px solid #e0e0e0;
            padding: 15px 12px;
            text-align: left;
            vertical-align: top;
        }
        
        .items-table td:nth-child(2),
        .items-table td:nth-child(3),
        .items-table td:nth-child(4) {
            text-align: center;
        }
        
        .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .items-table tr:hover {
            background-color: #f5f5f5;
        }
        
        /* Totals Section */
        .totals-section {
            float: right;
            width: 400px;
            margin-bottom: 40px;
        }
        
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
        }
        
        .totals-table td {
            padding: 12px 20px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
        }
        
        .totals-table .label {
            font-weight: 600;
            text-align: left;
            background-color: #f8f9fa;
            color: #333;
            width: 60%;
        }
        
        .totals-table .amount {
            text-align: right;
            font-family: monospace;
            font-weight: 500;
            color: #333;
        }
        
        .total-row {
            background: #333 !important;
            color: white !important;
            font-weight: bold;
            font-size: 16px;
        }
        
        .total-row .label {
            background: #333 !important;
            color: white !important;
        }
        
        .total-row .amount {
            background: #333 !important;
            color: white !important;
            font-size: 18px;
        }
        
        .clearfix {
            clear: both;
        }
        
        /* Print styles */
        @media print {
            body { 
                margin: 0; 
                padding: 20px;
            }
            .invoice-container { 
                box-shadow: none; 
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header with supplier info and invoice number -->
        <div class="header">
            <div class="supplier-info">
                <div class="supplier-name">${supplier.name}</div>
                <div class="supplier-details">
                    ${supplier.address_line1}<br>
                    ${supplier.address_line2 ? `${supplier.address_line2}<br>` : ''}
                    ${supplier.tax_id ? `Tax ID: ${supplier.tax_id}` : ''}
                </div>
            </div>
            <div class="invoice-number-section">
                <div class="invoice-label">INVOICE</div>
                <div class="invoice-number">#${invoice_number}</div>
                <div class="invoice-date">${new Date(invoice_date).toLocaleDateString('en-GB')}</div>
            </div>
        </div>

        <!-- Bill To Section -->
        <div class="bill-to-section">
            <div class="bill-to-header">BILL TO</div>
            <div class="bill-to-content">
                <strong>${company_info.name}</strong><br>
                Tax ID: ${company_info.tax_id}<br>
                ${company_info.address_line1}<br>
                ${company_info.address_line2}
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 50%;">DESCRIPTION</th>
                    <th style="width: 15%;">QTY</th>
                    <th style="width: 17.5%;">UNIT PRICE</th>
                    <th style="width: 17.5%;">AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item: any) => `
                    <tr>
                        <td style="font-weight: 500;">${item.description}</td>
                        <td>${item.quantity.toLocaleString()}</td>
                        <td>฿${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style="font-weight: 600;">฿${item.line_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                `).join('')}
                ${Array(Math.max(0, 3 - items.length)).fill(0).map(() => `
                    <tr>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal</td>
                    <td class="amount">฿${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                    <td class="label">Withholding Tax (${tax_rate}%)</td>
                    <td class="amount" style="color: #dc2626;">-฿${tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">TOTAL (THB)</td>
                    <td class="amount">฿${total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
            </table>
        </div>
        
        <div class="clearfix"></div>
    </div>
</body>
</html>
  `
} 