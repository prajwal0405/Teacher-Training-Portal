import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    channel: { type: String, enum: ["in_app", "email", "sms", "push", "whatsapp"], default: "in_app" },
    title: { type: String, required: true },
    body: { type: String },
    message: { type: String },
    type: { type: String, enum: ["session", "assignment", "approval", "certificate", "course", "announcement", "info"], default: "info" },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    status: { type: String, enum: ["queued", "sent", "delivered", "failed"], default: "queued" },
    read: { type: Boolean, default: false, index: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
    sentAt: Date,
    error: { type: String, default: null },
  },
  { timestamps: true }
);

// Pre-save middleware to keep fields in sync
notificationSchema.pre("save", function(next) {
  if (this.teacherId && !this.recipient) {
    this.recipient = this.teacherId;
  } else if (this.recipient && !this.teacherId) {
    this.teacherId = this.recipient;
  }
  
  if (this.message && !this.body) {
    this.body = this.message;
  } else if (this.body && !this.message) {
    this.message = this.body;
  }
  
  if (this.isRead !== undefined && this.read === undefined) {
    this.read = this.isRead;
  } else if (this.read !== undefined && this.isRead === undefined) {
    this.isRead = this.read;
  } else if (this.isRead !== this.read) {
    if (this.isModified("isRead")) {
      this.read = this.isRead;
    } else {
      this.isRead = this.read;
    }
  }
  
  next();
});

export const Notification = mongoose.model("Notification", notificationSchema);
