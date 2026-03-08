import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE = 'http://localhost:5173'
const SCREENSHOT_DIR = 'e2e-screenshots'

test.describe('學生測驗回答驗收', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  test('登入 → 做測驗 → 故意答錯 → 驗證顯示正確答案', async ({ page }, testInfo) => {
    const shot = async (name: string) => {
      const filePath = path.join(SCREENSHOT_DIR, `${name}.png`)
      await page.screenshot({ path: filePath })
      await testInfo.attach(name, { path: filePath, contentType: 'image/png' })
    }

    await page.goto(`${BASE}/student`)
    await expect(page.locator('h1')).toContainText('學生登入')
    await shot('01-學生登入頁')

    // 輸入班級代碼
    await page.getByPlaceholder('例如 3A2026').fill('3A2026')
    await page.getByRole('button', { name: '下一步' }).click()

    // 選擇小明
    await expect(page.locator('h1')).toContainText('小三A班')
    await shot('02-選擇學生')
    await page.getByRole('button', { name: '小明' }).click()

    // 應進入學生首頁
    await expect(page).toHaveURL(/\/student\/home/)
    await page.waitForLoadState('networkidle')
    await shot('03-學生首頁')

    // 切換到練習 Tab（主導航）
    await page.getByRole('tab', { name: '練習' }).click()

    // 選擇測驗（練習區內的 Tab，exact 避免匹配到「筆順測驗」）
    await page.getByRole('tab', { name: '測驗', exact: true }).click()

    // 選擇閱讀理解範疇
    await page.getByRole('button', { name: '閱讀理解' }).click()
    await shot('04-測驗範疇列表')

    // 等待載入並點選「閱讀理解範例」
    await page.getByRole('button', { name: /閱讀理解範例/ }).first().click()

    // 等待題目載入
    await expect(page.getByText('第 1 題')).toBeVisible({ timeout: 5000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot('05-題目載入')

    // 第 1 題選擇題：故意選錯（選「作者的學校」）
    await page.getByRole('radio', { name: /作者的學校/ }).scrollIntoViewIfNeeded()
    await page.getByRole('radio', { name: /作者的學校/ }).check()

    // 第 2 題填空（填標點）：故意選錯，按逗號
    await page.getByRole('button', { name: '逗號' }).first().scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: '逗號' }).first().click()

    // 第 3 題判斷題：正確是「錯」，故意選「對」
    await page.getByRole('button', { name: '對' }).first().scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: '對' }).first().click()

    // 第 4 題簡答題：隨便寫
    await page.getByPlaceholder('請輸入你的答案').scrollIntoViewIfNeeded()
    await page.getByPlaceholder('請輸入你的答案').fill('不知道')

    // 若有配對題（第 5 題），完成所有配對（左1→右1, 左2→右2, ...）
    const matchingHint = page.getByText('點選相配的一對')
    if (await matchingHint.isVisible().catch(() => false)) {
      const block = matchingHint.locator('../..')
      const buttons = block.getByRole('button')
      const count = await buttons.count()
      const half = Math.floor(count / 2)
      for (let i = 0; i < half; i++) {
        await buttons.nth(i).click()
        await buttons.nth(half + i).click()
      }
    }

    await shot('06-答題完成待交卷')

    // 等待交卷按鈕可點（確保所有題目已作答）
    await expect(page.getByRole('button', { name: '交卷' })).toBeEnabled({ timeout: 5000 })
    await page.getByRole('button', { name: '交卷' }).click()

    // 驗證得分區塊出現
    await expect(page.getByText(/得分：/)).toBeVisible({ timeout: 10000 })
    await shot('07-交卷後顯示正確答案')

    // 驗證各題答錯時有顯示「正確答案」
    await expect(page.getByText('答錯了').first()).toBeVisible()
    await expect(page.getByText('正確答案：春天的花')).toBeVisible()
    await expect(page.getByText('正確答案：：「」')).toBeVisible()
    await expect(page.getByText('正確答案：錯')).toBeVisible()
    await expect(page.getByText('正確答案：因為作者和朋友一起玩')).toBeVisible()

    // 驗收簡答題錯題可於錯題本複習：進入錯題本，不應出現「請至原練習作答」
    await page.getByRole('tab', { name: '練習' }).click()
    await page.getByRole('tab', { name: '錯題本' }).click()
    await page.waitForTimeout(2000)
    const startBtn = page.getByRole('button', { name: /開始複習/ })
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(1500)
      await expect(page.getByText('請至原練習作答')).not.toBeVisible()
    }
  })
})
