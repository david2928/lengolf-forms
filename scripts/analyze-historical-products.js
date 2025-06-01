const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using REFAC credentials (confirmed: inventory is on REFAC project)
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_REFAC_SUPABASE_URL and REFAC_SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('Current env vars:');
  console.error('- NEXT_PUBLIC_REFAC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('- REFAC_SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeHistoricalProducts() {
  try {
    console.log('Getting current products from database...');
    console.log('Supabase URL:', supabaseUrl);
    
    // Get current products from database
    const { data: products, error: productsError } = await supabase
      .from('inventory_products')
      .select('name, input_type, supplier, reorder_threshold');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return;
    }

    console.log(`Found ${products.length} products in database`);
    
    // Create set of database product names
    const dbProducts = new Set(products.map(p => p.name));
    
    console.log('\nDatabase products:');
    products.forEach(product => {
      console.log(`- ${product.name} (${product.input_type})`);
    });

    console.log('\nReading historical CSV file...');
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

    // Get all column names from the first row (excluding Date and Staff Name)
    const firstRow = csvData[0];
    const csvColumns = Object.keys(firstRow).filter(col => 
      col !== 'Date' && col !== 'Staff Name' && col.trim() !== ''
    );

    console.log(`\nFound ${csvColumns.length} product columns in historical CSV:`);
    csvColumns.forEach(col => {
      console.log(`- ${col}`);
    });

    // Find products in CSV but not in database
    console.log('\n=== PRODUCTS IN CSV BUT NOT IN DATABASE ===');
    const missingFromDB = [];
    csvColumns.forEach(csvCol => {
      // Check exact match first
      if (!dbProducts.has(csvCol)) {
        // Check for variations (common naming differences)
        const variations = [
          csvCol.trim(),
          csvCol.replace('Still water ', 'Still water'), // Handle trailing space
          csvCol === 'Napkin (normal)' ? 'Napkins (normal)' : csvCol, // singular vs plural
        ];
        
        const found = variations.some(variation => dbProducts.has(variation));
        if (!found) {
          missingFromDB.push(csvCol);
        }
      }
    });

    if (missingFromDB.length > 0) {
      console.log(`Found ${missingFromDB.length} products in CSV that are NOT in database:`);
      missingFromDB.forEach(product => {
        console.log(`❌ "${product}"`);
      });
    } else {
      console.log('✅ All CSV products are found in database');
    }

    // Find products in database but not in CSV
    console.log('\n=== PRODUCTS IN DATABASE BUT NOT IN CSV ===');
    const missingFromCSV = [];
    products.forEach(dbProduct => {
      if (!csvColumns.includes(dbProduct.name)) {
        // Check for variations
        const found = csvColumns.some(csvCol => 
          csvCol.trim() === dbProduct.name ||
          (csvCol === 'Napkin (normal)' && dbProduct.name === 'Napkins (normal)') ||
          (csvCol === 'Still water ' && dbProduct.name === 'Still water')
        );
        if (!found) {
          missingFromCSV.push(dbProduct.name);
        }
      }
    });

    if (missingFromCSV.length > 0) {
      console.log(`Found ${missingFromCSV.length} products in database that are NOT in CSV:`);
      missingFromCSV.forEach(product => {
        console.log(`⚠️  "${product}"`);
      });
    } else {
      console.log('✅ All database products are found in CSV');
    }

    // Check products with slider input type 
    console.log('\n=== PRODUCTS WITH SLIDER INPUT TYPE ===');
    const sliderProducts = products.filter(p => p.input_type === 'stock_slider');
    console.log(`Found ${sliderProducts.length} products with slider input:`);
    sliderProducts.forEach(product => {
      console.log(`🎚️  ${product.name} - Threshold: ${product.reorder_threshold || 'None'}, Supplier: ${product.supplier || 'None'}`);
    });

    console.log('\n=== SUMMARY ===');
    console.log(`- Total products in database: ${products.length}`);
    console.log(`- Total columns in CSV: ${csvColumns.length}`);
    console.log(`- Products missing from database: ${missingFromDB.length}`);
    console.log(`- Products missing from CSV: ${missingFromCSV.length}`);
    console.log(`- Products with slider input: ${sliderProducts.length}`);

  } catch (error) {
    console.error('Error analyzing products:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeHistoricalProducts(); 