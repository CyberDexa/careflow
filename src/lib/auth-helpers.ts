import { auth } from "@/auth"
import { redirect } from "next/navigation"

export async function getServerSession() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return session
}

export async function getOptionalSession() {
  return await auth()
}

export function requireRole(
  userRole: string,
  allowedRoles: string[]
): boolean {
  return allowedRoles.includes(userRole)
}

export const ROLE_HIERARCHY = {
  ADMIN: 4,
  MANAGER: 3,
  SENIOR_CARER: 2,
  CARE_STAFF: 1,
} as const

export function canApprove(role: string): boolean {
  return ["ADMIN", "MANAGER", "SENIOR_CARER"].includes(role)
}

export function isManager(role: string): boolean {
  return ["ADMIN", "MANAGER"].includes(role)
}
