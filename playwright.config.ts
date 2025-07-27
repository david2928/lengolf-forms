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
  
  /* Run tests in files in parallel but limit concurrency for stability */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry failed tests for better stability */
  retries: process.env.CI ? 2 : 1,
  
  /* Limit workers to prevent resource exhaustion */
  workers: process.env.CI ? 1 : 4,
  
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
    
    /* Increase action timeout for better stability */
    actionTimeout: 15 * 1000,
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
    
    /* API Tests - Test all POS endpoints */
    {
      name: 'api-tests',
      testMatch: '**/api/**/*.test.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // API tests don't need browser context
        headless: true
      },
    },

    /* Database Tests - Test database operations and integrity */
    {
      name: 'database-tests',  
      testMatch: '**/database/**/*.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        headless: true
      },
    },

    /* Desktop E2E Tests - Chrome only for reliability */
    {
      name: 'desktop',
      testMatch: '**/e2e/**/*.test.ts',
      testIgnore: '**/e2e/**/*.mobile.test.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      dependencies: ['setup'],
    },

    /* Mobile E2E Tests - Chrome only, covers touch interface */
    {
      name: 'mobile',
      testMatch: '**/e2e/**/*.test.ts',
      use: { 
        ...devices['Pixel 5'],
        // Mobile viewport for POS touch interface
        viewport: { width: 393, height: 851 },
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    env: {
      // Ensure development authentication bypass is enabled for testing
      SKIP_AUTH: 'true',
      NEXT_PUBLIC_SKIP_AUTH: 'true',
      NODE_ENV: 'development'
    }
  },

  /* Test timeout - increased for stability */
  timeout: 60 * 1000, // 1 minute per test

  /* Global test timeout */
  globalTimeout: 15 * 60 * 1000, // 15 minutes

  /* Expect timeout for assertions */
  expect: {
    timeout: 15 * 1000 // 15 seconds for assertions
  },
});