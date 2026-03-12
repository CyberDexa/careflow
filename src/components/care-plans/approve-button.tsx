"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { approveCarePlan } from "@/actions/care-plans"

interface Props {
  planId: string
}

export function ApproveCarePlanButton({ planId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveCarePlan(planId)
      if ("error" in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Care plan approved and activated")
    })
  }

  return (
    <Button size="sm" onClick={handleApprove} disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
      Approve
    </Button>
  )
}
