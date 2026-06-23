import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    submissionText: { type: String, default: "" },
    submittedFiles: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      }
    ],
    submittedAt: { type: Date, default: Date.now },
    marksObtained: { type: Number, default: null },
    feedback: { type: String, default: "" },
    status: { type: String, enum: ["pending", "submitted", "overdue", "graded"], default: "submitted" }
  },
  { timestamps: true }
);

// Unique index to prevent duplicate submissions per teacher per assignment
assignmentSubmissionSchema.index({ assignmentId: 1, teacherId: 1 }, { unique: true });

export const AssignmentSubmission = mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);
