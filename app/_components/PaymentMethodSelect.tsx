"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PAYMENT_METHOD_OPTIONS } from "@/app/_lib/constants"
import { normalizePaymentMethod, paymentMethodLabel, paymentMethodFieldLabel } from "@/app/_lib/utils"
import type { PaymentMethod, Direction } from "@/app/_lib/types"

interface Props {
  readonly value: PaymentMethod
  readonly onValueChange: (method: PaymentMethod) => void
  readonly direction: Exclude<Direction, "unknown">
  readonly className?: string
}

export function PaymentMethodSelect({ value, onValueChange, direction, className }: Props) {
  const selectedLabel = paymentMethodLabel(value)
  const fieldLabel = paymentMethodFieldLabel(direction)

  return (
    <Select value={value} onValueChange={next => onValueChange(normalizePaymentMethod(next))}>
      <SelectTrigger
        className={
          className ??
          "w-full rounded-md border border-white/20 bg-slate-950/80 px-3 py-2.5 text-sm text-white min-h-[44px] focus:ring-indigo-400"
        }
      >
        <SelectValue placeholder={`選擇${fieldLabel}`}>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-white/20 text-white max-h-72">
        {PAYMENT_METHOD_OPTIONS.map(option => (
          <SelectItem
            key={option.value}
            value={option.value}
            textValue={option.label}
            className="text-white focus:bg-white/10 focus:text-white"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
