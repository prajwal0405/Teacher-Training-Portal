import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    certificateName: { type: String, required: true },
    courseName: { type: String, required: true },
    certificateNumber: { type: String, required: true, unique: true, index: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date },
    status: { type: String, enum: ["active", "expired", "expiring_soon"], default: "active" },
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Certificate = mongoose.model("Certificate", certificateSchema);
