"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import CashFlowAnalysis from "./components/cash-flow-analysis"
import FinancialReport from "./components/financial-report"
import { HomeView } from "@/app/_components/HomeView"
import { StatsDetailView } from "@/app/_components/StatsDetailView"
import { OverviewView } from "@/app/_components/OverviewView"
import { ConfirmView } from "@/app/_components/ConfirmView"
import { QuickAddView } from "@/app/_components/QuickAddView"
import { NewEntryView } from "@/app/_components/NewEntryView"
import { RecurringManagerView } from "@/app/_components/RecurringManagerView"
import {
  DEMO_USER_ID,
  LEGACY_STORAGE_TX_KEY,
  LEGACY_STORAGE_TEMPLATE_KEY,
  INDEXED_DB_TX_KEY,
  INDEXED_DB_TEMPLATE_KEY,
  INDEXED_DB_RECURRING_KEY,
  INDEXED_DB_RECURRING_LOG_KEY,
  readIndexedDbValue,
  writeIndexedDbValue,
} from "@/app/_lib/db"
import { MODE_OPTIONS, CATEGORY_BY_KEY, TAXONOMY, LIFE_EXPENSE_ORDER } from "@/app/_lib/taxonomy"
import {
  DEFAULT_MAPPING,
  DEMO_TRANSACTIONS,
  RECURRING_WEEKDAY_OPTIONS,
  AI_FEEDBACK_LAST_PICK_KEY,
  MAX_RECURRING_OCCURRENCES,
} from "@/app/_lib/constants"
import {
  uid, formatMoney, cashFlowToneClass, formatCompactCashFlow,
  formatMonthLabel, parseYmdDate, shiftDateByDays,
  formatEntryDateLabel, formatDateGroup, shiftMonthKey,
  getFileExt, parseNumber, normalizeBulkLines,
  shouldParseAsBulkText,
  pickRandomFeedbackId,
  normalizeOccurrenceLimit, hasRemainingRecurringOccurrences,
  remainingRecurringOccurrences, collectRecurringDueDates,
  findNextRecurringDueDate, recurringRuleLabel, isRecurringDueOnDate,
  buildDraftTransaction,
  domainLabel, directionLabel, clampInteger,
  normalizePaymentMethod, paymentMethodFieldLabel, paymentMethodLabel,
  importStatusLabel, speechErrorLabel, modeLabel, categoryLabel,
  resolveFallbackCategory,
  createWeeklyExpenseFeedback, createWeeklyDrinkFeedback,
  createMonthlyTopCategoryFeedback, createMonthlyPeakDayFeedback,
  createMonthlyNetFeedback, createStarterFeedback,
  toLegacyAnalysisData, toTransaction, normalizeTransaction,
} from "@/app/_lib/utils"
import type {
  Domain, Direction, InputMode, UploadKind, OverviewDirectionFilter,
  PaymentMethod, PageStep, StatsDirection, StatsTimeRange,
  Transaction, DraftTransaction, ImportJob, FileMapping,
  TransactionEditDraft, AiFinanceFeedbackCard,
  RecurringEntry, RecurringRecordLog, RecurringFormState,
  SpeechRecognitionLike,
} from "@/app/_lib/types"
import { STEP_ROUTE_MAP } from "@/app/_lib/types"


interface MvpAccountingPageProps {
  readonly initialStep?: PageStep
}

export function MvpAccountingPage({ initialStep = "home" }: MvpAccountingPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const defaultDreamDeadline = useMemo(() => {
    const deadline = new Date()
    deadline.setMonth(deadline.getMonth() + 3)
    deadline.setDate(1)
    return deadline.toISOString().slice(0, 10)
  }, [])

  const [step, setStep] = useState<PageStep>(initialStep)
  const [modeSheetOpen, setModeSheetOpen] = useState(false)
  const [activeMode, setActiveMode] = useState<InputMode>("text_single")
  const [_entryImportAdvancedOpen, setEntryImportAdvancedOpen] = useState(false)
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null)
  const [calendarDaySheetOpen, setCalendarDaySheetOpen] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>(() => DEMO_TRANSACTIONS.map(normalizeTransaction))
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
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<PaymentMethod>("cash")
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
    setStep(initialStep)
  }, [initialStep])

  function goToStep(nextStep: PageStep) {
    setStep(nextStep)
    const targetPath = STEP_ROUTE_MAP[nextStep]
    if (pathname !== targetPath) {
      router.push(targetPath)
    }
  }

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
          setTransactions(storedTransactions.map(normalizeTransaction))
        } else {
          const legacyTransactionsRaw = localStorage.getItem(LEGACY_STORAGE_TX_KEY)
          if (legacyTransactionsRaw) {
            const legacyTransactions = JSON.parse(legacyTransactionsRaw) as Transaction[]
            if (Array.isArray(legacyTransactions) && legacyTransactions.length > 0) {
              const normalizedLegacyTransactions = legacyTransactions.map(normalizeTransaction)
              setTransactions(normalizedLegacyTransactions)
              await writeIndexedDbValue(INDEXED_DB_TX_KEY, normalizedLegacyTransactions)
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
              payment_method: "unspecified",
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
        paymentMethodLabel(item.payment_method),
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
    setEntryPaymentMethod("cash")
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
    goToStep("quick-add")
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
    setEntryPaymentMethod("cash")
    setEntryCategoryNeedsAttention(false)
    setEntryCalcDisplay("0")
    setEntryNote("")
    setEntryDate(today)
    setEntryAdvancedMode("none")
    setEntryImportAdvancedOpen(false)
    setBanner(null)
    goToStep("new-entry")
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
      const paymentPool: PaymentMethod[] = isIncome
        ? ["cash", "bank_transfer", "line_pay", "other_e_wallet"]
        : ["cash", "credit_card", "debit_card", "line_pay", "other_e_wallet", "bank_transfer"]
      const paymentMethod = paymentPool[Math.floor(Math.random() * paymentPool.length)] ?? "unspecified"

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
        payment_method: paymentMethod,
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
    goToStep("confirm")
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
        payment_method: normalizePaymentMethod(item.payment_method),
        user_overridden: item.user_overridden || item.ai_predicted_category_key !== category.category_key,
      }
    })

    setTransactions(prev => [...normalized, ...prev])
    if (importJob) {
      setImportJob({ ...importJob, status: "imported" })
    }
    setDrafts([])
    goToStep("home")
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
      payment_method: normalizePaymentMethod(item.payment_method),
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
          payment_method: normalizePaymentMethod(editDraft.payment_method),
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
    goToStep("recurring")
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
        payment_method: "unspecified",
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

  function openEntryForEdit(tx: Transaction) {
    const dir = tx.direction === "income" || tx.direction === "expense" ? tx.direction : "expense"
    const dom = tx.domain === "life" || tx.domain === "business" ? tx.domain : "life"
    setEntryEditingId(tx.id)
    setEntryDirection(dir)
    setEntryDomain(dom)
    setEntryCategory(tx.category_key)
    setEntryPaymentMethod(normalizePaymentMethod(tx.payment_method))
    setEntryCategoryNeedsAttention(false)
    setEntryCalcDisplay(String(tx.amount))
    setEntryNote(tx.note)
    setEntryDate(tx.occurred_at)
    setEntryAdvancedMode("none")
    setEntryImportAdvancedOpen(false)
    setBanner(null)
    goToStep("new-entry")
  }

  function deleteEntryEditing() {
    if (!entryEditingId) return
    if (typeof globalThis.window !== "undefined") {
      const confirmed = globalThis.window.confirm("確定要刪除這筆交易嗎？")
      if (!confirmed) return
    }
    setTransactions(prev => prev.filter(t => t.id !== entryEditingId))
    setEntryEditingId(null)
    goToStep("home")
    setBanner("已刪除這筆交易。")
  }

  function saveQuickEntry() {
    const amount = calcEvaluate()
    if (amount <= 0) return

    if (!entryCategory) {
      setEntryCategoryNeedsAttention(true)
      setBanner("請先在上方選擇一個類型，再完成送出。")
      return
    }

    const category = CATEGORY_BY_KEY.get(entryCategory)
    if (!category) {
      setBanner("找不到對應的類型，請重新選擇。")
      setEntryCategoryNeedsAttention(true)
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
            payment_method: normalizePaymentMethod(entryPaymentMethod),
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
        payment_method: normalizePaymentMethod(entryPaymentMethod),
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
    setEntryPaymentMethod("cash")
    setEntryCategoryNeedsAttention(false)
    setEntryDate(new Date().toISOString().slice(0, 10))
    goToStep("home")
  }

  return (
    <div className="family-warm-theme min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,#fff9f5_0%,#fdf4ef_38%,#f8eee8_100%)] text-[#6d5864]">
      <main className="mx-auto w-full max-w-2xl px-3 sm:px-4 py-4 pb-32">
        {banner && (
          <div className="mb-4 rounded-md border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            {banner}
          </div>
        )}

        {step === "home" && (
          <HomeView
            selectedMonth={selectedMonth}
            pickerYear={pickerYear}
            monthPickerOpen={monthPickerOpen}
            homeViewMode={homeViewMode}
            monthIncome={monthIncome}
            monthExpense={monthExpense}
            monthNet={monthNet}
            monthTxCount={monthTxCount}
            donutData={donutData}
            currentMonthTx={currentMonthTx}
            sortedCurrentMonthTransactions={sortedCurrentMonthTransactions}
            groupedByDate={groupedByDate}
            aiFinanceFeedback={aiFinanceFeedback}
            recurringSummary={recurringSummary}
            calendarSelectedDate={calendarSelectedDate}
            onSelectedMonthChange={setSelectedMonth}
            onPickerYearChange={setPickerYear}
            onMonthPickerOpenChange={setMonthPickerOpen}
            onHomeViewModeChange={setHomeViewMode}
            onStatsDetailDirectionChange={setStatsDetailDirection}
            onStatsTimeRangeChange={setStatsTimeRange}
            onCalendarSelectedDateChange={setCalendarSelectedDate}
            onCalendarDaySheetOpenChange={setCalendarDaySheetOpen}
            onGoToStep={goToStep}
            onOpenEntryForEdit={openEntryForEdit}
            onCancelEditTransaction={cancelEditTransaction}
            onBanner={setBanner}
          />
        )}

        {step === "stats-detail" && (
          <StatsDetailView
            transactions={transactions}
            selectedMonth={selectedMonth}
            statsDetailDirection={statsDetailDirection}
            statsTimeRange={statsTimeRange}
            statsCustomStart={statsCustomStart}
            statsCustomEnd={statsCustomEnd}
            statsYear={statsYear}
            statsViewMode={statsViewMode}
            calendarMonth={calendarMonth}
            onGoToStep={goToStep}
            onStatsDetailDirectionChange={setStatsDetailDirection}
            onStatsTimeRangeChange={setStatsTimeRange}
            onSelectedMonthChange={setSelectedMonth}
            onStatsYearChange={setStatsYear}
            onStatsCustomStartChange={setStatsCustomStart}
            onStatsCustomEndChange={setStatsCustomEnd}
            onStatsViewModeChange={setStatsViewMode}
            onCalendarMonthChange={setCalendarMonth}
          />
        )}

        {step === "new-entry" && (
          <NewEntryView
            entryEditingId={entryEditingId}
            entryDirection={entryDirection}
            entryDomain={entryDomain}
            entryCategory={entryCategory}
            entryPaymentMethod={entryPaymentMethod}
            entryCalcDisplay={entryCalcDisplay}
            entryNote={entryNote}
            entryDate={entryDate}
            entryAdvancedMode={entryAdvancedMode}
            entryCategoryNeedsAttention={entryCategoryNeedsAttention}
            entryCategories={entryCategories}
            singleText={singleText}
            isListening={isListening}
            isSpeechSupported={isSpeechSupported}
            speechPreview={speechPreview}
            speechError={speechError}
            uploadedFile={uploadedFile}
            uploadKind={uploadKind}
            photoAmount={photoAmount}
            photoNote={photoNote}
            isFileParsing={isFileParsing}
            onGoToStep={goToStep}
            onBanner={setBanner}
            onEntryDirectionChange={setEntryDirection}
            onEntryDomainChange={setEntryDomain}
            onEntryCategoryChange={setEntryCategory}
            onEntryPaymentMethodChange={setEntryPaymentMethod}
            onEntryCalcDisplayChange={setEntryCalcDisplay}
            onEntryNoteChange={setEntryNote}
            onEntryDateChange={setEntryDate}
            onEntryAdvancedModeChange={setEntryAdvancedMode}
            onEntryImportAdvancedOpenChange={setEntryImportAdvancedOpen}
            onEntryEditingIdChange={setEntryEditingId}
            onEntryCategoryNeedsAttentionChange={setEntryCategoryNeedsAttention}
            onSingleTextChange={setSingleText}
            onPhotoAmountChange={setPhotoAmount}
            onPhotoNoteChange={setPhotoNote}
            onToggleSpeechInput={toggleSpeechInput}
            onFilePicked={handleFilePicked}
            onParseInput={handleParseInput}
            onSaveQuickEntry={saveQuickEntry}
            onDeleteEntryEditing={deleteEntryEditing}
            onStartSmartEntry={startSmartEntry}
          />
        )}

        {step === "overview" && (
          <OverviewView
            transactions={transactions}
            overviewDirectionFilter={overviewDirectionFilter}
            overviewQuery={overviewQuery}
            overviewTransactions={overviewTransactions}
            overviewFilterStats={overviewFilterStats}
            editingTransactionId={editingTransactionId}
            editDraft={editDraft}
            onGoToStep={goToStep}
            onCancelEditTransaction={cancelEditTransaction}
            onOverviewDirectionFilterChange={setOverviewDirectionFilter}
            onOverviewQueryChange={setOverviewQuery}
            onStartEditTransaction={startEditTransaction}
            onSaveEditedTransaction={saveEditedTransaction}
            onRemoveTransaction={removeTransaction}
            onEditDraftChange={setEditDraft}
          />
        )}

        {step === "analysis" && (() => {
          const totalCount = analysisData.incomes.length + analysisData.expenses.length
          return (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
                  onClick={() => goToStep("home")}
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
        })()}

        {step === "recurring" && (
          <RecurringManagerView
            recurringEntries={recurringEntries}
            recurringForm={recurringForm}
            recurringEditingId={recurringEditingId}
            recurringCategories={recurringCategories}
            recurringRecordedCountById={recurringRecordedCountById}
            recurringSummary={recurringSummary}
            latestRecurringLogById={latestRecurringLogById}
            recurringRecordLogs={recurringRecordLogs}
            onGoToStep={goToStep}
            onRecurringFormChange={setRecurringForm}
            onSave={saveRecurringSetting}
            onReset={resetRecurringForm}
            onStartEdit={startEditRecurring}
            onToggleEnabled={toggleRecurringRuleEnabled}
            onToggleAutoRecord={toggleRecurringRuleAutoRecord}
            onRemove={removeRecurringRule}
            onRecordNow={recordRecurringNow}
            onBanner={setBanner}
          />
        )}

        {step === "quick-add" && (
          <QuickAddView
            activeMode={activeMode}
            singleText={singleText}
            isListening={isListening}
            isSpeechSupported={isSpeechSupported}
            speechPreview={speechPreview}
            speechError={speechError}
            uploadedFiles={uploadedFiles}
            isFileParsing={isFileParsing}
            drafts={drafts}
            fileImportTab={fileImportTab}
            onGoToStep={goToStep}
            onBanner={setBanner}
            onSingleTextChange={setSingleText}
            onSwitchQuickAddMode={switchQuickAddMode}
            onToggleSpeechInput={toggleSpeechInput}
            onFilesPicked={handleFilesPicked}
            onParseInput={handleParseInput}
            onDraftsChange={setDrafts}
            onBuildMockFileDrafts={buildMockFileDrafts}
            onStartManualEntry={startManualEntry}
            onUpdateDraft={updateDraft}
            onShiftDraftDate={shiftDraftDate}
            onFileImportTabChange={setFileImportTab}
            onSaveDrafts={saveDrafts}
            onRecognitionStop={() => recognitionRef.current?.stop()}
            onListeningChange={setIsListening}
            onSpeechPreviewChange={setSpeechPreview}
            onSpeechErrorChange={setSpeechError}
          />
        )}

        {step === "confirm" && (
          <ConfirmView
            drafts={drafts}
            importJob={importJob}
            onGoToStep={goToStep}
            onBanner={setBanner}
            onUpdateDraft={updateDraft}
            onShiftDraftDate={shiftDraftDate}
            onDraftsChange={setDrafts}
            onSaveDrafts={saveDrafts}
          />
        )}
      </main>

      {step === "home" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-8 safe-bottom">
          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="h-14 px-8 rounded-full bg-[linear-gradient(135deg,#f2b08c_0%,#ea8da0_100%)] text-[#fffaf8] shadow-2xl shadow-[#ecc8ba]/80 hover:opacity-95 hover:shadow-[#ecc8ba]/90 active:scale-95 transition-all duration-200 gap-2.5"
              onClick={() => startSmartEntry()}
              aria-label="新增記帳"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              <span className="text-[15px] font-semibold tracking-wide">記一筆</span>
            </Button>
          </div>
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
                          <span className="text-[10px] sm:text-[11px] text-slate-400">
                            {paymentMethodFieldLabel(item.direction)}：{paymentMethodLabel(item.payment_method)}
                          </span>
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

export type { PageStep } from "@/app/_lib/types"

export default function HomePage() {
  return <MvpAccountingPage initialStep="home" />
}
