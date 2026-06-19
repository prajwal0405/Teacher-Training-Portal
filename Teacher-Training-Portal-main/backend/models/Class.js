import mongoose from "mongoose";

const ClassSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  name: { type: String, required: true },
  description: { type: String },
  classDate: { type: Date, required: true },
  startTime: { type: String }, // HH:MM format
  endTime: { type: String },
  room: { type: String },
  status: { type: String, enum: ["scheduled", "ongoing", "completed", "cancelled"], default: "scheduled" },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  totalStudents: { type: Number, default: 0 },
  attendedStudents: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Class = mongoose.model("Class", ClassSchema);
export default Class;
