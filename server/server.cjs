const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ===== MODELS (same as db.cjs) =====
const AdminSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String
});
const CenterSchema = new mongoose.Schema({
  name: String, address: String, city: String, pincode: String,
  contactPerson: String, contactPhone: String, email: String,
  capacity: Number, status: { type: String, default: 'active' }
});
const TeacherSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  phone: String, qualification: String, specialization: String,
  experience: Number, center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center' },
  subjects: [String], status: { type: String, default: 'pending' },
  joinDate: Date, profileImage: String, address: String, gender: String,
  dateOfBirth: Date, emergencyContact: String, bloodGroup: String
});
const ChildSchema = new mongoose.Schema({
  name: String, age: Number, gender: String, dateOfBirth: Date,
  center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  classGroup: String, parentName: String, parentPhone: String,
  parentEmail: String, address: String, admissionDate: Date,
  status: { type: String, default: 'active' },
  medicalNotes: String, allergies: String
});
const CourseSchema = new mongoose.Schema({
  title: String, description: String, category: String,
  duration: String, level: String,
  modules: [{ title: String, description: String, duration: String }],
  center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center' },
  assignedTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
const LessonPlanSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  title: String, description: String, date: Date, duration: String,
  objectives: [String], materials: [String], activities: [String],
  assessment: String, notes: String
});
const ActivitySchema = new mongoose.Schema({
  title: String, description: String, type: String,
  fileUrl: String, filePublicId: String,
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center' },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Child' }],
  date: Date, notes: String,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
const AttendanceSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center' },
  date: Date, status: String, notes: String
});

const Admin = mongoose.model('Admin', AdminSchema);
const Center = mongoose.model('Center', CenterSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const Child = mongoose.model('Child', ChildSchema);
const Course = mongoose.model('Course', CourseSchema);
const LessonPlan = mongoose.model('LessonPlan', LessonPlanSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

// ===== JWT AUTH MIDDLEWARE =====
const JWT_SECRET = process.env.JWT_SECRET || 'spacECE_secret_key_2024';

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ===== AUTH ROUTES =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    let user;
    if (role === 'admin') {
      user = await Admin.findOne({ email });
    } else {
      user = await Teacher.findOne({ email });
    }
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    if (role !== 'admin' && user.status === 'pending') {
      return res.status(403).json({ message: 'Account pending approval' });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, role: role },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role, status: user.status }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== CENTER ROUTES =====
app.get('/api/centers', async (req, res) => {
  try { const centers = await Center.find({}); res.json(centers); }
  catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.post('/api/centers', authMiddleware, async (req, res) => {
  try { const center = await Center.create(req.body); res.status(201).json(center); }
  catch (err) { res.status(400).json({ message: err.message }); }
});
app.put('/api/centers/:id', authMiddleware, async (req, res) => {
  try {
    const center = await Center.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!center) return res.status(404).json({ message: 'Center not found' });
    res.json(center);
  } catch (err) { res.status(400).json({ message: err.message }); }
});
app.delete('/api/centers/:id', authMiddleware, async (req, res) => {
  try { await Center.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

// ===== TEACHER ROUTES =====
app.get('/api/teachers', async (req, res) => {
  try {
    const { status, center } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (center) filter.center = center;
    const teachers = await Teacher.find(filter).populate('center');
    res.json(teachers);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.get('/api/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate('center');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.put('/api/teachers/:id/approve', authMiddleware, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id,
      { status: 'approved', joinDate: new Date() }, { new: true });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.put('/api/teachers/:id/reject', authMiddleware, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id,
      { status: 'rejected' }, { new: true });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.delete('/api/teachers/:id', authMiddleware, async (req, res) => {
  try { await Teacher.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ===== CHILDREN ROUTES (Module 3.4) =====
app.get('/api/children', async (req, res) => {
  try {
    const { center, teacher, status } = req.query;
    const filter = {};
    if (center) filter.center = center;
    if (teacher) filter.teacher = teacher;
    if (status) filter.status = status;
    const children = await Child.find(filter).populate('center').populate('teacher');
    res.json(children);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.get('/api/children/:id', async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate('center').populate('teacher');
    if (!child) return res.status(404).json({ message: 'Child not found' });
    res.json(child);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.post('/api/children', async (req, res) => {
  try {
    const child = await Child.create(req.body);
    const populated = await Child.findById(child._id).populate('center').populate('teacher');
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});
app.put('/api/children/:id', async (req, res) => {
  try {
    const child = await Child.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('center').populate('teacher');
    if (!child) return res.status(404).json({ message: 'Child not found' });
    res.json(child);
  } catch (err) { res.status(400).json({ message: err.message }); }
});
app.delete('/api/children/:id', async (req, res) => {
  try { await Child.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ===== COURSE ROUTES (Module 3.6) =====
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find({}).populate('center').populate('assignedTeachers');
    res.json(courses);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('center').populate('assignedTeachers');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.post('/api/courses', async (req, res) => {
  try {
    const course = await Course.create(req.body);
    const populated = await Course.findById(course._id).populate('center').populate('assignedTeachers');
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});
app.put('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('center').populate('assignedTeachers');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) { res.status(400).json({ message: err.message }); }
});
app.delete('/api/courses/:id', async (req, res) => {
  try { await Course.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ===== LESSON PLAN ROUTES =====
app.get('/api/lesson-plans/course/:courseId', async (req, res) => {
  try {
    const plans = await LessonPlan.find({ course: req.params.courseId }).populate('teacher');
    res.json(plans);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.get('/api/lesson-plans/teacher/:teacherId', async (req, res) => {
  try {
    const plans = await LessonPlan.find({ teacher: req.params.teacherId }).populate('course');
    res.json(plans);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.post('/api/lesson-plans', async (req, res) => {
  try { const plan = await LessonPlan.create(req.body); res.status(201).json(plan); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

// ===== ACTIVITY ROUTES (Module 3.5) =====
app.get('/api/activities', async (req, res) => {
  try {
    const activities = await Activity.find({}).populate('teacher').populate('center').populate('children');
    res.json(activities);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.get('/api/activities/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id).populate('teacher').populate('center').populate('children');
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.get('/api/activities/teacher/:id', async (req, res) => {
  try {
    const activities = await Activity.find({ teacher: req.params.id }).populate('center').populate('children');
    res.json(activities);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.post('/api/activities', async (req, res) => {
  try { const activity = await Activity.create(req.body); res.status(201).json(activity); }
  catch (err) { res.status(400).json({ message: err.message }); }
});
app.delete('/api/activities/:id', async (req, res) => {
  try { await Activity.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ===== ATTENDANCE ROUTES =====
app.get('/api/attendance', async (req, res) => {
  try {
    const { date, child, center } = req.query;
    const filter = {};
    if (date) filter.date = { $gte: new Date(date), $lt: new Date(date + 'T23:59:59') };
    if (child) filter.child = child;
    if (center) filter.center = center;
    const records = await Attendance.find(filter).populate('child').populate('teacher');
    res.json(records);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});
app.post('/api/attendance', async (req, res) => {
  try { const record = await Attendance.create(req.body); res.status(201).json(record); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

// ===== STATS ROUTE =====
app.get('/api/stats/dashboard', async (req, res) => {
  try {
    const [teachers, children, centers, courses, activities] = await Promise.all([
      Teacher.countDocuments({}),
      Child.countDocuments({}),
      Center.countDocuments({}),
      Course.countDocuments({}),
      Activity.countDocuments({})
    ]);
    res.json({ teachers, children, centers, courses, activities });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ===== UPLOADS (for activities) =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/teacher-training-portal')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });