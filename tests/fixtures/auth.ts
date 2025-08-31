/**
 * Authentication fixtures for Playwright tests
 * Handles staff PIN authentication for POS system testing
 */

import { Page, expect } from '@playwright/test';
import { waitForElement } from '../utils/helpers';

/**
 * Staff authentication helper
 */
export class StaffAuth {
  constructor(private page: Page) {}

  /**
   * Login with staff PIN
   */
  async login(pin: string = '111111'): Promise<void> {
    console.log(`🔐 Logging in with PIN: ${pin}`);

    // Navigate to POS if not already there
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/pos')) {
      await this.page.goto('/pos');
    }

    // Wait for POS Staff Login screen to appear
    await expect(this.page.locator('text=POS Staff Login')).toBeVisible({ timeout: 15000 });
    
    // Enter PIN digit by digit using the number pad
    for (let i = 0; i < pin.length; i++) {
      const digit = pin[i];
      const digitButton = this.page.locator(`button:has-text("${digit}")`).first();
      await digitButton.click();
      await this.page.waitForTimeout(100); // Small delay between clicks
    }

    // Wait a moment for the PIN to be processed
    await this.page.waitForTimeout(1000);

    // Wait for successful authentication - look for elements that indicate we're past login
    // The login should automatically proceed after entering 6 digits
    await expect(this.page.locator('text=POS Staff Login')).not.toBeVisible({ timeout: 10000 });
    
    console.log('✅ Staff login successful');
  }

  /**
   * Logout from staff session
   */
  async logout(): Promise<void> {
    console.log('🚪 Logging out staff session...');

    // Look for logout button in header or menu
    const logoutButton = this.page.locator('[data-testid="logout-button"], button:has-text("Logout")');
    
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
    } else {
      // Fallback: clear session by navigating away and back
      await this.page.goto('/');
      await this.page.goto('/pos');
    }

    // Verify we're back to login screen
    await expect(this.page.locator('[data-testid="staff-login-modal"]')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Staff logout successful');
  }

  /**
   * Check if currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const loginScreen = this.page.locator('text=POS Staff Login');
      
      await this.page.waitForTimeout(1000); // Brief wait for page state
      
      const isLoginVisible = await loginScreen.isVisible();
      
      // If login screen is not visible, we're likely authenticated
      return !isLoginVisible;
    } catch {
      return false;
    }
  }

  /**
   * Ensure authentication (login if not already authenticated)
   */
  async ensureAuthenticated(pin: string = '111111'): Promise<void> {
    const isAuth = await this.isAuthenticated();
    
    if (!isAuth) {
      await this.login(pin);
    } else {
      console.log('✅ Already authenticated');
    }
  }
}