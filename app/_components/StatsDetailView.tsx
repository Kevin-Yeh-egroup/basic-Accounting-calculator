"use client"

import { ArrowLeft, ArrowRight, BarChart3, CalendarDays } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts"
import {
  formatMoney, formatMonthLabel, formatDateGroup, shiftMonthKey,
  categoryLabel, paymentMethodLabel,
} from "@/app/_lib/utils"
import type { Transaction, PageStep, StatsDirection, StatsTimeRange } from "@/app/_lib/types"

export interface StatsDetailViewProps {
  readonly transactions: Transaction[]
  readonly selectedMonth: string
  readonly statsDetailDirection: StatsDirection
  readonly statsTimeRange: StatsTimeRange
  readonly statsCustomStart: string
  readonly statsCustomEnd: string
  readonly statsYear: number
  readonly statsViewMode: "chart" | "calendar"
  readonly calendarMonth: string
  readonly onGoToStep: (step: PageStep) => void
  readonly onStatsDetailDirectionChange: (dir: StatsDirection) => void
  readonly onStatsTimeRangeChange: (range: StatsTimeRange) => void
  readonly onSelectedMonthChange: (updater: string | ((prev: string) => string)) => void
  readonly onStatsYearChange: (updater: number | ((prev: number) => number)) => void
  readonly onStatsCustomStartChange: (val: string) => void
  readonly onStatsCustomEndChange: (val: string) => void
  readonly onStatsViewModeChange: (mode: "chart" | "calendar") => void
  readonly onCalendarMonthChange: (updater: string | ((prev: string) => string)) => void
}

export function StatsDetailView({
  transactions,
  selectedMonth,
  statsDetailDirection,
  statsTimeRange,
  statsCustomStart,
  statsCustomEnd,
  statsYear,
  statsViewMode,
  calendarMonth,
  onGoToStep,
  onStatsDetailDirectionChange,
  onStatsTimeRangeChange,
  onSelectedMonthChange,
  onStatsYearChange,
  onStatsCustomStartChange,
  onStatsCustomEndChange,
  onStatsViewModeChange,
  onCalendarMonthChange,
}: StatsDetailViewProps) {
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

  const catMap = new Map<string, number>()
  dirFiltered.forEach(tx => {
    catMap.set(tx.category_key, (catMap.get(tx.category_key) ?? 0) + tx.amount)
  })
  const topCats = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

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
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onGoToStep("home")}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </button>
        <h1 className="text-white font-semibold text-base">收支統計</h1>
      </div>

      <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
        {dirTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatsDetailDirectionChange(tab.key)}
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

      <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        {timeTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatsTimeRangeChange(tab.key)}
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

      {(statsTimeRange === "month" || statsTimeRange === "year") && (
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              if (statsTimeRange === "month") {
                onSelectedMonthChange(prev => shiftMonthKey(prev, -1))
              } else {
                onStatsYearChange(prev => prev - 1)
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
                onSelectedMonthChange(prev => shiftMonthKey(prev, 1))
              } else {
                onStatsYearChange(prev => prev + 1)
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

      {statsTimeRange === "custom" && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-3">
          <p className="text-xs text-slate-400 font-medium">自訂日期區間</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 px-0.5">開始日期</p>
              <input
                type="date"
                value={statsCustomStart}
                onChange={e => onStatsCustomStartChange(e.target.value)}
                className="w-full min-w-0 bg-slate-950/60 border border-white/20 rounded-lg px-2 py-2 text-xs text-white [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 px-0.5">結束日期</p>
              <input
                type="date"
                value={statsCustomEnd}
                onChange={e => onStatsCustomEndChange(e.target.value)}
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

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onStatsViewModeChange("chart")}
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
            onStatsViewModeChange("calendar")
            onCalendarMonthChange(selectedMonth)
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCalendarMonthChange(prev => shiftMonthKey(prev, -1))}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
                >
                  <ArrowLeft className="h-3 w-3 text-white" />
                </button>
                <p className="flex-1 text-center text-sm font-semibold text-white">{calY} 年 {calM} 月</p>
                <button
                  type="button"
                  onClick={() => onCalendarMonthChange(prev => shiftMonthKey(prev, 1))}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
                >
                  <ArrowRight className="h-3 w-3 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-px">
                {weekdayHeaders.map(wd => (
                  <div key={wd} className="text-center text-[10px] text-slate-500 font-medium py-1">{wd}</div>
                ))}
              </div>

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
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {categoryLabel(item.category_key)} ・ {paymentMethodLabel(item.payment_method)}
                        </p>
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
