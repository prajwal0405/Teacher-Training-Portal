import mongoose from "mongoose";

const lessonPlanAssignmentSchema = new mongoose.Schema(
  {
    lessonPlan: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlan", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center", index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", index: true },
    assignedDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "completed", "reviewed", "revision_requested", "rejected"],
      default: "pending",
    },
    // Filled in by the teacher when they submit a completion report
    teachingNotes: { type: String, default: "" },
    activityDescription: { type: String, default: "" },
    completedAt: { type: Date },
    // Filled in by the admin when reviewing
    adminFeedback: { type: String, default: "" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const LessonPlanAssignment = mongoose.model("LessonPlanAssignment", lessonPlanAssignmentSchema);