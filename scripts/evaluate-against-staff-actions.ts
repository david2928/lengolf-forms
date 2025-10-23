#!/usr/bin/env tsx
/**
 * Evaluate AI by comparing against what staff ACTUALLY did in real conversations
 *
 * Process:
 * 1. Get real conversations from database
 * 2. For each customer message, check what the staff actually did (their response)
 * 3. Run the AI on the same customer message with same context
 * 4. Use LLM to compare AI action vs staff action
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function evaluateAgainstStaffActions() {
  // Load test samples which contain full conversation history
  const samplesPath = path.join(process.cwd(), 'tests/ai/test-samples.json');
  const samplesData = JSON.parse(fs.readFileSync(samplesPath, 'utf-8'));
  const samples = samplesData.samples;

  console.log('🔍 Evaluating AI against actual staff actions');
  console.log('='.repeat(80));
  console.log(`Total samples: ${samples.length}\n`);

  const results: any[] = [];
  let evaluated = 0;
  const maxToEvaluate = 20; // Start with 20 samples

  for (const sample of samples) {
    if (evaluated >= maxToEvaluate) break;

    console.log(`\n[${ evaluated + 1}/${maxToEvaluate}] Conversation: ${sample.conversation_id}`);
    console.log(`Customer message: "${sample.customer_message.substring(0, 80)}..."`);

    // Find what staff actually did (the next message after customer message)
    const fullConversation = sample.full_conversation || [];
    const customerMsgIndex = fullConversation.findIndex((msg: any) =>
      msg.content === sample.customer_message && msg.sender_type === 'user'
    );

    if (customerMsgIndex === -1 || customerMsgIndex === fullConversation.length - 1) {
      console.log('⏭️  Skipping: No staff response found');
      continue;
    }

    const staffResponse = fullConversation[customerMsgIndex + 1];

    // Build conversation context (messages leading up to this customer message)
    const contextMessages = fullConversation.slice(0, customerMsgIndex + 2).map((msg: any) => ({
      role: msg.sender_type === 'user' ? 'customer' : 'staff',
      content: msg.content
    }));

    console.log(`Context: ${contextMessages.length} messages`);

    // Step 1: Use LLM to determine what staff ACTUALLY did based on full conversation
    const staffAnalysisPrompt = `Analyze this conversation to determine what action the staff took:

FULL CONVERSATION:
${contextMessages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Based on the ENTIRE conversation flow, what did the staff do in response to the customer's message?

Available actions:
- create_booking: Staff created or confirmed a booking (look for booking confirmations, specific dates/times agreed upon)
- check_bay_availability: Staff checked and reported bay availability
- get_coaching_availability: Staff checked and reported coach availability
- lookup_booking: Staff looked up existing booking details
- conversational: Staff just had a conversation (general questions, thank you, greetings, etc.)

Respond in JSON:
{
  "staff_action": "create_booking" | "check_bay_availability" | "get_coaching_availability" | "lookup_booking" | "conversational",
  "reasoning": "Why you determined this action based on conversation flow"
}`;

    const staffAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing customer service conversations.' },
          { role: 'user', content: staffAnalysisPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0
      })
    });

    const staffAnalysisData: any = await staffAnalysisResponse.json();
    const staffAnalysis = JSON.parse(staffAnalysisData.choices[0].message.content);

    console.log(`Staff action (from context): ${staffAnalysis.staff_action}`);
    console.log(`Reasoning: ${staffAnalysis.reasoning.substring(0, 80)}...`);

    // Step 2: Get AI's suggested action
    const aiResponse = await fetch('http://localhost:3000/api/ai/suggest-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: sample.conversation_id,
        channelType: sample.channel,
        customerMessage: sample.customer_message,
        dryRun: true
      })
    });

    const aiData: any = await aiResponse.json();
    const aiFunctionCalled = aiData.suggestion?.functionCalled || 'NO_FUNCTION';
    const aiSuggestedResponse = aiData.suggestion?.suggestedResponse || '';

    console.log(`AI function called: ${aiFunctionCalled}`);

    // Step 3: Use LLM to compare
    const comparisonPrompt = `Compare what staff did vs what AI would do:

CUSTOMER MESSAGE:
"${sample.customer_message}"

STAFF ACTION (determined from conversation context):
${staffAnalysis.staff_action}

AI ACTION:
Function called: ${aiFunctionCalled}
Response: "${aiSuggestedResponse}"

Do they match? Consider:
- If staff action was "conversational" and AI called NO_FUNCTION → MATCH
- If staff action was "create_booking" and AI called "create_booking" → MATCH
- If staff action was "check_bay_availability" and AI called "check_bay_availability" → MATCH
- etc.

Respond in JSON:
{
  "match": true | false,
  "reasoning": "Why they match or don't match"
}`;

    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing customer service conversations.' },
          { role: 'user', content: comparisonPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0
      })
    });

    const llmData: any = await llmResponse.json();
    const comparison = JSON.parse(llmData.choices[0].message.content);

    console.log(`Match: ${comparison.match ? '✅' : '❌'} - ${comparison.reasoning}`);

    results.push({
      conversation_id: sample.conversation_id,
      customer_message: sample.customer_message,
      staff_action: staffAnalysis.staff_action,
      staff_reasoning: staffAnalysis.reasoning,
      staff_response: staffResponse.content.substring(0, 200),
      ai_action: aiFunctionCalled === 'NO_FUNCTION' ? 'conversational' : aiFunctionCalled,
      ai_function: aiFunctionCalled,
      ai_response: aiSuggestedResponse.substring(0, 200),
      match: comparison.match,
      reasoning: comparison.reasoning,
      language: sample.language,
      channel: sample.channel
    });

    evaluated++;

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 EVALUATION AGAINST STAFF ACTIONS');
  console.log('='.repeat(80));

  const matches = results.filter(r => r.match).length;
  console.log(`\nMatches: ${matches}/${results.length} (${(matches/results.length*100).toFixed(1)}%)\n`);

  // Export to CSV
  const csvLines = [
    'Conversation ID,Customer Message,Staff Action,Staff Reasoning,AI Action,AI Function,Match,Comparison Reasoning'
  ];

  results.forEach(r => {
    csvLines.push([
      r.conversation_id,
      `"${r.customer_message.replace(/"/g, '""').substring(0, 100)}"`,
      r.staff_action,
      `"${r.staff_reasoning.replace(/"/g, '""').substring(0, 100)}"`,
      r.ai_action,
      r.ai_function,
      r.match ? 'MATCH' : 'MISMATCH',
      `"${r.reasoning.replace(/"/g, '""').substring(0, 150)}"`
    ].join(','));
  });

  const csvFilename = 'evaluation-vs-staff-actions.csv';
  fs.writeFileSync(csvFilename, csvLines.join('\n'));
  console.log(`📁 Results exported to: ${csvFilename}\n`);

  // Show mismatch patterns
  const mismatches = results.filter(r => !r.match);
  console.log(`\nMismatches (${mismatches.length}):`);
  mismatches.forEach((m, i) => {
    console.log(`\n${i + 1}. ${m.customer_message.substring(0, 60)}...`);
    console.log(`   Staff: ${m.staff_action}`);
    console.log(`   AI: ${m.ai_action}`);
    console.log(`   Reason: ${m.reasoning}`);
  });
}

evaluateAgainstStaffActions().catch(console.error);
