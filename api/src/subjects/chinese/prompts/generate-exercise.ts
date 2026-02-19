/**
 * AI 自動出題 Prompt（依 architecture.md 2.9）
 */

export type GenerateCategory = 'reading' | 'grammar' | 'vocabulary' | 'dictation' | 'reorder'

export function generateExercisePrompt(params: {
  lessonText: string
  gradeLevel: number
  category: GenerateCategory
  questionCount: number
}) {
  const cat = params.category
  const n = params.questionCount
  const grade = params.gradeLevel

  const categoryInstructions: Record<GenerateCategory, string> = {
    reading: `請根據以下課文出 ${n} 道閱讀理解題。輸出格式為 JSON 陣列，每題一物件。
題型：至少 1 道主旨選擇題、1 道細節題、1 道詞語理解題；若 n>=4 可加 1 道簡答推斷題。
選擇題格式：{"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correct":0}（correct 為正確選項索引）
簡答題格式：{"type":"short_answer","question":"...","reference_answer":"...","scoring_guide":"言之有理即可"}
只輸出 JSON 陣列，不要 markdown 或其他文字。`,

    grammar: `請根據以下課文出 ${n} 道語文基礎練習題。輸出格式為 JSON 陣列。
題型混合：標點符號填充、改正錯別字、量詞選擇${grade >= 4 ? '、修辭辨識' : ''}${grade >= 3 ? '、句式改寫' : ''}。
填空題格式：{"type":"fill_blank","display_type":"填標點符號","question":"句子____填空處____","correct":"正確答案","hint":"提示"}
選擇題格式：{"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correct":0}
判斷題格式：{"type":"true_false","question":"...","correct":true或false,"explanation":"..."}
只輸出 JSON 陣列。`,

    vocabulary: `請根據以下課文出 ${n} 道詞語運用題。輸出格式為 JSON 陣列。
題型：選詞填充、近反義詞配對${grade >= 3 ? '、成語選擇' : ''}、詞語造句。
填空題：{"type":"fill_blank","question":"...","correct":"...","hint":"..."}
配對題：{"type":"matching","question":"...","left":["詞1","詞2"],"right":["對應1","對應2"],"correct_pairs":[[0,0],[1,1]]}
選擇題：{"type":"multiple_choice","question":"...","options":["..."],"correct":0}
只輸出 JSON 陣列。`,

    dictation: `請從以下課文中選出 ${Math.min(n, 15)} 個最重要的詞語作為默書內容。
輸出格式：{"type":"dictation","words":[{"word":"詞語","pinyin":"漢語拼音","hint":"詞義解釋"}]}
詞義用繁體中文，適合小學生。選詞標準：新詞優先、易錯字優先、常用優先。
只輸出單一 JSON 物件，不要陣列。`,

    reorder: `請根據課文設計 ${Math.min(n, 3)} 道排句成段題。輸出格式為 JSON 陣列。
每題格式：{"type":"reorder","sentences":["句1","句2","句3","句4"],"correct_order":[0,1,2,3]}
sentences 為打亂後的句子陣列，correct_order 為正確順序的索引。
只輸出 JSON 陣列。`,
  }

  const instruction = categoryInstructions[cat]
  return `你是一位澳門小學${grade}年級的中文老師，正在為學生出練習題。

課文／知識點：
${params.lessonText}

${instruction}

難度：適合小學${grade}年級。`
}

/** 根據錯題摘要生成複習題的 Prompt */
export function generateFromErrorsPrompt(params: {
  errorSummary: string
  gradeLevel: number
  questionCount: number
}) {
  return `你是一位澳門小學${params.gradeLevel}年級的中文老師。全班有許多錯題需要複習，以下是按錯誤頻率整理的摘要：

${params.errorSummary}

請根據這些錯題，生成 ${params.questionCount} 道複習題，涵蓋不同範疇（閱讀理解、語文基礎、詞語運用、默書、排句成段）。
每道題要針對學生常錯的類型設計。輸出格式為 JSON 陣列，每題物件包含 type、question、options（若選擇題）、correct 等欄位。
題型可混用：multiple_choice、fill_blank、true_false、short_answer、reorder、matching。
**標點符號題**：若為「請填入正確標點」的填空題，必須加上 "display_type":"填標點符號"，例：{"type":"fill_blank","display_type":"填標點符號","question":"媽媽說____你今天乖不乖____（請填入正確標點）","correct":"：「」","hint":"..."}，這樣學生端會顯示標點點選列而非純文字輸入。
只輸出 JSON 陣列，不要其他說明。`
}
