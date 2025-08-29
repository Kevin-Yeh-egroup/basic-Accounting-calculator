import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react"

export default function DemoOverview() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="w-5 h-5 mr-2" />
            示例數據總覽
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">$47,850</div>
              <div className="text-sm text-muted-foreground">總收入</div>
              <div className="text-xs mt-1">
                <Badge variant="outline" className="text-green-600">
                  營業: $12,850
                </Badge>
                <Badge variant="outline" className="text-blue-600 ml-1">
                  生活: $35,000
                </Badge>
              </div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <TrendingDown className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-red-600">$61,199</div>
              <div className="text-sm text-muted-foreground">總支出</div>
              <div className="text-xs mt-1">
                <Badge variant="outline" className="text-red-600">
                  營業: $34,500
                </Badge>
                <Badge variant="outline" className="text-orange-600 ml-1">
                  生活: $26,699
                </Badge>
              </div>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-red-600">-$13,349</div>
              <div className="text-sm text-muted-foreground">淨現金流</div>
              <div className="text-xs mt-1">
                <Badge variant="destructive">入不敷出</Badge>
              </div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600 mb-1">緊急預備金</div>
              <div className="text-sm text-blue-600">$80,097 - $160,194</div>
              <div className="text-xs text-muted-foreground">3-6個月生活支出</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">收入結構分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">營業收入</span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "26.8%" }}></div>
                  </div>
                  <span className="text-sm font-semibold">$12,850</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">薪資收入</span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "73.2%" }}></div>
                  </div>
                  <span className="text-sm font-semibold">$35,000</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">支出結構分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">營業支出</span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: "56.4%" }}></div>
                  </div>
                  <span className="text-sm font-semibold">$34,500</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">生活支出</span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: "43.6%" }}></div>
                  </div>
                  <span className="text-sm font-semibold">$26,699</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>各帳戶財務狀況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-semibold mb-2">公帳（營業）</div>
              <div className="text-2xl font-bold text-red-600 mb-2">-$21,650</div>
              <Badge variant="destructive">入不敷出</Badge>
              <div className="text-xs text-muted-foreground mt-2">收入: $12,850 | 支出: $34,500</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-semibold mb-2">私帳（生活）</div>
              <div className="text-2xl font-bold text-green-600 mb-2">$8,301</div>
              <Badge variant="default">收支有餘</Badge>
              <div className="text-xs text-muted-foreground mt-2">收入: $35,000 | 支出: $26,699</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-semibold mb-2">總帳</div>
              <div className="text-2xl font-bold text-red-600 mb-2">-$13,349</div>
              <Badge variant="destructive">入不敷出</Badge>
              <div className="text-xs text-muted-foreground mt-2">總收入: $47,850 | 總支出: $61,199</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
