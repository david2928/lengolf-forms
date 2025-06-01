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

// CSV column mapping to product names (matching the database)
const COLUMN_MAPPING = {
  'Date': 'date',
  'Staff Name': 'staff',
  'Asahi': 'Asahi',
  'Singha': 'Singha',
  'Hoegaarden': 'Hoegaarden',
  'Craft beer (various brands)': 'Craft beer (various brands)',
  'Heineken': 'Heineken',
  'Chatri IPA': 'Chatri IPA',
  'Absolute Vodka': 'Absolute Vodka',
  'Bacardi Rum': 'Bacardi Rum',
  'Chita Whiskey': 'Chita Whiskey',
  'Regency Whiskey': 'Regency Whiskey',
  'Hibiki Whiskey': 'Hibiki Whiskey',
  'Kakubin Whiskey': 'Kakubin Whiskey',
  'Black Label Whiskey': 'Black Label Whiskey',
  'Chivas Whiskey': 'Chivas Whiskey',
  'Tequila': 'Tequila',
  'Red Wine (Most Expensive)': 'Red Wine (Most Expensive)',
  'White wine (Most Expensive)': 'White wine (Most Expensive)',
  'Coke Zero': 'Coke Zero',
  'Coke Original': 'Coke Original',
  'Sprite': 'Sprite',
  'Tonic water (Schweppes)': 'Tonic water (Schweppes)',
  'Soda water (Singha)': 'Soda water (Singha)',
  'Still water': 'Still water',
  'Gatorade - Blue': 'Gatorade - Blue',
  'Gatorade - Lime': 'Gatorade - Lime',
  'Zuza (Lime)': 'Zuza (Lime)',
  'Ice': 'Ice',
  'Garbage bags': 'Garbage bags',
  'POS paper rolls': 'POS paper rolls',
  'Straws': 'Straws',
  'Paper towels': 'Paper towels',
  'Red Bull': 'Red Bull',
  'Gin (Bombay Sapphire)': 'Gin (Bombay Sapphire)',
  'Popcorn': 'Popcorn',
  'Nuts': 'Nuts',
  'Cash (only Bills)': 'Cash (only Bills)',
  'Golf gloves': 'Golf gloves',
  'Golf Balls (only Inventory)': 'Golf Balls (only Inventory)',
  'Festilia (Lime)': 'Festilia (Lime)',
  'Festilia (Orange)': 'Festilia (Orange)',
  'Red Wine (Middle Expensive)': 'Red Wine (Middle Expensive)',
  'Red Wine (Least Expensive)': 'Red Wine (Least Expensive)',
  'White wine (Middle Expensive)': 'White wine (Middle Expensive)',
  'White wine (Least Expensive)': 'White wine (Least Expensive)',
  'Gin (House Gin)': 'Gin (House Gin)',
  'Vodka (House Vodka)': 'Vodka (House Vodka)',
  'Cleaning Supply (Floor Cleaner)': 'Cleaning Supply (Floor Cleaner)',
  'Cleaning Supply (General Cleaner)': 'Cleaning Supply (General Cleaner)',
  'Cleaning Supply (Handwash)': 'Cleaning Supply (Handwash)',
  'Zuza (Passion Fruit)': 'Zuza (Passion Fruit)',
  'Zuza (Lychee)': 'Zuza (Lychee)',
  'Golf Tees (Rubber)': 'Golf Tees (Rubber)',
  'Napkin (normal)': 'Napkins (normal)', // Note: CSV has "Napkin" but DB has "Napkins"
  'Napkins (normal)': 'Napkins (normal)',
  'Napkins (wet)': 'Napkins (wet)',
  'Paper Plates': 'Paper Plates',
  'Fork/Knives/Spoons': 'Fork/Knives/Spoons',
  'Sparkling Wine': 'Sparkling Wine',
  'Coke Regular (Big Bottle)': 'Coke Regular (Big Bottle)',
  'Coke Zero (Big Bottle)': 'Coke Zero (Big Bottle)',
  'Sprite (Big Bottle)': 'Sprite (Big Bottle)',
  'Water (Big Bottle)': 'Water (Big Bottle)',
  'Tea Bags': 'Tea Bags',
  'Cleaning Supply (Dishwashing Liquid)': 'Cleaning Supply (Dishwashing Liquid)',
  'Damaged Golf Balls': 'Damaged Golf Balls',
  'Credit Card paper rolls': 'Credit Card paper rolls'
};

async function getProductsMap() {
  const { data: categories, error: catError } = await supabase
    .from('inventory_categories')
    .select('id, name');
    
  if (catError) {
    console.error('Error fetching categories:', catError);
    return {};
  }

  const { data: products, error: prodError } = await supabase
    .from('inventory_products')
    .select('id, name, category_id, input_type');

  if (prodError) {
    console.error('Error fetching products:', prodError);
    return {};
  }

  // Create a mapping from product name to product info
  const productsMap = {};
  const categoriesMap = {};
  
  categories.forEach(cat => {
    categoriesMap[cat.id] = cat.name;
  });

  products.forEach(product => {
    productsMap[product.name] = {
      id: product.id,
      category_id: product.category_id,
      input_type: product.input_type
    };
  });

  return { productsMap, categoriesMap };
}

function parseDate(dateStr) {
  // Expected format: MM/DD/YYYY or MM/DD/YY
  const [month, day, year] = dateStr.split('/');
  
  // Handle both 2-digit and 4-digit years
  let fullYear;
  if (year.length === 2) {
    // 2-digit year - assume 20xx
    fullYear = `20${year}`;
  } else if (year.length === 4) {
    // 4-digit year - use as is
    fullYear = year;
  } else {
    throw new Error(`Invalid year format: ${year}`);
  }
  
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseValue(value, inputType) {
  if (!value || value.trim() === '') {
    return null;
  }

  const trimmedValue = value.trim();

  switch (inputType) {
    case 'number':
      // Try to parse as number
      const numValue = parseFloat(trimmedValue);
      return isNaN(numValue) ? null : numValue;
      
    case 'stock_slider':
      // Stock level indicators
      if (['Plenty of stock', 'Enough for this week', 'Need to order', 'Plenty'].includes(trimmedValue)) {
        return trimmedValue;
      }
      return trimmedValue;
      
    case 'glove_sizes':
      // Golf gloves size information
      return trimmedValue;
      
    default:
      return trimmedValue;
  }
}

async function importHistoricalData() {
  try {
    console.log('Fetching products and categories...');
    const { productsMap, categoriesMap } = await getProductsMap();
    
    console.log('Reading CSV file...');
    const csvData = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('inventory_form_old_data.csv')
        .pipe(csv())
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Processing ${csvData.length} rows...`);
    
    const submissions = [];
    
    for (const row of csvData) {
      const date = parseDate(row['Date']);
      const staff = row['Staff Name'];
      
      if (!date || !staff) {
        console.warn('Skipping row due to missing date or staff:', { date, staff });
        continue;
      }

      // Process each product column
      for (const [csvColumn, productName] of Object.entries(COLUMN_MAPPING)) {
        if (csvColumn === 'Date' || csvColumn === 'Staff Name') continue;
        
        const product = productsMap[productName];
        if (!product) {
          console.warn(`Product not found in database: ${productName}`);
          continue;
        }

        const rawValue = row[csvColumn];
        if (!rawValue || rawValue.trim() === '') {
          continue; // Skip empty values
        }

        const parsedValue = parseValue(rawValue, product.input_type);
        if (parsedValue === null) {
          continue;
        }

        const submission = {
          date,
          staff,
          product_id: product.id,
          category_id: product.category_id,
          value_numeric: product.input_type === 'number' ? parsedValue : null,
          value_text: product.input_type !== 'number' ? parsedValue.toString() : null,
          note: null
        };

        submissions.push(submission);
      }
    }

    console.log(`Preparing to insert ${submissions.length} submissions...`);

    // Insert in batches to avoid timeout
    const batchSize = 1000;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from('inventory_submission')
          .insert(batch);

        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          console.log(`Successfully inserted batch ${i / batchSize + 1} (${batch.length} records)`);
        }
      } catch (err) {
        console.error(`Exception inserting batch ${i / batchSize + 1}:`, err);
        errorCount += batch.length;
      }
    }

    console.log(`\nImport complete!`);
    console.log(`Successfully imported: ${successCount} submissions`);
    console.log(`Errors: ${errorCount} submissions`);

  } catch (error) {
    console.error('Error importing historical data:', error);
    process.exit(1);
  }
}

// Run the import
importHistoricalData(); 