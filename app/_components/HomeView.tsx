"use client"

import { ArrowLeft, ArrowRight, CalendarDays, PieChart as PieChartIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import {
  formatMoney, formatMonthLabel, cashFlowToneClass, formatCompactCashFlow,
  categoryLabel, paymentMethodLabel,
} from "@/app/_lib/utils"
import type { Transaction, PageStep, AiFinanceFeedbackCard, StatsTimeRange } from "@/app/_lib/types"

export interface HomeViewProps {
  readonly selectedMonth: string
  readonly pickerYear: number
  readonly monthPickerOpen: boolean
  readonly homeViewMode: "chart" | "calendar"
  readonly monthIncome: number
  readonly monthExpense: number
  readonly monthNet: number
  readonly monthTxCount: number
  readonly donutData: Array<{ name: string; value: number; color: string }>
  readonly currentMonthTx: Transaction[]
  readonly sortedCurrentMonthTransactions: Transaction[]
  readonly groupedByDate: Array<{ date: string; label: string; transactions: Transaction[]; dayNet: number }>
  readonly aiFinanceFeedback: AiFinanceFeedbackCard | null
  readonly recurringSummary: { total: number; active: number; active_with_remaining: number; auto: number; dueToday: number }
  readonly calendarSelectedDate: string | null
  readonly onSelectedMonthChange: (val: string) => void
  readonly onPickerYearChange: (updater: number | ((prev: number) => number)) => void
  readonly onMonthPickerOpenChange: (updater: boolean | ((prev: boolean) => boolean)) => void
  readonly onHomeViewModeChange: (updater: "chart" | "calendar" | ((prev: "chart" | "calendar") => "chart" | "calendar")) => void
  readonly onStatsDetailDirectionChange: (dir: "expense" | "income" | "net") => void
  readonly onStatsTimeRangeChange: (range: StatsTimeRange) => void
  readonly onCalendarSelectedDateChange: (date: string | null) => void
  readonly onCalendarDaySheetOpenChange: (open: boolean) => void
  readonly onGoToStep: (step: PageStep) => void
  readonly onOpenEntryForEdit: (tx: Transaction) => void
  readonly onCancelEditTransaction: () => void
  readonly onBanner: (msg: string | null) => void
}

export function HomeView(props: HomeViewProps) {
  const {
    selectedMonth, pickerYear, monthPickerOpen, homeViewMode,
    monthIncome, monthExpense, monthNet, monthTxCount,
    donutData, currentMonthTx, sortedCurrentMonthTransactions, groupedByDate,
    aiFinanceFeedback, recurringSummary, calendarSelectedDate,
    onSelectedMonthChange, onPickerYearChange, onMonthPickerOpenChange,
    onHomeViewModeChange, onStatsDetailDirectionChange, onStatsTimeRangeChange,
    onCalendarSelectedDateChange, onCalendarDaySheetOpenChange,
    onGoToStep, onOpenEntryForEdit, onCancelEditTransaction, onBanner,
  } = props

  const selectedYear = Number(selectedMonth.split("-")[0])
  const selectedMonthNum = Number(selectedMonth.split("-")[1])

  function pickMonth(month: number) {
    const key = `${pickerYear}-${String(month).padStart(2, "0")}`
    onSelectedMonthChange(key)
    onMonthPickerOpenChange(false)
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="border-indigo-400/30 bg-slate-900/70 overflow-hidden">
        <CardContent className="pt-4 pb-4 sm:pt-5 sm:pb-5 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onPickerYearChange(selectedYear)
                onMonthPickerOpenChange(previous => !previous)
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
                onClick={() => onHomeViewModeChange(prev => prev === "chart" ? "calendar" : "chart")}
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
                  onClick={() => onPickerYearChange(previous => previous - 1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-white">{pickerYear} 年</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 min-h-[36px] min-w-[36px] p-0"
                  onClick={() => onPickerYearChange(previous => previous + 1)}
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
                  onStatsDetailDirectionChange("net")
                  onStatsTimeRangeChange("month")
                  onGoToStep("stats-detail")
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
                  onStatsDetailDirectionChange("expense")
                  onStatsTimeRangeChange("month")
                  onGoToStep("stats-detail")
                }}
                className="absolute top-0 left-0 text-left rounded-xl p-2.5 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors"
              >
                <p className="mb-0.5 text-xs font-medium text-[#b87467]">總支出</p>
                <p className="text-base sm:text-lg font-bold leading-tight text-[#ab6158]">{formatMoney(monthExpense)}</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  onStatsDetailDirectionChange("income")
                  onStatsTimeRangeChange("month")
                  onGoToStep("stats-detail")
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
                <div className="grid grid-cols-7 gap-px">
                  {hcWeekdays.map(wd => (
                    <div key={wd} className="text-center text-[10px] text-slate-500 font-medium py-1">{wd}</div>
                  ))}
                </div>

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
                          onCalendarSelectedDateChange(dateStr)
                          onCalendarDaySheetOpenChange(true)
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

                <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-2 mt-1 px-0.5">
                  <button
                    type="button"
                    onClick={() => { onStatsDetailDirectionChange("expense"); onStatsTimeRangeChange("month"); onGoToStep("stats-detail") }}
                    className="text-rose-300 hover:text-rose-200 transition-colors"
                  >
                    支出：{formatMoney(monthExpense)}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onStatsDetailDirectionChange("income"); onStatsTimeRangeChange("month"); onGoToStep("stats-detail") }}
                    className="text-emerald-300 hover:text-emerald-200 transition-colors"
                  >
                    收入：{formatMoney(monthIncome)}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onStatsDetailDirectionChange("net"); onStatsTimeRangeChange("month"); onGoToStep("stats-detail") }}
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
                onGoToStep("analysis")
                onCancelEditTransaction()
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
                onGoToStep("recurring")
                onBanner(null)
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
                      onClick={() => onOpenEntryForEdit(item)}
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
                          {categoryLabel(item.category_key)} ・ {paymentMethodLabel(item.payment_method)}
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
