#!/usr/bin/env node
/**
 * Development server with automatic log file output
 * Runs next dev and pipes all output to both console AND dev.log
 * This allows Claude Code CLI to read logs via: cat dev.log
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log file path (in project root)
const logFile = path.join(__dirname, '..', 'dev.log');

// Clear previous log file
fs.writeFileSync(logFile, `=== Dev server started at ${new Date().toISOString()} ===\n\n`);

// Create write stream for appending
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

console.log(`📝 Logging to: ${logFile}`);
console.log(`💡 Claude Code can read logs with: cat dev.log\n`);

// Remove .env.local if exists (matching original dev script behavior)
try {
  fs.unlinkSync(path.join(__dirname, '..', '.env.local'));
} catch (e) {
  // Ignore if doesn't exist
}

// Spawn next dev
const nextDev = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
  cwd: path.join(__dirname, '..'),
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});

// Pipe stdout to both console and file
nextDev.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  logStream.write(text);
});

// Pipe stderr to both console and file
nextDev.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  logStream.write(text);
});

// Handle process exit
nextDev.on('close', (code) => {
  const exitMsg = `\n=== Dev server exited with code ${code} at ${new Date().toISOString()} ===\n`;
  console.log(exitMsg);
  logStream.write(exitMsg);
  logStream.end();
  process.exit(code);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down dev server...');
  nextDev.kill('SIGINT');
});
