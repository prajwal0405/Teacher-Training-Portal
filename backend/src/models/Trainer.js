import mongoose from "mongoose";

const trainerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: String,
    qualification: String,
    linkedin: String,
    bio: String,
    courses: { type: Number, default: 0 },
    batches: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    joined: String,
    assignedCourses: [String],
    portalAccess: {
      uploadContent: { type: Boolean, default: true },
      reviewAssignments: { type: Boolean, default: true },
      hostSessions: { type: Boolean, default: true },
      respondForum: { type: Boolean, default: true },
      viewOwnBatch: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

export const Trainer = mongoose.model("Trainer", trainerSchema);
