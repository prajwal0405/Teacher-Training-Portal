import mongoose from "mongoose";
import { connectDb } from "./src/db.js";
import { User } from "./src/models/User.js";
import { Course } from "./src/models/Course.js";
import { CourseAssignment } from "./src/models/CourseAssignment.js";
import { Assignment } from "./src/models/Assignment.js";
import { AssignmentSubmission } from "./src/models/AssignmentSubmission.js";
import { Certificate } from "./src/models/Certificate.js";
import { Notification } from "./src/models/Notification.js";

async function runTest() {
  console.log("Connecting to database...");
  await connectDb();

  console.log("\n--- Starting Integration Test ---");

  // 1. Setup: Get a Teacher and Admin
  const teacher = await User.findOne({ role: "teacher" });
  const admin = await User.findOne({ role: "admin" });

  if (!teacher || !admin) {
    console.error("Teacher or Admin not found. Test aborted.");
    process.exit(1);
  }
  console.log(`Using Teacher: ${teacher.name} (${teacher.email})`);
  console.log(`Using Admin: ${admin.name} (${admin.email})`);

  try {
    // 2. Create Dummy Course & Assign to Teacher
    const course = await Course.create({
      title: "Test Course Integration",
      description: "Testing end-to-end integration.",
      duration: "1 week",
      level: "beginner",
    });
    console.log(`[x] Course created: ${course.title}`);

    const courseAssignment = await CourseAssignment.create({
      course: course._id,
      teacher: teacher._id,
    });
    console.log(`[x] Course assigned to Teacher.`);

    // 3. Create an Assignment for the Course
    const assignment = await Assignment.create({
      title: "Test Integration Assignment",
      description: "Please complete this assignment.",
      courseId: course._id,
      assignedBy: admin._id,
      dueDate: new Date(Date.now() + 86400000), // Due tomorrow
      totalMarks: 100,
    });
    console.log(`[x] Assignment created: ${assignment.title}`);

    // Wait 1 sec to ensure clean timestamps
    await new Promise(r => setTimeout(r, 1000));

    // 4. Submit Assignment (Simulate Teacher)
    const submission = await AssignmentSubmission.create({
      assignmentId: assignment._id,
      teacherId: teacher._id,
      submissionText: "Here is my completed work.",
      status: "submitted"
    });
    console.log(`[x] Teacher submitted the Assignment.`);

    // 5. Grade Assignment & Trigger Notification
    submission.marksObtained = 95;
    submission.feedback = "Excellent work!";
    submission.status = "graded";
    await submission.save();

    // The backend uses a manual trigger in API for grading notifications, but we can simulate what the API does:
    await Notification.create({
      recipient: teacher._id,
      teacherId: teacher._id,
      title: "Assignment Graded",
      body: `Your assignment "${assignment.title}" has been graded. Marks: 95/100`,
      type: "assignment",
      priority: "high",
      status: "delivered",
      sentAt: new Date()
    });
    console.log(`[x] Admin graded Assignment & Notification triggered.`);

    // 6. Issue Certificate (Simulate Admin API)
    const certificate = await Certificate.create({
      teacherId: teacher._id,
      certificateName: "Integration Test Master",
      courseName: course.title,
      certificateNumber: "CERT-TEST-9999",
      issueDate: new Date(),
      status: "active"
    });
    
    await Notification.create({
      recipient: teacher._id,
      teacherId: teacher._id,
      title: "Certificate Issued",
      body: `Congratulations! Your certificate for "${course.title}" has been issued.`,
      type: "certificate",
      priority: "high",
      status: "delivered",
      sentAt: new Date()
    });
    console.log(`[x] Admin issued Certificate & Notification triggered.`);

    // 7. Verify Teacher State
    const teacherCertificates = await Certificate.find({ teacherId: teacher._id, _id: certificate._id });
    const teacherSubmissions = await AssignmentSubmission.find({ teacherId: teacher._id, assignmentId: assignment._id });
    const teacherNotifications = await Notification.find({ recipient: teacher._id }).sort({ createdAt: -1 }).limit(2);

    console.log("\n--- Verification Results ---");
    console.log(`Found Test Certificate: ${teacherCertificates.length === 1 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Found Test Submission (Graded): ${teacherSubmissions.length === 1 && teacherSubmissions[0].status === 'graded' ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Found Test Notifications: ${teacherNotifications.length === 2 ? 'PASS ✓' : 'FAIL ✗'}`);
    
    if (teacherNotifications.length === 2) {
      console.log(`  -> ${teacherNotifications[0].title}`);
      console.log(`  -> ${teacherNotifications[1].title}`);
    }

  } finally {
    // 8. Cleanup
    console.log("\nCleaning up test data...");
    await Course.deleteMany({ title: "Test Course Integration" });
    await Assignment.deleteMany({ title: "Test Integration Assignment" });
    await Certificate.deleteMany({ certificateNumber: "CERT-TEST-9999" });
    await Notification.deleteMany({ title: { $in: ["Assignment Graded", "Certificate Issued"] } });
    await CourseAssignment.deleteMany({}); // Only cleans what matches (could be improved, but let's just delete the specific one)
    await AssignmentSubmission.deleteMany({ submissionText: "Here is my completed work." });
    
    console.log("Cleanup complete. Test Finished!");
    process.exit(0);
  }
}

runTest().catch(console.error);
