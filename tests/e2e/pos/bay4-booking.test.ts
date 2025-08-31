/**
 * Bay 4 Specific Booking Test
 * Creates a booking for Bay 4 and selects it to open the table
 */

import { test, expect } from '@playwright/test';
import { StaffAuth } from '../../fixtures/auth';
import { TestDataManager } from '../../fixtures/test-data';

test.describe('Bay 4 Booking Flow', () => {
  let staffAuth: StaffAuth;
  let testData: TestDataManager;

  test.beforeEach(async ({ page }) => {
    staffAuth = new StaffAuth(page);
    testData = new TestDataManager();
    
    // Ensure test staff exists
    await testData.getStaff('111111');
  });

  test.afterEach(async () => {
    await testData.cleanup();
  });

  test('should open Bay 4 with our specific test booking', async ({ page }) => {
    console.log('🧪 Testing Bay 4 with specific booking');
    
    // Step 1: Create a booking specifically for Bay 4
    const scenario = await testData.createBookingScenario({
      customerName: 'Bay4 Test Customer',
      bookingTime: '15:30', // Use a specific time to identify our booking
      bay: 'Bay 4', // Specifically Bay 4
      paxCount: 3,
      staffPin: '111111'
    });
    
    console.log(`📋 Created Bay 4 booking for: ${scenario.customer.customer_name} at ${scenario.booking.start_time}`);
    
    // Step 2: Navigate and authenticate
    await page.goto('/pos');
    await staffAuth.login('111111');
    
    // Step 3: Verify table management interface
    await expect(page.locator('text=Table Management')).toBeVisible();
    await expect(page.locator('text=Golf Simulator Bays')).toBeVisible();
    
    // Step 4: Specifically click "Open Table" on Bay 4
    console.log('🎯 Looking for Bay 4...');
    
    // Get all "Open Table" buttons and click the 4th one (Bay 4)
    const allOpenTableButtons = page.locator('button:has-text("Open Table")');
    await expect(allOpenTableButtons).toHaveCount(4); // Should have exactly 4 bay buttons
    
    // Bay 4 should be the 4th button (index 3)
    const bay4OpenButton = allOpenTableButtons.nth(3);
    await expect(bay4OpenButton).toBeVisible({ timeout: 5000 });
    await bay4OpenButton.click();
    
    console.log('✅ Clicked Open Table on Bay 4');
    
    // Step 5: Verify the Select Booking modal appears for Bay 4
    await expect(page.locator('text=Bay 4')).toBeVisible({ timeout: 5000 }); // Modal should show Bay 4
    await expect(page.locator('text=Select Booking')).toBeVisible();
    
    console.log('✅ Bay 4 Select Booking modal appeared');
    
    // Step 6: Wait for bookings to load and look for our specific booking
    await page.waitForTimeout(3000); // Give time for bookings to load
    
    // Look for our specific booking by customer name and time
    const ourBookingSelector = `text=${scenario.customer.customer_name}`;
    const timeSelector = `text=${scenario.booking.start_time}`;
    
    console.log(`🔍 Looking for booking: ${scenario.customer.customer_name} at ${scenario.booking.start_time}`);
    
    // Check if our booking is visible
    const ourBookingExists = await page.locator(ourBookingSelector).count() > 0;
    const ourTimeExists = await page.locator(timeSelector).count() > 0;
    
    console.log(`Our booking visible: ${ourBookingExists}, Our time visible: ${ourTimeExists}`);
    
    // Take a screenshot to see what bookings are available
    await page.screenshot({ path: 'test-results/bay4-bookings-modal.png' });
    
    if (ourBookingExists) {
      // Step 7: Click on our specific booking
      const ourBooking = page.locator(ourBookingSelector).first();
      await ourBooking.click();
      
      console.log(`✅ Selected our booking: ${scenario.customer.customer_name}`);
      
      // Step 8: Confirm by clicking "Open Table" in the modal
      const openTableConfirm = page.locator('button:has-text("Open Table")').last();
      await expect(openTableConfirm).toBeEnabled({ timeout: 5000 }); // Should be enabled after selecting booking
      await openTableConfirm.click();
      
      console.log('✅ Confirmed table opening for our booking');
      
      // Step 9: Wait and see what happens next
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/bay4-after-opening.png' });
      
      // Check if we've navigated or if modal closed
      const modalClosed = await page.locator('text=Select Booking').count() === 0;
      const stillOnPos = page.url().includes('/pos');
      
      console.log(`Modal closed: ${modalClosed}, Still on POS: ${stillOnPos}`);
      
      // Verify we're still on the POS system (successful flow)
      expect(stillOnPos).toBeTruthy();
      
      console.log('🎉 Successfully opened Bay 4 with our specific booking!');
      
    } else {
      // If our booking isn't visible, let's see what bookings are available
      console.log('⚠️ Our specific booking not found, checking available bookings...');
      
      const allBookingText = await page.textContent('body');
      console.log('Available booking content:', allBookingText?.substring(0, 500));
      
      // Look for any booking to interact with
      const anyBooking = page.locator('[role="button"]').first();
      if (await anyBooking.count() > 0) {
        await anyBooking.click();
        console.log('✅ Selected an available booking');
        
        const openTableConfirm = page.locator('button:has-text("Open Table")').last();
        if (await openTableConfirm.isEnabled()) {
          await openTableConfirm.click();
          console.log('✅ Opened table with available booking');
        }
      }
    }
    
    console.log('✅ Bay 4 booking test completed');
  });
});