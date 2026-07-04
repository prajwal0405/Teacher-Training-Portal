import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "./models/User.js";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const payload = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "dev_access_secret_change_me"
      );
      socket.userId = payload.id;
      socket.userRole = payload.role;
      socket.userName = payload.name;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {


    // Join role-based room
    socket.join(`role:${socket.userRole}`);
    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Admin joins admin room
    if (socket.userRole === "admin") {
      socket.join("admins");
    }

    socket.on("disconnect", () => {

    });

    // Allow joining specific rooms
    socket.on("join:course", (courseId) => {
      if (courseId) socket.join(`course:${courseId}`);
    });

    socket.on("leave:course", (courseId) => {
      if (courseId) socket.leave(`course:${courseId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocket first.");
  }
  return io;
}

/**
 * Emit a real-time event to a specific user
 */
export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit a real-time event to all admins
 */
export function emitToAdmins(event, data) {
  if (!io) return;
  io.to("admins").emit(event, data);
}

/**
 * Emit to all users with a specific role
 */
export function emitToRole(role, event, data) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
}

/**
 * Emit to all participants of a course
 */
export function emitToCourse(courseId, event, data) {
  if (!io) return;
  io.to(`course:${courseId}`).emit(event, data);
}

/**
 * Create a notification and emit it in real-time
 */
export async function createAndEmitNotification({ recipientId, title, body, type = "in_app", metadata = {} }) {
  const { Notification } = await import("./models/Notification.js");
  
  const notification = await Notification.create({
    recipient: recipientId,
    title,
    body,
    channel: type === "course_assigned" || type === "assignment_reviewed" ? "in_app" : type,
    status: "delivered",
    sentAt: new Date(),
    metadata: { ...metadata, category: type === "course_assigned" ? "course" : type === "assignment_reviewed" ? "assignment" : "system", priority: "normal" },
  });

  // Populate for real-time display
  const populated = await Notification.findById(notification._id)
    .populate("recipient", "name email");

  emitToUser(recipientId, "notification:new", populated);

  // Also emit to admins for monitoring
  emitToAdmins("notification:created", {
    notificationId: notification._id,
    recipientId,
    title,
    body,
  });

  return populated;
}