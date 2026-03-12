"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Save, Trash2, Pencil, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CategorySelect } from "@/app/_components/CategorySelect"
import { PaymentMethodSelect } from "@/app/_components/PaymentMethodSelect"
import { CATEGORY_BY_KEY } from "@/app/_lib/taxonomy"
import {
  domainLabel,
  directionLabel,
  importStatusLabel,
  normalizePaymentMethod,
  paymentMethodFieldLabel,
  paymentMethodLabel,
  formatMoney,
} from "@/app/_lib/utils"
import type { PageStep, DraftTransaction, ImportJob } from "@/app/_lib/types"

interface ConfirmViewProps {
  readonly drafts: DraftTransaction[]
  readonly importJob: ImportJob | null
  readonly onGoToStep: (step: PageStep) => void
  readonly onBanner: (msg: string | null) => void
  readonly onUpdateDraft: (index: number, updater: (d: DraftTransaction) => DraftTransaction) => void
  readonly onShiftDraftDate: (index: number, days: number) => void
  readonly onDraftsChange: (updater: DraftTransaction[] | ((prev: DraftTransaction[]) => DraftTransaction[])) => void
  readonly onSaveDrafts: (options?: { allowIncomplete?: boolean }) => void
}

function formatDisplayDate(ymd: string): string {
  if (!ymd) return ""
  const [year, month, day] = ymd.split("-")
  if (!year || !month || !day) return ymd
  const currentYear = new Date().getFullYear().toString()
  if (year === currentYear) return `${Number.parseInt(month)}月${Number.parseInt(day)}日`
  return `${year}年${Number.parseInt(month)}月${Number.parseInt(day)}日`
}

function getDomainDotClass(domain: string): string {
  return domain === "business" ? "bg-amber-400" : "bg-violet-400"
}

export function ConfirmView({
  drafts,
  importJob,
  onGoToStep,
  onBanner,
  onUpdateDraft,
  onShiftDraftDate,
  onDraftsChange,
  onSaveDrafts,
}: ConfirmViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null)

  const totalIncome = drafts
    .filter(d => d.direction === "income")
    .reduce((sum, d) => sum + d.amount, 0)
  const totalExpense = drafts
    .filter(d => d.direction === "expense")
    .reduce((sum, d) => sum + d.amount, 0)

  const warningCount = drafts.filter(d => d.category_key.includes("other") && !d.categoryTouched).length
  const parseErrorCount = drafts.filter(d => d.parse_error).length
  const deleteTarget = deleteTargetIndex === null ? null : drafts[deleteTargetIndex]
  const deleteTargetCategory = deleteTarget
    ? (CATEGORY_BY_KEY.get(deleteTarget.category_key)?.display_name_zh ?? deleteTarget.category_key)
    : ""

  function confirmDeleteDraft() {
    if (deleteTargetIndex === null) return
    onDraftsChange(prev => prev.filter((_, i) => i !== deleteTargetIndex))
    setEditingIndex(prev => {
      if (prev === null) return null
      if (prev === deleteTargetIndex) return null
      return prev > deleteTargetIndex ? prev - 1 : prev
    })
    setDeleteTargetIndex(null)
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="text-slate-400 hover:text-white hover:bg-white/10 -ml-2 px-2 h-9 text-sm"
          onClick={() => {
            onGoToStep("quick-add")
            onBanner(null)
          }}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>

        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">待確認</p>
          <p className="text-sm font-semibold text-white">{drafts.length} 筆記錄</p>
        </div>
      </div>

      {/* ── Summary strip ── */}
      {drafts.length > 0 && (
        <div className={`grid gap-2.5 ${totalIncome > 0 && totalExpense > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
          {totalIncome > 0 && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">收入</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-300 tabular-nums">
                +{formatMoney(totalIncome)}
              </p>
            </div>
          )}
          {totalExpense > 0 && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
              <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-widest">支出</p>
              <p className="mt-0.5 text-xl font-bold text-rose-300 tabular-nums">
                -{formatMoney(totalExpense)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Warning banner ── */}
      {warningCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 flex-1">
            有 <span className="font-semibold">{warningCount}</span> 筆類別需要確認，請點卡片右側的編輯按鈕
          </p>
        </div>
      )}

      {/* ── Import job info ── */}
      {importJob && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-1.5">
          <p className="text-sm font-medium text-slate-200">
            匯入任務：{importStatusLabel(importJob.status)}
          </p>
          <p className="text-xs text-slate-400">
            總行數 {importJob.stats.total_lines}
            ／成功 {importJob.stats.success_lines}
            ／需人工 {importJob.stats.needs_manual_lines}
          </p>
          {importJob.errors.length > 0 && (
            <div className="mt-1 rounded-lg border border-amber-300/25 bg-amber-500/10 p-2.5 text-xs text-amber-200 space-y-0.5">
              {importJob.errors.slice(0, 3).map((error, idx) => (
                <p key={`${error}_${idx}`}>· {error}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Entry list ── */}
      <div className="space-y-2.5">
        {drafts.map((draft, index) => {
          const isEditing = editingIndex === index
          const category = CATEGORY_BY_KEY.get(draft.category_key)
          const needsAttention = draft.category_key.includes("other") && !draft.categoryTouched
          const isIncome = draft.direction === "income"

          /* ── Edit mode card ── */
          if (isEditing) {
            return (
              <Card
                key={draft.id}
                className="bg-slate-800/90 border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5 transition-all"
              >
                <CardContent className="p-4 space-y-4">

                  {/* Edit header */}
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">
                      編輯中
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2.5 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1"
                        onClick={() => setDeleteTargetIndex(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                        刪除
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-3 text-[11px] bg-white text-slate-900 hover:bg-white/90 border border-white/80 gap-1 font-semibold"
                        onClick={() => setEditingIndex(null)}
                      >
                        <Check className="h-3 w-3" />
                        完成
                      </Button>
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      備註說明
                    </p>
                    <Textarea
                      value={draft.note}
                      onChange={e =>
                        onUpdateDraft(index, item => ({
                          ...item,
                          note: e.target.value,
                          user_overridden: e.target.value.trim() !== item.raw_line.trim(),
                        }))
                      }
                      className="min-h-[72px] bg-slate-950/60 border-white/15 text-white text-sm resize-none focus-visible:ring-indigo-500/50"
                    />
                  </div>

                  {/* Amount + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        金額
                      </p>
                      <Input
                        type="number"
                        min={0}
                        data-draft-amount={index}
                        value={draft.amount}
                        onChange={e =>
                          onUpdateDraft(index, item => ({
                            ...item,
                            amount: Math.max(0, Number(e.target.value) || 0),
                            parse_error: undefined,
                            user_overridden: true,
                          }))
                        }
                        className="bg-slate-950/60 border-white/15 text-white min-h-[44px] focus-visible:ring-indigo-500/50"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        日期 <span className="text-rose-400">*</span>
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-8 shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => onShiftDraftDate(index, -1)}
                          aria-label="日期往前一天"
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </Button>
                        <Input
                          type="date"
                          data-draft-date={index}
                          value={draft.occurred_at}
                          onChange={e =>
                            onUpdateDraft(index, item => ({ ...item, occurred_at: e.target.value }))
                          }
                          className={`flex-1 min-w-0 bg-slate-950/60 text-white min-h-[44px] [color-scheme:dark] focus-visible:ring-indigo-500/50 ${
                            draft.occurred_at ? "border-white/15" : "border-rose-400/60"
                          }`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-8 shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => onShiftDraftDate(index, 1)}
                          aria-label="日期往後一天"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      類別 <span className="text-rose-400">*</span>
                      {needsAttention && (
                        <span className="text-amber-400 normal-case font-normal">· 請選擇正確類別</span>
                      )}
                    </p>
                    <CategorySelect
                      value={draft.category_key}
                      onValueChange={key => {
                        const cat = CATEGORY_BY_KEY.get(key)
                        if (!cat) return
                        onUpdateDraft(index, item => ({
                          ...item,
                          category_key: key,
                          domain: cat.domain,
                          direction: cat.direction,
                          user_overridden: item.ai_predicted_category_key !== key,
                          categoryTouched: true,
                        }))
                      }}
                      className={`w-full rounded-lg border bg-slate-950/80 px-3 py-2.5 text-sm text-white min-h-[44px] focus:ring-indigo-400 ${
                        needsAttention ? "border-amber-400/60 ring-1 ring-amber-400/20" : "border-white/15"
                      }`}
                    />
                  </div>

                  {/* Payment method */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      {paymentMethodFieldLabel(draft.direction)}
                    </p>
                    <PaymentMethodSelect
                      value={normalizePaymentMethod(draft.payment_method)}
                      direction={draft.direction === "income" ? "income" : "expense"}
                      onValueChange={method =>
                        onUpdateDraft(index, item => ({
                          ...item,
                          payment_method: method,
                          user_overridden: true,
                        }))
                      }
                    />
                  </div>

                  {/* Domain / direction info */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${getDomainDotClass(draft.domain)}`} />
                    <span className="text-[10px] text-slate-500">
                      {domainLabel(draft.domain)} · {directionLabel(draft.direction)}
                    </span>
                  </div>

                  {draft.parse_error && (
                    <div className="rounded-lg border border-rose-300/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                      {draft.parse_error}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          }

          /* ── View mode card ── */
          return (
            <Card
              key={draft.id}
              className={`bg-slate-900/60 border-white/10 transition-all duration-150 hover:border-white/20 hover:bg-slate-900/80 ${
                needsAttention ? "border-amber-500/30 hover:border-amber-500/50" : ""
              }`}
            >
              <CardContent className="px-4 py-3.5">
                <div className="flex items-start gap-3">

                  {/* Domain dot */}
                  <span
                    className={`mt-[5px] h-2 w-2 rounded-full shrink-0 ${getDomainDotClass(draft.domain)}`}
                  />

                  {/* Main info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="inline-block rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-900 truncate max-w-[160px]">
                        {category?.display_name_zh ?? draft.category_key}
                      </span>
                      {needsAttention && (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                      {draft.occurred_at ? (
                        <span>{formatDisplayDate(draft.occurred_at)}</span>
                      ) : (
                        <span className="text-rose-400">未設定日期</span>
                      )}
                      {draft.payment_method && (
                        <>
                          <span>·</span>
                          <span>{paymentMethodLabel(draft.payment_method)}</span>
                        </>
                      )}
                    </div>

                    {draft.note && (
                      <p className="text-xs text-slate-400 truncate leading-relaxed">{draft.note}</p>
                    )}
                  </div>

                  {/* Amount + actions */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <p className={`text-base font-bold tabular-nums leading-none ${
                      isIncome ? "text-emerald-400" : "text-rose-300"
                    }`}>
                      {isIncome ? "+" : "-"}{formatMoney(draft.amount)}
                    </p>

                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors"
                        onClick={() => setEditingIndex(index)}
                        aria-label="編輯此筆記錄"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        onClick={() => setDeleteTargetIndex(index)}
                        aria-label="刪除此筆記錄"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Warning inline action */}
                {needsAttention && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                    <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-300 flex-1">類別待確認</p>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200 transition-colors"
                      onClick={() => setEditingIndex(index)}
                    >
                      立即確認
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty state */}
      {drafts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
            <Save className="h-5 w-5 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">沒有待儲存的記錄</p>
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white text-sm"
            onClick={() => onGoToStep("quick-add")}
          >
            返回新增記錄
          </Button>
        </div>
      )}

      {/* ── Sticky save footer ── */}
      {drafts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-6 pt-4 pointer-events-none">
          <div className="pointer-events-auto max-w-2xl mx-auto">
            <Button
              onClick={() => setConfirmOpen(true)}
              className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:bg-emerald-600 min-h-[52px] text-base font-semibold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all duration-150"
              disabled={drafts.length === 0}
            >
              <Save className="mr-2 h-4 w-4" />
              確認儲存 {drafts.length} 筆記錄
            </Button>
          </div>
        </div>
      )}

      {/* ── Save confirmation dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border-white/15 text-white max-w-sm rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-semibold text-white">
              確認儲存 {drafts.length} 筆記錄？
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-left">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {totalIncome > 0 && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">收入</p>
                      <p className="mt-0.5 text-base font-bold text-emerald-300 tabular-nums">
                        +{formatMoney(totalIncome)}
                      </p>
                    </div>
                  )}
                  {totalExpense > 0 && (
                    <div className={`rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 ${totalIncome === 0 ? "col-span-2" : ""}`}>
                      <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-widest">支出</p>
                      <p className="mt-0.5 text-base font-bold text-rose-300 tabular-nums">
                        -{formatMoney(totalExpense)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Parse errors */}
                {parseErrorCount > 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-300">
                      有 <span className="font-semibold">{parseErrorCount}</span> 筆金額未能自動解析，請確認金額欄位已正確填寫，或儲存後再手動修改。
                    </p>
                  </div>
                )}

                {/* Category warnings */}
                {warningCount > 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">
                      仍有 <span className="font-semibold">{warningCount}</span> 筆類別未確認，儲存後仍可在記錄中修改。
                    </p>
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  儲存後將寫入記帳記錄，如需修改可從主頁的記錄清單中找到並編輯。
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 mt-1">
            <Button
              className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold min-h-[48px] text-sm"
              onClick={() => {
                setConfirmOpen(false)
                onSaveDrafts({ allowIncomplete: true })
              }}
            >
              <Save className="mr-1.5 h-4 w-4" />
              儲存完成，回到首頁
            </Button>
            <Button
              variant="ghost"
              className="w-full border border-white/15 text-slate-400 hover:text-white hover:bg-white/10 text-sm"
              onClick={() => setConfirmOpen(false)}
            >
              繼續編輯
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={deleteTargetIndex !== null}
        onOpenChange={open => {
          if (!open) setDeleteTargetIndex(null)
        }}
      >
        <DialogContent className="bg-slate-900 border-white/15 text-white max-w-sm rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-semibold text-white">確認刪除這筆明細？</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-left">
                {deleteTarget && (
                  <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5">
                    <p className="text-sm font-medium text-white truncate">{deleteTargetCategory}</p>
                    <p className="mt-1 text-xs text-slate-400">{deleteTarget.note || "無備註"}</p>
                    <p className="mt-1.5 text-sm font-semibold text-rose-300">
                      {(deleteTarget.direction === "income" ? "+" : "-") + formatMoney(deleteTarget.amount)}
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  刪除後此筆將從待確認清單移除，你可以回到輸入頁重新解析或手動新增。
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 mt-1">
            <Button
              variant="ghost"
              className="flex-1 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10"
              onClick={() => setDeleteTargetIndex(null)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white hover:bg-rose-400 font-semibold"
              onClick={confirmDeleteDraft}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
