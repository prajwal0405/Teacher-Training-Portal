import mongoose from "mongoose";

const lessonPlanSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    moduleIndex: Number,
    contentIndex: Number,
    title: { type: String, required: true },
    objectives: String,
    instructions: String,
    activities: String,
    resources: String,
    scheduleDate: Date,
    scheduleWeek: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const LessonPlan = mongoose.model("LessonPlan", lessonPlanSchema);
