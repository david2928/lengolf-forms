/**
 * Client-side emoji processing utilities for LINE chat display
 *
 * These utilities help process existing messages that may still contain
 * emoji placeholders until the database is fully updated.
 */

/**
 * Simple client-side emoji replacement for messages that still contain placeholders
 * This is a fallback for existing messages until they're processed by the webhook handler
 */
export function processEmojiPlaceholders(text: string): string {
  if (!text) return text;

  // Replace common emoji placeholders with Unicode emojis
  // This is a simple fallback - the webhook handler does the proper processing
  return text
    .replace(/\(emoji\)/g, '😊')  // Default emoji replacement
    .replace(/\(heart\)/g, '❤️')  // Heart emoji
    .replace(/\(thumbs_up\)/g, '👍') // Thumbs up
    .replace(/\(thumbs_down\)/g, '👎') // Thumbs down
    .replace(/\(laugh\)/g, '😂')  // Laugh emoji
    .replace(/\(cry\)/g, '😢')    // Cry emoji
    .replace(/\(angry\)/g, '😠')  // Angry emoji
    .replace(/\(surprised\)/g, '😲') // Surprised emoji
    .replace(/\(wink\)/g, '😉')   // Wink emoji
    .replace(/\(cool\)/g, '😎')   // Cool emoji
    .replace(/\(love\)/g, '😍')   // Love emoji
    .replace(/\(kiss\)/g, '😘')   // Kiss emoji
    .replace(/\(thinking\)/g, '🤔') // Thinking emoji
    .replace(/\(party\)/g, '🎉')  // Party emoji
    .replace(/\(fire\)/g, '🔥')   // Fire emoji
    .replace(/\(star\)/g, '⭐')   // Star emoji
    .replace(/\(check\)/g, '✅')  // Check mark
    .replace(/\(cross\)/g, '❌')  // Cross mark
    .replace(/\(warning\)/g, '⚠️') // Warning
    .replace(/\(info\)/g, 'ℹ️')   // Info
    .replace(/\(question\)/g, '❓') // Question
    .replace(/\(exclamation\)/g, '❗') // Exclamation
    .replace(/\(clock\)/g, '🕐')  // Clock
    .replace(/\(calendar\)/g, '📅') // Calendar
    .replace(/\(phone\)/g, '📞')  // Phone
    .replace(/\(mail\)/g, '📧')   // Mail
    .replace(/\(money\)/g, '💰')  // Money
    .replace(/\(gift\)/g, '🎁')   // Gift
    .replace(/\(food\)/g, '🍕')   // Food
    .replace(/\(drink\)/g, '🥤')  // Drink
    .replace(/\(car\)/g, '🚗')    // Car
    .replace(/\(home\)/g, '🏠')   // Home
    .replace(/\(work\)/g, '💼')   // Work
    .replace(/\(music\)/g, '🎵')  // Music
    .replace(/\(sport\)/g, '⚽')  // Sport
    .replace(/\(game\)/g, '🎮')   // Game
    .replace(/\(book\)/g, '📚')   // Book
    .replace(/\(movie\)/g, '🎬')  // Movie
    .replace(/\(camera\)/g, '📷') // Camera
    .replace(/\(umbrella\)/g, '☂️') // Umbrella
    .replace(/\(sun\)/g, '☀️')    // Sun
    .replace(/\(rain\)/g, '🌧️')  // Rain
    .replace(/\(snow\)/g, '❄️')   // Snow
    .replace(/\(flower\)/g, '🌸') // Flower
    .replace(/\(tree\)/g, '🌳')   // Tree
    .replace(/\(mountain\)/g, '⛰️') // Mountain
    .replace(/\(ocean\)/g, '🌊')  // Ocean
    .replace(/\(moon\)/g, '🌙')   // Moon
    .replace(/\(rainbow\)/g, '🌈') // Rainbow;
}

/**
 * Check if text contains any emoji placeholders
 */
export function hasEmojiPlaceholders(text: string): boolean {
  if (!text) return false;
  return /\([a-zA-Z_]+\)/.test(text);
}

/**
 * Process message text for display, handling both existing placeholders and ensuring emojis display properly
 */
export function processMessageForDisplay(text: string): string {
  if (!text) return text;

  // First, process any remaining emoji placeholders
  const processedText = processEmojiPlaceholders(text);

  // Return the processed text
  return processedText;
}

/**
 * Enhanced message display with emoji processing
 * This is the main function to use in React components
 */
export function enhanceMessageDisplay(messageText: string | null | undefined): string {
  if (!messageText) return '';

  // Process the message for proper emoji display
  return processMessageForDisplay(messageText);
}

/**
 * Enhanced message display data for conversation previews
 * Returns both processed text and sticker information
 */
export interface MessagePreview {
  text: string;
  isSticker: boolean;
  stickerId?: string;
  packageId?: string;
  keywords?: string[];
}

/**
 * Create message preview data for conversation list
 */
export function createMessagePreview(
  messageText: string | null | undefined,
  messageType?: string,
  rawData?: any
): MessagePreview {
  if (!messageText && !messageType) {
    return { text: '', isSticker: false };
  }

  // Handle sticker messages
  if (messageType === 'sticker' && rawData) {
    return {
      text: rawData.keywords?.[0] || 'Sticker',
      isSticker: true,
      stickerId: rawData.stickerId,
      packageId: rawData.packageId,
      keywords: rawData.keywords || []
    };
  }

  // Handle other message types
  if (messageType === 'image') {
    return { text: '📷 Image', isSticker: false };
  }

  if (messageType === 'video') {
    return { text: '🎥 Video', isSticker: false };
  }

  if (messageType === 'audio') {
    return { text: '🎵 Audio', isSticker: false };
  }

  if (messageType === 'file') {
    return { text: '📎 File', isSticker: false };
  }

  // Handle text messages (including emojis)
  return {
    text: enhanceMessageDisplay(messageText),
    isSticker: false
  };
}