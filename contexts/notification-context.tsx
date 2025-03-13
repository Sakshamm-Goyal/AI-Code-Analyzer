import { createContext, useContext, useEffect, useState } from 'react'
import { WebSocketService } from '@/lib/websocket'
import { useToast } from '@/components/ui/use-toast'

interface NotificationContextType {
  notifications: Notification[]
  markAsRead: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children, userId }: { children: React.ReactNode, userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { toast } = useToast()
  
  useEffect(() => {
    const ws = new WebSocketService(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL!,
      userId
    )

    ws.connect()

    const handleScanComplete = (event: CustomEvent) => {
      const { detail } = event
      toast({
        title: detail.title,
        description: detail.message,
      })
      setNotifications(prev => [...prev, detail])
    }

    const handleSecurityAlert = (event: CustomEvent) => {
      const { detail } = event
      toast({
        title: detail.title,
        description: detail.message,
        variant: "destructive",
      })
      setNotifications(prev => [...prev, detail])
    }

    window.addEventListener('scanComplete', handleScanComplete as EventListener)
    window.addEventListener('securityAlert', handleSecurityAlert as EventListener)

    return () => {
      ws.disconnect()
      window.removeEventListener('scanComplete', handleScanComplete as EventListener)
      window.removeEventListener('securityAlert', handleSecurityAlert as EventListener)
    }
  }, [userId])

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
} 