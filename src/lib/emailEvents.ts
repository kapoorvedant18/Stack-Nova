/**
 * Lightweight event bus so Dashboard and Emails stay in sync
 * without needing a global state manager.
 */
const bus = new EventTarget();

export const emailEvents = {
  emitDeleted: (id: string) => {
    bus.dispatchEvent(new CustomEvent("email-deleted", { detail: { id } }));
  },
  onDeleted: (handler: (id: string) => void) => {
    const listener = (e: Event) => handler((e as CustomEvent<{ id: string }>).detail.id);
    bus.addEventListener("email-deleted", listener);
    return () => bus.removeEventListener("email-deleted", listener);
  },
  emitRefresh: () => {
    bus.dispatchEvent(new CustomEvent("email-refresh"));
  },
  onRefresh: (handler: () => void) => {
    bus.addEventListener("email-refresh", handler);
    return () => bus.removeEventListener("email-refresh", handler);
  },
};