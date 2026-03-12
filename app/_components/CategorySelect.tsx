"use client"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TAXONOMY_GROUPS, CATEGORY_BY_KEY } from "@/app/_lib/taxonomy"
import { categoryFullLabel } from "@/app/_lib/utils"

interface Props {
  readonly value: string
  readonly onValueChange: (key: string) => void
  readonly className?: string
}

export function CategorySelect({ value, onValueChange, className }: Props) {
  const selectedLabel = value ? categoryFullLabel(value) : ""

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={
          className ??
          "w-full rounded-md border border-white/20 bg-slate-950/80 px-3 py-2.5 text-sm text-white min-h-[44px] focus:ring-indigo-400"
        }
      >
        <SelectValue placeholder="選擇類別">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-white/20 text-white max-h-72">
        {TAXONOMY_GROUPS.map(group => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-slate-400 text-xs py-1.5 px-2">
              {group.label}
            </SelectLabel>
            {group.keys.map(key => {
              const category = CATEGORY_BY_KEY.get(key)
              if (!category) return null
              const fullLabel = `${group.label}-${category.display_name_zh}`
              return (
                <SelectItem
                  key={key}
                  value={key}
                  textValue={fullLabel}
                  className="text-white focus:bg-white/10 focus:text-white pl-4"
                >
                  {category.display_name_zh}
                </SelectItem>
              )
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
