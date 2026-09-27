'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket(tenantId: string): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    if (!socket) {
      socket = io({ path: '/api/socket', transports: ['websocket'] });
    }

    socketRef.current = socket;

    socket.on('connect', () => {
      socket?.emit('join-tenant', { tenantId });
    });

    if (socket.connected) {
      socket.emit('join-tenant', { tenantId });
    }

    return () => {
      // Don't disconnect on unmount — keep persistent connection
    };
  }, [tenantId]);

  return socketRef.current;
}
