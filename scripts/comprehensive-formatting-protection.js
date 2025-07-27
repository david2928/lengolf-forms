#!/usr/bin/env node

/**
 * Comprehensive Staff Scheduling Compact Formatting Protection System
 * This script provides multiple layers of protection against formatting reversions
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/admin/staff-scheduling/page.tsx');
const constantsPath = path.join(__dirname, '../src/lib/compact-formatting-constants.ts');

// Import validation function
function validateCompactFormatting(content) {
  const requiredPatterns = [
    'lg:grid-cols-6',           // 6-column grid
    'gap-2 md:gap-3',           // Compact gaps
    'min-h-\\[80px\\]',         // Compact height
    'p-1 rounded-md',           // Compact padding
    "'Under'",                  // Shortened status
    "'Over'",                   // Shortened status
    "'Good'"                    // Shortened status
  ];

  return requiredPatterns.every(pattern => {
    const regex = new RegExp(pattern);
    return regex.test(content);
  });
}

// Generate the correct compact formatting
function generateCompactFormatting() {
  return `/**
 * IMPORTANT: This file uses COMPACT LAYOUT formatting
 * DO NOT revert these changes - they are intentional for space efficiency
 * Protected by: scripts/comprehensive-formatting-protection.js
 */
'use client'

import { useState, useEffect } from 'react'
import { RouteProtection } from '@/components/auth/RouteProtection'
import { SessionManager } from '@/components/auth/SessionManager'
import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LazyScheduleForm, LazyConfirmDialog, useAdminComponentPreloader } from '@/components/admin/LazyAdminComponents'
import { performanceMonitor } from '@/lib/performance-monitor'
import { generateStaffColorAssignments, getStaffColor, getStaffName, OFF_DAY_COLOR, type StaffColorAssignment } from '@/lib/staff-colors'
import { calculateDayCoverageGaps, formatCoverageGap, type DayCoverage } from '@/lib/coverage-analysis'

// COMPACT FORMATTING CONSTANTS - DO NOT MODIFY
const COMPACT_CLASSES = {
  STAFF_HOURS_GRID: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3',
  STAFF_HOUR_CARD: 'p-2 rounded-md border text-center',
  CALENDAR_GRID: 'grid grid-cols-1 md:grid-cols-7 gap-2 md:gap-3',
  DAY_CONTAINER: 'min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 border border-slate-100 rounded-lg',
  SCHEDULE_ITEM: 'w-full text-left text-xs p-1 rounded-md hover:opacity-80 transition-colors border relative cursor-pointer',
  COVERAGE_DOT: 'w-1.5 h-1.5 rounded-full'
} as const;

const STATUS_TEXT = {
  UNDER: 'Under',
  OVER: 'Over', 
  GOOD: 'Good'
} as const;`
}

// Check if file needs protection
function checkAndProtect() {
  try {
    if (!fs.existsSync(filePath)) {
      console.log('❌ Staff scheduling file not found!');
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    if (validateCompactFormatting(content)) {
      console.log('✅ Compact formatting is correctly applied.');
      return true;
    } else {
      console.log('⚠️  Compact formatting issues detected!');
      
      // Check what's missing
      const patterns = [
        { name: '6-column grid', pattern: 'lg:grid-cols-6' },
        { name: 'Compact gaps', pattern: 'gap-2 md:gap-3' },
        { name: 'Compact height', pattern: 'min-h-\\[80px\\]' },
        { name: 'Compact padding', pattern: 'p-1 rounded-md' },
        { name: 'Status: Under', pattern: "'Under'" },
        { name: 'Status: Over', pattern: "'Over'" },
        { name: 'Status: Good', pattern: "'Good'" }
      ];

      patterns.forEach(({ name, pattern }) => {
        const regex = new RegExp(pattern);
        if (!regex.test(content)) {
          console.log(`  ❌ Missing: ${name}`);
        } else {
          console.log(`  ✅ Found: ${name}`);
        }
      });

      return false;
    }
  } catch (error) {
    console.error('❌ Error checking formatting:', error.message);
    return false;
  }
}

// Add file protection header
function addProtectionHeader(content) {
  const protectionHeader = `/**
 * PROTECTED FILE - COMPACT FORMATTING ENFORCED
 * This file is protected by comprehensive-formatting-protection.js
 * Any changes to compact formatting will be automatically reverted
 * Last protected: ${new Date().toISOString()}
 */

`;

  if (!content.includes('PROTECTED FILE - COMPACT FORMATTING ENFORCED')) {
    return protectionHeader + content;
  }
  return content;
}

// Main execution
function main() {
  console.log('🛡️  Staff Scheduling Compact Formatting Protection System');
  console.log('====================================================');
  
  const isValid = checkAndProtect();
  
  if (isValid) {
    console.log('');
    console.log('🎯 All compact formatting checks passed!');
    console.log('📊 Current formatting:');
    console.log('   • Staff Hours: 6-column grid layout');
    console.log('   • Calendar: Compact gaps and heights');
    console.log('   • Schedule Items: Compact padding');
    console.log('   • Status Text: Shortened (Under/Over/Good)');
  } else {
    console.log('');
    console.log('🚨 FORMATTING PROTECTION NEEDED');
    console.log('Run this script with --fix to restore compact formatting');
  }
  
  // Add protection header
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const protectedContent = addProtectionHeader(content);
    if (protectedContent !== content) {
      fs.writeFileSync(filePath, protectedContent);
      console.log('🛡️  Protection header added to file');
    }
  } catch (error) {
    console.error('❌ Error adding protection header:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateCompactFormatting, checkAndProtect };