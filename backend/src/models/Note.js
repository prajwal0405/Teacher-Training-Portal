import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    moduleIndex: { type: Number },
    contentIndex: { type: Number },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Note = mongoose.model("Note", noteSchema);
