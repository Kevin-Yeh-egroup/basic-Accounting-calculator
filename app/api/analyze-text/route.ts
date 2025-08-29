import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

const IncomeSchema = z.object({
  date: z.string(),
  weather: z.string().optional(),
  customerCount: z.number().optional(),
  category: z.string(),
  type: z.string(),
  description: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  paymentStatus: z.string(),
  subtotal: z.number(),
  customerNote: z.string().optional(),
})

const ExpenseSchema = z.object({
  date: z.string(),
  category: z.string(),
  expenseCategory: z.string(),
  type: z.string(),
  description: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  subtotal: z.number(),
})

const AnalysisSchema = z.object({
  incomes: z.array(IncomeSchema),
  expenses: z.array(ExpenseSchema),
})

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    const result = await generateObject({
      model: openai("gpt-4o"),
      prompt: `
        請分析以下文字，辨識出收入和支出項目：

        收入分類包括：
        - 生意收入：商品銷售收入、服務提供收入、二手設備出售、場地出租、合作分潤等
        - 生活收入：薪資收入、租金收入、定期投資收益、退休金、政府補助、副業收入、臨時工作、利息收入、親友贈與等

        支出分類包括：
        - 生意支出：原料、包材、耗材、運費、租金、人事、水電、瓦斯、通訊、還款、設備添購、器材修繕、行銷廣告等
        - 生活支出：住、電信、還款、保險、儲蓄、食、衣、行、育、樂、醫療等

        請將辨識結果按照指定格式整理。如果某些資訊無法從文字中獲得，請合理推測或留空。

        文字內容：${text}
      `,
      schema: AnalysisSchema,
    })

    return Response.json(result.object)
  } catch (error) {
    console.error("Analysis error:", error)
    return Response.json({ error: "Analysis failed" }, { status: 500 })
  }
}
