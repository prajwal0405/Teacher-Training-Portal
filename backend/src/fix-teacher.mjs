import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDb } from "./db.js";

await connectDb();

const db = mongoose.connection.db;

// Find or create a center
let center = await db.collection("centers").findOne({});
if (!center) {
  const result = await db.collection("centers").insertOne({
    name: "Default Center",
    address: "Auto-created",
    city: "Pune",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  center = await db.collection("centers").findOne({ _id: result.insertedId });
  console.log("Created default center:", center._id);
} else {
  console.log("Found center:", center._id, center.name);
}

// Find or create a class
let classRecord = await db.collection("classmodels").findOne({ center: center._id });
if (!classRecord) {
  const result = await db.collection("classmodels").insertOne({
    center: center._id,
    name: "Default Class",
    ageGroup: "3-4 years",
    curriculumLevel: "Foundation",
    schedule: "Mon-Fri 9:00 AM to 12:00 PM",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  classRecord = await db.collection("classmodels").findOne({ _id: result.insertedId });
  console.log("Created default class:", classRecord._id);
} else {
  console.log("Found class:", classRecord._id, classRecord.name);
}

// Find all teachers without center/class assigned
const teachers = await db.collection("users").find({ role: "teacher" }).toArray();
console.log(`Found ${teachers.length} teachers`);

for (const teacher of teachers) {
  const hasCenter = teacher.teacherProfile?.center;
  const hasClass = teacher.teacherProfile?.class;
  
  if (!hasCenter || !hasClass) {
    await db.collection("users").updateOne(
      { _id: teacher._id },
      { $set: { "teacherProfile.center": center._id, "teacherProfile.class": classRecord._id } }
    );
    console.log(`✓ Fixed teacher: ${teacher.name} (${teacher.email})`);
  } else {
    console.log(`  OK teacher: ${teacher.name} (${teacher.email})`);
  }
}

await mongoose.disconnect();
console.log("\nDone! All teachers now have center and class assigned.");
