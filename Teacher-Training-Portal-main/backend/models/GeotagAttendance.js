import mongoose from "mongoose";

const GeotagAttendanceSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  teacherEmail: { type: String, required: true },
  dateKey: { type: String, required: true },
  dateLabel: { type: String, required: true },
  actionType: { type: String, enum: ["checkin", "checkout"], required: true },
  checkInTime: { type: String },
  checkOutTime: { type: String },
  coords: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  distanceOffset: { type: Number },
  snapshot: { type: String },
  campusLat: { type: Number, default: 18.6675 },
  campusLng: { type: Number, default: 73.8961 },
  verified: { type: Boolean, default: true },
  status: { type: String, default: "Verified Attendance Logged" }
}, {
  timestamps: true
});

GeotagAttendanceSchema.index({ teacherId: 1, dateKey: 1, actionType: 1 }, { unique: true });

const GeotagAttendance = mongoose.model("GeotagAttendance", GeotagAttendanceSchema);
export default GeotagAttendance;
