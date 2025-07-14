#!/usr/bin/env node

/**
 * Product Update Script
 * Updates existing products with additional data from Product List (LENGOLF).csv
 * Joins by product name and adds cost, barcode, SKU, and inventory info
 * Usage: node scripts/update-products-with-lengolf-data.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '..', 'Product List (LENGOLF).csv');
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.error('Service Key:', supabaseServiceKey ? 'SET' : 'NOT SET');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility functions
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  const products = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with potential commas in quotes
    const values = parseCSVLine(line);
    if (values.length < headers.length) continue;

    const product = {};
    headers.forEach((header, index) => {
      product[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || null;
    });

    // Skip empty products
    if (!product.product_name || product.product_name.trim() === '') continue;
    
    products.push(product);
  }

  return products;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function cleanPriceString(priceStr) {
  if (!priceStr) return null;
  
  // Remove currency symbol, spaces, commas
  const cleaned = priceStr.toString()
    .replace(/[฿$,\s]/g, '')
    .replace(/['"]/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function normalizeProductName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ');
}

async function getExistingProducts() {
  console.log('Fetching existing products...');
  
  const { data: products, error } = await supabase
    .schema('products')
    .from('products')
    .select('*');

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  console.log(`✓ Found ${products.length} existing products`);
  return products;
}

async function updateProductsWithLengolfData(lengolfData, existingProducts) {
  console.log('Matching and updating products...');
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  const updateReasons = [];

  for (const lengolfProduct of lengolfData) {
    const normalizedName = normalizeProductName(lengolfProduct.product_name);
    
    // Find matching product by name
    const existingProduct = existingProducts.find(p => 
      normalizeProductName(p.name) === normalizedName
    );

    if (!existingProduct) {
      console.log(`⚠️  No match found for: "${lengolfProduct.product_name}"`);
      notFound++;
      continue;
    }

    // Prepare update data
    const updates = {};
    const changes = [];

    // Update cost if available and different
    const newCost = cleanPriceString(lengolfProduct.unit_cost);
    if (newCost !== null && newCost !== existingProduct.cost) {
      updates.cost = newCost;
      changes.push(`cost: ${existingProduct.cost || 'null'} → ${newCost}`);
    }

    // Update SKU if available and different
    const newSku = lengolfProduct.sku_number?.trim();
    if (newSku && newSku !== existingProduct.sku) {
      updates.sku = newSku;
      changes.push(`sku: ${existingProduct.sku || 'null'} → ${newSku}`);
    }

    // Add barcode if available (new field would need to be added to schema)
    const barcode = lengolfProduct.barcode?.trim();
    if (barcode) {
      // We'll store this in external_code for now since we don't have barcode field
      if (!existingProduct.external_code && barcode !== existingProduct.external_code) {
        updates.external_code = barcode;
        changes.push(`barcode: ${existingProduct.external_code || 'null'} → ${barcode}`);
      }
    }

    // Update updated_by
    if (Object.keys(updates).length > 0) {
      updates.updated_by = 'lengolf_data_sync';
      
      try {
        const { error } = await supabase
          .schema('products')
          .from('products')
          .update(updates)
          .eq('id', existingProduct.id);

        if (error) {
          console.error(`❌ Error updating ${existingProduct.name}:`, error);
          errors++;
          continue;
        }

        updated++;
        console.log(`✓ Updated "${existingProduct.name}": ${changes.join(', ')}`);
        
        updateReasons.push({
          product_name: existingProduct.name,
          changes: changes
        });

      } catch (err) {
        console.error(`❌ Exception updating ${existingProduct.name}:`, err);
        errors++;
      }
    } else {
      console.log(`- No changes needed for "${existingProduct.name}"`);
    }
  }

  return { updated, notFound, errors, updateReasons };
}

async function generateReport(results) {
  console.log('\n=== UPDATE REPORT ===');
  console.log(`Products Updated: ${results.updated}`);
  console.log(`Products Not Found: ${results.notFound}`);
  console.log(`Errors: ${results.errors}`);
  
  if (results.updateReasons.length > 0) {
    console.log('\n=== DETAILED CHANGES ===');
    results.updateReasons.forEach(item => {
      console.log(`${item.product_name}: ${item.changes.join(', ')}`);
    });
  }

  // Get updated statistics
  const { data: stats } = await supabase
    .schema('products')
    .from('products')
    .select('cost')
    .not('cost', 'is', null);

  const { data: totalCount } = await supabase
    .schema('products')
    .from('products')
    .select('id', { count: 'exact' });

  if (stats && totalCount) {
    console.log('\n=== COST DATA COVERAGE ===');
    console.log(`Products with cost data: ${stats.length}`);
    console.log(`Total products: ${totalCount.length}`);
    console.log(`Coverage: ${Math.round((stats.length / totalCount.length) * 100)}%`);
  }
}

async function main() {
  try {
    console.log('🚀 Starting product update from Lengolf data...\n');
    
    // Read and parse CSV
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`CSV file not found: ${CSV_FILE_PATH}`);
      process.exit(1);
    }

    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lengolfData = parseCSV(csvContent);
    
    console.log(`📄 Parsed ${lengolfData.length} products from Lengolf CSV\n`);

    // Get existing products
    const existingProducts = await getExistingProducts();
    console.log('');

    // Update products
    const results = await updateProductsWithLengolfData(lengolfData, existingProducts);

    // Generate report
    await generateReport(results);

    console.log('\n✅ Product update completed successfully!');

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

// Run the update
if (require.main === module) {
  main();
}

module.exports = { main };