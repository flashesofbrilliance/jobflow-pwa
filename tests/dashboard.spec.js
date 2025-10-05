// @ts-check
const { test, expect } = require('@playwright/test');

test('dashboard renders cards and opens Job Detail', async ({ page }) => {
  await page.addInitScript(() => {
    window.JobFlowConfig = Object.assign({}, window.JobFlowConfig || {}, { enableDashboard: true });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Seed Sample' })).toBeVisible();
  await page.getByRole('button', { name: 'Seed Sample' }).click();
  await expect(page.locator('#dashboardSection')).toBeVisible();
  const cards = page.locator('#dashboardSection .job-card');
  await expect(cards.first()).toBeVisible();
  await cards.first().click();
  const modal = page.locator('#jobDetailModal');
  await expect(modal).toBeVisible();
  await expect(page.getByText('Job Details')).toBeVisible();
});

