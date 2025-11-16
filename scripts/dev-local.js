#!/usr/bin/env node

/**
 * Start local development with Docker Supabase
 *
 * This script:
 * 1. Checks if Supabase is running
 * 2. Starts Supabase if not running
 * 3. Copies .env.local.docker to .env.local
 * 4. Starts Next.js dev server
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

console.log('🚀 Starting local development environment...\n');

// Step 1: Check if Supabase is running
console.log('📦 Checking Supabase status...');
let isSupabaseRunning = false;

try {
  const status = execSync('npx supabase status', {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  if (status.includes('supabase local development setup is running')) {
    console.log('✅ Supabase is already running\n');
    isSupabaseRunning = true;
  }
} catch (error) {
  console.log('⚠️  Supabase is not running\n');
}

// Step 2: Start Supabase if not running
if (!isSupabaseRunning) {
  console.log('🔧 Starting Supabase (this may take a moment on first run)...');
  try {
    execSync('npx supabase start', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    console.log('✅ Supabase started successfully\n');
  } catch (error) {
    console.error('❌ Failed to start Supabase');
    console.error('Please ensure Docker is running and try again.');
    process.exit(1);
  }
}

// Step 3: Copy .env.local.docker to .env.local
console.log('📝 Setting up local environment variables...');
const envLocalDockerPath = path.join(PROJECT_ROOT, '.env.local.docker');
const envLocalPath = path.join(PROJECT_ROOT, '.env.local');

try {
  fs.copyFileSync(envLocalDockerPath, envLocalPath);
  console.log('✅ Environment configured for local development\n');
} catch (error) {
  console.error('❌ Failed to copy .env.local.docker');
  console.error(error.message);
  process.exit(1);
}

// Step 4: Start Next.js dev server
console.log('🌐 Starting Next.js development server...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const nextDev = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
  shell: true
});

nextDev.on('error', (error) => {
  console.error('❌ Failed to start Next.js dev server');
  console.error(error.message);
  process.exit(1);
});

nextDev.on('close', (code) => {
  if (code !== 0) {
    console.error(`Next.js dev server exited with code ${code}`);
  }
  process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down development server...');
  nextDev.kill('SIGINT');
});
