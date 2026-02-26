// Skill interface definitions for modular AI prompt architecture

export interface Skill {
  name: string;
  intents: string[];
  systemPrompt: string;
  /** Language-specific prompt overrides. When present, used instead of systemPrompt. */
  systemPromptByLanguage?: { thai: string; english: string };
  requiredContext: SkillContextRequirement[];
  examples?: SkillExample[];
}

export type SkillContextRequirement =
  | 'packages'
  | 'coaching_rates'
  | 'bay_pricing'
  | 'operating_hours'
  | 'customer_info'
  | 'upcoming_bookings'
  | 'recent_bookings';

export interface SkillExample {
  customerMessage: string;
  staffResponse: string;
  language: 'th' | 'en';
}
