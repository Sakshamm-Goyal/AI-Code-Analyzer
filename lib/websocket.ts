export class WebSocketService {
  private socket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second delay

  constructor(private url: string, private userId: string) {}

  connect() {
    try {
      this.socket = new WebSocket(`${this.url}?userId=${this.userId}`)

      this.socket.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
      }

      this.socket.onclose = () => {
        console.log('WebSocket disconnected')
        this.handleReconnect()
      }

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
    } catch (error) {
      console.error('Error connecting to WebSocket:', error)
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log('Attempting to reconnect...')
        this.reconnectAttempts++
        this.reconnectDelay *= 2 // Exponential backoff
        this.connect()
      }, this.reconnectDelay)
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'scan_progress':
        this.handleScanProgress(data)
        break
      case 'scan_complete':
        this.handleScanComplete(data)
        break
      case 'security_alert':
        this.handleSecurityAlert(data)
        break
      default:
        console.log('Unknown message type:', data.type)
    }
  }

  private handleScanProgress(data: any) {
    // Dispatch custom event for scan progress
    window.dispatchEvent(new CustomEvent('scanProgress', { detail: data }))
  }

  private handleScanComplete(data: any) {
    // Dispatch custom event for scan completion
    window.dispatchEvent(new CustomEvent('scanComplete', { detail: data }))
  }

  private handleSecurityAlert(data: any) {
    // Dispatch custom event for security alerts
    window.dispatchEvent(new CustomEvent('securityAlert', { detail: data }))
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }
} 