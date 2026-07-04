import mongoose from "mongoose";
import { connectDb } from "./db.js";

await connectDb();
const db = mongoose.connection.db;

// ── Find existing entities ──
const center = await db.collection("centers").findOne({});
const classRecord = await db.collection("classmodels").findOne({});
const teacher = await db.collection("users").findOne({ role: "teacher" });
const admin = await db.collection("users").findOne({ role: "admin" });
const children = await db.collection("children").find({}).toArray();
const courseAssignment = await db.collection("courseassignments").findOne({});

if (!teacher || !center || !classRecord) {
  console.log("Missing seed prerequisites. Run seed.js or autoSeed first.");
  process.exit(1);
}

const tid = teacher._id;
const cid = center._id;
const clid = classRecord._id;
const aid = admin?._id || tid;

console.log(`Teacher: ${teacher.name} (${tid})`);
console.log(`Center: ${center.name} (${cid})`);
console.log(`Class: ${classRecord.name} (${clid})`);
console.log(`Children found: ${children.length}`);

// ── 1. SCHEDULE ──
const scheduleCount = await db.collection("schedules").countDocuments({ teacher: tid });
if (scheduleCount === 0) {
  const schedules = [
    { teacher: tid, time: "08:00 AM", className: "Nursery A", topic: "Number Patterns", room: "101", status: "completed" },
    { teacher: tid, time: "09:30 AM", className: "Nursery A", topic: "Alphabets & Phonics", room: "203", status: "ongoing" },
    { teacher: tid, time: "11:00 AM", className: "Nursery A", topic: "Story Time & Rhymes", room: "101", status: "upcoming" },
    { teacher: tid, time: "01:00 PM", className: "Nursery A", topic: "Creative Art & Craft", room: "Art Lab", status: "upcoming" },
    { teacher: tid, time: "02:30 PM", className: "Nursery A", topic: "Outdoor Play", room: "Playground", status: "upcoming" },
  ];
  await db.collection("schedules").insertMany(
    schedules.map(s => ({ ...s, createdAt: new Date(), updatedAt: new Date() }))
  );
  console.log(`✓ Inserted ${schedules.length} schedule entries`);
} else {
  console.log(`  Schedule: ${scheduleCount} entries exist`);
}

// ── 2. GRADES ──
const gradeCount = await db.collection("grades").countDocuments({ teacher: tid });
if (gradeCount === 0 && children.length > 0) {
  const subjects = ["Math & Logic", "Language Skills", "Creative Arts", "Social Skills", "Motor Skills"];
  const activities = ["Mid-Term Assessment", "Phonics Check", "Color Sorting Activity", "Group Play Evaluation", "Fine Motor Test"];
  const grades = children.slice(0, Math.min(children.length, 5)).flatMap((child, ci) => {
    return [0, 1].map(si => {
      const score = 70 + Math.floor(Math.random() * 28);
      const pct = (score / 100) * 100;
      const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : "C";
      return {
        child: child._id,
        teacher: tid,
        subject: subjects[(ci + si) % subjects.length],
        assignmentName: activities[(ci + si) % activities.length],
        score,
        maxScore: 100,
        grade,
        remarks: "Showing steady developmental growth in this area.",
        createdAt: new Date(Date.now() - si * 86400000),
        updatedAt: new Date(),
      };
    });
  });
  await db.collection("grades").insertMany(grades);
  console.log(`✓ Inserted ${grades.length} grade entries`);
} else {
  console.log(`  Grades: ${gradeCount} entries exist`);
}

// ── 3. NOTIFICATIONS ──
const notifCount = await db.collection("notifications").countDocuments({ recipient: tid });
if (notifCount === 0) {
  const types = ["session", "assignment", "approval", "certificate", "course"];
  const notifications = [
    { recipient: tid, title: "Live session tomorrow at 10:00 AM", body: "Classroom Management Techniques - Live Session", type: "session", read: false, status: "sent", sentAt: new Date(Date.now() - 2 * 3600000) },
    { recipient: tid, title: "Assignment reviewed", body: "Activity Worksheet scored 95/100", type: "assignment", read: false, status: "sent", sentAt: new Date(Date.now() - 5 * 3600000) },
    { recipient: tid, title: "Assignment needs revision", body: "Reattempt by next week", type: "approval", read: true, status: "sent", sentAt: new Date(Date.now() - 24 * 3600000) },
    { recipient: tid, title: "Certificate issued", body: "Child Safety & Wellbeing certificate is ready", type: "certificate", read: true, status: "sent", sentAt: new Date(Date.now() - 3 * 86400000) },
    { recipient: tid, title: "New course available", body: "Curriculum Design & Lesson Planning", type: "course", read: true, status: "sent", sentAt: new Date(Date.now() - 5 * 86400000) },
  ];
  await db.collection("notifications").insertMany(notifications);
  console.log(`✓ Inserted ${notifications.length} notifications`);
} else {
  console.log(`  Notifications: ${notifCount} entries exist`);
}

// ── 4. TEACHER ATTENDANCE ──
const attCount = await db.collection("teacherattendancerecords").countDocuments({ teacher: tid });
if (attCount === 0) {
  const records = [];
  for (let i = 0; i < 15; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const status = i < 3 ? "present" : i < 5 ? "present" : i < 8 ? "present" : i < 10 ? "present" : i < 12 ? "late" : "present";
    records.push({
      teacher: tid,
      attendanceDate: d,
      status,
      source: i % 2 === 0 ? "geo" : "manual",
      latitude: 18.5204 + (Math.random() - 0.5) * 0.01,
      longitude: 73.8567 + (Math.random() - 0.5) * 0.01,
      markedBy: tid,
      createdAt: new Date(),
    });
  }
  await db.collection("teacherattendancerecords").insertMany(records);
  console.log(`✓ Inserted ${records.length} teacher attendance records`);
} else {
  console.log(`  Attendance: ${attCount} records exist`);
}

// ── 5. COMPLETE THE COURSE ASSIGNMENT ──
if (courseAssignment) {
  await db.collection("courseassignments").updateOne(
    { _id: courseAssignment._id },
    { $set: { progressPercent: 72, status: "ongoing" } }
  );
  console.log("✓ Updated course assignment to 72% progress");
}

// ── 6. CHILD ATTENDANCE ──
const childAttCount = await db.collection("childattendancesessions").countDocuments({ class: clid });
if (childAttCount === 0 && children.length > 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const records = children.map(c => ({
    child: c._id,
    status: Math.random() > 0.2 ? "present" : Math.random() > 0.5 ? "late" : "absent",
  }));
  await db.collection("childattendancesessions").insertOne({
    center: cid,
    class: clid,
    teacher: tid,
    attendanceDate: today,
    records,
    submittedAt: new Date(),
  });
  console.log(`✓ Created child attendance for ${children.length} children`);
} else {
  console.log(`  Child attendance: ${childAttCount} sessions exist`);
}

console.log("\n✅ Seeding complete! All teacher dashboard pages now have demo data.");
await mongoose.disconnect();
