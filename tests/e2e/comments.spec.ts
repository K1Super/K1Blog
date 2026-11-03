import { expect, test } from '@playwright/test';

import { e2eAdminPassword, e2eAdminUsername } from './credentials';

test.describe('messages and automation', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-edge', 'message flow is covered on desktop');
  });

  test('auto-publishes a safe message and shows it on about', async ({ page }) => {
    const marker = `E2E-${Math.random().toString(36).slice(2, 8)}`;
    const author = `E2E 自动读者 ${marker}`;
    const content = `一条用于验证自动发布链路的留言。${marker}`;

    await page.goto('/about');
    await page.waitForTimeout(2500);
    await page.fill('#message-name', author);
    await page.fill('#message-content', content);
    await page.click('.submit-button');
    await expect(page.locator('.form-success')).toContainText('已发布');
    await expect(page.locator('.comment').filter({ hasText: marker })).toHaveCount(1);

    await page.goto('/admin/login');
    await page.fill('#admin-account', e2eAdminUsername);
    await page.fill('#admin-password', e2eAdminPassword);
    await page.click('.gate-submit');
    await expect(page).toHaveURL(/\/admin\/comments/);

    const row = page.locator('.ledger-row').filter({ hasText: marker });
    await expect(row).toHaveCount(1);
    await expect(row.locator('.ledger-status')).toContainText('已发布');
    await expect(row.locator('.ledger-decision')).toContainText('自动发布');
  });

  test('holds a risky message for review and publishes it after approval', async ({ page }) => {
    const marker = `E2E-${Math.random().toString(36).slice(2, 8)}`;
    const author = `E2E 待审读者 ${marker}`;
    const content = `加微信领取资料，用于验证人工兜底。${marker}`;

    await page.goto('/about');
    await page.waitForTimeout(2500);
    await page.fill('#message-name', author);
    await page.fill('#message-content', content);
    await page.click('.submit-button');
    await expect(page.locator('.form-success')).toContainText('待审核');
    await expect(page.locator('.comment').filter({ hasText: marker })).toHaveCount(0);

    await page.goto('/admin/login');
    await page.fill('#admin-account', e2eAdminUsername);
    await page.fill('#admin-password', e2eAdminPassword);
    await page.click('.gate-submit');
    await expect(page).toHaveURL(/\/admin\/comments/);

    const row = page.locator('.ledger-row').filter({ hasText: marker });
    await expect(row).toHaveCount(1);
    await expect(row.locator('.ledger-status')).toContainText('待审');
    await row.locator('button', { hasText: '通过' }).click();
    await expect(row.locator('.ledger-status')).toContainText('已发布');

    await page.goto('/about');
    await page.waitForTimeout(1200);
    await expect(page.locator('.comment').filter({ hasText: marker })).toHaveCount(1);
  });

  test('automation console saves a policy revision', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('#admin-account', e2eAdminUsername);
    await page.fill('#admin-password', e2eAdminPassword);
    await page.click('.gate-submit');
    await expect(page).toHaveURL(/\/admin\/comments/);

    await expect(page.locator('#autoApproveMaxRisk')).toHaveValue('30');
    await expect(page.locator('#autoBlockMinRisk')).toHaveValue('70');
    await expect(page.locator('.automation-metric')).toHaveCount(4);
    await expect(page.locator('.policy-panel')).toHaveCount(2);

    const columns = await page
      .locator('.automation-form-main')
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(2);
    const listOverflow = await page
      .locator('.ledger-list-wrap')
      .evaluate((element) => getComputedStyle(element).overflowY);
    expect(listOverflow).toBe('auto');

    const bannedToggle = page.locator('.policy-disclosure').filter({ hasText: '违禁关键词' });
    await bannedToggle.click();
    await expect(page.locator('dialog.policy-dialog')).toBeVisible();
    await expect(page.locator('#bannedKeywords')).toBeVisible();
    await expect(page.locator('#bannedKeywords')).toHaveValue(/博彩、赌场/);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'words.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('term\nE2E导入词\n第二条导入词\n'),
    });
    await expect(page.locator('.policy-import-preview')).toBeVisible();
    await expect(page.locator('.policy-import-summary')).toContainText('有效 2 项');
    await page.locator('.policy-import-action').filter({ hasText: '追加' }).click();
    await expect(page.locator('#bannedKeywords')).toHaveValue(/E2E导入词、第二条导入词/);
    await expect(page.locator('.policy-dialog-count')).toContainText('11 项');
    await expect(page.locator('.policy-save-state')).toContainText('已保存');

    await page.locator('.policy-dialog-done').click();
    await expect(page.locator('dialog.policy-dialog')).toBeHidden();

    const saveState = page.locator('.policy-save-state');
    await expect(saveState).toBeVisible();
    const maxLinks = page.locator('#maxLinks');
    await expect(maxLinks).toHaveValue('3');
    await maxLinks.fill('4');
    await expect(saveState).toContainText('已保存');
    await expect(page.locator('.automation-panel .automation-revision')).toContainText(/REV \d{3}/);
    await maxLinks.fill('3');
    await expect(saveState).toContainText('已保存');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBe(0);
  });

  test('admin API rejects a write without CSRF token', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('#admin-account', e2eAdminUsername);
    await page.fill('#admin-password', e2eAdminPassword);
    await page.click('.gate-submit');
    await expect(page).toHaveURL(/\/admin\/comments/);

    const status = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/comments/not-found', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      return response.status;
    });
    expect(status).toBe(403);
  });
});
