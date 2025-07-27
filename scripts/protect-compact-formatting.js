#!/usr/bin/env node

/**
 * File watcher to protect compact formatting from being reverted
 * This script monitors the staff scheduling page and restores compact formatting if changed
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx');
const backupPath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx.compact-backup-fixed');

// Key indicators that compact formatting is in place
const COMPACT_INDICATORS = [
  'lg:grid-cols-6',           // 6-column grid for staff hours
  'gap-2 md:gap-3',           // Compact gaps
  'min-h-\\[80px\\]',         // Compact day container height (escaped brackets)
  'p-1 rounded-md',           // Compact schedule item padding
  'text-xs',                  // Small text
  "'Under'",                  // Shortened status text - Under
  "'Over'",                   // Shortened status text - Over  
  "'Good'"                    // Shortened status text - Good
];

function checkCompactFormatting(content) {
  const hasAllIndicators = COMPACT_INDICATORS.every(indicator => {
    const regex = new RegExp(indicator);
    return regex.test(content);
  });
  
  return hasAllIndicators;
}

function restoreFromBackup() {
  try {
    if (fs.existsSync(backupPath)) {
      console.log('🔧 Restoring compact formatting from backup...');
      fs.copyFileSync(backupPath, filePath);
      console.log('✅ Compact formatting restored!');
      return true;
    } else {
      console.log('❌ Backup file not found!');
      return false;
    }
  } catch (error) {
    console.error('❌ Error restoring from backup:', error.message);
    return false;
  }
}

function watchFile() {
  console.log('👀 Watching staff scheduling file for changes...');
  
  fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log('📝 File changed, checking formatting...');
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (!checkCompactFormatting(content)) {
          console.log('⚠️  Compact formatting lost! Restoring...');
          
          if (restoreFromBackup()) {
            console.log('✅ Formatting protection successful!');
          } else {
            console.log('❌ Failed to restore formatting!');
          }
        } else {
          console.log('✅ Compact formatting is intact.');
        }
      } catch (error) {
        console.error('❌ Error checking file:', error.message);
      }
    }
  });
  
  console.log('🛡️  File protection active. Press Ctrl+C to stop.');
}

// Check current state
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (checkCompactFormatting(content)) {
    console.log('✅ Compact formatting is currently active.');
  } else {
    console.log('⚠️  Compact formatting is missing. Restoring...');
    restoreFromBackup();
  }
  
  // Start watching
  if (process.argv.includes('--watch')) {
    watchFile();
  }
} else {
  console.log('❌ Staff scheduling file not found!');
}

module.exports = { checkCompactFormatting, restoreFromBackup };