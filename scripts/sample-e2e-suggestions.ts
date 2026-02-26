#!/usr/bin/env npx tsx
// E2E AI Suggestion Sampler
// Picks conversations from the database, runs them through the AI pipeline,
// and stores results locally for human review.
//
// Usage:
//   npx tsx scripts/sample-e2e-suggestions.ts                    # 10 random conversations (last 60 days)
//   npx tsx scripts/sample-e2e-suggestions.ts --count 20         # 20 random conversations
//   npx tsx scripts/sample-e2e-suggestions.ts --today             # All conversations from today
//   npx tsx scripts/sample-e2e-suggestions.ts --days 3            # Conversations from last 3 days
//   npx tsx scripts/sample-e2e-suggestions.ts --date 2026-02-20   # Conversations from specific date
//   npx tsx scripts/sample-e2e-suggestions.ts --channel line      # Filter by channel (line/instagram/website)
//   npx tsx scripts/sample-e2e-suggestions.ts --min-msgs 6        # Minimum messages per conversation
//   npx tsx scripts/sample-e2e-suggestions.ts --conversation abc  # Test a specific conversation ID
//   npx tsx scripts/sample-e2e-suggestions.ts --conversation abc --all  # Test ALL messages in a conversation
//   npx tsx scripts/sample-e2e-suggestions.ts --review            # Review latest stored results
//
// Flags can be combined:
//   npx tsx scripts/sample-e2e-suggestions.ts --today --channel instagram --count 5
//
// Prerequisites:
// - Dev server running on localhost:3000 with SKIP_AUTH=true
// - SUPABASE env vars configured (for direct DB access)

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const RESULTS_DIR = join(process.cwd(), 'scripts', 'e2e-samples');

// ─── Parse CLI args ──────────────────────────────────────────────────────────

function getArg(name: string): string | null {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

const args = process.argv.slice(2);
const isReview = args.includes('--review');
const isToday = args.includes('--today');
const sampleCount = parseInt(getArg('count') || '10');
const daysBack = parseInt(getArg('days') || '0');
const specificDate = getArg('date');
const channelFilter = getArg('channel');
const minMsgs = parseInt(getArg('min-msgs') || '3');
const maxMsgs = parseInt(getArg('max-msgs') || '50');
const specificConvId = getArg('conversation');

// Compute date filter
function getDateFilter(): { from: string; to: string | null; label: string } {
  if (specificDate) {
    return { from: `${specificDate}T00:00:00Z`, to: `${specificDate}T23:59:59Z`, label: specificDate };
  }
  if (isToday) {
    // Use Thailand timezone (UTC+7) for "today"
    const now = new Date();
    const thailandOffset = 7 * 60 * 60 * 1000;
    const thailandNow = new Date(now.getTime() + thailandOffset);
    const todayStr = thailandNow.toISOString().split('T')[0];
    return { from: `${todayStr}T00:00:00+07:00`, to: null, label: `today (${todayStr})` };
  }
  if (daysBack > 0) {
    const from = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    return { from, to: null, label: `last ${daysBack} days` };
  }
  // Default: last 60 days
  const from = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  return { from, to: null, label: 'last 60 days (random)' };
}

// ─── Supabase client ─────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;

if (!isReview && (!supabaseUrl || !supabaseKey)) {
  console.error('Missing NEXT_PUBLIC_REFAC_SUPABASE_URL or REFAC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationSample {
  conversationId: string;
  customerId: string | null;
  customerName: string | null;
  channelType: string;
  messages: Array<{
    content: string;
    senderType: string;
    createdAt: string;
    msgNum: number;
  }>;
}

interface TestPoint {
  customerMsgNum: number;
  customerMessage: string;
  history: Array<{ content: string; senderType: string; createdAt: string }>;
  actualStaffResponse: string | null;
}

interface SampleResult {
  conversationId: string;
  customerName: string | null;
  channelType: string;
  testPoint: TestPoint;
  aiResponse: string;
  aiResponseThai: string | null;
  managementNote: string | null;
  intent: string;
  intentSource: string;
  confidenceScore: number;
  responseTimeMs: number;
  functionCalled: string | null;
  suggestedImages: number;
  hasCustomerContext: boolean;
  needsManagement: boolean;
  internalNote: string | null;
  timestamp: string;
}

// ─── Fetch conversations ─────────────────────────────────────────────────────

async function fetchConversationById(convId: string): Promise<ConversationSample[]> {
  if (!supabase) return [];

  const { data: messages } = await supabase
    .from('unified_messages')
    .select('content, sender_type, created_at')
    .eq('conversation_id', convId)
    .not('content', 'is', null)
    .not('content', 'eq', '')
    .order('created_at', { ascending: true });

  const { data: conv } = await supabase
    .from('unified_conversations')
    .select('customer_id, channel_type')
    .eq('id', convId)
    .single();

  let customerName: string | null = null;
  if (conv?.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('customer_name')
      .eq('id', conv.customer_id)
      .single();
    customerName = customer?.customer_name || null;
  }

  if (!messages || messages.length === 0) return [];

  return [{
    conversationId: convId,
    customerId: conv?.customer_id || null,
    customerName,
    channelType: conv?.channel_type || 'line',
    messages: messages.map((m, i) => ({
      content: m.content,
      senderType: m.sender_type,
      createdAt: m.created_at,
      msgNum: i + 1,
    })),
  }];
}

async function fetchConversations(count: number): Promise<ConversationSample[]> {
  if (!supabase) return [];

  const dateFilter = getDateFilter();
  console.log(`  Date range: ${dateFilter.label}`);
  if (channelFilter) console.log(`  Channel: ${channelFilter}`);
  console.log(`  Message count: ${minMsgs} to ${maxMsgs}`);
  console.log('');

  // Get conversation IDs with messages in date range
  let query = supabase
    .from('unified_messages')
    .select('conversation_id')
    .gte('created_at', dateFilter.from)
    .not('content', 'is', null);

  if (dateFilter.to) {
    query = query.lte('created_at', dateFilter.to);
  }

  const { data: conversations, error } = await query;

  if (error || !conversations) {
    console.error('Failed to query conversations:', error?.message);
    process.exit(1);
  }

  // Count messages per conversation
  const convCounts = new Map<string, number>();
  conversations.forEach(row => {
    convCounts.set(row.conversation_id, (convCounts.get(row.conversation_id) || 0) + 1);
  });

  // Filter by message count
  let eligible = Array.from(convCounts.entries())
    .filter(([, cnt]) => cnt >= minMsgs && cnt <= maxMsgs)
    .map(([id]) => id);

  // Filter by channel if specified
  if (channelFilter) {
    const { data: convMeta } = await supabase
      .from('unified_conversations')
      .select('id, channel_type')
      .in('id', eligible);

    if (convMeta) {
      const matchingIds = new Set(
        convMeta.filter(c => c.channel_type === channelFilter).map(c => c.id)
      );
      eligible = eligible.filter(id => matchingIds.has(id));
    }
  }

  console.log(`  Found ${eligible.length} eligible conversations`);

  // For --today or --date, take all (up to count). For random, shuffle first.
  let selected: string[];
  if (isToday || specificDate || daysBack > 0) {
    selected = eligible.slice(0, count);
  } else {
    const shuffled = eligible.sort(() => Math.random() - 0.5);
    selected = shuffled.slice(0, count);
  }

  // Fetch full message history + customer data
  const results: ConversationSample[] = [];
  for (const convId of selected) {
    const convResults = await fetchConversationById(convId);
    results.push(...convResults);
  }

  return results;
}

// ─── Test point selection ────────────────────────────────────────────────────

function pickTestPoints(convo: ConversationSample): TestPoint[] {
  const points: TestPoint[] = [];
  const msgs = convo.messages;

  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    const isCustomer = msg.senderType === 'user' || msg.senderType === 'customer';
    if (!isCustomer) continue;

    // Skip very short messages (single emoji, "ok", etc.)
    if (msg.content.length < 5) continue;

    // Skip system messages
    if (msg.content.startsWith('📋') || msg.content.startsWith('✅') || msg.content.startsWith('❌')) continue;

    // Find the next staff response
    let staffReply: string | null = null;
    for (let j = i + 1; j < msgs.length; j++) {
      const next = msgs[j];
      if (next.senderType === 'admin' || next.senderType === 'staff') {
        staffReply = next.content;
        break;
      }
    }

    // Build conversation history (all messages before this one)
    const history = msgs.slice(0, i).map(m => ({
      content: m.content,
      senderType: m.senderType,
      createdAt: m.createdAt,
    }));

    points.push({
      customerMsgNum: msg.msgNum,
      customerMessage: msg.content,
      history,
      actualStaffResponse: staffReply,
    });
  }

  // --all flag: test every customer message; otherwise pick 2 (first + mid)
  const testAll = process.argv.includes('--all');
  if (testAll) return points;

  if (points.length === 0) return [];
  if (points.length === 1) return points;

  const first = points[0];
  const mid = points[Math.floor(points.length / 2)];
  if (first.customerMsgNum === mid.customerMsgNum) return [first];
  return [first, mid];
}

// ─── API call ────────────────────────────────────────────────────────────────

async function callSuggestAPI(
  customerMessage: string,
  history: Array<{ content: string; senderType: string; createdAt: string }>,
  conversationId: string,
  customerId: string | null,
  channelType: string,
) {
  const body = {
    customerMessage,
    conversationId,
    channelType,
    customerId,
    dryRun: true,
    includeDebugContext: true,
    conversationContext: history,
  };

  const resp = await fetch(`${API_BASE}/api/ai/suggest-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return resp.json();
}

// ─── Main sampling loop ─────────────────────────────────────────────────────

async function runSampling() {
  const filterLabel = isToday ? 'today' : specificDate ? specificDate : daysBack > 0 ? `last ${daysBack} days` : 'random';

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          E2E AI Suggestion Sampler                              ║');
  console.log(`║          Mode: ${filterLabel.padEnd(48)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 1. Get conversations
  let conversations: ConversationSample[];
  if (specificConvId) {
    console.log(`Fetching specific conversation: ${specificConvId}`);
    conversations = await fetchConversationById(specificConvId);
  } else {
    console.log(`Fetching conversations...`);
    conversations = await fetchConversations(sampleCount);
  }

  console.log(`Got ${conversations.length} conversations\n`);

  if (conversations.length === 0) {
    console.error('No conversations found matching filters');
    process.exit(1);
  }

  // 2. Pick test points and run through AI
  const allResults: SampleResult[] = [];

  for (let ci = 0; ci < conversations.length; ci++) {
    const convo = conversations[ci];
    const testPoints = pickTestPoints(convo);

    console.log(`\n${'─'.repeat(66)}`);
    console.log(`[${ci + 1}/${conversations.length}] ${convo.customerName || 'Unknown'} (${convo.channelType}, ${convo.messages.length} msgs)`);

    for (const tp of testPoints) {
      console.log(`  Testing msg #${tp.customerMsgNum}: "${tp.customerMessage.substring(0, 70)}${tp.customerMessage.length > 70 ? '...' : ''}"`);

      try {
        const response = await callSuggestAPI(
          tp.customerMessage,
          tp.history,
          convo.conversationId,
          convo.customerId,
          convo.channelType,
        );

        if (!response.success || !response.suggestion) {
          console.log(`    ❌ API Error: ${response.error || 'Unknown'}`);
          continue;
        }

        const s = response.suggestion;
        const debug = s.debugContext;
        const aiResponse = s.suggestedResponse || s.suggestedResponseThai || '';

        // Check for management escalation (now extracted server-side, but also check response in case)
        const needsManagement = !!s.managementNote || aiResponse.includes('[NEEDS MANAGEMENT');
        const managementNote = s.managementNote || null;

        // Check for internal notes
        const noteMatch = aiResponse.match(/\[INTERNAL NOTE:([^\]]*)\]/);

        const result: SampleResult = {
          conversationId: convo.conversationId,
          customerName: convo.customerName,
          channelType: convo.channelType,
          testPoint: tp,
          aiResponse,
          aiResponseThai: s.suggestedResponseThai || null,
          managementNote,
          intent: debug?.intentDetected || 'unknown',
          intentSource: debug?.intentSource || 'unknown',
          confidenceScore: s.confidenceScore,
          responseTimeMs: s.responseTime,
          functionCalled: s.functionCalled || null,
          suggestedImages: s.suggestedImages?.length || 0,
          hasCustomerContext: !!debug?.customerData,
          needsManagement,
          internalNote: noteMatch ? noteMatch[1].trim() : null,
          timestamp: new Date().toISOString(),
        };

        allResults.push(result);

        // Print summary
        const intentTag = `${result.intent} (${result.intentSource})`;
        const confPct = `${(result.confidenceScore * 100).toFixed(0)}%`;
        console.log(`    ✅ Intent: ${intentTag} | Conf: ${confPct} | Time: ${result.responseTimeMs}ms`);
        if (result.functionCalled) console.log(`    🔧 Function: ${result.functionCalled}`);
        if (result.needsManagement) console.log(`    🚩 MGMT: ${result.managementNote || result.internalNote}`);

        // Show AI vs Staff
        const aiShort = aiResponse.replace(/\n/g, ' ').substring(0, 100);
        console.log(`    📝 AI: ${aiShort}`);
        if (tp.actualStaffResponse) {
          const staffShort = tp.actualStaffResponse.replace(/\n/g, ' ').substring(0, 100);
          console.log(`    👤 Staff: ${staffShort}`);
        }

      } catch (error) {
        console.log(`    💥 Error: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  // 3. Save results
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const label = isToday ? 'today' : specificDate ? specificDate : daysBack > 0 ? `${daysBack}d` : 'random';
  const outputFile = join(RESULTS_DIR, `sample-${label}-${timestamp}.json`);
  writeFileSync(outputFile, JSON.stringify(allResults, null, 2));

  // Summary
  if (allResults.length === 0) {
    console.log('\nNo test points generated (conversations may have too few customer messages)');
    return;
  }

  const avgConf = (allResults.reduce((s, r) => s + r.confidenceScore, 0) / allResults.length * 100).toFixed(0);
  const avgTime = Math.round(allResults.reduce((s, r) => s + r.responseTimeMs, 0) / allResults.length);
  const withCtx = allResults.filter(r => r.hasCustomerContext).length;
  const withFn = allResults.filter(r => r.functionCalled).length;
  const mgmt = allResults.filter(r => r.needsManagement).length;

  console.log(`\n\n${'═'.repeat(66)}`);
  console.log('                        SAMPLE SUMMARY');
  console.log('═'.repeat(66));
  console.log(`  Samples tested:    ${allResults.length}`);
  console.log(`  Avg confidence:    ${avgConf}%`);
  console.log(`  Avg response time: ${avgTime}ms`);
  console.log(`  Customer context:  ${withCtx}/${allResults.length}`);
  console.log(`  Function calls:    ${withFn}/${allResults.length}`);
  console.log(`  Needs management:  ${mgmt}/${allResults.length}`);
  console.log(`\n  Results saved to: ${outputFile}`);
  console.log('═'.repeat(66));

  // Intent distribution
  const intentDist = new Map<string, number>();
  allResults.forEach(r => intentDist.set(r.intent, (intentDist.get(r.intent) || 0) + 1));
  console.log('\n  Intent distribution:');
  Array.from(intentDist.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([intent, count]) => {
      const bar = '█'.repeat(Math.round(count / allResults.length * 20));
      console.log(`    ${intent.padEnd(22)} ${bar} ${count}`);
    });
}

// ─── Review mode ─────────────────────────────────────────────────────────────

function reviewResults() {
  if (!existsSync(RESULTS_DIR)) {
    console.log('No sample results found. Run without --review first.');
    process.exit(0);
  }

  const files = readdirSync(RESULTS_DIR)
    .filter((f: string) => f.startsWith('sample-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No sample results found.');
    process.exit(0);
  }

  const latestFile = join(RESULTS_DIR, files[0]);
  console.log(`Reviewing: ${latestFile}\n`);

  const results: SampleResult[] = JSON.parse(readFileSync(latestFile, 'utf8'));

  console.log(`Total samples: ${results.length}\n`);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`${'─'.repeat(66)}`);
    console.log(`[${i + 1}] ${r.customerName || 'Unknown'} | ${r.intent} | Conf: ${(r.confidenceScore * 100).toFixed(0)}% | ${r.responseTimeMs}ms`);
    console.log(`  Customer: "${r.testPoint.customerMessage.substring(0, 100)}"`);
    if (r.testPoint.history.length > 0) {
      const lastHist = r.testPoint.history[r.testPoint.history.length - 1];
      console.log(`  Context: "${lastHist.content.substring(0, 80)}..." (${lastHist.senderType})`);
    }
    console.log(`  AI: ${r.aiResponse.replace(/\n/g, ' ').substring(0, 120)}`);
    if (r.testPoint.actualStaffResponse) {
      console.log(`  Staff: ${r.testPoint.actualStaffResponse.replace(/\n/g, ' ').substring(0, 120)}`);
    }
    if (r.functionCalled) console.log(`  Function: ${r.functionCalled}`);
    if (r.needsManagement) console.log(`  🚩 MANAGEMENT: ${r.managementNote || r.internalNote}`);
    console.log('');
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

if (isReview) {
  reviewResults();
} else {
  runSampling().catch(err => {
    console.error('Sampler crashed:', err);
    process.exit(2);
  });
}
