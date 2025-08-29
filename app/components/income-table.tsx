"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

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

export default function IncomeTable({ incomes }: IncomeTableProps) {
  const [copied, setCopied] = useState(false)
  const totalIncome = incomes.reduce((sum, item) => sum + item.subtotal, 0)

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
    const rows = incomes.map((income) => [
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
        <CardTitle className="flex justify-between items-center">
          收入明細表
          <div className="flex items-center gap-2">
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>天氣</TableHead>
                <TableHead>來客數</TableHead>
                <TableHead>分類</TableHead>
                <TableHead>類別</TableHead>
                <TableHead>收入內容/說明</TableHead>
                <TableHead>單價</TableHead>
                <TableHead>數量</TableHead>
                <TableHead>收款狀況</TableHead>
                <TableHead>小計</TableHead>
                <TableHead>客戶記錄/備註</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.map((income, index) => (
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
      </CardContent>
    </Card>
  )
}
