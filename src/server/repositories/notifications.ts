import { Notification } from "../../types";
import { Queryable } from "../db";
import { generateId } from "../ids";

export const notificationsRepository = {
  async listForUser(db: Queryable, userId: string): Promise<Notification[]> {
    const res = await db.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return res.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      message: row.message,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at
    }));
  },

  async createNotification(db: Queryable, userId: string, type: string, message: string): Promise<Notification> {
    const notification: Notification = {
      id: generateId("noti"),
      userId,
      type,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await db.query(
      "INSERT INTO notifications (id, user_id, type, message, is_read, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [notification.id, notification.userId, notification.type, notification.message, notification.isRead, notification.createdAt]
    );
    return notification;
  },

  async markRead(db: Queryable, id: string): Promise<void> {
    await db.query("UPDATE notifications SET is_read = true WHERE id = $1", [id]);
  },

  async markAllReadForUser(db: Queryable, userId: string): Promise<void> {
    await db.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [userId]);
  }
};
