// @ts-nocheck
import { test, expect, type Page } from "@playwright/test";

const TEST_USER = {
  email: `analytics-test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Analytics Test User",
};

async function registerUser(page: Page) {
  await page.goto("/register");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[name="name"]', TEST_USER.name);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
}

test.describe("Analytics Dashboard Tests", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test("should open analytics dashboard", async ({ page }) => {
    await page.click('button:has-text("Analytics")');

    await expect(page.locator('.analytics, [role="main"]')).toBeVisible();
  });

  test("should display completion rate chart", async ({ page }) => {
    // Create some tasks
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("New Task")');
      await page.fill('input[placeholder="What needs to be done?"]', `Task ${i}`);
      await page.click('button:has-text("Create Task")');
    }

    // Complete some tasks
    await page.click('text="Task 1"');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Done")');

    await page.click('button:has-text("Analytics")');

    await expect(page.getByText("Completion Rate")).toBeVisible();
    await expect(page.locator('.chart, [role="img"]')).toBeVisible();
  });

  test("should display priority distribution", async ({ page }) => {
    // Create tasks with different priorities
    const priorities = ["critical", "high", "medium", "low"];

    for (const priority of priorities) {
      await page.click('button:has-text("New Task")');
      await page.fill('input[placeholder="What needs to be done?"]', `Priority ${priority}`);
      await page.selectOption('select', priority);
      await page.click('button:has-text("Create Task")');
    }

    await page.click('button:has-text("Analytics")');

    await expect(page.getByText("Priority Distribution")).toBeVisible();
  });

  test("should display time tracking statistics", async ({ page }) => {
    await page.click('button:has-text("Analytics")');

    await expect(page.getByText("Time Tracking")).toBeVisible();
    await expect(page.getByText("Total Time")).toBeVisible();
  });

  test("should show streak calendar", async ({ page }) => {
    // Create and complete tasks for several days
    for (let i = 0; i < 7; i++) {
      await page.click('button:has-text("New Task")');
      await page.fill('input[placeholder="What needs to be done?"]', `Streak Task ${i}`);
      await page.click('button:has-text("Create Task")');

      // Complete the task
      await page.click('text="Streak Task"');
      await page.check('input[type="checkbox"]');
      await page.click('button:has-text("Done")');
    }

    await page.click('button:has-text("Analytics")');

    await expect(page.getByText("Streak")).toBeVisible();
  });

  test("should display weekly goal tracking", async ({ page }) => {
    await page.click('button:has-text("Analytics")');

    await expect(page.getByText("Weekly Goal")).toBeVisible();
    await expect(page.locator('input[type="range"], .goal-input')).toBeVisible();
  });

  test("should show productivity insights", async ({ page }) => {
    // Create various tasks
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Insight Task 1");
    await page.click('button:has-text("Create Task")');

    await page.click('button:has-text("Analytics")');

    await expect(page.getByText("Productivity")).toBeVisible();
    await expect(page.getByText("Tips")).toBeVisible();
  });

  test("should handle empty analytics", async ({ page }) => {
    await page.click('button:has-text("Analytics")');

    // Should show empty state or loading
    await expect(page.locator('.analytics, [role="main"]')).toBeVisible();
  });

  test("should filter analytics by date range", async ({ page }) => {
    await page.click('button:has-text("Analytics")');

    // Look for date filters
    await expect(page.locator('input[type="date"], .date-filter')).toBeVisible();
  });

  test("should export analytics data", async ({ page }) => {
    await page.click('button:has-text("Analytics")');

    // Look for export button
    await expect(page.locator('button:has-text("Export"), button[aria-label*="Export"]')).toBeVisible();
  });

  test("should show task trends", async ({ page }) => {
    // Create tasks over time
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("New Task")');
      await page.fill('input[placeholder="What needs to be done?"]', `Trend Task ${i}`);
      await page.click('button:has-text("Create Task")');
    }

    await page.click('button:has-text("Analytics")');

    await expect(page.getByText("Trend")).toBeVisible();
  });
});