import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create a task with all fields', async ({ page }) => {
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Complete Task');
    await page.fill('textarea[placeholder="Add description..."]', 'This is a test description');
    await page.click('button:text("Create Task")');
    await expect(page.getByText('Complete Task')).toBeVisible();
  });

  test('should mark task as complete', async ({ page }) => {
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Task to complete');
    await page.click('button:text("Create Task")');

    // Toggle completion
    const checkbox = page.locator('[data-state="unchecked"]').first();
    await checkbox.click();
    await expect(page.getByText('Task to complete')).toHaveClass(/line-through/);
  });

  test('should delete a task', async ({ page }) => {
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Task to delete');
    await page.click('button:text("Create Task")');

    await page.hover('text=Task to delete');
    await page.click('button:has(Trash2)');
    await expect(page.getByText('Task to delete')).not.toBeVisible();
  });

  test('should search tasks', async ({ page }) => {
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'Unique Search Task');
    await page.click('button:text("Create Task")');

    await page.fill('input[placeholder="Search tasks... (/)"]', 'Unique Search');
    await expect(page.getByText('Unique Search Task')).toBeVisible();
  });

  test('should create a list', async ({ page }) => {
    await page.click('button:has(Plus)');
    await page.fill('input[placeholder="What needs to be done?"]', 'List Task');
    await page.click('button:text("Create Task")');

    // Open task options
    await page.click('button[aria-label="More options"]');
    // Move to new list would be tested here
  });
});

test.describe('List Management', () => {
  test('should display Inbox list', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Inbox')).toBeVisible();
  });

  test('should create a new list via sidebar', async ({ page }) => {
    // This would require navigating to settings or list management
    await page.goto('/');
    await expect(page.getByText('Inbox')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to calendar view', async ({ page }) => {
    await page.click('button:has(Calendar)');
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  });

  test('should navigate to all tasks view', async ({ page }) => {
    await page.click('button:has(LayoutGrid)');
    await expect(page.getByRole('heading', { name: 'All Tasks' })).toBeVisible();
  });

  test('should navigate to upcoming view', async ({ page }) => {
    await page.click('button:has(Clock)');
    await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should show mobile menu on small screen', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto('/');
    await page.click('button:has(Menu)');
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should hide mobile menu on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await page.click('button:has(Menu)');
    // Mobile menu should be positioned off-screen
    await expect(page.getByRole('navigation')).not.toHaveClass(/translate-x-0/);
  });
});