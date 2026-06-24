import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: String,
    chosenOption: Number,
    correctOption: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    options: [String],
  },
  { _id: false }
);

const assessmentResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: String, required: true, trim: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", index: true },
    assessmentType: {
      type: String,
      enum: ["proctored_exam", "quiz", "assignment", "self_assessment"],
      default: "proctored_exam",
      index: true
    },
    totalQuestions: { type: Number, required: true, min: 1 },
    correctAnswers: { type: Number, required: true, min: 0 },
    wrongAnswers: { type: Number, required: true, min: 0 },
    unanswered: { type: Number, required: true, min: 0 },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C", "F"],
      required: true
    },
    answers: [answerSchema],
    timeTaken: { type: Number }, // seconds
    warnings: { type: Number, default: 0 },
    forced: { type: Boolean, default: false },
    aiEvaluation: {
      performance: String,
      strengths: [String],
      improvements: [String],
      recommendation: String,
    },
    attemptNumber: { type: Number, default: 1, min: 1 },
    maxAttempts: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ["passed", "failed", "in_progress"],
      default: "passed",
      index: true
    },
    startedAt: Date,
    completedAt: Date,
    metadata: {
      userAgent: String,
      ipAddress: String,
      location: String,
    }
  },
  { timestamps: true }
);

assessmentResultSchema.index({ user: 1, createdAt: -1 });
assessmentResultSchema.index({ status: 1, createdAt: -1 });

export const AssessmentResult = mongoose.model("AssessmentResult", assessmentResultSchema);
