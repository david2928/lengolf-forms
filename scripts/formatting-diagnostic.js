#!/usr/bin/env node

/**
 * COMPREHENSIVE FORMATTING DIAGNOSTIC
 * This script provides detailed analysis of the current formatting state
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx');

function runDiagnostic() {
  console.log('🔍 COMPREHENSIVE FORMATTING DIAGNOSTIC');
  console.log('=====================================');
  console.log('');

  // 1. File existence and basic info
  console.log('📁 FILE INFORMATION:');
  try {
    const stats = fs.statSync(filePath);
    console.log(`   ✅ File exists: ${filePath}`);
    console.log(`   📏 Size: ${stats.size} bytes`);
    console.log(`   🕐 Modified: ${stats.mtime.toISOString()}`);
    console.log(`   🔒 Mode: ${stats.mode.toString(8)}`);
  } catch (error) {
    console.log(`   ❌ File error: ${error.message}`);
    return;
  }

  // 2. Content analysis
  console.log('\n📄 CONTENT ANALYSIS:');
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`   📝 Total lines: ${content.split('\n').length}`);
  console.log(`   🔤 Total characters: ${content.length}`);

  // 3. Specific formatting checks
  console.log('\n🎯 FORMATTING ELEMENT CHECKS:');
  const checks = [
    { name: 'Staff Hours 6-column grid', pattern: 'lg:grid-cols-6', line: null },
    { name: 'Calendar compact gaps', pattern: 'gap-2 md:gap-3', line: null },
    { name: 'Day container compact height', pattern: 'min-h-\\[80px\\]', line: null },
    { name: 'Schedule item compact padding', pattern: 'p-1 rounded-md', line: null },
    { name: 'Status text: Under', pattern: "'Under'", line: null },
    { name: 'Status text: Over', pattern: "'Over'", line: null },
    { name: 'Status text: Good', pattern: "'Good'", line: null },
    { name: 'Compact layout comment', pattern: 'COMPACT LAYOUT', line: null },
    { name: 'DO NOT REVERT comment', pattern: 'DO NOT REVERT', line: null }
  ];

  const lines = content.split('\n');
  checks.forEach(check => {
    const regex = new RegExp(check.pattern);
    const found = regex.test(content);
    
    if (found) {
      // Find line number
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          check.line = i + 1;
          break;
        }
      }
    }
    
    const status = found ? '✅' : '❌';
    const lineInfo = check.line ? ` (line ${check.line})` : '';
    console.log(`   ${status} ${check.name}${lineInfo}`);
  });

  // 4. Calculate compact percentage
  const foundCount = checks.filter(check => {
    const regex = new RegExp(check.pattern);
    return regex.test(content);
  }).length;
  const compactPercentage = Math.round((foundCount / checks.length) * 100);
  
  console.log(`\n📊 COMPACT FORMATTING SCORE: ${compactPercentage}%`);
  
  if (compactPercentage === 100) {
    console.log('   🎉 PERFECT! All compact formatting elements present');
  } else if (compactPercentage >= 80) {
    console.log('   ⚠️  MOSTLY COMPACT - Some elements missing');
  } else {
    console.log('   🚨 CRITICAL - Major formatting issues detected');
  }

  // 5. Check for legacy patterns
  console.log('\n🔍 LEGACY PATTERN CHECK:');
  const legacyPatterns = [
    { name: 'Old 4-column grid', pattern: 'lg:grid-cols-4' },
    { name: 'Large gaps', pattern: 'gap-3 md:gap-4' },
    { name: 'Large heights', pattern: 'min-h-\\[100px\\] md:min-h-\\[120px\\]' },
    { name: 'Verbose status: Under-scheduled', pattern: 'Under-scheduled' },
    { name: 'Verbose status: Over-scheduled', pattern: 'Over-scheduled' },
    { name: 'Verbose status: Optimal hours', pattern: 'Optimal hours' },
    { name: 'Staff Color Legend reference', pattern: 'createStaffColorLegend' }
  ];

  let legacyFound = false;
  legacyPatterns.forEach(pattern => {
    const regex = new RegExp(pattern.pattern);
    const found = regex.test(content);
    if (found) {
      console.log(`   ❌ LEGACY DETECTED: ${pattern.name}`);
      legacyFound = true;
    }
  });

  if (!legacyFound) {
    console.log('   ✅ No legacy patterns detected');
  }

  // 6. Git status
  console.log('\n📋 GIT STATUS:');
  try {
    const gitStatus = execSync('git status --porcelain app/admin/staff-scheduling/page.tsx', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      console.log(`   📝 File has uncommitted changes: ${gitStatus.trim()}`);
    } else {
      console.log('   ✅ File is clean (no uncommitted changes)');
    }
  } catch (error) {
    console.log(`   ⚠️  Git status unavailable: ${error.message}`);
  }

  // 7. Next.js build cache
  console.log('\n🏗️  BUILD CACHE STATUS:');
  const nextDir = path.join(__dirname, '../.next');
  if (fs.existsSync(nextDir)) {
    const nextStats = fs.statSync(nextDir);
    console.log(`   📁 .next directory exists (modified: ${nextStats.mtime.toISOString()})`);
    console.log('   💡 Consider clearing cache: rm -rf .next');
  } else {
    console.log('   ✅ No .next cache directory');
  }

  // 8. Browser cache warning
  console.log('\n🌐 BROWSER CACHE WARNING:');
  console.log('   ⚠️  If you see old formatting in browser:');
  console.log('   🔄 Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)');
  console.log('   🧹 Clear browser cache completely');
  console.log('   🔄 Restart development server');

  // 9. Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (compactPercentage < 100) {
    console.log('   🔧 Run: npm run protect-formatting');
  }
  if (fs.existsSync(nextDir)) {
    console.log('   🧹 Clear build cache: rm -rf .next');
  }
  console.log('   👀 Start monitoring: npm run monitor-formatting');
  console.log('   🚨 Emergency alarm: npm run formatting-alarm:watch');

  console.log('\n=====================================');
  console.log('🔍 DIAGNOSTIC COMPLETE');
}

if (require.main === module) {
  runDiagnostic();
}

module.exports = { runDiagnostic };