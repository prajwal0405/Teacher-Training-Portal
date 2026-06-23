import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    schedule: {
      days: [{ type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }],
      startTime: String,
      endTime: String,
      timezone: { type: String, default: "Asia/Kolkata" }
    },
    maxTeachers: { type: Number, default: 30, min: 1 },
    enrolledCount: { type: Number, default: 0, min: 0 },
    status: { 
      type: String, 
      enum: ["upcoming", "ongoing", "completed", "cancelled"], 
      default: "upcoming",
      index: true 
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    metadata: {
      location: String,
      mode: { type: String, enum: ["online", "offline", "hybrid"], default: "offline" },
      meetingLink: String,
      materials: [String],
    }
  },
  { timestamps: true }
);

batchSchema.index({ course: 1, center: 1, status: 1 });
batchSchema.index({ trainer: 1, startDate: 1 });

export const Batch = mongoose.model("Batch", batchSchema);
