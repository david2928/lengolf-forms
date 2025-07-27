import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * 
 * This runs once before all tests and:
 * - Ensures the development server is ready
 * - Sets up authentication tokens for API tests
 * - Prepares test data if needed
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Playwright test environment...');
  
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  // Launch browser to check if app is ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the app to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // Check if development auth bypass is working
    console.log('🔐 Checking authentication bypass...');
    await page.goto(`${baseURL}/pos`);
    
    // If we get redirected to login, something is wrong
    const currentUrl = page.url();
    if (currentUrl.includes('/api/auth/signin') || currentUrl.includes('/login')) {
      throw new Error('Authentication bypass not working. Ensure SKIP_AUTH=true is set.');
    }
    
    // Get development API token for API tests
    console.log('🎫 Obtaining API authentication token...');
    const tokenResponse = await page.goto(`${baseURL}/api/dev-token`);
    if (tokenResponse && tokenResponse.ok()) {
      const tokenData = await tokenResponse.json();
      if (tokenData.token) {
        // Store token in environment for API tests
        process.env.TEST_API_TOKEN = tokenData.token;
        console.log('✅ API token obtained successfully');
      }
    }
    
    console.log('✅ Application is ready for testing');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await page.close();
    await browser.close();
  }
}

export default globalSetup;