// @ts-check
const { test, expect } = require('@playwright/test');

test('loads app and shows kanban', async ({ page }) => {
  page.on('console', (msg) => console.log('console:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('pageerror:', err));
  await page.goto('/');
  // Wait for kanban to render (app seeds sample data and switches to Kanban)
  await page.waitForSelector('.kanban .column', { timeout: 15000 });
  await expect(page.locator('.kanban .cardk').first()).toBeVisible();
  // SW status is best-effort; allow either state or empty
  await expect(page.locator('#sw-status')).toHaveText(/Offline ready|Registering|^\s*$/);
});
