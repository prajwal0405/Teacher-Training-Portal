import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    name: { type: String, required: true },
    ageGroup: String,
    curriculumLevel: String,
    schedule: String,
  },
  { timestamps: true }
);

classSchema.index({ center: 1, name: 1 }, { unique: true });

export const ClassModel = mongoose.model("Class", classSchema);
