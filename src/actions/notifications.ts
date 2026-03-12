"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function getUnreadNotifications() {
  const session = await getServerSession()
  const user = session.user as any
  const orgId = user.organisationId as string
  const userId = user.id as string

  return prisma.notification.findMany({
    where: {
      organisationId: orgId,
      OR: [{ userId: null }, { userId }],
      isRead: false,
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  })
}

export async function markNotificationRead(id: string) {
  const session = await getServerSession()
  const user = session.user as any
  const orgId = user.organisationId as string

  await prisma.notification.update({
    where: { id, organisationId: orgId },
    data: { isRead: true },
  })
  revalidatePath("/", "layout")
}

export async function markAllNotificationsRead() {
  const session = await getServerSession()
  const user = session.user as any
  const orgId = user.organisationId as string
  const userId = user.id as string

  await prisma.notification.updateMany({
    where: {
      organisationId: orgId,
      OR: [{ userId: null }, { userId }],
      isRead: false,
    },
    data: { isRead: true },
  })
  revalidatePath("/", "layout")
}

// ─────────────────────────────────────────────
// Internal helper — can be called from other server actions
// ─────────────────────────────────────────────
export async function createNotification({
  organisationId,
  userId,
  type,
  title,
  body,
  entityType,
  entityId,
}: {
  organisationId: string
  userId?: string
  type: string
  title: string
  body: string
  entityType?: string
  entityId?: string
}) {
  try {
    await prisma.notification.create({
      data: {
        organisationId,
        userId,
        type: type as never,
        title,
        body,
        entityType,
        entityId,
      },
    })
  } catch {
    console.error('[Notification] Failed to create notification:', { type, title })
  }
}
