import mongoose from "mongoose";

const gradeSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, default: "" },
    assignmentName: { type: String, default: "" },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: 100 },
    grade: { type: String, default: "" },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Grade = mongoose.model("Grade", gradeSchema);
