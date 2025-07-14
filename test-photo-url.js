/**
 * Simple test script to test getTimeClockPhotoUrl function
 * Usage: node test-photo-url.js
 * 
 * Note: This script manually replicates the getTimeClockPhotoUrl function
 * since we can't directly import TypeScript in Node.js
 */

// Manual implementation of the function for testing
const { createClient } = require('@supabase/supabase-js');

// Configuration (matches PHOTO_CONFIG)
const PHOTO_CONFIG = {
  STORAGE_BUCKET: 'time-clock-photos'
};

// Initialize Supabase client (needs environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Required: NEXT_PUBLIC_REFAC_SUPABASE_URL and REFAC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const refacSupabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Replicate the getTimeClockPhotoUrl function
async function getTimeClockPhotoUrl(photoPath) {
  try {
    if (!photoPath) {
      return '';
    }

    console.log(`🔍 Attempting to generate signed URL for: ${photoPath}`);
    console.log(`📦 Using bucket: ${PHOTO_CONFIG.STORAGE_BUCKET}`);

    // Try signed URL generation
    const { data: signedData, error: signedError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .createSignedUrl(photoPath, 3600); // 1 hour expiry
    
    if (!signedError && signedData?.signedUrl) {
      console.log('✅ Signed URL generated successfully');
      return signedData.signedUrl;
    }
    
    // Log specific error for debugging
    console.error(`❌ Signed URL generation failed for ${photoPath}`, {
      error: signedError?.message,
      code: signedError?.name,
      bucket: PHOTO_CONFIG.STORAGE_BUCKET
    });
    
    // Try public URL as fallback
    console.log('🔄 Attempting public URL fallback...');
    const { data: publicData } = refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .getPublicUrl(photoPath);
    
    if (publicData?.publicUrl) {
      console.log('✅ Public URL generated as fallback');
      return publicData.publicUrl;
    }
    
    console.error(`❌ Complete failure - no URL generated for ${photoPath}`);
    return '';
    
  } catch (error) {
    console.error(`💥 Critical error for ${photoPath}:`, error);
    return '';
  }
}

async function testPhotoUrl() {
  console.log('🧪 Testing getTimeClockPhotoUrl function');
  console.log('='.repeat(50));
  
  const testPath = "2025-07-14/timeclock_1752465805803_8_clock_out.jpg";
  
  console.log(`📸 Testing path: ${testPath}`);
  console.log(`🪣 Storage bucket: time-clock-photos`);
  console.log('⏳ Generating signed URL...\n');
  
  try {
    const startTime = Date.now();
    const photoUrl = await getTimeClockPhotoUrl(testPath);
    const endTime = Date.now();
    
    console.log('✅ Function executed successfully');
    console.log(`⏱️  Execution time: ${endTime - startTime}ms`);
    console.log(`📊 Result type: ${typeof photoUrl}`);
    console.log(`📏 Result length: ${photoUrl?.length || 0} characters`);
    
    if (photoUrl) {
      console.log('\n🎉 SUCCESS: Signed URL generated');
      console.log(`🔗 URL: ${photoUrl}`);
      console.log(`🔍 URL starts with: ${photoUrl.substring(0, 50)}...`);
      
      // Check if it's a signed URL or public URL
      if (photoUrl.includes('token=')) {
        console.log('📝 Type: Signed URL (contains token)');
      } else if (photoUrl.includes('supabase')) {
        console.log('📝 Type: Public URL (no token)');
      } else {
        console.log('📝 Type: Unknown URL format');
      }
    } else {
      console.log('\n❌ FAILURE: No URL generated');
      console.log('📝 This indicates the function returned an empty string');
    }
    
  } catch (error) {
    console.log('\n💥 ERROR: Function threw an exception');
    console.error('❗ Error details:', error);
    console.error('📚 Stack trace:', error.stack);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test completed');
}

// Add some environment checks
console.log('🔧 Environment Check');
console.log('='.repeat(30));
console.log(`📂 Current directory: ${process.cwd()}`);
console.log(`🟢 Node.js version: ${process.version}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`🔐 SKIP_AUTH: ${process.env.SKIP_AUTH || 'not set'}`);
console.log('');

// Run the test
testPhotoUrl().catch(error => {
  console.error('💀 Critical error running test:', error);
  process.exit(1);
});