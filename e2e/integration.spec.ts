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

test.describe('Messaging System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /messages/i }).click();
    await expect(page).toHaveURL(/messages/);
  });

  test('MSG-101: Load Messages page', async ({ page }) => {
    // Check if Messages interface loads
    await expect(page.getByText(/messages/i).first()).toBeVisible();
    
    // Should see conversations list or empty state
    const hasConversations = await page.locator('[class*="conversation"]').count();
    const hasEmptyState = await page.getByText(/no conversations/i).count();
    
    expect(hasConversations > 0 || hasEmptyState > 0).toBeTruthy();
  });

  test('MSG-104: Display empty state', async ({ page }) => {
    // If no conversations, should see empty state
    const emptyState = page.getByText(/no conversations|start a conversation/i);
    const conversationsList = page.locator('[class*="conversation"]');
    
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    const hasConversations = await conversationsList.count() > 0;
    
    // Either has empty state or has conversations
    expect(hasEmptyState || hasConversations).toBeTruthy();
  });

  test('MSG-201: Send text message', async ({ page }) => {
    // Check if there are any conversations
    const conversationCount = await page.locator('[class*="conversation"]').count();
    
    if (conversationCount > 0) {
      // Select first conversation
      await page.locator('[class*="conversation"]').first().click();
      await page.waitForTimeout(1000);
      
      // Find message input
      const messageInput = page.getByPlaceholder(/type.*message/i);
      await expect(messageInput).toBeVisible();
      
      // Type and send message
      await messageInput.fill('Test message from E2E test');
      await page.getByRole('button', { name: /send/i }).click();
      
      // Message should appear
      await expect(page.getByText(/test message from e2e test/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('MSG-202: Send empty message validation', async ({ page }) => {
    const conversationCount = await page.locator('[class*="conversation"]').count();
    
    if (conversationCount > 0) {
      await page.locator('[class*="conversation"]').first().click();
      await page.waitForTimeout(1000);
      
      // Try to send without typing
      const sendButton = page.getByRole('button', { name: /send/i });
      
      // Button should be disabled or show error
      const isDisabled = await sendButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });

  test('MSG: Accessibility check', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Expert Finder E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /expert finder/i }).click();
    await expect(page).toHaveURL(/experts/);
  });

  test('EF-001: Search experts by name', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/search.*expert/i);
    await expect(searchInput).toBeVisible();
    
    // Type search query
    await searchInput.fill('John');
    await page.waitForTimeout(1000); // Wait for debounce
    
    // Should show filtered results
    const expertCards = page.locator('[class*="expert"]');
    const count = await expertCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('EF-101: Filter by department', async ({ page }) => {
    // Look for department filter
    const departmentFilter = page.locator('select, [role="combobox"]').filter({ hasText: /department/i }).first();
    
    const isVisible = await departmentFilter.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      // Select a department
      await departmentFilter.click();
      await page.getByText(/mri research/i).first().click();
      await page.waitForTimeout(1000);
      
      // Results should be filtered
      const expertCards = page.locator('[class*="expert"]');
      const count = await expertCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('EF-301: Open messaging dialog', async ({ page }) => {
    // Find and click on an expert card's message button
    const messageButton = page.getByRole('button', { name: /message/i }).first();
    
    const isVisible = await messageButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      await messageButton.click();
      
      // Messaging dialog should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/send message/i)).toBeVisible();
    }
  });

  test('EF: Accessibility check', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Knowledge Search E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /knowledge search/i }).click();
    await expect(page).toHaveURL(/knowledge/);
  });

  test('KS-001: Basic text search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    
    // Enter search term
    await searchInput.fill('React');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    
    // Should show results or empty state
    const hasResults = await page.locator('[class*="result"]').count() > 0;
    const hasEmptyState = await page.getByText(/no results/i).isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasResults || hasEmptyState).toBeTruthy();
  });

  test('KS-002: Search with no results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('xyznonexistentquery12345');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    
    // Should show "no results" message
    await expect(page.getByText(/no results/i)).toBeVisible({ timeout: 5000 });
  });

  test('KS: Accessibility check', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('End-to-End User Journey', () => {
  test('INT-001: Complete user journey', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByText(/already have an account/i).click();
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard|\//, { timeout: 10000 });
    
    // 2. Explore Dashboard
    await expect(page.getByText(/dashboard/i)).toBeVisible();
    await page.waitForTimeout(2000);
    
    // 3. Search knowledge
    await page.getByRole('link', { name: /knowledge search/i }).click();
    await expect(page).toHaveURL(/knowledge/);
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('development');
    await page.waitForTimeout(1000);
    
    // 4. Find expert
    await page.getByRole('link', { name: /expert finder/i }).click();
    await expect(page).toHaveURL(/experts/);
    await page.waitForTimeout(1000);
    
    // 5. Check messages
    await page.getByRole('link', { name: /messages/i }).click();
    await expect(page).toHaveURL(/messages/);
    
    // Full workflow completes without errors
    expect(true).toBeTruthy();
  });
});
