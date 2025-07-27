#!/usr/bin/env node

/**
 * EMERGENCY FORMATTING ALARM SYSTEM
 * This script provides immediate alerts when formatting changes are detected
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx');

// LOUD ALARM FUNCTION
function soundAlarm(message) {
  console.log('\n🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
  console.log('🚨                                                🚨');
  console.log('🚨        FORMATTING REVERSION DETECTED!        🚨');
  console.log('🚨                                                🚨');
  console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
  console.log('');
  console.log('⚠️  ALERT:', message);
  console.log('');
  console.log('🔧 IMMEDIATE ACTIONS REQUIRED:');
  console.log('   1. Stop what you\'re doing');
  console.log('   2. Run: npm run protect-formatting');
  console.log('   3. Hard refresh browser (Ctrl+F5)');
  console.log('   4. Clear Next.js cache: rm -rf .next');
  console.log('');
  console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
  
  // Try to make system beep (Windows)
  try {
    execSync('echo \u0007', { stdio: 'inherit' });
  } catch (e) {
    // Ignore if beep fails
  }
}

// Enhanced validation with specific checks
function validateWithAlarm(content) {
  const checks = [
    { name: '6-column staff grid', pattern: 'lg:grid-cols-6', critical: true },
    { name: 'Compact calendar gaps', pattern: 'gap-2 md:gap-3', critical: true },
    { name: 'Compact day height', pattern: 'min-h-\\[80px\\]', critical: true },
    { name: 'Compact schedule padding', pattern: 'p-1 rounded-md', critical: true },
    { name: 'Shortened status: Under', pattern: "'Under'", critical: false },
    { name: 'Shortened status: Over', pattern: "'Over'", critical: false },
    { name: 'Shortened status: Good', pattern: "'Good'", critical: false }
  ];

  let allPassed = true;
  let criticalFailed = false;
  const failures = [];

  checks.forEach(check => {
    const regex = new RegExp(check.pattern);
    if (!regex.test(content)) {
      allPassed = false;
      failures.push(check.name);
      if (check.critical) {
        criticalFailed = true;
      }
    }
  });

  if (criticalFailed) {
    soundAlarm(`CRITICAL formatting elements missing: ${failures.join(', ')}`);
    return false;
  } else if (!allPassed) {
    console.log('⚠️  Minor formatting issues detected:', failures.join(', '));
    return false;
  }

  return true;
}

// Check current state
function checkNow() {
  try {
    if (!fs.existsSync(filePath)) {
      soundAlarm('Staff scheduling file not found!');
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return validateWithAlarm(content);
  } catch (error) {
    soundAlarm(`Error reading file: ${error.message}`);
    return false;
  }
}

// Watch for changes
function startWatching() {
  console.log('👀 EMERGENCY ALARM SYSTEM ACTIVE');
  console.log('   Watching:', filePath);
  console.log('   Press Ctrl+C to stop');
  console.log('');

  // Initial check
  if (checkNow()) {
    console.log('✅ Initial check passed - formatting is correct');
  }

  // Watch for file changes
  fs.watchFile(filePath, { interval: 500 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log('📝 File changed - checking formatting...');
      
      setTimeout(() => {
        if (!checkNow()) {
          console.log('');
          console.log('🔧 Auto-restoration attempt...');
          try {
            execSync('npm run protect-formatting', { stdio: 'inherit' });
          } catch (e) {
            console.log('❌ Auto-restoration failed!');
          }
        } else {
          console.log('✅ Formatting check passed');
        }
      }, 100); // Small delay to ensure file write is complete
    }
  });
}

// Main execution
if (require.main === module) {
  if (process.argv.includes('--watch')) {
    startWatching();
  } else {
    const isValid = checkNow();
    process.exit(isValid ? 0 : 1);
  }
}

module.exports = { validateWithAlarm, checkNow, soundAlarm };