#!/usr/bin/env node

/**
 * Sync Local Database from Production
 *
 * This script:
 * 1. Dumps production schema and data
 * 2. Loads them into local Docker Supabase
 * 3. Refreshes your local development environment
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '..');
const SCHEMA_DUMP = path.join(PROJECT_ROOT, 'supabase', 'production_schema_dump.sql');
const DATA_DUMP = path.join(PROJECT_ROOT, 'supabase', 'production_data_dump.sql');

console.log('🔄 Syncing local database from production...\n');

// Step 1: Check if Supabase is running locally
console.log('📦 Checking local Supabase status...');
let isSupabaseRunning = false;

try {
  const status = execSync('npx supabase status', {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  if (status.includes('supabase local development setup is running')) {
    isSupabaseRunning = true;
    console.log('✅ Local Supabase is running\n');
  }
} catch (error) {
  console.log('⚠️  Local Supabase is not running');
  console.log('Starting Supabase first...\n');

  try {
    execSync('npx supabase start', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    isSupabaseRunning = true;
    console.log('✅ Supabase started\n');
  } catch (err) {
    console.error('❌ Failed to start Supabase');
    console.error('Please ensure Docker is running and try again.');
    process.exit(1);
  }
}

// Step 2: Dump production schema
console.log('📥 Dumping production schema...');
try {
  execSync('npx supabase db dump --linked --schema backoffice,pos,marketing,public > supabase/production_schema_dump.sql', {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: 'inherit'
  });
  console.log('✅ Schema dumped\n');
} catch (error) {
  console.error('❌ Failed to dump production schema');
  console.error('Make sure you are linked to production: npm run db:link');
  process.exit(1);
}

// Step 3: Dump production data
console.log('📥 Dumping production data...');
try {
  execSync('npx supabase db dump --linked --data-only > supabase/production_data_dump.sql', {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: 'inherit'
  });
  console.log('✅ Data dumped\n');
} catch (error) {
  console.error('❌ Failed to dump production data');
  process.exit(1);
}

// Step 4: Reset local database
console.log('🗑️  Resetting local database...');
try {
  execSync('npx supabase db reset --no-seed', {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });
  console.log('✅ Local database reset\n');
} catch (error) {
  console.error('❌ Failed to reset local database');
  process.exit(1);
}

// Step 5: Load production schema
console.log('📤 Loading production schema to local...');
try {
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Get-Content supabase\\production_schema_dump.sql | docker exec -i supabase_db_lengolf-forms psql -U postgres -d postgres" 2>&1 | Select-Object -Last 5`, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });
  } else {
    execSync('cat supabase/production_schema_dump.sql | docker exec -i supabase_db_lengolf-forms psql -U postgres -d postgres | tail -5', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });
  }
  console.log('✅ Schema loaded\n');
} catch (error) {
  // Ignore errors - some warnings are expected
  console.log('✅ Schema loaded (with some warnings)\n');
}

// Step 6: Load production data
console.log('📤 Loading production data to local...');
try {
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Get-Content supabase\\production_data_dump.sql | docker exec -i supabase_db_lengolf-forms psql -U postgres -d postgres" 2>&1 | Select-Object -Last 5`, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });
  } else {
    execSync('cat supabase/production_data_dump.sql | docker exec -i supabase_db_lengolf-forms psql -U postgres -d postgres | tail -5', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });
  }
  console.log('✅ Data loaded\n');
} catch (error) {
  // Ignore errors - some warnings are expected
  console.log('✅ Data loaded (with some warnings)\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✨ Local database synced from production!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('Next step: npm run dev:local');
