"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  FileUp,
  Mic,
  NotebookPen,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import CashFlowAnalysis from "./components/cash-flow-analysis"
import FinancialReport from "./components/financial-report"

type Domain = "business" | "life" | "unknown"
type Direction = "income" | "expense" | "unknown"
type InputMode = "text_single" | "voice_single" | "photo_single" | "bulk_text" | "file_import"
type UploadKind = "none" | "image" | "document"
type OverviewDirectionFilter = "all" | "income" | "expense"
type ImportJobStatus = "uploaded" | "parsed" | "mapped" | "ready_to_import" | "imported" | "failed"
type PageStep = "home" | "quick-add" | "confirm" | "overview" | "analysis"

interface TaxonomyCategory {
  category_key: string
  display_name_zh: string
  domain: Exclude<Domain, "unknown">
  direction: Exclude<Direction, "unknown">
  aliases: string[]
  examples: string[]
  rules: string[]
}

interface AIClassification {
  domain: Domain
  direction: Direction
  category_key: string
  confidence: number
  extracted: {
    amount: number | null
    occurred_at?: string
    merchant_or_context?: string
  }
  reasoning_tags: string[]
}

interface Transaction {
  id: string
  user_id: string
  occurred_at: string
  amount: number
  direction: Direction
  domain: Domain
  category_key: string
  note: string
  input_mode: InputMode
  source_file_id?: string
  ai_predicted_category_key: string
  ai_confidence: number
  user_overridden: boolean
}

interface DraftTransaction extends Transaction {
  raw_line: string
  selected: boolean
  parse_error?: string
  reasoning_tags?: string[]
}

interface ImportJob {
  job_id: string
  user_id: string
  input_mode: "bulk_text" | "file_import"
  status: ImportJobStatus
  errors: string[]
  stats: {
    total_lines: number
    success_lines: number
    needs_manual_lines: number
  }
}

interface FileMapping {
  date_column: string
  amount_column: string
  description_column: string
  direction_mode: "direction_column" | "sign"
  direction_column: string
}

interface TransactionEditDraft {
  occurred_at: string
  amount: string
  category_key: string
  note: string
}

interface LegacyIncome {
  date: string
  weather?: string
  customerCount?: number
  category: string
  type: string
  description: string
  unitPrice: number
  quantity: number
  paymentStatus: string
  subtotal: number
  customerNote?: string
}

interface LegacyExpense {
  date: string
  category: string
  expenseCategory: string
  type: string
  description: string
  unitPrice: number
  quantity: number
  subtotal: number
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const DEMO_USER_ID = "local-demo-user"
const LEGACY_STORAGE_TX_KEY = "mvp_transactions_v3"
const LEGACY_STORAGE_TEMPLATE_KEY = "mvp_import_templates_v1"
const INDEXED_DB_NAME = "basic_accounting_calculator"
const INDEXED_DB_VERSION = 1
const INDEXED_DB_STORE = "app_state"
const INDEXED_DB_TX_KEY = "transactions"
const INDEXED_DB_TEMPLATE_KEY = "import_templates"

let indexedDbPromise: Promise<IDBDatabase> | null = null

function getIndexedDbInstance(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("瀏覽器不支援 IndexedDB"))
  }

  if (!indexedDbPromise) {
    indexedDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
          db.createObjectStore(INDEXED_DB_STORE)
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error("本機資料庫開啟失敗"))
      request.onblocked = () => reject(new Error("本機資料庫被鎖定，請關閉其他分頁後再試"))
    })
  }

  return indexedDbPromise
}

async function readIndexedDbValue<T>(key: string): Promise<T | undefined> {
  const db = await getIndexedDbInstance()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, "readonly")
    const store = tx.objectStore(INDEXED_DB_STORE)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error ?? new Error("本機資料庫讀取失敗"))
  })
}

async function writeIndexedDbValue<T>(key: string, value: T): Promise<void> {
  const db = await getIndexedDbInstance()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, "readwrite")
    const store = tx.objectStore(INDEXED_DB_STORE)
    store.put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("本機資料庫寫入失敗"))
  })
}

const MODE_OPTIONS: Array<{
  mode: InputMode
  title: string
  description: string
  icon: typeof NotebookPen
}> = [
  {
    mode: "text_single",
    title: "文字/語音/流水帳輸入",
    description: "同一輸入框，系統自動判斷單筆或流水帳批次",
    icon: NotebookPen,
  },
  {
    mode: "file_import",
    title: "上傳輸入（照片／試算表／文件／可攜式文件）",
    description: "一次上傳，自動切換照片或檔案匯入流程",
    icon: FileUp,
  },
]

const TAXONOMY: TaxonomyCategory[] = [
  {
    category_key: "business_expense_raw_material",
    display_name_zh: "原料",
    domain: "business",
    direction: "expense",
    aliases: ["原料", "材料", "批貨", "進貨", "食材", "咖啡豆", "成本"],
    examples: ["買材料 900", "進貨 12000"],
    rules: ["material", "inventory"],
  },
  {
    category_key: "business_expense_marketing",
    display_name_zh: "行銷廣告",
    domain: "business",
    direction: "expense",
    aliases: ["行銷", "廣告", "dm", "名片", "招牌", "宣傳"],
    examples: ["廣告費 3000"],
    rules: ["marketing"],
  },
  {
    category_key: "business_expense_variable_other",
    display_name_zh: "變動其他",
    domain: "business",
    direction: "expense",
    aliases: ["交通費", "工讀生", "臨時人力", "變動其他"],
    examples: ["工讀生薪資 2000"],
    rules: ["variable_other"],
  },
  {
    category_key: "business_expense_repayment",
    display_name_zh: "還款",
    domain: "business",
    direction: "expense",
    aliases: ["信扶", "進貨貸款", "創業貸款", "還款"],
    examples: ["信扶專案貸款還款 5000"],
    rules: ["business_repayment"],
  },
  {
    category_key: "business_expense_extra_other",
    display_name_zh: "額外其他",
    domain: "business",
    direction: "expense",
    aliases: ["無法分類", "額外其他", "其他支出"],
    examples: ["其他支出 800"],
    rules: ["business_other_expense"],
  },
  {
    category_key: "business_expense_gas",
    display_name_zh: "瓦斯",
    domain: "business",
    direction: "expense",
    aliases: ["瓦斯", "天然氣"],
    examples: ["瓦斯費 700"],
    rules: ["gas"],
  },
  {
    category_key: "business_income_secondhand_equipment_sale",
    display_name_zh: "二手設備出售",
    domain: "business",
    direction: "income",
    aliases: ["二手設備出售", "出售舊設備", "賣設備"],
    examples: ["出售舊設備收入 15000"],
    rules: ["asset_sale"],
  },
  {
    category_key: "business_income_space_rent",
    display_name_zh: "場地出租",
    domain: "business",
    direction: "income",
    aliases: ["場地出租", "出租攤位", "店面分租"],
    examples: ["場地出租收入 5000"],
    rules: ["space_rent"],
  },
  {
    category_key: "business_expense_utilities",
    display_name_zh: "水電",
    domain: "business",
    direction: "expense",
    aliases: ["水電", "電費", "水費", "營業用電"],
    examples: ["水電費 3200"],
    rules: ["utility"],
  },
  {
    category_key: "business_income_service",
    display_name_zh: "服務提供收入",
    domain: "business",
    direction: "income",
    aliases: ["服務提供收入", "服務收入", "顧問收入", "教學收入"],
    examples: ["提供設計服務收入 8000"],
    rules: ["service_income"],
  },
  {
    category_key: "business_expense_communication",
    display_name_zh: "通訊",
    domain: "business",
    direction: "expense",
    aliases: ["通訊", "店內電話", "營業網路", "網路費"],
    examples: ["店內網路費 1299"],
    rules: ["communication"],
  },
  {
    category_key: "business_expense_rent",
    display_name_zh: "租金",
    domain: "business",
    direction: "expense",
    aliases: ["店租", "攤位租金", "租金", "場租"],
    examples: ["店租 18000"],
    rules: ["rent"],
  },
  {
    category_key: "business_expense_consumables",
    display_name_zh: "耗材",
    domain: "business",
    direction: "expense",
    aliases: ["耗材", "收據", "文具", "清潔用品"],
    examples: ["清潔用品 600"],
    rules: ["consumables"],
  },
  {
    category_key: "business_expense_fixed_other",
    display_name_zh: "固定其他",
    domain: "business",
    direction: "expense",
    aliases: ["固定其他", "營業稅", "會計費"],
    examples: ["會計費 3000"],
    rules: ["fixed_other"],
  },
  {
    category_key: "business_expense_shipping",
    display_name_zh: "運費",
    domain: "business",
    direction: "expense",
    aliases: ["運費", "宅配", "郵資", "快遞"],
    examples: ["宅配費 450"],
    rules: ["shipping"],
  },
  {
    category_key: "business_income_product_sale",
    display_name_zh: "商品銷售收入",
    domain: "business",
    direction: "income",
    aliases: ["商品銷售收入", "賣貨", "銷售", "營收", "出貨收入"],
    examples: ["今日賣貨 3200"],
    rules: ["product_sale"],
  },
  {
    category_key: "business_expense_hr",
    display_name_zh: "人事",
    domain: "business",
    direction: "expense",
    aliases: ["人事", "會計師", "助理", "工會", "薪資支出"],
    examples: ["助理薪資 22000"],
    rules: ["hr"],
  },
  {
    category_key: "business_expense_packaging",
    display_name_zh: "包材",
    domain: "business",
    direction: "expense",
    aliases: ["包材", "塑膠袋", "免洗餐具", "外帶盒"],
    examples: ["外帶盒 1200"],
    rules: ["packaging"],
  },
  {
    category_key: "business_expense_equipment_repair",
    display_name_zh: "器材修繕",
    domain: "business",
    direction: "expense",
    aliases: ["器材修繕", "設備維修", "故障維修"],
    examples: ["咖啡機維修 3500"],
    rules: ["equipment_repair"],
  },
  {
    category_key: "business_expense_equipment_purchase",
    display_name_zh: "設備添購",
    domain: "business",
    direction: "expense",
    aliases: ["設備添購", "買機器", "設備採購", "器材購入"],
    examples: ["購買封口機 12000"],
    rules: ["equipment_purchase"],
  },
  {
    category_key: "business_income_revenue_share",
    display_name_zh: "合作分潤",
    domain: "business",
    direction: "income",
    aliases: ["合作分潤", "分成收入", "聯名分潤"],
    examples: ["合作分潤 6000"],
    rules: ["revenue_share"],
  },
  {
    category_key: "business_income_other_entrepreneurial",
    display_name_zh: "其他創業相關收入",
    domain: "business",
    direction: "income",
    aliases: ["其他創業相關收入", "其他營業收入"],
    examples: ["其他營業收入 2000"],
    rules: ["business_other_income"],
  },
  {
    category_key: "life_income_savings",
    display_name_zh: "儲蓄",
    domain: "life",
    direction: "income",
    aliases: ["儲蓄", "存錢", "存入"],
    examples: ["儲蓄 5000"],
    rules: ["savings"],
  },
  {
    category_key: "life_income_interest",
    display_name_zh: "利息收入",
    domain: "life",
    direction: "income",
    aliases: ["利息收入", "利息"],
    examples: ["利息收入 320"],
    rules: ["interest_income"],
  },
  {
    category_key: "life_income_gov_subsidy",
    display_name_zh: "政府定期補助",
    domain: "life",
    direction: "income",
    aliases: ["政府定期補助", "補助", "津貼"],
    examples: ["政府補助 2400"],
    rules: ["gov_subsidy"],
  },
  {
    category_key: "life_income_rent",
    display_name_zh: "租金收入",
    domain: "life",
    direction: "income",
    aliases: ["租金收入", "房租收入", "出租收入"],
    examples: ["租金收入 12000"],
    rules: ["life_rent_income"],
  },
  {
    category_key: "life_expense_medical",
    display_name_zh: "醫療",
    domain: "life",
    direction: "expense",
    aliases: ["醫療", "看醫生", "掛號費", "成藥", "醫療器材"],
    examples: ["看醫生 500"],
    rules: ["medical"],
  },
  {
    category_key: "life_expense_telecom",
    display_name_zh: "電信",
    domain: "life",
    direction: "expense",
    aliases: ["電信", "手機月租", "電話費", "網路費"],
    examples: ["手機月租 999"],
    rules: ["telecom"],
  },
  {
    category_key: "life_expense_repayment",
    display_name_zh: "還款",
    domain: "life",
    direction: "expense",
    aliases: ["信用卡", "車貸", "房貸", "信貸", "還款"],
    examples: ["信用卡還款 8000"],
    rules: ["life_repayment"],
  },
  {
    category_key: "life_income_family_gift",
    display_name_zh: "親友贈與",
    domain: "life",
    direction: "income",
    aliases: ["親友贈與", "贈與", "家人給", "紅包收入"],
    examples: ["親友贈與 3000"],
    rules: ["family_gift"],
  },
  {
    category_key: "life_expense_education",
    display_name_zh: "育",
    domain: "life",
    direction: "expense",
    aliases: ["育", "教育費", "學雜費", "補習", "小孩生活費"],
    examples: ["學費 12000"],
    rules: ["education"],
  },
  {
    category_key: "life_income_pension",
    display_name_zh: "退休金/年金",
    domain: "life",
    direction: "income",
    aliases: ["退休金", "年金"],
    examples: ["年金入帳 15000"],
    rules: ["pension"],
  },
  {
    category_key: "life_income_other",
    display_name_zh: "其他生活收入",
    domain: "life",
    direction: "income",
    aliases: ["其他生活收入", "其他收入"],
    examples: ["其他收入 1200"],
    rules: ["life_other_income"],
  },
  {
    category_key: "life_expense_clothing",
    display_name_zh: "衣",
    domain: "life",
    direction: "expense",
    aliases: ["衣", "衣褲", "剪髮", "保養品", "鞋子"],
    examples: ["買衣服 1800"],
    rules: ["clothing"],
  },
  {
    category_key: "life_income_investment",
    display_name_zh: "定期投資收益",
    domain: "life",
    direction: "income",
    aliases: ["定期投資收益", "投資收益", "配息"],
    examples: ["投資收益 2600"],
    rules: ["investment_income"],
  },
  {
    category_key: "life_expense_food",
    display_name_zh: "食",
    domain: "life",
    direction: "expense",
    aliases: ["食", "三餐", "零食", "飲品", "買菜", "晚餐", "早餐"],
    examples: ["午餐 120"],
    rules: ["food"],
  },
  {
    category_key: "life_expense_other",
    display_name_zh: "其他",
    domain: "life",
    direction: "expense",
    aliases: ["其他", "請客", "個人進修", "給父母生活費", "宗教奉獻", "紅包"],
    examples: ["其他支出 700"],
    rules: ["life_other_expense"],
  },
  {
    category_key: "life_expense_fun",
    display_name_zh: "樂",
    domain: "life",
    direction: "expense",
    aliases: ["樂", "電影", "遊樂園", "展覽", "娛樂"],
    examples: ["電影 320"],
    rules: ["fun"],
  },
  {
    category_key: "life_expense_insurance",
    display_name_zh: "保險(月繳)",
    domain: "life",
    direction: "expense",
    aliases: ["保險", "健保", "壽險", "醫療險", "保險(月繳)"],
    examples: ["保險月繳 2200"],
    rules: ["insurance"],
  },
  {
    category_key: "life_expense_housing",
    display_name_zh: "住",
    domain: "life",
    direction: "expense",
    aliases: ["住", "房租", "生活用品", "居家用品"],
    examples: ["房租 15000"],
    rules: ["housing"],
  },
  {
    category_key: "life_income_temp_work",
    display_name_zh: "臨時性工作",
    domain: "life",
    direction: "income",
    aliases: ["臨時性工作", "打工收入", "日薪"],
    examples: ["臨時工作 2000"],
    rules: ["temp_work_income"],
  },
  {
    category_key: "life_income_side_hustle",
    display_name_zh: "副業收入",
    domain: "life",
    direction: "income",
    aliases: ["副業收入", "接案收入", "兼職收入"],
    examples: ["副業收入 5000"],
    rules: ["side_hustle_income"],
  },
  {
    category_key: "life_expense_transport",
    display_name_zh: "行",
    domain: "life",
    direction: "expense",
    aliases: ["行", "油錢", "維修保養", "大眾運輸", "捷運", "公車", "uber", "交通"],
    examples: ["捷運 30"],
    rules: ["transport"],
  },
  {
    category_key: "life_income_salary",
    display_name_zh: "薪資收入",
    domain: "life",
    direction: "income",
    aliases: ["薪資收入", "薪水", "月薪", "薪資"],
    examples: ["薪資收入 42000"],
    rules: ["salary_income"],
  },
]

const CATEGORY_BY_KEY = new Map(TAXONOMY.map(item => [item.category_key, item]))
const CURRENCY = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 })

const DEFAULT_MAPPING: FileMapping = {
  date_column: "none",
  amount_column: "none",
  description_column: "col_1",
  direction_mode: "sign",
  direction_column: "none",
}

const FALLBACK_BY_DOMAIN_DIRECTION: Record<
  Exclude<Domain, "unknown">,
  Record<Exclude<Direction, "unknown">, string>
> = {
  business: {
    income: "business_income_other_entrepreneurial",
    expense: "business_expense_extra_other",
  },
  life: {
    income: "life_income_other",
    expense: "life_expense_other",
  },
}

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "seed_tx_1",
    user_id: DEMO_USER_ID,
    occurred_at: new Date().toISOString().slice(0, 10),
    amount: 3200,
    direction: "income",
    domain: "business",
    category_key: "business_income_product_sale",
    note: "今日賣貨 3200",
    input_mode: "text_single",
    ai_predicted_category_key: "business_income_product_sale",
    ai_confidence: 0.89,
    user_overridden: false,
  },
  {
    id: "seed_tx_2",
    user_id: DEMO_USER_ID,
    occurred_at: new Date().toISOString().slice(0, 10),
    amount: 900,
    direction: "expense",
    domain: "business",
    category_key: "business_expense_raw_material",
    note: "買材料 900",
    input_mode: "text_single",
    ai_predicted_category_key: "business_expense_raw_material",
    ai_confidence: 0.86,
    user_overridden: false,
  },
  {
    id: "seed_tx_3",
    user_id: DEMO_USER_ID,
    occurred_at: new Date().toISOString().slice(0, 10),
    amount: 120,
    direction: "expense",
    domain: "life",
    category_key: "life_expense_food",
    note: "晚餐 120",
    input_mode: "text_single",
    ai_predicted_category_key: "life_expense_food",
    ai_confidence: 0.8,
    user_overridden: false,
  },
]

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatMoney(value: number): string {
  return CURRENCY.format(value)
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-")
  if (!year || !month) return monthKey
  return `${year} 年 ${Number(month)} 月`
}

function shiftMonthKey(monthKey: string, offset: number): string {
  const [yearText, monthText] = monthKey.split("-")
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey

  const date = new Date(year, month - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function getFileExt(filename: string): string {
  const parts = filename.split(".")
  if (parts.length < 2) return "unknown"
  return parts[parts.length - 1].toLowerCase()
}

function isImageUploadFile(file: File): boolean {
  const ext = getFileExt(file.name)
  const imageExts = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif"])
  return file.type.startsWith("image/") || imageExts.has(ext)
}

function toColumnLabel(columnKey: string): string {
  if (columnKey === "none") return "不使用"
  return `欄位 ${columnKey.replace("col_", "")}`
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.-]/g, "")
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null
  const numeric = Number(cleaned)
  if (!Number.isFinite(numeric)) return null
  return numeric
}

function normalizeBulkLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .flatMap(line => line.split(/[，,；;、。]/))
    .map(line => line.trim())
    .filter(Boolean)
}

function shouldParseAsBulkText(input: string): boolean {
  const lines = normalizeBulkLines(input)
  if (lines.length <= 1) return false
  const linesWithAmount = lines.filter(line => extractAmountFromText(line) !== null).length
  return linesWithAmount >= 2 || lines.length >= 3
}

function extractAmountFromText(text: string): number | null {
  const matched = text.match(/-?\d[\d,]*(?:\.\d+)?/g)
  if (!matched || matched.length === 0) return null

  const parsed = matched
    .map(item => parseNumber(item))
    .filter((item): item is number => item !== null)

  if (parsed.length === 0) return null
  const likely = parsed.filter(item => Math.abs(item) >= 10)
  if (likely.length > 0) return likely[likely.length - 1]
  return parsed[parsed.length - 1]
}

function formatYmd(year: number, month: number, day: number): string {
  if (month < 1 || month > 12 || day < 1 || day > 31) return new Date().toISOString().slice(0, 10)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function extractDateFromText(text: string): string {
  const full = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (full) {
    return formatYmd(Number(full[1]), Number(full[2]), Number(full[3]))
  }

  const short = text.match(/(\d{1,2})[/-](\d{1,2})/)
  if (short) {
    const year = new Date().getFullYear()
    return formatYmd(year, Number(short[1]), Number(short[2]))
  }

  const zh = text.match(/(\d{1,2})月(\d{1,2})日/)
  if (zh) {
    const year = new Date().getFullYear()
    return formatYmd(year, Number(zh[1]), Number(zh[2]))
  }

  return new Date().toISOString().slice(0, 10)
}

function inferDirection(text: string, amount: number | null): Direction {
  const normalized = text.toLowerCase()
  const incomeKeywords = [
    "收入",
    "賣",
    "出售",
    "出租",
    "分潤",
    "薪資",
    "薪水",
    "利息",
    "補助",
    "贈與",
    "收益",
    "入帳",
  ]
  const expenseKeywords = [
    "支出",
    "買",
    "費",
    "還款",
    "付款",
    "房租",
    "水電",
    "瓦斯",
    "保險",
    "交通",
    "修繕",
    "添購",
  ]

  if (amount !== null && amount < 0) return "expense"
  if (incomeKeywords.some(keyword => normalized.includes(keyword))) return "income"
  if (expenseKeywords.some(keyword => normalized.includes(keyword))) return "expense"
  return "unknown"
}

function inferDomain(text: string): Domain {
  const normalized = text.toLowerCase()
  const businessKeywords = [
    "店",
    "客人",
    "營業",
    "進貨",
    "供應商",
    "行銷",
    "廣告",
    "批貨",
    "設備",
    "場地",
    "工讀生",
    "會計師",
    "包材",
  ]
  const lifeKeywords = [
    "生活",
    "三餐",
    "買菜",
    "房貸",
    "信用卡",
    "學雜費",
    "手機",
    "看醫生",
    "家人",
    "保養",
    "捷運",
    "公車",
    "uber",
  ]

  if (businessKeywords.some(keyword => normalized.includes(keyword))) return "business"
  if (lifeKeywords.some(keyword => normalized.includes(keyword))) return "life"
  return "unknown"
}

function resolveFallbackCategory(domain: Domain, direction: Direction): TaxonomyCategory {
  const safeDomain: Exclude<Domain, "unknown"> = domain === "business" ? "business" : "life"
  const safeDirection: Exclude<Direction, "unknown"> = direction === "income" ? "income" : "expense"
  const fallbackKey = FALLBACK_BY_DOMAIN_DIRECTION[safeDomain][safeDirection]
  return CATEGORY_BY_KEY.get(fallbackKey) ?? TAXONOMY[0]
}

function classifyLine(text: string, amount: number | null): AIClassification {
  const normalized = text.toLowerCase()
  let bestCategory: TaxonomyCategory | null = null
  let bestScore = 0

  for (const category of TAXONOMY) {
    let score = 0
    if (normalized.includes(category.display_name_zh.toLowerCase())) score += 2
    for (const alias of category.aliases) {
      if (alias && normalized.includes(alias.toLowerCase())) {
        score += 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
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

  if (category) {
    domain = category.domain
    direction = category.direction
  }

  if (!category) {
    const fallback = resolveFallbackCategory(domain, direction)
    category = fallback
    domain = fallback.domain
    direction = fallback.direction
  }

  let confidence = 0.35
  if (amount !== null) confidence += 0.15
  confidence += Math.min(0.35, bestScore * 0.12)
  if (inferredDirection !== "unknown") confidence += 0.08
  if (inferredDomain !== "unknown") confidence += 0.07
  if (bestScore === 0) confidence -= 0.08
  confidence = Math.max(0.25, Math.min(0.95, confidence))

  return {
    domain,
    direction,
    category_key: category.category_key,
    confidence,
    extracted: {
      amount,
      occurred_at: extractDateFromText(text),
      merchant_or_context: text.slice(0, 60),
    },
    reasoning_tags: reasoningTags,
  }
}

function buildDraftTransaction(line: string, inputMode: InputMode, sourceFileId?: string): DraftTransaction {
  const amount = extractAmountFromText(line)
  const classification = classifyLine(line, amount)
  const category = CATEGORY_BY_KEY.get(classification.category_key) ?? resolveFallbackCategory("life", "expense")

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

function extractRowsFromFileText(text: string): string[][] {
  const sanitized = text.replace(/\u0000/g, "")
  const lines = sanitized
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, 200)

  if (lines.length === 0) return []

  return lines.map(line => {
    if (line.includes("\t")) return line.split("\t").map(item => item.trim())
    if (line.includes(",")) return line.split(",").map(item => item.trim())
    if (line.includes("，")) return line.split("，").map(item => item.trim())
    return [line]
  })
}

function inferDirectionFromCell(value: string): Direction {
  const normalized = value.toLowerCase()
  if (["收入", "income", "in", "進帳", "入帳"].some(token => normalized.includes(token))) return "income"
  if (["支出", "expense", "out", "扣款", "付款"].some(token => normalized.includes(token))) return "expense"
  return "unknown"
}

function inferColumn(rows: string[][], test: (value: string) => boolean): number {
  const maxColumns = Math.max(...rows.map(row => row.length), 1)
  for (let column = 0; column < maxColumns; column += 1) {
    let hit = 0
    let total = 0
    for (const row of rows.slice(0, 30)) {
      const value = row[column]?.trim()
      if (!value) continue
      total += 1
      if (test(value)) hit += 1
    }
    if (total > 0 && hit / total >= 0.4) {
      return column
    }
  }
  return -1
}

function defaultMappingFromRows(rows: string[][]): FileMapping {
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

function columnKeyToIndex(columnKey: string): number | null {
  if (columnKey === "none") return null
  const parsed = Number(columnKey.replace("col_", ""))
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed - 1
}

function buildDraftsFromMappedRows(
  rows: string[][],
  mapping: FileMapping,
  sourceFileId: string,
  inputMode: InputMode
): DraftTransaction[] {
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
      if (mapping.direction_mode === "sign") {
        draft.direction = parsedAmount < 0 ? "expense" : "income"
      }
    }

    if (mapping.direction_mode === "direction_column" && directionIdx !== null) {
      const inferred = inferDirectionFromCell(row[directionIdx] ?? "")
      if (inferred !== "unknown") {
        draft.direction = inferred
      }
    }

    const category = CATEGORY_BY_KEY.get(draft.category_key)
    if (category && draft.direction !== category.direction) {
      const fallback = resolveFallbackCategory(category.domain, draft.direction)
      draft.category_key = fallback.category_key
      draft.domain = fallback.domain
      draft.user_overridden = true
    }

    if (parsedAmount === null) {
      draft.parse_error = "找不到金額，請檢查欄位對應"
      draft.selected = false
    }

    return draft
  })
}

function confidenceTone(value: number): string {
  if (value >= 0.8) return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
  if (value >= 0.65) return "bg-amber-500/15 text-amber-200 border-amber-400/30"
  return "bg-rose-500/15 text-rose-200 border-rose-400/30"
}

function domainLabel(domain: Domain): string {
  if (domain === "business") return "生意"
  if (domain === "life") return "生活"
  return "未判定"
}

function directionLabel(direction: Direction): string {
  if (direction === "income") return "收入"
  if (direction === "expense") return "支出"
  return "未判定"
}

function importStatusLabel(status: ImportJobStatus): string {
  const statusMap: Record<ImportJobStatus, string> = {
    uploaded: "已上傳",
    parsed: "已解析",
    mapped: "已對應欄位",
    ready_to_import: "可匯入",
    imported: "已完成匯入",
    failed: "處理失敗",
  }
  return statusMap[status]
}

function speechErrorLabel(errorCode: string): string {
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

function modeLabel(mode: InputMode): string {
  if (mode === "voice_single" || mode === "bulk_text") return "文字/語音/流水帳輸入"
  if (mode === "photo_single") return "上傳輸入（照片）"
  if (mode === "file_import") return "上傳輸入（檔案）"
  const found = MODE_OPTIONS.find(item => item.mode === mode)
  return found ? found.title : mode
}

function categoryLabel(categoryKey: string): string {
  const category = CATEGORY_BY_KEY.get(categoryKey)
  if (!category) return categoryKey
  return `${domainLabel(category.domain)}${directionLabel(category.direction)}｜${category.display_name_zh}`
}

function mapBusinessExpenseCategory(displayName: string): string {
  const fixedExpenseTypes = new Set(["租金", "水電", "通訊", "人事", "固定其他", "還款"])
  const variableExpenseTypes = new Set(["原料", "包材", "耗材", "運費", "瓦斯", "變動其他"])
  if (fixedExpenseTypes.has(displayName)) return "固定支出"
  if (variableExpenseTypes.has(displayName)) return "變動支出"
  return "額外支出"
}

function mapLifeExpenseCategory(displayName: string): string {
  const mapping: Record<string, string> = {
    食: "食",
    衣: "衣",
    住: "住",
    行: "行",
    育: "育",
    樂: "樂",
    電信: "電信",
    醫療: "醫療",
    "保險(月繳)": "保險",
    儲蓄: "儲蓄",
    還款: "還款",
  }
  return mapping[displayName] ?? "其他"
}

function toLegacyAnalysisData(transactions: Transaction[]): { incomes: LegacyIncome[]; expenses: LegacyExpense[] } {
  const incomes: LegacyIncome[] = []
  const expenses: LegacyExpense[] = []

  transactions.forEach(item => {
    if (item.amount <= 0) return

    const category = CATEGORY_BY_KEY.get(item.category_key)
    const domain: Exclude<Domain, "unknown"> = category?.domain ?? (item.domain === "business" ? "business" : "life")
    const direction: Exclude<Direction, "unknown"> =
      category?.direction ?? (item.direction === "income" ? "income" : "expense")
    const displayName = category?.display_name_zh ?? item.category_key

    if (direction === "income") {
      incomes.push({
        date: item.occurred_at,
        category: domain === "business" ? "生意收入" : "生活收入",
        type: displayName,
        description: item.note,
        unitPrice: item.amount,
        quantity: 1,
        paymentStatus: "已收款",
        subtotal: item.amount,
        customerNote: item.user_overridden ? "已人工修正" : undefined,
      })
      return
    }

    expenses.push({
      date: item.occurred_at,
      category: domain === "business" ? "生意支出" : "生活支出",
      expenseCategory:
        domain === "business" ? mapBusinessExpenseCategory(displayName) : mapLifeExpenseCategory(displayName),
      type: displayName,
      description: item.note,
      unitPrice: item.amount,
      quantity: 1,
      subtotal: item.amount,
    })
  })

  return { incomes, expenses }
}

function toTransaction(item: DraftTransaction): Transaction {
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
    source_file_id: item.source_file_id,
    ai_predicted_category_key: item.ai_predicted_category_key,
    ai_confidence: item.ai_confidence,
    user_overridden: item.user_overridden,
  }
}

export default function MvpAccountingPage() {
  const defaultDreamDeadline = useMemo(() => {
    const deadline = new Date()
    deadline.setMonth(deadline.getMonth() + 3)
    deadline.setDate(1)
    return deadline.toISOString().slice(0, 10)
  }, [])

  const [step, setStep] = useState<PageStep>("home")
  const [modeSheetOpen, setModeSheetOpen] = useState(false)
  const [activeMode, setActiveMode] = useState<InputMode>("text_single")

  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS)
  const [drafts, setDrafts] = useState<DraftTransaction[]>([])
  const [importJob, setImportJob] = useState<ImportJob | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const [singleText, setSingleText] = useState("")
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechPreview, setSpeechPreview] = useState("")
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [uploadKind, setUploadKind] = useState<UploadKind>("none")
  const [showMappingSettings, setShowMappingSettings] = useState(false)
  const [photoAmount, setPhotoAmount] = useState("")
  const [photoNote, setPhotoNote] = useState("")

  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [fileColumns, setFileColumns] = useState<string[]>(["col_1"])
  const [fileMapping, setFileMapping] = useState<FileMapping>(DEFAULT_MAPPING)
  const [templateMap, setTemplateMap] = useState<Record<string, FileMapping>>({})
  const [isFileParsing, setIsFileParsing] = useState(false)

  const [batchCategory, setBatchCategory] = useState("")
  const [batchDomain, setBatchDomain] = useState<Domain>("unknown")
  const [batchDirection, setBatchDirection] = useState<Direction>("unknown")

  const [dreamTarget, setDreamTarget] = useState(200000)
  const [dreamSaved, setDreamSaved] = useState(20000)
  const [dreamDeadline, setDreamDeadline] = useState(defaultDreamDeadline)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const [banner, setBanner] = useState<string | null>(null)
  const [storageReady, setStorageReady] = useState(false)
  const [overviewQuery, setOverviewQuery] = useState("")
  const [overviewDirectionFilter, setOverviewDirectionFilter] = useState<OverviewDirectionFilter>("all")
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TransactionEditDraft | null>(null)

  useEffect(() => {
    let cancelled = false

    async function hydrateFromIndexedDb() {
      try {
        const [storedTransactions, storedTemplates] = await Promise.all([
          readIndexedDbValue<Transaction[]>(INDEXED_DB_TX_KEY),
          readIndexedDbValue<Record<string, FileMapping>>(INDEXED_DB_TEMPLATE_KEY),
        ])

        if (cancelled) return

        if (Array.isArray(storedTransactions) && storedTransactions.length > 0) {
          setTransactions(storedTransactions)
        } else {
          const legacyTransactionsRaw = localStorage.getItem(LEGACY_STORAGE_TX_KEY)
          if (legacyTransactionsRaw) {
            const legacyTransactions = JSON.parse(legacyTransactionsRaw) as Transaction[]
            if (Array.isArray(legacyTransactions) && legacyTransactions.length > 0) {
              setTransactions(legacyTransactions)
              await writeIndexedDbValue(INDEXED_DB_TX_KEY, legacyTransactions)
            }
          }
        }

        if (storedTemplates && typeof storedTemplates === "object") {
          setTemplateMap(storedTemplates)
        } else {
          const legacyTemplatesRaw = localStorage.getItem(LEGACY_STORAGE_TEMPLATE_KEY)
          if (legacyTemplatesRaw) {
            const legacyTemplates = JSON.parse(legacyTemplatesRaw) as Record<string, FileMapping>
            if (legacyTemplates && typeof legacyTemplates === "object") {
              setTemplateMap(legacyTemplates)
              await writeIndexedDbValue(INDEXED_DB_TEMPLATE_KEY, legacyTemplates)
            }
          }
        }
      } catch {
        if (!cancelled) {
          setBanner(previous => previous ?? "無法連線本機資料庫，資料可能無法長期保存。")
        }
      } finally {
        if (!cancelled) {
          setStorageReady(true)
        }
      }
    }

    void hydrateFromIndexedDb()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!storageReady) return
    void writeIndexedDbValue(INDEXED_DB_TX_KEY, transactions).catch(() => {
      setBanner(previous => previous ?? "交易資料寫入失敗，請稍後再試。")
    })
  }, [transactions, storageReady])

  useEffect(() => {
    if (!storageReady) return
    void writeIndexedDbValue(INDEXED_DB_TEMPLATE_KEY, templateMap).catch(() => {
      setBanner(previous => previous ?? "欄位模板寫入失敗，請稍後再試。")
    })
  }, [templateMap, storageReady])

  useEffect(() => {
    if (typeof window === "undefined") return

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      setIsSpeechSupported(false)
      return
    }

    setIsSpeechSupported(true)
    const recognition = new Recognition()
    recognition.lang = "zh-TW"
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let finalText = ""
      let interimText = ""

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = String(result?.[0]?.transcript ?? "").trim()
        if (!transcript) continue
        if (result.isFinal) {
          finalText += `${finalText ? " " : ""}${transcript}`
        } else {
          interimText += `${interimText ? " " : ""}${transcript}`
        }
      }

      if (finalText) {
        setSingleText(previous => `${previous}${previous.trim() ? " " : ""}${finalText}`.trim())
      }

      setSpeechPreview(interimText)
      setSpeechError(null)
    }

    recognition.onerror = (event: any) => {
      setSpeechError(speechErrorLabel(String(event?.error ?? "")))
      setSpeechPreview("")
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setSpeechPreview("")
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
      recognitionRef.current = null
    }
  }, [])

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  }, [transactions])

  const currentMonthTx = useMemo(
    () => transactions.filter(item => item.occurred_at.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  )
  const sortedCurrentMonthTransactions = useMemo(
    () => [...currentMonthTx].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    [currentMonthTx]
  )

  const monthIncome = useMemo(
    () => currentMonthTx.filter(item => item.direction === "income").reduce((sum, item) => sum + item.amount, 0),
    [currentMonthTx]
  )
  const monthExpense = useMemo(
    () => currentMonthTx.filter(item => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0),
    [currentMonthTx]
  )
  const monthNet = monthIncome - monthExpense
  const monthTxCount = currentMonthTx.length
  const monthExpenseCount = currentMonthTx.filter(item => item.direction === "expense").length
  const monthAverageExpense = monthExpenseCount > 0 ? monthExpense / monthExpenseCount : 0
  const monthSavingRate = monthIncome > 0 ? (monthNet / monthIncome) * 100 : null
  const monthInsightText = useMemo(() => {
    if (monthTxCount === 0) {
      return `${formatMonthLabel(selectedMonth)} 尚未有記帳資料。`
    }

    const savingRateText = monthSavingRate === null ? "" : `，儲蓄率 ${monthSavingRate.toFixed(1)}%`
    return `平均每筆支出 ${formatMoney(monthAverageExpense)}${savingRateText}`
  }, [monthAverageExpense, monthSavingRate, monthTxCount, selectedMonth])

  const dreamPlan = useMemo(() => {
    const targetLeft = Math.max(dreamTarget - dreamSaved, 0)
    const deadlineDate = new Date(dreamDeadline)
    const now = new Date()
    const monthDiff =
      (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth()) + 1
    const monthsLeft = Math.max(monthDiff, 1)
    const shouldSavePerMonth = targetLeft / monthsLeft
    const gap = shouldSavePerMonth - Math.max(monthNet, 0)
    return { targetLeft, monthsLeft, shouldSavePerMonth, gap }
  }, [dreamDeadline, dreamSaved, dreamTarget, monthNet])
  const dreamCompletionRate = useMemo(() => {
    if (dreamPlan.targetLeft === 0) return 100
    if (dreamTarget <= 0) return 0
    return Math.min((dreamSaved / dreamTarget) * 100, 100)
  }, [dreamPlan.targetLeft, dreamSaved, dreamTarget])
  const monthContribution = Math.max(monthNet, 0)
  const monthPaceRate = useMemo(() => {
    if (dreamPlan.targetLeft === 0 || dreamPlan.shouldSavePerMonth <= 0) return 100
    return Math.min((monthContribution / dreamPlan.shouldSavePerMonth) * 100, 100)
  }, [dreamPlan.shouldSavePerMonth, dreamPlan.targetLeft, monthContribution])
  const projectedMonthsToGoal = useMemo(() => {
    if (dreamPlan.targetLeft === 0) return 0
    if (monthContribution <= 0) return null
    return Math.ceil(dreamPlan.targetLeft / monthContribution)
  }, [dreamPlan.targetLeft, monthContribution])
  const dreamPaceStatus = useMemo(() => {
    if (dreamPlan.targetLeft === 0) {
      return {
        title: "目標已完成",
        hint: "恭喜！你已達成目前設定的夢想金額。",
        textClass: "text-emerald-200",
        barClass: "[&>div]:bg-emerald-400",
      }
    }

    if (dreamPlan.gap <= 0) {
      const projectedText =
        projectedMonthsToGoal === null
          ? "目前節奏穩定，持續記帳就能維持在目標軌道上。"
          : `照目前節奏，約 ${projectedMonthsToGoal} 個月可達標。`
      return {
        title: "進度領先",
        hint: `${projectedText} 有機會提早完成。`,
        textClass: "text-emerald-200",
        barClass: "[&>div]:bg-emerald-400",
      }
    }

    if (monthContribution <= 0) {
      return {
        title: "需要加速",
        hint: "本月淨額尚未轉正，先降低可調整支出，會更有感。",
        textClass: "text-amber-200",
        barClass: "[&>div]:bg-amber-400",
      }
    }

    const projectedText = projectedMonthsToGoal === null ? "" : `照目前節奏，約 ${projectedMonthsToGoal} 個月可達標。`
    return {
      title: "略慢於目標",
      hint: `${projectedText} 每月再多留 ${formatMoney(dreamPlan.gap)}，可回到目標進度。`,
      textClass: "text-amber-200",
      barClass: "[&>div]:bg-amber-400",
    }
  }, [dreamPlan.gap, dreamPlan.targetLeft, monthContribution, projectedMonthsToGoal])
  const dreamPaceLabel =
    dreamPlan.targetLeft === 0 ? "已完成" : `${formatMoney(monthContribution)} / ${formatMoney(dreamPlan.shouldSavePerMonth)}`

  const recentTransactions = sortedCurrentMonthTransactions.slice(0, 3)
  const overviewFilterStats = useMemo(
    () => ({
      all: sortedTransactions.length,
      income: sortedTransactions.filter(item => item.direction === "income").length,
      expense: sortedTransactions.filter(item => item.direction === "expense").length,
    }),
    [sortedTransactions]
  )
  const overviewTransactions = useMemo(() => {
    const keyword = overviewQuery.trim().toLowerCase()
    return sortedTransactions.filter(item => {
      if (overviewDirectionFilter !== "all" && item.direction !== overviewDirectionFilter) {
        return false
      }

      if (!keyword) return true

      const content = [
        item.note,
        item.occurred_at,
        categoryLabel(item.category_key),
        modeLabel(item.input_mode),
      ]
        .join(" ")
        .toLowerCase()
      return content.includes(keyword)
    })
  }, [sortedTransactions, overviewQuery, overviewDirectionFilter])
  const analysisData = useMemo(() => toLegacyAnalysisData(sortedTransactions), [sortedTransactions])

  function resetQuickInputs() {
    recognitionRef.current?.stop()
    setIsListening(false)
    setSpeechPreview("")
    setSpeechError(null)
    setSingleText("")
    setUploadKind("none")
    setShowMappingSettings(false)
    setPhotoAmount("")
    setPhotoNote("")
    setUploadedFile(null)
    setPreviewRows([])
    setFileColumns(["col_1"])
    setFileMapping(DEFAULT_MAPPING)
    setImportJob(null)
  }

  function toggleSpeechInput() {
    const recognition = recognitionRef.current
    if (!recognition) {
      setSpeechError("此瀏覽器不支援語音輸入。")
      return
    }

    if (isListening) {
      recognition.stop()
      return
    }

    try {
      setSpeechError(null)
      setSpeechPreview("")
      recognition.start()
      setIsListening(true)
    } catch {
      setSpeechError("語音輸入啟動失敗，請稍後再試。")
      setIsListening(false)
    }
  }

  function openMode(mode: InputMode) {
    setModeSheetOpen(false)
    setActiveMode(mode)
    setStep("quick-add")
    setBanner(null)
    setDrafts([])
    resetQuickInputs()
  }

  async function handleFilePicked(file: File | null) {
    setUploadedFile(file)
    setPreviewRows([])
    setImportJob(null)
    setShowMappingSettings(false)
    setFileColumns(["col_1"])
    setFileMapping(DEFAULT_MAPPING)
    if (!file) {
      setUploadKind("none")
      return
    }

    setBanner(null)
    if (isImageUploadFile(file)) {
      setUploadKind("image")
      setIsFileParsing(false)
      return
    }

    setUploadKind("document")
    setIsFileParsing(true)

    const ext = getFileExt(file.name)
    const jobId = uid("job")
    setImportJob({
      job_id: jobId,
      user_id: DEMO_USER_ID,
      input_mode: "file_import",
      status: "uploaded",
      errors: [],
      stats: { total_lines: 0, success_lines: 0, needs_manual_lines: 0 },
    })

    try {
      const fileText = await file.text()
      const rows = extractRowsFromFileText(fileText)
      const safeRows = rows.length > 0 ? rows : [[`${file.name} 匯入完成，請手動補上描述與金額`]]
      const maxCols = Math.max(...safeRows.map(row => row.length), 1)
      const columns = Array.from({ length: maxCols }, (_, idx) => `col_${idx + 1}`)
      const remembered = templateMap[ext]

      setPreviewRows(safeRows)
      setFileColumns(columns)
      setFileMapping(remembered ?? defaultMappingFromRows(safeRows))
      setImportJob({
        job_id: jobId,
        user_id: DEMO_USER_ID,
        input_mode: "file_import",
        status: "parsed",
        errors: rows.length === 0 ? ["內容抽取不足，請確認欄位或手動修正"] : [],
        stats: {
          total_lines: safeRows.length,
          success_lines: rows.length,
          needs_manual_lines: rows.length === 0 ? safeRows.length : 0,
        },
      })
    } catch {
      setImportJob({
        job_id: jobId,
        user_id: DEMO_USER_ID,
        input_mode: "file_import",
        status: "failed",
        errors: ["檔案讀取失敗，請重新上傳"],
        stats: { total_lines: 0, success_lines: 0, needs_manual_lines: 0 },
      })
    } finally {
      setIsFileParsing(false)
    }
  }

  function buildSingleDraft(): DraftTransaction[] {
    const text = singleText.trim()
    if (!text) return []
    return [buildDraftTransaction(text, activeMode)]
  }

  function buildPhotoDraft(): DraftTransaction[] {
    const amount = parseNumber(photoAmount)
    if (!amount || amount <= 0) return []
    const line = `${photoNote.trim() || "拍照上傳"} ${amount}`
    const draft = buildDraftTransaction(line, "photo_single", uploadedFile?.name ?? uid("photo"))
    draft.amount = amount
    draft.note = photoNote.trim() || "拍照上傳（待補店家資訊）"
    draft.ai_confidence = Math.min(draft.ai_confidence, 0.68)
    draft.reasoning_tags = ["pattern", "ambiguous"]
    return [draft]
  }

  function buildBulkDrafts(sourceText: string): DraftTransaction[] {
    const normalizedLines = normalizeBulkLines(sourceText)
    return normalizedLines.map(line => buildDraftTransaction(line, "bulk_text"))
  }

  function buildFileDrafts(): DraftTransaction[] {
    if (!uploadedFile || fileMapping.amount_column === "none") return []
    return buildDraftsFromMappedRows(previewRows, fileMapping, uploadedFile.name, "file_import")
  }

  function handleParseInput() {
    setBanner(null)
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }

    let parsed: DraftTransaction[] = []
    if (activeMode === "text_single") {
      const sourceText = singleText.trim()
      if (shouldParseAsBulkText(sourceText)) {
        parsed = buildBulkDrafts(sourceText)
        setImportJob({
          job_id: uid("job"),
          user_id: DEMO_USER_ID,
          input_mode: "bulk_text",
          status: "ready_to_import",
          errors: parsed.filter(item => item.parse_error).map(item => `${item.raw_line}：${item.parse_error}`),
          stats: {
            total_lines: parsed.length,
            success_lines: parsed.filter(item => !item.parse_error).length,
            needs_manual_lines: parsed.filter(item => Boolean(item.parse_error)).length,
          },
        })
      } else {
        parsed = buildSingleDraft()
        setImportJob(null)
      }
    } else if (activeMode === "file_import") {
      if (uploadKind === "image") {
        parsed = buildPhotoDraft()
        setImportJob(null)
      } else if (uploadKind === "document") {
        parsed = buildFileDrafts()
        if (importJob) {
          setImportJob({
            ...importJob,
            status: "ready_to_import",
            errors: parsed.filter(item => item.parse_error).map(item => `${item.raw_line}：${item.parse_error}`),
            stats: {
              total_lines: parsed.length,
              success_lines: parsed.filter(item => !item.parse_error).length,
              needs_manual_lines: parsed.filter(item => Boolean(item.parse_error)).length,
            },
          })
        }
      }
    }

    if (parsed.length === 0) {
      setBanner("目前沒有可解析的資料，請先補上文字或金額。")
      return
    }

    setDrafts(parsed)
    setStep("confirm")
  }

  function updateDraft(index: number, updater: (draft: DraftTransaction) => DraftTransaction) {
    setDrafts(prev => prev.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)))
  }

  function applyBatchSettings() {
    setDrafts(prev =>
      prev.map(item => {
        if (!item.selected) return item
        const next = { ...item }

        if (batchCategory) {
          const category = CATEGORY_BY_KEY.get(batchCategory)
          if (category) {
            next.category_key = category.category_key
            next.domain = category.domain
            next.direction = category.direction
            next.user_overridden = next.ai_predicted_category_key !== category.category_key
          }
        }

        if (batchDomain !== "unknown") {
          next.domain = batchDomain
        }
        if (batchDirection !== "unknown") {
          next.direction = batchDirection
        }
        return next
      })
    )
  }

  function saveDrafts() {
    const validDrafts = drafts.filter(item => item.selected && !item.parse_error && item.amount > 0)
    if (validDrafts.length === 0) {
      setBanner("沒有可儲存的交易，請先勾選並補齊金額。")
      return
    }

    const normalized = validDrafts.map(item => {
      const safeDomain: Exclude<Domain, "unknown"> = item.domain === "business" ? "business" : "life"
      const safeDirection: Exclude<Direction, "unknown"> = item.direction === "income" ? "income" : "expense"
      const currentCategory = CATEGORY_BY_KEY.get(item.category_key)
      const category =
        currentCategory && currentCategory.domain === safeDomain && currentCategory.direction === safeDirection
          ? currentCategory
          : resolveFallbackCategory(safeDomain, safeDirection)

      return {
        ...toTransaction(item),
        domain: safeDomain,
        direction: safeDirection,
        category_key: category.category_key,
        user_overridden: item.user_overridden || item.ai_predicted_category_key !== category.category_key,
      }
    })

    setTransactions(prev => [...normalized, ...prev])
    if (importJob) {
      setImportJob({ ...importJob, status: "imported" })
    }
    setDrafts([])
    setStep("home")
    setBanner(`已儲存 ${normalized.length} 筆交易。`)
  }

  function rememberTemplate() {
    if (!uploadedFile) return
    const ext = getFileExt(uploadedFile.name)
    setTemplateMap(prev => ({ ...prev, [ext]: fileMapping }))
    setBanner(`已記住 ${ext.toUpperCase()} 欄位模板，下次可自動套用。`)
  }

  function startEditTransaction(item: Transaction) {
    setEditingTransactionId(item.id)
    setEditDraft({
      occurred_at: item.occurred_at,
      amount: String(item.amount),
      category_key: item.category_key,
      note: item.note,
    })
  }

  function cancelEditTransaction() {
    setEditingTransactionId(null)
    setEditDraft(null)
  }

  function saveEditedTransaction() {
    if (!editingTransactionId || !editDraft) return

    const amountValue = parseNumber(editDraft.amount)
    if (amountValue === null || Math.abs(amountValue) <= 0) {
      setBanner("金額格式不正確，請輸入大於 0 的數字。")
      return
    }

    const nextCategory = CATEGORY_BY_KEY.get(editDraft.category_key)
    if (!nextCategory) {
      setBanner("類別不存在，請重新選擇。")
      return
    }

    setTransactions(previous =>
      previous.map(item => {
        if (item.id !== editingTransactionId) return item
        return {
          ...item,
          occurred_at: editDraft.occurred_at,
          amount: Math.abs(amountValue),
          category_key: nextCategory.category_key,
          domain: nextCategory.domain,
          direction: nextCategory.direction,
          note: editDraft.note.trim() || item.note,
          user_overridden: item.user_overridden || item.ai_predicted_category_key !== nextCategory.category_key,
        }
      })
    )

    setBanner("已更新這筆交易。")
    cancelEditTransaction()
  }

  function removeTransaction(transactionId: string) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("確定要刪除這筆交易嗎？")
      if (!confirmed) return
    }

    setTransactions(previous => previous.filter(item => item.id !== transactionId))
    if (editingTransactionId === transactionId) {
      cancelEditTransaction()
    }
    setBanner("已刪除這筆交易。")
  }

  function renderHome() {
    return (
      <div className="space-y-4">
        <Card className="border-indigo-400/30 bg-slate-900/70">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-white text-xl">本月統計總覽</CardTitle>
                <CardDescription className="text-slate-300">一眼掌握當月收入、支出與現金流</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit border-indigo-400/40 bg-indigo-500/10 text-indigo-200">
                {formatMonthLabel(selectedMonth)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setSelectedMonth(previous => shiftMonthKey(previous, -1))}
              >
                上月
              </Button>
              <Input
                type="month"
                value={selectedMonth}
                onChange={event => {
                  const nextMonth = event.target.value
                  if (/^\d{4}-\d{2}$/.test(nextMonth)) {
                    setSelectedMonth(nextMonth)
                  }
                }}
                className="bg-slate-950/60 text-white border-white/20 text-center"
              />
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setSelectedMonth(previous => shiftMonthKey(previous, 1))}
              >
                下月
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-100/90">當月收入</p>
                <p className="text-lg font-semibold text-emerald-200">{formatMoney(monthIncome)}</p>
              </div>
              <div className="rounded-lg border border-rose-300/20 bg-rose-500/10 p-3">
                <p className="text-xs text-rose-100/90">當月支出</p>
                <p className="text-lg font-semibold text-rose-200">{formatMoney(monthExpense)}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-xs text-slate-300">淨收支</p>
                <p className={`text-lg font-semibold ${monthNet >= 0 ? "text-emerald-200" : "text-rose-300"}`}>
                  {formatMoney(monthNet)}
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-xs text-slate-300">記帳筆數</p>
                <p className="text-lg font-semibold text-white">{monthTxCount} 筆</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-200">{monthInsightText}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-400/30 bg-slate-900/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-xl">距離夢想目標差額</CardTitle>
            <CardDescription className="text-slate-300">把每次記帳轉成可行動的目標節奏</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                type="number"
                min={0}
                value={dreamTarget}
                onChange={event => setDreamTarget(Math.max(0, Number(event.target.value) || 0))}
                className="bg-slate-950/60 text-white border-white/20"
                placeholder="目標"
              />
              <Input
                type="number"
                min={0}
                value={dreamSaved}
                onChange={event => setDreamSaved(Math.max(0, Number(event.target.value) || 0))}
                className="bg-slate-950/60 text-white border-white/20"
                placeholder="已存"
              />
              <Input
                type="date"
                value={dreamDeadline}
                onChange={event => setDreamDeadline(event.target.value)}
                className="bg-slate-950/60 text-white border-white/20"
              />
            </div>

            <div className="rounded-xl border border-fuchsia-300/25 bg-gradient-to-r from-fuchsia-500/20 via-purple-500/10 to-indigo-500/20 p-4">
              <p className="text-xs text-fuchsia-100/90">離夢想目標還差</p>
              <p className="mt-1 text-3xl font-bold tracking-wide text-white">{formatMoney(dreamPlan.targetLeft)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                  已存 {formatMoney(dreamSaved)}
                </Badge>
                <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                  目標 {formatMoney(dreamTarget)}
                </Badge>
                <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                  剩餘 {dreamPlan.monthsLeft} 個月
                </Badge>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>累積達成率</span>
                  <span className="font-semibold text-white">{dreamCompletionRate.toFixed(1)}%</span>
                </div>
                <Progress
                  value={dreamCompletionRate}
                  className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-indigo-400 [&>div]:to-fuchsia-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>本月節奏</span>
                  <span className="font-semibold text-white">{dreamPaceLabel}</span>
                </div>
                <Progress value={monthPaceRate} className={`h-2.5 bg-white/10 ${dreamPaceStatus.barClass}`} />
                <p className={`text-sm ${dreamPaceStatus.textClass}`}>
                  {dreamPaceStatus.title}：{dreamPaceStatus.hint}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-white/10 bg-slate-950/40 p-2">
                  <p className="text-xs text-slate-300">每月建議存</p>
                  <p className="text-sm font-semibold text-white">{formatMoney(dreamPlan.shouldSavePerMonth)}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-slate-950/40 p-2">
                  <p className="text-xs text-slate-300">當月淨額</p>
                  <p className={`text-sm font-semibold ${monthNet >= 0 ? "text-emerald-200" : "text-rose-300"}`}>
                    {formatMoney(monthNet)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/15 bg-slate-900/70">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-white text-xl">{formatMonthLabel(selectedMonth)} 最近 3 筆</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => {
                  setStep("analysis")
                  cancelEditTransaction()
                }}
              >
                財務分析
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => {
                  setStep("overview")
                  setOverviewQuery("")
                  setOverviewDirectionFilter("all")
                  cancelEditTransaction()
                }}
              >
                查看全部
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTransactions.length === 0 ? (
              <p className="text-slate-300 text-sm">{formatMonthLabel(selectedMonth)} 尚無交易資料，按下下方「＋」開始。</p>
            ) : (
              recentTransactions.map(item => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white truncate">{item.note}</p>
                    <p className={`text-sm font-semibold ${item.direction === "expense" ? "text-rose-300" : "text-emerald-300"}`}>
                      {item.direction === "expense" ? "-" : "+"}
                      {formatMoney(item.amount)}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[11px] border-white/20 text-slate-200">
                      {categoryLabel(item.category_key)}
                    </Badge>
                    <span className="text-[11px] text-slate-400">{item.occurred_at}</span>
                    <span className="text-[11px] text-slate-400">{modeLabel(item.input_mode)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  function renderOverview() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={() => {
              setStep("home")
              cancelEditTransaction()
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回到主頁
          </Button>
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-200 bg-indigo-500/10">
            全部紀錄：{transactions.length} 筆
          </Badge>
        </div>

        <Card className="border-white/20 bg-slate-900/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">交易總覽與編輯</CardTitle>
            <CardDescription className="text-slate-300">可搜尋、編輯與刪除既有交易</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={overviewDirectionFilter === "all" ? "default" : "outline"}
                className={
                  overviewDirectionFilter === "all"
                    ? "bg-indigo-500 text-white hover:bg-indigo-400"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }
                onClick={() => setOverviewDirectionFilter("all")}
              >
                全部（{overviewFilterStats.all}）
              </Button>
              <Button
                type="button"
                variant={overviewDirectionFilter === "income" ? "default" : "outline"}
                className={
                  overviewDirectionFilter === "income"
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }
                onClick={() => setOverviewDirectionFilter("income")}
              >
                收入（{overviewFilterStats.income}）
              </Button>
              <Button
                type="button"
                variant={overviewDirectionFilter === "expense" ? "default" : "outline"}
                className={
                  overviewDirectionFilter === "expense"
                    ? "bg-rose-500 text-white hover:bg-rose-400"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }
                onClick={() => setOverviewDirectionFilter("expense")}
              >
                支出（{overviewFilterStats.expense}）
              </Button>
            </div>
            <Input
              value={overviewQuery}
              onChange={event => setOverviewQuery(event.target.value)}
              className="bg-slate-950/60 border-white/20 text-white"
              placeholder="搜尋關鍵字（日期、備註、類別）"
            />
            <p className="text-xs text-slate-400">目前顯示 {overviewTransactions.length} 筆</p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {overviewTransactions.length === 0 && (
            <Card className="border-white/15 bg-slate-900/70">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-300">找不到符合條件的交易。</p>
              </CardContent>
            </Card>
          )}

          {overviewTransactions.map(item => {
            const isEditing = editingTransactionId === item.id && editDraft !== null
            return (
              <Card key={item.id} className="border-white/15 bg-slate-900/70">
                <CardContent className="pt-6 space-y-3">
                  {!isEditing ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-white break-words">{item.note}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[11px] border-white/20 text-slate-200">
                              {categoryLabel(item.category_key)}
                            </Badge>
                            <span className="text-[11px] text-slate-400">{item.occurred_at}</span>
                            <span className="text-[11px] text-slate-400">{modeLabel(item.input_mode)}</span>
                          </div>
                        </div>
                        <p className={`text-sm font-semibold ${item.direction === "expense" ? "text-rose-300" : "text-emerald-300"}`}>
                          {item.direction === "expense" ? "-" : "+"}
                          {formatMoney(item.amount)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => startEditTransaction(item)}
                        >
                          編輯
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                          onClick={() => removeTransaction(item.id)}
                        >
                          刪除
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Textarea
                        value={editDraft.note}
                        onChange={event => setEditDraft(previous => (previous ? { ...previous, note: event.target.value } : previous))}
                        className="min-h-[90px] bg-slate-950/60 border-white/20 text-white"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={editDraft.amount}
                          onChange={event =>
                            setEditDraft(previous => (previous ? { ...previous, amount: event.target.value } : previous))
                          }
                          className="bg-slate-950/60 border-white/20 text-white"
                        />
                        <Input
                          type="date"
                          value={editDraft.occurred_at}
                          onChange={event =>
                            setEditDraft(previous => (previous ? { ...previous, occurred_at: event.target.value } : previous))
                          }
                          className="bg-slate-950/60 border-white/20 text-white"
                        />
                      </div>

                      <select
                        value={editDraft.category_key}
                        onChange={event =>
                          setEditDraft(previous => (previous ? { ...previous, category_key: event.target.value } : previous))
                        }
                        className="w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                      >
                        {TAXONOMY.map(category => (
                          <option key={category.category_key} value={category.category_key}>
                            {categoryLabel(category.category_key)}
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                          onClick={saveEditedTransaction}
                        >
                          儲存
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                          onClick={cancelEditTransaction}
                        >
                          取消
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                          onClick={() => removeTransaction(item.id)}
                        >
                          刪除
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  function renderAnalysis() {
    const totalCount = analysisData.incomes.length + analysisData.expenses.length

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={() => setStep("home")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回到主頁
          </Button>
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-200 bg-indigo-500/10">
            分析資料：{totalCount} 筆
          </Badge>
        </div>

        <Card className="border-white/20 bg-slate-900/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-xl">財務分析與現金流評估</CardTitle>
            <CardDescription className="text-slate-300">沿用舊版分析與財務月報，依目前紀錄即時更新。</CardDescription>
          </CardHeader>
        </Card>

        {totalCount === 0 ? (
          <Card className="border-white/15 bg-slate-900/70">
            <CardContent className="pt-6">
              <p className="text-slate-300 text-sm">目前沒有可分析資料，請先新增收入或支出紀錄。</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <CashFlowAnalysis incomes={analysisData.incomes} expenses={analysisData.expenses} />
            <FinancialReport incomes={analysisData.incomes} expenses={analysisData.expenses} />
          </>
        )}
      </div>
    )
  }

  function renderQuickAdd() {
    const activeMeta = MODE_OPTIONS.find(option => option.mode === activeMode)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={() => {
              setStep("home")
              setBanner(null)
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回到主頁
          </Button>
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-200 bg-indigo-500/10">
            {activeMeta?.title}
          </Badge>
        </div>

        <Card className="border-white/20 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-white">{activeMeta?.title}</CardTitle>
            <CardDescription className="text-slate-300">{activeMeta?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeMode === "text_single" && (
              <>
                <Textarea
                  value={singleText}
                  onChange={event => setSingleText(event.target.value)}
                  className="min-h-[180px] bg-slate-950/60 border-white/20 text-white placeholder:text-slate-400"
                  placeholder="可輸入單筆或貼上整段流水帳；系統會自動判斷並批次拆行。例：早餐 65、咖啡 80、捷運 30；3/5 計程車 230"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={isListening ? "default" : "outline"}
                    className={
                      isListening
                        ? "bg-rose-500 text-white hover:bg-rose-400"
                        : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                    }
                    disabled={!isSpeechSupported}
                    onClick={toggleSpeechInput}
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    {isListening ? "停止語音輸入" : "開始語音輸入"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => {
                      setSingleText("")
                      setSpeechPreview("")
                      setSpeechError(null)
                    }}
                  >
                    清空內容
                  </Button>
                </div>
                {isListening && (
                  <p className="text-xs text-indigo-200">正在聆聽中，請直接說話。</p>
                )}
                {speechPreview && (
                  <div className="rounded-md border border-indigo-300/30 bg-indigo-500/10 p-2 text-xs text-indigo-100">
                    即時辨識：{speechPreview}
                  </div>
                )}
                {speechError && (
                  <div className="rounded-md border border-rose-300/30 bg-rose-500/10 p-2 text-xs text-rose-100">
                    {speechError}
                  </div>
                )}
                {!isSpeechSupported && (
                  <p className="text-xs text-amber-200">此瀏覽器暫不支援語音輸入，請改用手動輸入。</p>
                )}
                <p className="text-xs text-slate-400">不用切換模式，系統會自動判斷單筆或流水帳批次。</p>
              </>
            )}

            {activeMode === "file_import" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-slate-200">支援上傳：照片、試算表、文件、可攜式文件</p>
                  <Input
                    type="file"
                    accept="image/*,.xlsx,.csv,.docx,.pdf"
                    className="bg-slate-950/60 border-white/20 text-slate-200 file:text-slate-200"
                    onChange={event => void handleFilePicked(event.target.files?.[0] ?? null)}
                  />
                  {isFileParsing && uploadKind === "document" && <p className="text-xs text-indigo-200">檔案解析中...</p>}
                  {uploadedFile && (
                    <p className="text-xs text-slate-400">
                      已上傳：{uploadedFile.name}（{uploadKind === "image" ? "照片模式" : "檔案匯入模式"}）
                    </p>
                  )}
                </div>

                {uploadKind === "image" && uploadedFile && (
                  <>
                    <div className="rounded-md border border-indigo-300/30 bg-indigo-500/10 p-3 text-xs text-indigo-100">
                      已偵測為照片，將走「照片附件 + 手動補金額」流程。
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={photoAmount}
                      onChange={event => setPhotoAmount(event.target.value)}
                      className="bg-slate-950/60 border-white/20 text-white"
                      placeholder="金額（必填）"
                    />
                    <Textarea
                      value={photoNote}
                      onChange={event => setPhotoNote(event.target.value)}
                      className="min-h-[100px] bg-slate-950/60 border-white/20 text-white placeholder:text-slate-400"
                      placeholder="備註（店名、用途、情境）"
                    />
                  </>
                )}

                {uploadKind === "document" && previewRows.length > 0 && (
                  <>
                    <div className="rounded-md border border-indigo-300/30 bg-indigo-500/10 p-3 text-xs text-indigo-100">
                      已自動判斷欄位，可直接按「解析並前往確認」。若結果不準，再開啟欄位設定調整。
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowMappingSettings(previous => !previous)}
                      className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                    >
                      {showMappingSettings ? "收合欄位設定" : "調整欄位設定"}
                    </Button>

                    {showMappingSettings && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs text-slate-300">
                            日期欄位（可選）
                            <select
                              value={fileMapping.date_column}
                              onChange={event =>
                                setFileMapping(prev => ({
                                  ...prev,
                                  date_column: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                            >
                              <option value="none">不使用</option>
                              {fileColumns.map(column => (
                                <option key={column} value={column}>
                                  {toColumnLabel(column)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-xs text-slate-300">
                            金額欄位（必選）
                            <select
                              value={fileMapping.amount_column}
                              onChange={event =>
                                setFileMapping(prev => ({
                                  ...prev,
                                  amount_column: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                            >
                              <option value="none">請選擇</option>
                              {fileColumns.map(column => (
                                <option key={column} value={column}>
                                  {toColumnLabel(column)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-xs text-slate-300">
                            描述欄位（可選）
                            <select
                              value={fileMapping.description_column}
                              onChange={event =>
                                setFileMapping(prev => ({
                                  ...prev,
                                  description_column: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                            >
                              {fileColumns.map(column => (
                                <option key={column} value={column}>
                                  {toColumnLabel(column)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-xs text-slate-300">
                            收支判斷
                            <select
                              value={fileMapping.direction_mode}
                              onChange={event =>
                                setFileMapping(prev => ({
                                  ...prev,
                                  direction_mode: event.target.value as FileMapping["direction_mode"],
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                            >
                              <option value="sign">金額正負（負=支出）</option>
                              <option value="direction_column">使用收支欄位</option>
                            </select>
                          </label>
                        </div>

                        {fileMapping.direction_mode === "direction_column" && (
                          <label className="text-xs text-slate-300 block">
                            收支欄位
                            <select
                              value={fileMapping.direction_column}
                              onChange={event =>
                                setFileMapping(prev => ({
                                  ...prev,
                                  direction_column: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                            >
                              <option value="none">請選擇</option>
                              {fileColumns.map(column => (
                                <option key={column} value={column}>
                                  {toColumnLabel(column)}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={rememberTemplate}
                          className="w-full border-indigo-400/30 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20"
                        >
                          記住此模板
                        </Button>
                      </>
                    )}

                    <div className="rounded-lg border border-white/15 bg-slate-950/60 p-3">
                      <p className="text-xs text-slate-300 mb-2">匯入預覽（前 5 列）</p>
                      <div className="space-y-1">
                        {previewRows.slice(0, 5).map((row, idx) => (
                          <p key={`${row.join("_")}_${idx}`} className="text-xs text-slate-200 break-all">
                            {row.join(" ｜ ")}
                          </p>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <Button
              onClick={handleParseInput}
              className="w-full bg-indigo-500 text-white hover:bg-indigo-400"
              disabled={
                (activeMode === "file_import" && (isFileParsing || !uploadedFile)) ||
                (activeMode === "text_single" && !singleText.trim())
              }
            >
              <Sparkles className="mr-2 h-4 w-4" />
              解析並前往確認
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  function renderConfirm() {
    const selectedCount = drafts.filter(item => item.selected).length
    const singleMode =
      (activeMode === "text_single" && importJob?.input_mode !== "bulk_text") ||
      (activeMode === "file_import" && uploadKind === "image")

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={() => {
              setStep("quick-add")
              setBanner(null)
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回輸入
          </Button>
          <Badge variant="outline" className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
            待儲存：{selectedCount} 筆
          </Badge>
        </div>

        {importJob && (
          <Card className="border-white/20 bg-slate-900/70">
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm text-slate-200">匯入任務：{importStatusLabel(importJob.status)}</p>
              <p className="text-xs text-slate-400">
                總行數 {importJob.stats.total_lines}／成功 {importJob.stats.success_lines}／需人工 {importJob.stats.needs_manual_lines}
              </p>
              {importJob.errors.length > 0 && (
                <div className="rounded-md border border-amber-300/30 bg-amber-500/10 p-2 text-xs text-amber-100">
                  {importJob.errors.slice(0, 3).map((error, idx) => (
                    <p key={`${error}_${idx}`}>- {error}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!singleMode && (
          <Card className="border-white/20 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">批次套用修正</CardTitle>
              <CardDescription className="text-slate-300">同一段資料可一鍵套用領域、收支、類別</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={batchDomain}
                  onChange={event => setBatchDomain(event.target.value as Domain)}
                  className="rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                >
                  <option value="unknown">領域（不變更）</option>
                  <option value="business">生意</option>
                  <option value="life">生活</option>
                </select>
                <select
                  value={batchDirection}
                  onChange={event => setBatchDirection(event.target.value as Direction)}
                  className="rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                >
                  <option value="unknown">收支（不變更）</option>
                  <option value="income">收入</option>
                  <option value="expense">支出</option>
                </select>
                <select
                  value={batchCategory}
                  onChange={event => setBatchCategory(event.target.value)}
                  className="rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                >
                  <option value="">類別（不變更）</option>
                  {TAXONOMY.map(category => (
                    <option key={category.category_key} value={category.category_key}>
                      {categoryLabel(category.category_key)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-indigo-400/30 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20"
                onClick={applyBatchSettings}
              >
                一鍵套用到勾選項目
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {drafts.map((draft, index) => {
            const lowConfidence = draft.ai_confidence < 0.65
            return (
              <Card
                key={draft.id}
                className={`bg-slate-900/70 ${
                  lowConfidence ? "border-amber-300/40" : "border-white/15"
                }`}
              >
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950"
                      checked={draft.selected}
                      onChange={event => updateDraft(index, item => ({ ...item, selected: event.target.checked }))}
                    />
                    <div className="flex-1 space-y-1">
                      <Textarea
                        value={draft.note}
                        onChange={event =>
                          updateDraft(index, item => ({
                            ...item,
                            note: event.target.value,
                            user_overridden: event.target.value.trim() !== item.raw_line.trim(),
                          }))
                        }
                        className="min-h-[80px] bg-slate-950/60 border-white/20 text-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={draft.amount}
                          onChange={event =>
                            updateDraft(index, item => ({
                              ...item,
                              amount: Math.max(0, Number(event.target.value) || 0),
                              parse_error: undefined,
                              user_overridden: true,
                            }))
                          }
                          className="bg-slate-950/60 border-white/20 text-white"
                        />
                        <Input
                          type="date"
                          value={draft.occurred_at}
                          onChange={event => updateDraft(index, item => ({ ...item, occurred_at: event.target.value }))}
                          className="bg-slate-950/60 border-white/20 text-white"
                        />
                      </div>
                      <select
                        value={draft.category_key}
                        onChange={event => {
                          const key = event.target.value
                          const category = CATEGORY_BY_KEY.get(key)
                          if (!category) return
                          updateDraft(index, item => ({
                            ...item,
                            category_key: key,
                            domain: category.domain,
                            direction: category.direction,
                            user_overridden: item.ai_predicted_category_key !== key,
                          }))
                        }}
                        className="w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white"
                      >
                        {TAXONOMY.map(category => (
                          <option key={category.category_key} value={category.category_key}>
                            {categoryLabel(category.category_key)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-slate-300 hover:text-white hover:bg-white/10"
                      onClick={() => setDrafts(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-[11px] ${confidenceTone(draft.ai_confidence)}`}>
                      可信度 {Math.round(draft.ai_confidence * 100)}%
                    </Badge>
                    <Badge variant="outline" className="text-[11px] border-white/20 text-slate-200">
                      {domainLabel(draft.domain)}／{directionLabel(draft.direction)}
                    </Badge>
                    <Badge variant="outline" className="text-[11px] border-white/20 text-slate-200">
                      {modeLabel(draft.input_mode)}
                    </Badge>
                  </div>

                  {lowConfidence && (
                    <div className="rounded-md border border-amber-300/30 bg-amber-500/10 p-2 text-xs text-amber-100 flex items-center gap-2">
                      <CircleAlert className="h-4 w-4" />
                      低置信度，建議你點一下類別後再儲存（但不會阻擋儲存）。
                    </div>
                  )}

                  {draft.parse_error && (
                    <div className="rounded-md border border-rose-300/30 bg-rose-500/10 p-2 text-xs text-rose-100">
                      {draft.parse_error}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Button
          onClick={saveDrafts}
          className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          disabled={drafts.length === 0}
        >
          <Save className="mr-2 h-4 w-4" />
          儲存並回主頁
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-sm bg-white/5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-indigo-300/40 bg-indigo-500/10 text-indigo-200">
            新版試用
          </Badge>
          <span className="text-xs text-slate-300 hidden sm:inline">輸入超省力 → 即時價值回饋</span>
        </div>
        <Link href="/v1">
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white bg-transparent h-8 px-3 text-xs gap-1.5"
          >
            切換舊版
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      <main className="mx-auto w-full max-w-2xl px-4 py-5 pb-28">
        {banner && (
          <div className="mb-4 rounded-md border border-indigo-300/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
            {banner}
          </div>
        )}

        {step === "home" && renderHome()}
        {step === "overview" && renderOverview()}
        {step === "analysis" && renderAnalysis()}
        {step === "quick-add" && renderQuickAdd()}
        {step === "confirm" && renderConfirm()}
      </main>

      {step === "home" && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-900/50"
            onClick={() => {
              setModeSheetOpen(true)
              setBanner(null)
            }}
            aria-label="新增交易"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      <Sheet open={modeSheetOpen} onOpenChange={setModeSheetOpen}>
        <SheetContent side="bottom" className="bg-slate-950 text-white border-white/10 max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">選擇輸入方式</SheetTitle>
            <SheetDescription className="text-slate-300">
              所有輸入都會轉成同一種記帳資料，先分類再一鍵修正。
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {MODE_OPTIONS.map(option => {
              const Icon = option.icon
              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => openMode(option.mode)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 rounded-md bg-indigo-500/20 p-1.5">
                      <Icon className="h-4 w-4 text-indigo-200" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{option.title}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{option.description}</p>
                    </div>
                    <Check className="ml-auto h-4 w-4 text-slate-500" />
                  </div>
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
