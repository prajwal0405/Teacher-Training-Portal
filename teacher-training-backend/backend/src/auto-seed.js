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
import { Feedback } from "./models/Feedback.js";

export async function autoSeed() {
  console.log("Seeding database with demo data...");

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

  const teacher = await User.findOneAndUpdate(
    { email: "priya@school.edu" },
    {
      role: "teacher",
      name: "Priya Sharma",
      email: "priya@school.edu",
      phone: "9876543210",
      passwordHash: teacherPassword,
      status: "approved",
      teacherProfile: {
        center: center._id,
        class: classRecord._id,
        qualification: "B.Ed",
        subject: "Pre-Primary",
        experience: "3-5 yrs",
        address: "Mumbai",
        performanceRating: 4.5,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const child1 = await Child.findOneAndUpdate(
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

  const child2 = await Child.findOneAndUpdate(
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

  const trainerCount = await Trainer.countDocuments();
  if (trainerCount === 0) {
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
      },
      {
        name: "Prof. Amol Desai",
        subject: "Montessori Methods",
        email: "desai@spaceece.in",
        phone: "9876540002",
        qualification: "M.Ed, Montessori Trainer",
        linkedin: "linkedin.com/in/amol-desai",
        bio: "Specialist in Montessori tools, sensory training, and teaching material development.",
        courses: 2,
      },
    ]);
  }

  const feedbackCount = await Feedback.countDocuments();
  if (feedbackCount === 0) {
    await Feedback.create([
      {
        learner: "Asha Kulkarni",
        course: "Pre-Primary Teacher Training",
        batch: "Batch A",
        trainer: "Dr. Rekha Iyer",
        rating: 5,
        trainerRating: 5,
        tag: "Content Quality",
        suggestion: "Add more classroom demonstration videos in Module 2.",
        status: "pending",
        date: "12/06/2026",
        anonymous: false
      },
      {
        learner: "Neha Joshi",
        course: "Montessori Teacher Training",
        batch: "Batch B",
        trainer: "Prof. Amol Desai",
        rating: 4,
        trainerRating: 5,
        tag: "Platform UX",
        suggestion: "Provide printable worksheets after each live session.",
        status: "approved",
        date: "10/06/2026",
        anonymous: false,
        adminResponse: "Thank you for the suggestion! We will add downloadable worksheets soon."
      }
    ]);
  }

  console.log("Automatic database seeding complete.");
  console.log("Admin account: admin@spaceece.com / Admin@123");
  console.log("Teacher account: priya@school.edu / Teacher@123");
}
