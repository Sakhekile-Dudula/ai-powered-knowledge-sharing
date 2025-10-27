import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper function to login
async function login(page: any) {
  await page.goto('/');
  await page.getByText(/already have an account/i).click();
  await page.getByPlaceholder(/email/i).fill('test@example.com');
  await page.getByPlaceholder(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard|\//, { timeout: 10000 });
}

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('DASH-001: Dashboard loads successfully', async ({ page }) => {
    // Check if dashboard displays with all widgets
    await expect(page.getByText(/dashboard/i)).toBeVisible();
    await expect(page.getByText(/recent activity/i)).toBeVisible();
    await expect(page.getByText(/suggested connections/i)).toBeVisible();
    await expect(page.getByText(/trending topics/i)).toBeVisible();
  });

  test('DASH-002: Activity feed displays', async ({ page }) => {
    // Wait for activity feed to load
    const activitySection = page.locator('text=Recent Activity').locator('..');
    await expect(activitySection).toBeVisible();
    
    // Check if activities are displayed (or empty state)
    const hasActivities = await page.getByText(/shared|connected|commented/i).count();
    const hasEmptyState = await page.getByText(/no recent activity/i).count();
    
    expect(hasActivities > 0 || hasEmptyState > 0).toBeTruthy();
  });

  test('DASH-004: Quick stats display', async ({ page }) => {
    // Check if stat cards are visible
    await expect(page.getByText(/active connections/i)).toBeVisible();
    await expect(page.getByText(/knowledge items/i)).toBeVisible();
    await expect(page.getByText(/team collaborations/i)).toBeVisible();
    await expect(page.getByText(/hours saved/i)).toBeVisible();
    
    // Stats should have numbers
    const statsNumbers = page.locator('[class*="text-3xl"]');
    await expect(statsNumbers.first()).toBeVisible();
  });

  test('DASH-101: Click on activity item', async ({ page }) => {
    // Look for activity items (clickable)
    const activityItem = page.locator('[role="button"]').filter({ hasText: /shared|connected/i }).first();
    
    const isVisible = await activityItem.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      await activityItem.click();
      
      // Dialog should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    } else {
      // No activities yet - check for empty state
      await expect(page.getByText(/no recent activity/i)).toBeVisible();
    }
  });

  test('DASH-102: Click on suggested expert', async ({ page }) => {
    // Wait for suggested connections section
    await page.waitForTimeout(2000); // Wait for data to load
    
    const expertCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /engineer|developer|scientist/i }).first();
    
    const isVisible = await expertCard.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      // Hover to see details
      await expertCard.hover();
      await page.waitForTimeout(500); // Wait for hover card
      
      // Click to view profile
      await expertCard.click();
      
      // Should navigate or open dialog
      await page.waitForTimeout(1000);
    }
  });

  test('DASH: Accessibility check', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Navigation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('NAV-001: Navigate to Dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/dashboard|\//);
    await expect(page.getByText(/recent activity/i)).toBeVisible();
  });

  test('NAV-002: Navigate to Knowledge Search', async ({ page }) => {
    await page.getByRole('link', { name: /knowledge search/i }).click();
    await expect(page).toHaveURL(/knowledge/);
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('NAV-003: Navigate to Expert Finder', async ({ page }) => {
    await page.getByRole('link', { name: /expert finder/i }).click();
    await expect(page).toHaveURL(/experts/);
  });

  test('NAV-006: Navigate to Messages', async ({ page }) => {
    await page.getByRole('link', { name: /messages/i }).click();
    await expect(page).toHaveURL(/messages/);
  });

  test('NAV-201: Back button functionality', async ({ page }) => {
    // Navigate to Knowledge Search
    await page.getByRole('link', { name: /knowledge search/i }).click();
    await expect(page).toHaveURL(/knowledge/);
    
    // Go back
    await page.goBack();
    
    // Should be back on dashboard
    await expect(page).toHaveURL(/dashboard|\//);
  });
});
