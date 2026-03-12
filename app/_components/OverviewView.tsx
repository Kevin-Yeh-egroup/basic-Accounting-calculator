"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CategorySelect } from "@/app/_components/CategorySelect"
import { PaymentMethodSelect } from "@/app/_components/PaymentMethodSelect"
import {
  formatMoney,
  categoryLabel,
  paymentMethodLabel,
  paymentMethodFieldLabel,
  modeLabel,
} from "@/app/_lib/utils"
import type {
  Transaction,
  PageStep,
  OverviewDirectionFilter,
  TransactionEditDraft,
} from "@/app/_lib/types"

export interface OverviewViewProps {
  readonly transactions: Transaction[]
  readonly overviewDirectionFilter: OverviewDirectionFilter
  readonly overviewQuery: string
  readonly overviewTransactions: Transaction[]
  readonly overviewFilterStats: { all: number; income: number; expense: number }
  readonly editingTransactionId: string | null
  readonly editDraft: TransactionEditDraft | null
  readonly onGoToStep: (step: PageStep) => void
  readonly onCancelEditTransaction: () => void
  readonly onOverviewDirectionFilterChange: (filter: OverviewDirectionFilter) => void
  readonly onOverviewQueryChange: (query: string) => void
  readonly onStartEditTransaction: (item: Transaction) => void
  readonly onSaveEditedTransaction: () => void
  readonly onRemoveTransaction: (id: string) => void
  readonly onEditDraftChange: (updater: TransactionEditDraft | null | ((prev: TransactionEditDraft | null) => TransactionEditDraft | null)) => void
}

export function OverviewView({
  transactions,
  overviewDirectionFilter,
  overviewQuery,
  overviewTransactions,
  overviewFilterStats,
  editingTransactionId,
  editDraft,
  onGoToStep,
  onCancelEditTransaction,
  onOverviewDirectionFilterChange,
  onOverviewQueryChange,
  onStartEditTransaction,
  onSaveEditedTransaction,
  onRemoveTransaction,
  onEditDraftChange,
}: OverviewViewProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
          onClick={() => {
            onGoToStep("home")
            onCancelEditTransaction()
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
              onClick={() => onOverviewDirectionFilterChange("all")}
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
              onClick={() => onOverviewDirectionFilterChange("income")}
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
              onClick={() => onOverviewDirectionFilterChange("expense")}
            >
              支出（{overviewFilterStats.expense}）
            </Button>
          </div>
          <Input
            value={overviewQuery}
            onChange={event => onOverviewQueryChange(event.target.value)}
            className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
            placeholder="搜尋關鍵字（日期、備註、類別、付款方式）"
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
                          <span className="text-[10px] sm:text-[11px] text-slate-400">
                            {paymentMethodFieldLabel(item.direction)}：{paymentMethodLabel(item.payment_method)}
                          </span>
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
                        onClick={() => onStartEditTransaction(item)}
                      >
                        編輯
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 min-h-[40px]"
                        onClick={() => onRemoveTransaction(item.id)}
                      >
                        刪除
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Textarea
                      value={editDraft.note}
                      onChange={event => onEditDraftChange(previous => (previous ? { ...previous, note: event.target.value } : previous))}
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
                            onEditDraftChange(previous => (previous ? { ...previous, amount: event.target.value } : previous))
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
                            onEditDraftChange(previous => (previous ? { ...previous, occurred_at: event.target.value } : previous))
                          }
                          className="w-full bg-slate-950/60 border-white/20 text-white min-h-[44px] [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <CategorySelect
                      value={editDraft.category_key}
                      onValueChange={key =>
                        onEditDraftChange(previous => (previous ? { ...previous, category_key: key } : previous))
                      }
                    />
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 px-0.5">{paymentMethodFieldLabel(item.direction)}</p>
                      <PaymentMethodSelect
                        value={editDraft.payment_method}
                        direction={item.direction === "income" ? "income" : "expense"}
                        onValueChange={method =>
                          onEditDraftChange(previous => (previous ? { ...previous, payment_method: method } : previous))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <Button
                        type="button"
                        className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 min-h-[40px] text-sm"
                        onClick={onSaveEditedTransaction}
                      >
                        儲存
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
                        onClick={onCancelEditTransaction}
                      >
                        取消
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 min-h-[40px] text-sm"
                        onClick={() => onRemoveTransaction(item.id)}
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
