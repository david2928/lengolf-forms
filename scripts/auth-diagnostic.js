#!/usr/bin/env node

/**
 * Authentication Diagnostic Script
 * This script checks if all auth components are working correctly
 */

const fs = require('fs');
const path = require('path');

function checkAuthDiagnostic() {
  console.log('🔐 AUTHENTICATION DIAGNOSTIC');
  console.log('============================');
  console.log('');

  // 1. Check environment variables
  console.log('📋 ENVIRONMENT VARIABLES:');
  const envPath = path.join(__dirname, '../.env.local');
  
  if (fs.existsSync(envPath)) {
    console.log('   ✅ .env.local file exists');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET', 
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];
    
    requiredVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        console.log(`   ✅ ${varName} is set`);
      } else {
        console.log(`   ❌ ${varName} is missing!`);
      }
    });
  } else {
    console.log('   ❌ .env.local file not found!');
  }

  // 2. Check auth configuration files
  console.log('\n🔧 AUTH CONFIGURATION:');
  const authConfigPath = path.join(__dirname, '../src/lib/auth-config.ts');
  const authPath = path.join(__dirname, '../src/lib/auth.ts');
  const nextAuthRoutePath = path.join(__dirname, '../app/api/auth/[...nextauth]/route.ts');
  
  [
    { name: 'auth-config.ts', path: authConfigPath },
    { name: 'auth.ts', path: authPath },
    { name: 'NextAuth API route', path: nextAuthRoutePath }
  ].forEach(file => {
    if (fs.existsSync(file.path)) {
      console.log(`   ✅ ${file.name} exists`);
    } else {
      console.log(`   ❌ ${file.name} missing!`);
    }
  });

  // 3. Check sign-in page
  console.log('\n📄 SIGN-IN PAGE:');
  const signinPath = path.join(__dirname, '../app/auth/signin/page.tsx');
  if (fs.existsSync(signinPath)) {
    console.log('   ✅ Sign-in page exists');
    
    const signinContent = fs.readFileSync(signinPath, 'utf8');
    if (signinContent.includes('signIn(\'google\'')) {
      console.log('   ✅ Google sign-in configured');
    } else {
      console.log('   ❌ Google sign-in not found in page');
    }
  } else {
    console.log('   ❌ Sign-in page missing!');
  }

  // 4. Check for common issues
  console.log('\n🔍 COMMON ISSUES CHECK:');
  
  // Check if development server is running
  console.log('   ℹ️  Development server status: Cannot check from script');
  
  // Check for JavaScript errors
  console.log('   ℹ️  JavaScript errors: Check browser console');
  
  // Check browser cache
  console.log('   ℹ️  Browser cache: Clear cache and hard refresh');

  // 5. Troubleshooting steps
  console.log('\n🔧 TROUBLESHOOTING STEPS:');
  console.log('   1. Restart development server: npm run dev');
  console.log('   2. Clear browser cache and hard refresh (Ctrl+F5)');
  console.log('   3. Check browser console for JavaScript errors');
  console.log('   4. Verify Google OAuth settings in Google Cloud Console');
  console.log('   5. Check if localhost:3000 is in authorized redirect URIs');
  console.log('');
  console.log('🌐 GOOGLE OAUTH SETUP:');
  console.log('   • Authorized JavaScript origins: http://localhost:3000');
  console.log('   • Authorized redirect URIs: http://localhost:3000/api/auth/callback/google');
  console.log('');
  console.log('🚨 IMMEDIATE ACTIONS:');
  console.log('   1. Stop development server (Ctrl+C)');
  console.log('   2. Restart: npm run dev');
  console.log('   3. Clear browser cache completely');
  console.log('   4. Try sign-in again');
  
  console.log('\n============================');
  console.log('🔐 DIAGNOSTIC COMPLETE');
}

if (require.main === module) {
  checkAuthDiagnostic();
}

module.exports = { checkAuthDiagnostic };