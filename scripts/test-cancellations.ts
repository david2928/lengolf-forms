#!/usr/bin/env tsx
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const testCases = [
  { msg: 'ยกเลิก', desc: 'Simple Thai cancel' },
  { msg: 'ขอยกเลิกครับ', desc: 'Polite Thai cancel' },
  { msg: 'cancel my booking', desc: 'Simple English cancel' },
  { msg: 'I need to cancel', desc: 'English cancel request' },
  { msg: 'Bro gotta cancel on Wednesday', desc: 'Casual English with date' },
  { msg: 'สวัสดีครับ ยกเลิกนะครับ', desc: 'Thai with greeting' },
  { msg: 'สวัสดีครับรอบ 12:00-14:00 ชื่อ Day ยกเลิกนะครับ ขอบคุณครับ', desc: 'Case 20 (full)' }
];

async function testCancellations() {
  console.log('🧪 Testing Cancellation Keyword Detection');
  console.log('='.repeat(80));

  for (const test of testCases) {
    const response = await fetch('http://localhost:3000/api/ai/suggest-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'test-cancel',
        channelType: 'line',
        customerMessage: test.msg,
        dryRun: true
      })
    });

    const data = await response.json();
    const functionCalled = data.suggestion?.functionCalled || 'NO_FUNCTION';
    const passed = functionCalled === 'cancel_booking' || functionCalled === 'lookup_booking';
    
    console.log(`\n${passed ? '✅' : '❌'} ${test.desc}`);
    console.log(`   Message: "${test.msg}"`);
    console.log(`   Function: ${functionCalled}`);
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(80));
}

testCancellations().catch(console.error);
