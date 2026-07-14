import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["admin", "teacher", "trainer", "super_admin", "mentor"], required: true, index: true },
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
    mentorProfile: {
      center: { type: mongoose.Schema.Types.ObjectId, ref: "Center" },
      classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
      qualification: String,
      specialization: String,
      experience: String,
      address: String,
      fellowshipSemester: { type: Number, default: 3 }, // Semester 3 or 4
      assignedCenters: [{ type: mongoose.Schema.Types.ObjectId, ref: "Center" }],
      assignedTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Mentees
      performanceRating: { type: Number, default: 0 },
      menteeObservations: [{
        menteeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: String,
        date: { type: Date, default: Date.now }
      }],
      capstoneMilestone: { type: Number, default: 1 },
      capstoneSubmissions: [{
        milestone: Number,
        notes: String,
        evidenceLink: String,
        submittedAt: { type: Date, default: Date.now }
      }],
      pdcaCycles: [{
        plan: String,
        do: String,
        check: String,
        act: String,
        status: { type: String, default: "Completed" },
        date: { type: Date, default: Date.now }
      }]
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
