import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    channel: { type: String, enum: ["in_app", "email", "sms", "push", "whatsapp"], default: "in_app" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["queued", "sent", "delivered", "failed"], default: "queued" },
    read: { type: Boolean, default: false, index: true },
    readAt: Date,
    sentAt: Date,
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
