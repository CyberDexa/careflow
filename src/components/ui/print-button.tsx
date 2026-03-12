"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  label?: string
  className?: string
}

export function PrintButton({ label = "Print", className }: Props) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`no-print min-h-[44px] ${className ?? ""}`}
      onClick={() => window.print()}
    >
      <Printer className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
