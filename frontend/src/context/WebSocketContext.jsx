import { createContext, useContext, useState } from 'react'

/**
 * WebSocketContext — broadcasts WebSocket connection state app-wide.
 * Any component (e.g. Navbar status pill) can read `connectionStatus` without prop drilling.
 */
const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // 'connected' | 'reconnecting' | 'disconnected'

  return (
    <WebSocketContext.Provider value={{ connectionStatus, setConnectionStatus }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocketContext must be inside <WebSocketProvider>')
  return ctx
}
