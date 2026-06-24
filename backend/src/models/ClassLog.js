import mongoose from "mongoose";

const classLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, enum: ["create", "update", "delete"] },
    classId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    className: { type: String, required: true },
    centerId: { type: mongoose.Schema.Types.ObjectId, ref: "Center", index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    performedByName: { type: String },
    changes: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const ClassLog = mongoose.model("ClassLog", classLogSchema);
