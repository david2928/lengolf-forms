const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPhotos() {
  console.log('Checking time entries with photos...');
  
  const { data, error } = await supabase
    .from('time_entries')
    .select('id, staff_id, action, timestamp, photo_url, photo_captured')
    .not('photo_url', 'is', null)
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Found', data.length, 'entries with photos:');
  data.forEach(entry => {
    console.log(`- Entry ${entry.id}: ${entry.photo_url} (captured: ${entry.photo_captured})`);
  });
  
  // Also check bucket contents
  console.log('\nChecking bucket contents...');
  const { data: bucketData, error: bucketError } = await supabase.storage
    .from('time-clock-photos')
    .list('', { limit: 10 });
    
  if (bucketError) {
    console.error('Bucket error:', bucketError);
  } else {
    console.log('Bucket folders:', bucketData.map(f => f.name));
  }
}

checkPhotos().catch(console.error); 