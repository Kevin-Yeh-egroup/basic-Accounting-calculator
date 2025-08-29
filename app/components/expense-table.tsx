"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

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

export default function ExpenseTable({ expenses }: ExpenseTableProps) {
  const [copied, setCopied] = useState(false)
  const totalExpense = expenses.reduce((sum, item) => sum + item.subtotal, 0)

  const copyToClipboard = () => {
    // 創建表頭
    const headers = ["日期", "分類", "支出分類", "類別", "支出內容", "單價", "數量", "小計"]

    // 創建表格內容
    const rows = expenses.map((expense) => [
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
                <TableHead>日期</TableHead>
                <TableHead>分類</TableHead>
                <TableHead>支出分類</TableHead>
                <TableHead>類別</TableHead>
                <TableHead>支出內容</TableHead>
                <TableHead>單價</TableHead>
                <TableHead>數量</TableHead>
                <TableHead>小計</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense, index) => (
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
