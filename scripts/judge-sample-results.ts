#!/usr/bin/env npx tsx
/**
 * LLM-as-Judge scoring for AI suggestion sample results.
 *
 * Reads existing sample JSON files and scores each AI response
 * using GPT-4o-mini across 4 quality dimensions.
 *
 * Usage:
 *   npx tsx scripts/judge-sample-results.ts                    # Judge most recent sample file
 *   npx tsx scripts/judge-sample-results.ts --file <name>.json # Judge a specific file
 *   npx tsx scripts/judge-sample-results.ts --rejudge          # Re-judge (overwrite existing scores)
 *   npx tsx scripts/judge-sample-results.ts --all              # Judge all unjudged sample files
 *   npx tsx scripts/judge-sample-results.ts --persist          # Persist results to Supabase ai_eval schema
 *   npx tsx scripts/judge-sample-results.ts --persist --label "v2 prompt"  # Persist with label
 *
 * Prerequisites:
 *   - OPENAI_API_KEY set in .env.local or environment
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') }); // fallback

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { judgeAllSamples, JudgeableSample } from './lib/judge';
import { aggregateScores, printSummary, saveSummary, detectRegression } from './lib/judge-aggregator';
import { getPromptVersion } from './lib/prompt-version';
import { createEvalRun, insertEvalSamples, updateRunAggregates, finalizeRun, toSampleForInsert } from './lib/eval-persistence';

const RESULTS_DIR = join(process.cwd(), 'scripts', 'e2e-samples');

// ─── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const rejudge = args.includes('--rejudge');
const judgeAll = args.includes('--all');
const isPersist = args.includes('--persist');

function getArg(name: string): string | null {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

const specificFile = getArg('file');
const persistLabel = getArg('label');

// ─── Find target files ──────────────────────────────────────────────────────

function findSampleFiles(): string[] {
  if (!existsSync(RESULTS_DIR)) {
    console.error(`No results directory found: ${RESULTS_DIR}`);
    process.exit(1);
  }

  const allFiles = readdirSync(RESULTS_DIR)
    .filter((f: string) => f.startsWith('sample-') && f.endsWith('.json'))
    .sort();

  if (allFiles.length === 0) {
    console.error('No sample files found. Run the sampler first.');
    process.exit(1);
  }

  if (specificFile) {
    const match = allFiles.find((f: string) => f === specificFile || f.includes(specificFile));
    if (!match) {
      console.error(`File not found: ${specificFile}`);
      console.error('Available files:', allFiles.join('\n  '));
      process.exit(1);
    }
    return [match];
  }

  if (judgeAll) {
    return allFiles;
  }

  // Default: most recent file
  return [allFiles[allFiles.length - 1]];
}

// ─── Judge a single file ─────────────────────────────────────────────────────

async function judgeFile(filename: string): Promise<JudgeableSample[]> {
  const filepath = join(RESULTS_DIR, filename);
  console.log(`\nJudging: ${filename}`);

  const samples: JudgeableSample[] = JSON.parse(readFileSync(filepath, 'utf8'));
  console.log(`  ${samples.length} samples loaded`);

  // Count how many need judging
  const needsJudging = samples.filter((s) => {
    if (!s.testPoint.actualStaffResponse) return false;
    if (!rejudge && s.judgeScores) return false;
    return true;
  });

  if (needsJudging.length === 0) {
    console.log('  All samples already judged (use --rejudge to re-score)');
    return samples;
  }

  console.log(`  ${needsJudging.length} samples to judge\n`);

  // Run judge
  const scoreMap = await judgeAllSamples(samples, { skipJudged: !rejudge });

  // Write scores back inline
  scoreMap.forEach((scores, index) => {
    if (scores) {
      samples[index].judgeScores = scores;
    }
  });

  // Save updated file
  writeFileSync(filepath, JSON.stringify(samples, null, 2));
  console.log(`\n  Scores written to: ${filename}`);

  return samples;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== LLM-as-Judge: AI Suggestion Scorer ===\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY. Set in .env.local or environment.');
    process.exit(1);
  }

  const files = findSampleFiles();
  console.log(`Files to judge: ${files.length}`);

  let allSamples: JudgeableSample[] = [];

  for (const file of files) {
    const judgedSamples = await judgeFile(file);
    allSamples = allSamples.concat(judgedSamples);
  }

  // Aggregate and print summary
  const summary = aggregateScores(allSamples);
  printSummary(summary);

  // Regression detection (before saving so it doesn't compare against itself)
  const regression = detectRegression(summary, RESULTS_DIR);

  // Save summary
  const summaryPath = saveSummary(summary, RESULTS_DIR);
  console.log(`\nSummary saved to: ${summaryPath}`);

  // Persist to DB if --persist flag set
  if (isPersist && allSamples.length > 0) {
    console.log('\nPersisting to Supabase...');
    try {
      const promptVersion = getPromptVersion(persistLabel || undefined);
      console.log(`  Prompt version: ${promptVersion.version}`);

      const runId = await createEvalRun({
        promptVersion,
        triggerType: 'manual',
        sampleCountRequested: allSamples.length,
        judgeModel: 'gpt-4o-mini',
      });

      const samplesToInsert = allSamples.map((s) => toSampleForInsert(s as JudgeableSample & { responseTimeMs: number; intentSource: string }));
      const inserted = await insertEvalSamples(runId, samplesToInsert);
      console.log(`  Inserted ${inserted} samples`);

      await updateRunAggregates(runId);
      await finalizeRun(runId, 'completed');
      console.log(`  Run finalized: ${runId}`);
    } catch (err) {
      console.error(`  Persistence failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (regression.hasRegression) {
    console.log('\n!!! REGRESSION DETECTED !!!');
    regression.details.forEach((d) => console.log(`  ${d}`));
  } else if (regression.details.length > 0 && regression.details[0] !== 'No previous summaries found') {
    console.log('\nComparison with previous run:');
    regression.details.forEach((d) => console.log(`  ${d}`));
  }
}

main().catch((err) => {
  console.error('Judge script crashed:', err);
  process.exit(2);
});
