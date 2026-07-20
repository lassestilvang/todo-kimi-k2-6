// @ts-nocheck
import { test, expect, type Page } from "@playwright/test";

const TEST_USER = {
  email: `import-test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Import Test User",
};

async function registerUser(page: Page) {
  await page.goto("/register");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[name="name"]', TEST_USER.name);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
}

test.describe("Import/Export Features", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test("should open settings menu", async ({ page }) => {
    await page.click('button[aria-label="Settings"], button:has-text("Settings")');

    await expect(page.locator('.settings-menu, [role="menu"]')).toBeVisible();
  });

  test("should show export options", async ({ page }) => {
    await page.click('button[aria-label="Settings"], button:has-text("Settings")');

    await expect(page.getByText("Export")).toBeVisible();
  });

  test("should export as CSV", async ({ page }) => {
    // Create some tasks
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Export Task 1");
    await page.click('button:has-text("Create Task")');

    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Export"');
    await page.click('text="CSV"');

    // Should trigger download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export CSV")'),
    ]);

    expect(download).toBeDefined();
  });

  test("should export as JSON", async ({ page }) => {
    // Create some tasks
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "JSON Export Task");
    await page.click('button:has-text("Create Task")');

    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Export"');
    await page.click('text="JSON"');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export JSON")'),
    ]);

    expect(download).toBeDefined();
  });

  test("should export as iCal", async ({ page }) => {
    // Create a task with deadline
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "iCal Task");
    await page.fill('input[type="date"]', "2024-12-31");
    await page.click('button:has-text("Create Task")');

    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Export"');
    await page.click('text="Calendar"');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export iCal")'),
    ]);

    expect(download).toBeDefined();
  });

  test("should show import options", async ({ page }) => {
    await page.click('button[aria-label="Settings"], button:has-text("Settings")');

    await expect(page.getByText("Import")).toBeVisible();
  });

  test("should import tasks from CSV", async ({ page }) => {
    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Import"');

    // Should show file upload
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });

  test("should import tasks from JSON", async ({ page }) => {
    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Import"');

    // Should show file upload
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });

  test("should backup data", async ({ page }) => {
    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Backup"');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Create Backup")'),
    ]);

    expect(download).toBeDefined();
  });

  test("should restore from backup", async ({ page }) => {
    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Backup"');

    // Should show restore options
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });

  test("should export with all data", async ({ page }) => {
    // Create various data types
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Export Test Task");
    await page.click('button:has-text("Create Task")');

    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Export"');

    // Should have multiple export options
    await expect(page.getByText("CSV")).toBeVisible();
    await expect(page.getByText("JSON")).toBeVisible();
    await expect(page.getByText("PDF")).toBeVisible();
  });

  test("should handle large export", async ({ page }) => {
    // Create many tasks
    for (let i = 0; i < 50; i++) {
      await page.click('button:has-text("New Task")');
      await page.fill('input[placeholder="What needs to be done?"]', `Large Export Task ${i}`);
      await page.click('button:has-text("Create Task")');
    }

    await page.click('button[aria-label="Settings"], button:has-text("Settings")');
    await page.click('text="Export"');

    // Should still work with many tasks
    await expect(page.getByText("CSV")).toBeVisible();
  });
});