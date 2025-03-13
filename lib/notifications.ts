// Safe import that won't break if WebSocket server isn't working
let notifyUserFn: (userId: string, data: any) => void;

try {
  const websocketModule = require('@/pages/api/websocket');
  notifyUserFn = websocketModule.notifyUser;
} catch (error) {
  console.warn("WebSocket notification system not available, using fallback");
  notifyUserFn = (userId: string, data: any) => {
    console.log(`[Notification Fallback] User ${userId}:`, data);
    return Promise.resolve();
  };
}

type NotificationType = "scan_complete" | "security_alert" | "error"
type NotificationPriority = "high" | "medium" | "low"

interface NotificationOptions {
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  metadata?: Record<string, any>
}

export async function sendNotification(userId: string, options: NotificationOptions) {
  try {
    // Send to WebSocket clients using the safely imported function
    notifyUserFn(userId, {
      type: options.type,
      ...options,
      timestamp: new Date().toISOString(),
    });

    // Also store in database (if needed)
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ...options,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.warn("Failed to store notification in database");
      }
      
      return { success: true };
    } catch (dbError) {
      console.warn("Error storing notification:", dbError);
      return { success: true, warning: "Notification sent but not stored" };
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    // Return success anyway - don't let notification failure block other operations
    return { success: true, warning: "Notification system error" };
  }
} 