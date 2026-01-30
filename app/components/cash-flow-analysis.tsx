"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, PieChart, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

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

interface CashFlowAnalysisProps {
  incomes: Income[]
  expenses: Expense[]
}

export default function CashFlowAnalysis({ incomes, expenses }: CashFlowAnalysisProps) {
  const [copied, setCopied] = useState(false)

  const totalIncome = incomes.reduce((sum, item) => sum + item.subtotal, 0)
  const totalExpense = expenses.reduce((sum, item) => sum + item.subtotal, 0)
  const netCashFlow = totalIncome - totalExpense

  // 分類計算
  const businessIncome = incomes
    .filter((item) => item.category.includes("生意"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const personalIncome = incomes
    .filter((item) => item.category.includes("生活"))
    .reduce((sum, item) => sum + item.subtotal, 0)

  const businessExpense = expenses
    .filter((item) => item.category.includes("生意"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const personalExpense = expenses
    .filter((item) => item.category.includes("生活"))
    .reduce((sum, item) => sum + item.subtotal, 0)

  // 營業成本計算 (原料、包材等變動支出)
  const businessCost = expenses
    .filter(
      (item) =>
        item.category.includes("生意") &&
        (item.expenseCategory.includes("變動") ||
          item.type.includes("原料") ||
          item.type.includes("包材") ||
          item.description.includes("原料") ||
          item.description.includes("進貨")),
    )
    .reduce((sum, item) => sum + item.subtotal, 0)

  // 毛利率計算
  const grossProfit = businessIncome - businessCost
  const grossProfitMargin = businessIncome > 0 ? (grossProfit / businessIncome) * 100 : 0

  // 帳戶分析
  const businessAccount = businessIncome - businessExpense
  const personalAccount = personalIncome - personalExpense
  const totalAccount = netCashFlow

  const getFinancialStatus = (amount: number) => {
    if (amount < -5000) return { status: "入不敷出", color: "destructive", icon: TrendingDown }
    if (amount >= -5000 && amount <= 5000) return { status: "接近打平", color: "secondary", icon: Minus }
    return { status: "收支有餘", color: "default", icon: TrendingUp }
  }

  const businessStatus = getFinancialStatus(businessAccount)
  const personalStatus = getFinancialStatus(personalAccount)
  const totalStatus = getFinancialStatus(totalAccount)

  // 緊急預備金建議（3-6個月生活支出）
  const monthlyLivingExpense = personalExpense
  const emergencyFundMin = monthlyLivingExpense * 3
  const emergencyFundMax = monthlyLivingExpense * 6

  // 判斷是否有生意收支
  const hasBusiness = businessIncome > 0 || businessExpense > 0

  const copyAnalysisToClipboard = () => {
    // 創建表頭和內容
    let content = "財務分析報告\n\n"

    content += "現金流分析\n"
    content += `總收入: $${totalIncome.toLocaleString()}\n`
    content += `總支出: $${totalExpense.toLocaleString()}\n`
    content += `淨現金流: $${netCashFlow.toLocaleString()}\n\n`

    if (hasBusiness) {
      content += "營業分析\n"
      content += `營業收入: $${businessIncome.toLocaleString()}\n`
      content += `營業支出: $${businessExpense.toLocaleString()}\n`
      content += `營業淨利: $${businessAccount.toLocaleString()}\n`
      content += `營業成本: $${businessCost.toLocaleString()}\n`
      content += `毛利: $${grossProfit.toLocaleString()}\n`
      content += `毛利率: ${grossProfitMargin.toFixed(2)}%\n\n`
    }

    content += "生活收支分析\n"
    content += `生活收入: $${personalIncome.toLocaleString()}\n`
    content += `生活支出: $${personalExpense.toLocaleString()}\n`
    content += `生活淨收支: $${personalAccount.toLocaleString()}\n\n`

    content += "緊急預備金建議\n"
    content += `最低建議(3個月): $${emergencyFundMin.toLocaleString()}\n`
    content += `理想目標(6個月): $${emergencyFundMax.toLocaleString()}\n`

    // 複製到剪貼簿
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              財務分析與現金流評估
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAnalysisToClipboard}
              className="flex w-full items-center justify-center gap-1 sm:w-auto"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已複製" : "複製分析"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 總帳分析 */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">總帳</h3>
                <div className="text-2xl font-bold mb-2">${totalAccount.toLocaleString()}</div>
                <Badge variant={totalStatus.color} className="mb-4">
                  <totalStatus.icon className="w-4 h-4 mr-1" />
                  {totalStatus.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>總收入</span>
                  <span className="text-green-600">${totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>總支出</span>
                  <span className="text-red-600">${totalExpense.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 私帳分析 */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">私帳（生活）</h3>
                <div className="text-2xl font-bold mb-2">${personalAccount.toLocaleString()}</div>
                <Badge variant={personalStatus.color} className="mb-4">
                  <personalStatus.icon className="w-4 h-4 mr-1" />
                  {personalStatus.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>生活收入</span>
                  <span className="text-green-600">${personalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>生活支出</span>
                  <span className="text-red-600">${personalExpense.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 公帳分析 - 只在有生意收支時顯示 */}
            {hasBusiness ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-2">公帳（營業）</h3>
                  <div className="text-2xl font-bold mb-2">${businessAccount.toLocaleString()}</div>
                  <Badge variant={businessStatus.color} className="mb-4">
                    <businessStatus.icon className="w-4 h-4 mr-1" />
                    {businessStatus.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>營業收入</span>
                    <span className="text-green-600">${businessIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>營業支出</span>
                    <span className="text-red-600">${businessExpense.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div></div> // 如果沒有生意收支，則顯示空白
            )}
          </div>
        </CardContent>
      </Card>

      {/* 毛利率分析 - 只在有生意收支時顯示 */}
      {hasBusiness && (
        <Card>
          <CardHeader>
            <CardTitle>營業毛利分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">營業收入</div>
                <div className="text-2xl font-bold">${businessIncome.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-lg font-semibold text-orange-600">營業成本</div>
                <div className="text-2xl font-bold">${businessCost.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">原料、包材等變動支出</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">毛利</div>
                <div className="text-2xl font-bold">${grossProfit.toLocaleString()}</div>
                <div className="text-sm font-semibold text-green-600 mt-1">毛利率: {grossProfitMargin.toFixed(2)}%</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">毛利率 = (營業收入 - 營業成本) / 營業收入 × 100%</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
            緊急預備金建議
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              根據您的月生活支出 ${monthlyLivingExpense.toLocaleString()}，建議準備以下緊急預備金：
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-lg font-semibold text-orange-600">最低建議（3個月）</div>
                <div className="text-2xl font-bold">${emergencyFundMin.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">理想目標（6個月）</div>
                <div className="text-2xl font-bold">${emergencyFundMax.toLocaleString()}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              緊急預備金用於應對突發狀況，如失業、疾病或其他緊急開支，建議存放在容易取得的儲蓄帳戶中。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
