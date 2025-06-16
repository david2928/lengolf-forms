import { NextResponse } from 'next/server';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

// LINE Messaging API configuration for inventory reports
// Using dedicated group ID specifically for weekly inventory reports
const INVENTORY_REPORT_GROUP_ID = "C6a28e92972002dd392e8cc4f005afce2"; // Hardcoded for inventory reports
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function sendLineMessage(message: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !INVENTORY_REPORT_GROUP_ID) {
    console.error('Missing LINE Channel Access Token or Group ID');
    throw new Error('LINE Messaging API configuration is incomplete');
  }

  try {
    console.log(`Sending LINE message to group: ${INVENTORY_REPORT_GROUP_ID}`);
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: INVENTORY_REPORT_GROUP_ID,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API Error:', response.status, errorText);
      throw new Error(`LINE API failed: ${response.status} - ${errorText}`);
    }

    console.log('LINE message sent successfully to group');
    return true;
  } catch (error) {
    console.error('Error sending LINE message:', error);
    throw error;
  }
}

interface InventoryItem {
  product_name: string;
  supplier: string;
  current_value: number | string | null;
  reorder_threshold: number | null;
  input_type: string;
  category_name: string;
  category_id: string;
}

async function getLatestInventoryData(specificDate?: string): Promise<{ items: InventoryItem[], date: string }> {
  try {
    console.log('Getting latest inventory data for each product...');

    let targetDate: string;

    if (specificDate) {
      // Use the provided specific date
      targetDate = specificDate;
      console.log(`Using specified date: ${targetDate}`);
    } else {
      // Get the latest date from inventory submissions
      const { data: latestDateResult, error: latestDateError } = await supabase
        .from('inventory_submission')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

      if (latestDateError || !latestDateResult || latestDateResult.length === 0) {
        console.error('Error getting latest date:', latestDateError);
        return { items: [], date: '' };
      }

      targetDate = latestDateResult[0].date;
      console.log(`Using latest available date: ${targetDate}`);
    }

    // Get all submissions for the target date with category information
    const { data: submissions, error: submissionsError } = await supabase
      .from('inventory_submission')
      .select(`
        product_id,
        value_numeric,
        value_text,
        date,
        created_at,
        inventory_products(
          name,
          supplier,
          reorder_threshold,
          input_type,
          category_id,
          inventory_categories(
            name
          )
        )
      `)
      .eq('date', targetDate)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      console.error('Error getting submissions:', submissionsError);
      return { items: [], date: targetDate };
    }

    if (!submissions || submissions.length === 0) {
      console.log(`No inventory submissions found for date: ${targetDate}`);
      return { items: [], date: targetDate };
    }

    console.log(`Processing ${submissions.length} submissions for date: ${targetDate}...`);

    // Process the data to get the latest value for each product on that date
    const productDataMap = new Map<string, InventoryItem>();

    submissions.forEach((submission: any) => {
      const product = submission.inventory_products;
      if (!product || !product.inventory_categories) return;

      const productId = submission.product_id;
      
      // Only keep the first (most recent by created_at) submission for each product on this date
      if (!productDataMap.has(productId)) {
        let currentValue: number | string | null = null;
        
        if (product.input_type === 'number') {
          currentValue = submission.value_numeric;
        } else {
          currentValue = submission.value_text;
        }

        console.log(`Latest data for ${product.name} on ${targetDate}: ${currentValue}`);

        productDataMap.set(productId, {
          product_name: product.name,
          supplier: product.supplier || '',
          current_value: currentValue,
          reorder_threshold: product.reorder_threshold,
          input_type: product.input_type,
          category_name: product.inventory_categories.name,
          category_id: product.category_id
        });
      }
    });

    console.log(`Found data for ${productDataMap.size} unique products on ${targetDate}`);
    return { items: Array.from(productDataMap.values()), date: targetDate };
  } catch (error) {
    console.error('Error getting latest inventory data:', error);
    return { items: [], date: '' };
  }
}

function generateWeeklyReport(inventoryData: InventoryItem[], reportDate: string): string {
  console.log(`Generating enhanced report for ${inventoryData.length} inventory items`);
  
  // Format the date for display
  const formattedDate = new Date(reportDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Group items by category and check if they need reordering
  const categoriesWithLowStock = new Map<string, InventoryItem[]>();
  let totalLowStockItems = 0;
  let cashNeedsCollection = false;
  
  inventoryData.forEach(item => {
    const { product_name, supplier, current_value, reorder_threshold, input_type, category_name } = item;
    
    let needsReorder = false;
    
    if (input_type === 'number' && typeof current_value === 'number' && reorder_threshold !== null) {
      needsReorder = current_value <= reorder_threshold;
    } else if (input_type === 'stock_slider') {
      const valueDisplay = typeof current_value === 'string' ? current_value : 'Unknown status';
      needsReorder = valueDisplay === 'Need to Order' || valueDisplay === 'Out of Stock';
    }
    
    if (needsReorder) {
      totalLowStockItems++;
      
      // Special handling for Cash
      if (product_name.toLowerCase().includes('cash')) {
        cashNeedsCollection = true;
      }
      
      if (!categoriesWithLowStock.has(category_name)) {
        categoriesWithLowStock.set(category_name, []);
      }
      categoriesWithLowStock.get(category_name)!.push(item);
    }
  });

  // Generate the enhanced report message
  let message = `🛒 Weekly Inventory Report 🛒\n`;
  message += `📅 Report Date: ${formattedDate}\n`;
  message += `📊 Status Summary: ${totalLowStockItems} items need attention\n\n`;
  
  if (totalLowStockItems === 0) {
    message += '✅ All inventory levels are good!\n';
    message += 'No items need to be re-ordered at this time.';
    return message;
  }

  message += '🚨 ITEMS REQUIRING ACTION:\n\n';

  // Sort categories for consistent ordering
  const sortedCategories = Array.from(categoriesWithLowStock.keys()).sort();
  
  sortedCategories.forEach((categoryName, index) => {
    const items = categoriesWithLowStock.get(categoryName)!;
    
    // Category header with emoji
    const categoryEmoji = getCategoryEmoji(categoryName);
    message += `${categoryEmoji} ${categoryName.toUpperCase()}\n`;
    message += `${'─'.repeat(categoryName.length + 4)}\n`;
    
    items.forEach(item => {
      const { product_name, supplier, current_value, input_type } = item;
      
      let valueDisplay = 'Unknown';
      if (input_type === 'number' && typeof current_value === 'number') {
        valueDisplay = current_value.toString();
      } else if (typeof current_value === 'string') {
        valueDisplay = current_value;
      }
      
      // Special handling for Cash
      if (product_name.toLowerCase().includes('cash')) {
        message += `💰 ${product_name}: ${valueDisplay} - NEEDS COLLECTION\n`;
      } else {
        const supplierText = supplier && supplier.trim() !== '' 
          ? ` (Re-order from ${supplier})` 
          : ' (Supplier: TBD)';
        
        // Handle slider products differently - don't add "in stock"
        if (input_type === 'stock_slider') {
          message += `• ${product_name}: ${valueDisplay}${supplierText}\n`;
        } else {
          message += `• ${product_name}: ${valueDisplay} in stock${supplierText}\n`;
        }
      }
    });
    
    // Add spacing between categories
    if (index < sortedCategories.length - 1) {
      message += '\n';
    }
  });

  // Summary and action items
  message += '\n' + '═'.repeat(50) + '\n';
  message += '📋 ACTION REQUIRED:\n';
  
  if (cashNeedsCollection) {
    message += '💰 PRIORITY: Collect cash from register\n';
  }
  
  const nonCashItems = totalLowStockItems - (cashNeedsCollection ? 1 : 0);
  if (nonCashItems > 0) {
    message += `🛒 Order ${nonCashItems} item${nonCashItems !== 1 ? 's' : ''} from suppliers\n`;
  }
  
  message += '\n✅ Please complete these actions by end of day.';

  return message;
}

function getCategoryEmoji(categoryName: string): string {
  switch (categoryName.toLowerCase()) {
    case 'beer': return '🍺';
    case 'wine': return '🍷';
    case 'liquor': return '🥃';
    case 'non-alcoholic': return '🥤';
    case 'food & supplies': return '🍽️';
    case 'other': return '📦';
    default: return '📋';
  }
}

export async function GET(request: Request) {
  try {
    console.log('Starting weekly inventory report generation...');

    // Parse URL to get optional date parameter
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');

    // Get latest inventory data (with optional specific date)
    const { items, date } = await getLatestInventoryData(dateParam || undefined);
    
    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No inventory data found' },
        { status: 404 }
      );
    }

    // Generate the report
    const reportMessage = generateWeeklyReport(items, date);
    
    console.log('Generated report message:', reportMessage);

    // Send via LINE
    await sendLineMessage(reportMessage);

    return NextResponse.json({ 
      success: true, 
      message: 'Weekly inventory report sent successfully',
      report: reportMessage,
      itemsChecked: items.length,
      dateUsed: date
    });

  } catch (error) {
    console.error('Error generating weekly report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate weekly report' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('Starting weekly inventory report generation (POST)...');

    // Parse request body to get optional date parameter
    let dateParam: string | null = null;
    try {
      const body = await request.json();
      dateParam = body.date || null;
    } catch {
      // If body parsing fails, continue without date parameter
    }

    // Get latest inventory data (with optional specific date)
    const { items, date } = await getLatestInventoryData(dateParam || undefined);
    
    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No inventory data found' },
        { status: 404 }
      );
    }

    // Generate the report
    const reportMessage = generateWeeklyReport(items, date);
    
    console.log('Generated report message:', reportMessage);

    // Send via LINE
    await sendLineMessage(reportMessage);

    return NextResponse.json({ 
      success: true, 
      message: 'Weekly inventory report sent successfully',
      report: reportMessage,
      itemsChecked: items.length,
      dateUsed: date
    });

  } catch (error) {
    console.error('Error generating weekly report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate weekly report' 
      },
      { status: 500 }
    );
  }
} 