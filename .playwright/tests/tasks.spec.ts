import { test, expect } from "@playwright/test";

/**
 * E2E tests for task management flows.
 * These tests cover the critical user journeys in the TaskFlow application.
 */
test.describe("Task Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");
  });

  test("should display the task list", async ({ page }) => {
    // Check that the main content area is visible
    await expect(page.locator("main")).toBeVisible();
    // Check for the inbox list
    await expect(page.locator("text=Inbox")).toBeVisible();
  });

  test("should create a new task", async ({ page }) => {
    // Click the add task button
    await page.click("button:has-text('Add Task')");
    // Fill in task details
    await page.fill("input[name='name']", "Test Task");
    await page.click("button:has-text('Save')");
    // Verify the task appears in the list
    await expect(page.locator("text=Test Task")).toBeVisible();
  });

  test("should mark a task as completed", async ({ page }) => {
    // Create a task first
    await page.click("button:has-text('Add Task')");
    await page.fill("input[name='name']", "Task to Complete");
    await page.click("button:has-text('Save')");
    // Find and click the checkbox
    await page.check("input[type='checkbox']");
    // Verify the task is marked as completed
    await expect(page.locator("text=Task to Complete")).toHaveClass(/line-through/);
  });

  test("should search for tasks", async ({ page }) => {
    // Create some tasks
    await page.click("button:has-text('Add Task')");
    await page.fill("input[name='name']", "Unique Search Term");
    await page.click("button:has-text('Save')");
    // Search for the task
    await page.fill("input[placeholder='Search']", "Unique Search Term");
    // Verify the task appears in results
    await expect(page.locator("text=Unique Search Term")).toBeVisible();
  });
});

test.describe("Authentication", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/tasks");
    // Should show login page or redirect
    await expect(page).toHaveURL(/auth|login/);
  });
});

test.describe("Navigation", () => {
  test("should navigate between views", async ({ page }) => {
    await page.goto("/");
    // Switch to Kanban view
    await page.click("button:has-text('Kanban')");
    await expect(page.locator(".kanban-board")).toBeVisible();
    // Switch to Calendar view
    await page.click("button:has-text('Calendar')");
    await expect(page.locator(".calendar")).toBeVisible();
  });
});