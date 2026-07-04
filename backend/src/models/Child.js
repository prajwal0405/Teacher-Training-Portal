import mongoose from "mongoose";

const childSchema = new mongoose.Schema(
  {
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    fullName: { type: String, required: true },
    rollNo: String,
    dateOfBirth: Date,
    age: Number,
    gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
    email: String,
    guardianName: String,
    guardianPhone: String,
    address: String,
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

childSchema.index({ class: 1, rollNo: 1 }, { unique: true, sparse: true });

export const Child = mongoose.model("Child", childSchema);
