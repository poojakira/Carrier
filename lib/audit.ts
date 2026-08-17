import { AuditAction } from '@prisma/client';
import { db } from './db';

export async function audit(userId: string, action: AuditAction, resource: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
  await db.auditLog.create({ data: { userId, action, resource, resourceId, metadataJson: JSON.stringify(metadata) } });
}
