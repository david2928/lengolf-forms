/**
 * Prompt versioning for AI eval tracking.
 *
 * Reads prompt content from skill files, computes a SHA-256 hash,
 * and generates a version string combining date + git commit.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const SKILLS_DIR = join(process.cwd(), 'src', 'lib', 'ai', 'skills');

export interface PromptVersion {
  version: string;       // e.g. "v2026.03.01-a1b2c3d"
  hash: string;          // SHA-256 of concatenated prompt files
  gitCommitHash: string; // Short git SHA
  label: string | null;  // Optional human label
}

/**
 * Compute SHA-256 hash of all prompt/skill file contents concatenated.
 */
function computePromptHash(): string {
  const contents: string[] = [];

  // Auto-scan all .ts files in skills directory
  try {
    const skillFiles = readdirSync(SKILLS_DIR)
      .filter((f) => f.endsWith('.ts'))
      .sort(); // Sort for deterministic hash
    for (const file of skillFiles) {
      contents.push(readFileSync(join(SKILLS_DIR, file), 'utf8'));
    }
  } catch {
    // Skills dir may not exist
  }

  // Also include intent classifier and suggestion service
  const extraFiles = [
    join(process.cwd(), 'src', 'lib', 'ai', 'intent-classifier.ts'),
    join(process.cwd(), 'src', 'lib', 'ai', 'suggestion-service.ts'),
  ];
  for (const filepath of extraFiles) {
    try {
      contents.push(readFileSync(filepath, 'utf8'));
    } catch {
      // Skip if missing
    }
  }

  const combined = contents.join('\n---FILE-BOUNDARY---\n');
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Get the short git commit hash.
 */
function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Generate a prompt version object.
 * @param label Optional human-readable label (from CLI --label or env var)
 */
export function getPromptVersion(label?: string): PromptVersion {
  const hash = computePromptHash();
  const gitHash = getGitHash();
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const version = `v${dateStr}-${gitHash}`;

  const resolvedLabel = label || process.env.AI_EVAL_PROMPT_LABEL || null;

  return {
    version,
    hash,
    gitCommitHash: gitHash,
    label: resolvedLabel,
  };
}
