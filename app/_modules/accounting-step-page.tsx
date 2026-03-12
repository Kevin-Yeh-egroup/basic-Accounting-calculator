import { MvpAccountingPage, type PageStep } from "@/app/page"

interface AccountingStepPageProps {
  readonly step: PageStep
}

export function AccountingStepPage({ step }: AccountingStepPageProps) {
  return <MvpAccountingPage initialStep={step} />
}
