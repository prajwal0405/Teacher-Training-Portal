import mongoose from "mongoose";

const TeacherNotificationSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "AutomationTeacher" },
  teacherId: { type: String, index: true },
  title: String,
  message: String,
  notificationDate: { type: String, index: true },
  type: { type: String, default: "Daily Task" },
  readStatus: { type: Boolean, default: false },
  visibleFrom: Date,
  relatedAssignment: { type: mongoose.Schema.Types.ObjectId, ref: "DailyTaskAssignment" }
}, { timestamps: true });

export const TeacherNotification = mongoose.models.TeacherNotification || mongoose.model("TeacherNotification", TeacherNotificationSchema);
export default TeacherNotification;
