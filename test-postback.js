require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY
);

async function testPostbackHandling() {
  console.log('Testing postback handling...');

  const lineUserId = 'Uf4177a1781df7fd215e6d2749fd00296';
  const conversationId = '81b1cbd5-1857-46cf-8f2d-1624d3eaa030';
  const webhookEventId = 'TEST_POSTBACK_' + Date.now();

  try {
    // Test storing a postback message
    console.log('1. Testing postback message insert...');
    const { data: postbackMessage, error: postbackError } = await supabase
      .from('line_messages')
      .insert({
        conversation_id: conversationId,
        webhook_event_id: webhookEventId,
        line_user_id: lineUserId,
        message_type: 'postback',
        message_text: '✅ Confirmed booking',
        timestamp: Date.now(),
        sender_type: 'user',
        is_read: false,
        raw_event: {
          type: 'postback',
          test: true
        }
      })
      .select()
      .single();

    if (postbackError) {
      console.error('Error inserting postback message:', postbackError);
      return;
    }

    console.log('✅ Postback message inserted successfully:', postbackMessage.id);

    // Test storing automated response
    console.log('2. Testing automated response insert...');
    const { data: responseMessage, error: responseError } = await supabase
      .from('line_messages')
      .insert({
        conversation_id: conversationId,
        line_user_id: lineUserId,
        message_type: 'text',
        message_text: '✅ Thank you for confirming your booking! We look forward to seeing you.',
        timestamp: Date.now(),
        sender_type: 'admin',
        sender_name: 'Auto-Response',
        is_read: true,
        raw_event: {
          type: 'automated_response',
          trigger_action: 'confirm_booking',
          booking_id: 'TEST_BOOKING'
        }
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error inserting response message:', responseError);
      return;
    }

    console.log('✅ Response message inserted successfully:', responseMessage.id);

    // Test conversation update
    console.log('3. Testing conversation update...');
    const { error: updateError } = await supabase.rpc('increment_conversation_unread', {
      conversation_id: conversationId,
      new_last_message_at: new Date().toISOString(),
      new_last_message_text: '✅ Confirmed booking',
      new_last_message_by: 'user'
    });

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    } else {
      console.log('✅ Conversation updated successfully');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPostbackHandling();