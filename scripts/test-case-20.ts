#!/usr/bin/env tsx
/**
 * Test Case 20 specifically - Thai cancellation
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testCase20() {
  console.log('🧪 Testing Case 20: Thai Cancellation');
  console.log('='.repeat(80));

  const customerMessage = 'สวัสดีครับรอบ 12:00-14:00 ชื่อ Day ยกเลิกนะครับ ขอบคุณครับ';
  console.log(`\nCustomer message: "${customerMessage}"`);
  console.log('\nExpected: Should call cancel_booking function');
  console.log('Issue: AI is responding conversationally instead\n');

  const requestPayload = {
    conversationId: 'test-case-20',
    channelType: 'line',
    customerMessage: customerMessage,
    dryRun: true
  };

  console.log('📤 Calling AI API...\n');

  const response = await fetch('http://localhost:3000/api/ai/suggest-response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    console.log(`❌ API Error: ${response.status}`);
    console.log(await response.text());
    return;
  }

  const data = await response.json();

  console.log('='.repeat(80));
  console.log('📊 RESULT');
  console.log('='.repeat(80));
  console.log(`Function called: ${data.suggestion?.functionCalled || 'NO_FUNCTION'}`);
  console.log(`Suggested response: "${data.suggestion?.suggestedResponse}"`);
  
  if (data.suggestion?.functionResult) {
    console.log('\n📋 Function Result:');
    console.log(JSON.stringify(data.suggestion.functionResult, null, 2));
  }

  console.log('\n='.repeat(80));
  if (data.suggestion?.functionCalled === 'cancel_booking') {
    console.log('✅ SUCCESS: AI correctly called cancel_booking!');
  } else {
    console.log('❌ FAILED: AI did not call cancel_booking');
    console.log(`   Instead called: ${data.suggestion?.functionCalled || 'NO_FUNCTION'}`);
  }
  console.log('='.repeat(80));
}

testCase20().catch(console.error);
