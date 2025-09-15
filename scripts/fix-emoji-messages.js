/**
 * Script to fix existing LINE messages with emoji placeholders
 *
 * This script processes existing messages in the database that contain "(emoji)" placeholders
 * and replaces them with actual Unicode emojis using the stored raw_event data.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Mapping of LINE emoji IDs to Unicode characters
 */
const LINE_EMOJI_MAP = {
  // Basic emotions
  '001': '😀', // grinning face
  '002': '😃', // grinning face with big eyes
  '003': '😄', // grinning face with smiling eyes
  '004': '😁', // beaming face with smiling eyes
  '005': '😆', // grinning squinting face
  '006': '😅', // grinning face with sweat
  '007': '🤣', // rolling on the floor laughing
  '008': '😂', // face with tears of joy
  '009': '🙂', // slightly smiling face
  '010': '🙃', // upside-down face
  '011': '😉', // winking face
  '012': '😊', // smiling face with smiling eyes
  '013': '😇', // smiling face with halo
  '014': '🥰', // smiling face with hearts
  '015': '😍', // smiling face with heart-eyes
  '016': '🤩', // star-struck
  '017': '😘', // face blowing a kiss
  '018': '😗', // kissing face
  '019': '☺️', // smiling face
  '020': '😚', // kissing face with closed eyes
  '021': '😙', // kissing face with smiling eyes
  '022': '🥲', // smiling face with tear
  '023': '😋', // face savoring food
  '024': '😛', // face with tongue
  '025': '😜', // winking face with tongue
  '026': '🤪', // zany face
  '027': '😝', // squinting face with tongue
  '028': '🤑', // money-mouth face
  '029': '🤗', // hugging face
  '030': '🤭', // face with hand over mouth

  // Negative emotions
  '031': '🤫', // shushing face
  '032': '🤔', // thinking face
  '033': '🤐', // zipper-mouth face
  '034': '🤨', // face with raised eyebrow
  '035': '😐', // neutral face
  '036': '😑', // expressionless face
  '037': '😶', // face without mouth
  '038': '😏', // smirking face
  '039': '😒', // unamused face
  '040': '🙄', // face with rolling eyes
  '041': '😬', // grimacing face
  '042': '🤥', // lying face
  '043': '😔', // pensive face
  '044': '😪', // sleepy face
  '045': '🤤', // drooling face
  '046': '😴', // sleeping face
  '047': '😷', // face with medical mask
  '048': '🤒', // face with thermometer
  '049': '🤕', // face with head-bandage
  '050': '🤢', // nauseated face

  // Common symbols and objects
  '100': '❤️', // red heart
  '101': '🧡', // orange heart
  '102': '💛', // yellow heart
  '103': '💚', // green heart
  '104': '💙', // blue heart
  '105': '💜', // purple heart
  '106': '🖤', // black heart
  '107': '🤍', // white heart
  '108': '🤎', // brown heart
  '109': '💔', // broken heart
  '110': '❣️', // heart exclamation
  '111': '💕', // two hearts
  '112': '💞', // revolving hearts
  '113': '💓', // beating heart
  '114': '💗', // growing heart
  '115': '💖', // sparkling heart
  '116': '💘', // heart with arrow
  '117': '💝', // heart with ribbon
  '118': '💟', // heart decoration

  // Hands and gestures
  '200': '👍', // thumbs up
  '201': '👎', // thumbs down
  '202': '👌', // OK hand
  '203': '🤌', // pinched fingers
  '204': '🤏', // pinching hand
  '205': '✌️', // victory hand
  '206': '🤞', // crossed fingers
  '207': '🤟', // love-you gesture
  '208': '🤘', // sign of the horns
  '209': '🤙', // call me hand
  '210': '👈', // backhand index pointing left
  '211': '👉', // backhand index pointing right
  '212': '👆', // backhand index pointing up
  '213': '🖕', // middle finger
  '214': '👇', // backhand index pointing down
  '215': '☝️', // index pointing up
  '216': '👋', // waving hand
  '217': '🤚', // raised back of hand
  '218': '🖐️', // raised hand with fingers splayed
  '219': '✋', // raised hand
  '220': '🖖', // vulcan salute
  '221': '👏', // clapping hands
  '222': '🙌', // raising hands
  '223': '🤝', // handshake
  '224': '🙏', // folded hands

  // Default fallback for unknown emojis
  'default': '😊'
};

/**
 * Process LINE message text to replace emoji placeholders with actual Unicode emojis
 */
function processLineEmojis(text, emojis = []) {
  if (!emojis || emojis.length === 0) {
    return text;
  }

  // Sort emojis by index in descending order to avoid index shifting when replacing
  const sortedEmojis = [...emojis].sort((a, b) => b.index - a.index);

  let processedText = text;

  for (const emoji of sortedEmojis) {
    const { index, length, emojiId } = emoji;

    // Get the Unicode emoji for this ID
    const unicodeEmoji = LINE_EMOJI_MAP[emojiId] || LINE_EMOJI_MAP['default'];

    // Replace the placeholder text at the specified position
    const before = processedText.substring(0, index);
    const after = processedText.substring(index + length);
    processedText = before + unicodeEmoji + after;
  }

  return processedText;
}

/**
 * Process a LINE message to replace emoji placeholders
 */
function processLineMessage(text, event) {
  const emojis = event?.message?.emojis || [];
  return processLineEmojis(text, emojis);
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

    for (const message of messages) {
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

// Run the script
fixEmojiMessages();