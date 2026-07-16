import { Router } from "express";
import { generateAssignmentFeedback } from "../services/aiAssignmentFeedback.js";

const router = Router();

/**
 * POST /assignment-feedback
 * Generate AI-powered feedback for an assignment submission.
 */
router.post("/assignment-feedback", async (req, res, next) => {
  try {
    const result = await generateAssignmentFeedback(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
