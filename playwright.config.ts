import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Lengolf POS System Testing
 * 
 * This configuration supports:
 * - API testing for all POS endpoints
 * - E2E testing for complete POS workflows
 * - Database integration testing
 * - Mobile and desktop testing
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests sequentially for better control and single booking creation */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* No retries to prevent multiple booking creation */
  retries: 0,
  
  /* Single worker to run tests one at a time */
  workers: 1,
  
  /* Stop on first failure to prevent subsequent tests from running */
  maxFailures: 1,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Extra HTTP headers for all requests */
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    
    /* Increase navigation timeout for slow loading */
    navigationTimeout: 60 * 1000,
    
    /* Increase action timeout for tablet interface */
    actionTimeout: 20 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),

  /* Configure projects - Optimized for faster execution and better reliability */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    /* Removed API and Database tests - focusing only on E2E POS tablet testing */

    /* Tablet E2E Tests - Configured for Lengolf POS tablet (686x991) */
    {
      name: 'tablet-pos',
      testMatch: '**/e2e/**/*.test.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 686, height: 991 },
        // Tablet-specific settings for POS interface
        hasTouch: true,
        isMobile: false, // Keep as desktop for better element interaction
        deviceScaleFactor: 1,
        // Longer timeouts for tablet interface
        actionTimeout: 20 * 1000, // 20 seconds
        navigationTimeout: 30 * 1000, // 30 seconds
      },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse existing server for now
    timeout: 120 * 1000, // 2 minutes
    env: {
      // Ensure development authentication bypass is enabled for testing
      SKIP_AUTH: 'true',
      NEXT_PUBLIC_SKIP_AUTH: 'true',
      NODE_ENV: 'development'
    }
  },

  /* Test timeout - increased for tablet interface */
  timeout: 90 * 1000, // 1.5 minutes per test

  /* Global test timeout */
  globalTimeout: 15 * 60 * 1000, // 15 minutes

  /* Expect timeout for assertions */
  expect: {
    timeout: 15 * 1000 // 15 seconds for assertions
  },
});