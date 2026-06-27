import express from "express";
import mongoose from "mongoose";
import { Schedule } from "../models/Schedule.js";
import { requireAuth, requireRole } from "../auth.js";
import { Notification } from "../models/Notification.js";

const router = express.Router();

// Teacher: get my schedules
router.get("/teacher", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const items = await Schedule.find({ teacher: req.user.id })
      .populate("teacher", "name email")
      .sort({ time: 1, createdAt: -1 });
    res.json({ schedules: items });
  } catch (err) {
    next(err);
  }
});

// Admin: list all schedules or filter by teacher
router.get("/admin", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.teacherId) filter.teacher = req.query.teacherId;
    if (req.query.status) filter.status = req.query.status;
    const items = await Schedule.find(filter)
      .populate("teacher", "name email subject")
      .sort({ createdAt: -1 });
    res.json({ schedules: items });
  } catch (err) {
    next(err);
  }
});

// Admin: get available teachers for scheduling
router.get("/admin/teachers", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { User } = await import("../models/User.js");
    const teachers = await User.find({ role: "teacher", status: "approved" })
      .select("name email teacherProfile")
      .populate("teacherProfile.center", "name city")
      .sort({ name: 1 });
    res.json({ teachers });
  } catch (err) {
    next(err);
  }
});

// Create schedule (admin assigns to specific teacher, or teacher creates own)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { teacherId, className, time, topic, room, status, notes } = req.body;
    
    // Validate teacherId if provided
    const targetTeacherId = req.user.role === "admin" ? (teacherId || req.user.id) : req.user.id;
    if (!mongoose.Types.ObjectId.isValid(targetTeacherId)) {
      return res.status(400).json({ message: "Invalid teacher ID" });
    }
    
    const doc = await Schedule.create({
      teacher: targetTeacherId,
      className,
      time,
      topic,
      room,
      status: status || "upcoming",
      notes,
    });

    // Notify the teacher if admin created this
    if (req.user.role === "admin" && targetTeacherId !== req.user.id) {
      await Notification.create({
        recipient: targetTeacherId,
        title: "New schedule created",
        body: `A new schedule has been created for you: ${topic || className || "Class"} on ${time || "upcoming"}.`,
        channel: "in_app",
        status: "delivered",
        sentAt: new Date(),
      });
    }

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
    if (req.user.role !== "admin" && s.teacher.toString() !== req.user.id) 
      return res.status(403).json({ message: "Forbidden" });

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
    if (req.user.role !== "admin" && s.teacher.toString() !== req.user.id) 
      return res.status(403).json({ message: "Forbidden" });
    await Schedule.deleteOne({ _id: s._id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
