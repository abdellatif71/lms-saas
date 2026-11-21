import { expect, test } from '@playwright/test';

test('localized scaffolding shell', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading')).toContainText('Scaffolding OK');

  await page.goto('/fr');
  await expect(page.getByRole('heading')).toContainText('Échafaudage OK');

  await page.goto('/ar');
  await expect(page.getByRole('heading')).toContainText('تم تجهيز الهيكل');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
