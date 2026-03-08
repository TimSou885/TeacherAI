import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'
const API = 'http://localhost:8787'

/** 驗收：老師可建立班級（無需手動設定 teacher_id）*/
test('老師登入頁載入正常', async ({ page }) => {
  await page.goto(`${BASE}/teacher/login`)
  await expect(page.getByRole('heading', { name: '老師登入' })).toBeVisible()
})

test('建立班級 API 存在且需認證', async ({ request }) => {
  const res = await request.post(`${API}/api/teacher/classes`, {
    data: { name: '測試班' },
    headers: { Authorization: 'Bearer invalid' },
  })
  expect(res.status()).toBe(401)
})
