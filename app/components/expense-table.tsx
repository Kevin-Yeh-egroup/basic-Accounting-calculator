"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
        <CardTitle className="flex justify-between items-center">
          支出明細表
          <div className="flex items-center gap-2">
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
      </CardContent>
    </Card>
  )
}
