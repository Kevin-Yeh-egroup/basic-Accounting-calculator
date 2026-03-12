"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, FileUp, Mic, NotebookPen, Save, Sparkles, Trash2 } from "lucide-react"
import { PaymentMethodSelect } from "@/app/_components/PaymentMethodSelect"
import { TAXONOMY, CATEGORY_BY_KEY } from "@/app/_lib/taxonomy"
import { formatMoney, categoryLabel, paymentMethodFieldLabel, normalizePaymentMethod } from "@/app/_lib/utils"
import type { InputMode, PageStep, DraftTransaction } from "@/app/_lib/types"

export interface QuickAddViewProps {
  readonly activeMode: InputMode
  readonly singleText: string
  readonly isListening: boolean
  readonly isSpeechSupported: boolean
  readonly speechPreview: string
  readonly speechError: string | null
  readonly uploadedFiles: File[]
  readonly isFileParsing: boolean
  readonly drafts: DraftTransaction[]
  readonly fileImportTab: "expense" | "income"
  readonly onGoToStep: (step: PageStep) => void
  readonly onBanner: (msg: string | null) => void
  readonly onSingleTextChange: (val: string) => void
  readonly onSwitchQuickAddMode: (mode: InputMode) => void
  readonly onToggleSpeechInput: () => void
  readonly onFilesPicked: (files: File[]) => void
  readonly onParseInput: (mode?: InputMode) => void
  readonly onDraftsChange: (updater: DraftTransaction[] | ((prev: DraftTransaction[]) => DraftTransaction[])) => void
  readonly onBuildMockFileDrafts: (files: File[]) => DraftTransaction[]
  readonly onStartManualEntry: () => void
  readonly onUpdateDraft: (index: number, updater: (d: DraftTransaction) => DraftTransaction) => void
  readonly onShiftDraftDate: (index: number, days: number) => void
  readonly onFileImportTabChange: (tab: "expense" | "income") => void
  readonly onSaveDrafts: () => void
  readonly onRecognitionStop: () => void
  readonly onListeningChange: (val: boolean) => void
  readonly onSpeechPreviewChange: (val: string) => void
  readonly onSpeechErrorChange: (val: string | null) => void
}

export function QuickAddView({
  activeMode,
  singleText,
  isListening,
  isSpeechSupported,
  speechPreview,
  speechError,
  uploadedFiles,
  isFileParsing,
  drafts,
  fileImportTab,
  onGoToStep,
  onBanner,
  onSingleTextChange,
  onSwitchQuickAddMode,
  onToggleSpeechInput,
  onFilesPicked,
  onParseInput,
  onDraftsChange,
  onBuildMockFileDrafts,
  onStartManualEntry,
  onUpdateDraft,
  onShiftDraftDate,
  onFileImportTabChange,
  onSaveDrafts,
  onRecognitionStop,
  onListeningChange,
  onSpeechPreviewChange,
  onSpeechErrorChange,
}: QuickAddViewProps) {
  const isFileMode = activeMode === "file_import"
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
          onClick={() => {
            onRecognitionStop()
            onListeningChange(false)
            onSpeechPreviewChange("")
            onSpeechErrorChange(null)
            onGoToStep("home")
            onBanner(null)
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
            onClick={onStartManualEntry}
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
                onChange={event => onSingleTextChange(event.target.value)}
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
                  onClick={onToggleSpeechInput}
                >
                  <Mic className="mr-1.5 h-4 w-4 shrink-0" />
                  <span className="truncate">{isListening ? "停止語音" : "語音輸入"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] gap-1.5 border-white/20 bg-white/5 text-white hover:bg-white/10 text-sm"
                  onClick={() => onSwitchQuickAddMode("file_import")}
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
                onClick={() => onParseInput("text_single")}
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
                  onClick={() => onSwitchQuickAddMode("text_single")}
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
                  onChange={event => onFilesPicked(Array.from(event.target.files ?? []))}
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
                        onClick={() => onFileImportTabChange("expense")}
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
                        onClick={() => onFileImportTabChange("income")}
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
                      onClick={() => onDraftsChange(onBuildMockFileDrafts(uploadedFiles))}
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
                                  onChange={event => onUpdateDraft(index, item => ({ ...item, note: event.target.value }))}
                                  className="bg-transparent border-0 border-b border-white/10 rounded-none px-0 py-1 text-sm text-white focus-visible:ring-0 focus-visible:border-indigo-400 h-auto"
                                  placeholder="備註"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => onDraftsChange(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
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
                                    onUpdateDraft(index, item => ({
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
                                    onClick={() => onShiftDraftDate(index, -1)}
                                    aria-label="日期往前一天"
                                  >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                  </Button>
                                  <Input
                                    type="date"
                                    data-draft-date={index}
                                    value={draft.occurred_at}
                                    onChange={event => onUpdateDraft(index, item => ({ ...item, occurred_at: event.target.value }))}
                                    className={`flex-1 bg-slate-950/50 text-white text-xs h-8 px-1.5 [color-scheme:dark] ${
                                      !draft.occurred_at ? "border-rose-400/60 ring-1 ring-rose-400/30" : "border-white/10"
                                    }`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10"
                                    onClick={() => onShiftDraftDate(index, 1)}
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
                                onUpdateDraft(index, item => ({
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
                            <div className="space-y-0.5">
                              <p className="text-[9px] text-slate-500">
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
                                className="w-full rounded-md border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-white min-h-[32px]"
                              />
                            </div>
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
                    onClick={onSaveDrafts}
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
