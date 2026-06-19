import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  timeLabel: { type: String },
  read: { type: Boolean, default: false },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedType: { type: String }
}, {
  timestamps: true
});

NotificationSchema.index({ teacherId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
