#!/usr/bin/env node

/**
 * Test Vercel Build Locally
 * This script replicates Vercel's exact build process to catch deployment issues early
 * Based on Vercel's build pipeline: https://vercel.com/docs/deployments/troubleshooting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔧 Testing Vercel Build Process Locally');
console.log('================================================\n');

// Step 0: Environment setup (like Vercel)
console.log('🌍 Step 0: Environment setup');
process.env.NODE_ENV = 'production';
process.env.VERCEL = '1';  // Some packages behave differently on Vercel
process.env.CI = 'true';   // Continuous Integration flag
console.log('   - NODE_ENV=production');
console.log('   - VERCEL=1');
console.log('   - CI=true');
console.log('✅ Environment configured\n');

// Step 1: Clean install with exact Vercel conditions
console.log('📦 Step 1: Clean npm install (exactly like Vercel)');
try {
  // Remove node_modules and package-lock.json to simulate fresh Vercel install
  if (fs.existsSync('node_modules')) {
    console.log('   - Removing node_modules...');
    if (os.platform() === 'win32') {
      execSync('rmdir /s /q node_modules', { stdio: 'inherit', shell: true });
    } else {
      execSync('rm -rf node_modules', { stdio: 'inherit' });
    }
  }
  
  // Backup current package-lock.json
  if (fs.existsSync('package-lock.json')) {
    console.log('   - Backing up package-lock.json...');
    fs.copyFileSync('package-lock.json', 'package-lock.json.backup');
    if (os.platform() === 'win32') {
      execSync('del package-lock.json', { stdio: 'inherit', shell: true });
    } else {
      execSync('rm package-lock.json', { stdio: 'inherit' });
    }
  }
  
  // Fresh install exactly like Vercel does
  console.log('   - Running fresh npm install (no legacy-peer-deps)...');
  console.log('   - This will fail if there are peer dependency conflicts');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('✅ Fresh install completed (Vercel-style)\n');
} catch (error) {
  console.error('❌ Step 1 Failed - npm install error');
  console.error('🚨 THIS IS THE EXACT ERROR VERCEL ENCOUNTERS:');
  console.error('================================================');
  console.error(error.message);
  console.error('================================================');
  
  // Restore backup
  if (fs.existsSync('package-lock.json.backup')) {
    console.log('\n🔧 Restoring original package-lock.json...');
    fs.copyFileSync('package-lock.json.backup', 'package-lock.json');
    fs.unlinkSync('package-lock.json.backup');
  }
  
  console.error('\n💡 SOLUTION:');
  console.error('   Run: node scripts/react19-audit.js');
  console.error('   Update packages with React 19 compatibility issues');
  console.error('   Or add .npmrc with: legacy-peer-deps=true');
  
  process.exit(1);
}

// Step 2: Type checking (Vercel runs this)
console.log('🔍 Step 2: TypeScript type checking');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript check passed\n');
} catch (error) {
  console.error('❌ Step 2 Failed - TypeScript errors');
  console.error(error.message);
  process.exit(1);
}

// Step 3: Linting (Vercel runs this)
console.log('🧹 Step 3: ESLint validation');
try {
  execSync('npm run lint', { stdio: 'inherit' });
  console.log('✅ ESLint validation passed\n');
} catch (error) {
  console.error('❌ Step 3 Failed - ESLint errors');
  console.error(error.message);
  process.exit(1);
}

// Step 4: Next.js build (the main Vercel step)
console.log('🏗️  Step 4: Next.js production build');
try {
  // Set NODE_ENV to production like Vercel does
  process.env.NODE_ENV = 'production';
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Production build completed\n');
} catch (error) {
  console.error('❌ Step 4 Failed - Next.js build error');
  console.error('This matches the Vercel deployment failure:');
  console.error(error.message);
  process.exit(1);
}

// Step 5: Build validation
console.log('✅ All Vercel build steps completed successfully!');
console.log('🎉 Your code should deploy to Vercel without errors.');

// Display build info
if (fs.existsSync('.next')) {
  console.log('\n📊 Build Output:');
  try {
    const buildManifest = path.join('.next', 'build-manifest.json');
    if (fs.existsSync(buildManifest)) {
      console.log('   - Build artifacts created successfully');
    }
    console.log('   - Static files generated in .next/');
  } catch (error) {
    // Non-critical
  }
}

console.log('\n🚀 Ready for Vercel deployment!');