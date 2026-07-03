import { test, expect, type Page } from "@playwright/test";

// Test fixtures
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Test User",
};

const TEST_TASK = {
  name: "Test Task from E2E",
  description: "This is a test task created from E2E tests",
  priority: "high" as const,
};

// Helper functions
async function registerUser(page: Page, user: typeof TEST_USER) {
  await page.goto("/register");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
}

test.describe("Task Management Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Register a new user for each test
    await registerUser(page, TEST_USER);
    await page.waitForURL(/\/$/); // Wait for redirect to home
  });

  test("should create a new task", async ({ page }) => {
    // Click the new task button
    await page.click('button:has-text("New Task")');

    // Fill in task details
    await page.fill('input[placeholder="What needs to be done?"]', TEST_TASK.name);
    await page.fill('textarea[placeholder="Add details..."]', TEST_TASK.description);

    // Select priority
    await page.click('select'); // Open priority dropdown
    await page.selectOption('select', TEST_TASK.priority);

    // Save the task
    await page.click('button:has-text("Create Task")');

    // Verify task appears in the list
    await expect(page.getByText(TEST_TASK.name)).toBeVisible();
  });

  test("should complete a task", async ({ page }) => {
    // Create a task first
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Task to complete");
    await page.click('button:has-text("Create Task")');

    // Wait for task to appear
    await page.waitForSelector('text="Task to complete"');

    // Click on the task to open it
    await page.click('text="Task to complete"');

    // Mark as completed
    await page.check('input[type="checkbox"]');

    // Verify it's marked as completed (should be in completed section or struck through)
    await expect(page.locator('text="Task to complete"')).toHaveClass(/line-through/);
  });

  test("should search tasks", async ({ page }) => {
    // Create multiple tasks
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("New Task")');
      await page.fill('input[placeholder="What needs to be done?"]', `Searchable Task ${i}`);
      await page.click('button:has-text("Create Task")');
      await page.waitForTimeout(500);
    }

    // Search for a specific task
    await page.fill('input[placeholder*="Search"]', "Searchable Task 2");

    // Verify only matching task is shown
    await expect(page.getByText("Searchable Task 2")).toBeVisible();
    await expect(page.getByText("Searchable Task 0")).toBeHidden();
    await expect(page.getByText("Searchable Task 1")).toBeHidden();
  });

  test("should filter by priority", async ({ page }) => {
    // Create tasks with different priorities
    const priorities = ["critical", "high", "medium", "low"];

    for (const priority of priorities) {
      await page.click('button:has-text("New Task")');
      await page.fill('input[placeholder="What needs to be done?"]', `Task ${priority}`);
      await page.selectOption('select', priority);
      await page.click('button:has-text("Create Task")');
      await page.waitForTimeout(300);
    }

    // Filter by high priority
    await page.click('div[data-state="closed"]'); // Close any open menus
    await page.click('button:has-text("Priority")'); // Open priority filter
    await page.click('text="High"');

    // Verify only high priority tasks shown
    await expect(page.getByText("Task high")).toBeVisible();
    await expect(page.getByText("Task medium")).toBeHidden();
  });

  test("should use keyboard shortcuts", async ({ page }) => {
    // Press "/" to focus search
    await page.keyboard.press("/");
    await expect(page.locator('input[placeholder*="Search"]')).toBeFocused();

    // Type a task name
    await page.type('input[placeholder*="Search"]', "Test");

    // Press Escape to clear
    await page.keyboard.press("Escape");
    await expect(page.locator('input[placeholder*="Search"]')).toHaveValue("");
  });

  test("should navigate between views", async ({ page }) => {
    // Navigate to Kanban
    await page.click('button:has-text("Kanban Board")');
    await expect(page.locator("svg")).toBeVisible(); // Kanban board visualization

    // Navigate to Analytics
    await page.click('button:has-text("Analytics")');
    await expect(page.getByText("Completion Rate")).toBeVisible();

    // Navigate to Calendar
    await page.click('button:has-text("Calendar")');
    await expect(page.locator("text=Calendar")).toBeVisible();
  });
});

test.describe("Authentication Flow", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("should show login page with all elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create an Account" })).toBeVisible();
  });

  test("should validate login form", async ({ page }) => {
    await page.goto("/login");

    // Try to submit empty form
    await page.click('button:has-text("Sign In")');

    // Should show validation error
    await expect(page.getByText("Invalid email")).toBeVisible();
  });
});

test.describe("Responsive Design", () => {
  test("should show mobile sidebar on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Register user
    await registerUser(page, TEST_USER);

    // Mobile sidebar should be visible
    await expect(page.locator("button[aria-label*=\"menu\"]")).toBeVisible();
  });

  test("should show desktop sidebar on large screens", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    // Register user
    await registerUser(page, TEST_USER);

    // Desktop sidebar should be visible
    await expect(page.locator("nav")).toBeVisible();
  });
});