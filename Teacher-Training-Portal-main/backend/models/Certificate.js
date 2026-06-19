import mongoose from "mongoose";

const CertificateSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  certificateId: { type: String, unique: true },
  title: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  status: { type: String, enum: ["issued", "pending", "revoked"], default: "issued" },
  certificateUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Certificate = mongoose.model("Certificate", CertificateSchema);
export default Certificate;
