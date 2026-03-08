/**
 * 教案設計 AI Prompt：師生對話腳本、策略模板
 */

export const LESSON_BLOCK_TYPES = ['導入', '新授', '練習', '總結'] as const
export type LessonBlockType = (typeof LESSON_BLOCK_TYPES)[number]

/** 複述故事三步走：圖片排序 → 關鍵詞配對 → 連接詞 */
export const STORY_RETELL_BLOCKS = [
  { type: '新授' as const, activity: '圖片排序', description: '將故事圖片依正確順序排列，建立故事骨架' },
  { type: '新授' as const, activity: '關鍵詞配對', description: '關鍵詞與對應情節配對，強化記憶' },
  { type: '練習' as const, activity: '連接詞填空', description: '用連接詞串起句子，完整複述故事' },
] as const

export type ScriptLine = {
  role: 'teacher' | 'student'
  content: string
  action?: string
}

export function generateScriptPrompt(params: {
  blockType: string
  activity: string
  sourceText: string
  gradeLevel: number
  durationMinutes?: number
  extraContext?: string
  studentProfile?: string
}): string {
  const grade = params.gradeLevel
  const dur = params.durationMinutes ?? 5
  const profileBlock = params.studentProfile?.trim()
    ? `\n學情：${params.studentProfile.trim()}（請據此調整用語與難度）`
    : ''
  return `你是一位澳門小學${grade}年級的中文老師，正在設計「${params.blockType}」環節的師生對話腳本。
活動類型：${params.activity}
建議時間：約 ${dur} 分鐘

課文／故事摘要：
${params.sourceText.slice(0, 1500)}
${profileBlock}

${params.extraContext ?? ''}

請生成師生對話腳本，格式為 JSON 陣列，每則為：
{"role":"teacher"|"student","content":"對話內容","action":"可選，教師肢體語言或動作提示"}
例如：{"role":"teacher","content":"大家看，這裡有幾張圖，誰能把故事順序排好？","action":"拿出圖卡，展示給學生看"}
學生回答要符合小${grade}年級口語能力，簡短自然。教師可適當追問、引導。
只輸出 JSON 陣列，不要 markdown 或其他說明。`
}

/** AI 建議各環節時間分配 */
export function generateTimeSuggestPrompt(params: {
  blocks: Array<{ type: string; activity: string }>
  totalMinutes: number
  gradeLevel: number
}): string {
  const blockList = params.blocks.map((b, i) => `${i + 1}. ${b.type} - ${b.activity}`).join('\n')
  return `你是一位小學中文老師。請為以下教學環節分配時間，總計 ${params.totalMinutes} 分鐘。

環節：
${blockList}

請輸出 JSON 陣列，每個元素為對應環節的建議分鐘數，依序對應上方環節。例如：[3, 5, 8, 4]
導入不宜過長，練習可稍長。適合小${params.gradeLevel}年級。
只輸出 JSON 陣列，不要其他說明。`
}

/** AI 生成教具清單 */
export function generatePropsListPrompt(params: {
  sourceText: string
  blocks: Array<{ type: string; activity: string }>
  gradeLevel: number
}): string {
  const blockList = params.blocks.map((b) => `- ${b.type}：${b.activity}`).join('\n')
  return `你是一位澳門小學${params.gradeLevel}年級的中文老師。根據以下課文與教學環節，列出課堂需準備的教具。

課文摘要：
${params.sourceText.slice(0, 800)}

教學環節：
${blockList}

請輸出 JSON 陣列，每項為字串，例如：["松鼠頭飾","詞卡「想打扮」","魔法連接詞卡片","故事圖卡 4 張"]
具體、可操作，適合小學生。只輸出 JSON 陣列。`
}

/** AI 生成板書結構 */
export function generateBoardLayoutPrompt(params: {
  sourceText: string
  blocks: Array<{ type: string; activity: string }>
  gradeLevel: number
}): string {
  const blockList = params.blocks.map((b) => `- ${b.type}：${b.activity}`).join('\n')
  return `你是一位澳門小學${params.gradeLevel}年級的中文老師。根據課文與教學流程，設計板書結構。

課文摘要：
${params.sourceText.slice(0, 1000)}

教學環節：
${blockList}

請用簡潔的結構化文字描述板書排版，可包含：
1. 標題區
2. 主體（時間軸、心智圖、關鍵詞樹狀圖、對比表等）
3. 重點摘要區
用換行與縮排表示層級，適合小學黑板書寫。直接輸出板書內容，不要 JSON 或 markdown 標記。`
}

/** AI 解析文件：擷取教學目標、生字詞、核心價值、核心概念、核心問題 */
export function parseDocumentPrompt(text: string): string {
  return `以下是一份教案或課文文件的擷取文字。請從中擷取並輸出 JSON 物件，包含：
- learning_objectives：教學目標（陣列，每項一字串）
- key_vocabulary：重點生字詞（陣列）
- core_values：核心價值觀或課文主旨（字串，簡短）
- core_concept：核心概念（字串，本課要讓學生掌握的核心概念，約 20 字）
- core_question：核心問題（字串，能引導學生思考的關鍵提問，約 30 字）

若某項無法從文中辨識，可留空陣列或空字串。

文件內容：
${text.slice(0, 3000)}

只輸出 JSON 物件，不要 markdown。`
}

/** AI 生成價值觀昇華結語 */
export function generateValueClimaxPrompt(params: {
  sourceText: string
  gradeLevel: number
  coreValues?: string
}): string {
  const extra = params.coreValues ? `\n課文核心價值：${params.coreValues}` : ''
  return `你是一位澳門小學${params.gradeLevel}年級的中文老師。請根據以下課文，撰寫一段「價值觀昇華」的教師結語腳本，用於課堂總結時對學生說。

課文摘要：
${params.sourceText.slice(0, 1200)}
${extra}

結語應：
- 簡短有力，約 80-120 字
- 富有情感，能觸動小學生
- 呼應課文主旨（如：善良比美麗更重要）
- 可直接作為教師口述的腳本

直接輸出結語內容，不要 JSON 或標題。`
}

/** AI 生成關鍵提問（WHERETO 精神：引導思考的提問） */
export function generateKeyQuestionsPrompt(params: {
  sourceText: string
  blocks: Array<{ type: string; activity: string }>
  gradeLevel: number
  coreQuestion?: string
}): string {
  const blockList = params.blocks.map((b) => `- ${b.type}：${b.activity}`).join('\n')
  const extra = params.coreQuestion ? `\n可參考的核心問題：${params.coreQuestion}` : ''
  return `你是一位澳門小學${params.gradeLevel}年級的中文老師。根據課文與教學流程，設計 3-5 個「關鍵提問」，用於引導學生深度思考。

課文摘要：
${params.sourceText.slice(0, 1000)}

教學環節：
${blockList}
${extra}

關鍵提問應：
- 具核心價值，能引發思考
- 符合小${params.gradeLevel}年級理解力
- 涵蓋導入、新授、總結等不同階段
- 可參考 WHERETO 精神（何處學、為何學、如何學等）

請輸出 JSON 陣列，每項為一字串。例如：["如果松鼠沒有選擇綠葉，故事會怎麼發展？","你覺得什麼比外表更重要？"]
只輸出 JSON 陣列。`
}

/** AI 生成評量設計 */
export function generateAssessmentPrompt(params: {
  sourceText: string
  blocks: Array<{ type: string; activity: string }>
  gradeLevel: number
  learningObjectives?: string[]
}): string {
  const blockList = params.blocks.map((b) => `- ${b.type}：${b.activity}`).join('\n')
  const objBlock = params.learningObjectives?.length
    ? `\n教學目標：${params.learningObjectives.join('、')}`
    : ''
  return `你是一位澳門小學${params.gradeLevel}年級的中文老師。根據課文與教學流程，設計本課的評量方式。

課文摘要：
${params.sourceText.slice(0, 800)}

教學環節：
${blockList}
${objBlock}

請輸出評量設計的文字說明，包含：
1. 形成性評量：課中如何觀察／檢核學生理解（如：口頭回答、觀察記錄）
2. 總結性評量：課後如何評量學習成果（如：口頭複述、簡短寫作、選擇題）
每項具體、可操作，約 80-150 字。
直接輸出評量設計內容，不要 JSON 或標題。`
}

/** AI 生成作業與延伸活動 */
export function generateHomeworkPrompt(params: {
  sourceText: string
  gradeLevel: number
  blocks: Array<{ type: string; activity: string }>
}): string {
  const blockList = params.blocks.map((b) => `- ${b.type}：${b.activity}`).join('\n')
  return `你是一位澳門小學${params.gradeLevel}年級的中文老師。根據課文與課堂活動，設計 2-3 項課後任務。

課文摘要：
${params.sourceText.slice(0, 800)}

課堂活動：
${blockList}

請輸出 JSON 陣列，每項為一字串，例如：["回家把故事講給父母聽","畫出你最喜歡的故事角色並寫一句話"]
- 符合小${params.gradeLevel}年級能力
- 具體可操作，不宜過長
- 可含口語、繪圖、簡短寫作等
只輸出 JSON 陣列。`
}
