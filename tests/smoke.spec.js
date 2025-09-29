// @ts-check
const { test, expect } = require('@playwright/test');

test('loads app and registers SW', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/JobFlow PWA/);
  await expect(page.getByText(/IndexedDB opportunities:/)).toBeVisible();
  // SW registration text should appear eventually
  await expect(page.locator('#sw-status')).toContainText(/Offline ready|Registering/);
});

