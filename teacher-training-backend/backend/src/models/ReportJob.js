import mongoose from "mongoose";

const reportJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["teacher_progress", "center", "attendance", "course_completion", "activity"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    format: { type: String, enum: ["pdf", "excel", "csv"], default: "excel" },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    schedule: {
      frequency: { type: String, enum: ["once", "weekly", "monthly"], default: "once" },
      nextRunAt: Date,
      lastRunAt: Date,
    },
    status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    outputFile: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" },
  },
  { timestamps: true }
);

export const ReportJob = mongoose.model("ReportJob", reportJobSchema);
