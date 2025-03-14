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

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface NotificationOptions {
  userId: string
  repositoryName: string
  scanId: string
  status: 'completed' | 'failed'
  summary?: {
    high: number
    medium: number
    low: number
  }
}

export async function sendScanNotification({
  userId,
  repositoryName,
  scanId,
  status,
  summary,
}: NotificationOptions) {
  try {
    // Get user email from your user management system
    const userEmail = await getUserEmail(userId)
    
    const subject = `Scan ${status} for ${repositoryName}`
    let content = `Your scheduled scan for ${repositoryName} has ${status}.`
    
    if (status === 'completed' && summary) {
      content += `\n\nSummary:\n- High severity issues: ${summary.high}\n- Medium severity issues: ${summary.medium}\n- Low severity issues: ${summary.low}`
    }

    await resend.emails.send({
      from: 'CodeScan AI <notifications@codescan.ai>',
      to: userEmail,
      subject,
      text: content,
    })
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

async function getUserEmail(userId: string): Promise<string> {
  // Implement your user email lookup logic here
  return 'user@example.com'
} 