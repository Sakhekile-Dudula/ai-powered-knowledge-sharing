import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('AUTH-001: Successful user registration with valid email', async ({ page }) => {
    // Navigate to auth page (should be default)
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible();

    // Fill in registration form
    await page.getByPlaceholder(/email/i).fill('newuser@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    
    // Select department
    const departmentSelect = page.locator('select').first();
    await departmentSelect.selectOption({ label: 'MRI Research' });
    
    // Click Sign Up
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should redirect to dashboard (or show confirmation)
    await expect(page).toHaveURL(/dashboard|\//, { timeout: 10000 });
  });

  test('AUTH-002: Registration with invalid email format', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('AUTH-003: Registration with weak password', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('123'); // Less than 6 characters
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show error about password requirements
    await expect(page.getByText(/password.*6 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test('AUTH-101: Successful login with valid credentials', async ({ page }) => {
    // Switch to sign in mode
    await page.getByText(/already have an account/i).click();
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Fill in login form
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard|\//, { timeout: 10000 });
  });

  test('AUTH-102: Login with incorrect password', async ({ page }) => {
    await page.getByText(/already have an account/i).click();
    
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid.*credentials/i)).toBeVisible({ timeout: 5000 });
  });

  test('AUTH-105: Toggle between Sign In/Sign Up', async ({ page }) => {
    // Initially on sign up
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();

    // Toggle to sign in
    await page.getByText(/already have an account/i).click();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Toggle back to sign up
    await page.getByText(/don't have an account/i).click();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('AUTH: Accessibility check', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
