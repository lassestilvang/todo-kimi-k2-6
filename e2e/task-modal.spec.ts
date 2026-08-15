import { test, expect, type Page } from '@playwright/test';

const TEST_USER = {
  email: `modal-test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Modal Test User',
};

async function registerUser(page: Page) {
  await page.goto('/register');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[name="name"]', TEST_USER.name);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
}

test.describe('Task Modal Component', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test('should open task modal when clicking new task button', async ({
    page,
  }) => {
    await page.click('button:has-text("New Task")');
    await expect(page.locator('role=dialog')).toBeVisible();
  });

  test('should create task with all fields', async ({ page }) => {
    await page.click('button:has-text("New Task")');

    // Fill basic info
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Complete Project Report'
    );

    // Fill description
    await page.fill(
      'textarea[placeholder="Add details..."]',
      'Detailed report on Q3 performance'
    );

    // Select priority
    await page.selectOption('select[name="priority"]', 'high');

    // Select list
    await page.selectOption('select[name="list_id"]', 'Work');

    // Add due date
    await page.fill('input[type="date"]', '2024-12-31');

    // Save
    await page.click('button:has-text("Create Task")');

    await expect(page.getByText('Complete Project Report')).toBeVisible();
  });

  test('should cancel modal without saving', async ({ page }) => {
    await page.click('button:has-text("New Task")');

    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'This should not be saved'
    );

    await page.click('button:has-text("Cancel")');

    await expect(page.locator('role=dialog')).not.toBeVisible();
    await expect(page.getByText('This should not be saved')).not.toBeVisible();
  });

  test('should edit existing task', async ({ page }) => {
    // Create a task first
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Task to Edit'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Task to Edit"');

    // Edit the task name
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Task to Edit Updated'
    );

    await page.click('button:has-text("Save")');

    await expect(page.getByText('Task to Edit Updated')).toBeVisible();
  });

  test('should add labels to task', async ({ page }) => {
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Task with Labels'
    );
    await page.click('button:has-text("Create Task")');

    // Open task
    await page.click('text="Task with Labels"');

    // Open labels tab
    await page.click('button:has-text("Labels")');

    // Add a label
    await page.fill('input[placeholder="Search labels"]', 'Urgent');
    await page.press('input[placeholder="Search labels"]', 'Enter');
  });

  test('should add subtasks', async ({ page }) => {
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Task with Subtasks'
    );
    await page.click('button:has-text("Create Task")');

    // Open task
    await page.click('text="Task with Subtasks"');

    // Open subtasks tab
    await page.click('button:has-text("Subtasks")');

    // Add subtasks
    await page.fill('input[placeholder="Add a subtask"]', 'Subtask 1');
    await page.press('input[placeholder="Add a subtask"]', 'Enter');

    await page.fill('input[placeholder="Add a subtask"]', 'Subtask 2');
    await page.press('input[placeholder="Add a subtask"]', 'Enter');

    await expect(page.getByText('Subtask 1')).toBeVisible();
    await expect(page.getByText('Subtask 2')).toBeVisible();
  });

  test('should delete task from modal', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Task to Delete'
    );
    await page.click('button:has-text("Create Task")');

    // Open task
    await page.click('text="Task to Delete"');

    // Open settings menu
    await page.click('button[aria-label="Task settings"]');

    // Delete
    await page.click('text="Delete Task"');

    // Confirm
    await page.click('button:has-text("Delete")');

    await expect(page.getByText('Task to Delete')).not.toBeVisible();
  });
});
