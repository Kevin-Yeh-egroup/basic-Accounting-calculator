"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  FileUp,
  Mic,
  NotebookPen,
  PieChart as PieChartIcon,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts"
import CashFlowAnalysis from "./components/cash-flow-analysis"
import FinancialReport from "./components/financial-report"

type Domain = "business" | "life" | "unknown"
type Direction = "income" | "expense" | "unknown"
type InputMode = "text_single" | "voice_single" | "photo_single" | "bulk_text" | "file_import"
type UploadKind = "none" | "image" | "document"
type OverviewDirectionFilter = "all" | "income" | "expense"
type ImportJobStatus = "uploaded" | "parsed" | "mapped" | "ready_to_import" | "imported" | "failed"
type PageStep =
  | "home"
  | "quick-add"
  | "confirm"
  | "overview"
  | "analysis"
  | "new-entry"
  | "stats-detail"
  | "recurring"
type StatsDirection = "expense" | "income" | "net"
type StatsTimeRange = "month" | "6months" | "year" | "custom"

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
  categoryTouched?: boolean
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

interface AiFinanceFeedbackCard {
  id: string
  badge: string
  title: string
  metricLabel: string
  metricValue: string
  comparisonText: string
  detailText: string
  tipText: string
  amountClassName: string
}

type RecurringFrequency = "weekly" | "monthly" | "yearly"

interface RecurringEntry {
  id: string
  title: string
  amount: number
  direction: Exclude<Direction, "unknown">
  category_key: string
  note: string
  frequency: RecurringFrequency
  weekly_day: number
  monthly_day: number
  yearly_month: number
  yearly_day: number
  start_date: string
  enabled: boolean
  auto_record: boolean
  occurrence_limit: number | null
  last_auto_processed_at: string | null
  created_at: string
  updated_at: string
}

interface RecurringRecordLog {
  id: string
  recurring_id: string
  occurred_at: string
  transaction_id: string
  created_at: string
  source: "auto" | "manual"
}

interface RecurringFormState {
  title: string
  amount: string
  direction: Exclude<Direction, "unknown">
  category_key: string
  note: string
  frequency: RecurringFrequency
  weekly_day: number
  monthly_day: number
  yearly_month: number
  yearly_day: number
  start_date: string
  enabled: boolean
  auto_record: boolean
  occurrence_mode: "unlimited" | "limited"
  occurrence_limit: number
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
const INDEXED_DB_RECURRING_KEY = "recurring_entries"
const INDEXED_DB_RECURRING_LOG_KEY = "recurring_record_logs"

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
    title: "輸入一筆收支",
    description: "一句話、語音或貼上多筆都可以，系統會自動判斷收支、日期與類別",
    icon: NotebookPen,
  },
  {
    mode: "file_import",
    title: "上傳帳單或檔案",
    description: "照片、Excel、PDF 等檔案會先整理成草稿，再讓你確認",
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
    category_key: "life_expense_savings",
    display_name_zh: "儲蓄",
    domain: "life",
    direction: "expense",
    aliases: ["儲蓄", "存錢", "定存", "儲金", "零存整付"],
    examples: ["儲蓄 5000"],
    rules: ["life_savings"],
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

const LIFE_EXPENSE_ORDER = [
  "life_expense_food",
  "life_expense_clothing",
  "life_expense_housing",
  "life_expense_transport",
  "life_expense_education",
  "life_expense_fun",
  "life_expense_telecom",
  "life_expense_insurance",
  "life_expense_medical",
  "life_expense_repayment",
  "life_expense_savings",
  "life_expense_other",
]

const TAXONOMY_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "生意收入",
    keys: [
      "business_income_product_sale",
      "business_income_service",
      "business_income_revenue_share",
      "business_income_space_rent",
      "business_income_secondhand_equipment_sale",
      "business_income_other_entrepreneurial",
    ],
  },
  {
    label: "生意支出",
    keys: [
      "business_expense_raw_material",
      "business_expense_packaging",
      "business_expense_marketing",
      "business_expense_shipping",
      "business_expense_hr",
      "business_expense_rent",
      "business_expense_utilities",
      "business_expense_gas",
      "business_expense_communication",
      "business_expense_consumables",
      "business_expense_equipment_purchase",
      "business_expense_equipment_repair",
      "business_expense_fixed_other",
      "business_expense_variable_other",
      "business_expense_repayment",
      "business_expense_extra_other",
    ],
  },
  {
    label: "生活收入",
    keys: [
      "life_income_salary",
      "life_income_side_hustle",
      "life_income_temp_work",
      "life_income_gov_subsidy",
      "life_income_family_gift",
      "life_income_pension",
      "life_income_rent",
      "life_income_interest",
      "life_income_investment",
      "life_income_savings",
      "life_income_other",
    ],
  },
  {
    label: "生活支出",
    keys: [
      "life_expense_food",
      "life_expense_clothing",
      "life_expense_housing",
      "life_expense_transport",
      "life_expense_education",
      "life_expense_fun",
      "life_expense_telecom",
      "life_expense_insurance",
      "life_expense_medical",
      "life_expense_repayment",
      "life_expense_savings",
      "life_expense_other",
    ],
  },
]

function categoryFullLabel(categoryKey: string): string {
  const category = CATEGORY_BY_KEY.get(categoryKey)
  if (!category) return categoryKey

  for (const group of TAXONOMY_GROUPS) {
    if (group.keys.includes(categoryKey)) {
      return `${group.label}-${category.display_name_zh}`
    }
  }

  return `${domainLabel(category.domain)}${directionLabel(category.direction)}-${category.display_name_zh}`
}

function CategorySelect({
  value,
  onValueChange,
  className,
}: {
  value: string
  onValueChange: (key: string) => void
  className?: string
}) {
  const selectedLabel = value ? categoryFullLabel(value) : ""

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={
          className ??
          "w-full rounded-md border border-white/20 bg-slate-950/80 px-3 py-2.5 text-sm text-white min-h-[44px] focus:ring-indigo-400"
        }
      >
        <SelectValue placeholder="選擇類別">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-white/20 text-white max-h-72">
        {TAXONOMY_GROUPS.map(group => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-slate-400 text-xs py-1.5 px-2">
              {group.label}
            </SelectLabel>
            {group.keys.map(key => {
              const category = CATEGORY_BY_KEY.get(key)
              if (!category) return null
              const fullLabel = `${group.label}-${category.display_name_zh}`
              return (
                <SelectItem
                  key={key}
                  value={key}
                  textValue={fullLabel}
                  className="text-white focus:bg-white/10 focus:text-white pl-4"
                >
                  {category.display_name_zh}
                </SelectItem>
              )
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
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

function cashFlowToneClass(value: number): string {
  if (value > 0) return "text-emerald-300"
  if (value < 0) return "text-rose-400"
  return "text-slate-300"
}

function formatCompactCashFlow(value: number): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : ""
  const absValue = Math.abs(value)

  if (absValue >= 10000) {
    return `${prefix}${(absValue / 10000).toFixed(1)}萬`
  }

  if (absValue >= 1000) {
    return `${prefix}${(absValue / 1000).toFixed(0)}k`
  }

  return `${prefix}${formatMoney(absValue)}`
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-")
  if (!year || !month) return monthKey
  return `${year} 年 ${Number(month)} 月`
}

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"]
const MAX_RECURRING_OCCURRENCES = 36
const AI_FEEDBACK_DRINK_KEYWORDS = [
  "飲料",
  "咖啡",
  "奶茶",
  "手搖",
  "珍奶",
  "拿鐵",
  "美式",
  "紅茶",
  "綠茶",
  "烏龍",
  "豆漿",
  "果汁",
  "latte",
  "coffee",
  "tea",
  "drink",
]
const AI_FEEDBACK_LAST_PICK_KEY = "mvp_ai_feedback_last_pick"
const RECURRING_WEEKDAY_OPTIONS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 0, label: "日" },
]

function shiftDateByDays(dateString: string, days: number): string {
  const d = parseYmdDate(dateString)
  if (!d) return dateString
  d.setDate(d.getDate() + days)
  return formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function formatEntryDateLabel(dateString: string): string {
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

function formatDateGroup(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const w = WEEKDAY_ZH[date.getDay()]
  return `${y}/${m}/${d} 星期${w}`
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

function parseYmdDate(dateString: string): Date | null {
  const matched = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return null
  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

function getWeekRange(dateString: string): { start: string; end: string } {
  const date = parseYmdDate(dateString)
  if (!date) {
    return { start: dateString, end: dateString }
  }

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

function isDateWithinRange(dateString: string, start: string, end: string): boolean {
  return dateString >= start && dateString <= end
}

function pickRandomFeedbackId(options: AiFinanceFeedbackCard[], lastPickedId: string | null): string {
  if (options.length === 0) return ""
  if (options.length === 1) return options[0].id

  const candidateIds = options
    .map(item => item.id)
    .filter(id => id !== lastPickedId)

  const pool = candidateIds.length > 0 ? candidateIds : options.map(item => item.id)
  return pool[Math.floor(Math.random() * pool.length)]
}

function formatChangeAgainstPrevious(current: number, previous: number): string {
  if (current === 0 && previous === 0) return "和上週差不多"
  if (previous <= 0) return current > 0 ? "比上週開始有支出" : "和上週差不多"

  const changeRate = ((current - previous) / previous) * 100
  if (Math.abs(changeRate) < 8) return "和上週差不多"

  return `比上週${changeRate > 0 ? "多" : "少"} ${Math.round(Math.abs(changeRate))}%`
}

function isDrinkRelatedTransaction(item: Transaction): boolean {
  if (item.direction !== "expense") return false

  const categoryName = CATEGORY_BY_KEY.get(item.category_key)?.display_name_zh ?? ""
  const content = `${item.note} ${categoryName}`.toLowerCase()
  return AI_FEEDBACK_DRINK_KEYWORDS.some(keyword => content.includes(keyword))
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function normalizeOccurrenceLimit(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value)) return null
  return clampInteger(value, 1, MAX_RECURRING_OCCURRENCES)
}

function remainingRecurringOccurrences(rule: RecurringEntry, recordedCount: number): number | null {
  if (rule.occurrence_limit === null) return null
  return Math.max(rule.occurrence_limit - recordedCount, 0)
}

function hasRemainingRecurringOccurrences(rule: RecurringEntry, recordedCount: number): boolean {
  return remainingRecurringOccurrences(rule, recordedCount) !== 0
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

function recurringRuleLabel(rule: RecurringEntry): string {
  if (rule.frequency === "weekly") {
    return `每週${WEEKDAY_ZH[rule.weekly_day] ?? "?"}`
  }
  if (rule.frequency === "monthly") {
    return `每月 ${rule.monthly_day} 號`
  }
  return `每年 ${rule.yearly_month}/${rule.yearly_day}`
}

function isRecurringDueOnDate(rule: RecurringEntry, dateString: string): boolean {
  if (dateString < rule.start_date) return false
  const date = parseYmdDate(dateString)
  if (!date) return false

  if (rule.frequency === "weekly") {
    return date.getDay() === rule.weekly_day
  }

  if (rule.frequency === "monthly") {
    const dueDay = Math.min(rule.monthly_day, daysInMonth(date.getFullYear(), date.getMonth() + 1))
    return date.getDate() === dueDay
  }

  if (date.getMonth() + 1 !== rule.yearly_month) return false
  const dueDay = Math.min(rule.yearly_day, daysInMonth(date.getFullYear(), rule.yearly_month))
  return date.getDate() === dueDay
}

function collectRecurringDueDates(rule: RecurringEntry, startDate: string, endDate: string): string[] {
  if (startDate > endDate) return []

  const dueDates: string[] = []
  let cursor = startDate < rule.start_date ? rule.start_date : startDate

  for (let guard = 0; guard < 2000 && cursor <= endDate; guard += 1) {
    if (isRecurringDueOnDate(rule, cursor)) {
      dueDates.push(cursor)
    }
    const nextCursor = shiftDateByDays(cursor, 1)
    if (nextCursor === cursor) break
    cursor = nextCursor
  }

  return dueDates
}

function findNextRecurringDueDate(rule: RecurringEntry, fromDate: string): string | null {
  let cursor = fromDate < rule.start_date ? rule.start_date : fromDate
  for (let guard = 0; guard < 800; guard += 1) {
    if (isRecurringDueOnDate(rule, cursor)) return cursor
    const nextCursor = shiftDateByDays(cursor, 1)
    if (nextCursor === cursor) break
    cursor = nextCursor
  }
  return null
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
  if (mode === "text_single" || mode === "voice_single" || mode === "bulk_text") return "智慧輸入"
  if (mode === "photo_single") return "照片上傳"
  if (mode === "file_import") return "檔案匯入"
  const found = MODE_OPTIONS.find(item => item.mode === mode)
  return found ? found.title : mode
}

function categoryLabel(categoryKey: string): string {
  const category = CATEGORY_BY_KEY.get(categoryKey)
  if (!category) return categoryKey
  return `${domainLabel(category.domain)}${directionLabel(category.direction)}｜${category.display_name_zh}`
}

function feedbackAmountClass(current: number, previous: number): string {
  if (current < previous) return "text-emerald-300"
  if (current > previous) return "text-rose-300"
  return "text-amber-200"
}

function pickFeedbackText(
  current: number,
  previous: number,
  lowerText: string,
  higherText: string,
  sameText: string
): string {
  if (current < previous) return lowerText
  if (current > previous) return higherText
  return sameText
}

function sumTransactionAmounts(items: Transaction[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

function getFeedbackWeekRanges(referenceDate: string): {
  currentWeekRange: { start: string; end: string }
  previousWeekRange: { start: string; end: string }
} {
  const currentWeekRange = getWeekRange(referenceDate)
  return {
    currentWeekRange,
    previousWeekRange: {
      start: shiftDateByDays(currentWeekRange.start, -7),
      end: shiftDateByDays(currentWeekRange.end, -7),
    },
  }
}

function createWeeklyExpenseFeedback(transactions: Transaction[]): AiFinanceFeedbackCard | null {
  const todayKey = new Date().toISOString().slice(0, 10)
  const { currentWeekRange, previousWeekRange } = getFeedbackWeekRanges(todayKey)
  const currentWeekExpense = sumTransactionAmounts(
    transactions.filter(item => item.direction === "expense" && isDateWithinRange(item.occurred_at, currentWeekRange.start, currentWeekRange.end))
  )
  const previousWeekExpense = sumTransactionAmounts(
    transactions.filter(item => item.direction === "expense" && isDateWithinRange(item.occurred_at, previousWeekRange.start, previousWeekRange.end))
  )

  if (currentWeekExpense <= 0 && previousWeekExpense <= 0) return null

  return {
    id: "weekly-expense",
    badge: "AI 支出雷達",
    title: pickFeedbackText(
      currentWeekExpense,
      previousWeekExpense,
      "本週支出有降溫，錢包終於不用全天待命。",
      "本週支出偏熱，錢包辛苦了，但還在可控範圍。",
      "本週支出節奏穩定，像開著財務巡航模式。"
    ),
    metricLabel: "本週總支出",
    metricValue: formatMoney(currentWeekExpense),
    comparisonText: formatChangeAgainstPrevious(currentWeekExpense, previousWeekExpense),
    detailText: pickFeedbackText(
      currentWeekExpense,
      previousWeekExpense,
      "這代表你不是沒花，而是花得更有判斷，這種收斂很有價值。",
      "先別急著緊張，優先確認是一次性支出，還是日常花費真的升溫。",
      "波動不大通常是好事，代表日常支出規律度其實不錯。"
    ),
    tipText: `建議先回看 ${currentWeekRange.start.slice(5).replace("-", "/")} - ${currentWeekRange.end.slice(5).replace("-", "/")} 裡最大的 1 到 2 筆支出，通常主因很快就會浮出來。`,
    amountClassName: feedbackAmountClass(currentWeekExpense, previousWeekExpense),
  }
}

function createWeeklyDrinkFeedback(transactions: Transaction[]): AiFinanceFeedbackCard | null {
  const todayKey = new Date().toISOString().slice(0, 10)
  const { currentWeekRange, previousWeekRange } = getFeedbackWeekRanges(todayKey)
  const currentWeekDrinkSpend = sumTransactionAmounts(
    transactions.filter(item => isDrinkRelatedTransaction(item) && isDateWithinRange(item.occurred_at, currentWeekRange.start, currentWeekRange.end))
  )
  const previousWeekDrinkSpend = sumTransactionAmounts(
    transactions.filter(item => isDrinkRelatedTransaction(item) && isDateWithinRange(item.occurred_at, previousWeekRange.start, previousWeekRange.end))
  )

  if (currentWeekDrinkSpend <= 0 && previousWeekDrinkSpend <= 0) return null

  return {
    id: "weekly-drink",
    badge: "AI 小額偵測",
    title: pickFeedbackText(
      currentWeekDrinkSpend,
      previousWeekDrinkSpend,
      "本週飲料支出有收斂，糖分和預算都比較冷靜。",
      "本週飲料有點活躍，嘴巴很快樂，預算也有感。",
      "本週飲料支出維持恆溫，屬於熟悉的快樂配方。"
    ),
    metricLabel: "本週飲料花費",
    metricValue: formatMoney(currentWeekDrinkSpend),
    comparisonText: formatChangeAgainstPrevious(currentWeekDrinkSpend, previousWeekDrinkSpend),
    detailText:
      currentWeekDrinkSpend === 0
        ? "目前沒有飲料支出紀錄，預算面板表示尊敬。"
        : "飲料單筆不大，但累積速度常常比訊息通知還快，是很值得追的小額支出。",
    tipText:
      previousWeekDrinkSpend === 0 && currentWeekDrinkSpend > 0
        ? "如果這週是臨時提神週，可以把這類支出獨立追蹤，避免它默默升級成固定班底。"
        : "先看最常出現的是咖啡、手搖還是超商飲料，第一個調整點通常就藏在那裡。",
    amountClassName: feedbackAmountClass(currentWeekDrinkSpend, previousWeekDrinkSpend),
  }
}

function createMonthlyTopCategoryFeedback(
  currentMonthTx: Transaction[],
  monthExpense: number,
  selectedMonth: string
): AiFinanceFeedbackCard | null {
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

function createMonthlyPeakDayFeedback(currentMonthTx: Transaction[]): AiFinanceFeedbackCard | null {
  const expenseByDate = new Map<string, { total: number; count: number }>()
  currentMonthTx.forEach(item => {
    if (item.direction !== "expense") return
    const previous = expenseByDate.get(item.occurred_at) ?? { total: 0, count: 0 }
    expenseByDate.set(item.occurred_at, {
      total: previous.total + item.amount,
      count: previous.count + 1,
    })
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

function createMonthlyNetFeedback(
  monthNet: number,
  monthSavingRate: number | null,
  monthTxCount: number,
  monthInsightText: string
): AiFinanceFeedbackCard | null {
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

function createStarterFeedback(): AiFinanceFeedbackCard {
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
  const [_entryImportAdvancedOpen, setEntryImportAdvancedOpen] = useState(false)
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null)
  const [calendarDaySheetOpen, setCalendarDaySheetOpen] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS)
  const [drafts, setDrafts] = useState<DraftTransaction[]>([])
  const [importJob, setImportJob] = useState<ImportJob | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const entryCategorySectionRef = useRef<HTMLDivElement | null>(null)
  const entryDateInputRef = useRef<HTMLInputElement | null>(null)

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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [fileColumns, setFileColumns] = useState<string[]>(["col_1"])
  const [fileMapping, setFileMapping] = useState<FileMapping>(DEFAULT_MAPPING)
  const [templateMap, setTemplateMap] = useState<Record<string, FileMapping>>({})
  const [isFileParsing, setIsFileParsing] = useState(false)
  const [fileImportTab, setFileImportTab] = useState<"expense" | "income">("expense")

  const [entryDirection, setEntryDirection] = useState<Exclude<Direction, "unknown">>("expense")
  const [entryDomain, setEntryDomain] = useState<Exclude<Domain, "unknown">>("life")
  const [entryCategory, setEntryCategory] = useState("")
  const [entryCalcDisplay, setEntryCalcDisplay] = useState("0")
  const [entryNote, setEntryNote] = useState("")
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [entryAdvancedMode, setEntryAdvancedMode] = useState<"none" | "text" | "file">("none")
  const [entryEditingId, setEntryEditingId] = useState<string | null>(null)
  const [entryCategoryNeedsAttention, setEntryCategoryNeedsAttention] = useState(false)

  const [dreamTarget, setDreamTarget] = useState(200000)
  const [dreamSaved, setDreamSaved] = useState(20000)
  const [dreamDeadline, setDreamDeadline] = useState(defaultDreamDeadline)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => Number(new Date().toISOString().slice(0, 4)))

  const [banner, setBanner] = useState<string | null>(null)
  const [aiFinanceFeedbackId, setAiFinanceFeedbackId] = useState<string | null>(null)
  const [storageReady, setStorageReady] = useState(false)
  const [overviewQuery, setOverviewQuery] = useState("")
  const [overviewDirectionFilter, setOverviewDirectionFilter] = useState<OverviewDirectionFilter>("all")
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TransactionEditDraft | null>(null)

  const [statsDetailDirection, setStatsDetailDirection] = useState<StatsDirection>("expense")
  const [statsTimeRange, setStatsTimeRange] = useState<StatsTimeRange>("month")
  const [statsCustomStart, setStatsCustomStart] = useState("")
  const [statsCustomEnd, setStatsCustomEnd] = useState("")
  const [statsYear, setStatsYear] = useState(() => new Date().getFullYear())
  const [statsViewMode, setStatsViewMode] = useState<"chart" | "calendar">("chart")
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [homeViewMode, setHomeViewMode] = useState<"chart" | "calendar">("chart")
  const [recurringEntries, setRecurringEntries] = useState<RecurringEntry[]>([])
  const [recurringRecordLogs, setRecurringRecordLogs] = useState<RecurringRecordLog[]>([])
  const [recurringEditingId, setRecurringEditingId] = useState<string | null>(null)
  const [recurringForm, setRecurringForm] = useState<RecurringFormState>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      title: "",
      amount: "",
      direction: "expense",
      category_key: "life_expense_other",
      note: "",
      frequency: "monthly",
      weekly_day: 1,
      monthly_day: 1,
      yearly_month: 1,
      yearly_day: 1,
      start_date: today,
      enabled: true,
      auto_record: true,
      occurrence_mode: "unlimited",
      occurrence_limit: 12,
    }
  })

  useEffect(() => {
    let cancelled = false

    async function hydrateFromIndexedDb() {
      try {
        const [storedTransactions, storedTemplates, storedRecurringEntries, storedRecurringLogs] = await Promise.all([
          readIndexedDbValue<Transaction[]>(INDEXED_DB_TX_KEY),
          readIndexedDbValue<Record<string, FileMapping>>(INDEXED_DB_TEMPLATE_KEY),
          readIndexedDbValue<RecurringEntry[]>(INDEXED_DB_RECURRING_KEY),
          readIndexedDbValue<RecurringRecordLog[]>(INDEXED_DB_RECURRING_LOG_KEY),
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

        if (Array.isArray(storedRecurringEntries)) {
          setRecurringEntries(
            storedRecurringEntries.map(item => ({
              ...item,
              occurrence_limit: normalizeOccurrenceLimit(item.occurrence_limit),
            }))
          )
        }

        if (Array.isArray(storedRecurringLogs)) {
          setRecurringRecordLogs(storedRecurringLogs)
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
    if (!storageReady) return
    void writeIndexedDbValue(INDEXED_DB_RECURRING_KEY, recurringEntries).catch(() => {
      setBanner(previous => previous ?? "固定收支設定寫入失敗，請稍後再試。")
    })
  }, [recurringEntries, storageReady])

  useEffect(() => {
    if (!storageReady) return
    void writeIndexedDbValue(INDEXED_DB_RECURRING_LOG_KEY, recurringRecordLogs).catch(() => {
      setBanner(previous => previous ?? "固定收支記錄寫入失敗，請稍後再試。")
    })
  }, [recurringRecordLogs, storageReady])

  useEffect(() => {
    if (!storageReady || recurringEntries.length === 0) return

    const today = new Date().toISOString().slice(0, 10)
    const knownLogKeys = new Set(recurringRecordLogs.map(log => `${log.recurring_id}::${log.occurred_at}`))
    const recordedCountById = recurringRecordLogs.reduce((map, log) => {
      map.set(log.recurring_id, (map.get(log.recurring_id) ?? 0) + 1)
      return map
    }, new Map<string, number>())
    const logsToAppend: RecurringRecordLog[] = []
    const transactionsToAppend: Transaction[] = []
    const nowIso = new Date().toISOString()
    let shouldPatchEntries = false

    const nextEntries = recurringEntries.map(entry => {
      if (!entry.enabled || !entry.auto_record) return entry

      let recordedCount = recordedCountById.get(entry.id) ?? 0
      if (!hasRemainingRecurringOccurrences(entry, recordedCount)) {
        return entry
      }

      const startCursorCandidate = entry.last_auto_processed_at
        ? shiftDateByDays(entry.last_auto_processed_at, 1)
        : entry.start_date
      const startCursor = startCursorCandidate < entry.start_date ? entry.start_date : startCursorCandidate
      let createdCountForEntry = 0

      if (startCursor <= today) {
        const dueDates = collectRecurringDueDates(entry, startCursor, today)
        const category = CATEGORY_BY_KEY.get(entry.category_key)
        if (category) {
          for (const dueDate of dueDates) {
            if (!hasRemainingRecurringOccurrences(entry, recordedCount)) {
              break
            }
            const logKey = `${entry.id}::${dueDate}`
            if (knownLogKeys.has(logKey)) continue

            const txId = uid("tx")
            transactionsToAppend.push({
              id: txId,
              user_id: DEMO_USER_ID,
              occurred_at: dueDate,
              amount: entry.amount,
              direction: entry.direction,
              domain: category.domain,
              category_key: category.category_key,
              note: entry.note.trim() || `${entry.title}（固定收支）`,
              input_mode: "text_single",
              ai_predicted_category_key: category.category_key,
              ai_confidence: 1,
              user_overridden: false,
            })
            logsToAppend.push({
              id: uid("rlog"),
              recurring_id: entry.id,
              occurred_at: dueDate,
              transaction_id: txId,
              created_at: nowIso,
              source: "auto",
            })
            knownLogKeys.add(logKey)
            recordedCount += 1
            createdCountForEntry += 1
            recordedCountById.set(entry.id, recordedCount)
          }
        }
      }

      if (
        entry.last_auto_processed_at !== today &&
        (createdCountForEntry > 0 || hasRemainingRecurringOccurrences(entry, recordedCount))
      ) {
        shouldPatchEntries = true
        return {
          ...entry,
          last_auto_processed_at: today,
          updated_at: nowIso,
        }
      }
      return entry
    })

    if (transactionsToAppend.length > 0) {
      setTransactions(previous => [...transactionsToAppend, ...previous])
      setBanner(`固定收支到期已自動記帳 ${transactionsToAppend.length} 筆。`)
    }

    if (logsToAppend.length > 0) {
      setRecurringRecordLogs(previous => [...logsToAppend, ...previous])
    }

    if (shouldPatchEntries) {
      setRecurringEntries(nextEntries)
    }
  }, [recurringEntries, recurringRecordLogs, storageReady])

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
  const selectedCalendarTransactions = useMemo(() => {
    if (!calendarSelectedDate) return []
    return sortedTransactions.filter(item => item.occurred_at === calendarSelectedDate)
  }, [calendarSelectedDate, sortedTransactions])
  const calendarDayIncome = useMemo(
    () => selectedCalendarTransactions.filter(item => item.direction === "income").reduce((sum, item) => sum + item.amount, 0),
    [selectedCalendarTransactions]
  )
  const calendarDayExpense = useMemo(
    () => selectedCalendarTransactions.filter(item => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0),
    [selectedCalendarTransactions]
  )
  const calendarDayNet = calendarDayIncome - calendarDayExpense

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
  useEffect(() => {
    if (!calendarSelectedDate) return
    if (step !== "home" || homeViewMode !== "calendar" || !calendarSelectedDate.startsWith(selectedMonth)) {
      setCalendarSelectedDate(null)
      setCalendarDaySheetOpen(false)
    }
  }, [calendarSelectedDate, homeViewMode, selectedMonth, step])

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

  const groupedByDate = useMemo(() => {
    const groups: { date: string; label: string; transactions: Transaction[]; dayNet: number }[] = []
    const map = new Map<string, Transaction[]>()
    for (const tx of sortedCurrentMonthTransactions) {
      const key = tx.occurred_at
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }
    for (const [date, txList] of map) {
      const dayIncome = txList.filter(t => t.direction === "income").reduce((s, t) => s + t.amount, 0)
      const dayExpense = txList.filter(t => t.direction === "expense").reduce((s, t) => s + t.amount, 0)
      const dayNet = dayIncome - dayExpense
      groups.push({ date, label: formatDateGroup(date), transactions: txList, dayNet })
    }
    return groups
  }, [sortedCurrentMonthTransactions])

  const aiFinanceFeedbackOptions = useMemo(() => {
    const feedbacks = [
      createWeeklyExpenseFeedback(transactions),
      createWeeklyDrinkFeedback(transactions),
      createMonthlyTopCategoryFeedback(currentMonthTx, monthExpense, selectedMonth),
      createMonthlyPeakDayFeedback(currentMonthTx),
      createMonthlyNetFeedback(monthNet, monthSavingRate, monthTxCount, monthInsightText),
    ].filter((item): item is AiFinanceFeedbackCard => item !== null)

    return feedbacks.length > 0 ? feedbacks : [createStarterFeedback()]
  }, [currentMonthTx, monthExpense, monthInsightText, monthNet, monthSavingRate, monthTxCount, selectedMonth, transactions])

  useEffect(() => {
    if (aiFinanceFeedbackOptions.length === 0) {
      setAiFinanceFeedbackId(null)
      return
    }

    setAiFinanceFeedbackId(currentId => {
      if (currentId && aiFinanceFeedbackOptions.some(item => item.id === currentId)) {
        return currentId
      }

      let lastPickedId: string | null = null
      try {
        lastPickedId = globalThis.localStorage?.getItem(AI_FEEDBACK_LAST_PICK_KEY) ?? null
      } catch {
        lastPickedId = null
      }

      const nextId = pickRandomFeedbackId(aiFinanceFeedbackOptions, lastPickedId)

      try {
        globalThis.localStorage?.setItem(AI_FEEDBACK_LAST_PICK_KEY, nextId)
      } catch {
        // Ignore storage failures and still use the freshly selected feedback.
      }

      return nextId
    })
  }, [aiFinanceFeedbackOptions])

  const aiFinanceFeedback = useMemo(() => {
    if (aiFinanceFeedbackOptions.length === 0) return null

    return aiFinanceFeedbackOptions.find(item => item.id === aiFinanceFeedbackId) ?? aiFinanceFeedbackOptions[0]
  }, [aiFinanceFeedbackId, aiFinanceFeedbackOptions])

  const donutData = useMemo(() => {
    if (monthIncome === 0 && monthExpense === 0) {
      return [{ name: "無資料", value: 1, color: "#8c6a58" }]
    }
    return [
      { name: "收入", value: monthIncome, color: "#9eb18b" },
      { name: "支出", value: monthExpense, color: "#d3876a" },
    ]
  }, [monthIncome, monthExpense])

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
  const recurringCategories = useMemo(() => {
    const filtered = TAXONOMY.filter(item => item.direction === recurringForm.direction)
    filtered.sort((a, b) => {
      if (a.domain === b.domain) return 0
      return a.domain === "life" ? -1 : 1
    })
    return filtered
  }, [recurringForm.direction])
  const recurringRecordedCountById = useMemo(() => {
    const map = new Map<string, number>()
    recurringRecordLogs.forEach(log => {
      map.set(log.recurring_id, (map.get(log.recurring_id) ?? 0) + 1)
    })
    return map
  }, [recurringRecordLogs])
  const recurringSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const activeEntries = recurringEntries.filter(item => item.enabled)
    const activeWithRemaining = activeEntries.filter(item =>
      hasRemainingRecurringOccurrences(item, recurringRecordedCountById.get(item.id) ?? 0)
    )
    return {
      total: recurringEntries.length,
      active: activeEntries.length,
      active_with_remaining: activeWithRemaining.length,
      auto: activeWithRemaining.filter(item => item.auto_record).length,
      dueToday: activeWithRemaining.filter(item => isRecurringDueOnDate(item, today)).length,
    }
  }, [recurringEntries, recurringRecordedCountById])
  const latestRecurringLogById = useMemo(() => {
    const sortedLogs = [...recurringRecordLogs].sort((a, b) => {
      if (a.occurred_at !== b.occurred_at) {
        return b.occurred_at.localeCompare(a.occurred_at)
      }
      return b.created_at.localeCompare(a.created_at)
    })
    const map = new Map<string, RecurringRecordLog>()
    sortedLogs.forEach(log => {
      if (!map.has(log.recurring_id)) {
        map.set(log.recurring_id, log)
      }
    })
    return map
  }, [recurringRecordLogs])

  useEffect(() => {
    if (recurringCategories.length === 0) return
    if (recurringCategories.some(item => item.category_key === recurringForm.category_key)) return
    setRecurringForm(previous => ({
      ...previous,
      category_key: recurringCategories[0].category_key,
    }))
  }, [recurringCategories, recurringForm.category_key])

  function resetRecurringForm(direction: Exclude<Direction, "unknown"> = recurringForm.direction) {
    const today = new Date().toISOString().slice(0, 10)
    const fallbackCategory = direction === "income" ? "life_income_other" : "life_expense_other"
    setRecurringEditingId(null)
    setRecurringForm({
      title: "",
      amount: "",
      direction,
      category_key: fallbackCategory,
      note: "",
      frequency: "monthly",
      weekly_day: 1,
      monthly_day: 1,
      yearly_month: 1,
      yearly_day: 1,
      start_date: today,
      enabled: true,
      auto_record: true,
      occurrence_mode: "unlimited",
      occurrence_limit: 12,
    })
  }

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
    setUploadedFiles([])
    setPreviewRows([])
    setFileColumns(["col_1"])
    setFileMapping(DEFAULT_MAPPING)
    setFileImportTab("expense")
    setImportJob(null)
  }

  function startSmartEntry(mode: InputMode = "text_single") {
    const today = new Date().toISOString().slice(0, 10)
    setEntryEditingId(null)
    setEntryDirection("expense")
    setEntryCategory("")
    setEntryCategoryNeedsAttention(false)
    setEntryCalcDisplay("0")
    setEntryNote("")
    setEntryDate(today)
    setEntryAdvancedMode("none")
    setEntryImportAdvancedOpen(false)
    setBanner(null)
    setDrafts([])
    resetQuickInputs()
    setActiveMode(mode)
    setStep("quick-add")
  }

  function startManualEntry() {
    const today = new Date().toISOString().slice(0, 10)
    recognitionRef.current?.stop()
    setIsListening(false)
    setSpeechPreview("")
    setSpeechError(null)
    setEntryEditingId(null)
    setEntryDirection("expense")
    setEntryDomain("life")
    setEntryCategory("")
    setEntryCategoryNeedsAttention(false)
    setEntryCalcDisplay("0")
    setEntryNote("")
    setEntryDate(today)
    setEntryAdvancedMode("none")
    setEntryImportAdvancedOpen(false)
    setBanner(null)
    setStep("new-entry")
  }

  function switchQuickAddMode(mode: InputMode) {
    recognitionRef.current?.stop()
    setIsListening(false)
    setSpeechPreview("")
    setSpeechError(null)
    setActiveMode(mode)
    setBanner(null)
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
    startSmartEntry(mode)
  }

  function buildMockFileDrafts(files: File[]): DraftTransaction[] {
    if (files.length === 0) return []
    const generatedCount = Math.min(Math.max(files.length * 4, 4), 40)
    return generateRandomDrafts(generatedCount).map((draft, index) => ({
      ...draft,
      source_file_id: files[index % files.length]?.name ?? "",
    }))
  }

  function handleFilesPicked(files: File[]) {
    setUploadedFiles(files)
    setUploadedFile(files[0] ?? null)
    setPreviewRows([])
    setImportJob(null)
    setShowMappingSettings(false)
    setFileColumns(["col_1"])
    setFileMapping(DEFAULT_MAPPING)

    if (files.length === 0) {
      setUploadKind("none")
      setDrafts([])
      return
    }

    setBanner(null)
    setUploadKind("document")
    setIsFileParsing(true)

    const generatedDrafts = buildMockFileDrafts(files)

    setDrafts(generatedDrafts)
    setImportJob({
      job_id: uid("job"),
      user_id: DEMO_USER_ID,
      input_mode: "file_import",
      status: "ready_to_import",
      errors: [],
      stats: {
        total_lines: generatedDrafts.length,
        success_lines: generatedDrafts.length,
        needs_manual_lines: 0,
      },
    })
    setFileImportTab("expense")
    setIsFileParsing(false)
  }

  function handleFilePicked(file: File | null) {
    handleFilesPicked(file ? [file] : [])
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

  function generateRandomDrafts(count: number): DraftTransaction[] {
    const expenseCategories = TAXONOMY.filter(c => c.direction === "expense")
    const incomeCategories = TAXONOMY.filter(c => c.direction === "income")

    const expenseNotes = [
      "午餐 便當", "超商 飲料", "計程車", "加油", "早餐 三明治",
      "晚餐 火鍋", "日用品 衛生紙", "手機月費", "水電瓦斯", "咖啡",
      "文具用品", "停車費", "電影票", "網購 衣服", "保險費",
      "藥局 感冒藥", "理髮", "書籍", "寵物飼料", "禮物",
    ]
    const incomeNotes = [
      "薪資入帳", "接案收入", "獎金", "退款", "利息收入",
      "二手出售", "紅包", "股利", "兼職收入", "稿費",
    ]

    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()

    return Array.from({ length: count }, () => {
      const isIncome = Math.random() < 0.25
      const pool = isIncome ? incomeCategories : expenseCategories
      const cat = pool[Math.floor(Math.random() * pool.length)]
      const notes = isIncome ? incomeNotes : expenseNotes
      const note = notes[Math.floor(Math.random() * notes.length)]
      const amount = isIncome
        ? Math.round((Math.random() * 15000 + 1000) / 100) * 100
        : Math.round((Math.random() * 1500 + 30) / 10) * 10

      const dayOffset = Math.floor(Math.random() * 28)
      const d = new Date(y, m, today.getDate() - dayOffset)
      const dateStr = d.toISOString().slice(0, 10)

      return {
        id: uid("draft"),
        user_id: DEMO_USER_ID,
        occurred_at: dateStr,
        amount,
        direction: cat.direction,
        domain: cat.domain,
        category_key: cat.category_key,
        note,
        input_mode: "file_import" as InputMode,
        ai_predicted_category_key: cat.category_key,
        ai_confidence: +(Math.random() * 0.35 + 0.6).toFixed(2),
        user_overridden: false,
        source_file_id: "",
        raw_line: note,
        selected: true,
      }
    })
  }

  function handleParseInput(parseModeOverride?: InputMode) {
    setBanner(null)
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }

    const parseMode = parseModeOverride ?? activeMode
    let parsed: DraftTransaction[] = []
    if (parseMode === "text_single") {
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
    } else if (parseMode === "file_import") {
      let sourceFiles: File[] = []
      if (uploadedFiles.length > 0) {
        sourceFiles = uploadedFiles
      } else if (uploadedFile) {
        sourceFiles = [uploadedFile]
      }
      parsed = buildMockFileDrafts(sourceFiles)
      if (sourceFiles.length > 0) {
        setImportJob({
          job_id: uid("job"),
          user_id: DEMO_USER_ID,
          input_mode: "file_import",
          status: "ready_to_import",
          errors: [],
          stats: {
            total_lines: parsed.length,
            success_lines: parsed.length,
            needs_manual_lines: 0,
          },
        })
      } else {
        setImportJob(null)
      }
    }

    if (parsed.length === 0) {
      setBanner("尚未產生可確認資料，請先輸入內容或上傳檔案。")
      return
    }

    setDrafts(parsed)
    setStep("confirm")
  }

  function updateDraft(index: number, updater: (draft: DraftTransaction) => DraftTransaction) {
    setDrafts(prev => prev.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)))
  }

  function shiftDraftDate(index: number, days: number) {
    updateDraft(index, item => {
      const fallbackDate = new Date().toISOString().slice(0, 10)
      const baseDate = item.occurred_at || fallbackDate
      return { ...item, occurred_at: shiftDateByDays(baseDate, days) }
    })
  }

  function saveDrafts() {
    const missingAmountIndex = drafts.findIndex(item => item.amount <= 0)
    if (missingAmountIndex !== -1) {
      setBanner("有交易尚未填寫金額，請補齊後再送出。")
      const amountEl = document.querySelector<HTMLInputElement>(`[data-draft-amount="${missingAmountIndex}"]`)
      if (amountEl) {
        amountEl.scrollIntoView({ behavior: "smooth", block: "center" })
        setTimeout(() => amountEl.focus(), 300)
      }
      return
    }

    const missingDateIndex = drafts.findIndex(item => !item.occurred_at)
    if (missingDateIndex !== -1) {
      setBanner("有交易尚未填寫日期，請補齊後再送出。")
      const el = document.querySelector<HTMLInputElement>(`[data-draft-date="${missingDateIndex}"]`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setTimeout(() => el.focus(), 300)
      }
      return
    }

    const uncategorizedIndex = drafts.findIndex(item => item.category_key.includes("other") && !item.categoryTouched)
    if (uncategorizedIndex !== -1) {
      setBanner("有交易的類別尚未確認，請在下拉選單中明確選擇類別後再儲存。")
      const el = document.querySelector<HTMLSelectElement>(`[data-draft-category="${uncategorizedIndex}"]`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setTimeout(() => el.focus(), 300)
      }
      return
    }

    const validDrafts = drafts.filter(item => !item.parse_error && item.amount > 0)
    if (validDrafts.length === 0) {
      setBanner("沒有可儲存的交易，請先補齊必填欄位。")
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

  function startEditRecurring(rule: RecurringEntry) {
    const normalizedLimit = normalizeOccurrenceLimit(rule.occurrence_limit)
    setRecurringEditingId(rule.id)
    setRecurringForm({
      title: rule.title,
      amount: String(rule.amount),
      direction: rule.direction,
      category_key: rule.category_key,
      note: rule.note,
      frequency: rule.frequency,
      weekly_day: rule.weekly_day,
      monthly_day: rule.monthly_day,
      yearly_month: rule.yearly_month,
      yearly_day: rule.yearly_day,
      start_date: rule.start_date,
      enabled: rule.enabled,
      auto_record: rule.auto_record,
      occurrence_mode: normalizedLimit === null ? "unlimited" : "limited",
      occurrence_limit: normalizedLimit ?? 12,
    })
    setStep("recurring")
    setBanner(null)
  }

  function saveRecurringSetting() {
    const amountValue = parseNumber(recurringForm.amount)
    if (amountValue === null || amountValue <= 0) {
      setBanner("請輸入固定收支金額（需大於 0）。")
      return
    }

    const category = CATEGORY_BY_KEY.get(recurringForm.category_key)
    if (!category || category.direction !== recurringForm.direction) {
      setBanner("固定收支類別無效，請重新選擇。")
      return
    }

    const normalizedTitle = recurringForm.title.trim() || category.display_name_zh
    const normalizedNote = recurringForm.note.trim() || normalizedTitle
    const normalizedWeeklyDay = clampInteger(recurringForm.weekly_day, 0, 6)
    const normalizedMonthlyDay = clampInteger(recurringForm.monthly_day, 1, 31)
    const normalizedYearlyMonth = clampInteger(recurringForm.yearly_month, 1, 12)
    const normalizedYearlyDay = clampInteger(recurringForm.yearly_day, 1, 31)
    const normalizedOccurrenceLimit =
      recurringForm.occurrence_mode === "limited"
        ? clampInteger(recurringForm.occurrence_limit, 1, MAX_RECURRING_OCCURRENCES)
        : null
    const normalizedStartDate = parseYmdDate(recurringForm.start_date)
      ? recurringForm.start_date
      : new Date().toISOString().slice(0, 10)
    const nowIso = new Date().toISOString()
    const recheckFrom = shiftDateByDays(new Date().toISOString().slice(0, 10), -1)
    const currentRecordedCount = recurringEditingId ? (recurringRecordedCountById.get(recurringEditingId) ?? 0) : 0
    const hasRemainingAfterSave =
      normalizedOccurrenceLimit === null || currentRecordedCount < normalizedOccurrenceLimit
    const shouldAutoCheck = recurringForm.enabled && recurringForm.auto_record && hasRemainingAfterSave

    if (recurringEditingId) {
      setRecurringEntries(previous =>
        previous.map(item => {
          if (item.id !== recurringEditingId) return item
          return {
            ...item,
            title: normalizedTitle,
            amount: Math.round(Math.abs(amountValue)),
            direction: recurringForm.direction,
            category_key: category.category_key,
            note: normalizedNote,
            frequency: recurringForm.frequency,
            weekly_day: normalizedWeeklyDay,
            monthly_day: normalizedMonthlyDay,
            yearly_month: normalizedYearlyMonth,
            yearly_day: normalizedYearlyDay,
            start_date: normalizedStartDate,
            enabled: recurringForm.enabled,
            auto_record: recurringForm.auto_record,
            occurrence_limit: normalizedOccurrenceLimit,
            last_auto_processed_at: shouldAutoCheck ? recheckFrom : item.last_auto_processed_at,
            updated_at: nowIso,
          }
        })
      )
      setBanner("已更新固定收支設定。")
    } else {
      const newRule: RecurringEntry = {
        id: uid("rec"),
        title: normalizedTitle,
        amount: Math.round(Math.abs(amountValue)),
        direction: recurringForm.direction,
        category_key: category.category_key,
        note: normalizedNote,
        frequency: recurringForm.frequency,
        weekly_day: normalizedWeeklyDay,
        monthly_day: normalizedMonthlyDay,
        yearly_month: normalizedYearlyMonth,
        yearly_day: normalizedYearlyDay,
        start_date: normalizedStartDate,
        enabled: recurringForm.enabled,
        auto_record: recurringForm.auto_record,
        occurrence_limit: normalizedOccurrenceLimit,
        last_auto_processed_at: shouldAutoCheck ? recheckFrom : null,
        created_at: nowIso,
        updated_at: nowIso,
      }
      setRecurringEntries(previous => [newRule, ...previous])
      setBanner("已新增固定收支設定。")
    }

    resetRecurringForm(recurringForm.direction)
  }

  function removeRecurringRule(ruleId: string) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("確定要刪除這筆固定收支設定嗎？")
      if (!confirmed) return
    }

    setRecurringEntries(previous => previous.filter(item => item.id !== ruleId))
    setRecurringRecordLogs(previous => previous.filter(log => log.recurring_id !== ruleId))
    if (recurringEditingId === ruleId) {
      resetRecurringForm()
    }
    setBanner("已刪除固定收支設定。")
  }

  function toggleRecurringRuleEnabled(ruleId: string) {
    const today = new Date().toISOString().slice(0, 10)
    let message = ""
    setRecurringEntries(previous =>
      previous.map(item => {
        if (item.id !== ruleId) return item
        const nextEnabled = !item.enabled
        const hasRemaining = hasRemainingRecurringOccurrences(item, recurringRecordedCountById.get(item.id) ?? 0)
        message = nextEnabled
          ? hasRemaining
            ? "已啟用固定收支設定。"
            : "已啟用固定收支設定（已達次數上限）。"
          : "已停用固定收支設定。"
        return {
          ...item,
          enabled: nextEnabled,
          last_auto_processed_at:
            nextEnabled && item.auto_record && hasRemaining ? shiftDateByDays(today, -1) : item.last_auto_processed_at,
          updated_at: new Date().toISOString(),
        }
      })
    )
    if (message) setBanner(message)
  }

  function toggleRecurringRuleAutoRecord(ruleId: string) {
    const today = new Date().toISOString().slice(0, 10)
    let message = ""
    setRecurringEntries(previous =>
      previous.map(item => {
        if (item.id !== ruleId) return item
        const nextAutoRecord = !item.auto_record
        const hasRemaining = hasRemainingRecurringOccurrences(item, recurringRecordedCountById.get(item.id) ?? 0)
        message = nextAutoRecord
          ? hasRemaining
            ? "已開啟到期自動記帳。"
            : "已開啟到期自動記帳（已達次數上限）。"
          : "已關閉到期自動記帳。"
        return {
          ...item,
          auto_record: nextAutoRecord,
          last_auto_processed_at:
            nextAutoRecord && item.enabled && hasRemaining ? shiftDateByDays(today, -1) : item.last_auto_processed_at,
          updated_at: new Date().toISOString(),
        }
      })
    )
    if (message) setBanner(message)
  }

  function recordRecurringNow(rule: RecurringEntry) {
    const category = CATEGORY_BY_KEY.get(rule.category_key)
    if (!category) {
      setBanner("固定收支類別不存在，請先重新設定此項目。")
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const existingTodayLog = recurringRecordLogs.some(item => item.recurring_id === rule.id && item.occurred_at === today)
    if (existingTodayLog) {
      setBanner("今天已記錄過這筆固定收支。")
      return
    }

    const recordedCount = recurringRecordedCountById.get(rule.id) ?? 0
    if (!hasRemainingRecurringOccurrences(rule, recordedCount)) {
      setBanner(`此固定收支已達設定次數上限（${rule.occurrence_limit} 次）。`)
      return
    }

    const transactionId = uid("tx")

    setTransactions(previous => [
      {
        id: transactionId,
        user_id: DEMO_USER_ID,
        occurred_at: today,
        amount: rule.amount,
        direction: rule.direction,
        domain: category.domain,
        category_key: category.category_key,
        note: rule.note.trim() || `${rule.title}（固定收支）`,
        input_mode: "text_single",
        ai_predicted_category_key: category.category_key,
        ai_confidence: 1,
        user_overridden: false,
      },
      ...previous,
    ])

    setRecurringRecordLogs(previous => [
      {
        id: uid("rlog"),
        recurring_id: rule.id,
        occurred_at: today,
        transaction_id: transactionId,
        created_at: new Date().toISOString(),
        source: "manual",
      },
      ...previous,
    ])

    setBanner(`已手動記錄：${rule.title} ${formatMoney(rule.amount)}`)
  }

  function renderHome() {
    const selectedYear = Number(selectedMonth.split("-")[0])
    const selectedMonthNum = Number(selectedMonth.split("-")[1])

    function pickMonth(month: number) {
      const key = `${pickerYear}-${String(month).padStart(2, "0")}`
      setSelectedMonth(key)
      setMonthPickerOpen(false)
    }

    return (
      <div className="space-y-3 sm:space-y-4">
        <Card className="border-indigo-400/30 bg-slate-900/70 overflow-hidden">
          <CardContent className="pt-4 pb-4 sm:pt-5 sm:pb-5 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPickerYear(selectedYear)
                  setMonthPickerOpen(previous => !previous)
                }}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] rounded-md border border-white/20 bg-slate-950/60 hover:bg-slate-950/40 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base font-medium text-white select-none">
                  {formatMonthLabel(selectedMonth)}
                </span>
                <svg className={`h-3 w-3 text-slate-300 transition-transform ${monthPickerOpen ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setHomeViewMode(prev => prev === "chart" ? "calendar" : "chart")}
                  className={`flex items-center justify-center w-10 h-10 rounded-md border transition-colors ${
                    homeViewMode === "calendar"
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                      : "border-white/20 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                  aria-label="切換圓餅圖／行事曆"
                >
                  {homeViewMode === "chart"
                    ? <CalendarDays className="h-4 w-4" />
                    : <PieChartIcon className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {monthPickerOpen && (
              <div className="rounded-lg border border-white/15 bg-slate-950/70 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 min-h-[36px] min-w-[36px] p-0"
                    onClick={() => setPickerYear(previous => previous - 1)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold text-white">{pickerYear} 年</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 min-h-[36px] min-w-[36px] p-0"
                    onClick={() => setPickerYear(previous => previous + 1)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                    const isSelected = pickerYear === selectedYear && month === selectedMonthNum
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => pickMonth(month)}
                        className={`rounded-full py-2 text-sm font-medium transition-colors min-h-[40px] ${
                          isSelected
                            ? "bg-amber-400 text-slate-900"
                            : "bg-white/5 text-white border border-white/15 hover:bg-white/10 active:bg-white/20"
                        }`}
                      >
                        {month}月
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {homeViewMode === "chart" ? (
              <div className="relative w-full h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="60%"
                      innerRadius="40%"
                      outerRadius="72%"
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <button
                  type="button"
                  onClick={() => {
                    setStatsDetailDirection("net")
                    setStatsTimeRange("month")
                    setStep("stats-detail")
                  }}
                  className="absolute inset-0 flex flex-col items-center justify-center hover:bg-white/3 active:bg-white/5 transition-colors rounded-full"
                  style={{ top: "16%", bottom: "0%" }}
                >
                  <p className="text-[10px] sm:text-xs text-slate-400">總結餘</p>
                  <p className={`text-sm sm:text-lg font-bold leading-tight ${monthNet >= 0 ? "text-emerald-200" : "text-rose-300"}`}>
                    {formatMoney(monthNet)}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatsDetailDirection("expense")
                    setStatsTimeRange("month")
                    setStep("stats-detail")
                  }}
                  className="absolute top-0 left-0 text-left rounded-xl p-2.5 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors"
                >
                  <p className="mb-0.5 text-xs font-medium text-[#b87467]">總支出</p>
                  <p className="text-base sm:text-lg font-bold leading-tight text-[#ab6158]">{formatMoney(monthExpense)}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatsDetailDirection("income")
                    setStatsTimeRange("month")
                    setStep("stats-detail")
                  }}
                  className="absolute top-0 right-0 text-right rounded-xl p-2.5 hover:bg-emerald-500/10 active:bg-emerald-500/20 transition-colors"
                >
                  <p className="mb-0.5 text-xs font-medium text-[#8a9674]">總收入</p>
                  <p className="text-base sm:text-lg font-bold leading-tight text-[#6f8766]">{formatMoney(monthIncome)}</p>
                </button>
              </div>
            ) : (() => {
              const [hcY, hcM] = selectedMonth.split("-").map(Number)
              const hcDaysInMonth = new Date(hcY, hcM, 0).getDate()
              const hcFirstDay = new Date(hcY, hcM - 1, 1).getDay()
              const hcOffset = hcFirstDay === 0 ? 6 : hcFirstDay - 1
              const hcTodayStr = new Date().toISOString().slice(0, 10)
              const hcWeekdays = ["一", "二", "三", "四", "五", "六", "日"]

              return (
                <div className="space-y-2">
                  {/* Weekday header */}
                  <div className="grid grid-cols-7 gap-px">
                    {hcWeekdays.map(wd => (
                      <div key={wd} className="text-center text-[10px] text-slate-500 font-medium py-1">{wd}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 gap-px">
                    {Array.from({ length: hcOffset }).map((_, i) => (
                      <div key={`pad-${i}`} className="h-12 sm:h-14" />
                    ))}
                    {Array.from({ length: hcDaysInMonth }, (_, i) => {
                      const day = i + 1
                      const dateStr = `${hcY}-${String(hcM).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      const isToday = dateStr === hcTodayStr
                      const isSelected = dateStr === calendarSelectedDate
                      const dayTxs = currentMonthTx.filter(tx => tx.occurred_at === dateStr)
                      const dayExp = dayTxs.filter(tx => tx.direction === "expense").reduce((s, tx) => s + tx.amount, 0)
                      const dayInc = dayTxs.filter(tx => tx.direction === "income").reduce((s, tx) => s + tx.amount, 0)
                      const dayNet = dayInc - dayExp
                      const hasData = dayExp > 0 || dayInc > 0
                      const dayNetClass = cashFlowToneClass(dayNet)
                      const compactNet = formatCompactCashFlow(dayNet)

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setCalendarSelectedDate(dateStr)
                            setCalendarDaySheetOpen(true)
                          }}
                          aria-label={`${dateStr} ${dayTxs.length} 筆記帳`}
                          className={`h-12 sm:h-14 w-full rounded-lg flex flex-col items-center pt-1 transition-colors ${
                            isSelected
                              ? "bg-indigo-500/25 border border-indigo-400/50"
                              : isToday
                              ? "bg-amber-400/15 border border-amber-400/40 hover:bg-amber-400/20"
                              : hasData
                              ? "border border-transparent hover:bg-white/8"
                              : "border border-transparent hover:bg-white/5"
                          }`}
                        >
                          <span className={`text-[11px] font-medium leading-none ${
                            isSelected ? "text-indigo-100" : isToday ? "text-amber-300" : "text-slate-300"
                          }`}>
                            {day}
                          </span>
                          {hasData && (
                            <div className="flex flex-col items-center gap-0.5 mt-auto mb-1">
                              <span className={`text-[8px] sm:text-[9px] font-medium leading-none ${dayNetClass}`}>
                                {compactNet}
                              </span>
                              <div className="flex gap-0.5">
                                {dayExp > 0 && <span className="w-1 h-1 rounded-full bg-rose-400" />}
                                {dayInc > 0 && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Summary row */}
                  <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-2 mt-1 px-0.5">
                    <button
                      type="button"
                      onClick={() => { setStatsDetailDirection("expense"); setStatsTimeRange("month"); setStep("stats-detail") }}
                      className="text-rose-300 hover:text-rose-200 transition-colors"
                    >
                      支出：{formatMoney(monthExpense)}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsDetailDirection("income"); setStatsTimeRange("month"); setStep("stats-detail") }}
                      className="text-emerald-300 hover:text-emerald-200 transition-colors"
                    >
                      收入：{formatMoney(monthIncome)}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsDetailDirection("net"); setStatsTimeRange("month"); setStep("stats-detail") }}
                      className={`transition-colors ${monthNet >= 0 ? "text-emerald-200 hover:text-emerald-100" : "text-rose-200 hover:text-rose-100"}`}
                    >
                      結餘：{monthNet > 0 ? "+" : ""}{formatMoney(monthNet)}
                    </button>
                  </div>
                </div>
              )
            })()}

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 text-xs min-h-[34px] px-3"
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
                className="border-indigo-300/35 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20 text-xs min-h-[34px] px-3"
                onClick={() => {
                  setStep("recurring")
                  setBanner(null)
                }}
              >
                固定收支
              </Button>
              <span className="text-xs text-slate-400">
                {monthTxCount} 筆紀錄 ・ 固定可執行 {recurringSummary.active_with_remaining} 項 ・ 今日到期 {recurringSummary.dueToday}
              </span>
            </div>
          </CardContent>
        </Card>

        {aiFinanceFeedback && (
          <Card className="relative overflow-hidden border-[#efd9cf] bg-[linear-gradient(135deg,#fffaf7_0%,#fdeee7_58%,#f9e4db_100%)] shadow-[0_18px_42px_rgba(236,201,184,0.28)]">
            <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#f6d8ca]/55" />
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-white/35" />
            <div className="pointer-events-none absolute right-10 top-8 h-20 w-20 rounded-full bg-[#f8dfd4]/40" />
            <CardContent className="relative pt-4 pb-4 sm:pt-5 sm:pb-5 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f2ddd4] bg-white/75 px-2.5 py-1 text-[11px] font-medium text-[#8f6873]">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI 財務回饋
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#d49f73]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#f0b986]" />
                      <span>今日觀察</span>
                    </div>
                  </div>
                  <p className="mt-3 text-base sm:text-lg font-semibold leading-snug text-[#6d5864]">{aiFinanceFeedback.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#8f7a84]">{aiFinanceFeedback.detailText}</p>
                </div>

                <div className="shrink-0 rounded-2xl border border-white/70 bg-white/72 px-3.5 py-3 text-left sm:min-w-[188px] shadow-[0_10px_24px_rgba(241,217,204,0.42)]">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#b79a8f]">{aiFinanceFeedback.metricLabel}</p>
                  <p className={`mt-2 text-2xl sm:text-3xl font-semibold font-mono tracking-tight ${aiFinanceFeedback.amountClassName}`}>
                    {aiFinanceFeedback.metricValue}
                  </p>
                  <p className="mt-2 text-[11px] text-[#a58a92]">
                    {aiFinanceFeedback.comparisonText}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#f0dfd6] bg-white/60 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-[#efd9cf] bg-[#fff4ef] px-2.5 py-1 text-[11px] font-medium text-[#9f6a70]">
                    {aiFinanceFeedback.badge}
                  </span>
                  <span className="text-[10px] tracking-[0.18em] text-[#c4a39a]">PERSONALIZED INSIGHT</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#816d79]">{aiFinanceFeedback.tipText}</p>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#f0ddd3] pt-3 text-[11px] text-[#baa19b]">
                <span>依近期紀錄自動挑出一則重點</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 夢想目標差額：暫時隱藏，後續開放 */}

        {sortedCurrentMonthTransactions.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-slate-900/60 px-4 py-8 text-center">
            <p className="text-slate-300 text-sm">{formatMonthLabel(selectedMonth)} 尚無記帳資料</p>
            <p className="text-slate-400 text-xs mt-1">按下方「＋」輸入一筆收支</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDate.map(group => (
              <div key={group.date}>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <p className="text-xs sm:text-sm font-medium text-slate-200">{group.label}</p>
                  {group.dayNet !== 0 && (
                    <p className={`text-xs font-medium ${cashFlowToneClass(group.dayNet)}`}>
                      {group.dayNet > 0 ? "+" : "-"}
                      {formatMoney(Math.abs(group.dayNet))}
                    </p>
                  )}
                </div>
                <Card className="border-white/10 bg-slate-900/70">
                  <CardContent className="p-0 divide-y divide-white/5">
                    {group.transactions.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openEntryForEdit(item)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 sm:py-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
                      >
                        <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <span className="text-xs">
                            {item.direction === "expense" ? "💸" : "💰"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.note}</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                            {categoryLabel(item.category_key)}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold shrink-0 ${item.direction === "expense" ? "text-rose-300" : "text-emerald-300"}`}>
                          {item.direction === "expense" ? "-" : "+"}
                          {formatMoney(item.amount)}
                        </p>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderOverview() {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
            onClick={() => {
              setStep("home")
              cancelEditTransaction()
            }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            回到主頁
          </Button>
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-200 bg-indigo-500/10 text-xs shrink-0">
            共 {transactions.length} 筆
          </Badge>
        </div>

        <Card className="border-white/20 bg-slate-900/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base sm:text-lg">交易總覽與編輯</CardTitle>
            <CardDescription className="text-slate-300 text-xs sm:text-sm">可搜尋、編輯與刪除既有交易</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant={overviewDirectionFilter === "all" ? "default" : "outline"}
                className={`min-h-[40px] text-xs sm:text-sm ${
                  overviewDirectionFilter === "all"
                    ? "bg-indigo-500 text-white hover:bg-indigo-400"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
                onClick={() => setOverviewDirectionFilter("all")}
              >
                全部（{overviewFilterStats.all}）
              </Button>
              <Button
                type="button"
                variant={overviewDirectionFilter === "income" ? "default" : "outline"}
                className={`min-h-[40px] text-xs sm:text-sm ${
                  overviewDirectionFilter === "income"
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
                onClick={() => setOverviewDirectionFilter("income")}
              >
                收入（{overviewFilterStats.income}）
              </Button>
              <Button
                type="button"
                variant={overviewDirectionFilter === "expense" ? "default" : "outline"}
                className={`min-h-[40px] text-xs sm:text-sm ${
                  overviewDirectionFilter === "expense"
                    ? "bg-rose-500 text-white hover:bg-rose-400"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
                onClick={() => setOverviewDirectionFilter("expense")}
              >
                支出（{overviewFilterStats.expense}）
              </Button>
            </div>
            <Input
              value={overviewQuery}
              onChange={event => setOverviewQuery(event.target.value)}
              className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white break-words">{item.note}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] sm:text-[11px] border-white/20 text-slate-200">
                              {categoryLabel(item.category_key)}
                            </Badge>
                            <span className="text-[10px] sm:text-[11px] text-slate-400">{item.occurred_at}</span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400">{modeLabel(item.input_mode)}</span>
                          </div>
                        </div>
                        <p className={`text-sm font-semibold shrink-0 ${item.direction === "expense" ? "text-rose-300" : "text-emerald-300"}`}>
                          {item.direction === "expense" ? "-" : "+"}
                          {formatMoney(item.amount)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px]"
                          onClick={() => startEditTransaction(item)}
                        >
                          編輯
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 min-h-[40px]"
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
                        className="min-h-[80px] sm:min-h-[90px] bg-slate-950/60 border-white/20 text-white text-sm"
                      />

                      <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 px-0.5">金額</p>
                          <Input
                            type="number"
                            min={0}
                            value={editDraft.amount}
                            onChange={event =>
                              setEditDraft(previous => (previous ? { ...previous, amount: event.target.value } : previous))
                            }
                            className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
                            placeholder="金額"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 px-0.5">日期</p>
                          <Input
                            type="date"
                            value={editDraft.occurred_at}
                            onChange={event =>
                              setEditDraft(previous => (previous ? { ...previous, occurred_at: event.target.value } : previous))
                            }
                            className="w-full bg-slate-950/60 border-white/20 text-white min-h-[44px] [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <CategorySelect
                        value={editDraft.category_key}
                        onValueChange={key =>
                          setEditDraft(previous => (previous ? { ...previous, category_key: key } : previous))
                        }
                      />

                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <Button
                          type="button"
                          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 min-h-[40px] text-sm"
                          onClick={saveEditedTransaction}
                        >
                          儲存
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
                          onClick={cancelEditTransaction}
                        >
                          取消
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 min-h-[40px] text-sm"
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
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
            onClick={() => setStep("home")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            回到主頁
          </Button>
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-200 bg-indigo-500/10 text-xs shrink-0">
            分析 {totalCount} 筆
          </Badge>
        </div>

        <Card className="border-white/20 bg-slate-900/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg sm:text-xl">財務分析與現金流評估</CardTitle>
            <CardDescription className="text-slate-300 text-xs sm:text-sm">沿用舊版分析與財務月報，依目前紀錄即時更新。</CardDescription>
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

  const entryCategories = useMemo(() => {
    const filtered = TAXONOMY.filter(c => c.direction === entryDirection && c.domain === entryDomain)
    if (entryDirection === "expense" && entryDomain === "life") {
      filtered.sort((a, b) => {
        const ai = LIFE_EXPENSE_ORDER.indexOf(a.category_key)
        const bi = LIFE_EXPENSE_ORDER.indexOf(b.category_key)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
    }
    return filtered
  }, [entryDirection, entryDomain])

  function calcPress(key: string) {
    setEntryCalcDisplay(prev => {
      if (key === "AC") return "0"
      if (key === "⌫") return prev.length <= 1 ? "0" : prev.slice(0, -1)
      if (key === "." && prev.includes(".")) return prev
      if (key === "=" || key === "OK") {
        try {
          const expression = prev.replaceAll("×", "*").replaceAll("÷", "/")
          const result = Function(`"use strict"; return (${expression})`)()
          if (typeof result === "number" && Number.isFinite(result)) {
            return String(Math.round(Math.abs(result)))
          }
        } catch {
          /* keep current display */
        }
        return prev
      }

      if (["+", "-", "×", "÷"].includes(key)) {
        const lastChar = prev.at(-1) ?? ""
        if (["+", "-", "×", "÷"].includes(lastChar)) {
          return prev.slice(0, -1) + key
        }
        return prev + key
      }

      if (prev === "0" && key !== ".") return key
      return prev + key
    })
  }

  function calcEvaluate(): number {
    try {
      const expression = entryCalcDisplay.replaceAll("×", "*").replaceAll("÷", "/")
      const result = Function(`"use strict"; return (${expression})`)()
      if (typeof result === "number" && Number.isFinite(result)) {
        return Math.round(Math.abs(result))
      }
    } catch {
      /* ignore */
    }
    const parsed = Number.parseFloat(entryCalcDisplay)
    return Number.isFinite(parsed) ? Math.round(Math.abs(parsed)) : 0
  }

  function openEntryDatePicker() {
    const input = entryDateInputRef.current
    if (!input) return

    input.focus()

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void }
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker()
      return
    }

    input.click()
  }

  function focusEntryCategorySelection() {
    const section = entryCategorySectionRef.current
    if (!section) return

    section.scrollIntoView({ behavior: "smooth", block: "start" })

    globalThis.setTimeout(() => {
      const firstOption = section.querySelector<HTMLButtonElement>("[data-entry-category-option]")
      if (firstOption) {
        firstOption.focus()
        return
      }
      section.focus()
    }, 250)
  }

  function openEntryForEdit(tx: Transaction) {
    const dir = tx.direction === "income" || tx.direction === "expense" ? tx.direction : "expense"
    const dom = tx.domain === "life" || tx.domain === "business" ? tx.domain : "life"
    setEntryEditingId(tx.id)
    setEntryDirection(dir)
    setEntryDomain(dom)
    setEntryCategory(tx.category_key)
    setEntryCategoryNeedsAttention(false)
    setEntryCalcDisplay(String(tx.amount))
    setEntryNote(tx.note)
    setEntryDate(tx.occurred_at)
    setEntryAdvancedMode("none")
    setEntryImportAdvancedOpen(false)
    setBanner(null)
    setStep("new-entry")
  }

  function deleteEntryEditing() {
    if (!entryEditingId) return
    if (typeof globalThis.window !== "undefined") {
      const confirmed = globalThis.window.confirm("確定要刪除這筆交易嗎？")
      if (!confirmed) return
    }
    setTransactions(prev => prev.filter(t => t.id !== entryEditingId))
    setEntryEditingId(null)
    setStep("home")
    setBanner("已刪除這筆交易。")
  }

  function saveQuickEntry() {
    const amount = calcEvaluate()
    if (amount <= 0) return

    if (!entryCategory) {
      setEntryCategoryNeedsAttention(true)
      setBanner("請先在上方選擇一個類型，再完成送出。")
      focusEntryCategorySelection()
      return
    }

    const category = CATEGORY_BY_KEY.get(entryCategory)
    if (!category) {
      setBanner("找不到對應的類型，請重新選擇。")
      setEntryCategoryNeedsAttention(true)
      focusEntryCategorySelection()
      return
    }

    setEntryCategoryNeedsAttention(false)

    if (entryEditingId) {
      setTransactions(prev =>
        prev.map(t => {
          if (t.id !== entryEditingId) return t
          return {
            ...t,
            occurred_at: entryDate,
            amount,
            direction: entryDirection,
            domain: category.domain,
            category_key: category.category_key,
            note: entryNote.trim() || category.display_name_zh,
            user_overridden: t.ai_predicted_category_key !== category.category_key,
          }
        })
      )
      setBanner(`已更新：${category.display_name_zh} ${formatMoney(amount)}`)
    } else {
      const tx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        user_id: DEMO_USER_ID,
        occurred_at: entryDate,
        amount,
        direction: entryDirection,
        domain: category.domain,
        category_key: category.category_key,
        note: entryNote.trim() || category.display_name_zh,
        input_mode: "text_single",
        ai_predicted_category_key: category.category_key,
        ai_confidence: 1,
        user_overridden: false,
      }
      setTransactions(prev => [...prev, tx])
      setBanner(`已新增：${category.display_name_zh} ${formatMoney(amount)}`)
    }

    setEntryEditingId(null)
    setEntryCalcDisplay("0")
    setEntryNote("")
    setEntryCategory("")
    setEntryCategoryNeedsAttention(false)
    setEntryDate(new Date().toISOString().slice(0, 10))
    setStep("home")
  }

  function renderEntryCategorySection() {
    if (entryAdvancedMode !== "none") return null

    const needsCategoryHint = entryCategoryNeedsAttention && !entryCategory
    const categorySectionTone = needsCategoryHint
      ? "border-amber-300/40 bg-amber-500/10 ring-1 ring-amber-400/20"
      : "border-white/10 bg-white/0"

    return (
      <>
        <div
          ref={entryCategorySectionRef}
          tabIndex={-1}
          className={`mb-3 rounded-xl border p-2.5 transition-colors focus:outline-none ${categorySectionTone}`}
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
            <p className="text-[11px] text-slate-400">請選擇一個類型</p>
            {needsCategoryHint && (
              <span className="text-[11px] text-amber-200 text-right">先點一個最接近的類型，再繼續儲存</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-h-[180px] overflow-y-auto pr-1">
            {entryCategories.map(cat => {
              const isActive = entryCategory === cat.category_key
              let categoryButtonTone = "bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 active:bg-white/15"

              if (isActive) {
                categoryButtonTone =
                  entryDirection === "expense"
                    ? "bg-rose-500/20 border border-rose-400/50 text-rose-200"
                    : "bg-emerald-500/20 border border-emerald-400/50 text-emerald-200"
              }

              return (
                <button
                  key={cat.category_key}
                  type="button"
                  data-entry-category-option
                  onClick={() => {
                    setEntryCategory(cat.category_key)
                    if (entryCategoryNeedsAttention) {
                      setEntryCategoryNeedsAttention(false)
                      setBanner(null)
                    }
                  }}
                  className={`flex flex-col items-center justify-center rounded-lg py-2 px-1 min-h-[56px] text-center transition-colors ${categoryButtonTone}`}
                >
                  <span className="text-xs leading-tight">{cat.display_name_zh}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-white/15 bg-slate-950/60 p-2.5 mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">金額</span>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-wide text-right truncate">
              {entryCalcDisplay === "0" ? "$0" : `$${entryCalcDisplay}`}
            </p>
          </div>
          <Input
            value={entryNote}
            onChange={e => setEntryNote(e.target.value)}
            className="bg-slate-950/60 border-white/20 text-white text-sm min-h-[40px]"
            placeholder="輸入備註"
          />
          <div className="flex items-center gap-2">
            {entryCategory ? (
              <Badge variant="outline" className="border-white/20 text-slate-200 text-[10px]">
                {categoryLabel(entryCategory)}
              </Badge>
            ) : (
              <span className={`text-[11px] ${needsCategoryHint ? "text-amber-200" : "text-slate-400"}`}>
                {needsCategoryHint ? "請先到上方點選一個類型" : "請先在上方選擇一個類型"}
              </span>
            )}
          </div>
        </div>
      </>
    )
  }

  function renderNewEntry() {
    const isEditing = entryEditingId !== null
    const CALC_KEYS = [
      ["7", "8", "9", "÷", "AC"],
      ["4", "5", "6", "×", "⌫"],
      ["1", "2", "3", "+", "="],
      ["00", "0", ".", "-", ""],
    ]
    const calcAmount = calcEvaluate()

    return (
      <div className="flex flex-col min-h-[calc(100dvh-60px)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Button
            type="button"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
            onClick={() => {
              setStep("home")
              setEntryAdvancedMode("none")
              setEntryImportAdvancedOpen(false)
              setEntryEditingId(null)
            }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            返回
          </Button>
          <Badge variant="outline" className={`text-xs ${isEditing ? "border-amber-300/40 bg-amber-500/10 text-amber-200" : "border-indigo-300/40 bg-indigo-500/10 text-indigo-200"}`}>
            {isEditing ? "編輯交易" : "手動輸入"}
          </Badge>
          {isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-rose-300/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 min-h-[40px] text-xs px-3"
              onClick={deleteEntryEditing}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              刪除
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-indigo-400/60 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/30 hover:text-white hover:border-indigo-400/80 min-h-[36px] text-xs px-3 gap-1.5 transition-all"
              onClick={() => startSmartEntry()}
            >
              <Sparkles className="h-3.5 w-3.5" />
              切換智慧輸入
            </Button>
          )}
        </div>


        <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
          <div className="flex rounded-full border border-white/20 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setEntryDirection("expense")
                  setEntryCategory("")
                }}
                className={`px-5 py-1.5 text-sm font-medium transition-colors ${
                  entryDirection === "expense"
                    ? "bg-rose-500 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryDirection("income")
                  setEntryCategory("")
                }}
                className={`px-5 py-1.5 text-sm font-medium transition-colors ${
                  entryDirection === "income"
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                收入
              </button>
          </div>
          <div className="flex rounded-full border border-white/20 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setEntryDomain("life")
                setEntryCategory("")
              }}
              className={`px-5 py-1.5 text-sm font-medium transition-colors ${
                entryDomain === "life"
                  ? "bg-sky-500 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              生活
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryDomain("business")
                setEntryCategory("")
              }}
              className={`px-5 py-1.5 text-sm font-medium transition-colors ${
                entryDomain === "business"
                  ? "bg-violet-500 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              生意
            </button>
          </div>
        </div>

        {renderEntryCategorySection()}

            <div className="flex items-center justify-between gap-1.5 mb-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[38px] min-w-[38px] shrink-0 px-0"
                onClick={() => setEntryDate(prev => shiftDateByDays(prev, -1))}
                aria-label="前一天"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={openEntryDatePicker}
                  className="w-full flex items-center justify-center min-h-[38px] rounded-md border border-white/20 bg-slate-950/60 hover:bg-slate-950/40 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-medium text-white select-none">{formatEntryDateLabel(entryDate)}</span>
                </button>
                <input
                  ref={entryDateInputRef}
                  type="date"
                  value={entryDate}
                  onChange={e => {
                    if (e.target.value) setEntryDate(e.target.value)
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[38px] min-w-[38px] shrink-0 px-0"
                onClick={() => setEntryDate(prev => shiftDateByDays(prev, 1))}
                aria-label="後一天"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              {CALC_KEYS.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
                  {row.map((key, colIndex) => {
                    if (key === "" && rowIndex === 3 && colIndex === 4) {
                      return (
                        <button
                          key="save-btn"
                          type="button"
                          onClick={saveQuickEntry}
                          disabled={calcAmount <= 0}
                          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm min-h-[48px] transition-colors"
                        >
                          {isEditing ? "更新" : "儲存"}
                        </button>
                      )
                    }

                    const isOp = ["+", "-", "×", "÷"].includes(key)
                    const isEquals = key === "="
                    const isAction = key === "AC" || key === "⌫"

                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        type="button"
                        onClick={() => calcPress(key)}
                        className={`rounded-xl min-h-[48px] text-base font-medium transition-colors active:scale-95 ${
                          isEquals
                            ? "bg-amber-500 text-white hover:bg-amber-400"
                            : isOp
                              ? "bg-indigo-500/80 text-white hover:bg-indigo-400"
                              : isAction
                                ? "bg-slate-700 text-white hover:bg-slate-600"
                                : "bg-white/10 text-white hover:bg-white/15"
                        }`}
                      >
                        {key}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
        {entryAdvancedMode === "text" && (
          <div className="flex-1 space-y-3">
            <p className="text-xs text-slate-300">輸入多筆或使用語音，系統會自動判斷收入/支出與類別，完成後前往確認頁。</p>
            <Textarea
              value={singleText}
              onChange={e => setSingleText(e.target.value)}
              className="min-h-[120px] bg-slate-950/60 border-white/20 text-white text-sm placeholder:text-slate-400"
              placeholder="早餐 65、咖啡 80、捷運 30"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={isListening ? "default" : "outline"}
                className={`min-h-[44px] text-sm ${
                  isListening
                    ? "bg-rose-500 text-white hover:bg-rose-400"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
                disabled={!isSpeechSupported}
                onClick={toggleSpeechInput}
              >
                <Mic className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="truncate">{isListening ? "停止語音" : "語音輸入"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[44px] text-sm"
                onClick={() => setEntryAdvancedMode("none")}
              >
                返回計算機
              </Button>
            </div>
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
            <Button
              onClick={() => {
                handleParseInput("text_single")
              }}
              className="w-full bg-indigo-500 text-white hover:bg-indigo-400 min-h-[48px] text-base"
              disabled={!singleText.trim()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              解析並前往確認
            </Button>
          </div>
        )}

        {entryAdvancedMode === "file" && (
          <div className="flex-1 space-y-3">
            <p className="text-xs text-slate-300">測試模式：可上傳任意檔案，解析後會產生測試內容供確認。</p>
            <Input
              type="file"
              className="bg-slate-950/60 border-white/20 text-slate-200 file:text-slate-200 min-h-[44px]"
              onChange={event => handleFilePicked(event.target.files?.[0] ?? null)}
            />
            {uploadedFile && (
              <p className="text-xs text-slate-400">
                已上傳：{uploadedFile.name}（測試檔案）
              </p>
            )}
            {uploadKind === "image" && uploadedFile && (
              <>
                <Input
                  type="number"
                  min={0}
                  value={photoAmount}
                  onChange={e => setPhotoAmount(e.target.value)}
                  className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
                  placeholder="金額（必填）"
                />
                <Textarea
                  value={photoNote}
                  onChange={e => setPhotoNote(e.target.value)}
                  className="min-h-[80px] bg-slate-950/60 border-white/20 text-white placeholder:text-slate-400 text-sm"
                  placeholder="備註（店名、用途）"
                />
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[44px] text-sm"
                onClick={() => {
                  setEntryAdvancedMode("none")
                  setEntryImportAdvancedOpen(false)
                }}
              >
                返回計算機
              </Button>
              <Button
                onClick={() => {
                  handleParseInput("file_import")
                }}
                className="bg-indigo-500 text-white hover:bg-indigo-400 min-h-[44px] text-sm"
                disabled={isFileParsing || !uploadedFile}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                解析確認
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderQuickAdd() {
    const isFileMode = activeMode === "file_import"
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
            onClick={() => {
              recognitionRef.current?.stop()
              setIsListening(false)
              setSpeechPreview("")
              setSpeechError(null)
              setStep("home")
              setBanner(null)
            }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            回到主頁
          </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-indigo-400/60 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/30 hover:text-white hover:border-indigo-400/80 min-h-[36px] text-xs px-3 gap-1.5 shrink-0 transition-all"
              onClick={startManualEntry}
            >
              <NotebookPen className="h-3.5 w-3.5" />
              切換手動輸入
            </Button>
        </div>

        <Card className="border-white/20 bg-slate-900/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base sm:text-lg">
              {isFileMode ? "上傳帳單或檔案" : "輸入一筆收支"}
            </CardTitle>
            <CardDescription className="text-slate-300 text-xs sm:text-sm">
              {isFileMode
                ? "照片、Excel、PDF 等檔案都能先整理成草稿，再確認後匯入。"
                : "一句話、語音或貼上多筆都可以，系統會自動判斷收支、日期與類別。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isFileMode ? (
              <>
                <div className="rounded-xl border border-indigo-300/20 bg-indigo-500/5 p-3 space-y-2">
                  <p className="text-xs text-indigo-100">沒有寫日期就預設今天，也可以補記昨天、上週或收入。</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">午餐120</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">昨天咖啡80</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">薪水50000</span>
                  </div>
                </div>
                <Textarea
                  value={singleText}
                  onChange={event => setSingleText(event.target.value)}
                  className="min-h-[140px] sm:min-h-[180px] bg-slate-950/60 border-white/20 text-white placeholder:text-slate-400 text-sm sm:text-base"
                  placeholder="例如：午餐120、昨天咖啡80、薪水50000"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={isListening ? "default" : "outline"}
                    className={`min-h-[44px] text-sm ${
                      isListening
                        ? "bg-rose-500 text-white hover:bg-rose-400"
                        : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                    }`}
                    disabled={!isSpeechSupported}
                    onClick={toggleSpeechInput}
                  >
                    <Mic className="mr-1.5 h-4 w-4 shrink-0" />
                    <span className="truncate">{isListening ? "停止語音" : "語音輸入"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] gap-1.5 border-white/20 bg-white/5 text-white hover:bg-white/10 text-sm"
                    onClick={() => switchQuickAddMode("file_import")}
                  >
                    <FileUp className="h-4 w-4 shrink-0" />
                    <span className="truncate">上傳帳單/檔案</span>
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
                  <p className="text-xs text-amber-200">此瀏覽器暫不支援語音輸入，請改用文字或手動輸入。</p>
                )}
                <p className="text-xs text-slate-400">系統會自動判斷單筆或多筆，解析後再讓你確認。</p>
                <Button
                  onClick={() => handleParseInput("text_single")}
                  className="w-full bg-indigo-500 text-white hover:bg-indigo-400 min-h-[48px] text-base"
                  disabled={!singleText.trim()}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  解析收支
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm text-slate-200">上傳後會先整理成待確認草稿，再決定是否送出。</p>
                  <button
                    type="button"
                    onClick={() => switchQuickAddMode("text_single")}
                    className="text-xs text-indigo-300 hover:text-indigo-100 transition-colors"
                  >
                    改回文字輸入
                  </button>
                </div>
                <div className="space-y-2">
                  <Input
                    type="file"
                    multiple
                    className="bg-slate-950/60 border-white/20 text-slate-200 file:text-slate-200 min-h-[44px]"
                    onChange={event => handleFilesPicked(Array.from(event.target.files ?? []))}
                  />
                  {isFileParsing && <p className="text-xs text-indigo-200">檔案處理中...</p>}
                  {uploadedFiles.length > 0 && (
                    <div className="rounded-md border border-indigo-300/30 bg-indigo-500/10 p-3 text-xs text-indigo-100 space-y-1">
                      <p>已上傳 {uploadedFiles.length} 個檔案，系統已自動產生 AI 假資料供你確認。</p>
                      <p className="text-indigo-200/80 break-all">
                        {uploadedFiles.slice(0, 3).map(file => file.name).join("、")}
                        {uploadedFiles.length > 3 ? ` 等 ${uploadedFiles.length} 個檔案` : ""}
                      </p>
                    </div>
                  )}
                </div>

                {drafts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/15 bg-slate-950/40 p-1">
                        <button
                          type="button"
                          onClick={() => setFileImportTab("expense")}
                          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                            fileImportTab === "expense"
                              ? "bg-rose-500 text-white"
                              : "text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          支出（{drafts.filter(item => item.direction === "expense").length}）
                        </button>
                        <button
                          type="button"
                          onClick={() => setFileImportTab("income")}
                          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                            fileImportTab === "income"
                              ? "bg-emerald-500 text-slate-950"
                              : "text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          收入（{drafts.filter(item => item.direction === "income").length}）
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDrafts(buildMockFileDrafts(uploadedFiles))}
                        className="text-[11px] text-indigo-300 hover:text-indigo-100 transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        重新產生
                      </button>
                    </div>

                    <div className="space-y-3">
                      {drafts
                        .map((draft, index) => ({ draft, index }))
                        .filter(item => item.draft.direction === fileImportTab)
                        .map(({ draft, index }) => {
                          const categoryOptions = TAXONOMY.filter(category => category.direction === fileImportTab)
                          return (
                            <div key={draft.id} className="rounded-xl border border-white/15 bg-slate-900/60 p-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <Input
                                    value={draft.note}
                                    onChange={event => updateDraft(index, item => ({ ...item, note: event.target.value }))}
                                    className="bg-transparent border-0 border-b border-white/10 rounded-none px-0 py-1 text-sm text-white focus-visible:ring-0 focus-visible:border-indigo-400 h-auto"
                                    placeholder="備註"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDrafts(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                                  className="text-slate-500 hover:text-rose-400 transition-colors shrink-0 mt-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                  <p className="text-[9px] text-slate-500">金額 <span className="text-rose-400">*</span></p>
                                  <Input
                                    type="number"
                                    min={0}
                                    data-draft-amount={index}
                                    value={draft.amount}
                                    onChange={event =>
                                      updateDraft(index, item => ({
                                        ...item,
                                        amount: Math.max(0, Number(event.target.value) || 0),
                                      }))
                                    }
                                    className={`bg-slate-950/50 text-white text-xs h-8 px-2 ${
                                      draft.amount <= 0 ? "border-rose-400/60 ring-1 ring-rose-400/30" : "border-white/10"
                                    }`}
                                  />
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[9px] text-slate-500">日期 <span className="text-rose-400">*</span></p>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10"
                                      onClick={() => shiftDraftDate(index, -1)}
                                      aria-label="日期往前一天"
                                    >
                                      <ArrowLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <Input
                                      type="date"
                                      data-draft-date={index}
                                      value={draft.occurred_at}
                                      onChange={event => updateDraft(index, item => ({ ...item, occurred_at: event.target.value }))}
                                      className={`flex-1 bg-slate-950/50 text-white text-xs h-8 px-1.5 [color-scheme:dark] ${
                                        !draft.occurred_at ? "border-rose-400/60 ring-1 ring-rose-400/30" : "border-white/10"
                                      }`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10"
                                      onClick={() => shiftDraftDate(index, 1)}
                                      aria-label="日期往後一天"
                                    >
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <select
                                value={draft.category_key}
                                onChange={event => {
                                  const category = CATEGORY_BY_KEY.get(event.target.value)
                                  if (!category) return
                                  updateDraft(index, item => ({
                                    ...item,
                                    category_key: category.category_key,
                                    domain: category.domain,
                                    direction: category.direction,
                                    user_overridden: true,
                                  }))
                                }}
                                className="w-full rounded-md border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-white"
                              >
                                {categoryOptions.map(category => (
                                  <option key={category.category_key} value={category.category_key}>
                                    {categoryLabel(category.category_key)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        })}
                      {drafts.filter(item => item.direction === fileImportTab).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-6">目前沒有{fileImportTab === "expense" ? "支出" : "收入"}資料</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">總筆數 {drafts.length}</span>
                        <span className="text-slate-300 font-medium">
                          合計 {formatMoney(drafts.reduce((sum, item) => sum + item.amount, 0))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          支出 {formatMoney(drafts.filter(item => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0))}
                        </span>
                        <span>
                          收入 {formatMoney(drafts.filter(item => item.direction === "income").reduce((sum, item) => sum + item.amount, 0))}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={saveDrafts}
                      className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 min-h-[48px] text-base font-semibold"
                      disabled={drafts.length === 0}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      確認送出 {drafts.length} 筆
                    </Button>
                  </div>
                )}

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  function renderConfirm() {
    const selectedCount = drafts.length

    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
            onClick={() => {
              setStep("quick-add")
              setBanner(null)
            }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            返回輸入
          </Button>
          <Badge variant="outline" className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200 text-xs shrink-0">
            待儲存 {selectedCount} 筆
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

        <div className="space-y-3">
          {drafts.map((draft, index) => {
            return (
              <Card
                key={draft.id}
                className="bg-slate-900/70 border-white/15"
              >
                <CardContent className="pt-4 sm:pt-6 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Textarea
                        value={draft.note}
                        onChange={event =>
                          updateDraft(index, item => ({
                            ...item,
                            note: event.target.value,
                            user_overridden: event.target.value.trim() !== item.raw_line.trim(),
                          }))
                        }
                        className="min-h-[70px] sm:min-h-[80px] bg-slate-950/60 border-white/20 text-white text-sm"
                      />
                      <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 px-0.5">金額</p>
                          <Input
                            type="number"
                            min={0}
                            data-draft-amount={index}
                            value={draft.amount}
                            onChange={event =>
                              updateDraft(index, item => ({
                                ...item,
                                amount: Math.max(0, Number(event.target.value) || 0),
                                parse_error: undefined,
                                user_overridden: true,
                              }))
                            }
                            className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
                            placeholder="金額"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 px-0.5">日期 <span className="text-rose-400">*</span></p>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-11 w-11 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10"
                              onClick={() => shiftDraftDate(index, -1)}
                              aria-label="日期往前一天"
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <Input
                              type="date"
                              data-draft-date={index}
                              value={draft.occurred_at}
                              onChange={event => updateDraft(index, item => ({ ...item, occurred_at: event.target.value }))}
                              className={`w-full flex-1 bg-slate-950/60 text-white min-h-[44px] [color-scheme:dark] ${
                                !draft.occurred_at ? "border-rose-400/60 ring-1 ring-rose-400/30" : "border-white/20"
                              }`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-11 w-11 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10"
                              onClick={() => shiftDraftDate(index, 1)}
                              aria-label="日期往後一天"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 px-0.5">
                          類別 <span className="text-rose-400">*</span>
                          {draft.category_key.includes("other") && !draft.categoryTouched && (
                            <span className="ml-1.5 text-amber-400">← 請確認或選擇類別</span>
                          )}
                        </p>
                        <CategorySelect
                          value={draft.category_key}
                          onValueChange={key => {
                            const category = CATEGORY_BY_KEY.get(key)
                            if (!category) return
                            updateDraft(index, item => ({
                              ...item,
                              category_key: key,
                              domain: category.domain,
                              direction: category.direction,
                              user_overridden: item.ai_predicted_category_key !== key,
                              categoryTouched: true,
                            }))
                          }}
                          className={`w-full rounded-md border bg-slate-950/80 px-3 py-2.5 text-sm text-white min-h-[44px] focus:ring-indigo-400 ${
                            draft.category_key.includes("other") && !draft.categoryTouched
                              ? "border-amber-400/60 ring-1 ring-amber-400/30"
                              : "border-white/20"
                          }`}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-slate-300 hover:text-white hover:bg-white/10 shrink-0 h-9 w-9"
                      onClick={() => setDrafts(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Badge variant="outline" className="text-[10px] sm:text-[11px] border-white/20 text-slate-200">
                      {domainLabel(draft.domain)}／{directionLabel(draft.direction)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-[11px] border-white/20 text-slate-200">
                      {modeLabel(draft.input_mode)}
                    </Badge>
                  </div>

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
          className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 min-h-[48px] text-base"
          disabled={drafts.length === 0}
        >
          <Save className="mr-2 h-4 w-4" />
          儲存並回主頁
        </Button>
      </div>
    )
  }

  function renderStatsDetail() {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)

    let rangeStart = ""
    let rangeEnd = ""
    let barMode: "daily" | "monthly"

    if (statsTimeRange === "month") {
      const [y, m] = selectedMonth.split("-")
      rangeStart = `${y}-${m}-01`
      const lastDay = new Date(Number(y), Number(m), 0).getDate()
      rangeEnd = `${y}-${m}-${String(lastDay).padStart(2, "0")}`
      barMode = "daily"
    } else if (statsTimeRange === "6months") {
      const d = new Date(today.getFullYear(), today.getMonth() - 5, 1)
      rangeStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
      rangeEnd = todayStr
      barMode = "monthly"
    } else if (statsTimeRange === "year") {
      rangeStart = `${statsYear}-01-01`
      rangeEnd = `${statsYear}-12-31`
      barMode = "monthly"
    } else {
      rangeStart = statsCustomStart
      rangeEnd = statsCustomEnd
      barMode = "monthly"
    }

    const inRange = transactions.filter(tx => {
      if (rangeStart && tx.occurred_at < rangeStart) return false
      if (rangeEnd && tx.occurred_at > rangeEnd) return false
      return true
    })

    const dirFiltered = inRange.filter(tx => {
      if (statsDetailDirection === "expense") return tx.direction === "expense"
      if (statsDetailDirection === "income") return tx.direction === "income"
      return true
    })

    const totalExpense = inRange.filter(tx => tx.direction === "expense").reduce((s, tx) => s + tx.amount, 0)
    const totalIncome = inRange.filter(tx => tx.direction === "income").reduce((s, tx) => s + tx.amount, 0)

    let summaryAmount: number
    let summaryLabel: string
    let summaryColorClass: string

    if (statsDetailDirection === "expense") {
      summaryAmount = totalExpense
      summaryLabel = "總支出"
      summaryColorClass = "text-rose-300"
    } else if (statsDetailDirection === "income") {
      summaryAmount = totalIncome
      summaryLabel = "總收入"
      summaryColorClass = "text-emerald-300"
    } else {
      summaryAmount = totalIncome - totalExpense
      summaryLabel = "結餘"
      summaryColorClass = summaryAmount >= 0 ? "text-emerald-300" : "text-rose-300"
    }

    const txCount = statsDetailDirection === "net" ? inRange.length : dirFiltered.length
    const average = txCount > 0 && statsDetailDirection !== "net" ? summaryAmount / txCount : 0

    // Bar chart data
    let barData: { label: string; value: number }[] = []

    if (barMode === "daily" && statsTimeRange === "month") {
      const [y, m] = selectedMonth.split("-")
      const daysInMonth = new Date(Number(y), Number(m), 0).getDate()
      barData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = String(i + 1).padStart(2, "0")
        const dateStr = `${y}-${m}-${day}`
        const dayTxs = inRange.filter(tx => tx.occurred_at === dateStr)
        const exp = dayTxs.filter(tx => tx.direction === "expense").reduce((s, tx) => s + tx.amount, 0)
        const inc = dayTxs.filter(tx => tx.direction === "income").reduce((s, tx) => s + tx.amount, 0)
        const value = statsDetailDirection === "expense" ? exp
          : statsDetailDirection === "income" ? inc
          : inc - exp
        return { label: String(i + 1), value }
      })
    } else {
      const months: string[] = []
      if (statsTimeRange === "6months") {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
          months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
        }
      } else if (statsTimeRange === "year") {
        for (let i = 1; i <= 12; i++) {
          months.push(`${statsYear}-${String(i).padStart(2, "0")}`)
        }
      } else if (statsCustomStart && statsCustomEnd) {
        const startDate = new Date(statsCustomStart)
        const endDate = new Date(statsCustomEnd)
        let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
        while (cur <= endDate) {
          months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`)
          cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
        }
      }
      barData = months.map(mk => {
        const [, m] = mk.split("-")
        const monthTxs = transactions.filter(tx => tx.occurred_at.slice(0, 7) === mk)
        const exp = monthTxs.filter(tx => tx.direction === "expense").reduce((s, tx) => s + tx.amount, 0)
        const inc = monthTxs.filter(tx => tx.direction === "income").reduce((s, tx) => s + tx.amount, 0)
        const value = statsDetailDirection === "expense" ? exp
          : statsDetailDirection === "income" ? inc
          : inc - exp
        return { label: `${Number(m)}月`, value }
      })
    }

    const barFill = statsDetailDirection === "expense" ? "#d3876a"
      : statsDetailDirection === "income" ? "#9eb18b"
      : "#c9a06a"

    // Category breakdown (top 5)
    const catMap = new Map<string, number>()
    dirFiltered.forEach(tx => {
      catMap.set(tx.category_key, (catMap.get(tx.category_key) ?? 0) + tx.amount)
    })
    const topCats = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Grouped transaction list
    const sortedDir = [...dirFiltered].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    const gMap = new Map<string, Transaction[]>()
    for (const tx of sortedDir) {
      if (!gMap.has(tx.occurred_at)) gMap.set(tx.occurred_at, [])
      gMap.get(tx.occurred_at)!.push(tx)
    }
    const filteredGroups: { date: string; label: string; items: Transaction[]; dayTotal: number }[] = []
    for (const [date, txList] of gMap) {
      const exp = txList.filter(t => t.direction === "expense").reduce((s, t) => s + t.amount, 0)
      const inc = txList.filter(t => t.direction === "income").reduce((s, t) => s + t.amount, 0)
      const dayTotal = statsDetailDirection === "expense" ? -exp
        : statsDetailDirection === "income" ? inc
        : inc - exp
      filteredGroups.push({ date, label: formatDateGroup(date), items: txList, dayTotal })
    }

    const periodNavLabel = statsTimeRange === "month"
      ? formatMonthLabel(selectedMonth)
      : statsTimeRange === "year"
      ? `${statsYear} 年`
      : statsTimeRange === "6months"
      ? `${rangeStart} 至 ${rangeEnd}`
      : statsCustomStart && statsCustomEnd
      ? `${statsCustomStart} ～ ${statsCustomEnd}`
      : "請選擇日期區間"

    const dirTabs: { key: StatsDirection; label: string; activeClass: string }[] = [
      { key: "expense", label: "支出", activeClass: "bg-rose-500 text-white" },
      { key: "income", label: "收入", activeClass: "bg-emerald-500 text-slate-950" },
      { key: "net", label: "結餘", activeClass: "bg-amber-600 text-white" },
    ]

    const timeTabs: { key: StatsTimeRange; label: string }[] = [
      { key: "month", label: "月" },
      { key: "6months", label: "近6個月" },
      { key: "year", label: "年" },
      { key: "custom", label: "自訂" },
    ]

    const hasChartData = barData.some(d => d.value !== 0)

    return (
      <div className="space-y-4 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setStep("home")}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <h1 className="text-white font-semibold text-base">收支統計</h1>
        </div>

        {/* Direction tabs */}
        <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
          {dirTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatsDetailDirection(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                statsDetailDirection === tab.key
                  ? `${tab.activeClass} shadow-sm`
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Time range tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {timeTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatsTimeRange(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                statsTimeRange === tab.key
                  ? "bg-amber-400 text-slate-900 font-semibold"
                  : "bg-white/5 text-slate-300 border border-white/15 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period navigation */}
        {(statsTimeRange === "month" || statsTimeRange === "year") && (
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                if (statsTimeRange === "month") {
                  setSelectedMonth(prev => shiftMonthKey(prev, -1))
                } else {
                  setStatsYear(prev => prev - 1)
                }
              }}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-white" />
            </button>
            <p className="flex-1 text-center text-sm font-medium text-white">{periodNavLabel}</p>
            <button
              type="button"
              onClick={() => {
                if (statsTimeRange === "month") {
                  setSelectedMonth(prev => shiftMonthKey(prev, 1))
                } else {
                  setStatsYear(prev => prev + 1)
                }
              }}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
            >
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        )}

        {statsTimeRange === "6months" && (
          <p className="text-center text-xs text-slate-400">{periodNavLabel}</p>
        )}

        {/* Custom date range picker */}
        {statsTimeRange === "custom" && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-3">
            <p className="text-xs text-slate-400 font-medium">自訂日期區間</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 px-0.5">開始日期</p>
                <input
                  type="date"
                  value={statsCustomStart}
                  onChange={e => setStatsCustomStart(e.target.value)}
                  className="w-full min-w-0 bg-slate-950/60 border border-white/20 rounded-lg px-2 py-2 text-xs text-white [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 px-0.5">結束日期</p>
                <input
                  type="date"
                  value={statsCustomEnd}
                  onChange={e => setStatsCustomEnd(e.target.value)}
                  min={statsCustomStart}
                  className="w-full min-w-0 bg-slate-950/60 border border-white/20 rounded-lg px-2 py-2 text-xs text-white [color-scheme:dark]"
                />
              </div>
            </div>
            {statsCustomStart && statsCustomEnd && statsCustomStart <= statsCustomEnd && (
              <p className="text-[10px] text-slate-500 text-center">
                {statsCustomStart} ～ {statsCustomEnd}
              </p>
            )}
            {statsCustomStart && statsCustomEnd && statsCustomStart > statsCustomEnd && (
              <p className="text-[10px] text-rose-400 text-center">開始日期不能晚於結束日期</p>
            )}
          </div>
        )}

        {/* Summary card */}
        <Card className="border-white/15 bg-slate-900/70 overflow-hidden">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-1">{summaryLabel}</p>
                <p className={`text-3xl font-bold tracking-tight ${summaryColorClass}`}>
                  {statsDetailDirection === "net" && summaryAmount > 0 ? "+" : ""}
                  {formatMoney(summaryAmount)}
                </p>
                {statsDetailDirection !== "net" ? (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400">{txCount} 筆</span>
                    {txCount > 0 && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400">均 {formatMoney(average)}</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-rose-300/80">支出 {formatMoney(totalExpense)}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-emerald-300/80">收入 {formatMoney(totalIncome)}</span>
                  </div>
                )}
              </div>
              <div className={`text-5xl opacity-15 shrink-0 ${summaryColorClass}`}>
                {statsDetailDirection === "expense" ? "💸" : statsDetailDirection === "income" ? "💰" : "📊"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View mode toggle: chart / calendar */}
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setStatsViewMode("chart")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-medium border transition-colors ${
              statsViewMode === "chart"
                ? "bg-white/10 border-white/20 text-white"
                : "bg-transparent border-white/10 text-slate-500 hover:text-slate-300"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            圖表
          </button>
          <button
            type="button"
            onClick={() => {
              setStatsViewMode("calendar")
              setCalendarMonth(selectedMonth)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-r-lg text-xs font-medium border border-l-0 transition-colors ${
              statsViewMode === "calendar"
                ? "bg-white/10 border-white/20 text-white"
                : "bg-transparent border-white/10 text-slate-500 hover:text-slate-300"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            行事曆
          </button>
        </div>

        {/* Bar chart (chart mode) */}
        {statsViewMode === "chart" && barData.length > 0 && (
          <Card className="border-white/15 bg-slate-900/70">
            <CardContent className="pt-4 pb-3 px-3">
              {!hasChartData ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500">此期間無資料</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={barData}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    barCategoryGap={barMode === "daily" ? "8%" : "24%"}
                  >
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#b79276", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval={barMode === "daily" ? 4 : 0}
                    />
                    <YAxis
                      tick={{ fill: "#b79276", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => {
                        const abs = Math.abs(v)
                        if (abs >= 10000) return `${(v / 10000).toFixed(0)}萬`
                        if (abs >= 1000) return `${(v / 1000).toFixed(0)}k`
                        return String(v)
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#3f291f",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        padding: "8px 12px",
                      }}
                      labelStyle={{ color: "#f0d8c2", fontSize: "11px", marginBottom: "2px" }}
                      formatter={(value: number) => [formatMoney(value), summaryLabel]}
                      itemStyle={{ color: barFill, fontSize: "12px", fontWeight: 600 }}
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    />
                    {statsDetailDirection === "net" && (
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />
                    )}
                    <Bar dataKey="value" fill={barFill} radius={[3, 3, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Calendar view (calendar mode) */}
        {statsViewMode === "calendar" && (() => {
          const [calY, calM] = calendarMonth.split("-").map(Number)
          const daysInCalMonth = new Date(calY, calM, 0).getDate()
          const firstDayOfWeek = new Date(calY, calM - 1, 1).getDay()
          const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
          const calTodayStr = new Date().toISOString().slice(0, 10)

          const dayAmounts: Map<number, { expense: number; income: number }> = new Map()
          for (let d = 1; d <= daysInCalMonth; d++) {
            const dateStr = `${calY}-${String(calM).padStart(2, "0")}-${String(d).padStart(2, "0")}`
            const dayTxs = transactions.filter(tx => tx.occurred_at === dateStr)
            const expense = dayTxs.filter(tx => tx.direction === "expense").reduce((s, tx) => s + tx.amount, 0)
            const income = dayTxs.filter(tx => tx.direction === "income").reduce((s, tx) => s + tx.amount, 0)
            if (expense > 0 || income > 0) dayAmounts.set(d, { expense, income })
          }

          const calMonthExpense = [...dayAmounts.values()].reduce((s, v) => s + v.expense, 0)
          const calMonthIncome = [...dayAmounts.values()].reduce((s, v) => s + v.income, 0)
          const calMonthNet = calMonthIncome - calMonthExpense
          const weekdayHeaders = ["一", "二", "三", "四", "五", "六", "日"]

          return (
            <Card className="border-white/15 bg-slate-900/70">
              <CardContent className="pt-4 pb-4 px-3 space-y-3">
                {/* Calendar month nav */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => shiftMonthKey(prev, -1))}
                    className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
                  >
                    <ArrowLeft className="h-3 w-3 text-white" />
                  </button>
                  <p className="flex-1 text-center text-sm font-semibold text-white">{calY} 年 {calM} 月</p>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => shiftMonthKey(prev, 1))}
                    className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
                  >
                    <ArrowRight className="h-3 w-3 text-white" />
                  </button>
                </div>

                {/* Weekday header */}
                <div className="grid grid-cols-7 gap-px">
                  {weekdayHeaders.map(wd => (
                    <div key={wd} className="text-center text-[10px] text-slate-500 font-medium py-1">{wd}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-px">
                  {Array.from({ length: startOffset }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-14 sm:h-16" />
                  ))}
                  {Array.from({ length: daysInCalMonth }, (_, i) => {
                    const day = i + 1
                    const dateStr = `${calY}-${String(calM).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    const isToday = dateStr === calTodayStr
                    const amounts = dayAmounts.get(day)
                    const dayVal = amounts
                      ? statsDetailDirection === "expense" ? amounts.expense
                        : statsDetailDirection === "income" ? amounts.income
                        : amounts.income - amounts.expense
                      : 0

                    return (
                      <div
                        key={day}
                        className={`h-14 sm:h-16 rounded-lg flex flex-col items-center pt-1 transition-colors ${
                          isToday ? "bg-amber-400/15 border border-amber-400/40" : "hover:bg-white/5"
                        }`}
                      >
                        <span className={`text-[11px] leading-none font-medium ${
                          isToday ? "text-amber-300" : "text-slate-300"
                        }`}>
                          {day}
                        </span>
                        {amounts && (
                          <div className="flex flex-col items-center gap-0.5 mt-auto mb-1">
                            {dayVal !== 0 && (
                              <span className={`text-[8px] sm:text-[9px] leading-none font-medium truncate max-w-full px-0.5 ${
                                statsDetailDirection === "expense" ? "text-rose-400"
                                  : statsDetailDirection === "income" ? "text-emerald-400"
                                  : dayVal >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                {Math.abs(dayVal) >= 10000
                                  ? `${(dayVal / 10000).toFixed(1)}萬`
                                  : Math.abs(dayVal) >= 1000
                                  ? `${(dayVal / 1000).toFixed(0)}k`
                                  : formatMoney(dayVal)}
                              </span>
                            )}
                            <div className="flex gap-0.5">
                              {amounts.expense > 0 && <span className="w-1 h-1 rounded-full bg-rose-400" />}
                              {amounts.income > 0 && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Monthly total bar */}
                <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-2.5 mt-1">
                  <span className="text-rose-300">支出：{formatMoney(calMonthExpense)}</span>
                  <span className="text-emerald-300">收入：{formatMoney(calMonthIncome)}</span>
                  <span className={calMonthNet >= 0 ? "text-emerald-200" : "text-rose-200"}>
                    結餘：{calMonthNet > 0 ? "+" : ""}{formatMoney(calMonthNet)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Category breakdown */}
        {statsDetailDirection !== "net" && topCats.length > 0 && (
          <Card className="border-white/15 bg-slate-900/70">
            <CardContent className="pt-4 pb-4 space-y-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">類別分布</p>
              {topCats.map(([key, total]) => {
                const pct = summaryAmount > 0 ? (total / summaryAmount) * 100 : 0
                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <p className="text-xs text-slate-200 w-20 shrink-0 truncate">{categoryLabel(key)}</p>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          statsDetailDirection === "expense" ? "bg-rose-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-300 w-20 text-right shrink-0 font-medium">{formatMoney(total)}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Transaction list */}
        {filteredGroups.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/50 py-12 text-center">
            <p className="text-slate-500 text-sm">此期間沒有紀錄</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map(group => (
              <div key={group.date}>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <p className="text-xs font-medium text-slate-300">{group.label}</p>
                  {group.dayTotal !== 0 && (
                    <p className={`text-xs font-medium ${group.dayTotal >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {group.dayTotal > 0 ? "+" : ""}
                      {formatMoney(group.dayTotal)}
                    </p>
                  )}
                </div>
                <Card className="border-white/10 bg-slate-900/70">
                  <CardContent className="p-0 divide-y divide-white/5">
                    {group.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <span className="text-xs">{item.direction === "expense" ? "💸" : "💰"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.note}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{categoryLabel(item.category_key)}</p>
                        </div>
                        <p className={`text-sm font-semibold shrink-0 ${item.direction === "expense" ? "text-rose-300" : "text-emerald-300"}`}>
                          {item.direction === "expense" ? "-" : "+"}
                          {formatMoney(item.amount)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderRecurringManager() {
    const today = new Date().toISOString().slice(0, 10)
    const sortedRecurringEntries = [...recurringEntries].sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
      return b.updated_at.localeCompare(a.updated_at)
    })

    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
            onClick={() => {
              setStep("home")
              resetRecurringForm(recurringForm.direction)
            }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            回到主頁
          </Button>
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-200 bg-indigo-500/10 text-xs shrink-0">
            可執行 {recurringSummary.active_with_remaining}/{recurringSummary.total}
          </Badge>
        </div>

        <Card className="border-white/20 bg-slate-900/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base sm:text-lg">固定收支管理</CardTitle>
            <CardDescription className="text-slate-300 text-xs sm:text-sm">
              支援每週、每月、每年排程，可逐筆即時開關，並設定到期是否自動記帳。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center">
              <p className="text-[10px] text-slate-400">可執行</p>
              <p className="text-sm font-semibold text-white">{recurringSummary.active_with_remaining}</p>
            </div>
            <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-2 py-2 text-center">
              <p className="text-[10px] text-emerald-200/80">自動記帳</p>
              <p className="text-sm font-semibold text-emerald-100">{recurringSummary.auto}</p>
            </div>
            <div className="rounded-lg border border-amber-300/25 bg-amber-500/10 px-2 py-2 text-center">
              <p className="text-[10px] text-amber-200/80">今日到期</p>
              <p className="text-sm font-semibold text-amber-100">{recurringSummary.dueToday}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-slate-900/70">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-white text-base sm:text-lg">
                {recurringEditingId ? "編輯固定收支" : "新增固定收支"}
              </CardTitle>
              {recurringEditingId && (
                <Badge variant="outline" className="border-amber-300/40 bg-amber-500/10 text-amber-100 text-[10px]">
                  編輯中
                </Badge>
              )}
            </div>
            <CardDescription className="text-slate-300 text-xs sm:text-sm">
              建議先填「名稱、金額、頻率」，其餘可後續再調整。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={recurringForm.title}
              onChange={event => setRecurringForm(previous => ({ ...previous, title: event.target.value }))}
              className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
              placeholder="名稱（例如：店租、薪資、保險）"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className={`min-h-[40px] text-xs ${
                  recurringForm.direction === "expense"
                    ? "border-rose-300/60 bg-rose-500/20 text-rose-100"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
                onClick={() =>
                  setRecurringForm(previous => ({
                    ...previous,
                    direction: "expense",
                    category_key: "life_expense_other",
                  }))
                }
              >
                固定支出
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`min-h-[40px] text-xs ${
                  recurringForm.direction === "income"
                    ? "border-emerald-300/60 bg-emerald-500/20 text-emerald-100"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
                onClick={() =>
                  setRecurringForm(previous => ({
                    ...previous,
                    direction: "income",
                    category_key: "life_income_other",
                  }))
                }
              >
                固定收入
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="number"
                min={1}
                value={recurringForm.amount}
                onChange={event => setRecurringForm(previous => ({ ...previous, amount: event.target.value }))}
                className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
                placeholder="固定金額"
              />
              <select
                value={recurringForm.category_key}
                onChange={event => setRecurringForm(previous => ({ ...previous, category_key: event.target.value }))}
                className="w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2.5 text-sm text-white min-h-[44px]"
              >
                {recurringCategories.map(category => (
                  <option key={category.category_key} value={category.category_key}>
                    {categoryLabel(category.category_key)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              value={recurringForm.note}
              onChange={event => setRecurringForm(previous => ({ ...previous, note: event.target.value }))}
              className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
              placeholder="備註（可選，若留空將使用名稱）"
            />

            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 px-0.5">重複頻率</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={`min-h-[38px] text-xs ${
                    recurringForm.frequency === "weekly"
                      ? "border-indigo-300/60 bg-indigo-500/20 text-indigo-100"
                      : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setRecurringForm(previous => ({ ...previous, frequency: "weekly" }))}
                >
                  每週
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`min-h-[38px] text-xs ${
                    recurringForm.frequency === "monthly"
                      ? "border-indigo-300/60 bg-indigo-500/20 text-indigo-100"
                      : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setRecurringForm(previous => ({ ...previous, frequency: "monthly" }))}
                >
                  每月
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`min-h-[38px] text-xs ${
                    recurringForm.frequency === "yearly"
                      ? "border-indigo-300/60 bg-indigo-500/20 text-indigo-100"
                      : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setRecurringForm(previous => ({ ...previous, frequency: "yearly" }))}
                >
                  每年
                </Button>
              </div>

              {recurringForm.frequency === "weekly" && (
                <div className="grid grid-cols-7 gap-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
                  {RECURRING_WEEKDAY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRecurringForm(previous => ({ ...previous, weekly_day: option.value }))}
                      className={`min-h-[34px] rounded-md text-xs font-medium transition-colors ${
                        recurringForm.weekly_day === option.value
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-950/70 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {recurringForm.frequency === "monthly" && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 space-y-1.5">
                  <p className="text-[10px] text-slate-400">每月幾號（1-31，超過當月天數會自動取月底）</p>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={recurringForm.monthly_day}
                    onChange={event =>
                      setRecurringForm(previous => ({
                        ...previous,
                        monthly_day: clampInteger(Number(event.target.value), 1, 31),
                      }))
                    }
                    className="bg-slate-950/60 border-white/20 text-white min-h-[40px]"
                  />
                </div>
              )}

              {recurringForm.frequency === "yearly" && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 space-y-1.5">
                  <p className="text-[10px] text-slate-400">每年什麼時候（例如 12/25）</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={recurringForm.yearly_month}
                      onChange={event =>
                        setRecurringForm(previous => ({
                          ...previous,
                          yearly_month: clampInteger(Number(event.target.value), 1, 12),
                        }))
                      }
                      className="w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-2 text-sm text-white min-h-[40px]"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                        <option key={month} value={month}>
                          {month} 月
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={recurringForm.yearly_day}
                      onChange={event =>
                        setRecurringForm(previous => ({
                          ...previous,
                          yearly_day: clampInteger(Number(event.target.value), 1, 31),
                        }))
                      }
                      className="bg-slate-950/60 border-white/20 text-white min-h-[40px]"
                      placeholder="幾號"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 space-y-2">
              <p className="text-[11px] text-slate-400">執行次數</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={`min-h-[38px] text-xs ${
                    recurringForm.occurrence_mode === "unlimited"
                      ? "border-indigo-300/60 bg-indigo-500/20 text-indigo-100"
                      : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setRecurringForm(previous => ({ ...previous, occurrence_mode: "unlimited" }))}
                >
                  無限次（預設）
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`min-h-[38px] text-xs ${
                    recurringForm.occurrence_mode === "limited"
                      ? "border-indigo-300/60 bg-indigo-500/20 text-indigo-100"
                      : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setRecurringForm(previous => ({ ...previous, occurrence_mode: "limited" }))}
                >
                  指定次數
                </Button>
              </div>
              {recurringForm.occurrence_mode === "limited" && (
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500">最多可設定 {MAX_RECURRING_OCCURRENCES} 次</p>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_RECURRING_OCCURRENCES}
                    value={recurringForm.occurrence_limit}
                    onChange={event =>
                      setRecurringForm(previous => ({
                        ...previous,
                        occurrence_limit: clampInteger(Number(event.target.value), 1, MAX_RECURRING_OCCURRENCES),
                      }))
                    }
                    className="bg-slate-950/60 border-white/20 text-white min-h-[40px]"
                    placeholder={`1 - ${MAX_RECURRING_OCCURRENCES}`}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 px-0.5">開始生效日</p>
                <Input
                  type="date"
                  value={recurringForm.start_date}
                  onChange={event => setRecurringForm(previous => ({ ...previous, start_date: event.target.value }))}
                  className="bg-slate-950/60 border-white/20 text-white min-h-[44px] [color-scheme:dark]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecurringForm(previous => ({ ...previous, enabled: !previous.enabled }))}
                  className={`rounded-md border min-h-[44px] text-xs font-medium transition-colors ${
                    recurringForm.enabled
                      ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-100"
                      : "border-white/20 bg-white/5 text-slate-300"
                  }`}
                >
                  {recurringForm.enabled ? "已啟用" : "已停用"}
                </button>
                <button
                  type="button"
                  onClick={() => setRecurringForm(previous => ({ ...previous, auto_record: !previous.auto_record }))}
                  className={`rounded-md border min-h-[44px] text-xs font-medium transition-colors ${
                    recurringForm.auto_record
                      ? "border-indigo-300/35 bg-indigo-500/15 text-indigo-100"
                      : "border-white/20 bg-white/5 text-slate-300"
                  }`}
                >
                  自動記帳：{recurringForm.auto_record ? "開" : "關"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="bg-indigo-500 text-white hover:bg-indigo-400 min-h-[42px] text-sm"
                onClick={saveRecurringSetting}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {recurringEditingId ? "更新設定" : "儲存設定"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[42px] text-sm"
                onClick={() => resetRecurringForm(recurringForm.direction)}
              >
                {recurringEditingId ? "取消編輯" : "清空"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {sortedRecurringEntries.length === 0 ? (
            <Card className="border-white/15 bg-slate-900/70">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-300">尚未建立固定收支設定，先新增一筆吧。</p>
              </CardContent>
            </Card>
          ) : (
            sortedRecurringEntries.map(rule => {
              const recordedCount = recurringRecordedCountById.get(rule.id) ?? 0
              const remainingCount = remainingRecurringOccurrences(rule, recordedCount)
              const hasRemaining = remainingCount !== 0
              const loggedToday = recurringRecordLogs.some(
                item => item.recurring_id === rule.id && item.occurred_at === today
              )
              const nextDueDate = hasRemaining ? findNextRecurringDueDate(rule, today) : null
              const latestLog = latestRecurringLogById.get(rule.id)
              const isEditing = recurringEditingId === rule.id
              return (
                <Card key={rule.id} className="border-white/15 bg-slate-900/70">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-white break-words">{rule.title}</p>
                        <p className="text-[10px] text-slate-400 mt-1 break-words">{categoryLabel(rule.category_key)}</p>
                      </div>
                      <p className={`text-sm font-semibold shrink-0 ${rule.direction === "expense" ? "text-rose-300" : "text-emerald-300"}`}>
                        {rule.direction === "expense" ? "-" : "+"}
                        {formatMoney(rule.amount)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="border-white/20 text-slate-200 text-[10px]">
                        {recurringRuleLabel(rule)}
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-slate-300 text-[10px]">
                        生效：{rule.start_date}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          rule.enabled
                            ? "border-emerald-300/35 text-emerald-100 bg-emerald-500/10"
                            : "border-white/20 text-slate-300"
                        }`}
                      >
                        {rule.enabled ? "啟用中" : "停用中"}
                      </Badge>
                      {!hasRemaining && (
                        <Badge variant="outline" className="border-amber-300/35 text-amber-100 bg-amber-500/10 text-[10px]">
                          已達次數上限
                        </Badge>
                      )}
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-slate-300 space-y-1">
                      <p>下次排程：{hasRemaining ? (nextDueDate ?? "無法判定") : "已完成"}</p>
                      <p>
                        最近記錄：{latestLog ? `${latestLog.occurred_at}（${latestLog.source === "auto" ? "自動" : "手動"}）` : "尚無記錄"}
                      </p>
                      <p>
                        執行次數：
                        {rule.occurrence_limit === null
                          ? `無限次（已執行 ${recordedCount} 次）`
                          : `${rule.occurrence_limit} 次（已執行 ${recordedCount} 次，剩餘 ${remainingCount} 次）`}
                      </p>
                      <p>到期自動記帳：{rule.auto_record ? "開啟" : "關閉"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={`min-h-[38px] text-xs ${
                          rule.enabled
                            ? "border-rose-300/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                            : "border-emerald-300/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                        }`}
                        onClick={() => toggleRecurringRuleEnabled(rule.id)}
                      >
                        {rule.enabled ? "立即停用" : "立即啟用"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={`min-h-[38px] text-xs ${
                          rule.auto_record
                            ? "border-indigo-300/35 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20"
                            : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                        }`}
                        onClick={() => toggleRecurringRuleAutoRecord(rule.id)}
                      >
                        自動記帳：{rule.auto_record ? "開" : "關"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={`min-h-[38px] text-xs ${
                          isEditing
                            ? "border-amber-300/35 bg-amber-500/10 text-amber-100"
                            : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                        }`}
                        onClick={() => startEditRecurring(rule)}
                      >
                        {isEditing ? "編輯中" : "編輯"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={`min-h-[38px] text-xs ${
                          !hasRemaining || loggedToday
                            ? "border-white/15 bg-white/5 text-slate-500 cursor-not-allowed"
                            : "border-indigo-300/30 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20"
                        }`}
                        disabled={!hasRemaining || loggedToday}
                        onClick={() => recordRecurringNow(rule)}
                      >
                        {!hasRemaining ? "已達上限" : loggedToday ? "今天已記錄" : "立即記一筆"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[38px] text-xs border-rose-300/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                        onClick={() => removeRecurringRule(rule.id)}
                      >
                        刪除
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="family-warm-theme min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,#fff9f5_0%,#fdf4ef_38%,#f8eee8_100%)] text-[#6d5864]">
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-sm bg-white/5 sticky top-0 z-30 safe-top">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-200/35 bg-amber-300/10 text-amber-100">
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

      <main className="mx-auto w-full max-w-2xl px-3 sm:px-4 py-4 pb-32">
        {banner && (
          <div className="mb-4 rounded-md border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            {banner}
          </div>
        )}

        {step === "home" && renderHome()}
        {step === "stats-detail" && renderStatsDetail()}
        {step === "new-entry" && renderNewEntry()}
        {step === "overview" && renderOverview()}
        {step === "analysis" && renderAnalysis()}
        {step === "recurring" && renderRecurringManager()}
        {step === "quick-add" && renderQuickAdd()}
        {step === "confirm" && renderConfirm()}
      </main>

      {step === "home" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-6 safe-bottom">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-[linear-gradient(135deg,#f2b08c_0%,#ea8da0_100%)] text-[#fffaf8] shadow-lg shadow-[#ecc8ba]/70 hover:opacity-95 active:scale-95 transition-transform"
            onClick={() => startSmartEntry()}
            aria-label="輸入一筆收支"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      <Sheet open={calendarDaySheetOpen} onOpenChange={setCalendarDaySheetOpen}>
        <SheetContent
          side="bottom"
          className="family-warm-theme overflow-x-hidden overflow-y-auto border-[#efd9cf] bg-[linear-gradient(180deg,#fffaf7_0%,#fdf2ec_100%)] text-[#6d5864] max-h-[75dvh] rounded-t-[28px] shadow-[0_-18px_48px_rgba(236,201,184,0.32)] safe-bottom"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4cec0] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-[#f8dfd4]/45" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[#f6d8ca]/45" />
          <SheetHeader className="relative">
            <SheetTitle className="text-white text-base sm:text-lg">
              {calendarSelectedDate
                ? new Date(`${calendarSelectedDate}T00:00:00`).toLocaleDateString("zh-TW", {
                    month: "numeric",
                    day: "numeric",
                    weekday: "long",
                  })
                : "當日記帳"}
            </SheetTitle>
            <SheetDescription className="text-slate-300 text-xs sm:text-sm">
              快速查看這一天的收入、支出與每筆記錄。
            </SheetDescription>
          </SheetHeader>

          <div className="relative mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5">
                <p className="text-[10px] text-rose-200/70">支出</p>
                <p className="mt-1 text-sm font-semibold text-rose-300">{formatMoney(calendarDayExpense)}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5">
                <p className="text-[10px] text-emerald-200/70">收入</p>
                <p className="mt-1 text-sm font-semibold text-emerald-300">{formatMoney(calendarDayIncome)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">結餘</p>
                <p className={`mt-1 text-sm font-semibold ${calendarDayNet >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {calendarDayNet > 0 ? "+" : ""}
                  {formatMoney(calendarDayNet)}
                </p>
              </div>
            </div>

            {selectedCalendarTransactions.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
                <p className="text-sm text-slate-300">這一天還沒有記帳資料。</p>
                <p className="mt-1 text-xs text-slate-500">可以直接切回主頁按下方「＋」新增。</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedCalendarTransactions.map(item => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white break-words">{item.note}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] sm:text-[11px] border-white/20 text-slate-200">
                            {categoryLabel(item.category_key)}
                          </Badge>
                          <span className="text-[10px] sm:text-[11px] text-slate-400">{modeLabel(item.input_mode)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-semibold ${item.direction === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                          {item.direction === "income" ? "+" : "-"}
                          {formatMoney(item.amount)}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">{directionLabel(item.direction)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={modeSheetOpen} onOpenChange={setModeSheetOpen}>
        <SheetContent side="bottom" className="bg-slate-950 text-white border-white/10 max-h-[75dvh] overflow-y-auto rounded-t-2xl safe-bottom">
          <SheetHeader>
            <SheetTitle className="text-white text-base sm:text-lg">選擇輸入方式</SheetTitle>
            <SheetDescription className="text-slate-300 text-xs sm:text-sm">
              所有輸入都會轉成同一種記帳資料，先分類再一鍵修正。
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 sm:mt-4 space-y-2">
            {MODE_OPTIONS.map(option => {
              const Icon = option.icon
              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => openMode(option.mode)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-3.5 text-left hover:bg-white/10 active:bg-white/15 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-indigo-500/20 p-2 shrink-0">
                      <Icon className="h-5 w-5 text-indigo-200" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{option.title}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{option.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
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
