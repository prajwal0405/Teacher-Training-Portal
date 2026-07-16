import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    learner: { type: String, trim: true },
    course: { type: String, trim: true },
    batch: { type: String, trim: true },
    trainer: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    trainerRating: { type: Number, min: 1, max: 5 },
    tag: String,
    suggestion: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    date: String,
    anonymous: { type: Boolean, default: false },
    adminResponse: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Feedback = mongoose.model("Feedback", feedbackSchema);
