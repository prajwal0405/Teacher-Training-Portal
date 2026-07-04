import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

let socket = null;
let listeners = new Map();
let isConnected = false;

/**
 * Connect to the Socket.IO server
 */
export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    isConnected = true;
    console.log("[socket] Connected:", socket.id);
    // Re-register listeners after reconnect
    listeners.forEach((handler, event) => {
      socket.on(event, handler);
    });
  });

  socket.on("disconnect", (reason) => {
    isConnected = false;
    console.log("[socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] Connection error:", err.message);
  });

  return socket;
}

/**
 * Disconnect the socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isConnected = false;
    listeners.clear();
  }
}

/**
 * Register a listener for a socket event
 * Returns unsubscribe function
 */
export function onSocketEvent(event, handler) {
  if (!socket) {
    console.warn("[socket] Not connected, cannot listen:", event);
    return () => {};
  }

  socket.on(event, handler);
  listeners.set(event, handler);

  return () => {
    if (socket) {
      socket.off(event, handler);
    }
    listeners.delete(event);
  };
}

/**
 * Emit an event through socket
 */
export function emitSocketEvent(event, data) {
  if (!socket?.connected) {
    console.warn("[socket] Not connected, cannot emit:", event);
    return;
  }
  socket.emit(event, data);
}

/**
 * Join a course room for real-time updates
 */
export function joinCourseRoom(courseId) {
  emitSocketEvent("join:course", courseId);
}

/**
 * Leave a course room
 */
export function leaveCourseRoom(courseId) {
  emitSocketEvent("leave:course", courseId);
}

export function getSocket() {
  return socket;
}

export function getConnectionStatus() {
  return isConnected;
}