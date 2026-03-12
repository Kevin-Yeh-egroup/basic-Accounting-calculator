"use client"

import { useRef } from "react"
import { ArrowLeft, ArrowRight, Mic, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PaymentMethodSelect } from "@/app/_components/PaymentMethodSelect"
import {
  categoryLabel, paymentMethodFieldLabel, shiftDateByDays, formatEntryDateLabel,
} from "@/app/_lib/utils"
import type { PageStep, InputMode, PaymentMethod } from "@/app/_lib/types"

interface EntryCategory {
  readonly category_key: string
  readonly direction: string
  readonly domain: string
  readonly display_name_zh: string
}

export interface NewEntryViewProps {
  readonly entryEditingId: string | null
  readonly entryDirection: "expense" | "income"
  readonly entryDomain: "life" | "business"
  readonly entryCategory: string
  readonly entryPaymentMethod: PaymentMethod
  readonly entryCalcDisplay: string
  readonly entryNote: string
  readonly entryDate: string
  readonly entryAdvancedMode: "none" | "text" | "file"
  readonly entryCategoryNeedsAttention: boolean
  readonly entryCategories: EntryCategory[]
  readonly singleText: string
  readonly isListening: boolean
  readonly isSpeechSupported: boolean
  readonly speechPreview: string
  readonly speechError: string | null
  readonly uploadedFile: File | null
  readonly uploadKind: string
  readonly photoAmount: string
  readonly photoNote: string
  readonly isFileParsing: boolean
  readonly onGoToStep: (step: PageStep) => void
  readonly onBanner: (msg: string | null) => void
  readonly onEntryDirectionChange: (dir: "expense" | "income") => void
  readonly onEntryDomainChange: (dom: "life" | "business") => void
  readonly onEntryCategoryChange: (cat: string) => void
  readonly onEntryPaymentMethodChange: (method: PaymentMethod) => void
  readonly onEntryCalcDisplayChange: (updater: string | ((prev: string) => string)) => void
  readonly onEntryNoteChange: (note: string) => void
  readonly onEntryDateChange: (updater: string | ((prev: string) => string)) => void
  readonly onEntryAdvancedModeChange: (mode: "none" | "text" | "file") => void
  readonly onEntryImportAdvancedOpenChange: (open: boolean) => void
  readonly onEntryEditingIdChange: (id: string | null) => void
  readonly onEntryCategoryNeedsAttentionChange: (val: boolean) => void
  readonly onSingleTextChange: (val: string) => void
  readonly onPhotoAmountChange: (val: string) => void
  readonly onPhotoNoteChange: (val: string) => void
  readonly onToggleSpeechInput: () => void
  readonly onFilePicked: (file: File | null) => void
  readonly onParseInput: (mode?: InputMode) => void
  readonly onSaveQuickEntry: () => void
  readonly onDeleteEntryEditing: () => void
  readonly onStartSmartEntry: (mode?: InputMode) => void
}

export function NewEntryView({
  entryEditingId,
  entryDirection,
  entryDomain,
  entryCategory,
  entryPaymentMethod,
  entryCalcDisplay,
  entryNote,
  entryDate,
  entryAdvancedMode,
  entryCategoryNeedsAttention,
  entryCategories,
  singleText,
  isListening,
  isSpeechSupported,
  speechPreview,
  speechError,
  uploadedFile,
  uploadKind,
  photoAmount,
  photoNote,
  isFileParsing,
  onGoToStep,
  onBanner,
  onEntryDirectionChange,
  onEntryDomainChange,
  onEntryCategoryChange,
  onEntryPaymentMethodChange,
  onEntryCalcDisplayChange,
  onEntryNoteChange,
  onEntryDateChange,
  onEntryAdvancedModeChange,
  onEntryImportAdvancedOpenChange,
  onEntryEditingIdChange,
  onEntryCategoryNeedsAttentionChange,
  onSingleTextChange,
  onPhotoAmountChange,
  onPhotoNoteChange,
  onToggleSpeechInput,
  onFilePicked,
  onParseInput,
  onSaveQuickEntry,
  onDeleteEntryEditing,
  onStartSmartEntry,
}: NewEntryViewProps) {
  const entryCategorySectionRef = useRef<HTMLDivElement | null>(null)
  const entryDateInputRef = useRef<HTMLInputElement | null>(null)

  function calcPress(key: string) {
    onEntryCalcDisplayChange(prev => {
      if (key === "AC") return "0"
      if (key === "⌫") return prev.length <= 1 ? "0" : prev.slice(0, -1)
      if (key === "." && prev.includes(".")) return prev
      if (key === "=" || key === "OK") {
        try {
          const expression = prev.replaceAll("×", "*").replaceAll("÷", "/")
          const result = Function(`"use strict"; return (${expression})`)()
          if (typeof result === "number" && Number.isFinite(result)) {
            return String(Math.round(Math.abs(result)))
          }
        } catch {
          /* keep current display */
        }
        return prev
      }

      if (["+", "-", "×", "÷"].includes(key)) {
        const lastChar = prev.at(-1) ?? ""
        if (["+", "-", "×", "÷"].includes(lastChar)) {
          return prev.slice(0, -1) + key
        }
        return prev + key
      }

      if (prev === "0" && key !== ".") return key
      return prev + key
    })
  }

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

  function openEntryDatePicker() {
    const input = entryDateInputRef.current
    if (!input) return
    input.focus()
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void }
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker()
      return
    }
    input.click()
  }

  function focusEntryCategorySelection() {
    const section = entryCategorySectionRef.current
    if (!section) return
    section.scrollIntoView({ behavior: "smooth", block: "start" })
    globalThis.setTimeout(() => {
      const firstOption = section.querySelector<HTMLButtonElement>("[data-entry-category-option]")
      if (firstOption) {
        firstOption.focus()
        return
      }
      section.focus()
    }, 250)
  }

  function renderEntryCategorySection() {
    if (entryAdvancedMode !== "none") return null

    const needsCategoryHint = entryCategoryNeedsAttention && !entryCategory
    const categorySectionTone = needsCategoryHint
      ? "border-amber-300/40 bg-amber-500/10 ring-1 ring-amber-400/20"
      : "border-white/10 bg-white/0"

    return (
      <>
        <div
          ref={entryCategorySectionRef}
          tabIndex={-1}
          className={`mb-3 rounded-xl border p-2.5 transition-colors focus:outline-none ${categorySectionTone}`}
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
            <p className="text-[11px] text-slate-400">請選擇一個類型</p>
            {needsCategoryHint && (
              <span className="text-[11px] text-amber-200 text-right">先點一個最接近的類型，再繼續儲存</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-h-[180px] overflow-y-auto pr-1">
            {entryCategories.map(cat => {
              const isActive = entryCategory === cat.category_key
              let categoryButtonTone = "bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 active:bg-white/15"

              if (isActive) {
                categoryButtonTone =
                  entryDirection === "expense"
                    ? "bg-rose-500/20 border border-rose-400/50 text-rose-200"
                    : "bg-emerald-500/20 border border-emerald-400/50 text-emerald-200"
              }

              return (
                <button
                  key={cat.category_key}
                  type="button"
                  data-entry-category-option
                  onClick={() => {
                    onEntryCategoryChange(cat.category_key)
                    if (entryCategoryNeedsAttention) {
                      onEntryCategoryNeedsAttentionChange(false)
                      onBanner(null)
                    }
                  }}
                  className={`flex flex-col items-center justify-center rounded-lg py-2 px-1 min-h-[56px] text-center transition-colors ${categoryButtonTone}`}
                >
                  <span className="text-xs leading-tight">{cat.display_name_zh}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-white/15 bg-slate-950/60 p-2.5 mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">金額</span>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-wide text-right truncate">
              {entryCalcDisplay === "0" ? "$0" : `$${entryCalcDisplay}`}
            </p>
          </div>
          <Input
            value={entryNote}
            onChange={e => onEntryNoteChange(e.target.value)}
            className="bg-slate-950/60 border-white/20 text-white text-sm min-h-[40px]"
            placeholder="輸入備註"
          />
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 px-0.5">{paymentMethodFieldLabel(entryDirection)}</p>
            <PaymentMethodSelect
              value={entryPaymentMethod}
              direction={entryDirection}
              onValueChange={method => onEntryPaymentMethodChange(method)}
              className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white min-h-[40px] focus:ring-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2">
            {entryCategory ? (
              <Badge variant="outline" className="border-white/20 text-slate-200 text-[10px]">
                {categoryLabel(entryCategory)}
              </Badge>
            ) : (
              <span className={`text-[11px] ${needsCategoryHint ? "text-amber-200" : "text-slate-400"}`}>
                {needsCategoryHint ? "請先到上方點選一個類型" : "請先在上方選擇一個類型"}
              </span>
            )}
          </div>
        </div>
      </>
    )
  }

  const isEditing = entryEditingId !== null
  const CALC_KEYS = [
    ["7", "8", "9", "÷", "AC"],
    ["4", "5", "6", "×", "⌫"],
    ["1", "2", "3", "+", "="],
    ["00", "0", ".", "-", ""],
  ]
  const calcAmount = calcEvaluate()

  // Suppress unused variable warning - focusEntryCategorySelection is used via onSaveQuickEntry flow
  void focusEntryCategorySelection

  return (
    <div className="flex flex-col min-h-[calc(100dvh-60px)]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Button
          type="button"
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[40px] text-sm"
          onClick={() => {
            onGoToStep("home")
            onEntryAdvancedModeChange("none")
            onEntryImportAdvancedOpenChange(false)
            onEntryEditingIdChange(null)
          }}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          返回
        </Button>
        <Badge variant="outline" className={`text-xs ${isEditing ? "border-amber-300/40 bg-amber-500/10 text-amber-200" : "border-indigo-300/40 bg-indigo-500/10 text-indigo-200"}`}>
          {isEditing ? "編輯交易" : "手動輸入"}
        </Badge>
        {isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-rose-300/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 min-h-[40px] text-xs px-3"
            onClick={onDeleteEntryEditing}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            刪除
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-indigo-400/60 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/30 hover:text-white hover:border-indigo-400/80 min-h-[36px] text-xs px-3 gap-1.5 transition-all"
            onClick={() => onStartSmartEntry()}
          >
            <Sparkles className="h-3.5 w-3.5" />
            切換智慧輸入
          </Button>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
        <div className="flex rounded-full border border-white/20 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onEntryDirectionChange("expense")
              onEntryCategoryChange("")
            }}
            className={`px-5 py-1.5 text-sm font-medium transition-colors ${
              entryDirection === "expense"
                ? "bg-rose-500 text-white"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => {
              onEntryDirectionChange("income")
              onEntryCategoryChange("")
            }}
            className={`px-5 py-1.5 text-sm font-medium transition-colors ${
              entryDirection === "income"
                ? "bg-emerald-500 text-white"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            收入
          </button>
        </div>
        <div className="flex rounded-full border border-white/20 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onEntryDomainChange("life")
              onEntryCategoryChange("")
            }}
            className={`px-5 py-1.5 text-sm font-medium transition-colors ${
              entryDomain === "life"
                ? "bg-sky-500 text-white"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            生活
          </button>
          <button
            type="button"
            onClick={() => {
              onEntryDomainChange("business")
              onEntryCategoryChange("")
            }}
            className={`px-5 py-1.5 text-sm font-medium transition-colors ${
              entryDomain === "business"
                ? "bg-violet-500 text-white"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            生意
          </button>
        </div>
      </div>

      {renderEntryCategorySection()}

      <div className="flex items-center justify-between gap-1.5 mb-2">
        <Button
          type="button"
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[38px] min-w-[38px] shrink-0 px-0"
          onClick={() => onEntryDateChange(prev => shiftDateByDays(prev, -1))}
          aria-label="前一天"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={openEntryDatePicker}
            className="w-full flex items-center justify-center min-h-[38px] rounded-md border border-white/20 bg-slate-950/60 hover:bg-slate-950/40 transition-colors"
          >
            <span className="text-xs sm:text-sm font-medium text-white select-none">{formatEntryDateLabel(entryDate)}</span>
          </button>
          <input
            ref={entryDateInputRef}
            type="date"
            value={entryDate}
            onChange={e => {
              if (e.target.value) onEntryDateChange(e.target.value)
            }}
            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[38px] min-w-[38px] shrink-0 px-0"
          onClick={() => onEntryDateChange(prev => shiftDateByDays(prev, 1))}
          aria-label="後一天"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1.5">
        {CALC_KEYS.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
            {row.map((key, colIndex) => {
              if (key === "" && rowIndex === 3 && colIndex === 4) {
                return (
                  <button
                    key="save-btn"
                    type="button"
                    onClick={onSaveQuickEntry}
                    disabled={calcAmount <= 0}
                    className="rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm min-h-[48px] transition-colors"
                  >
                    {isEditing ? "更新" : "儲存"}
                  </button>
                )
              }

              const isOp = ["+", "-", "×", "÷"].includes(key)
              const isEquals = key === "="
              const isClear = key === "AC"
              const isBack = key === "⌫"

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  onClick={() => calcPress(key)}
                  className={`rounded-xl min-h-[48px] text-base font-medium transition-colors active:scale-95 ${
                    isEquals
                      ? "bg-amber-500 text-white hover:bg-amber-400"
                      : isOp
                        ? "bg-indigo-500/80 text-white hover:bg-indigo-400"
                        : isClear
                          ? "bg-rose-500/80 text-white hover:bg-rose-400"
                          : isBack
                            ? "bg-slate-500/70 text-slate-100 hover:bg-slate-400/70"
                            : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {entryAdvancedMode === "text" && (
        <div className="flex-1 space-y-3">
          <p className="text-xs text-slate-300">輸入多筆或使用語音，系統會自動判斷收入/支出與類別，完成後前往確認頁。</p>
          <Textarea
            value={singleText}
            onChange={e => onSingleTextChange(e.target.value)}
            className="min-h-[120px] bg-slate-950/60 border-white/20 text-white text-sm placeholder:text-slate-400"
            placeholder="早餐 65、咖啡 80、捷運 30"
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
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[44px] text-sm"
              onClick={() => onEntryAdvancedModeChange("none")}
            >
              返回計算機
            </Button>
          </div>
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
          <Button
            onClick={() => onParseInput("text_single")}
            className="w-full bg-indigo-500 text-white hover:bg-indigo-400 min-h-[48px] text-base"
            disabled={!singleText.trim()}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            解析並前往確認
          </Button>
        </div>
      )}

      {entryAdvancedMode === "file" && (
        <div className="flex-1 space-y-3">
          <p className="text-xs text-slate-300">測試模式：可上傳任意檔案，解析後會產生測試內容供確認。</p>
          <Input
            type="file"
            className="bg-slate-950/60 border-white/20 text-slate-200 file:text-slate-200 min-h-[44px]"
            onChange={event => onFilePicked(event.target.files?.[0] ?? null)}
          />
          {uploadedFile && (
            <p className="text-xs text-slate-400">
              已上傳：{uploadedFile.name}（測試檔案）
            </p>
          )}
          {uploadKind === "image" && uploadedFile && (
            <>
              <Input
                type="number"
                min={0}
                value={photoAmount}
                onChange={e => onPhotoAmountChange(e.target.value)}
                className="bg-slate-950/60 border-white/20 text-white min-h-[44px]"
                placeholder="金額（必填）"
              />
              <Textarea
                value={photoNote}
                onChange={e => onPhotoNoteChange(e.target.value)}
                className="min-h-[80px] bg-slate-950/60 border-white/20 text-white placeholder:text-slate-400 text-sm"
                placeholder="備註（店名、用途）"
              />
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 min-h-[44px] text-sm"
              onClick={() => {
                onEntryAdvancedModeChange("none")
                onEntryImportAdvancedOpenChange(false)
              }}
            >
              返回計算機
            </Button>
            <Button
              onClick={() => onParseInput("file_import")}
              className="bg-indigo-500 text-white hover:bg-indigo-400 min-h-[44px] text-sm"
              disabled={isFileParsing || !uploadedFile}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              解析確認
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
