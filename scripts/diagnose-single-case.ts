#!/usr/bin/env tsx
/**
 * Deep diagnostic of a single test case
 * Shows EXACTLY what context the AI receives
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const samples = require('../tests/ai/labeled-samples.json');

const CASE_ID = '1a1d5879-1c87-4d2a-84ff-7b590879b0fa-18';

async function diagnoseSingleCase() {
  console.log('🔍 DEEP DIAGNOSTIC: Single Case Analysis\n');
  console.log('='.repeat(80));

  const sample = samples.samples.find((s: any) => s.id === CASE_ID);

  if (!sample) {
    console.log(`❌ Sample not found: ${CASE_ID}`);
    return;
  }

  console.log(`\n📋 CASE: ${CASE_ID}`);
  console.log('='.repeat(80));

  // 1. Show full conversation history
  console.log('\n📜 FULL CONVERSATION HISTORY:');
  console.log('='.repeat(80));
  if (sample.full_conversation && sample.full_conversation.length > 0) {
    sample.full_conversation.forEach((msg: any, i: number) => {
      console.log(`\n[${i + 1}] ${msg.sender_type.toUpperCase()} (${msg.created_at}):`);
      console.log(`    "${msg.content}"`);
    });
  }

  // 2. Show conversation history passed to AI
  console.log('\n\n📨 CONVERSATION HISTORY SENT TO AI:');
  console.log('='.repeat(80));
  if (sample.conversation_history && sample.conversation_history.length > 0) {
    sample.conversation_history.forEach((msg: any, i: number) => {
      console.log(`\n[${i + 1}] ${msg.sender_type}:`);
      console.log(`    "${msg.content}"`);
    });
  } else {
    console.log('(No conversation history)');
  }

  // 3. Show customer context
  console.log('\n\n👤 CUSTOMER CONTEXT SENT TO AI:');
  console.log('='.repeat(80));
  if (sample.customer_context) {
    console.log(JSON.stringify(sample.customer_context, null, 2));
  } else {
    console.log('(No customer context)');
  }

  // 4. Show the customer message
  console.log('\n\n💬 CUSTOMER MESSAGE (What triggered the AI):');
  console.log('='.repeat(80));
  console.log(`"${sample.customer_message}"`);

  // 5. Show what staff actually did
  console.log('\n\n✅ STAFF RESPONSE (What should happen):');
  console.log('='.repeat(80));
  console.log(`"${sample.actual_staff_response}"`);

  // 6. Now call the AI and show EVERYTHING
  console.log('\n\n🤖 CALLING AI WITH THIS CONTEXT...');
  console.log('='.repeat(80));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const requestPayload = {
    conversationId: sample.conversation_id || 'test-diagnostic',
    channelType: sample.channel || 'line',
    customerMessage: sample.customer_message,
    conversationHistory: sample.conversation_history || [],
    // DON'T pass customerContext - let API fetch it from conversation_id automatically
    dryRun: true
  };

  console.log('\n\n📤 REQUEST PAYLOAD TO API:');
  console.log('='.repeat(80));
  console.log(JSON.stringify(requestPayload, null, 2));

  const response = await fetch(`${baseUrl}/api/ai/suggest-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    console.log(`\n❌ API Error: ${response.status}`);
    console.log(await response.text());
    return;
  }

  const data = await response.json();

  // 7. Show what customer context the API actually used
  console.log('\n\n🔍 ACTUAL CUSTOMER CONTEXT USED BY API:');
  console.log('='.repeat(80));
  if (data.suggestion?.contextSummary) {
    console.log(data.suggestion.contextSummary);
    if (data.suggestion.contextSummary.includes('customer context available')) {
      console.log('\n✅ Customer context WAS fetched and used!');
    } else if (data.suggestion.contextSummary.includes('no customer context')) {
      console.log('\n❌ Customer context NOT available');
    }
  }

  // 8. Show AI's response
  console.log('\n\n🤖 AI RESPONSE:');
  console.log('='.repeat(80));
  console.log(data.suggestion?.suggestedResponse || 'No response');

  // 8. Show function called
  console.log('\n\n⚙️  FUNCTION CALLS:');
  console.log('='.repeat(80));

  // Check if there's a function chain in the context summary
  if (data.suggestion?.contextSummary) {
    const chainMatch = data.suggestion.contextSummary.match(/functions: (.+?)$/);
    if (chainMatch) {
      console.log(`Function chain: ${chainMatch[1]}`);
    }
  }

  if (data.suggestion?.functionCalled) {
    console.log(`\nLast function: ${data.suggestion.functionCalled}`);
    console.log(`\nParameters:`);
    console.log(JSON.stringify(data.suggestion.functionParameters, null, 2));
  } else {
    console.log('\n⚠️  NO FUNCTION CALLED');
  }

  // 9. Show internal reasoning if available
  if (data.suggestion?.suggestedResponse?.includes('[INTERNAL REASONING:')) {
    console.log('\n\n🧠 AI INTERNAL REASONING:');
    console.log('='.repeat(80));
    const reasoning = data.suggestion.suggestedResponse.match(/\[INTERNAL REASONING:([\s\S]*?)\]/);
    if (reasoning && reasoning[1]) {
      console.log(reasoning[1].trim());
    }
  }

  // 10. Analysis
  console.log('\n\n📊 ANALYSIS:');
  console.log('='.repeat(80));

  console.log('\n✅ What the AI should have done:');
  console.log('   - Function: create_booking (customer said "I want to book")');
  console.log('   - Customer has booking intent, staff created booking');

  console.log('\n❌ What the AI actually did:');
  console.log(`   - Function: ${data.suggestion?.functionCalled || 'none'}`);

  if (data.suggestion?.functionCalled === 'check_bay_availability') {
    console.log('\n💡 PROBLEM IDENTIFIED:');
    console.log('   AI is checking availability instead of creating booking!');
    console.log('   Even though customer explicitly said "I want to book"');
    console.log('\n   Possible reasons:');
    console.log('   1. Function schema trigger words not strong enough');
    console.log('   2. Conversation history suggests availability check needed');
    console.log('   3. AI is being overly cautious about customer info');
  }

  console.log('\n' + '='.repeat(80));

  // Write full debug info to file
  if (data.suggestion?.debugInfo) {
    const fs = require('fs');
    fs.writeFileSync(
      'diagnostic-openai-payloads.json',
      JSON.stringify(data.suggestion.debugInfo, null, 2)
    );
    console.log('\n✅ Full OpenAI request/response payloads saved to: diagnostic-openai-payloads.json');
  }
}

diagnoseSingleCase().catch(error => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
});
