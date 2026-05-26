import { Notification } from "../../types";
import { Queryable } from "../db";
import { generateId } from "../ids";

type CreateNotificationInput = {
  userId: string;
  type?: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

export const notificationsRepository = {
  async listForUser(db: Queryable, userId: string, unreadOnly = false): Promise<Notification[]> {
    const res = unreadOnly
      ? await db.query("SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC", [userId])
      : await db.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return res.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      message: row.message,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at
    }));
  },

  async create(db: Queryable, input: CreateNotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: generateId("noti"),
      userId: input.userId,
      type: input.type || "info",
      message: input.message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await db.query(
      `INSERT INTO notifications (id, user_id, type, message, is_read, created_at, related_entity_type, related_entity_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.message,
        notification.isRead,
        notification.createdAt,
        input.relatedEntityType || null,
        input.relatedEntityId || null
      ]
    );
    return notification;
  },

  async createBulk(db: Queryable, notifications: CreateNotificationInput[]) {
    for (const notification of notifications) {
      await this.create(db, notification);
    }
  },

  async createNotification(db: Queryable, userId: string, type: string, message: string): Promise<Notification> {
    return this.create(db, { userId, type, message });
  },

  async markRead(db: Queryable, notificationId: string, userId?: string): Promise<void> {
    if (userId) {
      await db.query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", [notificationId, userId]);
      return;
    }
    await db.query("UPDATE notifications SET is_read = true WHERE id = $1", [notificationId]);
  },

  async markAllRead(db: Queryable, userId: string): Promise<void> {
    await db.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [userId]);
  },

  async markAllReadForUser(db: Queryable, userId: string): Promise<void> {
    await this.markAllRead(db, userId);
  }
};
