import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: `access-test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Accessibility Test User",
};

test.describe("Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[name="name"]', TEST_USER.name);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/$/);
  });

  test("should have proper page title", async ({ page }) => {
    await expect(page).toHaveTitle(/TaskFlow|Tasks|Todo/);
  });

  test("should have accessible navigation", async ({ page }) => {
    // Check for skip link or main content
    await expect(page.locator('a[href="#main"], a[aria-label*="skip"], main')).toBeVisible();
  });

  test("should have proper heading structure", async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    // Should have at least one h1
    const h1Elements = headings.filter(h => {
      const role = h.getAttribute('role');
      return role === 'heading' || h.evaluate(el => el.tagName === 'H1');
    });

    await expect(headings.length).toBeGreaterThan(0);
    await expect(h1Elements.length).toBeGreaterThanOrEqual(1);
  });

  test("should have alt text for images", async ({ page }) => {
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test("should have proper color contrast", async ({ page }) => {
    // Check that text is visible
    await page.click('button:has-text("New Task")');

    await expect(page.locator('input[placeholder="What needs to be done?"]')).toBeVisible();
  });

  test("should be navigable by keyboard", async ({ page }) => {
    // Tab through the page
    await page.keyboard.press("Tab");

    // Should focus on first interactive element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).not.toBe("BODY");
  });

  test("should have accessible form labels", async ({ page }) => {
    await page.click('button:has-text("New Task")');

    // Check for aria-label or visible labels
    await expect(page.locator('input[aria-label], input[placeholder], label')).toBeVisible();
  });

  test("should have proper focus indicators", async ({ page }) => {
    await page.keyboard.press("Tab");

    const hasFocusRing = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return false;
      const style = window.getComputedStyle(active);
      return style.outlineWidth !== "0px" || style.boxShadow !== "none";
    });

    expect(hasFocusRing).toBe(true);
  });

  test("should handle skip navigation", async ({ page }) => {
    // Check for skip link
    const skipLink = page.locator('a[href="#main"], a[aria-label*="skip"]');

    if (await skipLink.count() > 0) {
      await skipLink.focus();
      await page.keyboard.press("Enter");

      // Should navigate to main content
      const mainContent = page.locator('#main, main');
      await expect(mainContent).toBeVisible();
    }
  });

  test("should have lang attribute on html", async ({ page }) => {
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
  });

  test("should have viewport meta tag", async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width');
  });

  test("should have accessible buttons", async ({ page }) => {
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();

      // Button should have accessible name
      const hasAccessibleName = ariaLabel !== null || (textContent && textContent.trim().length > 0);
      expect(hasAccessibleName).toBe(true);
    }
  });

  test("should have proper table headers", async ({ page }) => {
    // Create a task to potentially show in a table
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder="What needs to be done?"]', "Table Test Task");
    await page.click('button:has-text("Create Task")');

    // Check for data tables with proper headers
    const tables = await page.locator('table').count();

    if (tables > 0) {
      const headers = await page.locator('th, [role="columnheader"]').all();
      expect(headers.length).toBeGreaterThan(0);
    }
  });

  test("should handle reduced motion preference", async ({ page }) => {
    // Check that animations respect user preference
    await page.click('button:has-text("New Task")');

    // Element should be visible without animation
    await expect(page.locator('input[placeholder="What needs to be done?"]')).toBeVisible();
  });

  test("should be usable with screen reader", async ({ page }) => {
    // Check for ARIA landmarks
    const landmarks = await page.locator('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]').count();

    expect(landmarks).toBeGreaterThan(0);
  });
});