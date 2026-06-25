import { test, expect } from '@playwright/test';

test('loads without JavaScript errors and shows login form', async ({ page }) => {
  const jsErrors: Error[] = [];
  page.on('pageerror', err => jsErrors.push(err));

  await page.goto('/');

  // App checks /user/token, gets a 401 (no Flexget), then renders login form
  await expect(page.locator('#password')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

  expect(jsErrors).toHaveLength(0);
});
