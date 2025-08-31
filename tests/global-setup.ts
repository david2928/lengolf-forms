import { FullConfig } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

/**
 * Playwright Global Setup
 * Runs once before all tests to initialize the test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('🧪 Playwright Global Setup: Initializing test environment...');

  // Load environment variables from .env.local
  dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

  // Verify environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_REFAC_SUPABASE_URL',
    'REFAC_SUPABASE_SERVICE_ROLE_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Ensure SKIP_AUTH is enabled for testing
  if (process.env.SKIP_AUTH !== 'true') {
    console.warn('⚠️ SKIP_AUTH is not set to true. Tests may fail authentication.');
  }

  console.log('✅ Global setup completed successfully');
  console.log(`🔧 Base URL: ${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}`);
  console.log(`🔐 Authentication bypass: ${process.env.SKIP_AUTH === 'true' ? 'ENABLED' : 'DISABLED'}`);
}

export default globalSetup;