/**
 * Aggregation, summary printing, and regression detection for judge scores.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { JudgeScores, JudgeableSample, DIMENSION_WEIGHTS } from './judge';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DimensionStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  count: number;
}

interface IntentBreakdown {
  intent: string;
  count: number;
  overallMean: number;
}

export interface JudgeSummary {
  timestamp: string;
  totalSamples: number;
  judgedSamples: number;
  skippedNoStaff: number;
  dimensions: {
    appropriateness: DimensionStats;
    helpfulness: DimensionStats;
    toneMatch: DimensionStats;
    brevity: DimensionStats;
    functionAlignment: DimensionStats;
    overall: DimensionStats;
  };
  byIntent: IntentBreakdown[];
  scoreDistribution: Record<string, number>; // e.g. "1": 2, "2": 5, ...
}

// ─── Stats helpers ───────────────────────────────────────────────────────────

function computeStats(values: number[]): DimensionStats {
  if (values.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = Math.round((sum / values.length) * 100) / 100;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
    : sorted[mid];
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

  return {
    mean,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev,
    count: values.length,
  };
}

// ─── Aggregate scores ────────────────────────────────────────────────────────

export function aggregateScores(samples: JudgeableSample[]): JudgeSummary {
  const judged = samples.filter((s) => s.judgeScores != null);
  const skippedNoStaff = samples.filter((s) => !s.testPoint.actualStaffResponse).length;

  const appropriateness: number[] = [];
  const helpfulness: number[] = [];
  const toneMatch: number[] = [];
  const brevity: number[] = [];
  const functionAlignment: number[] = [];
  const overall: number[] = [];

  // Score distribution for overall (rounded to nearest integer)
  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  // By-intent tracking
  const intentMap = new Map<string, number[]>();

  judged.forEach((s) => {
    const js = s.judgeScores!;
    appropriateness.push(js.appropriateness.score);
    helpfulness.push(js.helpfulness.score);
    toneMatch.push(js.toneMatch.score);
    brevity.push(js.brevity.score);
    functionAlignment.push(js.functionAlignment.score);
    overall.push(js.overallScore);

    const bucket = String(Math.max(1, Math.min(5, Math.round(js.overallScore))));
    distribution[bucket] = (distribution[bucket] || 0) + 1;

    const intent = s.intent || 'unknown';
    const existing = intentMap.get(intent);
    if (existing) {
      existing.push(js.overallScore);
    } else {
      intentMap.set(intent, [js.overallScore]);
    }
  });

  // Build by-intent breakdown
  const byIntent: IntentBreakdown[] = [];
  intentMap.forEach((scores, intent) => {
    const mean = Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10;
    byIntent.push({ intent, count: scores.length, overallMean: mean });
  });
  byIntent.sort((a, b) => b.count - a.count);

  return {
    timestamp: new Date().toISOString(),
    totalSamples: samples.length,
    judgedSamples: judged.length,
    skippedNoStaff,
    dimensions: {
      appropriateness: computeStats(appropriateness),
      helpfulness: computeStats(helpfulness),
      toneMatch: computeStats(toneMatch),
      brevity: computeStats(brevity),
      functionAlignment: computeStats(functionAlignment),
      overall: computeStats(overall),
    },
    byIntent,
    scoreDistribution: distribution,
  };
}

// ─── Console output ──────────────────────────────────────────────────────────

export function printSummary(summary: JudgeSummary): void {
  console.log('\n=== JUDGE SUMMARY ===');
  console.log(`Samples: ${summary.judgedSamples} judged (${summary.skippedNoStaff} skipped - no staff response)\n`);

  // Dimension table
  const header = 'Dimension'.padEnd(20) + 'Mean'.padStart(6) + 'Med'.padStart(6) +
    'Min'.padStart(6) + 'Max'.padStart(6) + 'StdDev'.padStart(8);
  console.log(header);
  console.log('-'.repeat(header.length));

  const dims: Array<{ label: string; key: keyof typeof summary.dimensions }> = [
    { label: 'Appropriateness', key: 'appropriateness' },
    { label: 'Helpfulness', key: 'helpfulness' },
    { label: 'Tone Match', key: 'toneMatch' },
    { label: 'Brevity', key: 'brevity' },
    { label: 'Func Alignment', key: 'functionAlignment' },
    { label: 'Overall', key: 'overall' },
  ];

  dims.forEach(({ label, key }) => {
    const s = summary.dimensions[key];
    const row = label.padEnd(20) +
      String(s.mean).padStart(6) +
      String(s.median).padStart(6) +
      String(s.min).padStart(6) +
      String(s.max).padStart(6) +
      String(s.stdDev).padStart(8);
    console.log(row);
  });

  // Score distribution
  console.log('\nScore Distribution (Overall):');
  const total = summary.judgedSamples || 1;
  for (let i = 1; i <= 5; i++) {
    const count = summary.scoreDistribution[String(i)] || 0;
    const barLen = Math.round((count / total) * 30);
    const bar = '#'.repeat(barLen);
    console.log(`  ${i}: ${bar} ${count}`);
  }

  // By intent
  if (summary.byIntent.length > 0) {
    const overallMean = summary.dimensions.overall.mean;
    console.log('\nBy Intent:');
    summary.byIntent.forEach((ib) => {
      const flag = ib.overallMean < overallMean - 0.5 ? '  <-- Below average' : '';
      console.log(`  ${ib.intent.padEnd(24)} (${ib.count})  Overall: ${ib.overallMean}${flag}`);
    });
  }
}

// ─── Regression detection ────────────────────────────────────────────────────

export function detectRegression(
  current: JudgeSummary,
  resultsDir: string,
): { hasRegression: boolean; details: string[] } {
  const details: string[] = [];

  // Find most recent previous summary
  if (!existsSync(resultsDir)) {
    return { hasRegression: false, details: ['No previous summaries found'] };
  }

  const summaryFiles = readdirSync(resultsDir)
    .filter((f: string) => f.startsWith('judge-summary-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (summaryFiles.length === 0) {
    return { hasRegression: false, details: ['No previous summaries found'] };
  }

  const previousPath = join(resultsDir, summaryFiles[0]);
  let previous: JudgeSummary;
  try {
    previous = JSON.parse(readFileSync(previousPath, 'utf8'));
  } catch {
    return { hasRegression: false, details: ['Could not parse previous summary'] };
  }

  let hasRegression = false;
  const threshold = 0.5;

  const dimKeys: Array<keyof typeof current.dimensions> = [
    'appropriateness', 'helpfulness', 'toneMatch', 'brevity', 'overall',
  ];

  dimKeys.forEach((key) => {
    const curr = current.dimensions[key].mean;
    const prev = previous.dimensions[key].mean;
    const diff = Math.round((curr - prev) * 100) / 100;

    if (diff < -threshold) {
      hasRegression = true;
      details.push(`${key}: ${prev} -> ${curr} (${diff > 0 ? '+' : ''}${diff}) REGRESSION`);
    } else if (Math.abs(diff) > 0.01) {
      details.push(`${key}: ${prev} -> ${curr} (${diff > 0 ? '+' : ''}${diff})`);
    }
  });

  return { hasRegression, details };
}

// ─── Save summary ────────────────────────────────────────────────────────────

export function saveSummary(summary: JudgeSummary, dir: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `judge-summary-${timestamp}.json`;
  const filepath = join(dir, filename);
  writeFileSync(filepath, JSON.stringify(summary, null, 2));
  return filepath;
}
