"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface Expense {
  date: string
  category: string
  expenseCategory: string
  type: string
  description: string
  unitPrice: number
  quantity: number
  subtotal: number
}

interface ExpenseTableProps {
  expenses: Expense[]
}

type SortField = "date" | "category" | "expenseCategory" | "type" | "description" | "unitPrice" | "quantity" | "subtotal"
type SortDirection = "asc" | "desc" | null

export default function ExpenseTable({ expenses }: ExpenseTableProps) {
  const [copied, setCopied] = useState(false)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const totalExpense = expenses.reduce((sum, item) => sum + item.subtotal, 0)

  const sortFieldOptions: { value: SortField; label: string }[] = [
    { value: "date", label: "日期" },
    { value: "category", label: "分類" },
    { value: "expenseCategory", label: "支出分類" },
    { value: "type", label: "類別" },
    { value: "description", label: "支出內容" },
    { value: "unitPrice", label: "單價" },
    { value: "quantity", label: "數量" },
    { value: "subtotal", label: "小計" },
  ]

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 如果點擊同一個欄位，切換排序方向
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortDirection(null)
        setSortField(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      // 點擊新欄位，設為升序
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSortFieldChange = (value: string) => {
    if (value === "none") {
      setSortField(null)
      setSortDirection(null)
      return
    }

    setSortField(value as SortField)
    setSortDirection(sortDirection ?? "asc")
  }

  const handleSortDirectionChange = (value: string) => {
    if (!sortField) return
    setSortDirection(value as SortDirection)
  }

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (!sortField || !sortDirection) return 0

    let aValue: any
    let bValue: any

    switch (sortField) {
      case "date":
        aValue = new Date(a.date).getTime()
        bValue = new Date(b.date).getTime()
        break
      case "category":
        aValue = a.category.toLowerCase()
        bValue = b.category.toLowerCase()
        break
      case "expenseCategory":
        aValue = a.expenseCategory.toLowerCase()
        bValue = b.expenseCategory.toLowerCase()
        break
      case "type":
        aValue = a.type.toLowerCase()
        bValue = b.type.toLowerCase()
        break
      case "description":
        aValue = a.description.toLowerCase()
        bValue = b.description.toLowerCase()
        break
      case "unitPrice":
        aValue = a.unitPrice
        bValue = b.unitPrice
        break
      case "quantity":
        aValue = a.quantity
        bValue = b.quantity
        break
      case "subtotal":
        aValue = a.subtotal
        bValue = b.subtotal
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const copyToClipboard = () => {
    // 創建表頭
    const headers = ["日期", "分類", "支出分類", "類別", "支出內容", "單價", "數量", "小計"]

    // 創建表格內容
    const rows = sortedExpenses.map((expense) => [
      expense.date,
      expense.category,
      expense.expenseCategory,
      expense.type,
      expense.description,
      expense.unitPrice.toString(),
      expense.quantity.toString(),
      expense.subtotal.toString(),
    ])

    // 添加總計行
    rows.push(["總計", "", "", "", "", "", "", totalExpense.toString()])

    // 將表頭和內容合併為製表符分隔的文本
    const tsvContent = [headers, ...rows].map((row) => row.join("\t")).join("\n")

    // 複製到剪貼簿
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>支出明細表</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-red-600">
              總計: ${totalExpense.toLocaleString()}
            </Badge>
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-1">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已複製" : "複製表格"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="md:hidden space-y-3">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-sm font-medium">排序</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={sortField ?? "none"} onValueChange={handleSortFieldChange}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇欄位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不排序</SelectItem>
                  {sortFieldOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortDirection ?? "asc"}
                onValueChange={handleSortDirectionChange}
                disabled={!sortField}
              >
                <SelectTrigger>
                  <SelectValue placeholder="排序方向" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">升序</SelectItem>
                  <SelectItem value="desc">降序</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {sortedExpenses.map((expense, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold leading-snug break-words">{expense.description}</div>
                    <div className="text-xs text-muted-foreground">{expense.type}</div>
                  </div>
                  <div className="w-1/3 text-right">
                    <div className="text-lg font-bold text-red-600">${expense.subtotal.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">小計</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{expense.category}</Badge>
                  <Badge variant="outline">{expense.expenseCategory}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">日期</dt>
                    <dd>{expense.date}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">類別</dt>
                    <dd>{expense.type}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">單價</dt>
                    <dd>${expense.unitPrice.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">數量</dt>
                    <dd>{expense.quantity}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="font-semibold">總計</span>
            <span className="font-semibold text-red-600">${totalExpense.toLocaleString()}</span>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("date")}>
                      日期
                      {sortField === "date" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("category")}>
                      分類
                      {sortField === "category" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("expenseCategory")}>
                      支出分類
                      {sortField === "expenseCategory" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("type")}>
                      類別
                      {sortField === "type" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("description")}>
                      支出內容
                      {sortField === "description" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("unitPrice")}>
                      單價
                      {sortField === "unitPrice" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("quantity")}>
                      數量
                      {sortField === "quantity" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("subtotal")}>
                      小計
                      {sortField === "subtotal" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpenses.map((expense, index) => (
                  <TableRow key={index}>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{expense.category}</Badge>
                    </TableCell>
                    <TableCell>{expense.expenseCategory}</TableCell>
                    <TableCell>{expense.type}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>${expense.unitPrice.toLocaleString()}</TableCell>
                    <TableCell>{expense.quantity}</TableCell>
                    <TableCell className="font-semibold text-red-600">${expense.subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={7} className="text-right font-bold">
                    總計
                  </TableCell>
                  <TableCell className="font-bold text-red-600">${totalExpense.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
