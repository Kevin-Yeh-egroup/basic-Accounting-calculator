# 核心模組提取範例

這個文件展示如何將記帳工具的核心邏輯提取為可重用的模組。

## 📁 建議的模組結構

```
accounting-core/
├── src/
│   ├── types/
│   │   ├── income.ts          # 收入資料結構
│   │   ├── expense.ts         # 支出資料結構
│   │   └── index.ts
│   ├── analyzers/
│   │   ├── textAnalyzer.ts    # 文字分析邏輯
│   │   └── index.ts
│   ├── calculators/
│   │   ├── cashFlow.ts        # 現金流計算
│   │   ├── financialMetrics.ts # 財務指標
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts      # 格式化工具
│   │   └── index.ts
│   └── index.ts               # 主入口
├── package.json
└── tsconfig.json
```

## 📝 核心模組範例代碼

### 1. 類型定義 (`src/types/index.ts`)

```typescript
// 收入介面
export interface Income {
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

// 支出介面
export interface Expense {
  date: string
  category: string
  expenseCategory: string
  type: string
  description: string
  unitPrice: number
  quantity: number
  subtotal: number
}

// 分析結果
export interface AnalysisResult {
  incomes: Income[]
  expenses: Expense[]
}
```

### 2. 計算器模組 (`src/calculators/cashFlow.ts`)

```typescript
import { Income, Expense } from '../types'

export class CashFlowCalculator {
  /**
   * 計算總收入
   */
  static calculateTotalIncome(incomes: Income[]): number {
    return incomes.reduce((sum, item) => sum + item.subtotal, 0)
  }

  /**
   * 計算總支出
   */
  static calculateTotalExpense(expenses: Expense[]): number {
    return expenses.reduce((sum, item) => sum + item.subtotal, 0)
  }

  /**
   * 計算淨現金流
   */
  static calculateNetCashFlow(incomes: Income[], expenses: Expense[]): number {
    const totalIncome = this.calculateTotalIncome(incomes)
    const totalExpense = this.calculateTotalExpense(expenses)
    return totalIncome - totalExpense
  }

  /**
   * 計算生意收入
   */
  static calculateBusinessIncome(incomes: Income[]): number {
    return incomes
      .filter((item) => item.category.includes('生意'))
      .reduce((sum, item) => sum + item.subtotal, 0)
  }

  /**
   * 計算生活收入
   */
  static calculatePersonalIncome(incomes: Income[]): number {
    return incomes
      .filter((item) => item.category.includes('生活'))
      .reduce((sum, item) => sum + item.subtotal, 0)
  }

  /**
   * 計算生意支出
   */
  static calculateBusinessExpense(expenses: Expense[]): number {
    return expenses
      .filter((item) => item.category.includes('生意'))
      .reduce((sum, item) => sum + item.subtotal, 0)
  }

  /**
   * 計算生活支出
   */
  static calculatePersonalExpense(expenses: Expense[]): number {
    return expenses
      .filter((item) => item.category.includes('生活'))
      .reduce((sum, item) => sum + item.subtotal, 0)
  }

  /**
   * 計算帳戶餘額
   */
  static calculateAccountBalance(
    incomes: Income[],
    expenses: Expense[]
  ): {
    business: number
    personal: number
    total: number
  } {
    const businessIncome = this.calculateBusinessIncome(incomes)
    const businessExpense = this.calculateBusinessExpense(expenses)
    const personalIncome = this.calculatePersonalIncome(incomes)
    const personalExpense = this.calculatePersonalExpense(expenses)

    return {
      business: businessIncome - businessExpense,
      personal: personalIncome - personalExpense,
      total: this.calculateNetCashFlow(incomes, expenses),
    }
  }

  /**
   * 計算毛利率
   */
  static calculateGrossProfitMargin(
    incomes: Income[],
    expenses: Expense[]
  ): number {
    const businessIncome = this.calculateBusinessIncome(incomes)
    const businessCost = expenses
      .filter(
        (item) =>
          item.category.includes('生意') &&
          (item.expenseCategory.includes('變動') ||
            item.type.includes('原料') ||
            item.type.includes('包材'))
      )
      .reduce((sum, item) => sum + item.subtotal, 0)

    if (businessIncome === 0) return 0
    const grossProfit = businessIncome - businessCost
    return (grossProfit / businessIncome) * 100
  }

  /**
   * 計算緊急預備金建議
   */
  static calculateEmergencyFund(expenses: Expense[]): {
    min: number
    max: number
    months: { min: number; max: number }
  } {
    const personalExpense = this.calculatePersonalExpense(expenses)
    const minMonths = 3
    const maxMonths = 6

    return {
      min: personalExpense * minMonths,
      max: personalExpense * maxMonths,
      months: { min: minMonths, max: maxMonths },
    }
  }
}
```

### 3. 財務指標計算 (`src/calculators/financialMetrics.ts`)

```typescript
import { Income, Expense } from '../types'
import { CashFlowCalculator } from './cashFlow'

export class FinancialMetrics {
  /**
   * 獲取財務狀況評估
   */
  static getFinancialStatus(amount: number): {
    status: 'healthy' | 'warning' | 'critical'
    label: string
    color: string
  } {
    if (amount >= 0) {
      return {
        status: 'healthy',
        label: '收支有餘',
        color: 'green',
      }
    } else if (amount >= -10000) {
      return {
        status: 'warning',
        label: '需要關注',
        color: 'orange',
      }
    } else {
      return {
        status: 'critical',
        label: '入不敷出',
        color: 'red',
      }
    }
  }

  /**
   * 計算收入結構
   */
  static calculateIncomeStructure(incomes: Income[]) {
    const business = CashFlowCalculator.calculateBusinessIncome(incomes)
    const personal = CashFlowCalculator.calculatePersonalIncome(incomes)
    const total = business + personal

    return {
      business: {
        amount: business,
        percentage: total > 0 ? (business / total) * 100 : 0,
      },
      personal: {
        amount: personal,
        percentage: total > 0 ? (personal / total) * 100 : 0,
      },
      total,
    }
  }

  /**
   * 計算支出結構
   */
  static calculateExpenseStructure(expenses: Expense[]) {
    const business = CashFlowCalculator.calculateBusinessExpense(expenses)
    const personal = CashFlowCalculator.calculatePersonalExpense(expenses)
    const total = business + personal

    return {
      business: {
        amount: business,
        percentage: total > 0 ? (business / total) * 100 : 0,
      },
      personal: {
        amount: personal,
        percentage: total > 0 ? (personal / total) * 100 : 0,
      },
      total,
    }
  }
}
```

### 4. 文字分析器 (`src/analyzers/textAnalyzer.ts`)

```typescript
import { AnalysisResult, Income, Expense } from '../types'

/**
 * 文字分析器介面（實際實作需要根據使用的 AI SDK）
 */
export interface TextAnalyzer {
  analyze(text: string): Promise<AnalysisResult>
}

/**
 * OpenAI 分析器實作範例
 * 注意：這需要在有 OpenAI API 的環境中運行
 */
export class OpenAITextAnalyzer implements TextAnalyzer {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.apiKey = apiKey
    this.model = model
  }

  async analyze(text: string): Promise<AnalysisResult> {
    // 這裡需要根據實際的 AI SDK 實作
    // 範例使用 fetch 直接調用 OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一個財務分析助手，請分析文字中的收入和支出。',
          },
          {
            role: 'user',
            content: `請分析以下文字，辨識出收入和支出項目：\n\n${text}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    const data = await response.json()
    // 解析並驗證返回的資料
    return this.parseResponse(data)
  }

  private parseResponse(data: any): AnalysisResult {
    // 實作解析邏輯
    // 這裡應該使用 Zod 或其他驗證庫來驗證資料結構
    return JSON.parse(data.choices[0].message.content)
  }
}

/**
 * 模擬分析器（用於測試或演示）
 */
export class MockTextAnalyzer implements TextAnalyzer {
  async analyze(text: string): Promise<AnalysisResult> {
    // 返回示例資料
    return {
      incomes: [],
      expenses: [],
    }
  }
}
```

### 5. 工具函數 (`src/utils/formatters.ts`)

```typescript
/**
 * 格式化金額
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * 格式化日期
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-TW')
}

/**
 * 格式化百分比
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}
```

### 6. 主入口 (`src/index.ts`)

```typescript
// 匯出所有類型
export * from './types'

// 匯出計算器
export { CashFlowCalculator } from './calculators/cashFlow'
export { FinancialMetrics } from './calculators/financialMetrics'

// 匯出分析器
export * from './analyzers/textAnalyzer'

// 匯出工具函數
export * from './utils/formatters'
```

## 📦 package.json 範例

```json
{
  "name": "@your-org/accounting-core",
  "version": "1.0.0",
  "description": "記帳工具核心邏輯模組",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "keywords": [
    "accounting",
    "finance",
    "cash-flow"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22",
    "typescript": "^5"
  }
}
```

## 🚀 使用範例

### 在 React 專案中使用

```typescript
import {
  CashFlowCalculator,
  FinancialMetrics,
  type Income,
  type Expense,
} from '@your-org/accounting-core'

function MyComponent() {
  const incomes: Income[] = [...]
  const expenses: Expense[] = [...]

  const netCashFlow = CashFlowCalculator.calculateNetCashFlow(
    incomes,
    expenses
  )
  const status = FinancialMetrics.getFinancialStatus(netCashFlow)

  return <div>財務狀況: {status.label}</div>
}
```

### 在 Vue 專案中使用

```vue
<script setup lang="ts">
import {
  CashFlowCalculator,
  type Income,
  type Expense,
} from '@your-org/accounting-core'

const incomes: Income[] = [...]
const expenses: Expense[] = [...]

const netCashFlow = computed(() =>
  CashFlowCalculator.calculateNetCashFlow(incomes, expenses)
)
</script>

<template>
  <div>淨現金流: {{ netCashFlow }}</div>
</template>
```

### 在 Node.js 後端使用

```typescript
import {
  CashFlowCalculator,
  OpenAITextAnalyzer,
} from '@your-org/accounting-core'

const analyzer = new OpenAITextAnalyzer(process.env.OPENAI_API_KEY!)

app.post('/api/analyze', async (req, res) => {
  const { text } = req.body
  const result = await analyzer.analyze(text)
  
  const metrics = {
    netCashFlow: CashFlowCalculator.calculateNetCashFlow(
      result.incomes,
      result.expenses
    ),
  }

  res.json({ result, metrics })
})
```

## ✅ 優點

1. **可重用性**: 核心邏輯可在多個專案中使用
2. **測試友好**: 純函數易於單元測試
3. **框架無關**: 不依賴特定框架
4. **類型安全**: TypeScript 提供完整的類型檢查
5. **易於維護**: 邏輯集中，易於更新和維護

## 📝 下一步

1. 將這些模組提取到獨立套件
2. 發布到 NPM 或私有套件倉庫
3. 在各個專案中安裝和使用
4. 持續維護和更新

