import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true
    },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", index: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "CourseAssignment", index: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, min: 0, max: 100 },
    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C", "Pass", "Fail"],
      default: "Pass"
    },
    status: {
      type: String,
      enum: ["issued", "revoked", "expired"],
      default: "issued",
      index: true
    },
    issuedAt: { type: Date, default: Date.now, index: true },
    validUntil: { type: Date },
    pdfUrl: String,
    qrCode: String,
    verificationCode: { type: String, unique: true, sparse: true },
    metadata: {
      trainerName: String,
      centerName: String,
      duration: String,
      completionDate: Date,
      skills: [String],
      competencyLevel: String
    }
  },
  { timestamps: true }
);

certificateSchema.index({ teacher: 1, course: 1 }, { unique: true });
certificateSchema.index({ status: 1, issuedAt: -1 });

export const Certificate = mongoose.model("Certificate", certificateSchema);
