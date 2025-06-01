const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using REFAC credentials (confirmed: inventory is on REFAC project)
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_REFAC_SUPABASE_URL and REFAC_SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Product name mapping to handle variations
const PRODUCT_NAME_MAPPING = {
  'Expensive Red wine': 'Red Wine (Most Expensive)',
  'Expensive White wine': 'White wine (Most Expensive)',
  'Golf Balls (only Inventory)': 'Golf Balls (only Inventory)',
  'Still water': 'Still water',
  'Napkins (normal)': 'Napkins (normal)',
  'Napkins (wet)': 'Napkins (wet)',
  'Cleaning Supply (Floor Cleaner)': 'Cleaning Supply (Floor Cleaner)',
  'Cleaning Supply (General Cleaner)': 'Cleaning Supply (General Cleaner)',
  'Cleaning Supply (Handwash)': 'Cleaning Supply (Handwash)',
  'Cleaning Supply (Dishwashing Liquid)': 'Cleaning Supply (Dishwashing Liquid)',
  'Paper Plates': 'Paper Plates',
  'Fork/Knives/Spoons': 'Fork/Knives/Spoons',
  'Cash (only Bills)': 'Cash (only Bills)',
  'Credit Card paper rolls': 'Credit Card paper rolls'
};

function parseThreshold(thresholdValue) {
  if (!thresholdValue || thresholdValue.trim() === '') {
    return null;
  }

  const trimmed = thresholdValue.trim();
  
  // Handle special cases
  if (trimmed === 'x' || trimmed === 'Need to order') {
    return null; // No specific threshold
  }
  
  // Try to parse as number
  const numValue = parseFloat(trimmed);
  if (!isNaN(numValue)) {
    return numValue;
  }
  
  return null;
}

async function updateThresholds() {
  try {
    console.log('Reading threshold data from CSV...');
    const thresholdData = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('inventory_notification_level.csv')
        .pipe(csv())
        .on('data', (row) => {
          thresholdData.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Found ${thresholdData.length} threshold records`);

    // Get current products from database
    const { data: products, error: productsError } = await supabase
      .from('inventory_products')
      .select('id, name');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return;
    }

    console.log(`Found ${products.length} products in database`);

    // Create product name to ID mapping
    const productMap = {};
    products.forEach(product => {
      productMap[product.name] = product.id;
    });

    let updatedCount = 0;
    let notFoundCount = 0;

    // Process each threshold record
    for (const row of thresholdData) {
      const csvProductName = row.product_name;
      const supplier = row.order_from;
      const notificationLevel = row.notification_level;

      // Map the product name
      const dbProductName = PRODUCT_NAME_MAPPING[csvProductName] || csvProductName;
      const productId = productMap[dbProductName];

      if (!productId) {
        console.warn(`Product not found in database: "${csvProductName}" -> "${dbProductName}"`);
        notFoundCount++;
        continue;
      }

      const threshold = parseThreshold(notificationLevel);
      
      console.log(`Updating ${dbProductName}: threshold=${threshold}, supplier=${supplier}`);

      // Update the product with threshold and supplier
      const { error: updateError } = await supabase
        .from('inventory_products')
        .update({
          reorder_threshold: threshold,
          supplier: supplier,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        console.error(`Error updating product ${dbProductName}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`\nThreshold update complete!`);
    console.log(`Successfully updated: ${updatedCount} products`);
    console.log(`Products not found: ${notFoundCount}`);

  } catch (error) {
    console.error('Error updating thresholds:', error);
    process.exit(1);
  }
}

// Run the update
updateThresholds(); 