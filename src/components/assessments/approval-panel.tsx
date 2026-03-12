"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { approveAssessment } from "@/actions/assessments"

interface Props {
  assessmentId: string
  residentId: string
  residentName: string
  assessmentType: string
}

export function AssessmentApprovalPanel({ assessmentId, residentId, residentName, assessmentType }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isAdmission = assessmentType === "ADMISSION"

  function handleApprove() {
    startTransition(async () => {
      const res = await approveAssessment(assessmentId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(
          isAdmission
            ? `Assessment approved — ${residentName} is now admitted`
            : "Assessment approved"
        )
        router.push(`/residents/${residentId}?tab=assessments`)
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-3">
      <div className="flex items-center gap-2 text-amber-800">
        <ShieldCheck className="h-5 w-5" />
        <h3 className="font-semibold text-sm">Assessment ready for approval</h3>
      </div>
      <p className="text-sm text-amber-700">
        This assessment for <strong>{residentName}</strong> has been submitted by staff and is awaiting your approval.
        {isAdmission && " Approving this assessment will change the resident status to Admitted."}
      </p>
      <Button
        onClick={handleApprove}
        disabled={isPending}
        className="gap-2 bg-green-600 hover:bg-green-700"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {isAdmission ? "Approve & Admit Resident" : "Approve Assessment"}
      </Button>
    </div>
  )
}
