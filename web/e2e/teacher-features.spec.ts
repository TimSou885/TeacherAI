import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'

test.describe('老師功能', () => {
  test('老師登入頁可載入', async ({ page }) => {
    await page.goto(`${BASE}/teacher/login`)
    await expect(page.getByRole('heading', { name: '老師登入' })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /登入/ })).toBeVisible()
  })

  test('未登入訪問教師區會跳轉登入', async ({ page }) => {
    await page.goto(`${BASE}/teacher`)
    await expect(page).toHaveURL(/\/teacher\/login|\/login/)
  })

  test('首頁老師登入按鈕可點', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await expect(page.getByRole('link', { name: /老師登入/ })).toBeVisible()
    await page.getByRole('link', { name: /老師登入/ }).click()
    await expect(page).toHaveURL(/\/teacher\/login/)
  })
})
