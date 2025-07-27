import { Page, expect } from '@playwright/test';
import { TestStaffs } from './test-data';

/**
 * Helper function to authenticate staff member in POS system
 */
export async function authenticateStaff(page: Page, staffPin: string = '133729') {
  // Wait for staff login modal to appear - use any visible modal selector
  const staffLoginModal = page.locator('.fixed.inset-0').first();

  // Check if modal is visible, then authenticate using the numeric keypad
  try {
    await staffLoginModal.waitFor({ state: 'visible', timeout: 5000 });
    
    // Use the numeric keypad to enter PIN
    for (const digit of staffPin) {
      await page.locator(`button:has-text("${digit}")`).click();
      await page.waitForTimeout(100); // Small delay between clicks
    }
    
    // Click the login button - look for button with login text
    await page.locator('button:has-text("Login")').click();
    
    // Wait for authentication to complete - modal should disappear
    await staffLoginModal.waitFor({ state: 'hidden', timeout: 10000 });
  } catch (error) {
    // If no modal appears, staff might already be authenticated
    console.log('No staff login modal found, checking if already authenticated');
  }
  
  // Verify we can see the POS header - look for the text anywhere on the page
  try {
    // Check if page is still open before trying to verify
    if (page.isClosed()) {
      throw new Error('Page was closed before verification');
    }
    
    await expect(page.locator('h1')).toContainText('Lengolf POS', { timeout: 8000 });
  } catch (error) {
    // Check if page is still open for fallback
    if (page.isClosed()) {
      throw new Error('Page was closed during authentication verification');
    }
    
    // Fallback - check if the text exists anywhere on the page
    await expect(page.getByText('Lengolf POS')).toBeVisible({ timeout: 3000 });
  }
}

/**
 * Helper function to wait for POS system to be ready
 */
export async function waitForPOSReady(page: Page) {
  // Wait for tables to load - look for actual table cards
  await expect(page.locator('.cursor-pointer').filter({ hasText: 'Bay' }).or(page.locator('.cursor-pointer').filter({ hasText: 'Bar' })).first()).toBeVisible({ timeout: 15000 });
  
  // Wait for any loading spinners to disappear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('[class*="animate-spin"]');
    return spinners.length === 0;
  }, { timeout: 5000 }).catch(() => {
    // Ignore spinner timeout - not all pages have spinners
  });
}

/**
 * Helper function to open a table for testing and navigate to POS interface
 * Uses a hybrid approach: API to ensure occupied table exists, then UI navigation
 */
export async function openTestTable(page: Page, staffPin: string = '133729') {
  console.log('🔍 Looking for occupied tables first...');
  
  // First check if there's already an occupied table we can use - using better selectors
  const existingOccupiedTable = page.locator('[data-testid="table-card"][data-table-status="occupied"]').first()
    .or(page.locator('[data-testid="table-select-button"]').first());
    
  if (await existingOccupiedTable.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('✅ Found existing occupied table, using it');
    await existingOccupiedTable.click();
    
    // Wait for occupied table details panel to appear
    await page.waitForTimeout(2000);
    
    // Look for "Add Order" button using test ID - more reliable
    const addOrderButton = page.locator('[data-testid="add-order-button"]').first();
    if (await addOrderButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Found Add Order button, clicking to navigate to POS interface');
      await addOrderButton.click();
      
      // Wait for POS interface with longer timeout
      await page.waitForTimeout(2000);
      
      // Check multiple possible selectors for the POS interface
      const posInterface = page.locator('[data-testid="pos-interface"]')
        .or(page.locator('.product-catalog'))
        .or(page.locator('.product-grid'))
        .or(page.locator('h2:has-text("Products")'));
        
      if (await posInterface.isVisible({ timeout: 8000 }).catch(() => false)) {
        console.log('✅ POS interface detected, waiting for products');
        
        // Wait specifically for products to load, or handle mobile category selection
        const productElements = page.locator('[data-product-id]');
        if (await productElements.first().isVisible({ timeout: 8000 }).catch(() => false)) {
          console.log('✅ Products loaded successfully via existing table');
          return;
        } else {
          console.log('⚠️ Products not immediately visible, checking for mobile category view');
          
          // Check if we're on mobile category selection screen
          const categoryButtons = page.locator('text="Drink"').or(page.locator('text="Food"')).or(page.locator('text="Golf"'));
          if (await categoryButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('✅ Mobile category selection detected, clicking first category');
            await categoryButtons.first().click();
            
            // Wait for products to load after category selection
            if (await productElements.first().isVisible({ timeout: 8000 }).catch(() => false)) {
              console.log('✅ Products loaded after category selection');
              return;
            }
          }
          
          // Final fallback - check for product grid container
          if (await page.locator('.product-grid').isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('✅ Product grid container found');
            return;
          }
        }
      }
    }
  }
  
  console.log('🔧 No occupied tables found, creating one via API...');
  
  // If no occupied table exists, create one via API (more reliable)
  const currentUrl = page.url();
  const baseUrl = new URL(currentUrl).origin;
  
  try {
    // Open Bar 1 via API since we know this works
    const response = await fetch(`${baseUrl}/api/pos/tables/95fe84e5-125e-49d6-a5a0-7a6dbb42afa5/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffPin: staffPin,
        paxCount: 2,
        notes: 'Test table session for E2E testing'
      })
    });
    
    if (response.ok) {
      console.log('✅ Successfully opened table via API');
      
      // Refresh the page to show the newly occupied table
      await page.reload();
      await waitForPOSReady(page);
      
      // Now look for the occupied table with better selectors
      const occupiedTable = page.locator('[data-testid="table-select-button"]').first()
        .or(page.locator('[data-testid="table-card"][data-table-status="occupied"]').first());
        
      if (await occupiedTable.isVisible({ timeout: 8000 }).catch(() => false)) {
        console.log('✅ Found API-created occupied table, clicking it');
        await occupiedTable.click();
        
        // Wait for occupied table details panel to appear with more time
        await page.waitForTimeout(2000);
        
        // Look for order button using test ID
        const addOrderButton = page.locator('[data-testid="add-order-button"]').first();
        if (await addOrderButton.isVisible({ timeout: 8000 }).catch(() => false)) {
          console.log('✅ Found Add Order button, navigating to POS interface');
          await addOrderButton.click();
          
          // Wait for navigation with more time
          await page.waitForTimeout(3000);
          
          // Check for POS interface with multiple selectors and wait for products to load
          const posInterface = page.locator('[data-testid="pos-interface"]')
            .or(page.locator('.product-catalog'))
            .or(page.locator('.product-grid'))
            .or(page.locator('h2:has-text("Products")'));
            
          if (await posInterface.isVisible({ timeout: 10000 }).catch(() => false)) {
            console.log('✅ POS interface detected, waiting for products to load');
            
            // Wait specifically for products to be visible with data-product-id
            const productElements = page.locator('[data-product-id]');
            if (await productElements.first().isVisible({ timeout: 10000 }).catch(() => false)) {
              console.log('✅ Products loaded successfully, POS interface ready');
              return;
            } else {
              console.log('⚠️ Products not immediately visible, checking for mobile category selection');
              
              // Handle mobile category selection flow
              const categoryButtons = page.locator('text="Drink"').or(page.locator('text="Food"')).or(page.locator('text="Golf"'));
              if (await categoryButtons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('✅ Mobile categories found, clicking first category');
                await categoryButtons.first().click();
                
                // Wait for products after category selection
                if (await productElements.first().isVisible({ timeout: 10000 }).catch(() => false)) {
                  console.log('✅ Products loaded after category selection');
                  return;
                }
              }
              
              // Final fallback - check for product grid container
              if (await page.locator('.product-grid').isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('✅ Product grid container found');
                return;
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️ API table opening failed, trying UI approach:', error);
  }
  
  // Fallback to UI approach if API fails
  console.log('🔄 Falling back to UI table opening...');
  const openTableButton = page.locator('[data-testid="table-open-button"]').first()
    .or(page.locator('[data-testid="table-card"][data-table-status="available"]').first());
  if (await openTableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('✅ Found table to open, clicking it');
    await openTableButton.click();
    
    // Handle modal and continue with original logic...
    const modal = page.locator('[data-testid="table-detail-modal"]').first();
    if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Table detail modal opened');
      
      // For bay tables, we might need to select a booking first
      const bookingSelector = page.locator('[data-testid="booking-selector"]').first();
      if (await bookingSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('✅ Found booking selector, clicking first booking');
        await bookingSelector.click();
        await page.waitForTimeout(1000);
      }
      
      // Fill staff PIN if needed
      const staffPinInput = page.locator('input[type="text"]').or(page.locator('input[type="password"]')).first();
      if (await staffPinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await staffPinInput.fill(staffPin);
      }
      
      const openButton = page.locator('[data-testid="open-table-button"]').first();
      if (await openButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await openButton.click({ force: true });
        console.log('✅ Clicked Open Table button in modal');
        
        // Wait for modal to close and table to open
        await modal.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {
          console.log('⚠️ Modal did not close as expected');
        });
        
        // Wait a bit more for table to be opened
        await page.waitForTimeout(2000);
        
        // Check if we successfully navigated to POS interface
        const posInterface = page.locator('[data-testid="pos-interface"]')
          .or(page.locator('.product-catalog'))
          .or(page.locator('.product-grid'));
          
        if (await posInterface.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('✅ POS interface detected via UI, checking for products');
          
          // Wait for products to load
          const productElements = page.locator('[data-product-id]');
          if (await productElements.first().isVisible({ timeout: 10000 }).catch(() => false)) {
            console.log('✅ Products loaded successfully via UI path');
            return;
          } else {
            console.log('✅ UI navigation successful, product grid should be available');
            return; // Proceed even if products aren't immediately visible
          }
        }
      }
    }
  }
  
  throw new Error('Could not find or open a table to access POS interface. Please check if tables are available and POS system is working.');
}

/**
 * Helper function to navigate to product catalog
 */
export async function navigateToProductCatalog(page: Page) {
  // If we're in table management, open a table first
  const tableCard = page.locator('[data-testid="table-card"]').first();
  if (await tableCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openTestTable(page);
  }
  
  // Wait for product catalog to be visible
  await expect(page.locator('[data-testid="product-catalog"]')).toBeVisible({ timeout: 10000 });
}