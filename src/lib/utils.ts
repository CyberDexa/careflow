import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "dd MMM yyyy")
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "dd MMM yyyy, HH:mm")
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isToday(d)) return `Today at ${format(d, "HH:mm")}`
  if (isYesterday(d)) return `Yesterday at ${format(d, "HH:mm")}`
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatAge(dateOfBirth: Date | string | null | undefined): string {
  if (!dateOfBirth) return "—"
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return `${age} yrs`
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function fullName(firstName: string, lastName: string, preferred?: string | null): string {
  if (preferred) return `${preferred} ${lastName}`
  return `${firstName} ${lastName}`
}

/**
 * Checks whether a caught error is a Next.js redirect error thrown by redirect().
 * Client components calling server actions that trigger redirect() must re-throw these.
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as Record<string, unknown>).digest === "string" &&
    ((error as Record<string, unknown>).digest as string).startsWith("NEXT_REDIRECT")
  )
}
