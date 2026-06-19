import mongoose from "mongoose";

const DailyAttendanceStudentSchema = new mongoose.Schema({
  rollNo: { type: Number, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ["P", "A", "L"], default: "P" }
}, { _id: false });

const DailyAttendanceSheetSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  teacherEmail: { type: String, required: true },
  subject: { type: String, required: true },
  sheetDate: { type: String, required: true },
  roster: [DailyAttendanceStudentSchema],
  isLocked: { type: Boolean, default: false },
  lockedAt: { type: Date },
  lockedBy: { type: String },
  lockedEmail: { type: String },
  notes: { type: String }
}, {
  timestamps: true
});

DailyAttendanceSheetSchema.index({ teacherId: 1, subject: 1, sheetDate: 1 }, { unique: true });

const DailyAttendanceSheet = mongoose.model("DailyAttendanceSheet", DailyAttendanceSheetSchema);
export default DailyAttendanceSheet;
