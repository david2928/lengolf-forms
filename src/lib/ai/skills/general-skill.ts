// General skill: fallback for unmatched intents (greetings, thanks, etc.)

import { Skill } from './types';

const ENGLISH_GENERAL = `GENERAL RESPONSES:
- Greetings → simple greeting back
- Gratitude after booking → "See you at [time]!" | after cancellation → "No problem" | general → "You're welcome!"
- Arrival notification → "Got it, see you soon!"
No function calls for these. No "Is there anything else I can help with?"`;

const THAI_GENERAL = `GENERAL RESPONSES:
- Greetings → "สวัสดีค่า" (first message) or skip (ongoing)
- Gratitude after booking → "แล้วเจอกัน [time] นะคะ" | after cancellation → "ไม่เป็นไรค่ะ" | general → "ยินดีค่ะ"
- Arrival → "ได้ค่ะ รอคุณนะคะ"
No function calls. No "ถ้ามีคำถามเพิ่มเติม"`;

export const generalSkill: Skill = {
  name: 'general',
  intents: ['greeting', 'general_inquiry', 'arrival_notification'],
  requiredContext: [],
  systemPrompt: ENGLISH_GENERAL,
  systemPromptByLanguage: {
    thai: THAI_GENERAL,
    english: ENGLISH_GENERAL
  }
};
