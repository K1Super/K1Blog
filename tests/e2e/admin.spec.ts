import { expect, test } from '@playwright/test';

test('admin login form fields are visible and stacked', async ({ page }) => {
  await page.goto('/admin/login');

  const account = page.locator('#admin-account');
  const password = page.locator('#admin-password');
  const submit = page.locator('.gate-submit');

  await expect(account).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeVisible();

  const accountBox = await account.boundingBox();
  const passwordBox = await password.boundingBox();
  const submitBox = await submit.boundingBox();
  expect(accountBox).not.toBeNull();
  expect(passwordBox).not.toBeNull();
  expect(submitBox).not.toBeNull();

  expect(passwordBox!.y).toBeGreaterThanOrEqual(accountBox!.y + accountBox!.height);
  expect(submitBox!.y).toBeGreaterThanOrEqual(passwordBox!.y + passwordBox!.height);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBe(0);
});
