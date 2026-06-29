import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

let socketInstance = null

function getSocket(token) {
  if (!socketInstance || !socketInstance.connected) {
    if (socketInstance) socketInstance.disconnect()
    socketInstance = io('/', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socketInstance
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

export default function useSocket(events, deps = []) {
  const handlersRef = useRef(events)
  handlersRef.current = events

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const socket = getSocket(token)

    const names = Object.keys(handlersRef.current)
    names.forEach((name) => {
      socket.on(name, (data) => handlersRef.current[name]?.(data))
    })

    return () => {
      names.forEach((name) => socket.off(name))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
