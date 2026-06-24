import mongoose from "mongoose";

const childAttendanceRecordSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
    status: { type: String, enum: ["present", "absent", "late", "excused"], default: "present" },
    note: String,
  },
  { _id: false }
);

const childAttendanceSessionSchema = new mongoose.Schema(
  {
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    attendanceDate: { type: Date, required: true, index: true },
    records: [childAttendanceRecordSchema],
    submittedAt: Date,
    lockedAt: Date,
  },
  { timestamps: true }
);

childAttendanceSessionSchema.index({ class: 1, attendanceDate: 1 }, { unique: true });

const teacherAttendanceRecordSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    attendanceDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ["present", "absent", "late", "excused"], default: "present" },
    source: { type: String, enum: ["manual", "geo", "system"], default: "manual" },
    latitude: Number,
    longitude: Number,
    note: String,
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

teacherAttendanceRecordSchema.index({ teacher: 1, attendanceDate: 1 }, { unique: true });

export const ChildAttendanceSession = mongoose.model("ChildAttendanceSession", childAttendanceSessionSchema);
export const TeacherAttendanceRecord = mongoose.model("TeacherAttendanceRecord", teacherAttendanceRecordSchema);
