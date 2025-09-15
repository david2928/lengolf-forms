/**
 * LINE Emoji Processing Utilities
 *
 * LINE sends Unicode emojis as placeholder text "(emoji)" with separate emoji metadata.
 * This utility processes the emoji data to restore actual Unicode emoji characters.
 */

interface LineEmoji {
  index: number;
  length: number;
  emojiId: string;
  productId: string;
}

/**
 * Mapping of LINE emoji IDs to Unicode characters
 * This is a basic mapping - you may need to expand this based on actual LINE emoji IDs
 */
const LINE_EMOJI_MAP: Record<string, string> = {
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
export function processLineEmojis(text: string, emojis?: LineEmoji[]): string {
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
 * Extract emojis array from LINE webhook message event
 */
export function extractEmojisFromEvent(event: any): LineEmoji[] {
  return event?.message?.emojis || [];
}

/**
 * Process a LINE message to replace emoji placeholders
 */
export function processLineMessage(text: string, event: any): string {
  const emojis = extractEmojisFromEvent(event);
  return processLineEmojis(text, emojis);
}

/**
 * Check if a message contains LINE emoji placeholders
 */
export function containsEmojiPlaceholders(text: string): boolean {
  return text.includes('(emoji)');
}

/**
 * Log emoji processing for debugging
 */
export function logEmojiProcessing(originalText: string, processedText: string, emojis: LineEmoji[]): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Emoji Processing:', {
      original: originalText,
      processed: processedText,
      emojis: emojis,
      changed: originalText !== processedText
    });
  }
}