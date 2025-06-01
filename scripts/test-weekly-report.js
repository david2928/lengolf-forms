// Test script to simulate enhanced weekly inventory report generation
// Updated with actual data from May 26, 2025 and improved formatting

const sampleInventoryDataMay26 = [
  {
    product_name: 'Zuza (Lime)',
    supplier: 'Zuza',
    current_value: 10,
    reorder_threshold: 10,
    input_type: 'number',
    category_name: 'Non-Alcoholic',
    category_id: '065d7542-24bb-41e3-afbb-1424941738a8'
  },
  {
    product_name: 'Ice',
    supplier: 'Ice Vendor',
    current_value: 'Need to order',
    reorder_threshold: null,
    input_type: 'stock_slider',
    category_name: 'Food & Supplies',
    category_id: '356cdaf1-21d1-41eb-90cd-217324558ffc'
  },
  {
    product_name: 'Cash (only Bills)',
    supplier: '',
    current_value: 15444,
    reorder_threshold: 30000,
    input_type: 'number',
    category_name: 'Other',
    category_id: '041294f2-a971-4072-885b-a6f84352c648'
  },
  {
    product_name: 'Golf Balls (only Inventory)',
    supplier: '',
    current_value: 24,
    reorder_threshold: 50,
    input_type: 'number',
    category_name: 'Other',
    category_id: '041294f2-a971-4072-885b-a6f84352c648'
  },
  {
    product_name: 'Red Wine (Middle Expensive)',
    supplier: 'IWS',
    current_value: 2,
    reorder_threshold: 2,
    input_type: 'number',
    category_name: 'Wine',
    category_id: 'cfc8cc49-1ef0-4fe7-a86a-7d2014558ab4'
  },
  {
    product_name: 'Red Wine (Least Expensive)',
    supplier: 'IWS',
    current_value: 1.8,
    reorder_threshold: 2,
    input_type: 'number',
    category_name: 'Wine',
    category_id: 'cfc8cc49-1ef0-4fe7-a86a-7d2014558ab4'
  },
  {
    product_name: 'White wine (Least Expensive)',
    supplier: 'IWS',
    current_value: 1,
    reorder_threshold: 2,
    input_type: 'number',
    category_name: 'Wine',
    category_id: 'cfc8cc49-1ef0-4fe7-a86a-7d2014558ab4'
  },
  {
    product_name: 'Napkins (wet)',
    supplier: 'Makro',
    current_value: 'Need to order',
    reorder_threshold: null,
    input_type: 'stock_slider',
    category_name: 'Food & Supplies',
    category_id: '356cdaf1-21d1-41eb-90cd-217324558ffc'
  },
  {
    product_name: 'Sparkling Wine',
    supplier: 'IWS',
    current_value: 0,
    reorder_threshold: 1,
    input_type: 'number',
    category_name: 'Wine',
    category_id: 'cfc8cc49-1ef0-4fe7-a86a-7d2014558ab4'
  },
  {
    product_name: 'Asahi',
    supplier: 'Tops',
    current_value: 45,
    reorder_threshold: 40,
    input_type: 'number',
    category_name: 'Beer',
    category_id: 'f156636c-1bd9-4f76-b3ab-6a7507a5db35'
  }
];

function getCategoryEmoji(categoryName) {
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

function generateWeeklyReport(inventoryData, reportDate) {
  console.log(`Generating enhanced report for ${inventoryData.length} inventory items`);
  
  // Format the date for display
  const formattedDate = new Date(reportDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Group items by category and check if they need reordering
  const categoriesWithLowStock = new Map();
  let totalLowStockItems = 0;
  let cashNeedsCollection = false;
  
  inventoryData.forEach(item => {
    const { product_name, supplier, current_value, reorder_threshold, input_type, category_name } = item;
    
    let needsReorder = false;
    
    if (input_type === 'number' && typeof current_value === 'number' && reorder_threshold !== null) {
      needsReorder = current_value <= reorder_threshold;
    } else if (input_type === 'stock_slider') {
      const valueDisplay = typeof current_value === 'string' ? current_value : 'Unknown status';
      needsReorder = valueDisplay === 'Need to order';
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
      categoriesWithLowStock.get(category_name).push(item);
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
    const items = categoriesWithLowStock.get(categoryName);
    
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
        message += `• ${product_name}: ${valueDisplay} in stock${supplierText}\n`;
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

// Test the enhanced report generation for May 26, 2025
console.log('Testing Enhanced Weekly Inventory Report Generation');
console.log('Date: May 26, 2025');
console.log('=================================================\n');

const testDate = '2025-05-26';
const report = generateWeeklyReport(sampleInventoryDataMay26, testDate);
console.log('Generated Enhanced Report:');
console.log('==========================');
console.log(report);

console.log('\n\nReport Analysis:');
console.log('================');
const lowStockCount = sampleInventoryDataMay26.filter(item => {
  if (item.input_type === 'number' && item.reorder_threshold !== null) {
    return item.current_value <= item.reorder_threshold;
  } else if (item.input_type === 'stock_slider') {
    return item.current_value === 'Need to order';
  }
  return false;
}).length;

// Group by categories for analysis
const categories = [...new Set(sampleInventoryDataMay26.map(item => item.category_name))];
console.log(`Categories with items: ${categories.join(', ')}`);
console.log(`Total items needing attention: ${lowStockCount} out of ${sampleInventoryDataMay26.length} items checked`);
console.log(`Special handling: Cash collection required`);
console.log('\nThis enhanced report would be sent to LINE group: C6a28e92972002dd392e8cc4f005afce2 with improved formatting!'); 