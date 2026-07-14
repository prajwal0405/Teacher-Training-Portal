import mongoose from "mongoose";

const AutomationTeacherSchema = new mongoose.Schema({
  teacherId: { type: String, unique: true, index: true },
  name: String,
  email: String,
  phone: String,
  className: String,
  ageGroup: String,
  level: { type: String, index: true },
  preferredLevel: String,
  registeredStatus: { type: String, default: "Registered", index: true },
  availabilityStatus: { type: String, default: "Available", index: true },
  breakStatus: { type: String, default: "No", index: true },
  maxActivitiesPerDay: { type: Number, default: 4 },
  currentActivitiesToday: { type: Number, default: 0 },
  experienceLevel: String
}, { timestamps: true });

export const AutomationTeacher = mongoose.models.AutomationTeacher || mongoose.model("AutomationTeacher", AutomationTeacherSchema);
export default AutomationTeacher;
