import express from "express";
import { Schedule } from "../models/Schedule.js";
import { requireAuth, requireRole } from "../auth.js";

const router = express.Router();

// Get teacher schedules
router.get("/teacher", requireAuth, async (req, res, next) => {
  try {
    const items = await Schedule.find({ teacher: req.user.id }).sort({ time: 1, createdAt: -1 });
    res.json({ schedules: items });
  } catch (err) {
    next(err);
  }
});

// Admin: list all schedules
router.get("/admin", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const items = await Schedule.find().sort({ createdAt: -1 });
    res.json({ schedules: items });
  } catch (err) {
    next(err);
  }
});

// Create schedule (teacher or admin)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { className, time, topic, room, status, notes } = req.body;
    const doc = await Schedule.create({
      teacher: req.user.id,
      className,
      time,
      topic,
      room,
      status,
      notes,
    });
    res.status(201).json({ schedule: doc });
  } catch (err) {
    next(err);
  }
});

// Update schedule
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const s = await Schedule.findById(req.params.id);
    if (!s) return res.status(404).json({ message: "Schedule not found" });
    if (req.user.role !== "admin" && s.teacher.toString() !== req.user.id) return res.status(403).json({ message: "Forbidden" });

    const { className, time, topic, room, status, notes } = req.body;
    if (className !== undefined) s.className = className;
    if (time !== undefined) s.time = time;
    if (topic !== undefined) s.topic = topic;
    if (room !== undefined) s.room = room;
    if (status !== undefined) s.status = status;
    if (notes !== undefined) s.notes = notes;

    await s.save();
    res.json({ schedule: s });
  } catch (err) {
    next(err);
  }
});

// Delete schedule
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const s = await Schedule.findById(req.params.id);
    if (!s) return res.status(404).json({ message: "Schedule not found" });
    if (req.user.role !== "admin" && s.teacher.toString() !== req.user.id) return res.status(403).json({ message: "Forbidden" });
    await Schedule.deleteOne({ _id: s._id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
