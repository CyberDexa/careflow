import { prisma } from '@/lib/prisma'

interface AuditParams {
  organisationId: string
  userId: string
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
  ipAddress?: string
}

export async function logAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        organisationId: params.organisationId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before as never ?? undefined,
        after: params.after as never ?? undefined,
        ipAddress: params.ipAddress,
      },
    })
  } catch {
    // Audit logging should not break the main flow
    console.error('[Audit] Failed to log:', params)
  }
}
