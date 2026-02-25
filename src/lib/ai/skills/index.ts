// Skill registry and loader
// Selects appropriate skills based on detected intent and composes prompts

import { Skill } from './types';
import { coreSkill, getCorePromptForLanguage } from './core-skill';
import { bookingSkill } from './booking-skill';
import { pricingSkill } from './pricing-skill';
import { coachingSkill } from './coaching-skill';
import { facilitySkill } from './facility-skill';
import { generalSkill } from './general-skill';

// All available skills (excluding core, which is always loaded)
const SKILL_REGISTRY: Skill[] = [
  bookingSkill,
  pricingSkill,
  coachingSkill,
  facilitySkill,
  generalSkill,
];

/**
 * Get skills matching the detected intent.
 * Always includes core skill + matched skills.
 * Falls back to general skill if no specific match.
 */
export function getSkillsForIntent(intent: string): Skill[] {
  const matched = SKILL_REGISTRY.filter(skill =>
    skill.intents.includes(intent)
  );

  // Always include general skill as fallback if no specific match
  if (matched.length === 0) {
    return [coreSkill, generalSkill];
  }

  return [coreSkill, ...matched];
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

/**
 * Get few-shot examples from matched skills for the detected language.
 */
export function getSkillExamples(skills: Skill[], language: 'th' | 'en'): string {
  const examples: string[] = [];

  skills.forEach(skill => {
    if (!skill.examples) return;
    const langExamples = skill.examples.filter(ex => ex.language === language);
    langExamples.forEach(ex => {
      examples.push(`Customer: ${ex.customerMessage}\nStaff: ${ex.staffResponse}`);
    });
  });

  if (examples.length === 0) return '';

  return `\nSKILL EXAMPLES:\n${examples.slice(0, 3).join('\n\n')}\n`;
}

// Re-export types
export type { Skill } from './types';
export { coreSkill, getCorePromptForLanguage } from './core-skill';
