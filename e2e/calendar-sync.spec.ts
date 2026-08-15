import { test, expect, type Page } from '@playwright/test';

const TEST_USER = {
  email: `calendar-test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Calendar Test User',
};

async function registerUser(page: Page) {
  await page.goto('/register');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[name="name"]', TEST_USER.name);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
}

test.describe('Calendar Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test('should open calendar view', async ({ page }) => {
    await page.click('button:has-text("Calendar")');

    await expect(page.locator('.calendar, [role="grid"]')).toBeVisible();
  });

  test('should display tasks on calendar dates', async ({ page }) => {
    // Create a task with a date
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Calendar Task'
    );
    await page.fill('input[type="date"]', '2024-06-15');
    await page.click('button:has-text("Create Task")');

    // Navigate to calendar
    await page.click('button:has-text("Calendar")');

    await expect(page.getByText('Calendar Task')).toBeVisible();
  });

  test('should show task details on date click', async ({ page }) => {
    // Create a task with a date
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Task with Date'
    );
    await page.fill('input[type="date"]', '2024-06-20');
    await page.click('button:has-text("Create Task")');

    // Navigate to calendar
    await page.click('button:has-text("Calendar")');

    // Click on the date
    await page.click('text="20"');

    // Task details should be visible
    await expect(page.getByText('Task with Date')).toBeVisible();
  });

  test('should switch between month, week, day views', async ({ page }) => {
    await page.click('button:has-text("Calendar")');

    // Check for view toggle buttons
    await expect(
      page.locator(
        'button:has-text("Month"), button:has-text("Week"), button:has-text("Day")'
      )
    ).toBeVisible();

    // Switch to week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('.calendar, [role="grid"]')).toBeVisible();

    // Switch to day view
    await page.click('button:has-text("Day")');
    await expect(page.locator('.calendar, [role="grid"]')).toBeVisible();
  });

  test('should navigate between months', async ({ page }) => {
    await page.click('button:has-text("Calendar")');

    // Find month navigation
    await expect(
      page.locator('button[aria-label*="next"], button[aria-label*="Previous"]')
    ).toBeVisible();

    // Navigate to next month
    await page.click('button[aria-label*="next"], .next-month');

    await expect(page.locator('.calendar, [role="grid"]')).toBeVisible();
  });

  test('should create task from calendar', async ({ page }) => {
    await page.click('button:has-text("Calendar")');

    // Click on a date
    await page.click('text="15"');

    // Should open task creation modal
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Quick Task from Calendar'
    );
    await page.click('button:has-text("Create Task")');

    await expect(page.getByText('Quick Task from Calendar')).toBeVisible();
  });

  test('should show deadline events', async ({ page }) => {
    // Create a task with deadline
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Deadline Task'
    );
    await page.fill('input[type="date"]', '2024-07-01');
    await page.click('button:has-text("Create Task")');

    // Navigate to calendar
    await page.click('button:has-text("Calendar")');

    await expect(page.getByText('Deadline Task')).toBeVisible();
  });

  test('should handle recurring tasks in calendar', async ({ page }) => {
    // Create a recurring task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Daily Standup'
    );
    await page.fill('input[type="date"]', '2024-06-01');
    await page.selectOption('select[name="recurring"]', 'daily');
    await page.click('button:has-text("Create Task")');

    // Navigate to calendar
    await page.click('button:has-text("Calendar")');

    await expect(page.getByText('Daily Standup')).toBeVisible();
  });

  test('should show completed tasks differently', async ({ page }) => {
    // Create and complete a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Completed Calendar Task'
    );
    await page.fill('input[type="date"]', '2024-06-10');
    await page.click('button:has-text("Create Task")');

    // Mark as completed
    await page.click('text="Completed Calendar Task"');
    await page.check('input[type="checkbox"]');

    // Navigate to calendar
    await page.click('button:has-text("Calendar")');

    // Completed task should be visible but styled differently
    await expect(page.getByText('Completed Calendar Task')).toBeVisible();
  });
});
