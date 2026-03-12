"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createMonthlyReview } from "@/actions/assessments"

interface Props {
  residentId: string
}

export function StartMonthlyReviewButton({ residentId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await createMonthlyReview(residentId)
      if ("error" in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Monthly review started")
      router.push(`/residents/${residentId}/assessments/${result.assessmentId}`)
    })
  }

  return (
    <Button onClick={handleClick} disabled={isPending} size="sm" variant="outline">
      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Starting…" : "Start Monthly Review"}
    </Button>
  )
}
