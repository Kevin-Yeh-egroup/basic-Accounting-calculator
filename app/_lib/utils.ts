import { CURRENCY, WEEKDAY_ZH, MAX_RECURRING_OCCURRENCES, AI_FEEDBACK_DRINK_KEYWORDS, FALLBACK_BY_DOMAIN_DIRECTION, PAYMENT_METHOD_OPTIONS } from "./constants"
import { CATEGORY_BY_KEY, TAXONOMY, TAXONOMY_GROUPS } from "./taxonomy"
import { DEMO_USER_ID } from "./db"
import type {
  Domain, Direction, InputMode, PaymentMethod, ImportJobStatus,
  Transaction, DraftTransaction, FileMapping, AiFinanceFeedbackCard,
  AIClassification, RecurringEntry, TaxonomyCategory,
} from "./types"

export function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function formatMoney(value: number): string {
  return CURRENCY.format(value)
}

export function cashFlowToneClass(value: number): string {
  if (value > 0) return "text-emerald-300"
  if (value < 0) return "text-rose-400"
  return "text-slate-300"
}

export function formatCompactCashFlow(value: number): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : ""
  const absValue = Math.abs(value)
  if (absValue >= 10000) return `${prefix}${(absValue / 10000).toFixed(1)}萬`
  if (absValue >= 1000) return `${prefix}${(absValue / 1000).toFixed(0)}k`
  return `${prefix}${formatMoney(absValue)}`
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-")
  if (!year || !month) return monthKey
  return `${year} 年 ${Number(month)} 月`
}

export function formatYmd(year: number, month: number, day: number): string {
  if (month < 1 || month > 12 || day < 1 || day > 31) return new Date().toISOString().slice(0, 10)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function parseYmdDate(dateString: string): Date | null {
  const matched = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return null
  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function shiftDateByDays(dateString: string, days: number): string {
  const d = parseYmdDate(dateString)
  if (!d) return dateString
  d.setDate(d.getDate() + days)
  return formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export function formatEntryDateLabel(dateString: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = shiftDateByDays(today, -1)
  const tomorrow = shiftDateByDays(today, 1)
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  const w = WEEKDAY_ZH[d.getDay()]
  const base = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} 星期${w}`
  if (dateString === today) return `今日 ${base}`
  if (dateString === yesterday) return `昨日 ${base}`
  if (dateString === tomorrow) return `明日 ${base}`
  return base
}

export function formatDateGroup(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const w = WEEKDAY_ZH[date.getDay()]
  return `${y}/${m}/${d} 星期${w}`
}

export function shiftMonthKey(monthKey: string, offset: number): string {
  const [yearText, monthText] = monthKey.split("-")
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey
  const date = new Date(year, month - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function getFileExt(filename: string): string {
  const parts = filename.split(".")
  if (parts.length < 2) return "unknown"
  return parts.at(-1)!.toLowerCase()
}

export function toColumnLabel(columnKey: string): string {
  if (columnKey === "none") return "不使用"
  return `欄位 ${columnKey.replace("col_", "")}`
}

export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.-]/g, "")
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null
  const numeric = Number(cleaned)
  if (!Number.isFinite(numeric)) return null
  return numeric
}

export function normalizeBulkLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .flatMap(line => line.split(/[，,；;、。]/))
    .map(line => line.trim())
    .filter(Boolean)
}

export function shouldParseAsBulkText(input: string): boolean {
  const lines = normalizeBulkLines(input)
  if (lines.length <= 1) return false
  const linesWithAmount = lines.filter(line => extractAmountFromText(line) !== null).length
  return linesWithAmount >= 2 || lines.length >= 3
}

export function extractAmountFromText(text: string): number | null {
  const matched = text.match(/-?\d[\d,]*(?:\.\d+)?/g)
  if (!matched || matched.length === 0) return null
  const parsed = matched.map(item => parseNumber(item)).filter((item): item is number => item !== null)
  if (parsed.length === 0) return null
  const likely = parsed.filter(item => Math.abs(item) >= 10)
  if (likely.length > 0) return likely.at(-1)!
  return parsed.at(-1)!
}

export function getWeekRange(dateString: string): { start: string; end: string } {
  const date = parseYmdDate(dateString)
  if (!date) return { start: dateString, end: dateString }
  const day = date.getDay()
  const offsetToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setDate(date.getDate() + offsetToMonday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: formatYmd(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    end: formatYmd(end.getFullYear(), end.getMonth() + 1, end.getDate()),
  }
}

export function isDateWithinRange(dateString: string, start: string, end: string): boolean {
  return dateString >= start && dateString <= end
}

export function pickRandomFeedbackId(options: AiFinanceFeedbackCard[], lastPickedId: string | null): string {
  if (options.length === 0) return ""
  if (options.length === 1) return options[0].id
  const candidateIds = options.map(item => item.id).filter(id => id !== lastPickedId)
  const pool = candidateIds.length > 0 ? candidateIds : options.map(item => item.id)
  return pool[Math.floor(Math.random() * pool.length)]
}

export function formatChangeAgainstPrevious(current: number, previous: number): string {
  if (current === 0 && previous === 0) return "和上週差不多"
  if (previous <= 0) return current > 0 ? "比上週開始有支出" : "和上週差不多"
  const changeRate = ((current - previous) / previous) * 100
  if (Math.abs(changeRate) < 8) return "和上週差不多"
  return `比上週${changeRate > 0 ? "多" : "少"} ${Math.round(Math.abs(changeRate))}%`
}

export function isDrinkRelatedTransaction(item: Transaction): boolean {
  if (item.direction !== "expense") return false
  const categoryName = CATEGORY_BY_KEY.get(item.category_key)?.display_name_zh ?? ""
  const content = `${item.note} ${categoryName}`.toLowerCase()
  return AI_FEEDBACK_DRINK_KEYWORDS.some(keyword => content.includes(keyword))
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function normalizeOccurrenceLimit(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value)) return null
  return clampInteger(value, 1, MAX_RECURRING_OCCURRENCES)
}

export function remainingRecurringOccurrences(rule: RecurringEntry, recordedCount: number): number | null {
  if (rule.occurrence_limit === null) return null
  return Math.max(rule.occurrence_limit - recordedCount, 0)
}

export function hasRemainingRecurringOccurrences(rule: RecurringEntry, recordedCount: number): boolean {
  return remainingRecurringOccurrences(rule, recordedCount) !== 0
}

export function extractDateFromText(text: string): string {
  const full = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (full) return formatYmd(Number(full[1]), Number(full[2]), Number(full[3]))
  const short = text.match(/(\d{1,2})[/-](\d{1,2})/)
  if (short) return formatYmd(new Date().getFullYear(), Number(short[1]), Number(short[2]))
  const zh = text.match(/(\d{1,2})月(\d{1,2})日/)
  if (zh) return formatYmd(new Date().getFullYear(), Number(zh[1]), Number(zh[2]))
  return new Date().toISOString().slice(0, 10)
}

export function recurringRuleLabel(rule: RecurringEntry): string {
  if (rule.frequency === "weekly") return `每週${WEEKDAY_ZH[rule.weekly_day] ?? "?"}`
  if (rule.frequency === "monthly") return `每月 ${rule.monthly_day} 號`
  return `每年 ${rule.yearly_month}/${rule.yearly_day}`
}

export function isRecurringDueOnDate(rule: RecurringEntry, dateString: string): boolean {
  if (dateString < rule.start_date) return false
  const date = parseYmdDate(dateString)
  if (!date) return false
  if (rule.frequency === "weekly") return date.getDay() === rule.weekly_day
  if (rule.frequency === "monthly") {
    const dueDay = Math.min(rule.monthly_day, daysInMonth(date.getFullYear(), date.getMonth() + 1))
    return date.getDate() === dueDay
  }
  if (date.getMonth() + 1 !== rule.yearly_month) return false
  const dueDay = Math.min(rule.yearly_day, daysInMonth(date.getFullYear(), rule.yearly_month))
  return date.getDate() === dueDay
}

export function collectRecurringDueDates(rule: RecurringEntry, startDate: string, endDate: string): string[] {
  if (startDate > endDate) return []
  const dueDates: string[] = []
  let cursor = startDate < rule.start_date ? rule.start_date : startDate
  for (let guard = 0; guard < 2000 && cursor <= endDate; guard += 1) {
    if (isRecurringDueOnDate(rule, cursor)) dueDates.push(cursor)
    const nextCursor = shiftDateByDays(cursor, 1)
    if (nextCursor === cursor) break
    cursor = nextCursor
  }
  return dueDates
}

export function findNextRecurringDueDate(rule: RecurringEntry, fromDate: string): string | null {
  let cursor = fromDate < rule.start_date ? rule.start_date : fromDate
  for (let guard = 0; guard < 800; guard += 1) {
    if (isRecurringDueOnDate(rule, cursor)) return cursor
    const nextCursor = shiftDateByDays(cursor, 1)
    if (nextCursor === cursor) break
    cursor = nextCursor
  }
  return null
}

export function inferDirection(text: string, amount: number | null): Direction {
  const normalized = text.toLowerCase()
  const incomeKeywords = ["收入", "賣", "出售", "出租", "分潤", "薪資", "薪水", "利息", "補助", "贈與", "收益", "入帳"]
  const expenseKeywords = ["支出", "買", "費", "還款", "付款", "房租", "水電", "瓦斯", "保險", "交通", "修繕", "添購"]
  if (amount !== null && amount < 0) return "expense"
  if (incomeKeywords.some(keyword => normalized.includes(keyword))) return "income"
  if (expenseKeywords.some(keyword => normalized.includes(keyword))) return "expense"
  return "unknown"
}

export function inferDomain(text: string): Domain {
  const normalized = text.toLowerCase()
  const businessKeywords = ["店", "客人", "營業", "進貨", "供應商", "行銷", "廣告", "批貨", "設備", "場地", "工讀生", "會計師", "包材"]
  const lifeKeywords = ["生活", "三餐", "買菜", "房貸", "信用卡", "學雜費", "手機", "看醫生", "家人", "保養", "捷運", "公車", "uber"]
  if (businessKeywords.some(keyword => normalized.includes(keyword))) return "business"
  if (lifeKeywords.some(keyword => normalized.includes(keyword))) return "life"
  return "unknown"
}

export function inferPaymentMethod(text: string): PaymentMethod {
  const normalized = text.toLowerCase().replaceAll(/\s+/g, "")
  if (["linepay", "line_pay"].some(k => normalized.includes(k))) return "line_pay"
  if (["信用卡", "刷卡", "visa", "mastercard", "amex"].some(k => normalized.includes(k))) return "credit_card"
  if (["簽帳卡", "金融卡", "debit"].some(k => normalized.includes(k))) return "debit_card"
  if (["現金", "cash"].some(k => normalized.includes(k))) return "cash"
  if (["轉帳", "匯款", "banktransfer", "atm"].some(k => normalized.includes(k))) return "bank_transfer"
  if (["街口", "applepay", "googlepay", "電子支付", "行動支付", "ewallet", "錢包"].some(k => normalized.includes(k))) return "other_e_wallet"
  return "unspecified"
}

export function resolveFallbackCategory(domain: Domain, direction: Direction): TaxonomyCategory {
  const safeDomain: Exclude<Domain, "unknown"> = domain === "business" ? "business" : "life"
  const safeDirection: Exclude<Direction, "unknown"> = direction === "income" ? "income" : "expense"
  const fallbackKey = FALLBACK_BY_DOMAIN_DIRECTION[safeDomain][safeDirection]
  return CATEGORY_BY_KEY.get(fallbackKey) ?? TAXONOMY[0]
}

export function classifyLine(text: string, amount: number | null): AIClassification {
  const normalized = text.toLowerCase()
  let bestCategory: TaxonomyCategory | null = null
  let bestScore = 0
  for (const category of TAXONOMY) {
    let score = 0
    if (normalized.includes(category.display_name_zh.toLowerCase())) score += 2
    for (const alias of category.aliases) {
      if (alias && normalized.includes(alias.toLowerCase())) score += 1
    }
    if (score > bestScore) { bestScore = score; bestCategory = category }
  }
  const inferredDirection = inferDirection(text, amount)
  const inferredDomain = inferDomain(text)
  const reasoningTags: string[] = []
  if (bestScore > 0) reasoningTags.push("keyword_hit")
  if (amount !== null) reasoningTags.push("pattern")
  if (bestScore === 0) reasoningTags.push("ambiguous")
  let domain: Domain = inferredDomain
  let direction: Direction = inferredDirection
  let category = bestCategory
  if (category) { domain = category.domain; direction = category.direction }
  if (!category) {
    const fallback = resolveFallbackCategory(domain, direction)
    category = fallback; domain = fallback.domain; direction = fallback.direction
  }
  let confidence = 0.35
  if (amount !== null) confidence += 0.15
  confidence += Math.min(0.35, bestScore * 0.12)
  if (inferredDirection !== "unknown") confidence += 0.08
  if (inferredDomain !== "unknown") confidence += 0.07
  if (bestScore === 0) confidence -= 0.08
  confidence = Math.max(0.25, Math.min(0.95, confidence))
  return { domain, direction, category_key: category.category_key, confidence, extracted: { amount, occurred_at: extractDateFromText(text), merchant_or_context: text.slice(0, 60) }, reasoning_tags: reasoningTags }
}

export function buildDraftTransaction(line: string, inputMode: InputMode, sourceFileId?: string): DraftTransaction {
  const amount = extractAmountFromText(line)
  const classification = classifyLine(line, amount)
  const category = CATEGORY_BY_KEY.get(classification.category_key) ?? resolveFallbackCategory("life", "expense")
  const paymentMethod = inferPaymentMethod(line)
  return {
    id: uid("draft"),
    user_id: DEMO_USER_ID,
    occurred_at: classification.extracted.occurred_at ?? new Date().toISOString().slice(0, 10),
    amount: Math.abs(amount ?? 0),
    direction: category.direction,
    domain: category.domain,
    category_key: category.category_key,
    note: line.trim(),
    input_mode: inputMode,
    payment_method: paymentMethod,
    source_file_id: sourceFileId,
    ai_predicted_category_key: category.category_key,
    ai_confidence: classification.confidence,
    user_overridden: false,
    raw_line: line,
    selected: true,
    parse_error: amount === null ? "找不到金額，請手動補上" : undefined,
    reasoning_tags: classification.reasoning_tags,
  }
}

export function extractRowsFromFileText(text: string): string[][] {
  const sanitized = text.replaceAll("\u0000", "")
  const lines = sanitized.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0).slice(0, 200)
  if (lines.length === 0) return []
  return lines.map(line => {
    if (line.includes("\t")) return line.split("\t").map(item => item.trim())
    if (line.includes(",")) return line.split(",").map(item => item.trim())
    if (line.includes("，")) return line.split("，").map(item => item.trim())
    return [line]
  })
}

export function inferDirectionFromCell(value: string): Direction {
  const normalized = value.toLowerCase()
  if (["收入", "income", "in", "進帳", "入帳"].some(token => normalized.includes(token))) return "income"
  if (["支出", "expense", "out", "扣款", "付款"].some(token => normalized.includes(token))) return "expense"
  return "unknown"
}

export function inferColumn(rows: string[][], test: (value: string) => boolean): number {
  const maxColumns = Math.max(...rows.map(row => row.length), 1)
  for (let column = 0; column < maxColumns; column += 1) {
    let hit = 0; let total = 0
    for (const row of rows.slice(0, 30)) {
      const value = row[column]?.trim()
      if (!value) continue
      total += 1
      if (test(value)) hit += 1
    }
    if (total > 0 && hit / total >= 0.4) return column
  }
  return -1
}

export function defaultMappingFromRows(rows: string[][]): FileMapping {
  const dateIndex = inferColumn(rows, value => /\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}|\d{1,2}月\d{1,2}日/.test(value))
  const amountIndex = inferColumn(rows, value => parseNumber(value) !== null)
  const descriptionIndex = rows[0]?.length && rows[0].length > 1 ? 1 : 0
  return {
    date_column: dateIndex >= 0 ? `col_${dateIndex + 1}` : "none",
    amount_column: amountIndex >= 0 ? `col_${amountIndex + 1}` : "none",
    description_column: `col_${descriptionIndex + 1}`,
    direction_mode: "sign",
    direction_column: "none",
  }
}

export function columnKeyToIndex(columnKey: string): number | null {
  if (columnKey === "none") return null
  const parsed = Number(columnKey.replace("col_", ""))
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed - 1
}

export function buildDraftsFromMappedRows(rows: string[][], mapping: FileMapping, sourceFileId: string, inputMode: InputMode): DraftTransaction[] {
  const dateIdx = columnKeyToIndex(mapping.date_column)
  const amountIdx = columnKeyToIndex(mapping.amount_column)
  const descIdx = columnKeyToIndex(mapping.description_column)
  const directionIdx = columnKeyToIndex(mapping.direction_column)
  return rows.map(row => {
    const dateValue = dateIdx !== null ? row[dateIdx] ?? "" : ""
    const amountValue = amountIdx !== null ? row[amountIdx] ?? "" : ""
    const descriptionValue = descIdx !== null ? row[descIdx] ?? "" : row.join(" ").trim()
    const assembledLine = `${dateValue} ${descriptionValue} ${amountValue}`.trim()
    const draft = buildDraftTransaction(assembledLine, inputMode, sourceFileId)
    const parsedAmount = parseNumber(amountValue)
    if (parsedAmount !== null) {
      draft.amount = Math.abs(parsedAmount)
      if (mapping.direction_mode === "sign") draft.direction = parsedAmount < 0 ? "expense" : "income"
    }
    if (mapping.direction_mode === "direction_column" && directionIdx !== null) {
      const inferred = inferDirectionFromCell(row[directionIdx] ?? "")
      if (inferred !== "unknown") draft.direction = inferred
    }
    const category = CATEGORY_BY_KEY.get(draft.category_key)
    if (category && draft.direction !== category.direction) {
      const fallback = resolveFallbackCategory(category.domain, draft.direction)
      draft.category_key = fallback.category_key; draft.domain = fallback.domain; draft.user_overridden = true
    }
    if (parsedAmount === null) { draft.parse_error = "找不到金額，請檢查欄位對應"; draft.selected = false }
    return draft
  })
}

export function confidenceTone(value: number): string {
  if (value >= 0.8) return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
  if (value >= 0.65) return "bg-amber-500/15 text-amber-200 border-amber-400/30"
  return "bg-rose-500/15 text-rose-200 border-rose-400/30"
}

export function domainLabel(domain: Domain): string {
  if (domain === "business") return "生意"
  if (domain === "life") return "生活"
  return "未判定"
}

export function directionLabel(direction: Direction): string {
  if (direction === "income") return "收入"
  if (direction === "expense") return "支出"
  return "未判定"
}

export function normalizePaymentMethod(value: string | null | undefined): PaymentMethod {
  if (!value) return "unspecified"
  const normalized = value.trim().toLowerCase().replaceAll(/\s+/g, "_")
  if (normalized === "linepay") return "line_pay"
  const validMethods = new Set<PaymentMethod>(PAYMENT_METHOD_OPTIONS.map(o => o.value))
  if (validMethods.has(normalized as PaymentMethod)) return normalized as PaymentMethod
  return "unspecified"
}

export function paymentMethodFieldLabel(direction: Direction): string {
  return direction === "income" ? "入帳方式" : "付款方式"
}

export function paymentMethodLabel(method: string | null | undefined): string {
  const normalized = normalizePaymentMethod(method)
  const methodMap: Record<PaymentMethod, string> = {
    cash: "現金", credit_card: "信用卡", debit_card: "簽帳金融卡",
    bank_transfer: "轉帳 / 匯款", line_pay: "LINE Pay",
    other_e_wallet: "其他電子支付", other: "其他", unspecified: "未指定",
  }
  return methodMap[normalized]
}

export function importStatusLabel(status: ImportJobStatus): string {
  const statusMap: Record<ImportJobStatus, string> = {
    uploaded: "已上傳", parsed: "已解析", mapped: "已對應欄位",
    ready_to_import: "可匯入", imported: "已完成匯入", failed: "處理失敗",
  }
  return statusMap[status]
}

export function speechErrorLabel(errorCode: string): string {
  const messageMap: Record<string, string> = {
    "no-speech": "沒有聽到聲音，請再說一次。",
    "audio-capture": "找不到麥克風，請確認裝置權限。",
    "not-allowed": "沒有麥克風權限，請在瀏覽器允許後再試。",
    aborted: "語音輸入已中止。",
    network: "網路異常，語音辨識暫時不可用。",
    "service-not-allowed": "此環境不允許語音辨識服務。",
  }
  return messageMap[errorCode] ?? "語音辨識發生問題，請再試一次。"
}

export function modeLabel(mode: InputMode): string {
  if (mode === "text_single" || mode === "voice_single" || mode === "bulk_text") return "智慧輸入"
  if (mode === "photo_single") return "照片上傳"
  if (mode === "file_import") return "檔案匯入"
  return mode
}

export function categoryLabel(categoryKey: string): string {
  const category = CATEGORY_BY_KEY.get(categoryKey)
  if (!category) return categoryKey
  return `${domainLabel(category.domain)}${directionLabel(category.direction)}｜${category.display_name_zh}`
}

export function categoryFullLabel(categoryKey: string): string {
  const category = CATEGORY_BY_KEY.get(categoryKey)
  if (!category) return categoryKey
  for (const group of TAXONOMY_GROUPS) {
    if (group.keys.includes(categoryKey)) return `${group.label}-${category.display_name_zh}`
  }
  return `${domainLabel(category.domain)}${directionLabel(category.direction)}-${category.display_name_zh}`
}

export function feedbackAmountClass(current: number, previous: number): string {
  if (current < previous) return "text-emerald-300"
  if (current > previous) return "text-rose-300"
  return "text-amber-200"
}

export function pickFeedbackText(current: number, previous: number, lowerText: string, higherText: string, sameText: string): string {
  if (current < previous) return lowerText
  if (current > previous) return higherText
  return sameText
}

export function sumTransactionAmounts(items: Transaction[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

export function getFeedbackWeekRanges(referenceDate: string): { currentWeekRange: { start: string; end: string }; previousWeekRange: { start: string; end: string } } {
  const currentWeekRange = getWeekRange(referenceDate)
  return {
    currentWeekRange,
    previousWeekRange: { start: shiftDateByDays(currentWeekRange.start, -7), end: shiftDateByDays(currentWeekRange.end, -7) },
  }
}

export function createWeeklyExpenseFeedback(transactions: Transaction[]): AiFinanceFeedbackCard | null {
  const todayKey = new Date().toISOString().slice(0, 10)
  const { currentWeekRange, previousWeekRange } = getFeedbackWeekRanges(todayKey)
  const currentWeekExpense = sumTransactionAmounts(transactions.filter(item => item.direction === "expense" && isDateWithinRange(item.occurred_at, currentWeekRange.start, currentWeekRange.end)))
  const previousWeekExpense = sumTransactionAmounts(transactions.filter(item => item.direction === "expense" && isDateWithinRange(item.occurred_at, previousWeekRange.start, previousWeekRange.end)))
  if (currentWeekExpense <= 0 && previousWeekExpense <= 0) return null
  return {
    id: "weekly-expense",
    badge: "AI 支出雷達",
    title: pickFeedbackText(currentWeekExpense, previousWeekExpense, "本週支出有降溫，錢包終於不用全天待命。", "本週支出偏熱，錢包辛苦了，但還在可控範圍。", "本週支出節奏穩定，像開著財務巡航模式。"),
    metricLabel: "本週總支出",
    metricValue: formatMoney(currentWeekExpense),
    comparisonText: formatChangeAgainstPrevious(currentWeekExpense, previousWeekExpense),
    detailText: pickFeedbackText(currentWeekExpense, previousWeekExpense, "這代表你不是沒花，而是花得更有判斷，這種收斂很有價值。", "先別急著緊張，優先確認是一次性支出，還是日常花費真的升溫。", "波動不大通常是好事，代表日常支出規律度其實不錯。"),
    tipText: `建議先回看 ${currentWeekRange.start.slice(5).replace("-", "/")} - ${currentWeekRange.end.slice(5).replace("-", "/")} 裡最大的 1 到 2 筆支出，通常主因很快就會浮出來。`,
    amountClassName: feedbackAmountClass(currentWeekExpense, previousWeekExpense),
  }
}

export function createWeeklyDrinkFeedback(transactions: Transaction[]): AiFinanceFeedbackCard | null {
  const todayKey = new Date().toISOString().slice(0, 10)
  const { currentWeekRange, previousWeekRange } = getFeedbackWeekRanges(todayKey)
  const currentWeekDrinkSpend = sumTransactionAmounts(transactions.filter(item => isDrinkRelatedTransaction(item) && isDateWithinRange(item.occurred_at, currentWeekRange.start, currentWeekRange.end)))
  const previousWeekDrinkSpend = sumTransactionAmounts(transactions.filter(item => isDrinkRelatedTransaction(item) && isDateWithinRange(item.occurred_at, previousWeekRange.start, previousWeekRange.end)))
  if (currentWeekDrinkSpend <= 0 && previousWeekDrinkSpend <= 0) return null
  return {
    id: "weekly-drink",
    badge: "AI 小額偵測",
    title: pickFeedbackText(currentWeekDrinkSpend, previousWeekDrinkSpend, "本週飲料支出有收斂，糖分和預算都比較冷靜。", "本週飲料有點活躍，嘴巴很快樂，預算也有感。", "本週飲料支出維持恆溫，屬於熟悉的快樂配方。"),
    metricLabel: "本週飲料花費",
    metricValue: formatMoney(currentWeekDrinkSpend),
    comparisonText: formatChangeAgainstPrevious(currentWeekDrinkSpend, previousWeekDrinkSpend),
    detailText: currentWeekDrinkSpend === 0 ? "目前沒有飲料支出紀錄，預算面板表示尊敬。" : "飲料單筆不大，但累積速度常常比訊息通知還快，是很值得追的小額支出。",
    tipText: previousWeekDrinkSpend === 0 && currentWeekDrinkSpend > 0 ? "如果這週是臨時提神週，可以把這類支出獨立追蹤，避免它默默升級成固定班底。" : "先看最常出現的是咖啡、手搖還是超商飲料，第一個調整點通常就藏在那裡。",
    amountClassName: feedbackAmountClass(currentWeekDrinkSpend, previousWeekDrinkSpend),
  }
}

export function createMonthlyTopCategoryFeedback(currentMonthTx: Transaction[], monthExpense: number, selectedMonth: string): AiFinanceFeedbackCard | null {
  if (monthExpense <= 0) return null
  const expenseByCategory = new Map<string, number>()
  currentMonthTx.forEach(item => {
    if (item.direction !== "expense") return
    expenseByCategory.set(item.category_key, (expenseByCategory.get(item.category_key) ?? 0) + item.amount)
  })
  const topExpenseCategory = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!topExpenseCategory) return null
  const [topCategoryKey, topCategoryAmount] = topExpenseCategory
  const topCategoryName = CATEGORY_BY_KEY.get(topCategoryKey)?.display_name_zh ?? categoryLabel(topCategoryKey)
  const share = Math.round((topCategoryAmount / monthExpense) * 100)
  return {
    id: "monthly-top-category",
    badge: "AI 類別熱區",
    title: `本月「${topCategoryName}」戲份偏多，幾乎是支出主角。`,
    metricLabel: "本月累積",
    metricValue: formatMoney(topCategoryAmount),
    comparisonText: `占本月支出 ${share}%`,
    detailText: "最大宗支出最值得先看，因為只要微調一點，通常就比到處省 10 塊更有感。",
    tipText: `${formatMonthLabel(selectedMonth)} 若只先挑一類來優化，建議就從這裡開始，效率通常最高。`,
    amountClassName: "text-amber-200",
  }
}

export function createMonthlyPeakDayFeedback(currentMonthTx: Transaction[]): AiFinanceFeedbackCard | null {
  const expenseByDate = new Map<string, { total: number; count: number }>()
  currentMonthTx.forEach(item => {
    if (item.direction !== "expense") return
    const previous = expenseByDate.get(item.occurred_at) ?? { total: 0, count: 0 }
    expenseByDate.set(item.occurred_at, { total: previous.total + item.amount, count: previous.count + 1 })
  })
  const peakExpenseDay = [...expenseByDate.entries()].sort((a, b) => b[1].total - a[1].total)[0]
  if (!peakExpenseDay) return null
  const [date, stats] = peakExpenseDay
  return {
    id: "monthly-peak-day",
    badge: "AI 波峰掃描",
    title: "這一天是本月支出高峰，像預算圖上的小山頭。",
    metricLabel: formatDateGroup(date),
    metricValue: formatMoney(stats.total),
    comparisonText: `當天共 ${stats.count} 筆支出`,
    detailText: "高峰日不一定是問題，但很值得確認是聚餐、補貨，還是情緒性消費在偷偷加戲。",
    tipText: "如果類似高峰反覆出現，之後可以提前為那種情境預留預算，會輕鬆很多。",
    amountClassName: "text-rose-300",
  }
}

export function createMonthlyNetFeedback(monthNet: number, monthSavingRate: number | null, monthTxCount: number, monthInsightText: string): AiFinanceFeedbackCard | null {
  if (monthTxCount <= 0) return null
  return {
    id: "monthly-net",
    badge: "AI 現金流摘要",
    title: monthNet >= 0 ? "本月結餘為正，帳戶狀態像在默默回血。" : "本月結餘暫時偏緊，先別慌，這通常不是劇終。",
    metricLabel: "本月結餘",
    metricValue: monthNet > 0 ? `+${formatMoney(monthNet)}` : formatMoney(monthNet),
    comparisonText: monthSavingRate === null ? `已記 ${monthTxCount} 筆` : `目前儲蓄率 ${monthSavingRate.toFixed(1)}%`,
    detailText: monthInsightText,
    tipText: monthNet >= 0 ? "這種節奏可以延續，再慢慢優化大額支出，會比突然極端節省更穩。" : "先抓最大變因，不用一次修全部，通常把主因調整好，結餘就會先回來。",
    amountClassName: monthNet >= 0 ? "text-emerald-300" : "text-rose-300",
  }
}

export function createStarterFeedback(): AiFinanceFeedbackCard {
  return {
    id: "starter",
    badge: "AI 已待命",
    title: "先記幾筆，我就能開始讀懂你的金流個性。",
    metricLabel: "啟動條件",
    metricValue: "3 筆",
    comparisonText: "早餐、飲料、交通最適合啟動分析",
    detailText: "不用很多資料，幾筆日常支出就足夠讓我先抓出你的花費節奏。",
    tipText: "資料一多，這裡就會像專屬儀表板一樣，給你帶點幽默的重點提醒。",
    amountClassName: "text-indigo-200",
  }
}

export function mapBusinessExpenseCategory(displayName: string): string {
  const fixedExpenseTypes = new Set(["租金", "水電", "通訊", "人事", "固定其他", "還款"])
  const variableExpenseTypes = new Set(["原料", "包材", "耗材", "運費", "瓦斯", "變動其他"])
  if (fixedExpenseTypes.has(displayName)) return "固定支出"
  if (variableExpenseTypes.has(displayName)) return "變動支出"
  return "額外支出"
}

export function mapLifeExpenseCategory(displayName: string): string {
  const mapping: Record<string, string> = { 食: "食", 衣: "衣", 住: "住", 行: "行", 育: "育", 樂: "樂", 電信: "電信", 醫療: "醫療", "保險(月繳)": "保險", 儲蓄: "儲蓄", 還款: "還款" }
  return mapping[displayName] ?? "其他"
}

export function toLegacyAnalysisData(transactions: Transaction[]): { incomes: import("./types").LegacyIncome[]; expenses: import("./types").LegacyExpense[] } {
  const incomes: import("./types").LegacyIncome[] = []
  const expenses: import("./types").LegacyExpense[] = []
  transactions.forEach(item => {
    if (item.amount <= 0) return
    const category = CATEGORY_BY_KEY.get(item.category_key)
    const domain: Exclude<Domain, "unknown"> = category?.domain ?? (item.domain === "business" ? "business" : "life")
    const direction: Exclude<Direction, "unknown"> = category?.direction ?? (item.direction === "income" ? "income" : "expense")
    const displayName = category?.display_name_zh ?? item.category_key
    if (direction === "income") {
      incomes.push({ date: item.occurred_at, category: domain === "business" ? "生意收入" : "生活收入", type: displayName, description: item.note, unitPrice: item.amount, quantity: 1, paymentStatus: "已收款", subtotal: item.amount, customerNote: item.user_overridden ? "已人工修正" : undefined })
      return
    }
    expenses.push({ date: item.occurred_at, category: domain === "business" ? "生意支出" : "生活支出", expenseCategory: domain === "business" ? mapBusinessExpenseCategory(displayName) : mapLifeExpenseCategory(displayName), type: displayName, description: item.note, unitPrice: item.amount, quantity: 1, subtotal: item.amount })
  })
  return { incomes, expenses }
}

export function toTransaction(item: DraftTransaction): Transaction {
  return {
    id: item.id,
    user_id: item.user_id,
    occurred_at: item.occurred_at,
    amount: item.amount,
    direction: item.direction,
    domain: item.domain,
    category_key: item.category_key,
    note: item.note,
    input_mode: item.input_mode,
    payment_method: normalizePaymentMethod(item.payment_method),
    source_file_id: item.source_file_id,
    ai_predicted_category_key: item.ai_predicted_category_key,
    ai_confidence: item.ai_confidence,
    user_overridden: item.user_overridden,
  }
}

export function normalizeTransaction(item: Transaction): Transaction {
  return { ...item, payment_method: normalizePaymentMethod(item.payment_method) }
}
