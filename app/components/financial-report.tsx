"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

interface FinancialReportProps {
  incomes: Income[]
  expenses: Expense[]
}

export default function FinancialReport({ incomes, expenses }: FinancialReportProps) {
  const [copied, setCopied] = useState(false)

  // 收入分類統計
  const salaryIncome = incomes
    .filter((item) => item.type.includes("薪資"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const nonSalaryIncome = incomes
    .filter((item) => item.type.includes("副業") || item.type.includes("投資"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const familySupport = incomes
    .filter((item) => item.type.includes("家人") || item.type.includes("贈與"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const loanIncome = incomes.filter((item) => item.type.includes("借款")).reduce((sum, item) => sum + item.subtotal, 0)
  const subsidyIncome = incomes
    .filter((item) => item.type.includes("補助") || item.type.includes("津貼"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const otherIncome = incomes
    .filter(
      (item) =>
        !item.type.includes("薪資") &&
        !item.type.includes("副業") &&
        !item.type.includes("投資") &&
        !item.type.includes("家人") &&
        !item.type.includes("贈與") &&
        !item.type.includes("借款") &&
        !item.type.includes("補助") &&
        !item.type.includes("津貼") &&
        item.category.includes("生活"),
    )
    .reduce((sum, item) => sum + item.subtotal, 0)

  // 支出分類統計
  const foodExpense = expenses
    .filter((item) => item.expenseCategory.includes("食"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const clothingExpense = expenses
    .filter((item) => item.expenseCategory.includes("衣"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const housingExpense = expenses
    .filter((item) => item.expenseCategory.includes("住"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const transportExpense = expenses
    .filter((item) => item.expenseCategory.includes("行"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const educationExpense = expenses
    .filter((item) => item.expenseCategory.includes("育"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const entertainmentExpense = expenses
    .filter((item) => item.expenseCategory.includes("樂"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const telecomExpense = expenses
    .filter((item) => item.expenseCategory.includes("電信"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const insuranceExpense = expenses
    .filter((item) => item.expenseCategory.includes("保險"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const savingsExpense = expenses
    .filter((item) => item.expenseCategory.includes("儲蓄"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const medicalExpense = expenses
    .filter((item) => item.expenseCategory.includes("醫療"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const familyCareExpense = expenses
    .filter((item) => item.expenseCategory.includes("孝養"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const donationExpense = expenses
    .filter((item) => item.description.includes("捐款") || item.description.includes("奉獻"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const taxExpense = expenses
    .filter((item) => item.description.includes("稅"))
    .reduce((sum, item) => sum + item.subtotal, 0)

  // 信貸相關
  const creditCardExpense = expenses
    .filter((item) => item.description.includes("信用卡"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const personalLoanExpense = expenses
    .filter((item) => item.description.includes("信貸"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const mortgageExpense = expenses
    .filter((item) => item.description.includes("房貸"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const carLoanExpense = expenses
    .filter((item) => item.description.includes("車貸"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const friendLoanExpense = expenses
    .filter((item) => item.description.includes("親友") && item.description.includes("借款"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const pawnshopExpense = expenses
    .filter((item) => item.description.includes("當鋪"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const rotatingExpense = expenses
    .filter((item) => item.description.includes("互助會") || item.description.includes("標會"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const otherLoanExpense = expenses
    .filter(
      (item) =>
        item.description.includes("貸款") &&
        !item.description.includes("信貸") &&
        !item.description.includes("房貸") &&
        !item.description.includes("車貸"),
    )
    .reduce((sum, item) => sum + item.subtotal, 0)

  // 營業相關
  const businessRevenue = incomes
    .filter((item) => item.category.includes("生意"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const businessFixedExpense = expenses
    .filter((item) => item.category.includes("生意") && item.expenseCategory.includes("固定"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const businessVariableExpense = expenses
    .filter((item) => item.category.includes("生意") && item.expenseCategory.includes("變動"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const rentExpense = expenses
    .filter((item) => item.description.includes("租") && item.category.includes("生意"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const utilitiesExpense = expenses
    .filter(
      (item) =>
        (item.description.includes("水電") || item.description.includes("瓦斯")) && item.category.includes("生意"),
    )
    .reduce((sum, item) => sum + item.subtotal, 0)
  const purchaseExpense = expenses
    .filter((item) => item.description.includes("進貨") || item.description.includes("原料"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const materialExpense = expenses
    .filter((item) => item.description.includes("原物料"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const salaryExpense = expenses
    .filter((item) => item.description.includes("薪資") && item.category.includes("生意"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const marketingExpense = expenses
    .filter((item) => item.description.includes("廣告") || item.description.includes("行銷"))
    .reduce((sum, item) => sum + item.subtotal, 0)
  const equipmentExpense = expenses
    .filter((item) => item.description.includes("設備") || item.description.includes("器材"))
    .reduce((sum, item) => sum + item.subtotal, 0)

  // 判斷是否有生意收支
  const hasBusiness = businessRevenue > 0 || businessFixedExpense > 0 || businessVariableExpense > 0

  // 計算總收入和總支出
  const totalPersonalIncome = salaryIncome + nonSalaryIncome + familySupport + loanIncome + subsidyIncome + otherIncome
  const totalPersonalExpense =
    foodExpense +
    clothingExpense +
    housingExpense +
    transportExpense +
    educationExpense +
    entertainmentExpense +
    telecomExpense +
    insuranceExpense +
    savingsExpense +
    medicalExpense +
    familyCareExpense +
    donationExpense +
    taxExpense
  const totalLoanExpense =
    creditCardExpense +
    personalLoanExpense +
    mortgageExpense +
    carLoanExpense +
    friendLoanExpense +
    pawnshopExpense +
    rotatingExpense +
    otherLoanExpense

  const copyToClipboard = () => {
    let content = "財務月報表\n\n"

    // 家庭收入
    content += "家庭收入:\n"
    content += `工資: ${salaryIncome.toLocaleString()}\t\t補助或津貼如下\n`
    content += `非工資: ${nonSalaryIncome.toLocaleString()}\t\t低收補助: ${Math.floor(subsidyIncome * 0.6).toLocaleString()}\n`
    content += `家人提供: ${familySupport.toLocaleString()}\t\t身障補助: ${Math.floor(subsidyIncome * 0.4).toLocaleString()}\n`
    content += `借款: ${loanIncome.toLocaleString()}\n`
    content += `其他: ${otherIncome.toLocaleString()}\n\n`

    // 支出
    content += "支出:\n"
    content += `食: ${foodExpense.toLocaleString()}\t\t信用卡: ${creditCardExpense.toLocaleString()}\n`
    content += `衣: ${clothingExpense.toLocaleString()}\t\t信貸: ${personalLoanExpense.toLocaleString()}\n`
    content += `住: ${housingExpense.toLocaleString()}\t\t房貸: ${mortgageExpense.toLocaleString()}\n`
    content += `行: ${transportExpense.toLocaleString()}\t\t車貸: ${carLoanExpense.toLocaleString()}\n`
    content += `育: ${educationExpense.toLocaleString()}\t\t親友: ${friendLoanExpense.toLocaleString()}\n`
    content += `樂: ${entertainmentExpense.toLocaleString()}\t\t當鋪: ${pawnshopExpense.toLocaleString()}\n`
    content += `電信: ${telecomExpense.toLocaleString()}\t\t互助會死會: ${rotatingExpense.toLocaleString()}\n`
    content += `保險: ${insuranceExpense.toLocaleString()}\t\t其他: ${otherLoanExpense.toLocaleString()}\n`
    content += `儲蓄: ${savingsExpense.toLocaleString()}\n`
    content += `醫療: ${medicalExpense.toLocaleString()}\n`
    content += `孝養: ${familyCareExpense.toLocaleString()}\n`
    content += `捐款: ${donationExpense.toLocaleString()}\n`
    content += `稅金: ${taxExpense.toLocaleString()}\n\n`

    // 營業收入和支出 (只在有生意時顯示)
    if (hasBusiness) {
      content += "營業收入:\n"
      content += `營業額: ${businessRevenue.toLocaleString()}\n\n`

      content += "營業支出:\n"
      content += `營業固定支出: ${businessFixedExpense.toLocaleString()}\t\t營業變動支出: ${businessVariableExpense.toLocaleString()}\n`
      content += `店租: ${rentExpense.toLocaleString()}\t\t進貨: ${purchaseExpense.toLocaleString()}\n`
      content += `水電: ${utilitiesExpense.toLocaleString()}\t\t原物料: ${materialExpense.toLocaleString()}\n`
      content += `薪資: ${salaryExpense.toLocaleString()}\t\t行銷廣告: ${marketingExpense.toLocaleString()}\n`
      content += `設備: ${equipmentExpense.toLocaleString()}\n`
    }

    // 複製到剪貼簿
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>財務月報表</span>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex w-full items-center justify-center gap-1 sm:w-auto"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "已複製" : "複製報表"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* 家庭收入 */}
          <div>
            <h3 className="font-bold text-base sm:text-lg mb-4">家庭收入</h3>
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">項目</TableHead>
                  <TableHead className="w-1/6">金額</TableHead>
                  <TableHead className="w-1/3">項目</TableHead>
                  <TableHead className="w-1/6">金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>工資</TableCell>
                  <TableCell>${salaryIncome.toLocaleString()}</TableCell>
                  <TableCell colSpan={2} className="font-semibold">
                    補助或津貼如下
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>非工資</TableCell>
                  <TableCell>${nonSalaryIncome.toLocaleString()}</TableCell>
                  <TableCell>低收補助</TableCell>
                  <TableCell>${Math.floor(subsidyIncome * 0.6).toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>家人提供</TableCell>
                  <TableCell>${familySupport.toLocaleString()}</TableCell>
                  <TableCell>身障補助</TableCell>
                  <TableCell>${Math.floor(subsidyIncome * 0.4).toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>借款</TableCell>
                  <TableCell>${loanIncome.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>其他</TableCell>
                  <TableCell>${otherIncome.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-bold">總收入</TableCell>
                  <TableCell className="font-bold text-green-600">${totalPersonalIncome.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* 支出 */}
          <div>
            <h3 className="font-bold text-base sm:text-lg mb-4">支出</h3>
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/6">項目</TableHead>
                  <TableHead className="w-1/6">金額</TableHead>
                  <TableHead className="w-1/6">項目</TableHead>
                  <TableHead className="w-1/6">金額</TableHead>
                  <TableHead className="w-1/6">項目</TableHead>
                  <TableHead className="w-1/6">金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>食</TableCell>
                  <TableCell>${foodExpense.toLocaleString()}</TableCell>
                  <TableCell>信用卡</TableCell>
                  <TableCell>${creditCardExpense.toLocaleString()}</TableCell>
                  <TableCell>捐款</TableCell>
                  <TableCell>${donationExpense.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>衣</TableCell>
                  <TableCell>${clothingExpense.toLocaleString()}</TableCell>
                  <TableCell>信貸</TableCell>
                  <TableCell>${personalLoanExpense.toLocaleString()}</TableCell>
                  <TableCell>稅金</TableCell>
                  <TableCell>${taxExpense.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>住</TableCell>
                  <TableCell>${housingExpense.toLocaleString()}</TableCell>
                  <TableCell>房貸</TableCell>
                  <TableCell>${mortgageExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>行</TableCell>
                  <TableCell>${transportExpense.toLocaleString()}</TableCell>
                  <TableCell>車貸</TableCell>
                  <TableCell>${carLoanExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>育</TableCell>
                  <TableCell>${educationExpense.toLocaleString()}</TableCell>
                  <TableCell>親友</TableCell>
                  <TableCell>${friendLoanExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>樂</TableCell>
                  <TableCell>${entertainmentExpense.toLocaleString()}</TableCell>
                  <TableCell>當鋪</TableCell>
                  <TableCell>${pawnshopExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>電信</TableCell>
                  <TableCell>${telecomExpense.toLocaleString()}</TableCell>
                  <TableCell>互助會死會</TableCell>
                  <TableCell>${rotatingExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>保險</TableCell>
                  <TableCell>${insuranceExpense.toLocaleString()}</TableCell>
                  <TableCell>其他貸款</TableCell>
                  <TableCell>${otherLoanExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>儲蓄</TableCell>
                  <TableCell>${savingsExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>醫療</TableCell>
                  <TableCell>${medicalExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>孝養</TableCell>
                  <TableCell>${familyCareExpense.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-bold">生活支出</TableCell>
                  <TableCell className="font-bold text-red-600">${totalPersonalExpense.toLocaleString()}</TableCell>
                  <TableCell className="font-bold">貸款支出</TableCell>
                  <TableCell className="font-bold text-red-600">${totalLoanExpense.toLocaleString()}</TableCell>
                  <TableCell className="font-bold">總支出</TableCell>
                  <TableCell className="font-bold text-red-600">
                    ${(totalPersonalExpense + totalLoanExpense).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 營業收入和支出 - 只在有生意時顯示 */}
          {hasBusiness && (
            <>
              <Separator />

              {/* 營業收入 */}
              <div>
                <h3 className="font-bold text-base sm:text-lg mb-4">營業收入</h3>
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>項目</TableHead>
                      <TableHead>金額</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>營業額</TableCell>
                      <TableCell>${businessRevenue.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* 營業支出 */}
              <div>
                <h3 className="font-bold text-base sm:text-lg mb-4">營業支出</h3>
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/4">項目</TableHead>
                      <TableHead className="w-1/4">金額</TableHead>
                      <TableHead className="w-1/4">項目</TableHead>
                      <TableHead className="w-1/4">金額</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">營業固定支出</TableCell>
                      <TableCell>${businessFixedExpense.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">營業變動支出</TableCell>
                      <TableCell>${businessVariableExpense.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>店租</TableCell>
                      <TableCell>${rentExpense.toLocaleString()}</TableCell>
                      <TableCell>進貨</TableCell>
                      <TableCell>${purchaseExpense.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>水電</TableCell>
                      <TableCell>${utilitiesExpense.toLocaleString()}</TableCell>
                      <TableCell>原物料</TableCell>
                      <TableCell>${materialExpense.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>薪資</TableCell>
                      <TableCell>${salaryExpense.toLocaleString()}</TableCell>
                      <TableCell>行銷廣告</TableCell>
                      <TableCell>${marketingExpense.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>設備</TableCell>
                      <TableCell>${equipmentExpense.toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableCell className="font-bold">總營業支出</TableCell>
                      <TableCell className="font-bold text-red-600" colSpan={3}>
                        ${(businessFixedExpense + businessVariableExpense).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <Separator />

          {/* 收支總結 */}
          <div>
            <h3 className="font-bold text-base sm:text-lg mb-4">收支總結</h3>
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>項目</TableHead>
                  <TableHead>金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>總收入</TableCell>
                  <TableCell className="text-green-600">
                    ${(totalPersonalIncome + (hasBusiness ? businessRevenue : 0)).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>總支出</TableCell>
                  <TableCell className="text-red-600">
                    $
                    {(
                      totalPersonalExpense +
                      totalLoanExpense +
                      (hasBusiness ? businessFixedExpense + businessVariableExpense : 0)
                    ).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-bold">淨收支</TableCell>
                  <TableCell
                    className={`font-bold ${
                      totalPersonalIncome +
                        (hasBusiness ? businessRevenue : 0) -
                        (totalPersonalExpense +
                          totalLoanExpense +
                          (hasBusiness ? businessFixedExpense + businessVariableExpense : 0)) >=
                      0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    $
                    {(
                      totalPersonalIncome +
                      (hasBusiness ? businessRevenue : 0) -
                      (totalPersonalExpense +
                        totalLoanExpense +
                        (hasBusiness ? businessFixedExpense + businessVariableExpense : 0))
                    ).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
