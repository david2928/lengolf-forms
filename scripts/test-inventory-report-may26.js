require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using REFAC credentials (confirmed: inventory is on REFAC project)
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;
const LINE_GROUP_ID = process.env.LINE_GROUP_ID;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const SEND_MESSAGE = process.env.SEND_MESSAGE === 'true';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_REFAC_SUPABASE_URL and REFAC_SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendLineMessage(message) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_GROUP_ID) {
    console.error('Missing LINE credentials');
    console.error('LINE_CHANNEL_ACCESS_TOKEN:', LINE_CHANNEL_ACCESS_TOKEN ? 'Set' : 'Missing');
    console.error('LINE_GROUP_ID:', LINE_GROUP_ID || 'Missing');
    throw new Error('LINE Messaging API configuration is incomplete');
  }

  try {
    console.log(`Sending LINE message to group: ${LINE_GROUP_ID}`);
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: LINE_GROUP_ID,
        messages: [{
          type: 'text',
          text: message
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LINE API error: ${response.status} - ${errorText}`);
    }

    console.log('LINE message sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending LINE message:', error);
    throw error;
  }
}

async function getInventoryDataForDate(targetDate) {
  try {
    console.log(`Getting inventory data for specific date: ${targetDate}`);

    // Get inventory submissions for the specific date
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
          input_type
        )
      `)
      .eq('date', targetDate)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      console.error('Error getting submissions:', submissionsError);
      return [];
    }

    if (!submissions || submissions.length === 0) {
      console.log(`No inventory submissions found for date: ${targetDate}`);
      return [];
    }

    console.log(`Processing ${submissions.length} submissions for ${targetDate}...`);

    // Process the data to get the latest value for each product on that date
    const productDataMap = new Map();

    submissions.forEach((submission) => {
      const product = submission.inventory_products;
      if (!product) return;

      const productId = submission.product_id;
      
      // Only keep the first (most recent) submission for each product on this date
      if (!productDataMap.has(productId)) {
        let currentValue = null;
        
        if (product.input_type === 'number') {
          currentValue = submission.value_numeric;
        } else {
          currentValue = submission.value_text;
        }

        productDataMap.set(productId, {
          product_name: product.name,
          supplier: product.supplier || '',
          current_value: currentValue,
          reorder_threshold: product.reorder_threshold,
          input_type: product.input_type
        });
      }
    });

    return Array.from(productDataMap.values());
  } catch (error) {
    console.error('Error getting inventory data:', error);
    return [];
  }
}

function generateWeeklyReport(inventoryData) {
  console.log(`\nGenerating report for ${inventoryData.length} inventory items\n`);
  
  const lowStockItems = [];
  const allItems = [];
  
  inventoryData.forEach(item => {
    const { product_name, supplier, current_value, reorder_threshold, input_type } = item;
    
    let needsReorder = false;
    let valueDisplay = 'Unknown';
    let logic = '';
    
    if (input_type === 'number' && typeof current_value === 'number' && reorder_threshold !== null) {
      // For numeric items, check if current value is AT OR BELOW threshold
      needsReorder = current_value <= reorder_threshold;
      valueDisplay = current_value.toString();
      logic = `${current_value} ${needsReorder ? '≤' : '>'} ${reorder_threshold}`;
    } else if (input_type === 'stock_slider') {
      // For slider products, only mark "Need to order" status for reorder
      valueDisplay = typeof current_value === 'string' ? current_value : 'Unknown status';
      needsReorder = valueDisplay === 'Need to order';
      logic = `slider: "${valueDisplay}"`;
    }
    
    allItems.push({
      name: product_name,
      value: valueDisplay,
      threshold: reorder_threshold,
      needsReorder,
      logic,
      type: input_type
    });
    
    if (needsReorder) {
      // Handle supplier text - show empty supplier as "." like in the example
      const supplierText = supplier && supplier.trim() !== '' 
        ? ` Re-order from ${supplier}.` 
        : ' Re-order from .';
        
      lowStockItems.push(`${product_name} levels are low, only ${valueDisplay} in stock.${supplierText}`);
    }
  });

  // Show logic for key products
  console.log('=== THRESHOLD LOGIC VERIFICATION ===');
  const keyProducts = ['Singha', 'Red Bull', 'Zuza (Lime)', 'Golf Balls (only Inventory)', 'Ice', 'Napkins (wet)'];
  keyProducts.forEach(productName => {
    const item = allItems.find(i => i.name === productName);
    if (item) {
      const status = item.needsReorder ? '🔴 REORDER' : '✅ OK';
      console.log(`${item.name}: ${item.logic} → ${status}`);
    }
  });
  console.log('=====================================\n');

  // Generate the report message
  let message = '🛒 Weekly Inventory Update 🛒\n\nThis week\'s inventory status:\n\n';
  
  if (lowStockItems.length > 0) {
    message += 'Items to be re-ordered: \n\n';
    lowStockItems.forEach(item => {
      message += `${item}\n`;
    });
    message += '\nPlease proceed with the necessary orders.';
  } else {
    message += 'All inventory levels are good! No items need to be re-ordered at this time.';
  }

  return message;
}

async function testInventoryReportMay26() {
  console.log('=== Testing Inventory Report for May 26, 2025 ===');
  
  const targetDate = '202025-05-26'; // Specific date you requested
  
  try {
    console.log('Getting inventory data for May 26, 2025...');
    const inventoryData = await getInventoryDataForDate(targetDate);
    
    if (inventoryData.length === 0) {
      console.log('No data found for this date - check date format');
      return;
    }

    console.log(`Found ${inventoryData.length} products with data for ${targetDate}`);

    // Generate the report
    const reportMessage = generateWeeklyReport(inventoryData);
    
    console.log('\n=== Generated Report ===');
    console.log(reportMessage);
    console.log('========================\n');

    if (SEND_MESSAGE) {
      console.log('Sending to LINE...');
      const sent = await sendLineMessage(reportMessage);
      if (sent) {
        console.log('✅ Report sent to LINE group successfully!');
      } else {
        console.log('❌ Failed to send report to LINE group');
      }
    } else {
      console.log('To send, run this script with SEND_MESSAGE=true');
    }

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testInventoryReportMay26(); 