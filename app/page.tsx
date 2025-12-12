"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft, Brain, Sparkles, BarChart3, Target } from "lucide-react"
import IncomeTable from "./components/income-table"
import ExpenseTable from "./components/expense-table"
import FinancialReport from "./components/financial-report"
import CashFlowAnalysis from "./components/cash-flow-analysis"
import DemoOverview from "./components/demo-overview"
import FeatureShowcase from "./components/feature-showcase"

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

interface AnalysisResult {
  incomes: Income[]
  expenses: Expense[]
}

export default function MonthlyFinanceAnalyzer() {
  const [inputText, setInputText] = useState(`今天是2024年1月15日，天氣晴朗，咖啡店來了80位客人。
賣出咖啡120杯，每杯80元，總共9600元，全部現金收款。
賣出蛋糕15個，每個150元，總共2250元，信用卡收款。
提供咖啡教學服務2小時，每小時500元，總共1000元，已收款。

支出方面：
店租15000元，已付現金。
水電費2500元，已繳費。
咖啡豆進貨8000元，向供應商批購，現金付款。
牛奶和糖等原料3000元，超市採購。
外帶杯和餐具等包材1200元。
請工讀生薪資4000元，已發放。
廣告宣傳費800元，製作傳單。

個人生活方面：
薪水收入35000元，本月正職薪資，已入帳。
房租12000元，已轉帳給房東。
買菜費用4500元，一個月的食材。
交通費1800元，捷運和公車。
手機費899元，月租費已扣款。
看醫生500元，掛號費和藥費。
給父母孝親費8000元，已轉帳。
儲蓄5000元，存入定存帳戶。`)

  const [showResults, setShowResults] = useState(false)

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>({
    incomes: [
      {
        date: "2024-01-15",
        weather: "晴朗",
        customerCount: 80,
        category: "生意收入",
        type: "商品銷售收入",
        description: "咖啡銷售",
        unitPrice: 80,
        quantity: 120,
        paymentStatus: "已收款",
        subtotal: 9600,
        customerNote: "現金收款",
      },
      {
        date: "2024-01-15",
        weather: "晴朗",
        customerCount: 15,
        category: "生意收入",
        type: "商品銷售收入",
        description: "蛋糕銷售",
        unitPrice: 150,
        quantity: 15,
        paymentStatus: "已收款",
        subtotal: 2250,
        customerNote: "信用卡收款",
      },
      {
        date: "2024-01-15",
        weather: "晴朗",
        customerCount: 2,
        category: "生意收入",
        type: "服務提供收入",
        description: "咖啡教學服務",
        unitPrice: 500,
        quantity: 2,
        paymentStatus: "已收款",
        subtotal: 1000,
        customerNote: "教學課程",
      },
      {
        date: "2024-01-01",
        category: "生活收入",
        type: "薪資收入",
        description: "正職薪資",
        unitPrice: 35000,
        quantity: 1,
        paymentStatus: "已收款",
        subtotal: 35000,
        customerNote: "月薪已入帳",
      },
    ],
    expenses: [
      {
        date: "2024-01-01",
        category: "生意支出",
        expenseCategory: "固定支出",
        type: "租金",
        description: "店租",
        unitPrice: 15000,
        quantity: 1,
        subtotal: 15000,
      },
      {
        date: "2024-01-05",
        category: "生意支出",
        expenseCategory: "固定支出",
        type: "水電",
        description: "水電費",
        unitPrice: 2500,
        quantity: 1,
        subtotal: 2500,
      },
      {
        date: "2024-01-10",
        category: "生意支出",
        expenseCategory: "變動支出",
        type: "原料",
        description: "咖啡豆進貨",
        unitPrice: 8000,
        quantity: 1,
        subtotal: 8000,
      },
      {
        date: "2024-01-12",
        category: "生意支出",
        expenseCategory: "變動支出",
        type: "原料",
        description: "牛奶和糖等原料",
        unitPrice: 3000,
        quantity: 1,
        subtotal: 3000,
      },
      {
        date: "2024-01-13",
        category: "生意支出",
        expenseCategory: "變動支出",
        type: "包材",
        description: "外帶杯和餐具",
        unitPrice: 1200,
        quantity: 1,
        subtotal: 1200,
      },
      {
        date: "2024-01-15",
        category: "生意支出",
        expenseCategory: "固定支出",
        type: "人事",
        description: "工讀生薪資",
        unitPrice: 4000,
        quantity: 1,
        subtotal: 4000,
      },
      {
        date: "2024-01-08",
        category: "生意支出",
        expenseCategory: "額外支出",
        type: "行銷廣告",
        description: "廣告宣傳費",
        unitPrice: 800,
        quantity: 1,
        subtotal: 800,
      },
      {
        date: "2024-01-01",
        category: "生活支出",
        expenseCategory: "住",
        type: "房租",
        description: "房租",
        unitPrice: 12000,
        quantity: 1,
        subtotal: 12000,
      },
      {
        date: "2024-01-03",
        category: "生活支出",
        expenseCategory: "食",
        type: "買菜",
        description: "買菜費用",
        unitPrice: 4500,
        quantity: 1,
        subtotal: 4500,
      },
      {
        date: "2024-01-05",
        category: "生活支出",
        expenseCategory: "行",
        type: "交通",
        description: "交通費",
        unitPrice: 1800,
        quantity: 1,
        subtotal: 1800,
      },
      {
        date: "2024-01-01",
        category: "生活支出",
        expenseCategory: "電信",
        type: "手機",
        description: "手機費",
        unitPrice: 899,
        quantity: 1,
        subtotal: 899,
      },
      {
        date: "2024-01-07",
        category: "生活支出",
        expenseCategory: "醫療",
        type: "看醫生",
        description: "掛號費和藥費",
        unitPrice: 500,
        quantity: 1,
        subtotal: 500,
      },
      {
        date: "2024-01-01",
        category: "生活支出",
        expenseCategory: "孝養",
        type: "孝親費",
        description: "給父母生活費",
        unitPrice: 8000,
        quantity: 1,
        subtotal: 8000,
      },
      {
        date: "2024-01-01",
        category: "生活支出",
        expenseCategory: "儲蓄",
        type: "定存",
        description: "儲蓄",
        unitPrice: 5000,
        quantity: 1,
        subtotal: 5000,
      },
    ],
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState("input")

  const handleAnalyze = async () => {
    if (!inputText.trim()) return

    setIsAnalyzing(true)
    
    // 模擬10秒的AI分析過程
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    try {
      const response = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      })

      if (response.ok) {
        const result = await response.json()
        setAnalysisResult(result)
      } else {
        // 如果 API 失敗，使用預設的示例資料
        console.log("API failed, using default data for demo")
      }
    } catch (error) {
      console.error("Analysis failed:", error)
      // 如果 API 失敗，使用預設的示例資料
      console.log("Using default data for demo")
    } finally {
      setIsAnalyzing(false)
      setShowResults(true) // 無論如何都切換到結果頁面
      setActiveTab("income") // 設定預設顯示收入明細
    }
  }

  const totalIncome = analysisResult?.incomes.reduce((sum, item) => sum + item.subtotal, 0) || 0
  const totalExpense = analysisResult?.expenses.reduce((sum, item) => sum + item.subtotal, 0) || 0
  const netCashFlow = totalIncome - totalExpense

  const handleBackToInput = () => {
    setShowResults(false)
    setActiveTab("input")
  }

  // 如果正在分析，顯示讀取畫面
  if (isAnalyzing) {
    return (
      <div className="container mx-auto p-6 max-w-7xl min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <Brain className="w-10 h-10 text-blue-600 animate-pulse" />
                </div>
                <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-blue-600">AI智能分析中</h2>
                <p className="text-muted-foreground">正在解析您的收支資訊...</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
                  <Sparkles className="w-4 h-4" />
                  <span>識別收入項目</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>分析支出結構</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-purple-600">
                  <Target className="w-4 h-4" />
                  <span>計算財務指標</span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full" 
                     style={{animation: "progressBar 10s ease-out forwards"}}>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">預計需要 10 秒完成分析</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 如果要顯示結果，顯示結果頁面
  if (showResults && analysisResult) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <Button 
            onClick={handleBackToInput} 
            variant="outline" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回輸入畫面
          </Button>
          <h1 className="text-3xl font-bold mb-2">分析結果</h1>
          <p className="text-muted-foreground">AI已完成您的收支分析，以下是詳細結果</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="income">收入明細</TabsTrigger>
            <TabsTrigger value="expense">支出明細</TabsTrigger>
            <TabsTrigger value="analysis">財務分析</TabsTrigger>
            <TabsTrigger value="report">財務月報</TabsTrigger>
          </TabsList>

          <TabsContent value="income">
            <IncomeTable incomes={analysisResult.incomes} />
          </TabsContent>

          <TabsContent value="expense">
            <ExpenseTable expenses={analysisResult.expenses} />
          </TabsContent>

          <TabsContent value="analysis">
            <CashFlowAnalysis incomes={analysisResult.incomes} expenses={analysisResult.expenses} />
          </TabsContent>

          <TabsContent value="report">
            <FinancialReport incomes={analysisResult.incomes} expenses={analysisResult.expenses} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // 預設顯示輸入畫面
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">月收支分析工具</h1>
        <p className="text-muted-foreground">使用AI智能辨識收入支出，自動生成財務分析報表</p>
      </div>

      <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>輸入收支資訊</CardTitle>
              <CardDescription>請輸入您的收入和支出相關文字資訊，AI將自動辨識並分類整理</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="例如：今天賣了50杯咖啡，每杯80元，總共4000元。租金15000元，水電費2000元，買咖啡豆花了8000元..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[400px] text-base"
              />
              <Button onClick={handleAnalyze} disabled={!inputText.trim() || isAnalyzing} className="w-full">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI分析中...
                  </>
                ) : (
                  "AI智能分析"
                )}
              </Button>
            </CardContent>
          </Card>


                </div>
    </div>
  )
}
