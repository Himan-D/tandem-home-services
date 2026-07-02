import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE } from '../config';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

const SOCKET_URL = API_BASE;

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  const detachListeners = (socket) => {
    for (const [event, handlers] of listenersRef.current) {
      for (const handler of handlers) {
        socket.off(event, handler);
      }
    }
  };

  const attachListeners = (socket) => {
    for (const [event, handlers] of listenersRef.current) {
      for (const handler of handlers) {
        socket.on(event, handler);
      }
    }
  };

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        detachListeners(socketRef.current);
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      attachListeners(socket);
    });
    socket.on('disconnect', () => {
      setConnected(false);
      detachListeners(socket);
    });
    socket.on('connect_error', (err) => console.error('Socket error:', err.message));

    socketRef.current = socket;

    return () => {
      detachListeners(socket);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, user?.id]);

  const on = (event, handler) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(handler);
    if (socketRef.current?.connected) {
      socketRef.current.on(event, handler);
    }
    return () => {
      if (socketRef.current) socketRef.current.off(event, handler);
      listenersRef.current.get(event)?.delete(handler);
    };
  };

  const emit = (event, data) => {
    socketRef.current?.emit(event, data);
  };

  const joinBooking = (bookingId) => {
    socketRef.current?.emit('booking:join', bookingId);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, on, emit, joinBooking }}>
      {children}
    </SocketContext.Provider>
  );
}
