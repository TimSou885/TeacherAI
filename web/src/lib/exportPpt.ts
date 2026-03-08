/**
 * PPT 教案匯出
 * 階段 1：PoC 固定範例
 * 階段 2：依教案 state 產出完整 PPT
 */

import PptxGenJS from 'pptxgenjs'

const ZH_OPTS = {
  fontFace: '微軟正黑體',
  lang: 'zh-TW' as const,
}

const TITLE = { ...ZH_OPTS, fontSize: 24, bold: true }
const BODY = { ...ZH_OPTS, fontSize: 16 }
const SMALL = { ...ZH_OPTS, fontSize: 14 }

export type LessonPlanForPpt = {
  title: string
  sourceText: string
  gradeLevel: number
  durationMinutes: number
  textbookRef?: string
  coreConcept?: string
  coreQuestion?: string
  blocks: Array<{
    type: string
    activity: string
    script: Array<{ role: string; content: string; action?: string }>
    durationMinutes: number
  }>
  keyQuestions: string[]
  propsList: string[]
  boardLayout: string
  climax: string
  homework: string[]
  assessmentDesign: string
  learningObjectives?: string[]
  keyVocabulary?: string[]
  planMode?: 'detailed' | 'brief'
}

function addSlideTitle(slide: PptxGenJS.Slide, text: string, y = 0.3) {
  slide.addText(text, { x: 0.5, y, w: 9, ...TITLE })
}

function addBullets(slide: PptxGenJS.Slide, items: string[], startY: number, opts = BODY) {
  items.forEach((item, i) => {
    slide.addText(item, { x: 0.5, y: startY + i * 0.55, w: 9, ...opts })
  })
}

/** 腳本過長時取前幾則做摘要 */
function summarizeScript(script: Array<{ role: string; content: string }>, maxLines = 5): string[] {
  if (script.length <= maxLines) {
    return script.map((s) => `${s.role === 'teacher' ? '師' : '生'}：${s.content}`)
  }
  const taken = script.slice(0, maxLines - 1).map((s) => `${s.role === 'teacher' ? '師' : '生'}：${s.content}`)
  taken.push(`… 共 ${script.length} 則對話`)
  return taken
}

/** 板書結構化：依換行分割，保留縮排呈現（階段 3） */
function addBoardLayoutStructured(slide: PptxGenJS.Slide, boardLayout: string) {
  const lines = boardLayout.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0).slice(0, 16)
  if (lines.length === 0) return
  const lineHeight = 0.42
  lines.forEach((line, i) => {
    const leadingLen = (line.match(/^\s*/)?.[0]?.length ?? 0)
    const x = 0.5 + Math.min(leadingLen * 0.12, 1.8)
    const text = line.trim().slice(0, 80)
    slide.addText(text || ' ', { x, y: 0.9 + i * lineHeight, w: 9 - (x - 0.5), fontSize: 12, ...ZH_OPTS })
  })
}

/** 階段 2／3：依教案資料產出完整 PPT，簡案模式合併環節為 1 張 */
export async function exportPptFromLessonPlan(data: LessonPlanForPpt): Promise<void> {
  const pptx = new PptxGenJS()
  pptx.title = data.title || '教案'
  pptx.author = 'EduSpark'
  pptx.layout = 'LAYOUT_16x9'
  const isBrief = data.planMode === 'brief'

  const whiteBg = { color: 'FFFFFF' }

  // 1. 封面
  const slide1 = pptx.addSlide()
  slide1.background = whiteBg
  slide1.addText(data.title || '教案', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 32, align: 'center',
    ...ZH_OPTS,
  })
  const subtitle = [
    `小${data.gradeLevel}年級`,
    `${data.durationMinutes} 分鐘`,
    isBrief ? '簡案' : null,
    data.textbookRef ? data.textbookRef : null,
  ].filter(Boolean).join(' · ')
  slide1.addText(subtitle, {
    x: 0.5, y: 2.8, w: 9,
    fontSize: 16, align: 'center', color: '666666',
    ...ZH_OPTS,
  })

  // 2. 核心概念與問題（若有）
  if (data.coreConcept || data.coreQuestion) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '核心概念與問題')
    let y = 0.9
    if (data.coreConcept) {
      slide.addText(`核心概念：${data.coreConcept}`, { x: 0.5, y, w: 9, ...BODY })
      y += 0.6
    }
    if (data.coreQuestion) {
      slide.addText(`核心問題：${data.coreQuestion}`, { x: 0.5, y, w: 9, ...BODY })
    }
  }

  // 3. 教學目標、重點詞彙（若有）
  const hasObjectives = (data.learningObjectives?.length ?? 0) > 0
  const hasVocab = (data.keyVocabulary?.length ?? 0) > 0
  if (hasObjectives || hasVocab) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '教學目標與重點詞彙')
    let y = 0.9
    if (hasObjectives) {
      data.learningObjectives!.forEach((o, i) => {
        slide.addText(`${i + 1}. ${o}`, { x: 0.5, y: y + i * 0.5, w: 9, ...BODY })
      })
      y += data.learningObjectives!.length * 0.5 + 0.3
    }
    if (hasVocab) {
      slide.addText(`重點詞彙：${data.keyVocabulary!.join('、')}`, { x: 0.5, y, w: 9, ...SMALL })
    }
  }

  // 4. 課文摘要（詳案才有；簡案略過）
  if (!isBrief && data.sourceText.trim()) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '課文摘要')
    const text = data.sourceText.slice(0, 400) + (data.sourceText.length > 400 ? '…' : '')
    slide.addText(text, { x: 0.5, y: 0.9, w: 9, h: 4, fontSize: 14, valign: 'top', ...ZH_OPTS })
  }

  // 5. 教學環節
  if (data.blocks.length > 0) {
    if (isBrief) {
      // 簡案：合併為 1 張
      const slide = pptx.addSlide()
      slide.background = whiteBg
      addSlideTitle(slide, '教學環節')
      const items = data.blocks.map((b, i) => `${i + 1}. ${b.type}－${b.activity}（${b.durationMinutes} 分）`)
      addBullets(slide, items, 0.9)
    } else {
      // 詳案：每環節 1 張
      for (let i = 0; i < data.blocks.length; i++) {
        const block = data.blocks[i]
        const slide = pptx.addSlide()
        slide.background = whiteBg
        addSlideTitle(slide, `${i + 1}. ${block.type}－${block.activity}（${block.durationMinutes} 分）`)
        if (block.script.length > 0) {
          const lines = summarizeScript(block.script)
          addBullets(slide, lines, 0.9, SMALL)
        } else {
          slide.addText('（尚未生成腳本）', { x: 0.5, y: 0.9, w: 9, color: '999999', ...SMALL })
        }
      }
    }
  }

  // 6. 關鍵提問（若有）
  if (data.keyQuestions.length > 0) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '關鍵提問')
    const questions = isBrief ? data.keyQuestions.slice(0, 3) : data.keyQuestions
    addBullets(slide, questions.map((q, i) => `${i + 1}. ${q}`), 0.9)
  }

  // 7. 板書（若有）- 階段 3：結構化呈現
  if (data.boardLayout.trim() && !isBrief) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '板書預覽')
    addBoardLayoutStructured(slide, data.boardLayout)
  }

  // 8. 教具清單（簡案略過）
  if (!isBrief && data.propsList.length > 0) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '教具清單')
    addBullets(slide, data.propsList, 0.9)
  }

  // 9. 價值觀昇華（若有）
  if (data.climax.trim()) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '價值觀昇華')
    const text = isBrief ? data.climax.slice(0, 200) + (data.climax.length > 200 ? '…' : '') : data.climax
    slide.addText(text, { x: 0.5, y: 0.9, w: 9, h: 4, valign: 'top', ...BODY })
  }

  // 10. 作業與延伸（若有）
  if (data.homework.length > 0) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '作業與延伸')
    const items = isBrief ? data.homework.slice(0, 3) : data.homework
    addBullets(slide, items, 0.9)
  }

  // 11. 評量設計（簡案略過）
  if (!isBrief && data.assessmentDesign.trim()) {
    const slide = pptx.addSlide()
    slide.background = whiteBg
    addSlideTitle(slide, '評量設計')
    const text = data.assessmentDesign.slice(0, 800) + (data.assessmentDesign.length > 800 ? '…' : '')
    slide.addText(text, { x: 0.5, y: 0.9, w: 9, h: 4, fontSize: 14, valign: 'top', ...ZH_OPTS })
  }

  const suffix = isBrief ? '_簡案' : ''
  const safeTitle = (data.title || '教案').replace(/[/\\?*\[\]"]/g, '_').slice(0, 45)
  await pptx.writeFile({
    fileName: `${safeTitle}${suffix}_${Date.now()}.pptx`,
    compression: true,
  })
}

/** PoC：用固定資料產生 5 張投影片，驗證中文顯示 */
export async function exportPptPoc(): Promise<void> {
  const pptx = new PptxGenJS()
  pptx.title = '教案 PPT 測試'
  pptx.author = 'EduSpark'
  pptx.layout = 'LAYOUT_16x9'
  const whiteBg = { color: 'FFFFFF' }

  // 投影片 1：封面
  const slide1 = pptx.addSlide()
  slide1.background = whiteBg
  slide1.addText('耳朵上的綠星星', {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1,
    fontSize: 36,
    align: 'center',
    ...ZH_OPTS,
  })
  slide1.addText('小學三年級 · 語文 · 40 分鐘', {
    x: 0.5,
    y: 3.2,
    w: 9,
    fontSize: 18,
    align: 'center',
    color: '666666',
    ...ZH_OPTS,
  })

  // 投影片 2：核心概念與問題
  const slide2 = pptx.addSlide()
  slide2.background = whiteBg
  slide2.addText('核心概念與問題', {
    x: 0.5,
    y: 0.3,
    w: 9,
    fontSize: 24,
    bold: true,
    ...ZH_OPTS,
  })
  slide2.addText('核心概念：善良比外表更重要', {
    x: 0.5,
    y: 0.9,
    w: 9,
    fontSize: 18,
    ...ZH_OPTS,
  })
  slide2.addText('核心問題：你覺得什麼比美麗更重要？', {
    x: 0.5,
    y: 1.5,
    w: 9,
    fontSize: 18,
    ...ZH_OPTS,
  })

  // 投影片 3：教學目標
  const slide3 = pptx.addSlide()
  slide3.background = whiteBg
  slide3.addText('教學目標', {
    x: 0.5,
    y: 0.3,
    w: 9,
    fontSize: 24,
    bold: true,
    ...ZH_OPTS,
  })
  const objectives = [
    '1. 能理解故事內容並進行口頭複述',
    '2. 學習運用連接詞串起故事情節',
    '3. 體會善良比外表更重要的價值',
  ]
  objectives.forEach((t, i) => {
    slide3.addText(t, {
      x: 0.5,
      y: 0.9 + i * 0.7,
      w: 9,
      fontSize: 16,
      ...ZH_OPTS,
    })
  })

  // 投影片 4：教學環節
  const slide4 = pptx.addSlide()
  slide4.background = whiteBg
  slide4.addText('教學環節', {
    x: 0.5,
    y: 0.3,
    w: 9,
    fontSize: 24,
    bold: true,
    ...ZH_OPTS,
  })
  slide4.addText('導入：故事預測（3 分）', {
    x: 0.5,
    y: 1,
    w: 9,
    fontSize: 16,
    ...ZH_OPTS,
  })
  slide4.addText('新授：圖片排序 → 關鍵詞配對（10 分）', {
    x: 0.5,
    y: 1.7,
    w: 9,
    fontSize: 16,
    ...ZH_OPTS,
  })
  slide4.addText('練習：連接詞填空、口頭複述（15 分）', {
    x: 0.5,
    y: 2.4,
    w: 9,
    fontSize: 16,
    ...ZH_OPTS,
  })
  slide4.addText('總結：價值觀昇華（5 分）', {
    x: 0.5,
    y: 3.1,
    w: 9,
    fontSize: 16,
    ...ZH_OPTS,
  })

  // 投影片 5：關鍵提問
  const slide5 = pptx.addSlide()
  slide5.background = whiteBg
  slide5.addText('關鍵提問', {
    x: 0.5,
    y: 0.3,
    w: 9,
    fontSize: 24,
    bold: true,
    ...ZH_OPTS,
  })
  const questions = [
    '如果松鼠沒有選擇綠葉，故事會怎麼發展？',
    '你覺得什麼比外表更重要？',
    '生活中你曾做過什麼善良的事？',
  ]
  questions.forEach((q, i) => {
    slide5.addText(`${i + 1}. ${q}`, {
      x: 0.5,
      y: 1 + i * 0.8,
      w: 9,
      fontSize: 16,
      ...ZH_OPTS,
    })
  })

  await pptx.writeFile({
    fileName: `教案PPT測試_${Date.now()}.pptx`,
    compression: true,
  })
}
