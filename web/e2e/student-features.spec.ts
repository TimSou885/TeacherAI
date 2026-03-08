import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'

test.describe('學生功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/student`)
    await page.getByPlaceholder('例如 3A2026').fill('3A2026')
    await page.getByRole('button', { name: '下一步' }).click()
    await expect(page.locator('h1')).toContainText('小三A班')
    await page.getByRole('button', { name: '小明' }).click()
    await expect(page).toHaveURL(/\/student\/home/)
    await page.waitForLoadState('networkidle')
  })

  test('首頁四大 Tab 可切換', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '對話' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '練習' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '作文' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '我的' })).toBeVisible()
    await page.getByRole('tab', { name: '練習' }).click()
    await expect(page.getByRole('tab', { name: '默書' })).toBeVisible()
    await page.getByRole('tab', { name: '我的' }).click()
    await expect(page.getByText(/你好/)).toBeVisible()
  })

  test('對話 Tab 正常載入', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '對話' })).toBeVisible()
    await page.getByRole('tab', { name: '對話' }).click()
    await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('默書：列表載入與選題', async ({ page }) => {
    await page.getByRole('tab', { name: '練習' }).click()
    await page.getByRole('tab', { name: '默書' }).click()
    await page.waitForTimeout(1500)
    const hasList = await page.getByText('尚無此範疇的練習').isVisible().catch(() => false)
    const hasExercise = await page.getByRole('button', { name: /第五課默書|默書/ }).first().isVisible().catch(() => false)
    expect(hasList || hasExercise).toBeTruthy()
  })

  test('筆順測驗：可進入', async ({ page }) => {
    await page.getByRole('tab', { name: '練習' }).click()
    await page.getByRole('tab', { name: '筆順測驗', exact: true }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByRole('heading', { name: '筆順測驗' })).toBeVisible()
  })

  test('測驗：可選範疇並進入練習', async ({ page }) => {
    await page.getByRole('tab', { name: '練習' }).click()
    await page.getByRole('tab', { name: '測驗', exact: true }).click()
    await page.getByRole('button', { name: '閱讀理解' }).click()
    await page.waitForTimeout(1500)
    const hasList = await page.getByText('尚無此範疇的練習').isVisible().catch(() => false)
    const hasExercise = await page.getByRole('button', { name: /閱讀理解範例|靜夜思/ }).first().isVisible().catch(() => false)
    expect(hasList || hasExercise).toBeTruthy()
  })

  test('錯題本：可進入（空或有資料）', async ({ page }) => {
    await page.getByRole('tab', { name: '練習' }).click()
    await page.getByRole('tab', { name: '錯題本' }).click()
    await page.waitForTimeout(1500)
    await expect(page.getByRole('heading', { name: '錯題本' })).toBeVisible()
  })

  test('作文 Tab 顯示 Phase 2', async ({ page }) => {
    await page.getByRole('tab', { name: '作文' }).click()
    await expect(page.getByText('Phase 2')).toBeVisible()
  })

  test('我的：可登出', async ({ page }) => {
    await page.getByRole('tab', { name: '我的' }).click()
    await expect(page.getByText(/你好/)).toBeVisible()
    await page.getByRole('button', { name: '登出' }).click()
    await expect(page).toHaveURL(/\/student$/)
  })

  test('加入即時測驗頁可進入', async ({ page }) => {
    await page.getByRole('tab', { name: '我的' }).click()
    await page.getByRole('button', { name: '加入即時測驗' }).click()
    await expect(page).toHaveURL(/\/student\/join/)
    await expect(page.getByRole('heading', { name: '加入即時測驗' })).toBeVisible()
  })
})
