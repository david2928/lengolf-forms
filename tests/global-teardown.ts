/**
 * Playwright Global Teardown
 * Runs once after all tests complete to clean up the test environment
 */
async function globalTeardown() {
  console.log('🧪 Playwright Global Teardown: Cleaning up test environment...');
  
  // Clean up any global test data if needed
  // For now, individual tests handle their own cleanup
  
  console.log('✅ Global teardown completed successfully');
}

export default globalTeardown;