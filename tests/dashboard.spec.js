// @ts-check
const { test, expect } = require('@playwright/test');

test('kanban renders cards and opens Qualification modal', async ({ page }) => {
  page.on('console', (msg) => console.log('console:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('pageerror:', err));
  await page.goto('/');
  await page.waitForSelector('.kanban .cardk', { timeout: 15000 });
  const cards = page.locator('.kanban .cardk');
  await expect(cards.first()).toBeVisible();
  await cards.first().click();
  const modal = page.locator('#qual-modal');
  await expect(modal).toBeVisible();
  await expect(page.getByText('Qualification')).toBeVisible();
});
