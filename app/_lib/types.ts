export type Domain = "business" | "life" | "unknown"
export type Direction = "income" | "expense" | "unknown"
export type InputMode = "text_single" | "voice_single" | "photo_single" | "bulk_text" | "file_import"
export type UploadKind = "none" | "image" | "document"
export type OverviewDirectionFilter = "all" | "income" | "expense"
export type ImportJobStatus = "uploaded" | "parsed" | "mapped" | "ready_to_import" | "imported" | "failed"
export type PaymentMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "bank_transfer"
  | "line_pay"
  | "other_e_wallet"
  | "other"
  | "unspecified"
export type PageStep =
  | "home"
  | "quick-add"
  | "confirm"
  | "overview"
  | "analysis"
  | "new-entry"
  | "stats-detail"
  | "recurring"
export type StatsDirection = "expense" | "income" | "net"
export type StatsTimeRange = "month" | "6months" | "year" | "custom"
export type RecurringFrequency = "weekly" | "monthly" | "yearly"

export const STEP_ROUTE_MAP: Record<PageStep, string> = {
  home: "/",
  "quick-add": "/quick-add",
  confirm: "/confirm",
  overview: "/overview",
  analysis: "/analysis",
  "new-entry": "/new-entry",
  "stats-detail": "/stats-detail",
  recurring: "/recurring",
}

export interface TaxonomyCategory {
  category_key: string
  display_name_zh: string
  domain: Exclude<Domain, "unknown">
  direction: Exclude<Direction, "unknown">
  aliases: string[]
  examples: string[]
  rules: string[]
}

export interface AIClassification {
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

export interface Transaction {
  id: string
  user_id: string
  occurred_at: string
  amount: number
  direction: Direction
  domain: Domain
  category_key: string
  note: string
  input_mode: InputMode
  payment_method?: PaymentMethod
  source_file_id?: string
  ai_predicted_category_key: string
  ai_confidence: number
  user_overridden: boolean
}

export interface DraftTransaction extends Transaction {
  raw_line: string
  selected: boolean
  parse_error?: string
  reasoning_tags?: string[]
  categoryTouched?: boolean
}

export interface ImportJob {
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

export interface FileMapping {
  date_column: string
  amount_column: string
  description_column: string
  direction_mode: "direction_column" | "sign"
  direction_column: string
}

export interface TransactionEditDraft {
  occurred_at: string
  amount: string
  category_key: string
  note: string
  payment_method: PaymentMethod
}

export interface AiFinanceFeedbackCard {
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

export interface RecurringEntry {
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

export interface RecurringRecordLog {
  id: string
  recurring_id: string
  occurred_at: string
  transaction_id: string
  created_at: string
  source: "auto" | "manual"
}

export interface RecurringFormState {
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

export interface LegacyIncome {
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

export interface LegacyExpense {
  date: string
  category: string
  expenseCategory: string
  type: string
  description: string
  unitPrice: number
  quantity: number
  subtotal: number
}

export type SpeechRecognitionLike = {
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

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}
