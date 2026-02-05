// Test script to verify the analyze endpoint works correctly
// Run with: node scripts/test-analyze.js

const testConversations = [
  {
    name: 'Pao - Coaching Inquiry',
    conversationId: 'edf3d159-7065-4d17-aa7a-180bbbb4ff2c',
    expectedType: 'coaching_inquiry',
  },
  {
    name: 'YONG - Long conversation',
    conversationId: 'a5111e7d-8b48-46a9-bfc9-e0a15cbca237',
    expectedType: 'unknown',
  },
  {
    name: 'KOoK - High potential (gave contact info)',
    conversationId: 'f1639742-ecfc-4adc-8d4f-b6b6e248a35d',
    expectedType: 'high_priority',
  },
  {
    name: 'four - Quick exchange',
    conversationId: 'b0e87b31-2eb9-4d99-a9f3-05f43b4e63dd',
    expectedType: 'unknown',
  },
];

async function fetchMessages(conversationId) {
  const res = await fetch(`http://localhost:3000/api/conversations/unified/${conversationId}/messages`);
  const data = await res.json();
  return data.messages || [];
}

async function analyzeConversation(conversationId, messages) {
  const res = await fetch('http://localhost:3000/api/chat-opportunities/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId,
      messages: messages.slice(-20), // Last 20 messages
    }),
  });
  return res.json();
}

async function testOne(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${test.name}`);
  console.log(`Conversation ID: ${test.conversationId}`);
  console.log('='.repeat(60));

  try {
    // Fetch messages
    console.log('\n1. Fetching messages...');
    const messages = await fetchMessages(test.conversationId);
    console.log(`   Found ${messages.length} messages`);

    if (messages.length === 0) {
      console.log('   ERROR: No messages found!');
      return;
    }

    // Show first few messages
    console.log('\n2. Message preview:');
    messages.slice(0, 3).forEach((msg, i) => {
      const content = msg.content?.substring(0, 60) || 'NO CONTENT';
      console.log(`   [${i + 1}] ${msg.sender_type}: "${content}..."`);
    });

    // Check field names
    console.log('\n3. Field validation:');
    const firstMsg = messages[0];
    console.log(`   - content: ${firstMsg.content ? 'OK' : 'MISSING!'}`);
    console.log(`   - sender_type: ${firstMsg.sender_type ? 'OK' : 'MISSING!'}`);
    console.log(`   - sender_name: ${firstMsg.sender_name || 'not set'}`);
    console.log(`   - created_at: ${firstMsg.created_at ? 'OK' : 'MISSING!'}`);

    // Analyze
    console.log('\n4. Calling analyze endpoint...');
    const result = await analyzeConversation(test.conversationId, messages);

    if (!result.success) {
      console.log(`   ERROR: ${result.error}`);
      return;
    }

    console.log('\n5. Analysis result:');
    console.log(`   - Opportunity Type: ${result.analysis?.opportunityType}`);
    console.log(`   - Priority: ${result.analysis?.priority}`);
    console.log(`   - Confidence: ${result.analysis?.confidenceScore}`);
    console.log(`   - Summary: ${result.analysis?.analysisSummary}`);
    console.log(`   - Suggested Action: ${result.analysis?.suggestedAction}`);
    console.log(`   - Suggested Message: ${result.analysis?.suggestedMessage?.substring(0, 100)}...`);

    if (result.analysis?.opportunityType === 'not_an_opportunity') {
      console.log('\n   ⚠️  Classified as NOT an opportunity');
    } else {
      console.log('\n   ✅ Classified as an opportunity!');
    }

  } catch (error) {
    console.log(`   ERROR: ${error.message}`);
  }
}

async function main() {
  console.log('Chat Opportunities - Analyze Endpoint Test');
  console.log('==========================================\n');

  for (const test of testConversations) {
    await testOne(test);
  }

  console.log('\n\nTest complete!');
}

main();
