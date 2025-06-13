import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface ParsedInvoiceData {
  items: InvoiceItem[];
  summary: {
    totalItems: number;
    totalAmount: number;
    parseErrors: string[];
  };
  preview: any[];
}

interface InvoiceItem {
  id: string;
  date: string;           // YYYY-MM-DD format
  customerName: string;
  productType?: string;   // Golf lesson type, menu item, etc.
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
  rawData: Record<string, any>;  // Original parsed row
}

// Configuration for different reconciliation types
const PARSING_CONFIGS = {
  restaurant: {
    expectedColumns: {
      date: ['Date', 'Transaction Date', 'Order Date', 'date'],
      customer: ['Customer', 'Customer Name', 'Name', 'customer_name'],
      product: ['Item', 'Product', 'Description', 'Product Name', 'product_name'],
      quantity: ['Qty', 'Quantity', 'Amount', 'quantity'],
      amount: ['Total', 'Amount', 'Price', 'Total Amount', 'total_amount', 'item_price_incl_vat'],
      unitPrice: ['Unit Price', 'Per Item', 'Price Each', 'unit_price']
    },
    dateFormats: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'],
    currencySymbols: ['฿', 'THB', '$', '€', '£']
  },
  golf_coaching_ratchavin: {
    expectedColumns: {
      date: ['Date', 'Lesson Date', 'Class Date', 'date', 'วันที่', 'เวลา', 'Date/Time'],
      customer: ['Student', 'Student Name', 'Name', 'Customer', 'customer_name', 'ชื่อ', 'ลูกค้า'],
      quantity: ['QTY', 'Qty', 'Lessons', 'Lesson Count', 'Sessions', 'quantity', 'จำนวน', 'จำนวนครั้ง', 'Count'],
      amount: ['AMOUNT', 'Amount', 'Total', 'Fee', 'Price', 'total_amount', 'ราคา', 'จำนวนเงิน'],
      unitPrice: ['UNIT PRICE', 'Unit Price', 'Per Lesson', 'Lesson Fee', 'Rate', 'unit_price', 'ราคาต่อครั้ง'],
      product: ['Type', 'Service', 'Lesson Type', 'Product', 'บริการ', 'ประเภท']
    },
    dateFormats: ['M/D/YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'],
    currencySymbols: ['฿', 'THB', '$', 'บาท']
  },
  golf_coaching_boss: {
    expectedColumns: {
      date: ['Date', 'Lesson Date', 'Class Date', 'date', 'วันที่', 'เวลา', 'Date/Time'],
      customer: ['Student', 'Student Name', 'Name', 'Customer', 'customer_name', 'ชื่อ', 'ลูกค้า'],
      quantity: ['QTY', 'Qty', 'Lessons', 'Lesson Count', 'Sessions', 'quantity', 'จำนวน', 'จำนวนครั้ง', 'Count'],
      amount: ['AMOUNT', 'Amount', 'Total', 'Fee', 'Price', 'total_amount', 'ราคา', 'จำนวนเงิน'],
      unitPrice: ['UNIT PRICE', 'Unit Price', 'Per Lesson', 'Lesson Fee', 'Rate', 'unit_price', 'ราคาต่อครั้ง'],
      product: ['Type', 'Service', 'Lesson Type', 'Product', 'บริการ', 'ประเภท']
    },
    dateFormats: ['M/D/YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'],
    currencySymbols: ['฿', 'THB', '$', 'บาท']
  }
};

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const reconciliationType = formData.get('reconciliationType') as string;
    const startDate = formData.get('startDate') as string | null;
    const endDate = formData.get('endDate') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!reconciliationType || !PARSING_CONFIGS[reconciliationType as keyof typeof PARSING_CONFIGS]) {
      return NextResponse.json({ error: 'Invalid reconciliation type' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only CSV and Excel files are supported.' 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Parse file based on type
    let parsedData: ParsedInvoiceData;
    const config = PARSING_CONFIGS[reconciliationType as keyof typeof PARSING_CONFIGS];

    // Debug configuration
    console.log('Reconciliation type:', reconciliationType);
    console.log('Config found:', !!config);
    console.log('Config structure:', config ? Object.keys(config) : 'none');

    if (!config) {
      return NextResponse.json({ 
        error: `Configuration not found for reconciliation type: ${reconciliationType}. Available types: ${Object.keys(PARSING_CONFIGS).join(', ')}` 
      }, { status: 400 });
    }

    if (isCSV) {
      parsedData = await parseCSVFile(file, config);
    } else {
      parsedData = await parseExcelFile(file, config);
    }

    // Auto-detect date range from invoice data if not provided
    let autoDetectedDateRange: { start: string; end: string } | null = null;
    if (parsedData.items.length > 0) {
      const dates = parsedData.items.map(item => item.date).sort();
      autoDetectedDateRange = {
        start: dates[0],
        end: dates[dates.length - 1]
      };
    }

    // Filter data by date range if manually provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      parsedData.items = parsedData.items.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
      
      // Update summary
      parsedData.summary.totalItems = parsedData.items.length;
      parsedData.summary.totalAmount = parsedData.items.reduce((sum, item) => sum + item.totalAmount, 0);
    }

    // Create preview (first 10 rows)
    parsedData.preview = parsedData.items.slice(0, 10).map(item => ({
      Date: item.date,
      Customer: item.customerName,
      Product: item.productType || 'N/A',
      Quantity: item.quantity,
      'Unit Price': item.unitPrice,
      'Total Amount': item.totalAmount
    }));

    return NextResponse.json({
      success: true,
      data: parsedData,
      preview: parsedData.preview,
      summary: parsedData.summary,
      autoDetectedDateRange
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'File processing failed' 
    }, { status: 500 });
  }
}

async function parseCSVFile(file: File, config: any): Promise<ParsedInvoiceData> {
  const text = await file.text();
  const parseErrors: string[] = [];
  
  try {
    // Parse CSV with headers
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      quote: '"',
      escape: '"'
    });

    const items: InvoiceItem[] = [];
    let totalAmount = 0;

    records.forEach((record: any, index: number) => {
      try {
        const item = parseRecord(record, config, index + 1);
        if (item) {
          items.push(item);
          totalAmount += item.totalAmount;
        }
      } catch (error) {
        parseErrors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    });

    return {
      items,
      summary: {
        totalItems: items.length,
        totalAmount,
        parseErrors
      },
      preview: []
    };

  } catch (error) {
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function parseExcelFile(file: File, config: any): Promise<ParsedInvoiceData> {
  const buffer = await file.arrayBuffer();
  const parseErrors: string[] = [];
  
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const records = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false
    });

    if (records.length < 2) {
      throw new Error('Excel file must contain at least a header row and one data row');
    }

    // Find the header row (look for rows with multiple non-empty columns)
    let headerRowIndex = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < records.length; i++) {
      const row = records[i] as string[];
      if (row && row.length > 0) {
        const nonEmptyValues = row.filter(cell => cell && cell.toString().trim() !== '');
        // Look for rows with at least 4 columns that look like headers
        if (nonEmptyValues.length >= 4) {
          const hasCommonHeaders = row.some(cell => 
            cell && (
              cell.toString().toLowerCase().includes('date') ||
              cell.toString().toLowerCase().includes('name') ||
              cell.toString().toLowerCase().includes('amount') ||
              cell.toString().toLowerCase().includes('total') ||
              cell.toString().toLowerCase().includes('price')
            )
          );
          
          if (hasCommonHeaders) {
            headerRowIndex = i;
            headers = row;
            break;
          }
        }
      }
    }
    
    if (headerRowIndex === -1) {
      // Fallback to first row if no clear header found
      headerRowIndex = 0;
      headers = records[0] as string[];
    }
    
    const dataRows = records.slice(headerRowIndex + 1);
    
    // Debug headers
    console.log('Excel header row found at index:', headerRowIndex);
    console.log('Excel headers detected:', headers);
    console.log('Sample first data row:', dataRows[0]);
    
    const items: InvoiceItem[] = [];
    let totalAmount = 0;

    dataRows.forEach((row: any, index: number) => {
      try {
        const record: any = {};
        headers.forEach((header, colIndex) => {
          record[header] = row[colIndex] || '';
        });

        // Debug first record
        if (index === 0) {
          console.log('First record object:', record);
          console.log('Available columns:', Object.keys(record));
        }

        const item = parseRecord(record, config, headerRowIndex + index + 2); // Adjust row number
        if (item) {
          items.push(item);
          totalAmount += item.totalAmount;
        }
      } catch (error) {
        parseErrors.push(`Row ${headerRowIndex + index + 2}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    });

    return {
      items,
      summary: {
        totalItems: items.length,
        totalAmount,
        parseErrors
      },
      preview: []
    };

  } catch (error) {
    throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseRecord(record: any, config: any, rowNumber: number): InvoiceItem | null {
  // Validate config structure
  if (!config || !config.expectedColumns) {
    throw new Error('Invalid configuration: missing expectedColumns');
  }

  // Find matching columns with fallback to empty array if undefined
  const dateValue = findColumnValue(record, config.expectedColumns.date || []);
  const customerValue = findColumnValue(record, config.expectedColumns.customer || []);
  const quantityValue = findColumnValue(record, config.expectedColumns.quantity || []);
  const amountValue = findColumnValue(record, config.expectedColumns.amount || []);
  const productValue = findColumnValue(record, config.expectedColumns.product || []) || 'N/A';
  const unitPriceValue = findColumnValue(record, config.expectedColumns.unitPrice || []);

  // Validate required fields
  if (!dateValue || !customerValue || !quantityValue || !amountValue) {
    throw new Error('Missing required fields (date, customer, quantity, amount)');
  }

  // Parse and validate date
  const parsedDateComponents = parseDate(dateValue, config.dateFormats);
  if (!parsedDateComponents) {
    throw new Error(`Invalid date format: ${dateValue}`);
  }

  // Parse numeric values
  const quantity = parseNumber(quantityValue);
  const totalAmount = parseNumber(amountValue, config.currencySymbols);
  const unitPrice = unitPriceValue ? parseNumber(unitPriceValue, config.currencySymbols) : totalAmount / quantity;

  if (isNaN(quantity) || isNaN(totalAmount)) {
    throw new Error('Invalid numeric values for quantity or amount');
  }

  // Format date as YYYY-MM-DD to avoid timezone issues
  const formattedDate = `${parsedDateComponents.year}-${parsedDateComponents.month.toString().padStart(2, '0')}-${parsedDateComponents.day.toString().padStart(2, '0')}`;

  return {
    id: `row_${rowNumber}_${Date.now()}`,
    date: formattedDate,
    customerName: customerValue.toString().trim(),
    productType: productValue.toString().trim(),
    quantity,
    unitPrice,
    totalAmount,
    rawData: record
  };
}

function findColumnValue(record: any, possibleColumns: string[]): any {
  // Validate input
  if (!Array.isArray(possibleColumns)) {
    console.error('possibleColumns is not an array:', possibleColumns);
    return null;
  }
  
  if (!record || typeof record !== 'object') {
    console.error('record is not an object:', record);
    return null;
  }

  for (const column of possibleColumns) {
    const value = record[column];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function parseDate(dateStr: string, formats: string[]): { year: number; month: number; day: number } | null {
  const str = dateStr.toString().trim();
  
  // Try MM/DD/YYYY format (most common for Excel exports)
  const mmddyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day)
    };
  }
  
  // Try DD/MM/YYYY format  
  const ddmmyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, part1, part2, year] = ddmmyyyyMatch;
    // If first part is > 12, it's definitely DD/MM/YYYY
    if (parseInt(part1) > 12) {
      return {
        year: parseInt(year),
        month: parseInt(part2),
        day: parseInt(part1)
      };
    }
    // Otherwise assume MM/DD/YYYY (American format more common in Excel)
    return {
      year: parseInt(year),
      month: parseInt(part1),
      day: parseInt(part2)
    };
  }
  
  // Try YYYY-MM-DD format
  const yyyymmddMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day)
    };
  }

  return null;
}

function parseNumber(value: any, currencySymbols: string[] = []): number {
  let str = value.toString().trim();
  
  // Remove currency symbols
  currencySymbols.forEach(symbol => {
    str = str.replace(new RegExp(`\\${symbol}`, 'g'), '');
  });
  
  // Remove common formatting
  str = str.replace(/[,\s]/g, ''); // Remove commas and spaces
  
  return parseFloat(str) || 0;
} 