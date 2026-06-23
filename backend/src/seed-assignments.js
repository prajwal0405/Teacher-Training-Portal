import mongoose from "mongoose";
import { connectDb } from "./db.js";
import { Certificate } from "./models/Certificate.js";
import { Assignment } from "./models/Assignment.js";
import { AssignmentSubmission } from "./models/AssignmentSubmission.js";
import { Course } from "./models/Course.js";
import { CourseAssignment } from "./models/CourseAssignment.js";
import { User } from "./models/User.js";

async function seed() {
  await connectDb();
  console.log("Connected to database. Starting Assignments and Certificates seeding...");

  // Find teacher
  const teacher = await User.findOne({ role: "teacher" });
  if (!teacher) {
    console.error("No teacher found in database. Run basic seed first.");
    process.exit(1);
  }
  const teacherId = teacher._id;
  console.log(`Found teacher: ${teacher.name} (${teacherId})`);

  // Find course assignments for this teacher
  let courseAssignments = await CourseAssignment.find({ teacher: teacherId });
  
  if (courseAssignments.length === 0) {
    console.log("No courses assigned to this teacher. Checking for any Course to assign...");
    let course = await Course.findOne({});
    if (!course) {
      // Create a course
      course = await Course.create({
        title: "Child Psychology and Development",
        description: "Comprehensive introduction to early childhood learning patterns and pedagogy.",
        category: "Pedagogy",
        level: "Beginner",
        lessons: []
      });
      console.log(`Created course: ${course.title}`);
    }
    
    // Assign course
    const ca = await CourseAssignment.create({
      course: course._id,
      teacher: teacherId,
      status: "assigned",
      progressPercent: 50,
    });
    courseAssignments = [ca];
    console.log(`Assigned course: ${course.title} to teacher.`);
  }

  const firstCourseId = courseAssignments[0].course;
  const course = await Course.findById(firstCourseId);
  const courseName = course ? course.title : "Early Childhood Pedagogy";

  console.log(`Using course: ${courseName} (${firstCourseId})`);

  // Clear existing assignments, submissions, and certificates for this teacher to avoid clutter
  await Assignment.deleteMany({ courseId: firstCourseId });
  await AssignmentSubmission.deleteMany({ teacherId: teacherId });
  await Certificate.deleteMany({ teacherId: teacherId });

  // ── Create Assignments ──
  const now = new Date();
  
  // Assignment 1: Graded
  const assignment1 = await Assignment.create({
    title: "Understanding Piaget's Cognitive Stages",
    description: "Write an essay explaining the four stages of cognitive development and provide two classroom examples for each stage.",
    courseId: firstCourseId,
    dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    totalMarks: 100,
    attachments: [
      { name: "piaget_reading_material.pdf", url: "/uploads/piaget_reading_material.pdf" }
    ],
    status: "active"
  });

  await AssignmentSubmission.create({
    assignmentId: assignment1._id,
    teacherId: teacherId,
    submissionText: "Piaget's stages of cognitive development are: sensorimotor, preoperational, concrete operational, and formal operational...",
    submittedFiles: [
      { name: "piaget_essay_final.pdf", url: "/uploads/piaget_essay_final.pdf" }
    ],
    submittedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    marksObtained: 85,
    feedback: "Excellent analysis. The classroom examples for the concrete operational stage were particularly well thought out.",
    status: "graded"
  });

  // Assignment 2: Submitted (Pending Grade)
  const assignment2 = await Assignment.create({
    title: "Lesson Plan Design for Early Phonics",
    description: "Design a 45-minute lesson plan for preschool students focusing on phonetic sounds and interactive games.",
    courseId: firstCourseId,
    dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
    totalMarks: 100,
    attachments: [
      { name: "lesson_plan_template.docx", url: "/uploads/lesson_plan_template.docx" }
    ],
    status: "active"
  });

  await AssignmentSubmission.create({
    assignmentId: assignment2._id,
    teacherId: teacherId,
    submissionText: "My lesson plan focuses on vowel sounds. Activity 1 is letter bingo, activity 2 is phonetic songs...",
    submittedFiles: [
      { name: "phonics_lesson_plan.pdf", url: "/uploads/phonics_lesson_plan.pdf" }
    ],
    submittedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
    marksObtained: null,
    feedback: "",
    status: "submitted"
  });

  // Assignment 3: Overdue (No submission)
  const assignment3 = await Assignment.create({
    title: "Child Observation Log Report",
    description: "Observe a single student for 3 hours and write an observation log focusing on their peer interaction and motor skills development.",
    courseId: firstCourseId,
    dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    totalMarks: 100,
    attachments: [],
    status: "active"
  });

  // Assignment 4: Pending (Upcoming)
  const assignment4 = await Assignment.create({
    title: "Inclusive Classroom Strategies",
    description: "List 5 strategies to create an inclusive classroom environment for children with diverse learning needs.",
    courseId: firstCourseId,
    dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // Due in 10 days
    totalMarks: 100,
    attachments: [],
    status: "active"
  });

  console.log("✓ Assignments and submissions seeded successfully.");

  // ── Create Certificates ──
  const cert1 = await Certificate.create({
    teacherId,
    certificateName: "Professional Early Childhood Educator (PECE)",
    courseName: "Early Childhood Pedagogy",
    certificateNumber: "CERT-2026-00001",
    issueDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000),
    status: "active",
    pdfUrl: "/uploads/cert_ece.pdf"
  });

  const cert2 = await Certificate.create({
    teacherId,
    certificateName: "Advanced Classroom Management",
    courseName: "Classroom Management and Leadership",
    certificateNumber: "CERT-2026-00002",
    issueDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    status: "expired",
    pdfUrl: "/uploads/cert_management.pdf"
  });

  const cert3 = await Certificate.create({
    teacherId,
    certificateName: "Child Safety & Wellbeing Specialist",
    courseName: "Child Safety Guidelines",
    certificateNumber: "CERT-2026-00003",
    issueDate: new Date(now.getTime() - 340 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // Expiring in 25 days
    status: "expiring_soon",
    pdfUrl: "/uploads/cert_safety.pdf"
  });

  console.log("✓ Certificates seeded successfully.");

  await mongoose.disconnect();
  console.log("Disconnected from database. Seeding complete!");
}

seed().catch(err => {
  console.error("Error during seeding:", err);
  mongoose.disconnect();
});
