// Skill registry and loader
// Selects appropriate skills based on detected intent and composes prompts

import { Skill } from './types';
import { coreSkill, getCorePromptForLanguage } from './core-skill';
import { bookingSkill } from './booking-skill';
import { pricingSkill } from './pricing-skill';
import { coachingSkill } from './coaching-skill';
import { facilitySkill } from './facility-skill';
import { clubRentalSkill } from './club-rental-skill';
import { generalSkill } from './general-skill';

// All available skills (excluding core, which is always loaded)
const SKILL_REGISTRY: Skill[] = [
  bookingSkill,
  pricingSkill,
  coachingSkill,
  facilitySkill,
  clubRentalSkill,
  generalSkill,
];

/**
 * Get all skills for the prompt.
 * All skills are always loaded — the model decides what's relevant,
 * same as the tool selection redesign (all tools available every turn).
 * Intent parameter kept for backward compatibility (debug context logging).
 */
export function getSkillsForIntent(_intent: string): Skill[] {
  return [coreSkill, ...SKILL_REGISTRY];
}

/**
 * Compose a combined system prompt from multiple skills.
 * Core prompt goes first, then matched skill prompts joined with separators.
 */
export function composeSkillPrompt(skills: Skill[]): string {
  return skills
    .map(skill => skill.systemPrompt)
    .join('\n\n---\n\n');
}

/**
 * Compose a language-aware system prompt.
 * Replaces the core skill's generic prompt with a language-specific version
 * to avoid sending Thai rules for English messages and vice versa.
 */
export function composeSkillPromptForLanguage(skills: Skill[], language: 'thai' | 'english'): string {
  return skills
    .map(skill => {
      // Replace core skill prompt with language-specific version
      if (skill.name === 'core') {
        return getCorePromptForLanguage(language);
      }
      // Use language-specific prompt if available
      if (skill.systemPromptByLanguage) {
        return skill.systemPromptByLanguage[language];
      }
      return skill.systemPrompt;
    })
    .join('\n\n---\n\n');
}

/**
 * Get all required context types from matched skills.
 * Used to determine which business data to fetch.
 */
export function getRequiredContext(skills: Skill[]): string[] {
  const contextSet = new Set<string>();
  skills.forEach(skill => {
    skill.requiredContext.forEach(ctx => contextSet.add(ctx));
  });
  return Array.from(contextSet);
}

// Re-export types
export type { Skill } from './types';
export { coreSkill, getCorePromptForLanguage } from './core-skill';
