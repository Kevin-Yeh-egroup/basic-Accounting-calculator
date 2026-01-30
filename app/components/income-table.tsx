"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface Income {
  date: string
  weather?: string
  customerCount?: number
  category: string
  type: string
  description: string
  unitPrice: number
  quantity: number
  paymentStatus: string
  subtotal: number
  customerNote?: string
}

interface IncomeTableProps {
  incomes: Income[]
}

type SortField = "date" | "weather" | "customerCount" | "category" | "type" | "description" | "unitPrice" | "quantity" | "paymentStatus" | "subtotal" | "customerNote"
type SortDirection = "asc" | "desc" | null

export default function IncomeTable({ incomes }: IncomeTableProps) {
  const [copied, setCopied] = useState(false)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const totalIncome = incomes.reduce((sum, item) => sum + item.subtotal, 0)

  const sortFieldOptions: { value: SortField; label: string }[] = [
    { value: "date", label: "日期" },
    { value: "weather", label: "天氣" },
    { value: "customerCount", label: "來客數" },
    { value: "category", label: "分類" },
    { value: "type", label: "類別" },
    { value: "description", label: "收入內容/說明" },
    { value: "unitPrice", label: "單價" },
    { value: "quantity", label: "數量" },
    { value: "paymentStatus", label: "收款狀況" },
    { value: "subtotal", label: "小計" },
    { value: "customerNote", label: "客戶記錄/備註" },
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

  const sortedIncomes = [...incomes].sort((a, b) => {
    if (!sortField || !sortDirection) return 0

    let aValue: any
    let bValue: any

    switch (sortField) {
      case "date":
        aValue = new Date(a.date).getTime()
        bValue = new Date(b.date).getTime()
        break
      case "weather":
        aValue = (a.weather || "").toLowerCase()
        bValue = (b.weather || "").toLowerCase()
        break
      case "customerCount":
        aValue = a.customerCount ?? 0
        bValue = b.customerCount ?? 0
        break
      case "category":
        aValue = a.category.toLowerCase()
        bValue = b.category.toLowerCase()
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
      case "paymentStatus":
        aValue = a.paymentStatus.toLowerCase()
        bValue = b.paymentStatus.toLowerCase()
        break
      case "subtotal":
        aValue = a.subtotal
        bValue = b.subtotal
        break
      case "customerNote":
        aValue = (a.customerNote || "").toLowerCase()
        bValue = (b.customerNote || "").toLowerCase()
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
    const headers = [
      "日期",
      "天氣",
      "來客數",
      "分類",
      "類別",
      "收入內容/說明",
      "單價",
      "數量",
      "收款狀況",
      "小計",
      "客戶記錄/備註",
    ]

    // 創建表格內容
    const rows = sortedIncomes.map((income) => [
      income.date,
      income.weather || "",
      income.customerCount?.toString() || "",
      income.category,
      income.type,
      income.description,
      income.unitPrice.toString(),
      income.quantity.toString(),
      income.paymentStatus,
      income.subtotal.toString(),
      income.customerNote || "",
    ])

    // 添加總計行
    rows.push(["總計", "", "", "", "", "", "", "", "", totalIncome.toString(), ""])

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
          <span>收入明細表</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-green-600">
              總計: ${totalIncome.toLocaleString()}
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
            {sortedIncomes.map((income, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold leading-snug break-words">{income.description}</div>
                    <div className="text-xs text-muted-foreground">{income.type}</div>
                  </div>
                  <div className="w-1/3 text-right">
                    <div className="text-lg font-bold text-green-600">${income.subtotal.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">小計</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{income.category}</Badge>
                  <Badge variant={income.paymentStatus === "已收款" ? "default" : "destructive"}>
                    {income.paymentStatus}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">日期</dt>
                    <dd>{income.date}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">天氣</dt>
                    <dd>{income.weather || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">來客數</dt>
                    <dd>{income.customerCount ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">單價</dt>
                    <dd>${income.unitPrice.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">數量</dt>
                    <dd>{income.quantity}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">備註</dt>
                    <dd className="break-words">{income.customerNote || "-"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="font-semibold">總計</span>
            <span className="font-semibold text-green-600">${totalIncome.toLocaleString()}</span>
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
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("weather")}>
                      天氣
                      {sortField === "weather" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("customerCount")}>
                      來客數
                      {sortField === "customerCount" ? (
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
                      收入內容/說明
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
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("paymentStatus")}>
                      收款狀況
                      {sortField === "paymentStatus" ? (
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
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 hover:bg-muted" onClick={() => handleSort("customerNote")}>
                      客戶記錄/備註
                      {sortField === "customerNote" ? (
                        sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIncomes.map((income, index) => (
                  <TableRow key={index}>
                    <TableCell>{income.date}</TableCell>
                    <TableCell>{income.weather || "-"}</TableCell>
                    <TableCell>{income.customerCount || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{income.category}</Badge>
                    </TableCell>
                    <TableCell>{income.type}</TableCell>
                    <TableCell>{income.description}</TableCell>
                    <TableCell>${income.unitPrice.toLocaleString()}</TableCell>
                    <TableCell>{income.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={income.paymentStatus === "已收款" ? "default" : "destructive"}>
                        {income.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">${income.subtotal.toLocaleString()}</TableCell>
                    <TableCell>{income.customerNote || "-"}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={9} className="text-right font-bold">
                    總計
                  </TableCell>
                  <TableCell className="font-bold text-green-600">${totalIncome.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
