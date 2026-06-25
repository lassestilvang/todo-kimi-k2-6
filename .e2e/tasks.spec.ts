import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the application', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Test Task');
    await page.click('button:text("Create Task")');
    await expect(page.getByText('Test Task')).toBeVisible();
  });

  test('should toggle task completion', async ({ page }) => {
    // Create a task
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Toggle Task');
    await page.click('button:text("Create Task")');

    // Complete the task
    await page.check('[data-state="unchecked"]');
    await expect(page.getByText('Toggle Task')).toHaveClass(/opacity-60/);

    // Uncomplete the task
    await page.check('[data-state="checked"]');
    await expect(page.getByText('Toggle Task')).not.toHaveClass(/opacity-60/);
  });

  test('should delete a task', async ({ page }) => {
    // Create a task
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Delete Task');
    await page.click('button:text("Create Task")');
    await expect(page.getByText('Delete Task')).toBeVisible();

    // Delete the task
    await page.hover('text=Delete Task');
    await page.click('button:has(Trash2)');
    await expect(page.getByText('Delete Task')).not.toBeVisible();
  });

  test('should search tasks', async ({ page }) => {
    // Create a task
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Searchable Task');
    await page.click('button:text("Create Task")');

    // Search for the task
    await page.fill('input[placeholder="Search tasks... (/)"]', 'Searchable');
    await expect(page.getByText('Searchable Task')).toBeVisible();
  });

  test('should switch between views', async ({ page }) => {
    await page.click('button:has(Calendar)');
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();

    await page.click('button:has(LayoutGrid)');
    await expect(page.getByRole('heading', { name: 'All Tasks' })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate between views', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);

    // Test sidebar navigation
    await page.click('button:has(Calendar)');
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  });

  test('should open and close mobile menu', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 400, height: 600 });
    await page.click('button:has(Menu)');
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('should open task creation with keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Meta+n');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should focus search with slash', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('/');
    await expect(page.locator('input[placeholder="Search tasks..."]')).toBeFocused();
  });
});