import { AuditAction } from '@prisma/client';
import { db } from './db';

export async function audit(userId: string, action: AuditAction, resource: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
  try {
    await db.auditLog.create({ data: { userId, action, resource, resourceId, metadataJson: JSON.stringify(metadata) } });
  } catch (e) {
    console.error('Audit logging failed (non-fatal):', e);
  }
}
