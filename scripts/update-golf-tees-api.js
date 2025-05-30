const fetch = require('node-fetch');

async function updateGolfTeesUnit() {
  try {
    console.log('🔍 First, let\'s find the Golf Tees (Rubber) product...');
    
    // First, get all products to find the Golf Tees ID
    const getResponse = await fetch('http://localhost:3000/api/inventory/products');
    const data = await getResponse.json();
    
    let golfTeesProduct = null;
    
    // Search through categories and products
    for (const category of data.categories) {
      for (const product of category.products) {
        if (product.name.toLowerCase().includes('golf tees') && 
            product.name.toLowerCase().includes('rubber')) {
          golfTeesProduct = product;
          break;
        }
      }
      if (golfTeesProduct) break;
    }
    
    if (!golfTeesProduct) {
      console.log('❌ Golf Tees (Rubber) product not found');
      return;
    }
    
    console.log('✅ Found Golf Tees product:');
    console.log(`   ID: ${golfTeesProduct.id}`);
    console.log(`   Name: ${golfTeesProduct.name}`);
    console.log(`   Current Unit: ${golfTeesProduct.unit || 'undefined'}`);
    
    // Update the product unit
    console.log('\n🔄 Updating unit from "pieces" to "tees"...');
    
    const updateResponse = await fetch(`http://localhost:3000/api/inventory/products/${golfTeesProduct.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unit: 'tees'
      })
    });
    
    const updateResult = await updateResponse.json();
    
    if (updateResponse.ok && updateResult.success) {
      console.log('✅ Successfully updated Golf Tees unit!');
      console.log(`   New Unit: ${updateResult.product.unit}`);
      console.log(`   Updated At: ${updateResult.product.updated_at}`);
    } else {
      console.log('❌ Failed to update Golf Tees unit:');
      console.log(updateResult);
    }
    
  } catch (error) {
    console.error('❌ Error updating Golf Tees unit:', error.message);
    console.log('\n💡 Make sure the development server is running with: npm run dev');
  }
}

// Run the update
updateGolfTeesUnit(); 