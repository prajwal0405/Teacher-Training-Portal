import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "./models/User.js";
import { PortalSetting } from "./models/PortalSetting.js";

export async function validatePasswordAgainstPolicy(password) {
  try {
    const keys = ["minLength", "requireUppercase", "requireNumbers", "requireSpecial"];
    const docs = await PortalSetting.find({ key: { $in: keys } });
    const policy = {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecial: false,
    };
    docs.forEach((doc) => {
      if (doc.key === "minLength") {
        policy.minLength = Number(doc.value) || 8;
      } else {
        policy[doc.key] = doc.value === true || doc.value === "true";
      }
    });

    if (password.length < policy.minLength) {
      return { valid: false, message: `Password must be at least ${policy.minLength} characters long.` };
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one uppercase letter." };
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      return { valid: false, message: "Password must contain at least one number." };
    }
    if (policy.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: "Password must contain at least one special character." };
    }
    return { valid: true };
  } catch (error) {
    console.error("Error validating password against policy:", error);
    if (password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters long." };
    }
    return { valid: true };
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set. Using insecure default. Set JWT_SECRET in backend/.env for production.");
}

const JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || JWT_SECRET || "dev_access_secret_change_me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET || "dev_refresh_secret_change_me";
const JWT_RESET_SECRET   = process.env.JWT_RESET_SECRET   || JWT_SECRET || "dev_reset_secret_change_me";

const ROLE_PERMISSIONS = {
  super_admin: [
    "manage_admins", "manage_trainers", "manage_teachers", "manage_centers",
    "manage_batches", "manage_classes", "manage_courses", "manage_assignments",
    "manage_attendance", "manage_feedback", "manage_reports", "manage_notifications",
    "manage_roles", "assign_trainers", "assign_teachers", "review_submissions",
    "generate_certificates", "view_all_data"
  ],
  admin: [
    "manage_trainers", "manage_teachers", "manage_centers",
    "manage_batches", "manage_classes", "manage_courses", "manage_assignments",
    "manage_attendance", "manage_feedback", "manage_reports", "manage_notifications",
    "assign_teachers", "review_submissions", "generate_certificates",
    "view_assigned_data"
  ],
  trainer: [
    "view_assigned_courses", "manage_classes", "conduct_sessions",
    "mark_attendance", "create_assignments", "review_submissions",
    "provide_feedback", "track_teacher_performance"
  ],
  teacher: [
    "view_courses", "attend_sessions", "mark_participation",
    "submit_assignments", "view_feedback", "track_progress",
    "download_certificates"
  ]
};

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.teacher;
}

export function hasPermission(userRole, permission) {
  const permissions = getRolePermissions(userRole);
  return permissions.includes(permission) || permissions.includes("view_all_data");
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user) {
  const permissions = getRolePermissions(user.role);
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role, 
      email: user.email, 
      name: user.name, 
      type: "access",
      permissions
    },
    JWT_ACCESS_SECRET,
    { expiresIn: "7d" }
  );
}

export function createPasswordResetToken(email) {
  return jwt.sign(
    { email, purpose: "password_reset", type: "reset" },
    JWT_RESET_SECRET,
    { expiresIn: "15m" }
  );
}

export function verifyPasswordResetToken(token) {
  const payload = jwt.verify(token, JWT_RESET_SECRET);
  if (payload?.purpose !== "password_reset" || !payload?.email) {
    throw new Error("Invalid reset token");
  }
  return payload;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET);
    if (payload.type !== "access") {
      return res.status(401).json({ message: "Invalid token type" });
    }
    const user = await User.findById(payload.id).select("_id role name email status permissions passwordChangedAt passwordExpiresAt").lean();

    if (!user || user.status !== "approved") {
      return res.status(401).json({ message: "Account is not active" });
    }

    // Check password expiry
    if (user.passwordExpiresAt && new Date(user.passwordExpiresAt) < new Date()) {
      return res.status(401).json({ message: "Password has expired. Please reset your password.", code: "PASSWORD_EXPIRED" });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      status: user.status,
      permissions: user.permissions || getRolePermissions(user.role)
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid authorization token" });
    }
    return res.status(401).json({ message: "Authentication failed" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    const userPermissions = req.user?.permissions || [];
    const hasAccess = permissions.some(p => userPermissions.includes(p) || userPermissions.includes("view_all_data"));
    if (!hasAccess) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
