"use client"

import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RECURRING_WEEKDAY_OPTIONS, MAX_RECURRING_OCCURRENCES } from "@/app/_lib/constants"
import {
  formatMoney,
  categoryLabel,
  recurringRuleLabel,
  remainingRecurringOccurrences,
  findNextRecurringDueDate,
  clampInteger,
} from "@/app/_lib/utils"
import type {
  PageStep,
  RecurringEntry,
  RecurringFormState,
  RecurringRecordLog,
} from "@/app/_lib/types"

export interface RecurringManagerViewProps {
  readonly recurringEntries: RecurringEntry[]
  readonly recurringForm: RecurringFormState
  readonly recurringEditingId: string | null
  readonly recurringCategories: Array<{ category_key: string; direction: string; domain: string; display_name_zh: string }>
  readonly recurringRecordedCountById: Map<string, number>
  readonly recurringSummary: {
    total: number
    active: number
    active_with_remaining: number
    auto: number
    dueToday: number
  }
  readonly latestRecurringLogById: Map<string, RecurringRecordLog>
  readonly recurringRecordLogs: RecurringRecordLog[]
  readonly onGoToStep: (step: PageStep) => void
  readonly onRecurringFormChange: (updater: RecurringFormState | ((prev: RecurringFormState) => RecurringFormState)) => void
  readonly onSave: () => void
  readonly onReset: (direction?: "expense" | "income") => void
  readonly onStartEdit: (rule: RecurringEntry) => void
  readonly onToggleEnabled: (id: string) => void
  readonly onToggleAutoRecord: (id: string) => void
  readonly onRemove: (id: string) => void
  readonly onRecordNow: (rule: RecurringEntry) => void
  readonly onBanner: (msg: string | null) => void
}

export function RecurringManagerView(props: RecurringManagerViewProps) {
  const {
    recurringEntries,
    recurringForm,
    recurringEditingId,
    recurringCategories,
    recurringRecordedCountById,
    recurringSummary,
    latestRecurringLogById,
    recurringRecordLogs,
    onGoToStep,
    onRecurringFormChange,
    onSave,
    onReset,
    onStartEdit,
    onToggleEnabled,
    onToggleAutoRecord,
    onRemove,
    onRecordNow,
  } = props

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
            onGoToStep("home")
            onReset(recurringForm.direction)
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
          <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-3 text-center">
            <p className="text-xs font-semibold text-slate-300 mb-0.5">可執行</p>
            <p className="text-2xl font-bold text-white">{recurringSummary.active_with_remaining}</p>
          </div>
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-2 py-3 text-center">
            <p className="text-xs font-semibold text-emerald-300 mb-0.5">自動記帳</p>
            <p className="text-2xl font-bold text-emerald-200">{recurringSummary.auto}</p>
          </div>
          <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 px-2 py-3 text-center">
            <p className="text-xs font-semibold text-amber-300 mb-0.5">今日到期</p>
            <p className="text-2xl font-bold text-amber-200">{recurringSummary.dueToday}</p>
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
            onChange={event => onRecurringFormChange(previous => ({ ...previous, title: event.target.value }))}
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
                onRecurringFormChange(previous => ({
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
                onRecurringFormChange(previous => ({
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
              onChange={event => onRecurringFormChange(previous => ({ ...previous, amount: event.target.value }))}
              className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
              placeholder="固定金額"
            />
            <select
              value={recurringForm.category_key}
              onChange={event => onRecurringFormChange(previous => ({ ...previous, category_key: event.target.value }))}
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
            onChange={event => onRecurringFormChange(previous => ({ ...previous, note: event.target.value }))}
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
                onClick={() => onRecurringFormChange(previous => ({ ...previous, frequency: "weekly" }))}
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
                onClick={() => onRecurringFormChange(previous => ({ ...previous, frequency: "monthly" }))}
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
                onClick={() => onRecurringFormChange(previous => ({ ...previous, frequency: "yearly" }))}
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
                    onClick={() => onRecurringFormChange(previous => ({ ...previous, weekly_day: option.value }))}
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
                    onRecurringFormChange(previous => ({
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
                      onRecurringFormChange(previous => ({
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
                      onRecurringFormChange(previous => ({
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
                onClick={() => onRecurringFormChange(previous => ({ ...previous, occurrence_mode: "unlimited" }))}
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
                onClick={() => onRecurringFormChange(previous => ({ ...previous, occurrence_mode: "limited" }))}
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
                    onRecurringFormChange(previous => ({
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
                onChange={event => onRecurringFormChange(previous => ({ ...previous, start_date: event.target.value }))}
                className="bg-slate-950/60 border-white/20 text-white min-h-[44px] [color-scheme:dark]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onRecurringFormChange(previous => ({ ...previous, enabled: !previous.enabled }))}
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
                onClick={() => onRecurringFormChange(previous => ({ ...previous, auto_record: !previous.auto_record }))}
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
              onClick={onSave}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {recurringEditingId ? "更新設定" : "儲存設定"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[42px] text-sm"
              onClick={() => onReset(recurringForm.direction)}
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
                      onClick={() => onToggleEnabled(rule.id)}
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
                      onClick={() => onToggleAutoRecord(rule.id)}
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
                      onClick={() => onStartEdit(rule)}
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
                      onClick={() => onRecordNow(rule)}
                    >
                      {!hasRemaining ? "已達上限" : loggedToday ? "今天已記錄" : "立即記一筆"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[38px] text-xs border-rose-300/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                      onClick={() => onRemove(rule.id)}
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
