import { getDb } from '../db/connection.js';
import { UserRole } from '../types.js';

export async function recordAuditLog(params: {
  userId?: string | null;
  userName?: string;
  role?: string;
  action: string;
  targetResource: string;
  targetId?: string;
  previousValues?: any;
  newValues?: any;
  ipAddress?: string;
}) {
  try {
    const db = getDb();
    await db.AuditLogs.create({
      userId: params.userId || null,
      userName: params.userName || 'System',
      role: params.role || 'SYSTEM',
      action: params.action,
      targetResource: params.targetResource,
      targetId: params.targetId || '',
      previousValues: params.previousValues ?? null,
      newValues: params.newValues ?? null,
      ipAddress: params.ipAddress || '',
    });
  } catch (err) {
    console.error('Audit log error:', (err as Error).message);
  }
}

export async function notifyUser(params: {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
}) {
  try {
    const db = getDb();
    await db.Notifications.create({
      recipientId: params.recipientId,
      type: params.type,
      title: params.title,
      message: params.message,
      resourceType: params.resourceType || '',
      resourceId: params.resourceId || '',
      isRead: false,
    });
  } catch (err) {
    console.error('Notification error:', (err as Error).message);
  }
}

export async function notifySuperAdmins(params: {
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
}) {
  try {
    const db = getDb();
    const admins: any[] = await db.Users.find({ role: UserRole.SUPER_ADMIN, isBlocked: false }).lean();
    await Promise.all(
      admins.map((admin) =>
        notifyUser({
          recipientId: String(admin._id),
          ...params,
        })
      )
    );
  } catch (err) {
    console.error('Admin notification error:', (err as Error).message);
  }
}
