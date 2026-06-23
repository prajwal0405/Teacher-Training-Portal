import mongoose from "mongoose";
import { connectDb, disconnectDb } from "./db.js";
import { ActivitySubmission } from "./models/ActivitySubmission.js";
import { LessonPlanAssignment } from "./models/LessonPlanAssignment.js";
import { Child } from "./models/Child.js";
import { User } from "./models/User.js";
import { Center } from "./models/Center.js";
import { ClassModel } from "./models/Class.js";
import { LessonPlan } from "./models/LessonPlan.js";

async function runDiag() {
  console.log("Connecting to database...");
  await connectDb();
  console.log("Connected. Testing queries...\n");

  console.log("--- Testing ActivitySubmission Query ---");
  try {
    const activities = await ActivitySubmission.find({})
      .populate("teacher", "name email phone")
      .populate("center", "name city")
      .populate("class", "name")
      .sort({ createdAt: -1 });
    console.log(`Success: Found ${activities.length} activities.`);
  } catch (error) {
    console.error("ERROR in ActivitySubmission Query:", error.message);
  }

  console.log("\n--- Testing LessonPlan Query ---");
  try {
    const plans = await LessonPlan.find({})
      .populate("course", "title")
      .sort({ createdAt: -1 });
    console.log(`Success: Found ${plans.length} lesson plans.`);
  } catch (error) {
    console.error("ERROR in LessonPlan Query:", error.message);
  }

  console.log("\n--- Testing LessonPlanAssignment Query ---");
  try {
    const assignments = await LessonPlanAssignment.find({})
      .populate("lessonPlan", "title objectives activities")
      .populate("teacher", "name email")
      .sort({ createdAt: -1 });
    console.log(`Success: Found ${assignments.length} assignments.`);
  } catch (error) {
    console.error("ERROR in LessonPlanAssignment Query:", error.message);
  }

  console.log("\n--- Testing Child Query ---");
  try {
    const children = await Child.find({})
      .populate("center", "name city")
      .populate("class", "name ageGroup")
      .sort({ createdAt: -1 });
    console.log(`Success: Found ${children.length} children.`);
  } catch (error) {
    console.error("ERROR in Child Query:", error.message);
  }

  console.log("\n--- Testing Class Query ---");
  try {
    const classes = await ClassModel.find({})
      .populate("center", "name city")
      .sort({ createdAt: -1 });
    console.log(`Success: Found ${classes.length} classes.`);
  } catch (error) {
    console.error("ERROR in Class Query:", error.message);
  }

  console.log("\n--- Testing Teacher Query ---");
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("-passwordHash")
      .populate("teacherProfile.center", "name city")
      .populate("teacherProfile.class", "name ageGroup")
      .sort({ createdAt: -1 });
    console.log(`Success: Found ${teachers.length} teachers.`);
  } catch (error) {
    console.error("ERROR in Teacher Query:", error.message);
  }

  console.log("\n--- Testing Center Query ---");
  try {
    const rawCenters = await Center.find().sort({ createdAt: -1 });
    const centers = await Promise.all(rawCenters.map(async (center) => {
      const [teachers, childrenCount, classesCount] = await Promise.all([
        User.find({ role: "teacher", "teacherProfile.center": center._id }).select("_id"),
        Child.countDocuments({ center: center._id, status: "active" }),
        ClassModel.countDocuments({ center: center._id }),
      ]);
      return {
        ...center.toObject(),
        teachers: teachers.map((teacher) => teacher._id),
        children: childrenCount,
        classes: classesCount,
      };
    }));
    console.log(`Success: Found ${centers.length} centers.`);
  } catch (error) {
    console.error("ERROR in Center Query:", error.message);
  }

  console.log("\nDisconnecting...");
  await disconnectDb();
  console.log("Done.");
}

runDiag().catch(console.error);
