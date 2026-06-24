import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    className: { type: String, default: "" },
    time: { type: String, default: "" },
    topic: { type: String, default: "" },
    room: { type: String, default: "" },
    status: { type: String, default: "upcoming" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Schedule = mongoose.model("Schedule", scheduleSchema);
