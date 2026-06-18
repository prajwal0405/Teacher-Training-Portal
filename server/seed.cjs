const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/teacher-training-portal';

// ===== SCHEMAS (same as db.cjs) =====

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
  title: String, description: String, date: Date,
  duration: String, objectives: [String],
  materials: [String], activities: [String],
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

// ===== MODELS =====
const Admin = mongoose.model('Admin', AdminSchema);
const Center = mongoose.model('Center', CenterSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const Child = mongoose.model('Child', ChildSchema);
const Course = mongoose.model('Course', CourseSchema);
const LessonPlan = mongoose.model('LessonPlan', LessonPlanSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

// ===== SEED DATA =====
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  // Clear all
  await Admin.deleteMany({});
  await Center.deleteMany({});
  await Teacher.deleteMany({});
  await Child.deleteMany({});
  await Course.deleteMany({});
  await LessonPlan.deleteMany({});
  await Activity.deleteMany({});
  await Attendance.deleteMany({});
  console.log('Old data cleared');

  // 1. Admin
  const bcrypt = require('bcryptjs');
  const hashedAdminPwd = await bcrypt.hash('Admin@123', 10);
  const admin = await Admin.create({
    name: 'SpacECE Admin',
    email: 'admin@spacece.org',
    password: hashedAdminPwd
  });
  console.log('Admin created: admin@spacece.org / Admin@123');

  // 2. Centers
  const centers = await Center.create([
    {
      name: 'SpacECE Center - Pune',
      address: '12, FC Road, Shivajinagar',
      city: 'Pune', pincode: '411005',
      contactPerson: 'Dr. Meera Joshi',
      contactPhone: '9876543210',
      email: 'pune@spacece.org',
      capacity: 50, status: 'active'
    },
    {
      name: 'SpacECE Center - Mumbai',
      address: '45, Marine Drive, Churchgate',
      city: 'Mumbai', pincode: '400020',
      contactPerson: 'Mrs. Sunita Patel',
      contactPhone: '9876543211',
      email: 'mumbai@spacece.org',
      capacity: 60, status: 'active'
    },
    {
      name: 'SpacECE Center - Nagpur',
      address: '78, Civil Lines, Dharampeth',
      city: 'Nagpur', pincode: '440001',
      contactPerson: 'Mr. Rajesh Deshmukh',
      contactPhone: '9876543212',
      email: 'nagpur@spacece.org',
      capacity: 40, status: 'active'
    }
  ]);
  console.log(`${centers.length} Centers created`);

  // 3. Teachers (5 total: 3 approved + 2 pending)
  const hashedPwd = await bcrypt.hash('Teacher@123', 10);
  const teachers = await Teacher.create([
    {
      name: 'Sneha Taphare', email: 'sneha@school.edu', password: hashedPwd,
      phone: '9123456780', qualification: 'B.Ed in ECE',
      specialization: 'Early Childhood Education',
      experience: 3, center: centers[0]._id,
      subjects: ['Mathematics', 'Environmental Science'],
      status: 'approved', joinDate: '2024-06-15',
      address: 'Pune, Maharashtra', gender: 'Female',
      dateOfBirth: '1998-03-12', emergencyContact: '9123456781',
      bloodGroup: 'B+'
    },
    {
      name: 'Priya Sharma', email: 'priya@school.edu', password: hashedPwd,
      phone: '9123456782', qualification: 'M.Ed',
      specialization: 'Child Psychology',
      experience: 5, center: centers[0]._id,
      subjects: ['Language Development', 'Art & Craft'],
      status: 'approved', joinDate: '2023-08-01',
      address: 'Pimpri, Pune', gender: 'Female',
      dateOfBirth: '1995-11-20', emergencyContact: '9123456783',
      bloodGroup: 'O+'
    },
    {
      name: 'Amit Kulkarni', email: 'amit@school.edu', password: hashedPwd,
      phone: '9123456784', qualification: 'B.Ed',
      specialization: 'Physical Education',
      experience: 2, center: centers[1]._id,
      subjects: ['Physical Education', 'Health Education'],
      status: 'approved', joinDate: '2024-01-10',
      address: 'Mumbai, Maharashtra', gender: 'Male',
      dateOfBirth: '1997-07-08', emergencyContact: '9123456785',
      bloodGroup: 'A+'
    },
    {
      name: 'Neha Desai', email: 'neha@school.edu', password: hashedPwd,
      phone: '9123456786', qualification: 'B.Ed in ECE',
      specialization: 'Special Education',
      experience: 1, center: centers[2]._id,
      subjects: ['Special Education', 'Music'],
      status: 'pending', joinDate: null,
      address: 'Nagpur, Maharashtra', gender: 'Female',
      dateOfBirth: '1999-01-25', emergencyContact: '9123456787',
      bloodGroup: 'AB+'
    },
    {
      name: 'Rahul More', email: 'rahul@school.edu', password: hashedPwd,
      phone: '9123456788', qualification: 'D.Ed',
      specialization: 'Pre-Primary Teaching',
      experience: 0, center: centers[1]._id,
      subjects: ['Hindi', 'General Knowledge'],
      status: 'pending', joinDate: null,
      address: 'Thane, Maharashtra', gender: 'Male',
      dateOfBirth: '2000-05-14', emergencyContact: '9123456789',
      bloodGroup: 'O-'
    }
  ]);
  console.log(`${teachers.length} Teachers created (3 approved + 2 pending)`);
  console.log('Teacher logins:');
  teachers.forEach(t => console.log(`  ${t.email} / Teacher@123 (${t.status})`));

  // 4. Children (8 total - for 3.4)
  const children = await Child.create([
    {
      name: 'Aarav Patil', age: 4, gender: 'Male',
      dateOfBirth: '2021-05-15',
      center: centers[0]._id, teacher: teachers[0]._id,
      classGroup: 'Nursery-A',
      parentName: 'Suresh Patil', parentPhone: '9111111101',
      parentEmail: 'suresh@gmail.com',
      address: 'Kothrud, Pune',
      admissionDate: '2024-06-20', status: 'active',
      medicalNotes: 'No medical conditions',
      allergies: 'None'
    },
    {
      name: 'Ananya Joshi', age: 5, gender: 'Female',
      dateOfBirth: '2020-09-08',
      center: centers[0]._id, teacher: teachers[0]._id,
      classGroup: 'KG-B',
      parentName: 'Ravi Joshi', parentPhone: '9111111102',
      parentEmail: 'ravi@gmail.com',
      address: 'Shivajinagar, Pune',
      admissionDate: '2024-06-20', status: 'active',
      medicalNotes: 'Needs glasses for reading',
      allergies: 'Dust'
    },
    {
      name: 'Vihaan Mehta', age: 3, gender: 'Male',
      dateOfBirth: '2022-12-01',
      center: centers[0]._id, teacher: teachers[1]._id,
      classGroup: 'Playgroup-A',
      parentName: 'Nikhil Mehta', parentPhone: '9111111103',
      parentEmail: 'nikhil@gmail.com',
      address: 'Aundh, Pune',
      admissionDate: '2025-01-10', status: 'active',
      medicalNotes: 'Asthma - mild',
      allergies: 'Pollen'
    },
    {
      name: 'Isha Gupta', age: 4, gender: 'Female',
      dateOfBirth: '2021-03-22',
      center: centers[0]._id, teacher: teachers[1]._id,
      classGroup: 'Nursery-A',
      parentName: 'Amit Gupta', parentPhone: '9111111104',
      parentEmail: 'amitg@gmail.com',
      address: 'Baner, Pune',
      admissionDate: '2024-07-05', status: 'active',
      medicalNotes: 'None',
      allergies: 'None'
    },
    {
      name: 'Kabir Singh', age: 5, gender: 'Male',
      dateOfBirth: '2020-08-14',
      center: centers[1]._id, teacher: teachers[2]._id,
      classGroup: 'KG-A',
      parentName: 'Harpreet Singh', parentPhone: '9111111105',
      parentEmail: 'harpreet@gmail.com',
      address: 'Andheri, Mumbai',
      admissionDate: '2024-06-15', status: 'active',
      medicalNotes: 'None',
      allergies: 'Peanuts'
    },
    {
      name: 'Meera Nair', age: 4, gender: 'Female',
      dateOfBirth: '2021-11-30',
      center: centers[1]._id, teacher: teachers[2]._id,
      classGroup: 'Nursery-B',
      parentName: 'Sunil Nair', parentPhone: '9111111106',
      parentEmail: 'sunil@gmail.com',
      address: 'Borivali, Mumbai',
      admissionDate: '2025-01-05', status: 'active',
      medicalNotes: 'None',
      allergies: 'None'
    },
    {
      name: 'Arjun Reddy', age: 3, gender: 'Male',
      dateOfBirth: '2022-06-18',
      center: centers[2]._id, teacher: teachers[3]._id,
      classGroup: 'Playgroup-A',
      parentName: 'Venkat Reddy', parentPhone: '9111111107',
      parentEmail: 'venkat@gmail.com',
      address: 'Dharampeth, Nagpur',
      admissionDate: '2025-02-01', status: 'inactive',
      medicalNotes: 'Left ear mild hearing loss',
      allergies: 'None'
    },
    {
      name: 'Diya Patil', age: 5, gender: 'Female',
      dateOfBirth: '2020-04-10',
      center: centers[2]._id, teacher: teachers[3]._id,
      classGroup: 'KG-A',
      parentName: 'Mandar Patil', parentPhone: '9111111108',
      parentEmail: 'mandar@gmail.com',
      address: 'Sitabuldi, Nagpur',
      admissionDate: '2024-06-18', status: 'active',
      medicalNotes: 'None',
      allergies: 'Milk'
    }
  ]);
  console.log(`\n${children.length} Children created (Module 3.4 data)`);

  // 5. Courses (5 total - for 3.6)
  const courses = await Course.create([
    {
      title: 'Early Childhood Foundations',
      description: 'Core course covering child development theories, learning through play, and foundational teaching methods for ages 2-6.',
      category: 'Foundation',
      duration: '3 months',
      level: 'Beginner',
      modules: [
        { title: 'Child Development Basics', description: 'Physical, cognitive, social-emotional development stages', duration: '2 weeks' },
        { title: 'Play-Based Learning', description: 'Using play as a teaching tool', duration: '3 weeks' },
        { title: 'Classroom Management', description: 'Managing young learners effectively', duration: '2 weeks' },
        { title: 'Assessment Methods', description: 'Age-appropriate assessment techniques', duration: '2 weeks' }
      ],
      center: centers[0]._id,
      assignedTeachers: [teachers[0]._id, teachers[1]._id],
      status: 'active'
    },
    {
      title: 'Language & Literacy Development',
      description: 'Techniques for teaching reading, writing, and communication skills to young children using phonics and storytelling.',
      category: 'Language',
      duration: '2 months',
      level: 'Intermediate',
      modules: [
        { title: 'Phonics & Phonemic Awareness', description: 'Teaching letter sounds and blending', duration: '2 weeks' },
        { title: 'Storytelling Methods', description: 'Using stories for language development', duration: '2 weeks' },
        { title: 'Writing Readiness', description: 'Pre-writing skills and activities', duration: '2 weeks' }
      ],
      center: centers[0]._id,
      assignedTeachers: [teachers[1]._id],
      status: 'active'
    },
    {
      title: 'Mathematics for Young Learners',
      description: 'Hands-on approach to teaching counting, patterns, shapes, and basic arithmetic to preschool children.',
      category: 'Mathematics',
      duration: '2 months',
      level: 'Beginner',
      modules: [
        { title: 'Number Concepts', description: 'Counting, number recognition, one-to-one correspondence', duration: '2 weeks' },
        { title: 'Shapes & Patterns', description: 'Geometry basics for preschool', duration: '2 weeks' },
        { title: 'Measurement & Data', description: 'Basic measurement concepts', duration: '1 week' }
      ],
      center: centers[1]._id,
      assignedTeachers: [teachers[2]._id],
      status: 'active'
    },
    {
      title: 'Art & Creativity in Education',
      description: 'Using visual arts, music, dance, and creative expression as tools for holistic child development.',
      category: 'Creative Arts',
      duration: '1.5 months',
      level: 'Beginner',
      modules: [
        { title: 'Visual Arts for Children', description: 'Drawing, painting, craft activities', duration: '2 weeks' },
        { title: 'Music & Movement', description: 'Using songs and dance in teaching', duration: '2 weeks' },
        { title: 'Creative Expression', description: 'Encouraging imagination and creativity', duration: '1 week' }
      ],
      center: centers[0]._id,
      assignedTeachers: [teachers[1]._id, teachers[0]._id],
      status: 'active'
    },
    {
      title: 'Special Needs Inclusive Education',
      description: 'Understanding and teaching children with special needs, creating inclusive classroom environments.',
      category: 'Special Education',
      duration: '4 months',
      level: 'Advanced',
      modules: [
        { title: 'Understanding Special Needs', description: 'Types of disabilities and learning difficulties', duration: '3 weeks' },
        { title: 'Inclusive Teaching Strategies', description: 'Adapting lessons for diverse learners', duration: '3 weeks' },
        { title: 'IEP Development', description: 'Individual Education Plans', duration: '2 weeks' },
        { title: 'Assistive Technology', description: 'Tools and aids for special needs', duration: '2 weeks' }
      ],
      center: centers[2]._id,
      assignedTeachers: [teachers[3]._id],
      status: 'active'
    }
  ]);
  console.log(`${courses.length} Courses created (Module 3.6 data)`);

  // 6. Lesson Plans (5 total)
  const lessonPlans = await LessonPlan.create([
    {
      course: courses[0]._id, teacher: teachers[0]._id,
      title: 'Introduction to Play-Based Learning',
      description: 'First session on understanding play as a learning tool',
      date: '2025-06-20', duration: '45 minutes',
      objectives: ['Understand types of play', 'Identify learning outcomes from play', 'Design a play-based activity'],
      materials: ['Toy blocks', 'Picture cards', 'Activity sheets'],
      activities: ['Group discussion on play types', 'Hands-on play session', 'Reflection sharing'],
      assessment: 'Observe and document children play behaviors',
      notes: 'Focus on free play vs structured play'
    },
    {
      course: courses[1]._id, teacher: teachers[1]._id,
      title: 'Phonics - Letter A Sounds',
      description: 'Teaching the sound of letter A through fun activities',
      date: '2025-06-22', duration: '30 minutes',
      objectives: ['Recognize letter A', 'Produce the short A sound', 'Identify words starting with A'],
      materials: ['Flash cards', 'Apple cutouts', 'Audio clips'],
      activities: ['Letter A song', 'Apple tasting activity', 'Coloring letter A'],
      assessment: 'Children can point to objects starting with A',
      notes: 'Use visual aids extensively'
    },
    {
      course: courses[2]._id, teacher: teachers[2]._id,
      title: 'Counting with Objects',
      description: 'Hands-on counting activity using everyday objects',
      date: '2025-06-25', duration: '40 minutes',
      objectives: ['Count up to 10', 'Match number to quantity', 'Recognize number symbols'],
      materials: ['Counting beads', 'Number cards', 'Small toys'],
      activities: ['Counting beads activity', 'Number matching game', 'Song: 1-10 counting'],
      assessment: 'Count objects correctly and match to number card',
      notes: 'Provide individual attention to struggling learners'
    },
    {
      course: courses[3]._id, teacher: teachers[1]._id,
      title: 'Finger Painting Fun',
      description: 'Creative art session using finger paints',
      date: '2025-06-28', duration: '35 minutes',
      objectives: ['Explore colors', 'Develop fine motor skills', 'Express creativity'],
      materials: ['Finger paints', 'Chart paper', 'Aprons', 'Wet wipes'],
      activities: ['Color mixing demonstration', 'Free finger painting', 'Gallery walk'],
      assessment: 'Participation and creative expression',
      notes: 'Keep extra wipes ready, cover tables'
    },
    {
      course: courses[4]._id, teacher: teachers[3]._id,
      title: 'Understanding Autism Spectrum',
      description: 'Introductory session on understanding autism in young children',
      date: '2025-07-01', duration: '60 minutes',
      objectives: ['Define autism spectrum', 'Identify common characteristics', 'Learn basic support strategies'],
      materials: ['Presentation slides', 'Case study handouts', 'Video clips'],
      activities: ['Lecture on ASD basics', 'Case study discussion', 'Strategy brainstorming'],
      assessment: 'Quiz on ASD characteristics and strategies',
      notes: 'Sensitivity and respect in discussion'
    }
  ]);
  console.log(`${lessonPlans.length} Lesson Plans created`);

  // 7. Activities (4 total - for 3.5)
  const activities = await Activity.create([
    {
      title: 'Annual Day Practice - Dance',
      description: 'Children practicing group dance performance for annual day celebration',
      type: 'photo',
      fileUrl: '/uploads/annual-day-dance.jpg',
      teacher: teachers[0]._id,
      center: centers[0]._id,
      children: [children[0]._id, children[1]._id, children[2]._id],
      date: '2025-06-15',
      notes: 'Rehearsal went well, need more practice on coordination',
      status: 'active'
    },
    {
      title: 'Science Experiment - Volcano',
      description: 'Simple baking soda and vinegar volcano experiment for kids',
      type: 'video',
      fileUrl: '/uploads/volcano-experiment.mp4',
      teacher: teachers[1]._id,
      center: centers[0]._id,
      children: [children[2]._id, children[3]._id],
      date: '2025-06-18',
      notes: 'Children loved the experiment, repeated 3 times',
      status: 'active'
    },
    {
      title: 'Field Trip - Zoo Visit',
      description: 'Educational field trip to Rajiv Gandhi Zoological Park',
      type: 'document',
      fileUrl: '/uploads/zoo-trip-report.pdf',
      teacher: teachers[2]._id,
      center: centers[1]._id,
      children: [children[4]._id, children[5]._id],
      date: '2025-06-22',
      notes: 'Very successful trip, children learned about 15 animals',
      status: 'active'
    },
    {
      title: 'Parent-Teacher Meeting Photos',
      description: 'Photographs from the quarterly parent-teacher meeting',
      type: 'photo',
      fileUrl: '/uploads/ptm-photos.jpg',
      teacher: teachers[0]._id,
      center: centers[0]._id,
      children: [children[0]._id, children[1]._id, children[3]._id],
      date: '2025-06-25',
      notes: 'Good turnout, 8 out of 10 parents attended',
      status: 'active'
    }
  ]);
  console.log(`${activities.length} Activities created (Module 3.5 data)`);

  // 8. Attendance (sample - last 3 days)
  const attendanceData = [];
  const today = new Date();
  for (let d = 0; d < 3; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    children.forEach(child => {
      if (child.status === 'active') {
        attendanceData.push({
          child: child._id,
          teacher: child.teacher,
          center: child.center,
          date: date,
          status: Math.random() > 0.15 ? 'present' : 'absent',
          notes: ''
        });
      }
    });
  }
  await Attendance.create(attendanceData);
  console.log(`${attendanceData.length} Attendance records created`);

  // ===== SUMMARY =====
  console.log('\n========== SEED COMPLETE ==========');
  console.log('Admin:      1');
  console.log('Centers:    3');
  console.log('Teachers:   5 (3 approved, 2 pending)');
  console.log('Children:   8  <-- Module 3.4');
  console.log('Courses:    5  <-- Module 3.6');
  console.log('LessonPlans:5');
  console.log('Activities: 4  <-- Module 3.5');
  console.log('Attendance: ' + attendanceData.length);
  console.log('===================================');

  await mongoose.disconnect();
  console.log('\nDone! MongoDB disconnected.');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});