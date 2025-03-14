import { Resend } from 'resend'

// Initialize Resend for email sending
const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory notification store by user
const userNotifications: Record<string, Notification[]> = {};

// Define notification interfaces
interface Notification {
  id: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
  read: boolean;
}

// Base notification options
interface NotificationOptions {
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// Scan notification options
interface ScanNotificationOptions {
  userId: string;
  repositoryName: string;
  scanId: string;
  status: 'completed' | 'failed';
  summary?: {
    high: number;
    medium: number;
    low: number;
  };
}

// Safe import that won't break if WebSocket server isn't working
let notifyUserViaWebSocket: (userId: string, data: any) => void;

try {
  const websocketModule = require('@/pages/api/websocket');
  notifyUserViaWebSocket = websocketModule.sendWebSocketMessage;
} catch (error) {
  console.warn("WebSocket notification system not available, using fallback");
  notifyUserViaWebSocket = (userId: string, data: any) => {
    console.log(`[Notification Fallback] User ${userId}:`, data);
    return false;
  };
}

// Single implementation of sendNotification
export async function sendNotification(
  userId: string, 
  options: NotificationOptions
): Promise<Notification | null> {
  if (!userId) {
    throw new Error("User ID is required to send notification");
  }

  // Create the notification
  const notification: Notification = {
    id: generateId(),
    title: options.title,
    message: options.message,
    metadata: options.metadata || {},
    createdAt: new Date().toISOString(),
    read: false
  };

  // Initialize notifications array for user if needed
  if (!userNotifications[userId]) {
    userNotifications[userId] = [];
  }

  // Add notification to user's list
  userNotifications[userId].push(notification);

  // Limit to 100 notifications per user
  if (userNotifications[userId].length > 100) {
    userNotifications[userId] = userNotifications[userId].slice(-100);
  }

  console.log(`Notification sent to user ${userId}: ${notification.title}`);
  
  // Try to send via WebSocket if available
  try {
    notifyUserViaWebSocket(userId, {
      type: 'notification',
      notification
    });
  } catch (wsError) {
    console.warn("Error sending notification through WebSocket:", wsError);
  }
  
  // Return the created notification
  return notification;
}

// Implementation of sendScanNotification
export async function sendScanNotification(options: ScanNotificationOptions): Promise<Notification | null> {
  try {
    // Get user email from your user management system
    const userEmail = await getUserEmail(options.userId);
    
    const subject = `Scan ${options.status} for ${options.repositoryName}`;
    let content = `Your scheduled scan for ${options.repositoryName} has ${options.status}.`;
    
    if (options.status === 'completed' && options.summary) {
      content += `\n\nSummary:\n- High severity issues: ${options.summary.high}\n- Medium severity issues: ${options.summary.medium}\n- Low severity issues: ${options.summary.low}`;
    }

    // Email sending logic
    try {
      await resend.emails.send({
        from: 'CodeScan AI <notifications@codescan.ai>',
        to: userEmail,
        subject,
        text: content,
      });
      console.log(`Email sent to ${userEmail} with subject: ${subject}`);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }
    
    // Also send as in-app notification
    return sendNotification(options.userId, {
      title: subject,
      message: content,
      metadata: { scanId: options.scanId, repositoryName: options.repositoryName }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
}

async function getUserEmail(userId: string): Promise<string> {
  // Implement your user email lookup logic here
  return 'user@example.com';
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  if (!userId) {
    throw new Error("User ID is required to get notifications");
  }
  
  return userNotifications[userId] || [];
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<boolean> {
  if (!userId || !notificationId) {
    throw new Error("User ID and notification ID are required");
  }
  
  if (!userNotifications[userId]) {
    return false;
  }
  
  const notification = userNotifications[userId].find(n => n.id === notificationId);
  
  if (notification) {
    notification.read = true;
    return true;
  }
  
  return false;
}

export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<boolean> {
  if (!userId || !notificationId) {
    throw new Error("User ID and notification ID are required");
  }
  
  if (!userNotifications[userId]) {
    return false;
  }
  
  const initialLength = userNotifications[userId].length;
  userNotifications[userId] = userNotifications[userId].filter(n => n.id !== notificationId);
  
  return initialLength !== userNotifications[userId].length;
}

// Helper function to generate a random ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
} 