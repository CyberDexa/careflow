"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { logoutProfessional } from "@/actions/professional"

export function ProfessionalLogout() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logoutProfessional()
      router.push("/professional/login")
    })
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isPending}>
      <LogOut className="h-4 w-4 mr-1" />
      Sign Out
    </Button>
  )
}
