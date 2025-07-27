#!/usr/bin/env node

/**
 * REAL-TIME FORMATTING MONITOR
 * This script monitors the exact moment formatting changes occur
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx');
const logPath = path.join(__dirname, '../formatting-changes.log');

// Log function with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  fs.appendFileSync(logPath, logEntry);
}

// Capture file state
function captureState() {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    return {
      content,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      checksum: require('crypto').createHash('md5').update(content).digest('hex')
    };
  } catch (error) {
    log(`ERROR capturing state: ${error.message}`);
    return null;
  }
}

// Check specific formatting elements
function analyzeFormatting(content) {
  const elements = {
    staffGrid: /lg:grid-cols-6/.test(content),
    calendarGaps: /gap-2 md:gap-3/.test(content),
    dayHeight: /min-h-\[80px\]/.test(content),
    schedulePadding: /p-1 rounded-md/.test(content),
    statusUnder: /'Under'/.test(content),
    statusOver: /'Over'/.test(content),
    statusGood: /'Good'/.test(content)
  };

  const compactCount = Object.values(elements).filter(Boolean).length;
  const totalElements = Object.keys(elements).length;
  
  return {
    elements,
    compactPercentage: Math.round((compactCount / totalElements) * 100),
    isFullyCompact: compactCount === totalElements
  };
}

// Compare states and detect changes
function compareStates(oldState, newState) {
  if (!oldState || !newState) return null;

  const changes = {
    sizeChanged: oldState.size !== newState.size,
    contentChanged: oldState.checksum !== newState.checksum,
    timeChanged: oldState.mtime !== newState.mtime
  };

  if (changes.contentChanged) {
    const oldAnalysis = analyzeFormatting(oldState.content);
    const newAnalysis = analyzeFormatting(newState.content);
    
    changes.formattingChanged = oldAnalysis.compactPercentage !== newAnalysis.compactPercentage;
    changes.oldFormatting = oldAnalysis;
    changes.newFormatting = newAnalysis;
    
    // Detect specific element changes
    changes.elementChanges = {};
    Object.keys(oldAnalysis.elements).forEach(key => {
      if (oldAnalysis.elements[key] !== newAnalysis.elements[key]) {
        changes.elementChanges[key] = {
          was: oldAnalysis.elements[key],
          now: newAnalysis.elements[key]
        };
      }
    });
  }

  return changes;
}

// LOUD ALERT for formatting changes
function alertFormattingChange(changes) {
  console.log('\n🚨🚨🚨 FORMATTING CHANGE DETECTED! 🚨🚨🚨');
  console.log('='.repeat(50));
  
  if (changes.formattingChanged) {
    console.log(`📊 Compact percentage: ${changes.oldFormatting.compactPercentage}% → ${changes.newFormatting.compactPercentage}%`);
    
    if (Object.keys(changes.elementChanges).length > 0) {
      console.log('\n🔍 Specific changes:');
      Object.entries(changes.elementChanges).forEach(([element, change]) => {
        const status = change.now ? '✅' : '❌';
        console.log(`   ${status} ${element}: ${change.was} → ${change.now}`);
      });
    }
    
    if (!changes.newFormatting.isFullyCompact) {
      console.log('\n🚨 CRITICAL: Compact formatting has been compromised!');
      console.log('🔧 Run immediately: npm run protect-formatting');
    }
  }
  
  console.log('='.repeat(50));
  console.log('');
}

// Start monitoring
function startMonitoring() {
  log('🔍 REAL-TIME FORMATTING MONITOR STARTED');
  log(`📁 Monitoring: ${filePath}`);
  log(`📝 Log file: ${logPath}`);
  
  let currentState = captureState();
  if (currentState) {
    const analysis = analyzeFormatting(currentState.content);
    log(`📊 Initial state: ${analysis.compactPercentage}% compact (${analysis.isFullyCompact ? 'FULL' : 'PARTIAL'})`);
  }

  // Monitor file changes with high frequency
  const interval = setInterval(() => {
    const newState = captureState();
    if (!newState) return;

    const changes = compareStates(currentState, newState);
    if (changes && changes.contentChanged) {
      log(`📝 File changed (${newState.size} bytes, checksum: ${newState.checksum.substring(0, 8)}...)`);
      
      if (changes.formattingChanged) {
        log('🚨 FORMATTING CHANGE DETECTED!');
        alertFormattingChange(changes);
        
        // Auto-restore if formatting is compromised
        if (!changes.newFormatting.isFullyCompact) {
          log('🔧 Attempting auto-restoration...');
          try {
            execSync('npm run protect-formatting', { stdio: 'pipe' });
            log('✅ Auto-restoration completed');
          } catch (error) {
            log(`❌ Auto-restoration failed: ${error.message}`);
          }
        }
      } else {
        log('✅ Content changed but formatting intact');
      }
    }

    currentState = newState;
  }, 250); // Check every 250ms for high sensitivity

  // Cleanup on exit
  process.on('SIGINT', () => {
    clearInterval(interval);
    log('🛑 MONITORING STOPPED');
    process.exit(0);
  });

  console.log('👀 Real-time monitoring active (Press Ctrl+C to stop)');
  console.log('📊 Checking every 250ms for maximum sensitivity');
  console.log('');
}

// Main execution
if (require.main === module) {
  startMonitoring();
}

module.exports = { captureState, analyzeFormatting, compareStates };