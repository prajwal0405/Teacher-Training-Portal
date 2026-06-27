import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { connectSocket, disconnectSocket, onSocketEvent } from "../services/socket";
import { getStoredSession } from "../services/api";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [events, setEvents] = useState({});
  const listenersRef = useRef(new Map());

  useEffect(() => {
    const session = getStoredSession();
    if (!session?.token) return;

    const socket = connectSocket(session.token);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Listen for new notifications
    socket.on("notification:new", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Listen for admin events
    socket.on("admin:update", (data) => {
      setEvents((prev) => ({ ...prev, [data.type]: { ...data, _ts: Date.now() } }));
    });

    // Listen for teacher events
    socket.on("teacher:update", (data) => {
      setEvents((prev) => ({ ...prev, [data.type]: { ...data, _ts: Date.now() } }));
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const value = {
    connected,
    notifications,
    unreadCount,
    events,
    markAllRead,
    clearNotifications,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return ctx;
}

export default SocketContext;