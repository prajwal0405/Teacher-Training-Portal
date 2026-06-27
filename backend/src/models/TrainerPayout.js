import mongoose from "mongoose";

const trainerPayoutSchema = new mongoose.Schema(
  {
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer", required: true, index: true },
    amount: { type: Number, required: true },
    sessions: { type: Number, default: 0 },
    description: String,
    period: String,
    status: { type: String, enum: ["pending", "paid", "processing"], default: "pending" },
    paidAt: Date,
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const TrainerPayout = mongoose.model("TrainerPayout", trainerPayoutSchema);
