"use client"

import { ArrowLeft, ArrowRight, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CategorySelect } from "@/app/_components/CategorySelect"
import { PaymentMethodSelect } from "@/app/_components/PaymentMethodSelect"
import { CATEGORY_BY_KEY } from "@/app/_lib/taxonomy"
import {
  domainLabel,
  directionLabel,
  modeLabel,
  importStatusLabel,
  normalizePaymentMethod,
  paymentMethodFieldLabel,
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
  readonly onSaveDrafts: () => void
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
  const selectedCount = drafts.length

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
          onClick={() => {
            onGoToStep("quick-add")
            onBanner(null)
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
                        onUpdateDraft(index, item => ({
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
                            onUpdateDraft(index, item => ({
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
                            onClick={() => onShiftDraftDate(index, -1)}
                            aria-label="日期往前一天"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <Input
                            type="date"
                            data-draft-date={index}
                            value={draft.occurred_at}
                            onChange={event => onUpdateDraft(index, item => ({ ...item, occurred_at: event.target.value }))}
                            className={`w-full flex-1 bg-slate-950/60 text-white min-h-[44px] [color-scheme:dark] ${
                              !draft.occurred_at ? "border-rose-400/60 ring-1 ring-rose-400/30" : "border-white/20"
                            }`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10"
                            onClick={() => onShiftDraftDate(index, 1)}
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
                          onUpdateDraft(index, item => ({
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
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 px-0.5">{paymentMethodFieldLabel(draft.direction)}</p>
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
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-slate-300 hover:text-white hover:bg-white/10 shrink-0 h-9 w-9"
                    onClick={() => onDraftsChange(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
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
        onClick={onSaveDrafts}
        className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 min-h-[48px] text-base"
        disabled={drafts.length === 0}
      >
        <Save className="mr-2 h-4 w-4" />
        儲存並回主頁
      </Button>
    </div>
  )
}
