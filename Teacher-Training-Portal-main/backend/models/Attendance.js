import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  date: { type: Date, required: true },
  status: { type: String, enum: ["present", "absent", "late", "excused"], default: "present" },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Attendance = mongoose.model("Attendance", AttendanceSchema);
export default Attendance;
