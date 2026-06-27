import mongoose from "mongoose";

const rubricItemSchema = new mongoose.Schema({
  criterion: String,
  score: { type: Number, default: null },
  maxScore: Number
}, { _id: false });

const submissionFileSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" },
  name: String,
  url: String,
  uploadedAt: Date,
}, { _id: false });

const annotationSchema = new mongoose.Schema({
  id: String,
  page: Number,
  x: Number,
  y: Number,
  text: String,
  color: String
}, { _id: false });

const courseAssignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dueDate: Date,
    status: { type: String, enum: ["assigned", "in_progress", "submitted", "completed", "under_review", "reviewed", "approved", "revision"], default: "assigned" },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    completedContent: [{ type: String }],
    completedAt: Date,
    submittedAt: Date,
    title: { type: String, default: "Course Assignment" },
    feedback: { type: String, default: "" },
    score: { type: Number, default: null },
    rubric: { type: [rubricItemSchema], default: [] },
    trainer: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    notified: { type: Boolean, default: false },
    annotations: { type: [annotationSchema], default: [] },
    submissionFiles: { type: [submissionFileSchema], default: [] }
  },
  { timestamps: true }
);

courseAssignmentSchema.index({ course: 1, teacher: 1 }, { unique: true });

export const CourseAssignment = mongoose.model("CourseAssignment", courseAssignmentSchema);
