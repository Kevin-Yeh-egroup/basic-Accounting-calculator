import { DEMO_USER_ID } from "./db"
import type { Domain, Direction, FileMapping, PaymentMethod, Transaction } from "./types"

export const CURRENCY = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 })

export const DEFAULT_MAPPING: FileMapping = {
  date_column: "none",
  amount_column: "none",
  description_column: "col_1",
  direction_mode: "sign",
  direction_column: "none",
}

export const FALLBACK_BY_DOMAIN_DIRECTION: Record<
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

export const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "現金" },
  { value: "credit_card", label: "信用卡" },
  { value: "debit_card", label: "簽帳金融卡" },
  { value: "bank_transfer", label: "轉帳 / 匯款" },
  { value: "line_pay", label: "LINE Pay" },
  { value: "other_e_wallet", label: "其他電子支付" },
  { value: "other", label: "其他" },
  { value: "unspecified", label: "未指定" },
]

export const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"]

export const MAX_RECURRING_OCCURRENCES = 36

export const AI_FEEDBACK_DRINK_KEYWORDS = [
  "飲料", "咖啡", "奶茶", "手搖", "珍奶", "拿鐵", "美式",
  "紅茶", "綠茶", "烏龍", "豆漿", "果汁", "latte", "coffee", "tea", "drink",
]

export const AI_FEEDBACK_LAST_PICK_KEY = "mvp_ai_feedback_last_pick"

export const RECURRING_WEEKDAY_OPTIONS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 0, label: "日" },
]

export const DEMO_TRANSACTIONS: Transaction[] = [
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
    payment_method: "line_pay",
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
    payment_method: "bank_transfer",
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
    payment_method: "cash",
    ai_predicted_category_key: "life_expense_food",
    ai_confidence: 0.8,
    user_overridden: false,
  },
]
