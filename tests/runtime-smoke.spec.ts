import { test, expect } from '@playwright/test';

test('runtime smoke: nav + no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  // Basic elements
  await expect(page.locator('header')).toBeVisible();
  // Navigation buttons exist
  const navButtons = ['Discovery','Kanban','Archive','Analytics','About'];
  for (const label of navButtons) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }

  // Click through key views
  await page.getByRole('button', { name: 'Discovery' }).click();
  await expect(page.locator('#view-discovery, #discovery, .discovery')).toBeVisible({ timeout: 3000 });

  await page.getByRole('button', { name: 'Kanban' }).click();
  await expect(page.locator('#kanban, .kanban')).toBeVisible({ timeout: 3000 });

  await page.getByRole('button', { name: 'Analytics' }).click();
  await expect(page.locator('#view-analytics, #analytics, #funnel')).toBeVisible({ timeout: 3000 });

  // Optional modals if present
  const onboardingBtn = page.getByRole('button', { name: /Onboard/i });
  if (await onboardingBtn.isVisible().catch(()=>false)) {
    await onboardingBtn.click();
    await expect(page.locator('#onb-modal, #onboarding, .modal.show')).toBeVisible({ timeout: 3000 });
    // Close if a close button exists
    const close = page.locator('#onb-pause, #onb-next');
    await close.first().click({ trial: true }).catch(()=>{});
  }

  // Assert no console errors captured during smoke
  expect.soft(errors, errors.join('\n')).toHaveLength(0);
});

