import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * 
 * This runs once after all tests complete and:
 * - Cleans up test data
 * - Logs test completion
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up any environment variables set during testing
  delete process.env.TEST_API_TOKEN;
  
  console.log('✅ Test environment cleanup complete');
}

export default globalTeardown;