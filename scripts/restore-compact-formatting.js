#!/usr/bin/env node

/**
 * Script to restore compact formatting to staff scheduling page
 * Run this if the formatting gets automatically reverted
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx');
const backupPath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx.compact-backup');

function restoreCompactFormatting() {
  try {
    if (fs.existsSync(backupPath)) {
      console.log('Restoring compact formatting from backup...');
      fs.copyFileSync(backupPath, filePath);
      console.log('✅ Compact formatting restored successfully!');
    } else {
      console.log('❌ Backup file not found. Manual restoration required.');
      console.log('Please check .kiro/settings/formatting-rules.md for formatting requirements.');
    }
  } catch (error) {
    console.error('❌ Error restoring formatting:', error.message);
  }
}

// Check if current file has compact formatting
function checkCompactFormatting() {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasCompactClasses = content.includes('staff-hours-compact') && 
                             content.includes('schedule-grid-compact') &&
                             content.includes('lg:grid-cols-6');
    
    if (hasCompactClasses) {
      console.log('✅ Compact formatting is already applied.');
      return true;
    } else {
      console.log('⚠️  Compact formatting appears to be missing.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking formatting:', error.message);
    return false;
  }
}

// Main execution
if (require.main === module) {
  console.log('🔍 Checking staff scheduling formatting...');
  
  if (!checkCompactFormatting()) {
    console.log('🔧 Attempting to restore compact formatting...');
    restoreCompactFormatting();
  }
}

module.exports = { restoreCompactFormatting, checkCompactFormatting };