import express from "express";
import { generateAICourse } from "../services/aiCourseGenerator.js";

const router = express.Router();

router.post("/generate", async (req, res, next) => {
  try {
    const result = await generateAICourse(req.body || {});
    res.json({ course: result });
  } catch (error) {
    next(error);
  }
});

router.post("/generate-course", async (req, res, next) => {
  try {
    const result = await generateAICourse(req.body || {});
    res.json({ course: result });
  } catch (error) {
    next(error);
  }
});

export default router;
