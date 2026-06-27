import { connectDb, disconnectDb } from "./db.js";
import mongoose from "mongoose";
import { User } from "./models/User.js";
import { Center } from "./models/Center.js";
import { ClassModel } from "./models/Class.js";
import { Child } from "./models/Child.js";
import { Course } from "./models/Course.js";
import { CourseAssignment } from "./models/CourseAssignment.js";
import { LessonPlan } from "./models/LessonPlan.js";
import { LessonPlanAssignment } from "./models/LessonPlanAssignment.js";

async function showDb() {
  await connectDb();
  console.log("\n================ DATABASE SUMMARY ================");
  console.log(`Connected Database: ${mongoose.connection.name}`);
  console.log("==================================================\n");

  const collections = await mongoose.connection.db.listCollections().toArray();
  
  console.log("Collections and Document Counts:");
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(` - ${col.name}: ${count} documents`);
  }
  
  console.log("\n================ USER ACCOUNTS ================");
  const users = await User.find().select("role name email status createdAt");
  if (users.length === 0) {
    console.log("No user accounts found.");
  } else {
    users.forEach(u => {
      console.log(`Role: ${u.role.padEnd(8)} | Name: ${u.name.padEnd(20)} | Email: ${u.email.padEnd(22)} | Status: ${u.status}`);
    });
  }

  console.log("\n================ ACTIVE CENTERS ================");
  const centers = await Center.find().select("name city contactPerson status");
  if (centers.length === 0) {
    console.log("No centers found.");
  } else {
    centers.forEach(c => {
      console.log(`Center: ${c.name.padEnd(25)} | City: ${c.city.padEnd(10)} | Contact: ${c.contactPerson} (${c.status})`);
    });
  }

  console.log("\n================ COURSES ================");
  const courses = await Course.find().select("title category durationText status");
  if (courses.length === 0) {
    console.log("No courses found.");
  } else {
    courses.forEach(c => {
      console.log(`Course: ${c.title.padEnd(30)} | Category: ${c.category.padEnd(12)} | Dur: ${c.durationText} (${c.status})`);
    });
  }

  console.log("\n==================================================");
  await disconnectDb();
}

showDb().catch(err => {
  console.error("Error inspecting database:", err);
  process.exit(1);
});
