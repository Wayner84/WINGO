import { expect, test } from '@playwright/test';

test('start a run and make calls', async ({ page }) => {
  await page.goto('/');
  const startButtons = page.getByRole('button', { name: /start run/i });
  await expect(startButtons.first()).toBeVisible();
  await startButtons.first().click();
  const callButton = page.getByRole('button', { name: /call next/i });
  await expect(callButton).toBeVisible();
  await callButton.click();
  await callButton.click();
  const logEntries = page.locator('.log p');
  await expect(logEntries.first()).toBeVisible();
  await page.getByRole('button', { name: /settings/i }).click();
  await page.getByRole('button', { name: /back/i }).click();
});
