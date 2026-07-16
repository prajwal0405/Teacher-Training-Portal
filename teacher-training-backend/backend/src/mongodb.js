import mongoose from "mongoose";
import { connectDb, disconnectDb } from "./db.js";
import { ActivitySubmission } from "./models/ActivitySubmission.js";
import { ChildAttendanceSession, TeacherAttendanceRecord } from "./models/Attendance.js";
import { Center } from "./models/Center.js";
import { Child } from "./models/Child.js";
import { ClassModel } from "./models/Class.js";
import { Course } from "./models/Course.js";
import { CourseAssignment } from "./models/CourseAssignment.js";
import { Feedback } from "./models/Feedback.js";
import { FileAsset } from "./models/FileAsset.js";
import { LessonCompletionReport } from "./models/LessonCompletionReport.js";
import { LessonPlan } from "./models/LessonPlan.js";
import { LessonPlanAssignment } from "./models/LessonPlanAssignment.js";
import { Notification } from "./models/Notification.js";
import { ReportJob } from "./models/ReportJob.js";
import { Trainer } from "./models/Trainer.js";
import { User } from "./models/User.js";

const models = [
  ActivitySubmission,
  Center,
  ChildAttendanceSession,
  Child,
  ClassModel,
  CourseAssignment,
  Course,
  Feedback,
  FileAsset,
  LessonCompletionReport,
  LessonPlan,
  LessonPlanAssignment,
  Notification,
  ReportJob,
  TeacherAttendanceRecord,
  Trainer,
  User,
];

await connectDb();

for (const model of models) {
  await model.createCollection();
  await model.syncIndexes();
  console.log(`Ready: ${model.collection.name}`);
}

const collections = await mongoose.connection.db
  .listCollections({}, { nameOnly: true })
  .toArray();

console.log("-----------------------------------------");
console.log(`MongoDB database ready: ${mongoose.connection.name}`);
console.log("Collections:");
for (const collection of collections.map((item) => item.name).sort()) {
  console.log(`- ${collection}`);
}
console.log("-----------------------------------------");
console.log("No demo data was inserted.");

await disconnectDb();
