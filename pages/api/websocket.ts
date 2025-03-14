import { Server as WebSocketServer } from 'ws'
import type { NextApiRequest } from 'next'
import type { Server as HTTPServer } from 'http'
import type { Socket } from 'net'
import type { NextApiResponse } from 'next'

// Store the WebSocket server instance
let wsServer: WebSocketServer | null = null

// Store active connections
const connections = new Map<string, Set<WebSocket>>()

// Custom interface for response with socket server
interface ResponseWithSocket extends NextApiResponse {
  socket: Socket & {
    server: HTTPServer & {
      wss?: WebSocketServer
    }
  }
}

export default function handler(req: NextApiRequest, res: ResponseWithSocket) {
  // Only allow WebSocket connections
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Check if the WebSocket server is already initialized
  if (!res.socket.server.wss) {
    // Initialize WebSocket server
    res.socket.server.wss = new WebSocketServer({ 
      noServer: true 
    })

    // Store the server instance
    wsServer = res.socket.server.wss
    
    // Handle upgrade of HTTP connection to WebSocket
    res.socket.server.on('upgrade', (request, socket, head) => {
      if (!res.socket.server.wss) return
      
      res.socket.server.wss.handleUpgrade(request, socket, head, (ws) => {
        res.socket.server.wss.emit('connection', ws, request)
      })
    })
    
    // Handle new connections
    res.socket.server.wss.on('connection', (ws, req) => {
      // Extract user ID from query
      const url = new URL(req.url || '', `http://${req.headers.host}`)
      const userId = url.searchParams.get('userId')
      
      if (!userId) {
        ws.close(1008, 'Missing userId')
        return
      }
      
      // Store connection
      if (!connections.has(userId)) {
        connections.set(userId, new Set())
      }
      connections.get(userId)?.add(ws)
      
      console.log(`New WebSocket connection for user ${userId}`)
      
      // Send initial connection message
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }))
      
      // Handle connection close
      ws.on('close', () => {
        connections.get(userId)?.delete(ws)
        if (connections.get(userId)?.size === 0) {
          connections.delete(userId)
        }
        console.log(`WebSocket connection closed for user ${userId}`)
      })
    })
  }
  
  // Return success response
  res.status(200).json({ message: 'WebSocket server ready' })
}

// Function to send a notification to a specific user
export function sendWebSocketMessage(userId: string, data: any) {
  if (!connections.has(userId)) {
    return false
  }
  
  const userConnections = connections.get(userId)
  if (!userConnections || userConnections.size === 0) {
    return false
  }
  
  // Send to all connections for this user
  const message = JSON.stringify(data)
  userConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message)
    }
  })
  
  return true
} 