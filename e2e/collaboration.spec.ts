import { test, expect, type Page } from '@playwright/test';

const TEST_USER = {
  email: `collab-test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Collab Test User',
};

async function registerUser(page: Page) {
  await page.goto('/register');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[name="name"]', TEST_USER.name);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
}

test.describe('Collaboration Features', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test('should create a task', async ({ page }) => {
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Collab Task'
    );
    await page.click('button:has-text("Create Task")');

    await expect(page.getByText('Collab Task')).toBeVisible();
  });

  test('should open task comments tab', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Comment Task'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Comment Task"');

    // Open comments tab
    await page.click('button:has-text("Comments")');

    await expect(
      page.locator('textarea[placeholder*="comment"], .comment-input')
    ).toBeVisible();
  });

  test('should add a comment to task', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Task with Comments'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Task with Comments"');

    // Open comments tab
    await page.click('button:has-text("Comments")');

    // Add a comment
    await page.fill(
      'textarea[placeholder*="comment"]',
      'This is a test comment'
    );
    await page.click('button:has-text("Add Comment"), button[type="submit"]');

    await expect(page.getByText('This is a test comment')).toBeVisible();
  });

  test('should share a task', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Shareable Task'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Shareable Task"');

    // Open share tab
    await page.click('button:has-text("Share")');

    // Generate share link
    await page.click('button:has-text("Generate Link")');

    await expect(
      page.locator('input[placeholder*="share"], .share-link')
    ).toBeVisible();
  });

  test('should set share permissions', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Permission Task'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Permission Task"');

    // Open share tab
    await page.click('button:has-text("Share")');

    // Set permissions
    await page.selectOption('select[name="permission"]', 'edit');
    await page.click('button:has-text("Generate Link")');

    await expect(
      page.locator('input[placeholder*="share"], .share-link')
    ).toBeVisible();
  });

  test('should view task activity log', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Activity Log Task'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Activity Log Task"');

    // Open activity tab
    await page.click('button:has-text("Activity")');

    await expect(page.locator('.activity-log, [role="log"]')).toBeVisible();
  });

  test('should see activity after editing task', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Edit Activity Task'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Edit Activity Task"');

    // Edit the task
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Edit Activity Task Updated'
    );
    await page.click('button:has-text("Save")');

    // Open activity tab
    await page.click('button:has-text("Activity")');

    await expect(page.getByText('updated')).toBeVisible();
  });

  test('should handle task assignment', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Assignment Task'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Assignment Task"');

    // Open assignees tab
    await page.click('button:has-text("Assignees")');

    await expect(
      page.locator('input[placeholder*="assign"], .assignee-search')
    ).toBeVisible();
  });

  test('should collaborate on comments', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill(
      'input[placeholder="What needs to be done?"]',
      'Collaboration Task'
    );
    await page.click('button:has-text("Create Task")');

    // Open the task
    await page.click('text="Collaboration Task"');

    // Open comments tab
    await page.click('button:has-text("Comments")');

    // Add first comment
    await page.fill('textarea[placeholder*="comment"]', 'First comment');
    await page.click('button:has-text("Add Comment"), button[type="submit"]');

    // Add reply
    await page.click('button:has-text("Reply")');
    await page.fill('textarea[placeholder*="comment"]', 'This is a reply');
    await page.click('button:has-text("Add Comment"), button[type="submit"]');

    await expect(page.getByText('First comment')).toBeVisible();
    await expect(page.getByText('This is a reply')).toBeVisible();
  });
});
