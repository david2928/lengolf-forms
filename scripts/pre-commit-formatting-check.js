#!/usr/bin/env node

/**
 * Pre-commit hook to prevent committing reverted compact formatting
 * Add this to .git/hooks/pre-commit to automatically check formatting before commits
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx');

// Key indicators that compact formatting is in place
const COMPACT_INDICATORS = [
  'lg:grid-cols-6',           // 6-column grid for staff hours
  'gap-2 md:gap-3',           // Compact gaps
  'min-h-[80px]',             // Compact day container height
  'p-1 rounded-md',           // Compact schedule item padding
  'Under.*Over.*Good'         // Shortened status text
];

function checkCompactFormatting() {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasAllIndicators = COMPACT_INDICATORS.every(indicator => {
      const regex = new RegExp(indicator);
      return regex.test(content);
    });
    
    return hasAllIndicators;
  } catch (error) {
    console.error('Error checking formatting:', error.message);
    return false;
  }
}

// Main execution
if (require.main === module) {
  console.log('🔍 Checking compact formatting before commit...');
  
  if (checkCompactFormatting()) {
    console.log('✅ Compact formatting is intact. Commit allowed.');
    process.exit(0);
  } else {
    console.log('❌ COMMIT BLOCKED: Compact formatting has been reverted!');
    console.log('');
    console.log('To fix this:');
    console.log('1. Run: npm run protect-formatting');
    console.log('2. Or manually restore from: app/admin/staff-scheduling/page.tsx.compact-backup-fixed');
    console.log('3. Then try committing again');
    console.log('');
    process.exit(1);
  }
}

module.exports = { checkCompactFormatting };