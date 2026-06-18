import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ["video", "pdf", "document", "slide", "audio", "link"], required: true },
    file: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" },
    externalUrl: String,
    order: { type: Number, default: 1 },
    isRequired: { type: Boolean, default: true },
  },
  { _id: true, timestamps: true }
);

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, default: 1 },
    description: String,
    contents: [contentSchema],
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    objectives: String,
    category: String,
    level: String,
    topic: String,
    durationText: String,
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    modules: [moduleSchema],
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);
