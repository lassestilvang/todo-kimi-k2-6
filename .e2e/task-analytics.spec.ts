import { test, expect } from '@playwright/test';

test.describe('Task Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display analytics section', async ({ page }) => {
    await expect(page.getByText('Task Analytics')).toBeVisible();
  });

  test('should show completion trend', async ({ page }) => {
    await expect(page.getByText('Completion Trend (7d)')).toBeVisible();
  });

  test('should show priority distribution', async ({ page }) => {
    await expect(page.getByText('Priority Distribution')).toBeVisible();
  });

  test('should show time tracking', async ({ page }) => {
    await expect(page.getByText('Time Tracking')).toBeVisible();
  });
});

test.describe('Dependency Graph', () => {
  test('should display dependency graph view', async ({ page }) => {
    await page.click('button:has(LayoutGrid)');
    await page.click('button:has(LayoutGrid)'); // Click again for graph view
    await expect(page.getByText('Task Dependencies')).toBeVisible();
  });

  test('should show blocked tasks count', async ({ page }) => {
    await page.click('button:has(LayoutGrid)');
    await page.click('button:has(LayoutGrid)');
    await expect(page.getByText(/blocked task/)).toBeVisible();
  });
});

test.describe('Bulk Operations', () => {
  test('should show bulk actions when tasks selected', async ({ page }) => {
    // Create a task first
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Bulk Test Task');
    await page.click('button:text("Create Task")');

    // Select the task
    await page.keyboard.press('x');

    // Bulk actions should appear
    await expect(page.getByRole('button', { name: /Bulk/ })).toBeVisible();
  });
});