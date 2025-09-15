/**
 * Script to fix existing LINE messages with emoji placeholders
 *
 * This script processes existing messages in the database that contain "(emoji)" placeholders
 * and replaces them with actual Unicode emojis using the stored raw_event data.
 */

import { createClient } from '@supabase/supabase-js';
import { processLineMessage } from '../src/lib/line/emoji-processor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface LineMessage {
  id: string;
  message_text: string;
  raw_event: any;
}

async function fixEmojiMessages() {
  console.log('🔄 Starting emoji message fix...');

  try {
    // Find all messages with emoji placeholders
    const { data: messages, error } = await supabase
      .from('line_messages')
      .select('id, message_text, raw_event')
      .like('message_text', '%(emoji)%');

    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }

    if (!messages || messages.length === 0) {
      console.log('✅ No messages with emoji placeholders found');
      return;
    }

    console.log(`📝 Found ${messages.length} messages with emoji placeholders`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const message of messages as LineMessage[]) {
      try {
        // Process the emoji replacement
        const processedText = processLineMessage(message.message_text, message.raw_event);

        // Only update if the text actually changed
        if (processedText !== message.message_text) {
          const { error: updateError } = await supabase
            .from('line_messages')
            .update({ message_text: processedText })
            .eq('id', message.id);

          if (updateError) {
            console.error(`❌ Error updating message ${message.id}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Fixed message ${message.id}: "${message.message_text}" → "${processedText}"`);
            fixedCount++;
          }
        } else {
          console.log(`⏭️ No change needed for message ${message.id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error);
        errorCount++;
      }
    }

    // Also update conversation last_message_text if needed
    console.log('🔄 Updating conversation last message texts...');

    const { data: conversations, error: convError } = await supabase
      .from('line_conversations')
      .select('id, last_message_text')
      .like('last_message_text', '%(emoji)%');

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
    } else if (conversations && conversations.length > 0) {
      console.log(`📝 Found ${conversations.length} conversations with emoji placeholders in last message`);

      for (const conv of conversations) {
        // For conversations, we'll do a simple replacement since we don't have the raw event
        // This is a basic fix - you may want to fetch the actual message data for more accuracy
        const processedText = conv.last_message_text.replace(/\(emoji\)/g, '😊');

        const { error: updateError } = await supabase
          .from('line_conversations')
          .update({ last_message_text: processedText })
          .eq('id', conv.id);

        if (updateError) {
          console.error(`❌ Error updating conversation ${conv.id}:`, updateError);
        } else {
          console.log(`✅ Fixed conversation ${conv.id} last message`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Fixed: ${fixedCount} messages`);
    console.log(`❌ Errors: ${errorCount} messages`);
    console.log('🎉 Emoji fix complete!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  fixEmojiMessages();
}

export { fixEmojiMessages };