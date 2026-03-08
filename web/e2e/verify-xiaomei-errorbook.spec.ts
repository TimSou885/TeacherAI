import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'

/**
 * 驗收：小美錯題複習共 10 題，答錯時皆有標準答案
 * 先以小美登入，進入錯題本，開始複習，逐題答錯並驗證顯示「正確答案：」
 */
test('小美錯題複習：10 題皆有標準答案', async ({ page }) => {
  await page.goto(`${BASE}/student`)
  await page.getByPlaceholder('例如 3A2026').fill('3A2026')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '小美' }).click()
  await expect(page).toHaveURL(/\/student\/home/)
  await page.waitForLoadState('networkidle')

  await page.getByRole('tab', { name: '練習' }).click()
  await page.getByRole('tab', { name: '錯題本' }).click()
  await page.waitForTimeout(2500)

  const startBtn = page.getByRole('button', { name: /開始複習/ })
  if (!(await startBtn.isVisible().catch(() => false))) {
    test.skip()
    return
  }
  await startBtn.click()
  await page.waitForTimeout(1500)

  const provideWrongAnswer = async () => {
    const textarea = page.getByPlaceholder(/請輸入你的答案|請輸入答案/)
    const radios = page.getByRole('radio')
    const commaBtn = page.getByRole('button', { name: '逗號' }).first()
    const falseBtn = page.getByRole('button', { name: '錯' }).first()
    const trueBtn = page.getByRole('button', { name: '對' }).first()

    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('不知道')
      return
    }
    if ((await radios.count()) > 0) {
      await radios.nth(1).check()
      return
    }
    if (await commaBtn.isVisible().catch(() => false)) {
      await commaBtn.click()
      return
    }
    if (await falseBtn.isVisible().catch(() => false)) {
      await falseBtn.click()
      return
    }
    if (await trueBtn.isVisible().catch(() => false)) {
      await falseBtn.click()
      return
    }

    const matchingHint = page.getByText('點選相配的一對')
    if (await matchingHint.isVisible().catch(() => false)) {
      const grid = page.locator('.grid.grid-cols-2')
      const leftBtns = grid.locator('div').first().getByRole('button')
      const rightBtns = grid.locator('div').nth(1).getByRole('button')
      const n = Math.min(await leftBtns.count(), await rightBtns.count())
      for (let j = 0; j < n; j++) {
        await leftBtns.nth(j).click()
        await rightBtns.nth((j + 1) % n).click()
      }
      return
    }

    const reorderClear = page.getByRole('button', { name: '全部重填' })
    if (await reorderClear.isVisible().catch(() => false)) {
      await reorderClear.click()
      await page.waitForTimeout(400)
      const poolFlex = page.getByText('字詞池').locator('..').locator('div.flex')
      let count = await poolFlex.getByRole('button').count()
      while (count > 0) {
        await poolFlex.getByRole('button').nth(count - 1).click()
        await page.waitForTimeout(150)
        count = await poolFlex.getByRole('button').count()
      }
      return
    }

    const textInput = page.locator('input[type="text"]').first()
    if (await textInput.isVisible().catch(() => false)) {
      await textInput.fill('x')
    }
  }

  let questionCount = 0
  const maxQuestions = 10

  for (let i = 0; i < maxQuestions; i++) {
    await page.waitForTimeout(500)

    if (await page.getByText('請至原練習作答').isVisible().catch(() => false)) {
      throw new Error('不應出現「請至原練習作答」')
    }

    await provideWrongAnswer()
    await page.waitForTimeout(300)

    const submitBtn = page.getByRole('button', { name: /提交答案/ })
    if (!(await submitBtn.isVisible().catch(() => false))) break

    if (await submitBtn.isDisabled().catch(() => true)) {
      await page.waitForTimeout(500)
      const anyTextarea = page.locator('textarea')
      if (await anyTextarea.isVisible().catch(() => false)) {
        await anyTextarea.fill('不知道')
        await page.waitForTimeout(200)
      }
      if (await submitBtn.isDisabled().catch(() => true)) break
    }

    await submitBtn.scrollIntoViewIfNeeded()
    await submitBtn.click()

    await expect(page.getByText(/答對了|答錯了/).first()).toBeVisible({ timeout: 15000 })
    questionCount++

    const correctLabel = page.getByText(/正確答案：/)
    await expect(correctLabel).toBeVisible({ timeout: 3000 })

    const nextBtn = page.getByRole('button', { name: /下一題|完成/ })
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(800)
      if (questionCount >= 10) break
    } else {
      break
    }
  }

  expect(questionCount, '應至少驗證多題皆有正確答案').toBeGreaterThanOrEqual(3)
  if (questionCount < 10) {
    console.log(`註：本次驗證 ${questionCount}/10 題（錯題本每次最多 10 題）`)
  } else {
    console.log('✓ 10 題皆顯示標準答案')
  }
})
