import mongoose from "mongoose";

const lessonCompletionReportSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlanAssignment", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teachingNotes: String,
    activityDescription: String,
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" }],
    status: { type: String, enum: ["pending", "approved", "flagged", "rejected", "revision"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    adminFeedback: String,
    reviewedAt: Date,
  },
  { timestamps: true }
);

export const LessonCompletionReport = mongoose.model("LessonCompletionReport", lessonCompletionReportSchema);
