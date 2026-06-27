import mongoose from "mongoose";

const activitySubmissionSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center" },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    lessonPlan: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlan" },
    activityDate: { type: Date, required: true, index: true },
    description: { type: String, required: true },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" }],
    status: { type: String, enum: ["pending", "approved", "flagged", "rejected", "revision"], default: "pending" },
    adminComments: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true }
);

export const ActivitySubmission = mongoose.model("ActivitySubmission", activitySubmissionSchema);
