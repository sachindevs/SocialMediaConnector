import { connectDB } from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { Types } from 'mongoose';

export async function logAction(
  tenantId: string,
  userId: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: userId ? new Types.ObjectId(userId) : undefined,
      action,
      targetType,
      targetId,
      metadata,
    });
  } catch (err) {
    // Audit log failures should never crash the main flow
    console.error('[AuditLog] Failed to log action:', action, err);
  }
}
