import mongoose from "mongoose";
import dotenv from "dotenv";
import Teacher from "./models/Teacher.js";
import Course from "./models/Course.js";
import Student from "./models/Student.js";
import Class from "./models/Class.js";
import Attendance from "./models/Attendance.js";
import Grade from "./models/Grade.js";
import Certificate from "./models/Certificate.js";
import Assignment from "./models/Assignment.js";
import Task from "./models/Task.js";
import MonthlyAttendance from "./models/MonthlyAttendance.js";
import Notification from "./models/Notification.js";
import DailyAttendanceSheet from "./models/DailyAttendance.js";
import GeotagAttendance from "./models/GeotagAttendance.js";

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB database.");

    const teachers = await Teacher.find({});
    console.log(`Found ${teachers.length} teachers in the database.`);

    for (const teacher of teachers) {
      console.log(`Seeding data for teacher: ${teacher.name} (${teacher.email})`);

      const teacherId = teacher._id;

      // 1. Clear existing related data for this teacher to prevent duplicates on multiple runs
      await Promise.all([
        Course.deleteMany({ teacherId }),
        Student.deleteMany({ teacherId }),
        Class.deleteMany({ teacherId }),
        Attendance.deleteMany({ teacherId }),
        Grade.deleteMany({ teacherId }),
        Certificate.deleteMany({ teacherId }),
        Assignment.deleteMany({ teacherId }),
        Task.deleteMany({ teacherId }),
        MonthlyAttendance.deleteMany({ teacherId }),
        Notification.deleteMany({ teacherId }),
        DailyAttendanceSheet.deleteMany({ teacherId }),
        GeotagAttendance.deleteMany({ teacherId }),
      ]);

      // 2. Create courses
      const courses = await Course.insertMany([
        {
          teacherId,
          name: "Pre-Primary Teacher Training",
          description: "Comprehensive training for early childhood instructors.",
          duration: "4 weeks",
          modules: 24,
          completedModules: 17,
          students: 38,
          progress: 72,
          status: "ongoing",
          nextDate: new Date(Date.now() + 86400000 * 2),
        },
        {
          teacherId,
          name: "Child Psychology & Development",
          description: "Understanding childhood developmental stages and behavioral dynamics.",
          duration: "3 weeks",
          modules: 16,
          completedModules: 7,
          students: 35,
          progress: 45,
          status: "ongoing",
          nextDate: new Date(Date.now() + 86400000 * 3),
        },
        {
          teacherId,
          name: "Curriculum Design & Planning",
          description: "Creating effective lesson plans and teaching aids.",
          duration: "2 weeks",
          modules: 20,
          completedModules: 0,
          students: 40,
          progress: 0,
          status: "pending",
          nextDate: new Date(Date.now() + 86400000 * 5),
        },
      ]);

      // 3. Create students
      const students = await Student.insertMany([
        { teacherId, name: "Aarav Sharma", email: "aarav@example.com", phone: "9876543201", grade: "A", status: "active" },
        { teacherId, name: "Isha Patel", email: "isha@example.com", phone: "9876543202", grade: "B", status: "active" },
        { teacherId, name: "Kabir Mehta", email: "kabir@example.com", phone: "9876543203", grade: "A", status: "active" },
        { teacherId, name: "Riya Sen", email: "riya@example.com", phone: "9876543204", grade: "C", status: "active" },
        { teacherId, name: "Vihaan Gupta", email: "vihaan@example.com", phone: "9876543205", grade: "A", status: "active" },
      ]);

      // 4. Create classes
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const classes = await Class.insertMany([
        {
          teacherId,
          courseId: courses[0]._id,
          name: "Grade 5A",
          description: "Number Patterns",
          classDate: today,
          startTime: "08:00 AM",
          endTime: "09:30 AM",
          room: "101",
          status: "completed",
          students: students.map(s => s._id),
          totalStudents: students.length,
          attendedStudents: students.length,
        },
        {
          teacherId,
          courseId: courses[0]._id,
          name: "Grade 6B",
          description: "Algebraic Expressions",
          classDate: today,
          startTime: "09:30 AM",
          endTime: "11:00 AM",
          room: "203",
          status: "ongoing",
          students: students.map(s => s._id),
          totalStudents: students.length,
          attendedStudents: students.length,
        },
        {
          teacherId,
          courseId: courses[1]._id,
          name: "Grade 5B",
          description: "Fractions & Decimals",
          classDate: today,
          startTime: "11:00 AM",
          endTime: "12:30 PM",
          room: "101",
          status: "scheduled",
          students: students.map(s => s._id),
          totalStudents: students.length,
          attendedStudents: 0,
        },
      ]);

      // Update teacher classes and students counts
      await Teacher.findByIdAndUpdate(teacherId, {
        classes: classes.length,
        students: students.length,
      });

      // 5. Create attendance records
      await Attendance.insertMany([
        { teacherId, studentId: students[0]._id, classId: classes[0]._id, date: today, status: "present", remarks: "On time" },
        { teacherId, studentId: students[1]._id, classId: classes[0]._id, date: today, status: "present", remarks: "On time" },
        { teacherId, studentId: students[2]._id, classId: classes[0]._id, date: today, status: "present", remarks: "On time" },
        { teacherId, studentId: students[3]._id, classId: classes[0]._id, date: today, status: "present", remarks: "On time" },
        { teacherId, studentId: students[4]._id, classId: classes[0]._id, date: today, status: "present", remarks: "On time" },
      ]);

      // 6. Create grades
      await Grade.insertMany([
        { teacherId, studentId: students[0]._id, courseId: courses[0]._id, assessmentName: "Lesson Plan Proposal", score: 45, maxScore: 50, percentage: 90, grade: "A", feedback: "Outstanding pedagogical structure." },
        { teacherId, studentId: students[1]._id, courseId: courses[0]._id, assessmentName: "Lesson Plan Proposal", score: 40, maxScore: 50, percentage: 80, grade: "B", feedback: "Good effort, refine target markers." },
        { teacherId, studentId: students[2]._id, courseId: courses[0]._id, assessmentName: "Activity Worksheet", score: 48, maxScore: 50, percentage: 96, grade: "A", feedback: "Very creative design." },
      ]);

      // 7. Create certificates
      await Certificate.insertMany([
        { teacherId, studentId: students[0]._id, courseId: courses[0]._id, certificateId: `CERT-${teacherId.toString().slice(-4)}-01`, title: "Pre-Primary Teacher Training — Level 1", issueDate: new Date(Date.now() - 86400000 * 30), status: "issued" },
        { teacherId, studentId: students[1]._id, courseId: courses[1]._id, certificateId: `CERT-${teacherId.toString().slice(-4)}-02`, title: "Child Safety & Wellbeing", issueDate: new Date(Date.now() - 86400000 * 15), status: "issued" },
      ]);

      // 8. Create assignments
      await Assignment.insertMany([
        { teacherId, courseId: courses[0]._id, title: "Lesson Plan — Number Patterns", description: "Design a 45-minute lesson plan for grade 5 patterns.", dueDate: new Date(Date.now() + 86400000 * 3), status: "pending", totalMarks: 100, submittedCount: 0, totalStudents: students.length },
        { teacherId, courseId: courses[0]._id, title: "Activity Worksheet Set", description: "Prepare a pack of 5 worksheets.", dueDate: new Date(Date.now() - 86400000 * 2), status: "completed", totalMarks: 100, submittedCount: 4, totalStudents: students.length, score: 95 },
        { teacherId, courseId: courses[0]._id, title: "Assessment Tool Design", description: "Create visual scoring rubric.", dueDate: new Date(Date.now() - 86400000 * 5), status: "revision", totalMarks: 100, submittedCount: 3, totalStudents: students.length },
      ]);

      // 9. Create tasks
      await Task.insertMany([
        { teacherId, title: "Grade Lesson Plans", description: "Assess submissions for patterns module.", dueDate: new Date(Date.now() + 86400000), priority: "high", status: "pending", category: "grading" },
        { teacherId, title: "Register Classroom Roster", description: "Validate student onboarding documents.", dueDate: new Date(Date.now() + 86400000 * 4), priority: "medium", status: "pending", category: "admin" },
      ]);

      // 10. Create monthly attendance
      await MonthlyAttendance.insertMany([
        { teacherId, month: 1, year: 2026, attendancePercentage: 95, totalClasses: 20, classesAttended: 19 },
        { teacherId, month: 2, year: 2026, attendancePercentage: 88, totalClasses: 20, classesAttended: 18 },
        { teacherId, month: 3, year: 2026, attendancePercentage: 92, totalClasses: 22, classesAttended: 20 },
        { teacherId, month: 4, year: 2026, attendancePercentage: 87, totalClasses: 20, classesAttended: 17 },
        { teacherId, month: 5, year: 2026, attendancePercentage: 90, totalClasses: 21, classesAttended: 19 },
        { teacherId, month: 6, year: 2026, attendancePercentage: 94, totalClasses: 20, classesAttended: 19 },
      ]);

      // 11. Create notifications
      await Notification.insertMany([
        { teacherId, type: "session", message: "Live session tomorrow at 10:00 AM — Classroom Management", timeLabel: "2h ago", read: false },
        { teacherId, type: "assignment", message: "Assignment reviewed — Activity Worksheet scored 95/100", timeLabel: "5h ago", read: false },
        { teacherId, type: "approval", message: "Assignment needs revision — Reattempt by 05/06/2026", timeLabel: "1d ago", read: true },
      ]);

      // 12. Create daily attendance sheet (DailyAttendanceSheet)
      const dateStr = today.toISOString().split("T")[0];
      await DailyAttendanceSheet.create({
        teacherId,
        teacherEmail: teacher.email,
        subject: teacher.subject || "General",
        sheetDate: dateStr,
        roster: students.map((s, index) => ({
          rollNo: index + 1,
          name: s.name,
          status: "P",
        })),
        notes: "Daily class attendance sheet generated automatically.",
        isLocked: false,
      });

      // 13. Create Geotag attendance logs for the past 5 days
      const geotags = [];
      for (let i = 0; i < 5; i++) {
        const logDate = new Date(Date.now() - 86400000 * i);
        const logDateKey = logDate.toISOString().split("T")[0];
        const logDateLabel = logDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

        geotags.push(
          {
            teacherId,
            teacherEmail: teacher.email,
            dateKey: logDateKey,
            dateLabel: logDateLabel,
            actionType: "checkin",
            checkInTime: "08:05:12 AM",
            coords: "18.66750, 73.89610",
            latitude: 18.6675,
            longitude: 73.8961,
            distanceOffset: 5,
            snapshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            campusLat: 18.6675,
            campusLng: 73.8961,
            verified: true,
            status: "Verified Attendance Logged",
          },
          {
            teacherId,
            teacherEmail: teacher.email,
            dateKey: logDateKey,
            dateLabel: logDateLabel,
            actionType: "checkout",
            checkOutTime: "04:35:48 PM",
            coords: "18.66760, 73.89620",
            latitude: 18.6676,
            longitude: 73.8962,
            distanceOffset: 12,
            snapshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            campusLat: 18.6675,
            campusLng: 73.8961,
            verified: true,
            status: "Verified Attendance Logged",
          }
        );
      }
      await GeotagAttendance.insertMany(geotags);

      console.log(`✓ Completed seeding for: ${teacher.name}`);
    }

    console.log("Database successfully seeded for all teachers!");
    await mongoose.connection.close();
  } catch (err) {
    console.error("Seeding error:", err);
    try {
      await mongoose.connection.close();
    } catch {}
  }
}

seed();
