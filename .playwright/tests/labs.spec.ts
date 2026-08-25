import { test, expect } from '@playwright/test';

/**
 * E2E tests for the new Labs pages: Knowledge Graph, Learning Path, Skills Dashboard
 */
test.describe('Skills Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/labs/skills-dashboard');
  });

  test('should display skills dashboard header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Skills Dashboard');
  });

  test('should show overview stats', async ({ page }) => {
    await expect(page.locator('text=Total Skills')).toBeVisible();
    await expect(page.locator('text=Avg Proficiency')).toBeVisible();
    await expect(page.locator('text=Growth Rate')).toBeVisible();
    await expect(page.locator('text=Skill Gaps')).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('should display skill cards when skills exist', async ({ page }) => {
    // Check for skill cards or empty state
    const skillCards = page.locator('[class*="skill"]');
    const emptyState = page.locator('text=No skills tracked yet');
    await expect(skillCards.or(emptyState)).toBeVisible();
  });
});

test.describe('Knowledge Graph', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/labs/knowledge-graph');
  });

  test('should display knowledge graph header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Knowledge Graph');
  });

  test('should show overview stats', async ({ page }) => {
    await expect(page.locator('text=Connections')).toBeVisible();
    await expect(page.locator('text=Decisions')).toBeVisible();
    await expect(page.locator('text=Avg Strength')).toBeVisible();
    await expect(page.locator('text=Nodes')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    await expect(page.locator('input[placeholder="Search nodes"]')).toBeVisible();
  });

  test('should have refresh button in header', async ({ page }) => {
    await expect(page.locator('button[aria-label="Refresh"]')).toBeVisible();
  });
});

test.describe('Learning Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/labs/learning-path');
  });

  test('should display learning path header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Personalized Learning Paths');
  });

  test('should show overall progress section', async ({ page }) => {
    await expect(page.locator('text=Your Learning Journey')).toBeVisible();
    await expect(page.locator('text=Overall Progress')).toBeVisible();
  });

  test('should display progress metrics', async ({ page }) => {
    await expect(page.locator('text=Skills Tracked')).toBeVisible();
    await expect(page.locator('text=Skills Mastered')).toBeVisible();
    await expect(page.locator('text=Tasks Completed')).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('should display AI recommendations section', async ({ page }) => {
    await expect(page.locator('text=AI Learning Recommendations')).toBeVisible();
  });
});

test.describe('Navigation to Labs Pages', () => {
  test('should navigate to skills dashboard from sidebar', async ({ page }) => {
    await page.goto('/');
    // Open sidebar if on mobile
    await page.locator('[aria-label="menu"]').click({ force: true }).catch(() => { /* ignore mobile sidebar */ });
    await page.click('text=Skills Dashboard');
    await expect(page).toHaveURL(/\/labs\/skills-dashboard/);
  });

  test('should navigate to knowledge graph from sidebar', async ({ page }) => {
    await page.goto('/');
    await page.locator('[aria-label="menu"]').click({ force: true }).catch(() => { /* ignore mobile sidebar */ });
    await page.click('text=Knowledge Graph');
    await expect(page).toHaveURL(/\/labs\/knowledge-graph/);
  });

  test('should navigate to learning path from sidebar', async ({ page }) => {
    await page.goto('/');
    await page.locator('[aria-label="menu"]').click({ force: true }).catch(() => { /* ignore mobile sidebar */ });
    await page.click('text=Learning Path');
    await expect(page).toHaveURL(/\/labs\/learning-path/);
  });
});