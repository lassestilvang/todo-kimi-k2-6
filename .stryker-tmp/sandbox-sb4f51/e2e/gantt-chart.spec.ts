// @ts-nocheck
import { test, expect, type Page } from "@playwright/test";

const TEST_USER = {
  email: `gantt-test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Gantt Test User",
};

async function registerUser(page: Page) {
  await page.goto("/register");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[name="name"]', TEST_USER.name);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
}

test.describe("Gantt Chart Component", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test("should open Gantt chart view", async ({ page }) => {
    // Navigate to Gantt view
    await page.click('button:has-text("Gantt")');

    await expect(page.locator('.gantt-chart, [role="grid"]')).toBeVisible();
  });

  test("should display tasks on timeline", async ({ page }) => {
    // Create tasks with dates
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Project Task 1");
    await page.fill('input[type="date"]', "2024-06-01");
    await page.fill('input[placeholder="Estimate (hours)"]', "8");
    await page.click('button:has-text("Create Task")');

    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Project Task 2");
    await page.fill('input[type="date"]', "2024-06-05");
    await page.fill('input[placeholder="Estimate (hours)"]', "4");
    await page.click('button:has-text("Create Task")');

    // Navigate to Gantt
    await page.click('button:has-text("Gantt")');

    await expect(page.getByText("Project Task 1")).toBeVisible();
    await expect(page.getByText("Project Task 2")).toBeVisible();
  });

  test("should show task dependencies", async ({ page }) => {
    // Create two tasks
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Parent Task");
    await page.fill('input[type="date"]', "2024-06-01");
    await page.click('button:has-text("Create Task")');

    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Child Task");
    await page.fill('input[type="date"]', "2024-06-05");
    await page.click('button:has-text("Create Task")');

    // Open Gantt view
    await page.click('button:has-text("Gantt")');

    // Add dependency
    await page.click('button[aria-label="Add dependency"]');
    await page.click('text="Child Task"');
  });

  test("should zoom timeline", async ({ page }) => {
    // Navigate to Gantt
    await page.click('button:has-text("Gantt")');

    // Find zoom controls
    await page.click('button[aria-label="Zoom out"]');
    await page.click('button[aria-label="Zoom in"]');

    await expect(page.locator('.gantt-chart, [role="grid"]')).toBeVisible();
  });

  test("should filter by project", async ({ page }) => {
    // Create tasks in different lists
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Work Task");
    await page.selectOption('select[name="list_id"]', "Work");
    await page.click('button:has-text("Create Task")');

    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Personal Task");
    await page.selectOption('select[name="list_id"]', "Personal");
    await page.click('button:has-text("Create Task")');

    // Navigate to Gantt
    await page.click('button:has-text("Gantt")');

    // Filter by project
    await page.click('button[aria-label="Filter"]');
    await page.click('text="Work"');

    await expect(page.getByText("Work Task")).toBeVisible();
  });

  test("should show task progress", async ({ page }) => {
    // Create a task with progress
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Progress Task");
    await page.fill('input[type="date"]', "2024-06-01");
    await page.click('button:has-text("Create Task")');

    // Open task and mark progress
    await page.click('text="Progress Task"');
    await page.click('button:has-text("Edit")');

    // Set progress
    await page.fill('input[placeholder="Progress %"]', "50");
    await page.click('button:has-text("Save")');

    // Navigate to Gantt
    await page.click('button:has-text("Gantt")');

    // Check progress bar is visible
    await expect(page.locator('.progress-bar, [role="progressbar"]')).toBeVisible();
  });

  test("should handle empty timeline", async ({ page }) => {
    // Navigate to Gantt without creating tasks
    await page.click('button:has-text("Gantt")');

    // Should show empty state
    await expect(page.getByText("No tasks", { exact: false }).or(
      page.locator('text=No tasks found').or(page.locator('text=Empty'))
    )).toBeVisible();
  });

  test("should export Gantt chart", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Export Task");
    await page.fill('input[type="date"]', "2024-06-01");
    await page.click('button:has-text("Create Task")');

    // Navigate to Gantt
    await page.click('button:has-text("Gantt")');

    // Export
    await page.click('button[aria-label="Export"]');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text="Export as CSV"').or(page.click('text="Export as Image"')),
    ]);

    expect(download).toBeDefined();
  });

  test("should show task details on hover", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Detail Task");
    await page.fill('input[type="date"]', "2024-06-01");
    await page.fill('textarea[placeholder="Add details..."]', "Detailed description of the task");
    await page.click('button:has-text("Create Task")');

    // Navigate to Gantt
    await page.click('button:has-text("Gantt")');

    // Hover over task bar
    await page.hover('text="Detail Task"');

    // Tooltip should appear
    await expect(page.locator('.tooltip, [role="tooltip"]')).toBeVisible();
  });
});