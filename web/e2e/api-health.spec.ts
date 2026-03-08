import { test, expect } from '@playwright/test'

test.describe('API 與首頁', () => {
  test('首頁可載入', async ({ request }) => {
    const res = await request.get('http://localhost:5173/')
    expect(res.ok()).toBeTruthy()
  })

  test('學生登入 API 可取得班級', async ({ request }) => {
    const res = await request.get('http://localhost:8787/api/auth/class-by-code?joinCode=3A2026')
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(data.classId).toBeDefined()
    expect(data.students).toBeDefined()
  })
})
