import { Pool } from "pg";

export type EventType =
  | "grade.saved"
  | "attendance.session.saved"
  | "tuition.overdue"
  | "registration.dropped"
  | "scholarship.approved"
  | "leave.approved"
  | "program.completed";

type Handler<T = any> = (payload: T, pool: Pool) => Promise<void>;

class EventBus {
  private listeners: Map<EventType, Handler[]> = new Map();

  on<T>(event: EventType, handler: Handler<T>) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(handler as Handler);
  }

  async emit<T>(event: EventType, payload: T, pool: Pool) {
    const handlers = this.listeners.get(event) || [];
    for (const handler of handlers) {
      try {
        await handler(payload, pool);
      } catch (err) {
        console.error(`[EventBus] Handler error for "${event}":`, err);
      }
    }
  }
}

export const eventBus = new EventBus();
