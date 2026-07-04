import { test, expect } from '@playwright/test';

test.describe('Task Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Task Creation Workflows', () => {
    test('should create a task with all fields', async ({ page }) => {
      await page.click('button:has(Plus)');

      // Fill in task details
      await page.fill('input[placeholder="What needs to be done?"]', 'Complete project documentation');
      await page.fill('textarea[placeholder="Add description..."]', 'Write comprehensive documentation for the API');

      // Set priority
      await page.click('button:text("Priority")');
      await page.click('button:text("High")');

      // Create task
      await page.click('button:text("Create Task")');

      await expect(page.getByText('Complete project documentation')).toBeVisible();
    });

    test('should create a task with subtasks', async ({ page }) => {
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Multi-step task');

      // Add subtasks
      await page.click('button:has(Plus)'); // Add subtask button
      await page.fill('input[placeholder="Add subtask..."]', 'Step 1');
      await page.keyboard.press('Enter');
      await page.fill('input[placeholder="Add subtask..."]', 'Step 2');
      await page.keyboard.press('Enter');

      await page.click('button:text("Create Task")');

      await expect(page.getByText('Step 1')).toBeVisible();
      await expect(page.getByText('Step 2')).toBeVisible();
    });

    test('should create tasks with due dates', async ({ page }) => {
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Deadline task');

      // Set due date
      await page.click('button:text("Add date")');
      await page.click('.rdp-day:selected'); // Select today or a date

      await page.click('button:text("Create Task")');

      await expect(page.getByText('Deadline task')).toBeVisible();
    });
  });

  test.describe('Task Editing Workflows', () => {
    test('should edit task name', async ({ page }) => {
      // Create a task first
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Task to edit');
      await page.click('button:text("Create Task")');

      // Edit the task
      await page.dblclick('text=Task to edit');
      await page.fill('input[value="Task to edit"]', 'Edited task name');
      await page.keyboard.press('Enter');

      await expect(page.getByText('Edited task name')).toBeVisible();
    });

    test('should mark task as complete', async ({ page }) => {
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Task to complete');
      await page.click('button:text("Create Task")');

      // Complete the task
      await page.check('[data-state="unchecked"]');
      await expect(page.getByText('Task to complete')).toHaveClass(/line-through/);
    });

    test('should add labels to task', async ({ page }) => {
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Labeled task');
      await page.click('button:text("Create Task")');

      // Add label
      await page.click('text=Labeled task');
      await page.click('button:has(Tag)');
      await page.click('button:text("Add Label")');
      await page.fill('input[placeholder="Label name"]', 'Important');
      await page.keyboard.press('Enter');

      await expect(page.getByRole('button', { name: 'Important' })).toBeVisible();
    });
  });

  test.describe('Task Deletion Workflows', () => {
    test('should delete a task with confirmation', async ({ page }) => {
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Task to delete');
      await page.click('button:text("Create Task")');

      // Delete the task
      await page.hover('text=Task to delete');
      await page.click('button:has(Trash2)');

      // Confirm deletion
      await page.click('button:text("Delete")');

      await expect(page.getByText('Task to delete')).not.toBeVisible();
    });
  });

  test.describe('Search and Filter Workflows', () => {
    test('should search tasks with keyboard shortcut', async ({ page }) => {
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Unique search task');
      await page.click('button:text("Create Task")');

      // Focus search with slash
      await page.keyboard.press('/');
      await page.fill('input[placeholder="Search tasks... (/)"]', 'Unique search');

      await expect(page.getByText('Unique search task')).toBeVisible();
    });

    test('should filter by priority', async ({ page }) => {
      // Create tasks with different priorities
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Critical task');
      await page.click('button:text("Priority")');
      await page.click('button:text("Critical")');
      await page.click('button:text("Create Task")');

      // Filter by priority
      await page.click('button:has(Filter)');
      await page.click('button:text("Critical")');

      await expect(page.getByText('Critical task')).toBeVisible();
    });

    test('should filter by list', async ({ page }) => {
      // Create a list
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Work task');
      await page.click('button:text("Create Task")');

      // Filter by list
      await page.click('button:has(List)');
      await page.click('button:text("Work")');

      await expect(page.getByText('Work task')).toBeVisible();
    });
  });

  test.describe('View Navigation', () => {
    test('should switch to different views', async ({ page }) => {
      // Today view (default)
      await page.click('button:has(Calendar)');
      await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();

      // All tasks view
      await page.click('button:has(LayoutGrid)');
      await expect(page.getByRole('heading', { name: 'All Tasks' })).toBeVisible();

      // Backlog view
      await page.click('button:text("Backlog")');
      await expect(page.getByRole('heading', { name: 'Backlog' })).toBeVisible();
    });
  });

  test.describe('Subtask Management', () => {
    test('should toggle subtask completion', async ({ page }) => {
      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="What needs to be done?"]', 'Task with subtasks');
      await page.keyboard.press('Meta+Shift+s'); // Add subtask shortcut
      await page.fill('input[placeholder="Add subtask..."]', 'Subtask 1');
      await page.keyboard.press('Enter');

      await page.click('button:has(Plus)');
      await page.fill('input[placeholder="Add subtask..."]', 'Subtask 2');
      await page.keyboard.press('Enter');

      await page.click('button:text("Create Task")');

      // Toggle subtask
      await page.check('[data-state="unchecked"]');
      await expect(page.getByText('Subtask 1')).toHaveClass(/line-through/);
    });
  });
});