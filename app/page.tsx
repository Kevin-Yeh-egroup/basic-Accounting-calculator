import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, BarChart3, Brain, Clock } from "lucide-react"

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
      {/* 頂部版本切換列 */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-sm bg-white/5">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
            新版 Beta
          </span>
          <span className="text-white/50 text-sm hidden sm:inline">新版介面開發中</span>
        </div>
        <Link href="/v1">
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white bg-transparent h-8 px-3 text-xs gap-1.5"
          >
            切換舊版
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* 主要內容 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        {/* 光暈背景裝飾 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[250px] h-[250px] bg-blue-600/15 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          {/* 標誌圖示 */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* 主標題 */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 rounded-full px-4 py-1.5 text-indigo-300 text-sm font-medium">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              即將推出
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight">
              {"Coming"}
              <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Soon
              </span>
            </h1>

            <p className="text-white/60 text-lg sm:text-xl leading-relaxed max-w-lg mx-auto">
              全新設計的財務分析介面正在開發中，帶來更強大的功能與更直覺的使用體驗。
            </p>
          </div>

          {/* 功能預告卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left backdrop-blur-sm hover:bg-white/8 transition-colors">
              <Brain className="w-5 h-5 text-indigo-400 mb-2" />
              <p className="text-white/90 text-sm font-medium">更智慧的 AI 分析</p>
              <p className="text-white/40 text-xs mt-1">深度解讀財務模式</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left backdrop-blur-sm hover:bg-white/8 transition-colors">
              <BarChart3 className="w-5 h-5 text-purple-400 mb-2" />
              <p className="text-white/90 text-sm font-medium">互動式圖表儀表板</p>
              <p className="text-white/40 text-xs mt-1">視覺化掌握收支趨勢</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left backdrop-blur-sm hover:bg-white/8 transition-colors">
              <Sparkles className="w-5 h-5 text-pink-400 mb-2" />
              <p className="text-white/90 text-sm font-medium">個人化財務建議</p>
              <p className="text-white/40 text-xs mt-1">量身打造的理財策略</p>
            </div>
          </div>

          {/* CTA 按鈕 */}
          <div className="pt-2">
            <Link href="/v1">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white bg-transparent px-8 gap-2"
              >
                繼續使用舊版
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div className="py-4 text-center text-white/20 text-xs">
        月收支分析工具 · 新版開發中
      </div>
    </div>
  )
}
