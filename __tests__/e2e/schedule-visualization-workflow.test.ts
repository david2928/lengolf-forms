/**
 * End-to-End tests for schedule visualization workflow
 */

import { test, expect, Page } from '@playwright/test'

// Test data
const testScheduleData = [
  {
    id: 'e2e-schedule-1',
    staff_id: 'staff-1',
    staff_name: 'John Doe',
    start_time: '10:00',
    end_time: '12:00',
    schedule_date: '2024-01-15',
    location: 'Main Floor',
    is_recurring: false
  },
  {
    id: 'e2e-schedule-2',
    staff_id: 'staff-2',
    staff_name: 'Jane Smith',
    start_time: '14:00',
    end_time: '16:00',
    schedule_date: '2024-01-16',
    location: 'Second Floor',
    is_recurring: true
  }
]

// Helper functions
async function setupTestData(page: Page) {
  // Mock API responses
  await page.route('**/api/admin/staff-scheduling/schedules', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ schedules: testScheduleData })
    })
  })

  await page.route('**/api/admin/staff-scheduling/staff', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        staff: [
          { id: 'staff-1', name: 'John Doe' },
          { id: 'staff-2', name: 'Jane Smith' }
        ]
      })
    })
  })
}

async function navigateToSchedulePage(page: Page) {
  await page.goto('/admin/staff-scheduling')
  await page.waitForLoadState('networkidle')
}

async function waitForVisualizationToLoad(page: Page) {
  await page.waitForSelector('[role="grid"]', { state: 'visible' })
  await page.waitForSelector('[data-testid="schedule-visualization"]', { state: 'visible' })
}

test.describe('Schedule Visualization E2E Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData(page)
  })

  test('should load and display schedule visualization', async ({ page }) => {
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    // Check that the grid is rendered
    const grid = page.locator('[role="grid"]')
    await expect(grid).toBeVisible()

    // Check that schedule blocks are rendered
    const scheduleBlocks = page.locator('[role="button"][aria-label*="scheduled"]')
    await expect(scheduleBlocks).toHaveCount(testScheduleData.length)

    // Check that day headers are present
    const dayHeaders = page.locator('[role="columnheader"]')
    await expect(dayHeaders).toHaveCount(7) // 7 days of the week

    // Check that time labels are present
    const timeLabels = page.locator('[role="rowheader"]')
    await expect(timeLabels.first()).toBeVisible()
  })

  test('should display correct schedule information', async ({ page }) => {
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    // Check first schedule block
    const johnSchedule = page.locator('[aria-label*="John Doe"][aria-label*="10:00"][aria-label*="12:00"]')
    await expect(johnSchedule).toBeVisible()

    // Check second schedule block
    const janeSchedule = page.locator('[aria-label*="Jane Smith"][aria-label*="14:00"][aria-label*="16:00"]')
    await expect(janeSchedule).toBeVisible()

    // Check recurring indicator
    const recurringIndicator = page.locator('[title="Recurring schedule"]')
    await expect(recurringIndicator).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    const grid = page.locator('[role="grid"]')
    
    // Focus the grid
    await grid.focus()
    await expect(grid).toBeFocused()

    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowUp')

    // Should not throw errors and maintain focus
    await expect(grid).toBeFocused()

    // Test Enter key
    await page.keyboard.press('Enter')
    
    // Test Escape key
    await page.keyboard.press('Escape')
  })

  test('should be responsive on different screen sizes', async ({ page }) => {
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500) // Allow for responsive changes

    const grid = page.locator('[role="grid"]')
    await expect(grid).toBeVisible()

    // Should have horizontal scrolling on mobile
    const gridStyles = await grid.evaluate(el => window.getComputedStyle(el))
    expect(gridStyles.overflowX).toBe('auto')

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)

    await expect(grid).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(500)

    await expect(grid).toBeVisible()
  })

  test('should handle schedule updates in real-time', async ({ page }) => {
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    // Initial schedule count
    const initialBlocks = page.locator('[role="button"][aria-label*="scheduled"]')
    const initialCount = await initialBlocks.count()

    // Mock adding a new schedule
    await page.route('**/api/admin/staff-scheduling/schedules', async route => {
      const newSchedule = {
        id: 'e2e-schedule-3',
        staff_id: 'staff-1',
        staff_name: 'John Doe',
        start_time: '16:00',
        end_time: '18:00',
        schedule_date: '2024-01-17',
        location: 'Main Floor',
        is_recurring: false
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          schedules: [...testScheduleData, newSchedule] 
        })
      })
    })

    // Simulate adding a schedule (this would typically be done through the admin interface)
    await page.evaluate(() => {
      // Trigger a schedule update event
      window.dispatchEvent(new CustomEvent('scheduleUpdate', {
        detail: { action: 'add', scheduleId: 'e2e-schedule-3' }
      }))
    })

    // Wait for the new schedule to appear
    await page.waitForTimeout(1000)
    
    const updatedBlocks = page.locator('[role="button"][aria-label*="scheduled"]')
    await expect(updatedBlocks).toHaveCount(initialCount + 1)
  })

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/admin/staff-scheduling/schedules', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ schedules: testScheduleData })
      })
    })

    await navigateToSchedulePage(page)

    // Should show loading state
    const loadingIndicator = page.locator('[data-testid="loading-skeleton"]')
    await expect(loadingIndicator).toBeVisible()

    // Wait for data to load
    await waitForVisualizationToLoad(page)

    // Loading state should be gone
    await expect(loadingIndicator).not.toBeVisible()

    // Content should be visible
    const grid = page.locator('[role="grid"]')
    await expect(grid).toBeVisible()
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/admin/staff-scheduling/schedules', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await navigateToSchedulePage(page)

    // Should show error state
    const errorMessage = page.locator('[data-testid="error-display"]')
    await expect(errorMessage).toBeVisible()

    // Should have retry button
    const retryButton = page.locator('[data-testid="retry-button"]')
    await expect(retryButton).toBeVisible()

    // Mock successful retry
    await page.route('**/api/admin/staff-scheduling/schedules', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ schedules: testScheduleData })
      })
    })

    // Click retry
    await retryButton.click()

    // Should load successfully
    await waitForVisualizationToLoad(page)
    const grid = page.locator('[role="grid"]')
    await expect(grid).toBeVisible()
  })

  test('should maintain accessibility standards', async ({ page }) => {
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    // Check ARIA labels
    const grid = page.locator('[role="grid"]')
    await expect(grid).toHaveAttribute('aria-label')

    const scheduleBlocks = page.locator('[role="button"][aria-label*="scheduled"]')
    const firstBlock = scheduleBlocks.first()
    await expect(firstBlock).toHaveAttribute('aria-label')

    // Check keyboard accessibility
    await firstBlock.focus()
    await expect(firstBlock).toBeFocused()

    // Check color contrast (basic check)
    const blockStyles = await firstBlock.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      }
    })

    expect(blockStyles.backgroundColor).toBeTruthy()
    expect(blockStyles.color).toBeTruthy()
  })

  test('should work with touch interactions on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('Skipping touch test on non-mobile browser')
    }

    await page.setViewportSize({ width: 375, height: 667 })
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    const grid = page.locator('[role="grid"]')
    
    // Test horizontal scrolling with touch
    const gridBounds = await grid.boundingBox()
    if (gridBounds) {
      // Swipe left
      await page.touchscreen.tap(gridBounds.x + gridBounds.width / 2, gridBounds.y + gridBounds.height / 2)
      await page.touchscreen.tap(gridBounds.x + 100, gridBounds.y + gridBounds.height / 2)
    }

    // Should still be visible and functional
    await expect(grid).toBeVisible()

    // Test tapping on schedule blocks
    const scheduleBlock = page.locator('[role="button"][aria-label*="scheduled"]').first()
    await scheduleBlock.tap()

    // Should handle touch interaction
    await expect(scheduleBlock).toBeVisible()
  })

  test('should integrate with admin schedule grid', async ({ page }) => {
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    // Both admin grid and visualization should be present
    const adminGrid = page.locator('[data-testid="admin-schedule-grid"]')
    const visualization = page.locator('[data-testid="schedule-visualization"]')

    await expect(adminGrid).toBeVisible()
    await expect(visualization).toBeVisible()

    // They should show consistent data
    const adminScheduleCount = await page.locator('[data-testid="admin-schedule-row"]').count()
    const visualizationScheduleCount = await page.locator('[role="button"][aria-label*="scheduled"]').count()

    expect(visualizationScheduleCount).toBe(adminScheduleCount)
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    // Generate large dataset
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: `large-schedule-${i}`,
      staff_id: `staff-${i % 10}`,
      staff_name: `Staff Member ${i % 10}`,
      start_time: `${10 + (i % 12)}:00`,
      end_time: `${12 + (i % 12)}:00`,
      schedule_date: `2024-01-${15 + (i % 7)}`,
      location: `Location ${i % 5}`,
      is_recurring: i % 3 === 0
    }))

    await page.route('**/api/admin/staff-scheduling/schedules', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ schedules: largeDataset })
      })
    })

    const startTime = Date.now()
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)
    const loadTime = Date.now() - startTime

    // Should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000)

    // Should render all schedules
    const scheduleBlocks = page.locator('[role="button"][aria-label*="scheduled"]')
    const blockCount = await scheduleBlocks.count()
    expect(blockCount).toBe(largeDataset.length)

    // Should remain responsive
    const grid = page.locator('[role="grid"]')
    await grid.focus()
    await page.keyboard.press('ArrowRight')
    
    // Should not freeze
    await expect(grid).toBeFocused()
  })
})

test.describe('Cross-browser Compatibility', () => {
  test('should work in Chrome', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test')
    
    await setupTestData(page)
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    const grid = page.locator('[role="grid"]')
    await expect(grid).toBeVisible()
  })

  test('should work in Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test')
    
    await setupTestData(page)
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    const grid = page.locator('[role="grid"]')
    await expect(grid).toBeVisible()
  })

  test('should work in Safari', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test')
    
    await setupTestData(page)
    await navigateToSchedulePage(page)
    await waitForVisualizationToLoad(page)

    const grid = page.locator('[role="grid"]')
    await expect(grid).toBeVisible()
  })
})