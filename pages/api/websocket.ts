import { NextApiRequest, NextApiResponse } from 'next'
import { Server as WebSocketServer } from 'ws'
import { parse } from 'url'

interface Client {
  userId: string
  ws: any
}

// WebSocket clients
let clients: Client[] = []
let wss: any

// Function to send notification to a specific user
export function notifyUser(userId: string, data: any) {
  // For server-side notification without WebSocket, just log
  console.log(`Notification for user ${userId}:`, data)
  
  // Only try to use WebSocket if we're on client-side or have an active WebSocket server
  if (typeof window !== 'undefined' || (wss && wss.clients)) {
    // Find all clients for this user and send them the notification
    const userClients = clients.filter(client => client.userId === userId)
    
    if (userClients.length > 0) {
      const message = JSON.stringify(data)
      userClients.forEach(client => {
        try {
          if (client.ws.readyState === 1) { // WebSocket.OPEN
            client.ws.send(message)
          }
        } catch (err) {
          console.error('Error sending WebSocket message:', err)
        }
      })
    }
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only handle WebSocket connections
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Handle WebSocket server setup lazily
  if (!wss) {
    try {
      // Check if the server has the WebSocket upgrade capability
      if (res.socket?.server?.wss) {
        // Re-use existing WebSocket server
        wss = res.socket.server.wss
      } else {
        // Create a new WebSocket server instance
        const server = res.socket?.server
        if (server) {
          wss = new WebSocketServer({ noServer: true })
          server.wss = wss
          
          // Handle WebSocket upgrade
          server.on('upgrade', (request: any, socket: any, head: any) => {
            const { pathname, query } = parse(request.url, true)
            
            if (pathname === '/api/websocket') {
              // Extract user ID from query parameter
              const userId = query.userId as string
              if (!userId) {
                socket.destroy()
                return
              }
              
              wss.handleUpgrade(request, socket, head, (ws: any) => {
                wss.emit('connection', ws, request, userId)
              })
            }
          })
          
          // Handle WebSocket connections
          wss.on('connection', (ws: any, request: any, userId: string) => {
            // Add client to the list
            clients.push({ userId, ws })
            
            // Send initial connection success message
            ws.send(JSON.stringify({ type: 'connection', message: 'Connected successfully' }))
            
            // Handle client disconnection
            ws.on('close', () => {
              clients = clients.filter(client => client.ws !== ws)
            })
          })
        }
      }
    } catch (error) {
      console.error('Error initializing WebSocket server:', error)
      // Continue without WebSocket support
    }
  }

  // Send response for the HTTP request
  res.status(200).json({ success: true })
} 