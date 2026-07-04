import mongoose from "mongoose";
import { connectDb } from "./db.js";

await connectDb();
const db = mongoose.connection.db;

const teacher = await db.collection("users").findOne({ role: "teacher" });
const admin = await db.collection("users").findOne({ role: "admin" });
const center = await db.collection("centers").findOne({});
const classRecord = await db.collection("classmodels").findOne({});
const existingCourse = await db.collection("courses").findOne({});

if (!teacher || !center || !classRecord) {
  console.log("Missing prerequisites. Run seed first.");
  process.exit(1);
}

const tid = teacher._id;
const aid = admin?._id || tid;
const cid = center._id;
const clid = classRecord._id;

// ── Create additional courses ──
const coursesData = [
  {
    title: "Child Psychology & Development",
    description: "Understanding cognitive, social, and emotional development in early childhood.",
    objectives: "Apply developmental theories in classroom settings.",
    category: "Advanced",
    level: "Intermediate",
    topic: "Child Development",
    durationText: "8 Weeks",
    status: "published",
    createdBy: aid,
    modules: [{
      title: "Piaget's Cognitive Development",
      order: 1,
      description: "Understanding stages of cognitive growth.",
      contents: [{ title: "Piaget Overview", type: "video", externalUrl: "https://youtube.com/watch?v=example1", order: 1 }]
    }]
  },
  {
    title: "Curriculum Design & Lesson Planning",
    description: "Designing effective curricula and daily lesson plans for preschool education.",
    objectives: "Create age-appropriate lesson plans and learning activities.",
    category: "Advanced",
    level: "Intermediate",
    topic: "Curriculum",
    durationText: "6 Weeks",
    status: "published",
    createdBy: aid,
    modules: [{
      title: "Backward Design Model",
      order: 1,
      description: "Understanding backward design for curriculum planning.",
      contents: [{ title: "Backward Design Intro", type: "video", externalUrl: "https://youtube.com/watch?v=example2", order: 1 }]
    }]
  }
];

const courseIds = [];
for (const cd of coursesData) {
  const existing = await db.collection("courses").findOne({ title: cd.title });
  if (existing) {
    courseIds.push(existing._id);
    console.log(`  Course exists: ${cd.title}`);
  } else {
    const r = await db.collection("courses").insertOne({ ...cd, createdAt: new Date(), updatedAt: new Date() });
    courseIds.push(r.insertedId);
    console.log(`✓ Created course: ${cd.title}`);
  }
}

// ── Create course assignments for the teacher ──
for (const courseId of courseIds) {
  const existing = await db.collection("courseassignments").findOne({ course: courseId, teacher: tid });
  if (!existing) {
    await db.collection("courseassignments").insertOne({
      course: courseId,
      teacher: tid,
      assignedBy: aid,
      progressPercent: Math.floor(Math.random() * 60) + 10,
      status: "assigned",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✓ Assigned course to teacher`);
  } else {
    console.log(`  Course already assigned`);
  }
}

// ── Create additional lesson plans ──
const lessonPlansData = [
  {
    course: existingCourse?._id || courseIds[0],
    title: "Number Patterns",
    objectives: "Introduce counting and visual number patterns.",
    instructions: "Use blocks and picture cards for sorting activities.",
    activities: "Sorting, grouping, and matching games",
    resources: "Flash cards, counting blocks",
    scheduleDate: new Date(Date.now() + 7 * 86400000),
    createdBy: aid,
  },
  {
    course: courseIds[0] || existingCourse?._id,
    title: "Emotional Recognition & Expression",
    objectives: "Help children identify and express basic emotions appropriately.",
    instructions: "Use emotion cards, role-play, and storytelling.",
    activities: "Emotion charades, feelings journal, mirror practice",
    resources: "Emotion flash cards, story books, mirror",
    scheduleDate: new Date(Date.now() + 14 * 86400000),
    createdBy: aid,
  },
  {
    course: courseIds[0] || existingCourse?._id,
    title: "Social Skills & Group Play",
    objectives: "Develop sharing, turn-taking, and cooperative play skills.",
    instructions: "Facilitate structured group activities with clear rules.",
    activities: "Parachute games, building blocks together, group art project",
    resources: "Parachute, large building blocks, art supplies",
    scheduleDate: new Date(Date.now() + 21 * 86400000),
    createdBy: aid,
  },
  {
    course: courseIds[1] || existingCourse?._id,
    title: "Weekly Lesson Plan Template Design",
    objectives: "Design a complete weekly lesson plan using backward design.",
    instructions: "Follow the 5-step lesson planning framework.",
    activities: "Template creation, peer review, presentation",
    resources: "Lesson plan template, curriculum guide",
    scheduleDate: new Date(Date.now() + 30 * 86400000),
    createdBy: aid,
  }
];

const lessonPlanIds = [];
for (const lp of lessonPlansData) {
  const existing = await db.collection("lessonplans").findOne({ title: lp.title, course: lp.course });
  if (existing) {
    lessonPlanIds.push(existing._id);
    console.log(`  Lesson plan exists: ${lp.title}`);
  } else {
    const r = await db.collection("lessonplans").insertOne({ ...lp, createdAt: new Date(), updatedAt: new Date() });
    lessonPlanIds.push(r.insertedId);
    console.log(`✓ Created lesson plan: ${lp.title}`);
  }
}

// ── Create lesson plan assignments with varied statuses ──
const statuses = ["pending", "completed", "pending", "pending"];
const existingAssignments = await db.collection("lessonplanassignments").find({ teacher: tid }).toArray();
const existingLpIds = existingAssignments.map(a => a.lessonPlan?.toString());

for (let i = 0; i < lessonPlanIds.length; i++) {
  const lpId = lessonPlanIds[i];
  if (existingLpIds.includes(lpId.toString())) {
    console.log(`  Assignment exists for: ${lessonPlansData[i].title}`);
    continue;
  }
  const status = statuses[i] || "pending";
  const r = await db.collection("lessonplanassignments").insertOne({
    lessonPlan: lpId,
    teacher: tid,
    center: cid,
    class: clid,
    assignedDate: new Date(Date.now() - (lessonPlanIds.length - i) * 86400000),
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // If completed, create a completion report too
  if (status === "completed") {
    await db.collection("lessoncompletionreports").insertOne({
      assignment: r.insertedId,
      teacher: tid,
      teachingNotes: "Children showed great engagement with the number patterns activity. Most could count to 20 and recognize number shapes.",
      activityDescription: "Number sorting and matching with flash cards",
      files: [],
      status: "pending",
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: new Date(),
    });
    console.log(`  ✓ Assigned + report created for: ${lessonPlansData[i].title}`);
  } else {
    console.log(`  ✓ Assigned (${status}): ${lessonPlansData[i].title}`);
  }
}

// ── Create activity submissions for Upload Activities tab ──
const activityCount = await db.collection("activitysubmissions").countDocuments({ teacher: tid });
if (activityCount === 0) {
  const activities = [
    {
      teacher: tid, center: cid, class: clid,
      description: "Color Matching Exercise - Children matched colored cards to objects",
      activityDate: new Date(Date.now() - 10 * 86400000),
      files: [], status: "approved",
      createdAt: new Date(Date.now() - 10 * 86400000),
    },
    {
      teacher: tid, center: cid, class: clid,
      description: "Number Sorting Activity - Group counting with blocks",
      activityDate: new Date(Date.now() - 5 * 86400000),
      files: [], status: "pending",
      createdAt: new Date(Date.now() - 5 * 86400000),
    },
    {
      teacher: tid, center: cid, class: clid,
      description: "Emotion Recognition Through Storytime - Interactive reading session",
      activityDate: new Date(Date.now() - 2 * 86400000),
      files: [], status: "pending",
      createdAt: new Date(Date.now() - 2 * 86400000),
      lessonPlan: lessonPlanIds[0],
    }
  ];
  const allLps = await db.collection("lessonplans").find({}).toArray();
  if (allLps.length > 0) {
    activities[2].lessonPlan = allLps[0]._id;
  }
  await db.collection("activitysubmissions").insertMany(activities);
  console.log(`✓ Created ${activities.length} activity submissions`);
} else {
  console.log(`  Activities: ${activityCount} already exist`);
}

// ── Create additional completion reports for Notes tab ──
const reportCount = await db.collection("lessoncompletionreports").countDocuments({ teacher: tid });
if (reportCount <= 1) {
  const completedAssignments = await db.collection("lessonplanassignments")
    .find({ teacher: tid, status: "completed" })
    .toArray();
  
  if (completedAssignments.length > 0) {
    await db.collection("lessoncompletionreports").insertOne({
      assignment: completedAssignments[0]._id,
      teacher: tid,
      teachingNotes: "Weekly observation: Children are progressing well with phonics. Most can identify letters A-M and their sounds. Need more practice with blending.",
      activityDescription: "Phonics Circle Time Assessment",
      files: [],
      status: "approved",
      adminFeedback: "Great observation notes. Continue with the multi-sensory approach for letter recognition.",
      reviewedBy: aid,
      reviewedAt: new Date(Date.now() - 1 * 86400000),
      createdAt: new Date(Date.now() - 7 * 86400000),
      updatedAt: new Date(),
    });
    console.log("✓ Created additional completion report with admin feedback");
  }
} else {
  console.log(`  Reports: ${reportCount} already exist`);
}

console.log("\n✅ Training & Lessons seeding complete!");
console.log(`  Lesson plans: ${lessonPlanIds.length}`);
console.log(`  Course assignments: ${courseIds.length + 1}`);
await mongoose.disconnect();
