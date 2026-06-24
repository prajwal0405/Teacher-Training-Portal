const express = require('express');
const cors = require('cors');
const { connectDB, Teacher, Admin, Center, CenterClass, Child, AttendanceSession, LessonPlan, LessonPlanAssignment, LessonCompletionReport, Course } = require('./db.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ══════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════

app.post('/api/auth/login', ah(async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  let teacher = await Teacher.findOne({ email });

  if (!teacher) {
    let defaultCenter = await Center.findOne().lean();
    if (!defaultCenter) {
      const c = await Center.create({ name: 'Spacece Mumbai Center' });
      const centerCount = await CenterClass.countDocuments();
      if (centerCount === 0) await seedClasses(c._id);
      defaultCenter = c.toObject();
    }
    const cls = await CenterClass.findOne().lean();
    teacher = await Teacher.create({
      email, name: 'Snehal Taphare', password: 'teacher123',
      status: 'approved',
      teacherProfile: { center: defaultCenter._id, class: cls ? cls._id : null }
    });
  }

  if (teacher.password !== password) return res.status(401).json({ message: 'Invalid email or password' });
  if (teacher.status === 'pending') return res.status(403).json({ message: 'Account pending admin approval' });
  if (teacher.status === 'rejected') return res.status(403).json({ message: 'Account rejected by admin' });

  res.json({ user: { _id: teacher._id, name: teacher.name, email: teacher.email, status: teacher.status, role: 'teacher' }, token: 'teacher-token-' + teacher._id });
}));

app.post('/api/admin/login', ah(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  let admin = await Admin.findOne({ email }).lean();
  if (!admin) {
    admin = await Admin.create({ email, name: 'Admin', password, role: 'admin' });
  }
  if (admin.password !== password) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ user: { _id: admin._id, name: admin.name, email: admin.email, role: 'admin' }, token: 'admin-token-' + admin._id });
}));

// ══════════════════════════════════════
//  TEACHER ROUTES
// ══════════════════════════════════════

app.get('/api/teacher/me', ah(async (req, res) => {
  const email = req.query.email || 'snehal@school.edu';
  let teacher = await Teacher.findOne({ email }).lean();
  if (!teacher) {
    let defaultCenter = await Center.findOne().lean();
    if (!defaultCenter) {
      const c = await Center.create({ name: 'Spacece Mumbai Center' });
      await seedClasses(c._id);
      defaultCenter = await Center.findOne().lean();
    }
    const cls = await CenterClass.findOne().lean();
    const t = await Teacher.create({
      email, name: 'Snehal Taphare', password: 'teacher123',
      teacherProfile: { center: defaultCenter._id, class: cls ? cls._id : null }
    });
    teacher = t.toObject();
  }
  const populated = await Teacher.findById(teacher._id)
    .populate('teacherProfile.center', 'name')
    .populate('teacherProfile.class', 'name ageGroup center').lean();
  res.json({ teacher: populated });
}));

app.get('/api/teacher/classes', ah(async (req, res) => {
  const email = req.query.email || 'snehal@school.edu';
  const teacher = await Teacher.findOne({ email }).lean();
  let classes;
  if (teacher && teacher.teacherProfile && teacher.teacherProfile.center) {
    classes = await CenterClass.find({ center: teacher.teacherProfile.center }).populate('center', 'name').lean();
  } else {
    classes = await CenterClass.find().populate('center', 'name').lean();
  }
  res.json({ classes });
}));

app.post('/api/teachers', ah(async (req, res) => {
  const { name, email, phone, address, subjects, password, profileImage } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });
  const exists = await Teacher.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email already registered' });
  const teacher = await Teacher.create({
    name, email, phone: phone || '', address: address || '',
    subject: subjects ? subjects[0] : '', photo: profileImage || '',
    password, status: 'pending'
  });
  res.status(201).json({ message: 'Registration submitted! Awaiting admin approval.' });
}));

// ══════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════

app.get('/api/admin/teachers', ah(async (req, res) => {
  const teachers = await Teacher.find().select('-password').sort({ createdAt: -1 }).lean();
  res.json({ teachers });
}));

app.get('/api/admin/teachers/:id/approve', ah(async (req, res) => {
  const teacher = await Teacher.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true }).select('-password').lean();
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  res.json({ message: 'Teacher approved', teacher });
}));

app.get('/api/admin/teachers/:id/reset', ah(async (req, res) => {
  const teacher = await Teacher.findByIdAndUpdate(req.params.id, { password: 'teacher123' }, { new: true }).select('-password').lean();
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  res.json({ message: 'Password reset to teacher123', teacher });
}));

app.get('/api/admin/teachers/:id/assign', ah(async (req, res) => {
  const cls = await CenterClass.findOne().lean();
  const center = await Center.findOne().lean();
  if (!cls || !center) return res.status(400).json({ message: 'No classes found. Run /api/seed first.' });
  const teacher = await Teacher.findByIdAndUpdate(req.params.id,
    { teacherProfile: { center: center._id, class: cls._id } },
    { new: true }).populate('teacherProfile.center', 'name').populate('teacherProfile.class', 'name').lean();
  res.json({ message: 'Class assigned: ' + cls.name, teacher });
}));

// ══════════════════════════════════════
//  SEED ROUTE
// ══════════════════════════════════════

app.get('/api/seed', ah(async (req, res) => {
  let center = await Center.findOne().lean();
  if (!center) {
    center = await Center.create({ name: 'Spacece Mumbai Center' });
  }
  const classCount = await CenterClass.countDocuments();
  if (classCount === 0) {
    await seedClasses(center._id);
  }
  const classes = await CenterClass.find().lean();
  const children = await Child.find().lean();
  res.json({ message: 'Seed done', classes: classes.length, children: children.length, classes, children });
}));

// ══════════════════════════════════════
//  CHILDREN ROUTES
// ══════════════════════════════════════

app.get('/api/children', ah(async (req, res) => {
  const { classId } = req.query;
  const query = { status: 'active' };
  if (classId) query.classId = classId;
  const children = await Child.find(query).populate('classId', 'name ageGroup').populate('centerId', 'name').lean();
  res.json({ children });
}));

app.post('/api/children', ah(async (req, res) => {
  const { fullName, classId, status } = req.body;
  if (!fullName) return res.status(400).json({ error: 'fullName is required' });
  const count = await Child.countDocuments();
  const rollNo = 'N-A-' + String(count + 1).padStart(3, '0');
  let centerId = null;
  if (classId) {
    const cls = await CenterClass.findById(classId).lean();
    centerId = cls ? cls.center : null;
  }
  const child = await Child.create({ fullName, name: fullName, rollNo, classId: classId || null, centerId, status: status || 'active' });
  res.status(201).json(child.toObject());
}));

// ══════════════════════════════════════
//  ATTENDANCE SESSION ROUTES
// ══════════════════════════════════════

app.get('/api/attendance/sessions', ah(async (req, res) => {
  const { date, classId } = req.query;
  const query = {};
  if (date) query.date = date;
  if (classId) query.class = classId;
  const sessions = await AttendanceSession.find(query)
    .populate('class', 'name ageGroup center')
    .populate('records.child', 'fullName name rollNo').lean();
  res.json({ sessions });
}));

app.post('/api/attendance/sessions', ah(async (req, res) => {
  const { centerId, classId, attendanceDate, records } = req.body;
  if (!classId || !attendanceDate || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'classId, attendanceDate, and records are required' });
  }
  await AttendanceSession.deleteMany({ date: attendanceDate, class: classId });
  const sessionRecords = records.map((r) => ({ child: r.childId, status: r.status || 'present' }));
  const session = await AttendanceSession.create({
    date: attendanceDate, class: classId, center: centerId || null, teacher: req.body.teacherId || null, records: sessionRecords
  });
  const populated = await AttendanceSession.findById(session._id)
    .populate('class', 'name').populate('records.child', 'fullName name').lean();
  res.status(201).json({ success: true, message: 'Attendance saved for ' + records.length + ' children', session: populated });
}));

app.put('/api/attendance/sessions', ah(async (req, res) => {
  const { centerId, classId, attendanceDate, records } = req.body;
  if (!classId || !attendanceDate || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'classId, attendanceDate, and records are required' });
  }
  await AttendanceSession.deleteMany({ date: attendanceDate, class: classId });
  const sessionRecords = records.map((r) => ({ child: r.childId, status: r.status || 'present' }));
  const session = await AttendanceSession.create({
    date: attendanceDate, class: classId, center: centerId || null, teacher: req.body.teacherId || null, records: sessionRecords
  });
  res.json({ success: true, message: 'Attendance updated for ' + records.length + ' children', session: session.toObject() });
}));

// ══════════════════════════════════════
//  SEED HELPER
// ══════════════════════════════════════

async function seedClasses(centerId) {
  const existing = await CenterClass.countDocuments();
  if (existing > 0) return;
  const classes = [
    { name: 'Nursery A', ageGroup: '3-4 years', center: centerId },
    { name: 'Nursery B', ageGroup: '3-4 years', center: centerId },
    { name: 'KG A', ageGroup: '4-5 years', center: centerId },
    { name: 'KG B', ageGroup: '4-5 years', center: centerId },
    { name: 'Prep A', ageGroup: '5-6 years', center: centerId },
  ];
  await CenterClass.insertMany(classes);
  console.log('Seeded ' + classes.length + ' classes');
  const firstClass = await CenterClass.findOne({ name: 'Nursery A' }).lean();
  if (firstClass) {
    const sampleChildren = [
      { fullName: 'Aarav Mehta', rollNo: 'N-A-001', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 'Anaya Shah', rollNo: 'N-A-002', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 'gau', rollNo: 'CH-001', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 'sneha thakur', rollNo: 'CH-003', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 'gauri', rollNo: 'CH-002', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 'riddhi', rollNo: 'CH-005', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 'om', rollNo: 'CH-006', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 'hello', rollNo: 'CH-007', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 'hi', rollNo: 'CH-008', classId: firstClass._id, centerId, status: 'active' },
      { fullName: 's', rollNo: 'CH-009', classId: firstClass._id, centerId, status: 'active' },
    ];
    await Child.insertMany(sampleChildren);
    console.log('Seeded ' + sampleChildren.length + ' children');
  }
}

// ══════════════════════════════════════
//  LESSON ROUTES FOR TEACHER
// ══════════════════════════════════════

// Get teacher's assigned lessons (populated with lesson plan details)
app.get("/api/lessons", async (req, res) => {
  try {
    const teacherEmail = req.query.teacher;
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) return res.json([]);

    const assignments = await LessonPlanAssignment.find({ teacher: teacher._id })
      .populate("lessonPlan")
      .populate("class")
      .sort({ createdAt: -1 });

    const result = assignments.map(a => ({
      _id: a._id,
      assignmentId: a._id,
      lessonPlanId: a.lessonPlan?._id,
      title: a.lessonPlan?.title || "Untitled",
      objectives: a.lessonPlan?.objectives || "",
      activities: a.lessonPlan?.activities || "",
      instructions: a.lessonPlan?.instructions || "",
      resources: a.lessonPlan?.resources || "",
      scheduleDate: a.lessonPlan?.scheduleDate || a.assignedDate,
      className: a.class?.name || "",
      status: a.status,
      assignedDate: a.assignedDate,
    }));

    res.json(result);
  } catch (err) {
    console.error("Lessons fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Submit lesson completion
app.post("/api/lessons/submit", async (req, res) => {
  try {
    const { lessonId, teacher: teacherEmail, teacherName, teachingNotes, activityDone, submittedAt } = req.body;

    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const report = new LessonCompletionReport({
      assignment: lessonId,
      teacher: teacher._id,
      teachingNotes,
      activityDescription: activityDone,
      files: [],
      status: "pending",
    });
    await report.save();

    await LessonPlanAssignment.findByIdAndUpdate(lessonId, { status: "completed" });

    res.json({ success: true, message: "Lesson completion submitted!", reportId: report._id });
  } catch (err) {
    console.error("Lesson submit error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get teacher's submission history
app.get("/api/lessons/submissions", async (req, res) => {
  try {
    const teacherEmail = req.query.teacher;
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) return res.json([]);

    const reports = await LessonCompletionReport.find({ teacher: teacher._id })
      .populate("assignment")
      .sort({ createdAt: -1 });

    const result = reports.map(r => ({
      _id: r._id,
      assignmentId: r.assignment?._id,
      lessonTitle: r.assignment?.lessonPlan?.title || "Unknown Lesson",
      teachingNotes: r.teachingNotes,
      activityDescription: r.activityDescription,
      status: r.status,
      submittedAt: r.createdAt,
    }));

    res.json(result);
  } catch (err) {
    console.error("Submissions fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get teacher's course progress
app.get("/api/lessons/progress", async (req, res) => {
  try {
    const teacherEmail = req.query.teacher;
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) return res.json({ total: 0, completed: 0, pending: 0, percentage: 0 });

    const total = await LessonPlanAssignment.countDocuments({ teacher: teacher._id });
    const completed = await LessonPlanAssignment.countDocuments({ teacher: teacher._id, status: "completed" });
    const pending = total - completed;

    res.json({
      total,
      completed,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  } catch (err) {
    console.error("Progress fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════
//  SEED LESSONS ROUTE
// ══════════════════════════════════════

app.get("/api/seed-lessons", ah(async (req, res) => {
  const teacherEmail = req.query.teacher || "snehal@school.edu";
  const teacher = await Teacher.findOne({ email: teacherEmail });
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });

  const center = await Center.findOne().lean();
  const cls = await CenterClass.findOne().lean();

  let lessonPlan = await LessonPlan.findOne().lean();
  if (!lessonPlan) {
    lessonPlan = await LessonPlan.create({
      title: "Number Patterns",
      objectives: "Introduce counting and visual number patterns.",
      activities: "Sorting, grouping, and matching activity.",
      instructions: "Use blocks and picture cards.",
      resources: "Flash cards, blocks",
      scheduleDate: new Date(),
    });
  }

  let existing = await LessonPlanAssignment.findOne({ teacher: teacher._id, lessonPlan: lessonPlan._id }).lean();
  if (existing) {
    return res.json({ message: "Already assigned", assignment: existing });
  }

  const assignment = await LessonPlanAssignment.create({
    lessonPlan: lessonPlan._id,
    teacher: teacher._id,
    center: center?._id,
    class: cls?._id,
    assignedDate: new Date(),
    status: "pending",
  });

  res.json({ message: "Lesson assigned!", teacherId: teacher._id, assignmentId: assignment._id });
}));

app.get("/api/courses", ah(async (req, res) => {
  const courses = await Course.find({ status: "published" }).sort({ createdAt: -1 });
  res.json(courses);
}));

// ══════════════════════════════════════
//  START SERVER
// ══════════════════════════════════════

connectDB().then(async () => {
  const centerCount = await Center.countDocuments();
  if (centerCount === 0) {
    const c = await Center.create({ name: 'Spacece Mumbai Center' });
    await seedClasses(c._id);
  }
  app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
  });
}).catch(err => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});