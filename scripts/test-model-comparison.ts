#!/usr/bin/env tsx
/**
 * Model Comparison Test
 *
 * Tests the same conversations with different OpenAI models to determine
 * if the function calling issues are model-specific.
 *
 * Models to test:
 * - gpt-4o-mini (current, cheap, fast)
 * - gpt-4o (more expensive, better function calling)
 * - gpt-4o-2024-08-06 (specific stable version)
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Test conversations - picking 5 critical failing cases
const TEST_CASES = [
  {
    id: '1',
    conversation_id: '202d48c1-3665-4c70-b60c-4b76a310f011',
    customer_message: 'Confirm 19.00-20.00 ka',
    expected_action: 'create_booking',
    description: 'Time confirmation after availability check'
  },
  {
    id: '2',
    conversation_id: '984b880e-c0d0-4f46-956d-31caed8518ea',
    customer_message: '3.30pm please!',
    expected_action: 'create_booking',
    description: 'Time with "please!" - strong booking signal'
  },
  {
    id: '3',
    conversation_id: '093a0025-f10c-4c63-90e9-9a4c4473bb91',
    customer_message: 'ขอจอง AI Bay 10.00-11.00 น.  และ Social Bay 12.00-13.00 น. ครับ',
    expected_action: 'create_booking',
    description: 'Explicit "ขอจอง" (please book) with times'
  },
  {
    id: '4',
    conversation_id: 'd0cbac86-6ee4-4fad-b57a-39d26699df8f',
    customer_message: 'เอาเป็น 15.00-17.00 วันที่26 ได้ไหมครับ\n\nพอดีอาร์มฝากจองด้วย คนละ ชม',
    expected_action: 'get_coaching_availability',
    description: 'Coaching availability request in Thai'
  },
  {
    id: '5',
    conversation_id: 'a80e2364-c675-49ed-9b02-2f6694e29df1',
    customer_message: 'สวัสดีครับรอบ 12:00-14:00 \nชื่อ Day ยกเลิกนะครับ ขอบคุณครับ',
    expected_action: 'lookup_booking',
    description: 'Cancellation request (needs to lookup booking first)'
  }
];

// Models to test
const MODELS = [
  {
    name: 'gpt-4o-mini',
    description: 'Current model - fast and cheap',
    cost_per_1k_input: 0.00015,
    cost_per_1k_output: 0.0006
  },
  {
    name: 'gpt-4o',
    description: 'Latest GPT-4o - better function calling',
    cost_per_1k_input: 0.0025,
    cost_per_1k_output: 0.01
  },
  {
    name: 'gpt-4o-2024-08-06',
    description: 'Stable GPT-4o version',
    cost_per_1k_input: 0.0025,
    cost_per_1k_output: 0.01
  }
];

interface TestResult {
  test_case_id: string;
  model: string;
  expected_action: string;
  actual_action: string;
  match: boolean;
  response_preview: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
}

async function testModelOnCase(
  testCase: typeof TEST_CASES[0],
  model: typeof MODELS[0]
): Promise<TestResult> {
  console.log(`\n  Testing: ${testCase.description}`);
  console.log(`  Model: ${model.name}`);
  console.log(`  Message: "${testCase.customer_message.substring(0, 60)}..."`);

  const startTime = Date.now();

  try {
    // Call the API with specific model
    const response = await fetch('http://localhost:3000/api/ai/suggest-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: testCase.conversation_id,
        channelType: 'line',
        customerMessage: testCase.customer_message,
        dryRun: true,
        overrideModel: model.name // Add this parameter to allow model override
      })
    });

    const latency = Date.now() - startTime;
    const data: any = await response.json();

    const actualFunction = data.suggestion?.functionCalled || 'NO_FUNCTION';
    const match = actualFunction === testCase.expected_action;

    // Calculate cost
    const inputTokens = data.suggestion?.debugInfo?.openAIRequests?.[0]?.usage?.prompt_tokens || 0;
    const outputTokens = data.suggestion?.debugInfo?.openAIRequests?.[0]?.usage?.completion_tokens || 0;
    const cost = (inputTokens / 1000 * model.cost_per_1k_input) + (outputTokens / 1000 * model.cost_per_1k_output);

    console.log(`  Expected: ${testCase.expected_action}`);
    console.log(`  Actual: ${actualFunction}`);
    console.log(`  Result: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`  Latency: ${latency}ms`);
    console.log(`  Cost: $${cost.toFixed(6)}`);

    return {
      test_case_id: testCase.id,
      model: model.name,
      expected_action: testCase.expected_action,
      actual_action: actualFunction,
      match,
      response_preview: (data.suggestion?.suggestedResponse || '').substring(0, 100),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      latency_ms: latency
    };
  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return {
      test_case_id: testCase.id,
      model: model.name,
      expected_action: testCase.expected_action,
      actual_action: 'ERROR',
      match: false,
      response_preview: error.message,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      latency_ms: Date.now() - startTime
    };
  }
}

async function runModelComparison() {
  console.log('🔬 Model Comparison Test');
  console.log('='.repeat(80));
  console.log(`Testing ${TEST_CASES.length} conversations with ${MODELS.length} different models\n`);

  const results: TestResult[] = [];

  for (const model of MODELS) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 Testing Model: ${model.name}`);
    console.log(`   ${model.description}`);
    console.log(`   Cost: $${model.cost_per_1k_input}/1K input, $${model.cost_per_1k_output}/1K output`);
    console.log('='.repeat(80));

    for (const testCase of TEST_CASES) {
      const result = await testModelOnCase(testCase, model);
      results.push(result);

      // Delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary by model
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 RESULTS SUMMARY');
  console.log('='.repeat(80));

  for (const model of MODELS) {
    const modelResults = results.filter(r => r.model === model.name);
    const matches = modelResults.filter(r => r.match).length;
    const totalCost = modelResults.reduce((sum, r) => sum + r.cost_usd, 0);
    const avgLatency = modelResults.reduce((sum, r) => sum + r.latency_ms, 0) / modelResults.length;

    console.log(`\n${model.name}:`);
    console.log(`  Accuracy: ${matches}/${TEST_CASES.length} (${(matches/TEST_CASES.length*100).toFixed(1)}%)`);
    console.log(`  Avg Latency: ${avgLatency.toFixed(0)}ms`);
    console.log(`  Total Cost: $${totalCost.toFixed(6)}`);
    console.log(`  Cost per 1000 requests: $${(totalCost * 1000 / TEST_CASES.length).toFixed(2)}`);
  }

  // Best model analysis
  console.log('\n' + '='.repeat(80));
  console.log('🏆 RECOMMENDATION');
  console.log('='.repeat(80));

  const modelScores = MODELS.map(model => {
    const modelResults = results.filter(r => r.model === model.name);
    const accuracy = modelResults.filter(r => r.match).length / TEST_CASES.length;
    const avgCost = modelResults.reduce((sum, r) => sum + r.cost_usd, 0) / TEST_CASES.length;
    const avgLatency = modelResults.reduce((sum, r) => sum + r.latency_ms, 0) / modelResults.length;

    return {
      name: model.name,
      accuracy,
      avgCost,
      avgLatency,
      score: accuracy * 100 - (avgCost * 1000) - (avgLatency / 100) // Weighted score
    };
  });

  modelScores.sort((a, b) => b.score - a.score);

  console.log('\nRanking (by weighted score: accuracy + cost + latency):');
  modelScores.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name}`);
    console.log(`     - Accuracy: ${(m.accuracy * 100).toFixed(1)}%`);
    console.log(`     - Avg Cost: $${m.avgCost.toFixed(6)}`);
    console.log(`     - Avg Latency: ${m.avgLatency.toFixed(0)}ms`);
  });

  const bestModel = modelScores[0];
  console.log(`\n✅ Best Model: ${bestModel.name}`);
  console.log(`   Achieves ${(bestModel.accuracy * 100).toFixed(1)}% accuracy`);

  // Export detailed results
  const csvLines = [
    'Test Case,Model,Expected Action,Actual Action,Match,Response Preview,Input Tokens,Output Tokens,Cost USD,Latency MS'
  ];

  results.forEach(r => {
    csvLines.push([
      r.test_case_id,
      r.model,
      r.expected_action,
      r.actual_action,
      r.match ? 'MATCH' : 'MISMATCH',
      `"${r.response_preview.replace(/"/g, '""')}"`,
      r.input_tokens,
      r.output_tokens,
      r.cost_usd.toFixed(6),
      r.latency_ms
    ].join(','));
  });

  const csvFilename = 'model-comparison-results.csv';
  fs.writeFileSync(csvFilename, csvLines.join('\n'));
  console.log(`\n📁 Detailed results exported to: ${csvFilename}`);
}

runModelComparison().catch(console.error);
