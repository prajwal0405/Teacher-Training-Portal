import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    channel: { type: String, enum: ["in_app", "email", "sms", "push", "whatsapp"], default: "in_app" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["queued", "sent", "delivered", "failed", "scheduled"], default: "queued" },
    read: { type: Boolean, default: false, index: true },
    readAt: Date,
    sentAt: Date,
    scheduledFor: Date,
    error: { type: String, default: null },
    idempotencyKey: { type: String, unique: true, sparse: true },
    metadata: {
      subject: String,
      fromEmail: String,
      fromName: String,
      templateId: String,
      priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
      category: { type: String, enum: ["assignment", "attendance", "course", "feedback", "system", "reminder", "alert"], default: "system" }
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
