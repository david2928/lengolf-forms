#!/usr/bin/env node
/**
 * Sales Bot Send Utility
 *
 * Sends LINE messages with proper UTF-8 encoding for sales follow-ups.
 * Includes pre-send validation, duplicate prevention, and logging.
 *
 * Usage:
 *   node scripts/sales-bot-send.mjs                    # Interactive: reads from stdin JSON
 *   node scripts/sales-bot-send.mjs --file messages.json  # From file
 *
 * Message format (JSON array):
 *   [{ "conversationId": "...", "name": "...", "message": "...", "type": "text" }]
 *
 * Can also be imported as a module:
 *   import { sendFollowUpMessage, sendFollowUpBatch } from './scripts/sales-bot-send.mjs';
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Track sent messages to prevent duplicates within a session
const sentMessages = new Set();

/**
 * Get a dev authentication token
 */
async function getToken() {
  const res = await fetch(`${BASE_URL}/api/dev-token`);
  if (!res.ok) throw new Error(`Failed to get token: ${res.status}`);
  const data = await res.json();
  return data.token;
}

/**
 * Validate message content before sending
 * Returns { valid: boolean, issues: string[] }
 */
function validateMessage(message, name) {
  const issues = [];

  if (!message || !message.trim()) {
    issues.push('Message is empty');
  }

  // Check for encoding issues (question marks that shouldn't be there)
  const suspiciousPattern = /\?{3,}/;
  if (suspiciousPattern.test(message)) {
    issues.push('Message contains suspicious ??? pattern — possible encoding corruption');
  }

  // Check message length (LINE limit is 5000 chars)
  if (message.length > 5000) {
    issues.push(`Message too long: ${message.length} chars (LINE limit: 5000)`);
  }

  // Verify Thai text renders correctly by checking Unicode ranges
  const hasThai = /[\u0E00-\u0E7F]/.test(message);
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(message);

  if (hasThai) {
    // Verify the Thai characters are actual Thai, not replacement chars
    const replacementChars = (message.match(/\uFFFD/g) || []).length;
    if (replacementChars > 0) {
      issues.push(`Message contains ${replacementChars} replacement characters — encoding is broken`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    metadata: { hasThai, hasEmoji, length: message.length }
  };
}

/**
 * Generate a dedup key for a message
 */
function dedupKey(conversationId, message) {
  // Use first 100 chars of message + conversation ID
  return `${conversationId}:${message.substring(0, 100)}`;
}

/**
 * Send a single follow-up message
 * Returns { success, messageId, error, preview }
 */
export async function sendFollowUpMessage(token, { conversationId, name, message, type = 'text', senderName = 'LENGOLF', flexContents = null, lineUserId = null }) {
  // Duplicate check
  const key = dedupKey(conversationId, message);
  if (sentMessages.has(key)) {
    return { success: false, error: 'DUPLICATE: Message already sent in this session', name };
  }

  // Validate
  const validation = validateMessage(message, name);
  if (!validation.valid) {
    return { success: false, error: `VALIDATION FAILED: ${validation.issues.join('; ')}`, name };
  }

  try {
    let data;

    if (type === 'flex' && flexContents) {
      // Flex messages use /api/line/send-message with userId (LINE user ID)
      if (!lineUserId) {
        return { success: false, error: 'lineUserId is required for flex messages', name };
      }

      const res = await fetch(`${BASE_URL}/api/line/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          userId: lineUserId,
          type: 'flex',
          flexMessage: {
            altText: message, // message field serves as altText for flex
            contents: flexContents
          }
        })
      });
      data = await res.json();
      // Normalize response shape
      if (data.success && !data.message) {
        data.message = { id: data.messageId, text: `[Flex] ${message}` };
      }
    } else {
      // Text messages use /api/line/conversations/{id}/messages
      const res = await fetch(`${BASE_URL}/api/line/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          message,
          type: 'text',
          senderName
        })
      });
      data = await res.json();
    }

    if (data.success) {
      // Mark as sent to prevent duplicates
      sentMessages.add(key);

      // Verify the response text matches what we sent (encoding check)
      const responseText = data.message?.text || '';
      const hasCorrruption = /\?{3,}/.test(responseText);
      if (hasCorrruption) {
        return {
          success: true,
          warning: 'MESSAGE SENT BUT ENCODING MAY BE CORRUPTED — check LINE app',
          messageId: data.message?.id,
          name,
          preview: responseText.substring(0, 80)
        };
      }

      return {
        success: true,
        messageId: data.message?.id,
        name,
        preview: responseText.substring(0, 80)
      };
    } else {
      return { success: false, error: data.error, name };
    }
  } catch (err) {
    return { success: false, error: err.message, name };
  }
}

/**
 * Send a batch of follow-up messages
 * Returns array of results
 */
export async function sendFollowUpBatch(messages) {
  const token = await getToken();
  const results = [];

  for (const msg of messages) {
    const result = await sendFollowUpMessage(token, msg);
    results.push(result);

    // Small delay between messages to avoid rate limiting
    if (messages.indexOf(msg) < messages.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

/**
 * Print results summary
 */
function printResults(results) {
  console.log('\n' + '='.repeat(50));
  console.log('Sales Bot Send Results');
  console.log('='.repeat(50));

  let sent = 0, failed = 0;

  for (const r of results) {
    if (r.success) {
      sent++;
      const icon = r.warning ? '⚠️' : '✅';
      console.log(`${icon} ${r.name}: Sent (${r.messageId?.substring(0, 8)}...)`);
      console.log(`   ${r.preview}...`);
      if (r.warning) console.log(`   WARNING: ${r.warning}`);
    } else {
      failed++;
      console.log(`❌ ${r.name}: ${r.error}`);
    }
  }

  console.log('='.repeat(50));
  console.log(`Sent: ${sent} | Failed: ${failed} | Total: ${results.length}`);
  console.log('='.repeat(50));
}

// CLI mode
const isMainModule = process.argv[1]?.endsWith('sales-bot-send.mjs');
if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
Sales Bot Send Utility

Usage:
  echo '[{...}]' | node scripts/sales-bot-send.mjs
  node scripts/sales-bot-send.mjs --file messages.json

Message format:
  [{ "conversationId": "uuid", "name": "Customer", "message": "Hello!", "type": "text" }]

Options:
  --file <path>   Read messages from JSON file
  --dry-run       Validate messages without sending
  --help          Show this help
`);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const fileIdx = args.indexOf('--file');

  let messages;

  if (fileIdx !== -1 && args[fileIdx + 1]) {
    const { readFileSync } = await import('fs');
    messages = JSON.parse(readFileSync(args[fileIdx + 1], 'utf-8'));
  } else {
    // Read from stdin
    let input = '';
    process.stdin.setEncoding('utf-8');
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    messages = JSON.parse(input);
  }

  if (!Array.isArray(messages)) {
    messages = [messages];
  }

  console.log(`\nProcessing ${messages.length} message(s)...`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN — validating only, not sending\n');
    for (const msg of messages) {
      const v = validateMessage(msg.message, msg.name);
      const icon = v.valid ? '✅' : '❌';
      console.log(`${icon} ${msg.name}: ${v.valid ? 'Valid' : v.issues.join('; ')}`);
      console.log(`   Thai: ${v.metadata.hasThai} | Emoji: ${v.metadata.hasEmoji} | Length: ${v.metadata.length}`);
    }
  } else {
    const results = await sendFollowUpBatch(messages);
    printResults(results);
  }
}
