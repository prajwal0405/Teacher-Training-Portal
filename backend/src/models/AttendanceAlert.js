import mongoose from "mongoose";

const attendanceAlertSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    attendanceRate: { type: Number, required: true, min: 0, max: 100 },
    threshold: { type: Number, required: true, min: 0, max: 100, default: 75 },
    alertType: {
      type: String,
      enum: ["low_attendance", "critical_low_attendance", "attendance_recovered", "absent_consecutive"],
      required: true,
      index: true,
    },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "warning" },
    message: { type: String, required: true },
    consecutiveAbsences: { type: Number, default: 0, min: 0 },
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    metadata: {
      course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
      periodStart: Date,
      periodEnd: Date,
      totalSessions: Number,
      presentSessions: Number,
    },
  },
  { timestamps: true }
);

attendanceAlertSchema.index({ teacher: 1, createdAt: -1 });
attendanceAlertSchema.index({ center: 1, alertType: 1, resolved: 1 });
attendanceAlertSchema.index({ class: 1, createdAt: -1 });

export const AttendanceAlert = mongoose.model("AttendanceAlert", attendanceAlertSchema);
