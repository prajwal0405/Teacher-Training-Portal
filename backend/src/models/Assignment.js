import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dueDate: { type: Date, required: true },
    totalMarks: { type: Number, default: 100 },
    attachments: [
      {
        name: String,
        url: String,
      }
    ],
    status: { type: String, enum: ["active", "draft", "archived"], default: "active" }
  },
  { timestamps: true }
);

export const Assignment = mongoose.model("Assignment", assignmentSchema);
