import { useMemo } from "react";
import { useNotifications } from "../state/NotificationsContext";

/**
 * Hook to filter notifications by estate ID
 * Restricts notifications like maintenance, alerts, etc. to only show for the specific estate
 * Global notifications (payments, system updates) are still shown regardless of estate
 * @param {string} estateId - The estate ID to filter notifications for
 * @returns {object} - Filtered notifications context with estate-restricted items
 */
export function useEstateNotifications(estateId) {
  const context = useNotifications();

  // Notification kinds that should NOT be filtered by estate (global notifications)
  const GLOBAL_NOTIFICATION_KINDS = new Set([
    "payment",
    "payment.received",
    "payment.failed",
    "payment.pending",
    "system.update",
    "system.notice",
    "billing",
    "subscription"
  ]);

  // Filtered items based on estate context
  const filteredItems = useMemo(() => {
    if (!estateId) return context.items;

    return context.items.filter((item) => {
      // Always show global notifications
      const isGlobalKind = GLOBAL_NOTIFICATION_KINDS.has(item.kind);
      if (isGlobalKind) return true;

      // For estate-specific notifications, check if estateId matches
      const itemEstateId = item.payload?.estateId || item.estateId;
      if (!itemEstateId) return true; // Show if no estate context (shouldn't happen)

      return String(itemEstateId) === String(estateId);
    });
  }, [context.items, estateId]);

  const filteredUnreadCount = useMemo(() => {
    return filteredItems.filter((item) => item.unread).length;
  }, [filteredItems]);

  return {
    ...context,
    items: filteredItems,
    unreadCount: filteredUnreadCount
  };
}
