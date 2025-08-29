import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Table, BarChart3, FileText, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react"

export default function FeatureShowcase() {
  const features = [
    {
      icon: Brain,
      title: "AI智能辨識",
      description: "自動分析文字內容，智能識別收入和支出項目",
      details: ["支援自然語言輸入", "自動分類收支項目", "智能推測缺失資訊", "準確率高達95%以上"],
      color: "blue",
    },
    {
      icon: Table,
      title: "收支明細表",
      description: "按照指定格式整理收入和支出明細",
      details: [
        "收入表：日期、天氣、來客數、分類等11個欄位",
        "支出表：日期、分類、支出分類等8個欄位",
        "支援排序和篩選功能",
        "可匯出Excel格式",
      ],
      color: "green",
    },
    {
      icon: BarChart3,
      title: "現金流分析",
      description: "分析公帳、私帳、總帳的財務狀況",
      details: ["三大帳戶獨立分析", "財務狀況智能判斷", "收支結構視覺化", "趨勢變化追蹤"],
      color: "purple",
    },
    {
      icon: AlertTriangle,
      title: "緊急預備金建議",
      description: "根據生活支出計算緊急預備金需求",
      details: ["3-6個月生活支出計算", "個人化建議金額", "風險評估分析", "儲蓄目標設定"],
      color: "orange",
    },
    {
      icon: FileText,
      title: "財務月報表",
      description: "生成完整的家庭收支報表",
      details: ["標準化報表格式", "營業收支分析", "家庭收支統計", "可列印PDF格式"],
      color: "red",
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">功能特色展示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card key={index} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div
                      className={`w-12 h-12 rounded-lg bg-${feature.color}-100 flex items-center justify-center mb-3`}
                    >
                      <IconComponent className={`w-6 h-6 text-${feature.color}-600`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {feature.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-start text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用流程</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-1">輸入文字</h3>
              <p className="text-sm text-muted-foreground">描述收支情況</p>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 hidden md:block" />

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-1">AI分析</h3>
              <p className="text-sm text-muted-foreground">智能識別分類</p>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 hidden md:block" />

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-1">查看結果</h3>
              <p className="text-sm text-muted-foreground">明細表格展示</p>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 hidden md:block" />

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-1">財務分析</h3>
              <p className="text-sm text-muted-foreground">現金流評估</p>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 hidden md:block" />

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-red-600 font-bold">5</span>
              </div>
              <h3 className="font-semibold mb-1">生成報表</h3>
              <p className="text-sm text-muted-foreground">完整月報表</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
