# Claude Code CLI - Dev Server Log Access

Enable Claude Code CLI to read your Next.js dev server logs in real-time.

## The Problem

When running Claude Code in a CLI terminal, it cannot access logs from a separate terminal running `npm run dev`. This makes debugging runtime errors difficult since Claude can't see what's happening in your dev server.

## The Solution

Pipe dev server output to a log file that Claude Code CLI can read.

```
┌─────────────────────────────────────────────────┐
│  npm run dev                                    │
│                                                 │
│  ┌─────────────┐     ┌─────────────────────┐   │
│  │ Next.js     │ ──► │ Console (you see)   │   │
│  │ Dev Server  │     └─────────────────────┘   │
│  │             │     ┌─────────────────────┐   │
│  │             │ ──► │ dev.log (Claude     │   │
│  └─────────────┘     │ CLI can read)       │   │
│                      └─────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Setup

### 1. Create the logging script

Create `scripts/dev-with-logs.js`:

```javascript
#!/usr/bin/env node
/**
 * Development server with automatic log file output
 * Runs next dev and pipes all output to both console AND dev.log
 * This allows Claude Code CLI to read logs via: cat dev.log
 *
 * Features:
 * - Console output: colored (for nice terminal display)
 * - Log file output: clean (no ANSI codes) with timestamps
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log file path (in project root)
const logFile = path.join(__dirname, '..', 'dev.log');

// Strip ANSI escape codes for clean log file output
const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

// Get timestamp for log entries
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
};

// Add timestamp to each line (skip empty lines)
const addTimestamps = (text) => {
  return text.split('\n').map((line, idx, arr) => {
    if (idx === arr.length - 1 && line === '') return '';
    if (line.trim() === '') return line;
    return `[${getTimestamp()}] ${line}`;
  }).join('\n');
};

// Clear previous log file
fs.writeFileSync(logFile, `=== Dev server started at ${new Date().toISOString()} ===\n\n`);

// Create write stream for appending
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

console.log(`📝 Logging to: ${logFile}`);
console.log(`💡 Claude Code can read logs with: cat dev.log\n`);

// Remove .env.local if exists (optional - for your specific setup)
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

// Pipe stdout to both console (with colors) and file (clean, with timestamps)
nextDev.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  const cleanText = addTimestamps(stripAnsi(text));
  if (cleanText) logStream.write(cleanText + '\n');
});

// Pipe stderr to both console (with colors) and file (clean, with timestamps)
nextDev.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  const cleanText = addTimestamps(stripAnsi(text));
  if (cleanText) logStream.write(cleanText + '\n');
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
```

### 2. Update package.json

```json
{
  "scripts": {
    "dev": "node scripts/dev-with-logs.js",
    "dev:nolog": "next dev -H 0.0.0.0"
  }
}
```

### 3. Add to .gitignore

```
# debug
dev.log
```

## Usage

### Start the dev server

```bash
npm run dev
```

You'll see:
```
📝 Logging to: /path/to/project/dev.log
💡 Claude Code can read logs with: cat dev.log

▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Network:      http://0.0.0.0:3000
```

### Ask Claude Code to check logs

In your Claude Code CLI session:

```
> check the logs
> read dev.log
> what errors are in the dev server?
> check dev.log for any issues
```

Claude will read the log file and analyze any errors, warnings, or issues.

### View specific parts of the log

```bash
# Full log
cat dev.log

# Last 50 lines
tail -50 dev.log

# Follow in real-time (in another terminal)
tail -f dev.log

# Search for errors
grep -i error dev.log
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server + logs to `dev.log` |
| `npm run dev:nolog` | Dev server without log file |
| `cat dev.log` | View full log |
| `tail -50 dev.log` | Last 50 lines |
| `tail -f dev.log` | Follow log in real-time |

## How It Works

1. **Script spawns Next.js** using `spawn('npx', ['next', 'dev', ...])`
2. **Dual output streams**: Both `stdout` and `stderr` are piped to:
   - `process.stdout` / `process.stderr` (your terminal)
   - `logStream` (the `dev.log` file)
3. **Real-time writing**: Logs appear in the file immediately as they're generated
4. **Clean shutdown**: Handles Ctrl+C gracefully, closes log file properly

## Benefits

- ✅ Claude Code CLI can read server logs anytime
- ✅ No copy-pasting errors from terminal
- ✅ Full context for debugging
- ✅ Works with any Next.js project
- ✅ Zero impact on normal development workflow
- ✅ Log file auto-clears on each server start

## Troubleshooting

### Log file not updating?
- Make sure you're using `npm run dev` (not `npm run dev:nolog`)
- Check that `scripts/dev-with-logs.js` exists

### Permission errors?
- Ensure the script has execute permissions: `chmod +x scripts/dev-with-logs.js`

### Want to disable logging temporarily?
- Use `npm run dev:nolog` instead

## Alternative: VS Code Extension

If using the Claude Code VS Code extension (not CLI), you can use the built-in `@terminal:name` feature:

```
@terminal:node what errors are showing?
```

This only works in the VS Code extension panel, not the CLI.

---

## Quick Copy-Paste Setup

**1. Create script file** at `scripts/dev-with-logs.js` (copy from above)

**2. Update package.json scripts:**
```json
"dev": "node scripts/dev-with-logs.js",
"dev:nolog": "next dev -H 0.0.0.0"
```

**3. Add to .gitignore:**
```
dev.log
```

**4. Run:**
```bash
npm run dev
```

**5. Ask Claude:**
```
check the logs
```
