'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { triggerAllRiskCalculations } from '@/actions/risk-analytics'

export function RecalculateRiskButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  const handleCalculate = () => {
    setResult(null)
    startTransition(async () => {
      const results = await triggerAllRiskCalculations()
      const succeeded = results.filter((r: any) => r.success).length
      const failed = results.filter((r: any) => !r.success).length
      setResult(
        failed > 0
          ? `${succeeded} calculated, ${failed} failed`
          : `${succeeded} resident${succeeded !== 1 ? 's' : ''} calculated`
      )
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCalculate}
        disabled={isPending}
        className="gap-1.5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Calculating…' : 'Calculate Risk Scores'}
      </Button>
    </div>
  )
}
