import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  address: { type: String },
  joined: { type: String },
  subject: { type: String },
  attendance: { type: Number, default: 90 },
  workingCenter: { type: String, default: "Dhayri, Pune, Maharashtra" },
  degree: { type: String, default: "M.Sc. Computer Applications" },
  university: { type: String, default: "University of Pune" },
  netStatus: { type: String, default: "UGC NET Qualified" },
  netDesc: { type: String, default: "Assistant Professor Eligibility" },
  expYears: { type: String, default: "3+ Years Active" },
  expBio: { type: String, default: "Senior Pre-Primary Core Instructor & Curriculum Designer specializing in childhood developmental tracking logic and technology-based pedagogy framework." },
  password: { type: String, required: true },
  status: { type: String, default: "approved" }, // approved, pending, rejected
  batch: { type: String, default: "SpaceECE" },
  course: { type: String, default: "" },
  classes: { type: Number, default: 0 },
  students: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  passwordChangedAt: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

// Hash password before saving (only if modified)
TeacherSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    if (!this.isNew) {
      this.passwordChangedAt = new Date();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
TeacherSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Method to check if account is locked
TeacherSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

// Method to increment login attempts
TeacherSchema.methods.incLoginAttempts = async function () {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 30 * 60 * 1000; // 30 minutes

  if (this.loginAttempts + 1 >= maxAttempts && !this.isAccountLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
TeacherSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 }
  });
};

const Teacher = mongoose.model("Teacher", TeacherSchema);
export default Teacher;
