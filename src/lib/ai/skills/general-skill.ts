// General skill: fallback for unmatched intents (greetings, thanks, etc.)

import { Skill } from './types';

const ENGLISH_GENERAL = `GENERAL RESPONSES:
For greetings, thanks, arrival notifications, and other non-specific messages:

1. Greetings → Simple greeting back ("Hello!" or "Hi there!")
2. Gratitude → Contextual response
   - After booking: "See you at [time]!"
   - After cancellation: "No problem, let us know if you'd like to rebook"
   - General: "You're welcome!"
3. Arrival notification → "Got it, see you soon!"

DO NOT call any functions for these messages.
DO NOT ask "Is there anything else I can help with?"`;

const THAI_GENERAL = `GENERAL RESPONSES:
For greetings, thanks, arrival notifications, and other non-specific messages:

1. Greetings → "สวัสดีค่า" (first message) or skip greeting (ongoing)
2. Gratitude → Contextual response
   - After booking: "แล้วเจอกัน [time] นะคะ"
   - After cancellation: "ไม่เป็นไรค่ะ"
   - General: "ยินดีค่ะ"
3. Arrival notification → "ได้ค่ะ รอคุณนะคะ"

DO NOT call any functions for these messages.
DO NOT ask "ถ้ามีคำถามเพิ่มเติม" or offer extra help.`;

export const generalSkill: Skill = {
  name: 'general',
  intents: ['greeting', 'general_inquiry', 'arrival_notification'],
  requiredContext: [],
  systemPrompt: ENGLISH_GENERAL,
  systemPromptByLanguage: {
    thai: THAI_GENERAL,
    english: ENGLISH_GENERAL
  },
  examples: [
    {
      customerMessage: 'สวัสดีค่ะ',
      staffResponse: 'สวัสดีค่า',
      language: 'th'
    },
    {
      customerMessage: 'ขอบคุณครับ',
      staffResponse: 'ยินดีค่ะ',
      language: 'th'
    },
    {
      customerMessage: 'Thank you!',
      staffResponse: "You're welcome! See you soon!",
      language: 'en'
    }
  ]
};
