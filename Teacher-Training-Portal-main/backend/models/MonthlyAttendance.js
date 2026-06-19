import mongoose from "mongoose";

const MonthlyAttendanceSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  attendancePercentage: { type: Number, default: 0 },
  totalClasses: { type: Number, default: 0 },
  classesAttended: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const MonthlyAttendance = mongoose.model("MonthlyAttendance", MonthlyAttendanceSchema);
export default MonthlyAttendance;
