// @ts-nocheck
import { test, expect, type Page } from "@playwright/test";

const TEST_USER = {
  email: `pomodoro-test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Pomodoro Test User",
};

async function registerUser(page: Page) {
  await page.goto("/register");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[name="name"]', TEST_USER.name);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
}

test.describe("Pomodoro Timer Component", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test("should open pomodoro timer", async ({ page }) => {
    // Create a task first
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Task for Pomodoro");
    await page.click('button:has-text("Create Task")');

    // Open task
    await page.click('text="Task for Pomodoro"');

    // Open time tracking tab
    await page.click('button:has-text("Time Tracking")');

    await expect(page.locator('role=dialog, .pomodoro-timer')).toBeVisible();
  });

  test("should start and pause timer", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Pomodoro Task");
    await page.click('button:has-text("Create Task")');

    // Open task and time tracking
    await page.click('text="Pomodoro Task"');
    await page.click('button:has-text("Time Tracking")');

    // Start timer
    await page.click('button:has-text("Start")');

    await expect(page.locator('button:has-text("Pause"))').toBeVisible();
  });

  test("should set custom pomodoro duration", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Custom Duration Task");
    await page.click('button:has-text("Create Task")');

    // Open task and time tracking
    await page.click('text="Custom Duration Task"');
    await page.click('button:has-text("Time Tracking")');

    // Open settings
    await page.click('button[aria-label="Timer settings"]');

    // Set custom duration
    await page.fill('input[type="number"]', "45");
    await page.click('button:has-text("Save")');
  });

  test("should track pomodoro sessions", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Session Tracking Task");
    await page.click('button:has-text("Create Task")');

    // Open task and time tracking
    await page.click('text="Session Tracking Task"');
    await page.click('button:has-text("Time Tracking")');

    // Start a session
    await page.click('button:has-text("Start")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Pause")');

    // Complete session
    await page.click('button:has-text("Complete")');

    await expect(page.getByText("Session completed")).toBeVisible();
  });

  test("should show timer statistics", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Stats Task");
    await page.click('button:has-text("Create Task")');

    // Open task and time tracking
    await page.click('text="Stats Task"');
    await page.click('button:has-text("Time Tracking")');

    // Open statistics
    await page.click('button:has-text("Statistics")');

    await expect(page.getByText("Pomodoro Sessions")).toBeVisible();
    await expect(page.getByText("Total Time")).toBeVisible();
  });

  test("should handle timer completion", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Completion Task");
    await page.click('button:has-text("Create Task")');

    // Open task and time tracking
    await page.click('text="Completion Task"');
    await page.click('button:has-text("Time Tracking")');

    // Start timer with short duration for testing
    await page.click('button[aria-label="Timer settings"]');
    await page.fill('input[type="number"]', "1"); // 1 minute
    await page.click('button:has-text("Save")');

    await page.click('button:has-text("Start")');

    // Wait for completion (1 minute + buffer)
    await page.waitForTimeout(70000);

    // Check for completion notification or sound
    await expect(page.locator('.notification, .toast')).toBeVisible({ timeout: 10000 });
  });

  test("should pause and resume timer", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Pause Resume Task");
    await page.click('button:has-text("Create Task")');

    // Open task and time tracking
    await page.click('text="Pause Resume Task"');
    await page.click('button:has-text("Time Tracking")');

    // Start timer
    await page.click('button:has-text("Start")');
    await page.waitForTimeout(2000);

    // Pause
    await page.click('button:has-text("Pause")');

    // Resume
    await page.click('button:has-text("Start")');

    await expect(page.locator('button:has-text("Pause")')).toBeVisible();
  });

  test("should reset timer", async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Reset Task");
    await page.click('button:has-text("Create Task")');

    // Open task and time tracking
    await page.click('text="Reset Task"');
    await page.click('button:has-text("Time Tracking")');

    // Start timer
    await page.click('button:has-text("Start")');
    await page.waitForTimeout(2000);

    // Reset
    await page.click('button:has-text("Reset")');

    await expect(page.locator('button:has-text("Start")')).toBeVisible();
  });
});