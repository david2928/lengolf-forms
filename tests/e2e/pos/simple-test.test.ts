/**
 * Simple POS test to verify basic setup
 */

import { test, expect } from '@playwright/test';

test.describe('Simple POS Test', () => {
  test('should load POS page', async ({ page }) => {
    console.log('🧪 Testing basic POS page load...');
    
    await page.goto('/pos');
    
    // Look for the actual POS login screen elements we can see in the screenshot
    const hasLoginTitle = await page.locator('text=POS Staff Login').isVisible().catch(() => false);
    const hasEnterPin = await page.locator('text=Enter your 6-digit PIN').isVisible().catch(() => false);
    const hasNumberPad = await page.locator('button:has-text("1")').isVisible().catch(() => false);
    const hasPosContent = await page.locator('[data-testid="pos-content"]').isVisible().catch(() => false);
    
    // Should see either the login screen elements or authenticated POS content
    expect(hasLoginTitle || hasEnterPin || hasNumberPad || hasPosContent).toBeTruthy();
    
    console.log(`✅ POS page loaded - Login title: ${hasLoginTitle}, Enter PIN: ${hasEnterPin}, Number pad: ${hasNumberPad}, POS content: ${hasPosContent}`);
  });
});