import mongoose from "mongoose";

const trainerMessageSchema = new mongoose.Schema(
  {
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

trainerMessageSchema.index({ trainer: 1, createdAt: -1 });

export const TrainerMessage = mongoose.model("TrainerMessage", trainerMessageSchema);
