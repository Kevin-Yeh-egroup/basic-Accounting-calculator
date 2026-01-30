# 記帳小工具遷移指南

本指南說明如何將記帳小工具的功能移植到其他程式或框架。

## 📋 專案結構概覽

### 核心功能模組

1. **AI 文字分析模組** (`app/api/analyze-text/route.ts`)
   - 使用 OpenAI API 分析文字並提取收支資訊
   - 使用 Zod schema 驗證資料結構

2. **資料展示組件**
   - `income-table.tsx` - 收入明細表格（含排序功能）
   - `expense-table.tsx` - 支出明細表格（含排序功能）
   - `cash-flow-analysis.tsx` - 現金流分析
   - `financial-report.tsx` - 財務報表

3. **UI 組件**
   - 使用 shadcn/ui 組件庫
   - Tailwind CSS 樣式

## 🚀 遷移方案

### 方案 1: 遷移到其他 React 框架

#### 遷移到 React + Vite

```bash
# 1. 創建新的 Vite 專案
npm create vite@latest my-accounting-app -- --template react-ts

# 2. 安裝依賴
cd my-accounting-app
npm install react react-dom
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-*  # 需要的 UI 組件
npm install ai @ai-sdk/openai zod
npm install lucide-react recharts
npm install date-fns

# 3. 複製核心檔案
# - app/components/* → src/components/
# - app/api/analyze-text/route.ts → src/api/analyzeText.ts (改為客戶端調用)
# - components/ui/* → src/components/ui/
```

**API 路由改動**：
- Next.js API 路由需要改為直接調用 OpenAI API（在客戶端或建立後端服務）

#### 遷移到 React Native

```bash
# 1. 創建 React Native 專案
npx react-native init AccountingApp

# 2. 安裝依賴
npm install @react-navigation/native
npm install react-native-paper  # 或使用其他 UI 庫
npm install ai @ai-sdk/openai zod
npm install date-fns

# 3. 需要改動的部分：
# - 表格組件改用 FlatList 或 SectionList
# - 樣式改用 StyleSheet 或 styled-components
# - 路由改用 React Navigation
```

### 方案 2: 遷移到其他框架

#### Vue 3 + TypeScript

```bash
# 1. 創建 Vue 專案
npm create vue@latest my-accounting-app

# 2. 安裝依賴
npm install @vueuse/core
npm install tailwindcss
npm install ai @ai-sdk/openai zod
npm install lucide-vue-next
npm install echarts  # 替代 recharts

# 3. 組件轉換範例：
# React → Vue
# useState → ref/reactive
# useEffect → onMounted/watch
# props → defineProps
```

#### Angular

```bash
# 1. 創建 Angular 專案
ng new my-accounting-app

# 2. 安裝依賴
npm install @angular/material
npm install ai @ai-sdk/openai zod
npm install date-fns

# 3. 組件轉換：
# React 組件 → Angular 組件
# JSX → Angular 模板語法
# Hooks → Angular 生命週期
```

### 方案 3: 提取為獨立模組/函式庫

#### 創建 NPM 套件

```bash
# 1. 創建套件結構
mkdir accounting-core
cd accounting-core

# 2. 創建 package.json
{
  "name": "@your-org/accounting-core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./analyzer": "./dist/analyzer.js",
    "./types": "./dist/types.js"
  }
}

# 3. 提取核心邏輯
# - 資料結構定義 (Income, Expense interfaces)
# - 分析邏輯函數
# - 計算函數 (總收入、總支出、現金流等)
```

**核心模組結構**：
```
accounting-core/
├── src/
│   ├── types/
│   │   ├── income.ts
│   │   └── expense.ts
│   ├── analyzers/
│   │   └── textAnalyzer.ts
│   ├── calculators/
│   │   ├── cashFlow.ts
│   │   └── financialMetrics.ts
│   └── index.ts
└── package.json
```

### 方案 4: 整合到現有專案

#### 步驟

1. **複製核心組件**
   ```bash
   # 複製到現有專案
   cp -r app/components/* your-project/src/components/accounting/
   cp app/api/analyze-text/route.ts your-project/src/api/accounting/
   ```

2. **安裝必要依賴**
   ```bash
   npm install ai @ai-sdk/openai zod
   npm install @radix-ui/react-table @radix-ui/react-tabs
   npm install recharts date-fns
   ```

3. **調整導入路徑**
   - 修改所有 `@/components` 為您的專案路徑
   - 調整 Tailwind 配置

4. **API 整合**
   - 如果使用 Next.js：直接使用 API 路由
   - 如果使用其他框架：建立後端 API 或使用客戶端直接調用

## 📦 核心檔案清單

### 必須複製的檔案

```
✅ app/components/
   ├── income-table.tsx          # 收入表格（含排序）
   ├── expense-table.tsx          # 支出表格（含排序）
   ├── cash-flow-analysis.tsx    # 現金流分析
   └── financial-report.tsx       # 財務報表

✅ app/api/analyze-text/route.ts  # AI 分析 API（需改動）

✅ 資料結構定義 (在 page.tsx 中)
   - Income interface
   - Expense interface
   - AnalysisResult interface
```

### 可選檔案

```
📁 components/ui/                # UI 組件庫（如果沒有可選）
📁 lib/utils.ts                   # 工具函數
📁 app/globals.css                # 樣式（部分）
```

## 🔧 技術棧對應表

| 功能 | Next.js (當前) | React + Vite | Vue 3 | Angular |
|------|---------------|--------------|-------|---------|
| 路由 | Next.js Router | React Router | Vue Router | Angular Router |
| API | API Routes | 後端服務/客戶端 | 後端服務/客戶端 | HTTP Client |
| 狀態管理 | useState | useState/Redux | Pinia/Vuex | Services |
| UI 組件 | shadcn/ui | shadcn/ui | PrimeVue/Quasar | Angular Material |
| 樣式 | Tailwind CSS | Tailwind CSS | Tailwind CSS | Angular Material |
| 圖表 | Recharts | Recharts | ECharts | Chart.js |

## 🔑 關鍵改動點

### 1. API 路由改動

**Next.js (當前)**:
```typescript
// app/api/analyze-text/route.ts
export async function POST(req: Request) {
  const { text } = await req.json()
  const result = await generateObject({...})
  return Response.json(result.object)
}
```

**其他框架 (需要後端)**:
```typescript
// 後端 API (Express/Fastify 等)
app.post('/api/analyze-text', async (req, res) => {
  const { text } = req.body
  const result = await generateObject({...})
  res.json(result.object)
})

// 前端調用
const response = await fetch('/api/analyze-text', {
  method: 'POST',
  body: JSON.stringify({ text })
})
```

### 2. 組件語法轉換

**React (當前)**:
```tsx
const [inputText, setInputText] = useState('')
<Textarea value={inputText} onChange={(e) => setInputText(e.target.value)} />
```

**Vue 3**:
```vue
<script setup>
const inputText = ref('')
</script>
<template>
  <textarea v-model="inputText" />
</template>
```

**Angular**:
```typescript
export class Component {
  inputText = ''
}
```
```html
<textarea [(ngModel)]="inputText"></textarea>
```

### 3. 樣式處理

- **Tailwind CSS**: 大部分框架都支援，配置方式類似
- **CSS Modules**: 需要轉換 className 為 CSS modules
- **Styled Components**: 需要重寫樣式定義

## 📝 遷移檢查清單

- [ ] 複製核心組件檔案
- [ ] 安裝必要依賴套件
- [ ] 設定 API 端點（後端或客戶端）
- [ ] 調整導入路徑
- [ ] 轉換組件語法（如需要）
- [ ] 設定樣式系統（Tailwind/其他）
- [ ] 測試 AI 分析功能
- [ ] 測試表格排序功能
- [ ] 測試圖表顯示
- [ ] 測試響應式設計

## 🎯 推薦遷移路徑

### 簡單遷移（保持 React）
1. **React + Vite** - 最簡單，組件幾乎不用改
2. **Create React App** - 傳統選擇，但已不推薦

### 框架遷移
1. **Vue 3** - 語法相似，學習曲線平緩
2. **Angular** - 企業級，但改動較大

### 模組化遷移
1. **提取核心邏輯為 NPM 套件** - 可在多個專案重用
2. **建立後端 API 服務** - 前端可任意選擇框架

## 💡 最佳實踐

1. **先提取核心邏輯**：將計算和分析邏輯獨立出來
2. **保持資料結構一致**：Income/Expense 介面保持不變
3. **逐步遷移**：先遷移核心功能，再遷移 UI
4. **測試驅動**：每個模組遷移後立即測試
5. **文檔記錄**：記錄所有改動和決策

## 📚 相關資源

- [Next.js 遷移指南](https://nextjs.org/docs/app/building-your-application/upgrading)
- [React 到 Vue 遷移指南](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [shadcn/ui 文檔](https://ui.shadcn.com/)
- [AI SDK 文檔](https://sdk.vercel.ai/docs)

## ❓ 常見問題

**Q: 如何處理 Next.js 特有的功能？**
A: API Routes 需要改為獨立後端或客戶端直接調用。Server Components 改為普通組件。

**Q: UI 組件庫如何選擇？**
A: 如果使用 React，可繼續使用 shadcn/ui。其他框架選擇對應的組件庫。

**Q: AI 分析功能如何遷移？**
A: 核心邏輯相同，只需調整 API 調用方式。確保有 OpenAI API 金鑰。

**Q: 樣式如何遷移？**
A: Tailwind CSS 在大部分框架都支援。或使用 CSS Modules/Styled Components。

---

如有具體遷移需求，請提供目標框架和環境資訊，我可以提供更詳細的遷移步驟。

