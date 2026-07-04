import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["admin", "teacher", "trainer", "super_admin"], required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "blocked", "inactive"],
      default: "pending",
      index: true,
    },
    photoUrl: String,
    language: { type: String, enum: ["English", "Hindi", "Marathi", "Telugu", "Kannada", "Tamil"], default: "English" },
    preferredNotificationChannel: { type: String, enum: ["in_app", "email", "sms", "whatsapp", "all"], default: "in_app" },
    passwordChangedAt: Date,
    passwordExpiresAt: Date,
    teacherProfile: {
      center: { type: mongoose.Schema.Types.ObjectId, ref: "Center" },
      classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
      qualification: String,
      subject: String,
      experience: String,
      address: String,
      performanceRating: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      activityScore: { type: Number, default: 0 },
      coursesCompleted: { type: Number, default: 0 },
      lessonsCompleted: { type: Number, default: 0 },
      lessonsPending: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
