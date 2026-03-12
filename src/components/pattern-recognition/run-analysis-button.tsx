'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Brain, Loader2 } from 'lucide-react'
import { runResidentPatternAnalysis } from '@/actions/pattern-recognition'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  residentId: string
}

export function RunPatternAnalysisButton({ residentId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRun() {
    startTransition(async () => {
      const res = await runResidentPatternAnalysis(residentId)
      if ('error' in res) {
        toast.error(res.error as string)
      } else {
        if (res.alertCount === 0) {
          toast.success('Analysis complete — no new patterns identified')
        } else {
          toast.success(`Pattern analysis complete — ${res.alertCount} alert(s) generated`)
        }
        router.refresh()
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRun}
      disabled={isPending}
      className="gap-2"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Brain className="h-4 w-4" />
      )}
      {isPending ? 'Analysing...' : 'Run AI Pattern Analysis'}
    </Button>
  )
}
