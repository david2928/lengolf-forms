/**
 * Manual test script for Supabase Realtime notifications integration
 *
 * Story: NOTIF-005
 *
 * This script tests the real-time connection to the notifications table
 * by subscribing to changes and waiting for events.
 *
 * Usage:
 *   node scripts/test-notifications-realtime.js
 *
 * Then in another terminal, create a notification:
 *   curl -X POST http://localhost:3000/api/notify -H "Content-Type: application/json" -d '{"message":"Test notification","bookingType":"Test"}'
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_REFAC_SUPABASE_URL, NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔧 Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

console.log('✅ Supabase client initialized');
console.log('📡 Subscribing to notifications channel...');

let eventCount = 0;

const channel = supabase
  .channel('notifications-test')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
    },
    (payload) => {
      eventCount++;
      console.log('\n✨ [INSERT] New notification received:');
      console.log('  ID:', payload.new.id);
      console.log('  Type:', payload.new.type);
      console.log('  Customer:', payload.new.customer_name);
      console.log('  Message:', payload.new.message.substring(0, 100) + '...');
      console.log('  Created:', payload.new.created_at);
      console.log('  Event #', eventCount);
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
    },
    (payload) => {
      eventCount++;
      console.log('\n🔄 [UPDATE] Notification updated:');
      console.log('  ID:', payload.new.id);

      // Check what changed
      const changes = [];
      if (payload.old.read !== payload.new.read) {
        changes.push(`read: ${payload.old.read} → ${payload.new.read}`);
      }
      if (payload.old.acknowledged_by !== payload.new.acknowledged_by) {
        changes.push(`acknowledged_by: ${payload.old.acknowledged_by} → ${payload.new.acknowledged_by}`);
      }
      if (payload.old.internal_notes !== payload.new.internal_notes) {
        changes.push(`internal_notes updated`);
      }

      console.log('  Changes:', changes.join(', '));
      console.log('  Event #', eventCount);
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'notifications',
    },
    (payload) => {
      eventCount++;
      console.log('\n🗑️  [DELETE] Notification deleted:');
      console.log('  ID:', payload.old.id);
      console.log('  Customer:', payload.old.customer_name);
      console.log('  Event #', eventCount);
    }
  )
  .subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      console.log('\n✅ Successfully subscribed to notifications channel');
      console.log('👂 Listening for real-time events...');
      console.log('\nTo test:');
      console.log('1. Open another terminal');
      console.log('2. Run: curl -X POST http://localhost:3000/api/notify -H "Content-Type: application/json" -d \'{"message":"Booking Notification (ID: BK-TEST-RT)\\nName: Realtime Test\\nPhone: 0812345678\\nDate: Thu, 15th January\\nTime: 14:00\\nBay: Bay 1\\nType: Test\\nPeople: 2\\nCreated by: Test Script","bookingType":"Test"}\'');
      console.log('\nPress Ctrl+C to stop listening');
    } else if (status === 'CLOSED') {
      console.log('\n⚠️  Channel closed');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('\n❌ Channel error:', error);
    } else {
      console.log('\n📡 Channel status:', status);
    }
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  console.log(`📊 Total events received: ${eventCount}`);

  supabase.removeChannel(channel);
  console.log('✅ Channel unsubscribed');

  process.exit(0);
});

// Keep the script running
console.log('\n💡 Script will run until you press Ctrl+C');
