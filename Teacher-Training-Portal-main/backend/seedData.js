import mongoose from "mongoose";
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
import dotenv from "dotenv";

dotenv.config();

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await Promise.all([
      Teacher.deleteMany({}),
      Course.deleteMany({}),
      Student.deleteMany({}),
      Class.deleteMany({}),
      Attendance.deleteMany({}),
      Grade.deleteMany({}),
      Certificate.deleteMany({}),
      Assignment.deleteMany({}),
      Task.deleteMany({}),
      MonthlyAttendance.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log("Cleared existing data");

    // Create sample teacher
    const teacher = await Teacher.create({
      name: "Sannidhya",
      email: "sannidhya@spacece.com",
      phone: "9876543210",
      address: "Dhayri, Pune, Maharashtra",
      subject: "History",
      password: "password123",
      joined: new Date().toLocaleDateString("en-IN"),
      status: "approved",
      attendance: 90,
      workingCenter: "Dhayri, Pune, Maharashtra",
      degree: "M.Sc. Computer Applications",
      university: "University of Pune",
      netStatus: "UGC NET Qualified",
      expYears: "3+ Years Active",
      batch: "SpaceECE",
      classes: 6,
      students: 230
    });

    console.log("✓ Teacher created:", teacher.name);

    // Create sample courses
    const courses = await Course.insertMany([
      {
        teacherId: teacher._id,
        name: "Pre-Primary Teacher Training",
        description: "Comprehensive training for pre-primary teachers",
        duration: "4 weeks",
        modules: 24,
        completedModules: 17,
        students: 50,
        progress: 72,
        status: "ongoing",
        nextDate: new Date(Date.now() + 86400000 * 2)
      },
      {
        teacherId: teacher._id,
        name: "Child Psychology & Development",
        description: "Understanding child development stages",
        duration: "3 weeks",
        modules: 16,
        completedModules: 7,
        students: 45,
        progress: 45,
        status: "ongoing",
        nextDate: new Date(Date.now() + 86400000 * 3)
      },
      {
        teacherId: teacher._id,
        name: "Curriculum Design & Planning",
        description: "Curriculum development and lesson planning",
        duration: "2 weeks",
        modules: 20,
        completedModules: 0,
        students: 40,
        progress: 0,
        status: "pending",
        nextDate: new Date(Date.now() + 86400000 * 5)
      }
    ]);

    console.log("✓ Courses created:", courses.length);

    // Create sample students
    const students = await Student.insertMany([
      {
        teacherId: teacher._id,
        name: "Priya Sharma",
        email: "priya@example.com",
        phone: "9988776655",
        grade: "A",
        status: "active",
        enrollmentDate: new Date(),
        totalClasses: 10,
        attendedClasses: 9,
        averageGrade: 85
      },
      {
        teacherId: teacher._id,
        name: "Rahul Mishra",
        email: "rahul@example.com",
        phone: "9988776654",
        grade: "B",
        status: "active",
        enrollmentDate: new Date(),
        totalClasses: 10,
        attendedClasses: 8,
        averageGrade: 78
      },
      {
        teacherId: teacher._id,
        name: "Anjali Patel",
        email: "anjali@example.com",
        phone: "9988776653",
        grade: "A",
        status: "active",
        enrollmentDate: new Date(),
        totalClasses: 10,
        attendedClasses: 10,
        averageGrade: 92
      }
    ]);

    console.log("✓ Students created:", students.length);

    // Create sample classes
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const classes = await Class.insertMany([
      {
        teacherId: teacher._id,
        courseId: courses[0]._id,
        name: "Grade 5A — Number Patterns",
        description: "Learning number patterns and sequences",
        classDate: today,
        startTime: "08:00 AM",
        endTime: "09:30 AM",
        room: "Room 101",
        status: "completed",
        students: [students[0]._id, students[1]._id],
        totalStudents: 2,
        attendedStudents: 2
      },
      {
        teacherId: teacher._id,
        courseId: courses[0]._id,
        name: "Grade 6B — Algebraic Expressions",
        description: "Introduction to algebraic expressions",
        classDate: today,
        startTime: "09:30 AM",
        endTime: "10:30 AM",
        room: "Room 203",
        status: "ongoing",
        students: [students[1]._id, students[2]._id],
        totalStudents: 2,
        attendedStudents: 2
      },
      {
        teacherId: teacher._id,
        courseId: courses[1]._id,
        name: "Grade 5B — Fractions & Decimals",
        description: "Understanding fractions and decimals",
        classDate: today,
        startTime: "11:00 AM",
        endTime: "12:00 PM",
        room: "Room 101",
        status: "scheduled",
        students: [students[0]._id, students[2]._id],
        totalStudents: 2,
        attendedStudents: 0
      }
    ]);

    console.log("✓ Classes created:", classes.length);

    // Create sample attendance records
    const attendanceRecords = await Attendance.insertMany([
      {
        teacherId: teacher._id,
        studentId: students[0]._id,
        classId: classes[0]._id,
        date: today,
        status: "present",
        remarks: "On time"
      },
      {
        teacherId: teacher._id,
        studentId: students[1]._id,
        classId: classes[0]._id,
        date: today,
        status: "present",
        remarks: "On time"
      },
      {
        teacherId: teacher._id,
        studentId: students[1]._id,
        classId: classes[1]._id,
        date: today,
        status: "present",
        remarks: "Active participation"
      },
      {
        teacherId: teacher._id,
        studentId: students[2]._id,
        classId: classes[1]._id,
        date: today,
        status: "present",
        remarks: "On time"
      }
    ]);

    console.log("✓ Attendance records created:", attendanceRecords.length);

    // Create sample grades
    const grades = await Grade.insertMany([
      {
        teacherId: teacher._id,
        studentId: students[0]._id,
        courseId: courses[0]._id,
        assessmentName: "Quiz 1",
        score: 85,
        maxScore: 100,
        percentage: 85,
        grade: "B",
        feedback: "Good work!"
      },
      {
        teacherId: teacher._id,
        studentId: students[1]._id,
        courseId: courses[0]._id,
        assessmentName: "Quiz 1",
        score: 92,
        maxScore: 100,
        percentage: 92,
        grade: "A",
        feedback: "Excellent performance!"
      },
      {
        teacherId: teacher._id,
        studentId: students[2]._id,
        courseId: courses[0]._id,
        assessmentName: "Mid-term Exam",
        score: 88,
        maxScore: 100,
        percentage: 88,
        grade: "B",
        feedback: "Great effort!"
      }
    ]);

    console.log("✓ Grades created:", grades.length);

    // Create sample certificates
    const certificates = await Certificate.insertMany([
      {
        teacherId: teacher._id,
        studentId: students[0]._id,
        courseId: courses[0]._id,
        certificateId: "CERT-20260101",
        title: "Pre-Primary Teacher Training Completion",
        issueDate: new Date(),
        status: "issued",
        certificateUrl: "https://example.com/cert-001"
      },
      {
        teacherId: teacher._id,
        studentId: students[2]._id,
        courseId: courses[0]._id,
        certificateId: "CERT-20260102",
        title: "Advanced Pre-Primary Teaching Methods",
        issueDate: new Date(),
        status: "issued",
        certificateUrl: "https://example.com/cert-002"
      }
    ]);

    console.log("✓ Certificates created:", certificates.length);

    // Create sample assignments
    const assignments = await Assignment.insertMany([
      {
        teacherId: teacher._id,
        courseId: courses[0]._id,
        title: "Lesson Plan — Number Pattern",
        description: "Create a lesson plan for teaching number patterns",
        dueDate: new Date(Date.now() + 86400000),
        status: "pending",
        totalMarks: 50,
        submittedCount: 0,
        totalStudents: 50
      },
      {
        teacherId: teacher._id,
        courseId: courses[0]._id,
        title: "Activity Worksheet Set",
        description: "Design activity worksheets for classroom use",
        dueDate: new Date(Date.now() + 86400000 * 3),
        status: "active",
        totalMarks: 40,
        submittedCount: 35,
        totalStudents: 50
      },
      {
        teacherId: teacher._id,
        courseId: courses[1]._id,
        title: "Assessment Tool Design",
        description: "Create comprehensive assessment tools",
        dueDate: new Date(Date.now() + 86400000 * 8),
        status: "pending",
        totalMarks: 60,
        submittedCount: 5,
        totalStudents: 45
      }
    ]);

    console.log("✓ Assignments created:", assignments.length);

    // Create sample tasks
    const tasks = await Task.insertMany([
      {
        teacherId: teacher._id,
        title: "Review assignment submissions",
        description: "Review and grade student assignment submissions",
        dueDate: new Date(Date.now() + 86400000),
        priority: "high",
        status: "pending",
        category: "grading"
      },
      {
        teacherId: teacher._id,
        title: "Prepare lesson plan for week 3",
        description: "Create detailed lesson plan for upcoming week",
        dueDate: new Date(Date.now() + 86400000 * 2),
        priority: "high",
        status: "in-progress",
        category: "lesson-planning"
      },
      {
        teacherId: teacher._id,
        title: "Conduct mid-term assessments",
        description: "Conduct and record mid-term assessment scores",
        dueDate: new Date(Date.now() + 86400000 * 5),
        priority: "medium",
        status: "pending",
        category: "assessment"
      }
    ]);

    console.log("✓ Tasks created:", tasks.length);

    // Create sample monthly attendance records
    const monthlyAttendance = await MonthlyAttendance.insertMany([
      {
        teacherId: teacher._id,
        month: 1,
        year: 2026,
        attendancePercentage: 95,
        totalClasses: 20,
        classesAttended: 19
      },
      {
        teacherId: teacher._id,
        month: 2,
        year: 2026,
        attendancePercentage: 88,
        totalClasses: 20,
        classesAttended: 18
      },
      {
        teacherId: teacher._id,
        month: 3,
        year: 2026,
        attendancePercentage: 92,
        totalClasses: 22,
        classesAttended: 20
      },
      {
        teacherId: teacher._id,
        month: 4,
        year: 2026,
        attendancePercentage: 87,
        totalClasses: 20,
        classesAttended: 17
      },
      {
        teacherId: teacher._id,
        month: 5,
        year: 2026,
        attendancePercentage: 90,
        totalClasses: 21,
        classesAttended: 19
      },
      {
        teacherId: teacher._id,
        month: 6,
        year: 2026,
        attendancePercentage: 94,
        totalClasses: 20,
        classesAttended: 19
      }
    ]);

    console.log("✓ Monthly attendance records created:", monthlyAttendance.length);

    const notifications = await Notification.insertMany([
      {
        teacherId: teacher._id,
        type: "session",
        message: "Live session tomorrow at 10:00 AM — Classroom Management",
        timeLabel: "2h ago",
        read: false
      },
      {
        teacherId: teacher._id,
        type: "assignment",
        message: "Assignment reviewed — Activity Worksheet scored 95/100",
        timeLabel: "5h ago",
        read: false
      },
      {
        teacherId: teacher._id,
        type: "approval",
        message: "Assignment needs revision — Reattempt by 05/06/2026",
        timeLabel: "1d ago",
        read: true
      },
      {
        teacherId: teacher._id,
        type: "certificate",
        message: "Your certificate for Child Safety has been issued",
        timeLabel: "3d ago",
        read: true
      },
      {
        teacherId: teacher._id,
        type: "course",
        message: "New course available — Curriculum Design & Lesson Planning",
        timeLabel: "5d ago",
        read: true
      }
    ]);

    console.log("✓ Notifications created:", notifications.length);

    console.log("\n✅ Database seeding completed successfully!");
    console.log(`\nTeacher ID: ${teacher._id}`);
    console.log("Email: sannidhya@spacece.com");
    console.log("Password: password123");

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding database:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedDatabase();
