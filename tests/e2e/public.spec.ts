import { expect, test } from '@playwright/test';

test.describe('public site', () => {
  test('home renders a full-screen showcase without article listings', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/博客/);
    await expect(page.locator('#hero-title')).toHaveText('博客');
    await expect(page.locator('.title')).toHaveCount(0);
    await expect(page.locator('.field-canvas')).toHaveCount(1);
    await expect(page.locator('.entries')).toHaveCount(0);
    await expect(page.locator('.hero-links')).toHaveCount(0);
    await expect(page.locator('.capsule-nav a')).toHaveText(['首页', '随笔', '项目', '关于']);
    await expect(page.locator('.capsule-nav a[aria-current="page"]')).toHaveText(/首页/);
    await expect(page.locator('#lamp .lamp-icon')).toHaveCount(1);
    await expect(page.locator('#lamp')).toHaveAttribute('aria-label', /浅色模式/);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBe(0);
  });

  test('home link returns to the homepage from an article', async ({ page }) => {
    await page.goto('/posts/precision-as-aesthetic');
    await page.locator('.capsule-nav a', { hasText: '首页' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#hero-title')).toHaveText('博客');
  });

  test('article renders content and table of contents', async ({ page }) => {
    await page.goto('/posts/precision-as-aesthetic');
    await expect(page.locator('.article-title')).toContainText('精确是一种审美');
    await expect(page.locator('.toc-list a')).toHaveCount(5);
    await expect(page.locator('.prose')).toContainText('精度不是装饰');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBe(0);
  });

  test('essays, project, tag, about and search are reachable', async ({ page }) => {
    await page.goto('/essays');
    await expect(page.locator('#notes-title')).toHaveText('随笔');
    await expect(page.locator('.note-item')).toHaveCount(3);
    await expect(page.locator('.capsule-nav a[aria-current="page"]')).toHaveText(/随笔/);
    await page.goto('/projects');
    await expect(page.locator('#work-title')).toHaveText('作品');
    await expect(page.locator('.exhibit')).toHaveCount(4);
    await expect(page.locator('.exhibit-visual')).toHaveCount(4);
    await expect(page.locator('.work-dock a')).toHaveCount(4);
    await expect(page.locator('.capsule-nav a[aria-current="page"]')).toHaveText(/项目/);
    await page.goto(`/tags/${encodeURIComponent('观测')}`);
    await expect(page.locator('.listing-title')).toContainText('观测');
    await page.goto('/about');
    await expect(page.locator('#about-title')).toHaveText('关于');
    await expect(page.locator('.about-section')).toHaveCount(4);
    await expect(page.locator('.about-facts')).toContainText('04');
    await page.goto('/search');
    await expect(page.locator('.search-title')).toContainText('搜索');
    await expect(page.locator('.search-result')).toHaveCount(3);
  });

  test('project case study opens with specimen and next exhibit', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('.exhibit-title a', { hasText: 'Terra Scout' }).click();
    await expect(page).toHaveURL(/\/projects\/terra-scout$/);
    await expect(page.locator('.case-title')).toHaveText('Terra Scout');
    await expect(page.locator('.case-plate .specimen')).toHaveCount(1);
    await expect(page.locator('.case-chapters li')).toHaveCount(3);
    await expect(page.locator('.case-next-link')).toContainText('AcmeDesk');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBe(0);
  });

  test('verthys case shows the real hero and system diagram', async ({ page }) => {
    await page.goto('/projects/verthys');
    await expect(page.locator('.case-title')).toHaveText('Verthys');
    await expect(page.locator('.case-hero')).toHaveCount(1);
    await expect(page.locator('.case-diagram img')).toHaveCount(1);
    await expect(page.locator('.case-live')).toHaveAttribute('target', '_blank');
    await expect(page.locator('.case-chapters li')).toHaveCount(3);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBe(0);
  });

  test('legacy archive path redirects to essays', async ({ page }) => {
    await page.goto('/archive');
    await expect(page).toHaveURL(/\/essays$/);
    await expect(page.locator('#notes-title')).toHaveText('随笔');
  });

  test('theme toggle persists the chosen illumination', async ({ page }) => {
    await page.goto('/');
    await page.locator('#lamp').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'lamp');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'lamp');
  });

  test('RSS and sitemap respond', async ({ request }) => {
    const feed = await request.get('/feed.xml');
    expect(feed.status()).toBe(200);
    expect(await feed.text()).toContain('<rss');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
  });
});
