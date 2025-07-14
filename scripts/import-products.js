#!/usr/bin/env node

/**
 * Product Import Script
 * Imports products from all-products.csv into the new products schema
 * Usage: node scripts/import-products.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '..', 'all-products.csv');
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
  const headers = lines[0].split(',').map(h => h.trim());
  const products = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser - handles basic cases
    const values = line.split(',').map(v => v.trim());
    if (values.length < headers.length) continue;

    const product = {};
    headers.forEach((header, index) => {
      product[header.toLowerCase().replace(' ', '_')] = values[index] || null;
    });

    // Skip empty products
    if (!product.product_id || !product.product_name) continue;
    
    products.push(product);
  }

  return products;
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

function isCustomProduct(product) {
  const price = parseFloat(product.price) || 0;
  const name = product.product_name.toLowerCase();
  
  return price === 0 || 
         name.includes('used') || 
         name.includes('package used') ||
         name.includes('lesson used');
}

async function createCategories(products) {
  console.log('Creating category hierarchy...');
  
  // Get unique tabs and categories
  const tabs = [...new Set(products.map(p => p.tab).filter(Boolean))];
  const categoryPairs = products
    .filter(p => p.tab && p.category)
    .map(p => ({ tab: p.tab, category: p.category }));
  
  const uniqueCategories = categoryPairs.reduce((acc, curr) => {
    const key = `${curr.tab}:${curr.category}`;
    if (!acc.some(item => `${item.tab}:${item.category}` === key)) {
      acc.push(curr);
    }
    return acc;
  }, []);

  // Create top-level categories (tabs)
  const tabCategories = [];
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const { data, error } = await supabase
      .schema('products')
      .from('categories')
      .insert({
        name: tab,
        slug: generateSlug(tab),
        display_order: i + 1,
        is_active: true
      })
      .select()
      .single();

    if (error && !error.message?.includes('duplicate key')) {
      console.error(`Error creating tab category ${tab}:`, error);
      continue;
    }
    
    if (data) {
      tabCategories.push(data);
      console.log(`✓ Created tab category: ${tab}`);
    }
  }

  // Get all tab categories (including existing ones)
  const { data: allTabCategories } = await supabase
    .schema('products')
    .from('categories')
    .select('*')
    .is('parent_id', null);

  // Create sub-categories
  for (const catPair of uniqueCategories) {
    const parentCategory = allTabCategories.find(c => c.name === catPair.tab);
    if (!parentCategory) {
      console.error(`Parent category not found for: ${catPair.tab}`);
      continue;
    }

    const { data, error } = await supabase
      .schema('products')
      .from('categories')
      .insert({
        parent_id: parentCategory.id,
        name: catPair.category,
        slug: generateSlug(`${catPair.tab}-${catPair.category}`),
        display_order: 1,
        is_active: true
      })
      .select()
      .single();

    if (error && !error.message?.includes('duplicate key')) {
      console.error(`Error creating category ${catPair.category}:`, error);
      continue;
    }

    if (data) {
      console.log(`✓ Created category: ${catPair.tab} > ${catPair.category}`);
    }
  }
}

async function importProducts(products) {
  console.log('Importing products...');
  
  // Get all categories with their hierarchy
  const { data: categories } = await supabase
    .schema('products')
    .from('categories')
    .select(`
      id,
      name,
      parent_id,
      parent:parent_id (
        name
      )
    `);

  let imported = 0;
  let skipped = 0;

  for (const product of products) {
    if (!product.tab || !product.category) {
      skipped++;
      continue;
    }

    // Find the category
    const category = categories.find(c => 
      c.parent?.name === product.tab && c.name === product.category
    );

    if (!category) {
      console.error(`Category not found for: ${product.tab} > ${product.category}`);
      skipped++;
      continue;
    }

    const price = parseFloat(product.price) || 0;
    const isCustom = isCustomProduct(product);

    const { data, error } = await supabase
      .schema('products')
      .from('products')
      .insert({
        category_id: category.id,
        name: product.product_name,
        slug: generateSlug(product.product_name),
        price: price,
        sku: product.sku || null,
        legacy_qashier_id: product.product_id,
        legacy_pos_name: product.product_name,
        is_active: true,
        display_order: imported + 1,
        created_by: 'csv_import',
        is_custom_product: isCustom,
        show_in_staff_ui: !isCustom
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('duplicate key')) {
        console.log(`- Skipped duplicate: ${product.product_name}`);
        skipped++;
      } else {
        console.error(`Error importing ${product.product_name}:`, error);
        skipped++;
      }
      continue;
    }

    if (data) {
      imported++;
      if (isCustom) {
        console.log(`✓ Imported custom product: ${product.product_name} (hidden from staff)`);
      } else {
        console.log(`✓ Imported product: ${product.product_name} - ฿${price}`);
      }
    }
  }

  console.log(`\nImport Summary:`);
  console.log(`- Products imported: ${imported}`);
  console.log(`- Products skipped: ${skipped}`);
  console.log(`- Total processed: ${imported + skipped}`);
}

async function generateReport() {
  console.log('\nGenerating import report...');
  
  // Get summary statistics
  const { data: summary } = await supabase
    .rpc('execute_sql', {
      query: `
        SELECT 
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_custom_product = true) as custom_products,
          COUNT(*) FILTER (WHERE show_in_staff_ui = false) as hidden_from_staff,
          COUNT(*) FILTER (WHERE price = 0) as zero_price_products,
          SUM(price) as total_value
        FROM products.products
        WHERE created_by = 'csv_import'
      `
    });

  // Get category breakdown
  const { data: categoryBreakdown } = await supabase
    .rpc('execute_sql', {
      query: `
        SELECT 
          parent.name as tab,
          child.name as category,
          COUNT(p.id) as product_count,
          ROUND(AVG(p.price), 2) as avg_price
        FROM products.categories parent
        LEFT JOIN products.categories child ON child.parent_id = parent.id
        LEFT JOIN products.products p ON p.category_id = child.id
        WHERE parent.parent_id IS NULL
          AND p.created_by = 'csv_import'
        GROUP BY parent.name, child.name
        ORDER BY parent.name, child.name
      `
    });

  console.log('\n=== IMPORT REPORT ===');
  if (summary?.[0]) {
    const stats = summary[0];
    console.log(`Total Products: ${stats.total_products}`);
    console.log(`Custom Products: ${stats.custom_products}`);
    console.log(`Hidden from Staff: ${stats.hidden_from_staff}`);
    console.log(`Zero Price Products: ${stats.zero_price_products}`);
    console.log(`Total Catalog Value: ฿${stats.total_value}`);
  }

  console.log('\n=== CATEGORY BREAKDOWN ===');
  if (categoryBreakdown) {
    categoryBreakdown.forEach(cat => {
      console.log(`${cat.tab} > ${cat.category}: ${cat.product_count} products (avg: ฿${cat.avg_price})`);
    });
  }
}

async function main() {
  try {
    console.log('🚀 Starting product import from CSV...\n');
    
    // Read and parse CSV
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`CSV file not found: ${CSV_FILE_PATH}`);
      process.exit(1);
    }

    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const products = parseCSV(csvContent);
    
    console.log(`📄 Parsed ${products.length} products from CSV\n`);

    // Create categories
    await createCategories(products);
    console.log('');

    // Import products
    await importProducts(products);

    // Generate report
    await generateReport();

    console.log('\n✅ Product import completed successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
if (require.main === module) {
  main();
}

module.exports = { main };