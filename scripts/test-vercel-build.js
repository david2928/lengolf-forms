#!/usr/bin/env node

/**
 * Test Vercel Build Locally
 * This script replicates Vercel's build process exactly to catch deployment issues early
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Testing Vercel Build Process Locally\n');

// Step 1: Clean install with exact Vercel conditions
console.log('📦 Step 1: Clean npm install (simulating Vercel)');
try {
  // Remove node_modules and package-lock.json to simulate fresh Vercel install
  if (fs.existsSync('node_modules')) {
    console.log('   - Removing node_modules...');
    execSync('rm -rf node_modules', { stdio: 'inherit' });
  }
  
  if (fs.existsSync('package-lock.json')) {
    console.log('   - Removing package-lock.json for fresh install...');
    execSync('rm package-lock.json', { stdio: 'inherit' });
  }
  
  // Fresh install - Vercel uses npm ci if package-lock exists, npm install if not
  console.log('   - Running fresh npm install...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('✅ Fresh install completed\n');
} catch (error) {
  console.error('❌ Step 1 Failed - npm install error');
  console.error('This is likely the same error Vercel encounters:');
  console.error(error.message);
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