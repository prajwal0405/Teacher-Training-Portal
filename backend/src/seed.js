import { connectDb, disconnectDb } from "./db.js";
import { hashPassword } from "./auth.js";
import { User } from "./models/User.js";
import { Center } from "./models/Center.js";
import { ClassModel } from "./models/Class.js";
import { Child } from "./models/Child.js";
import { Course } from "./models/Course.js";
import { CourseAssignment } from "./models/CourseAssignment.js";
import { LessonPlan } from "./models/LessonPlan.js";
import { LessonPlanAssignment } from "./models/LessonPlanAssignment.js";
import { Trainer } from "./models/Trainer.js";
import { ChildAttendanceSession, TeacherAttendanceRecord } from "./models/Attendance.js";
import { ActivitySubmission } from "./models/ActivitySubmission.js";
import { Notification } from "./models/Notification.js";
import { LessonCompletionReport } from "./models/LessonCompletionReport.js";

await connectDb();

const adminPassword = await hashPassword("Admin@123");
const teacherPassword = await hashPassword("Teacher@123");

const admin = await User.findOneAndUpdate(
  { email: "admin@spaceece.com" },
  {
    role: "admin",
    name: "Admin",
    email: "admin@spaceece.com",
    phone: "9999999999",
    passwordHash: adminPassword,
    status: "approved",
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const center = await Center.findOneAndUpdate(
  { name: "Spacece Mumbai Center" },
  {
    name: "Spacece Mumbai Center",
    address: "Demo address, Mumbai",
    city: "Mumbai",
    pincode: "400001",
    contactPerson: "Center Head",
    phone: "9876543210",
    email: "mumbai@spaceece.in",
    status: "active",
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const classRecord = await ClassModel.findOneAndUpdate(
  { center: center._id, name: "Nursery A" },
  {
    center: center._id,
    name: "Nursery A",
    ageGroup: "3-4 years",
    curriculumLevel: "Foundation",
    schedule: "Mon-Fri 9:00 AM to 12:00 PM",
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const teacher = await User.findOneAndUpdate(
  { email: "dnyaneshwarit27@gmail.com" },
  {
    role: "teacher",
    name: "Dnyaneshwari Thorat",
    email: "dnyaneshwarit27@gmail.com",
    phone: "8605689467",
    passwordHash: teacherPassword,
    status: "approved",
    teacherProfile: {
      center: center._id,
      class: classRecord._id,
      qualification: "B.Ed",
      subject: "Pre-Primary",
      experience: "3-5 yrs",
      address: "Pune, Maharashtra",
      performanceRating: 4.5,
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

for (const input of [
  { name: "Gauri Thorat", email: "dnyaneshwarithrt@gmail.com", subject: "Montessori" },
  { name: "Abhishek Thorat", email: "thoratdnyanu@gmail.com", subject: "ECCE" },
]) {
  await User.findOneAndUpdate(
    { email: input.email },
    {
      role: "teacher",
      name: input.name,
      email: input.email,
      phone: "8605689467",
      passwordHash: teacherPassword,
      status: "approved",
      teacherProfile: {
        center: center._id,
        class: classRecord._id,
        qualification: "Graduate",
        subject: input.subject,
        experience: "Fresher",
        address: "Pune, Maharashtra",
        performanceRating: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

await Child.findOneAndUpdate(
  { class: classRecord._id, rollNo: "N-A-001" },
  {
    center: center._id,
    class: classRecord._id,
    fullName: "Aarav Mehta",
    rollNo: "N-A-001",
    guardianName: "Rohit Mehta",
    guardianPhone: "9000000001",
    status: "active",
  },
  { upsert: true, new: true }
);

await Child.findOneAndUpdate(
  { class: classRecord._id, rollNo: "N-A-002" },
  {
    center: center._id,
    class: classRecord._id,
    fullName: "Anaya Shah",
    rollNo: "N-A-002",
    guardianName: "Kiran Shah",
    guardianPhone: "9000000002",
    status: "active",
  },
  { upsert: true, new: true }
);

const course = await Course.findOneAndUpdate(
  { title: "Pre-Primary Teacher Training" },
  {
    title: "Pre-Primary Teacher Training",
    description: "Foundation course for preschool teachers.",
    objectives: "Improve classroom delivery and child-centered learning.",
    category: "Foundation",
    level: "Beginner",
    topic: "ECCE",
    durationText: "6 Weeks",
    status: "published",
    createdBy: admin._id,
    modules: [
      {
        title: "ECCE Foundations",
        order: 1,
        description: "Introduction to early childhood care and education.",
        contents: [
          {
            title: "Introduction to ECCE",
            type: "video",
            externalUrl: "https://example.com/ecce-intro",
            order: 1,
          },
        ],
      },
    ],
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

await CourseAssignment.updateOne(
  { course: course._id, teacher: teacher._id },
  {
    course: course._id,
    teacher: teacher._id,
    assignedBy: admin._id,
    progressPercent: 25,
    status: "assigned",
  },
  { upsert: true }
);

const lesson = await LessonPlan.findOneAndUpdate(
  { title: "Number Patterns", course: course._id },
  {
    course: course._id,
    title: "Number Patterns",
    objectives: "Introduce counting and visual number patterns.",
    instructions: "Use blocks and picture cards.",
    activities: "Sorting, grouping, and matching activity.",
    resources: "Flash cards, blocks",
    scheduleDate: new Date(),
    createdBy: admin._id,
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

await LessonPlanAssignment.findOneAndUpdate(
  {
    lessonPlan: lesson._id,
    teacher: teacher._id,
    assignedDate: new Date(new Date().toDateString()),
  },
  {
    lessonPlan: lesson._id,
    teacher: teacher._id,
    center: center._id,
    class: classRecord._id,
    assignedDate: new Date(new Date().toDateString()),
    status: "pending",
  },
  { upsert: true, new: true }
);

// Seed Trainers
console.log("Seeding trainers...");
await Trainer.deleteMany({});
await Trainer.create([
  {
    name: "Dr. Rekha Iyer",
    subject: "Early Childhood Ed",
    email: "rekha@spaceece.in",
    phone: "9876540001",
    qualification: "PhD in Child Education",
    linkedin: "linkedin.com/in/rekha-iyer",
    bio: "Passionate early childhood educator with 15+ years of training experience.",
    courses: 3,
    batches: 5,
    sessions: 42,
    rating: 4.9,
    status: "active",
    joined: "01/01/2025",
    assignedCourses: ["Pre-Primary Teacher Training", "Child Psychology & Development"],
    portalAccess: { uploadContent: true, reviewAssignments: true, hostSessions: true, respondForum: true, viewOwnBatch: true }
  },
  {
    name: "Prof. Amol Desai",
    subject: "Montessori Method",
    email: "amol@spaceece.in",
    phone: "9876540002",
    qualification: "M.Ed in Montessori",
    linkedin: "linkedin.com/in/amol-desai",
    bio: "Montessori expert specializing in classroom environment setups.",
    courses: 2,
    batches: 3,
    sessions: 28,
    rating: 4.8,
    status: "active",
    joined: "15/02/2025",
    assignedCourses: ["Montessori Teacher Training"],
    portalAccess: { uploadContent: true, reviewAssignments: true, hostSessions: true, respondForum: true, viewOwnBatch: true }
  },
  {
    name: "Ms. Geeta Rao",
    subject: "NEP & Curriculum",
    email: "geeta@spaceece.in",
    phone: "9876540003",
    qualification: "M.Phil in Education",
    linkedin: "",
    bio: "Curriculum designer focusing on NEP 2020 alignments and foundational learning.",
    courses: 2,
    batches: 4,
    sessions: 35,
    rating: 4.7,
    status: "active",
    joined: "10/03/2025",
    assignedCourses: ["NEP 2020 Alignment & FLN"],
    portalAccess: { uploadContent: true, reviewAssignments: true, hostSessions: true, respondForum: true, viewOwnBatch: true }
  }
]);

// Feedback data is created by users through the feedback submission form — no seed data needed

await disconnectDb();

console.log("MongoDB seed data inserted.");
console.log("Admin login: admin@spaceece.com / Admin@123");
console.log("Teacher login: dnyaneshwarit27@gmail.com / Teacher@123");
