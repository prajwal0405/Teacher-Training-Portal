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
import { Batch } from "./models/Batch.js";
import { AttendanceAlert } from "./models/AttendanceAlert.js";

export async function autoSeed() {
  console.log("Seeding database with initial portal data...");

  const adminPassword = await hashPassword("Admin@123");
  const teacherPassword = await hashPassword("Teacher@123");

  const admin = await User.findOneAndUpdate(
    { email: "admin@spaceece.com" },
    {
      role: "admin",
      name: "Admin User",
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

  const teacherInputs = [
    { name: "Dnyaneshwari Thorat", email: "dnyaneshwarit27@gmail.com", phone: "8605689467", subject: "Pre-Primary", qualification: "Graduate" },
    { name: "Gauri Thorat", email: "dnyaneshwarithrt@gmail.com", phone: "8605689467", subject: "Montessori", qualification: "Graduate" },
    { name: "Abhishek Thorat", email: "thoratdnyanu@gmail.com", phone: "8605689467", subject: "ECCE", qualification: "Graduate" },
  ];

  const teachers = [];
  for (const input of teacherInputs) {
    const teacher = await User.findOneAndUpdate(
      { email: input.email },
      {
        role: "teacher",
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: teacherPassword,
        status: "approved",
        teacherProfile: {
          center: center._id,
          class: classRecord._id,
          qualification: input.qualification,
          subject: input.subject,
          experience: "Fresher",
          address: "Pune, Maharashtra",
          performanceRating: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    teachers.push(teacher);
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

  await CourseAssignment.bulkWrite(
    teachers.map((teacher) => ({
      updateOne: {
        filter: { course: course._id, teacher: teacher._id },
        update: {
          course: course._id,
          teacher: teacher._id,
          assignedBy: admin._id,
          progressPercent: 0,
          status: "assigned",
        },
        upsert: true,
      },
    }))
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
      teacher: teachers[0]._id,
      assignedDate: new Date(new Date().toDateString()),
    },
    {
      lessonPlan: lesson._id,
      teacher: teachers[0]._id,
      center: center._id,
      class: classRecord._id,
      assignedDate: new Date(new Date().toDateString()),
      status: "pending",
    },
    { upsert: true, new: true }
  );

  const trainerCount = await Trainer.countDocuments();
  if (trainerCount === 0) {
    await Trainer.create([
      {
        name: "SpaceECE Lead Trainer",
        subject: "Teacher Training",
        email: "trainer@spaceece.in",
        phone: "8605689467",
        qualification: "Teacher Trainer",
        linkedin: "",
        bio: "Lead trainer for assigned teacher training courses.",
        courses: 1,
        sessions: 0,
        rating: 0,
        status: "active",
      },
    ]);
  }

  // Feedback data is created by users through the feedback submission form — no seed data needed

  const sampleLessons = [
    {
      title: "Number Patterns & Counting",
      course: course._id,
      objectives: "Introduce counting and visual number patterns.",
      instructions: "Use blocks and picture cards.",
      activities: "Sorting, grouping, and matching activity.",
      resources: "Flash cards, blocks",
      scheduleDate: new Date(Date.now() + 86400000),
      createdBy: admin._id,
    },
    {
      title: "Phonics & Letter Sounds",
      course: course._id,
      objectives: "Teach letter recognition and phonetic sounds.",
      instructions: "Use alphabet charts and songs.",
      activities: "Singing, tracing letters, matching objects.",
      resources: "Alphabet charts, crayons, worksheets",
      scheduleDate: new Date(Date.now() + 2 * 86400000),
      createdBy: admin._id,
    },
    {
      title: "Storytelling & Moral Values",
      course: course._id,
      objectives: "Develop listening skills and moral understanding.",
      instructions: "Use picture books and puppets.",
      activities: "Group story time, role play, discussion.",
      resources: "Story books, puppets, charts",
      scheduleDate: new Date(Date.now() + 3 * 86400000),
      createdBy: admin._id,
    },
    {
      title: "Colors & Shapes Exploration",
      course: course._id,
      objectives: "Identify and differentiate colors and shapes.",
      instructions: "Use color cards and shape cutouts.",
      activities: "Coloring, sorting shapes, collage making.",
      resources: "Color cards, scissors, glue, paper",
      scheduleDate: new Date(Date.now() + 4 * 86400000),
      createdBy: admin._id,
    },
    {
      title: "Circle Time & Calendar",
      course: course._id,
      objectives: "Build routine and calendar awareness.",
      instructions: "Use a large calendar and song charts.",
      activities: "Good morning song, date/weather discussion.",
      resources: "Calendar, weather chart, song chart",
      scheduleDate: new Date(Date.now() + 5 * 86400000),
      createdBy: admin._id,
    },
  ];

  for (const lessonData of sampleLessons) {
    const lesson = await LessonPlan.findOneAndUpdate(
      { title: lessonData.title, course: lessonData.course },
      lessonData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const teacher of teachers) {
      await LessonPlanAssignment.findOneAndUpdate(
        { lessonPlan: lesson._id, teacher: teacher._id },
        {
          lessonPlan: lesson._id,
          teacher: teacher._id,
          center: center._id,
          class: classRecord._id,
          assignedDate: lesson.scheduleDate,
          status: "pending",
        },
        { upsert: true, new: true }
      );
    }
  }

  const existingBatch = await Batch.findOne({ code: "BATCH-ECCE-2026-01" });
  if (!existingBatch) {
    await Batch.create({
      name: "ECCE Foundation Batch - June 2026",
      code: "BATCH-ECCE-2026-01",
      description: "Foundation batch for new ECCE teachers starting June 2026.",
      course: course._id,
      center: center._id,
      trainer: (await User.findOne({ role: "trainer" }))?._id || admin._id,
      teachers: teachers.map((t) => t._id),
      startDate: new Date(),
      endDate: new Date(Date.now() + 180 * 86400000),
      schedule: {
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        startTime: "09:00",
        endTime: "12:00",
        timezone: "Asia/Kolkata",
      },
      maxTeachers: 30,
      enrolledCount: teachers.length,
      status: "ongoing",
      createdBy: admin._id,
    });
  }

  const attendanceAlertData = [
    { teacher: teachers[0]._id, center: center._id, class: classRecord._id, attendanceRate: 72, threshold: 75, alertType: "low_attendance", severity: "warning", message: "Attendance below 75% threshold. Please ensure regular attendance." },
    { teacher: teachers[1]._id, center: center._id, class: classRecord._id, attendanceRate: 58, threshold: 75, alertType: "critical_low_attendance", severity: "critical", message: "Attendance critically low at 58%. Immediate action required." },
    { teacher: teachers[2]._id, center: center._id, class: classRecord._id, attendanceRate: 88, threshold: 75, alertType: "low_attendance", severity: "info", message: "Attendance recovering well at 88%. Keep it up!" },
  ];

  for (const alertData of attendanceAlertData) {
    const existingAlert = await AttendanceAlert.findOne({ teacher: alertData.teacher, center: alertData.center, class: alertData.class, alertType: alertData.alertType });
    if (!existingAlert) {
      await AttendanceAlert.create(alertData);
    }
  }

  console.log("Automatic database seeding complete.");
  console.log("Admin account: admin@spaceece.com / Admin@123");
  console.log("Teacher accounts use the seeded email addresses / Teacher@123");
}
