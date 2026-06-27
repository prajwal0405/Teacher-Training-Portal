import { useState, useEffect, useRef } from "react";
import { Logo, Toast, Badge, StatusBadge, StatCard, SectionCard, S, globalCSS } from "../components/Shared";
import AttendanceManager from "./AttendanceManager";
import TrainingAndClassroomManager from "./TrainingAndClassroomManager";
import GeotagAttendance from "./GeotagAttendance";
import ProctoredAssessment from "./Proctoredassessment";

/* ═══════════════════════════════════════════
   MOCK DATA
═══════════════════════════════════════════ */
const MOCK_SCHEDULE = [
  { time: "08:00 AM", class: "Grade 5A", topic: "Number Patterns",        room: "101", status: "completed" },
  { time: "09:30 AM", class: "Grade 6B", topic: "Algebraic Expressions",  room: "203", status: "ongoing"   },
  { time: "11:00 AM", class: "Grade 5B", topic: "Fractions & Decimals",   room: "101", status: "upcoming"  },
  { time: "01:00 PM", class: "Grade 7A", topic: "Geometry Basics",        room: "305", status: "upcoming"  },
  { time: "02:30 PM", class: "Grade 6A", topic: "Statistics",             room: "203", status: "upcoming"  },
  { time: "04:00 PM", class: "Grade 7B", topic: "Problem Solving Workshop",room: "Lab", status: "upcoming" },
];

const MOCK_GRADES = [
  { class: "Grade 5A", students: 38, avg: 82, highest: 98, lowest: 54, assignments: 8, completed: 7 },
  { class: "Grade 5B", students: 35, avg: 78, highest: 95, lowest: 48, assignments: 8, completed: 6 },
  { class: "Grade 6A", students: 40, avg: 85, highest: 100,lowest: 62, assignments: 8, completed: 8 },
  { class: "Grade 6B", students: 42, avg: 79, highest: 97, lowest: 50, assignments: 8, completed: 5 },
  { class: "Grade 7A", students: 36, avg: 88, highest: 99, lowest: 65, assignments: 8, completed: 8 },
  { class: "Grade 7B", students: 39, avg: 76, highest: 94, lowest: 45, assignments: 8, completed: 6 },
];

const MOCK_ATTENDANCE_MONTHLY = [
  { month: "Jan", val: 95 },{ month: "Feb", val: 88 },{ month: "Mar", val: 92 },
  { month: "Apr", val: 87 },{ month: "May", val: 90 },{ month: "Jun", val: 94 },
];

const MOCK_ASSIGNMENTS = [
  { id: 1, title: "Lesson Plan — Number Patterns",      course: "Pre-Primary Training", due: "05/06/2026", status: "pending",  score: null },
  { id: 2, title: "Activity Worksheet Set",             course: "Pre-Primary Training", due: "01/06/2026", status: "approved", score: 95   },
  { id: 3, title: "Assessment Tool Design",             course: "Pre-Primary Training", due: "28/05/2026", status: "revision", score: null },
  { id: 4, title: "Classroom Management Report",        course: "Pre-Primary Training", due: "20/05/2026", status: "approved", score: 88   },
];

const MOCK_COURSES = [
  { id: 1, title: "Pre-Primary Teacher Training",      progress: 72, total: 24, completed: 17, nextSession: "02/06/2026", status: "active"   },
  { id: 2, title: "Child Psychology & Development",    progress: 45, total: 16, completed: 7,  nextSession: "08/06/2026", status: "active"   },
  { id: 3, title: "Curriculum Design & Lesson Planning",progress: 0, total: 20, completed: 0,  nextSession: "15/06/2026", status: "enrolled" },
];

const MOCK_CERTIFICATES = [
  { id: 1, title: "Pre-Primary Teacher Training — Level 1", issued: "15/03/2026", grade: "A+", credentialId: "SPC-2026-001" },
  { id: 2, title: "Child Safety & Wellbeing",               issued: "10/02/2026", grade: "A",  credentialId: "SPC-2026-002" },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, type: "session",     msg: "Live session tomorrow at 10:00 AM — Classroom Management",  time: "2h ago",  read: false },
  { id: 2, type: "assignment",  msg: "Assignment reviewed — Activity Worksheet scored 95/100",     time: "5h ago",  read: false },
  { id: 3, type: "approval",    msg: "Assignment needs revision — Reattempt by 05/06/2026",        time: "1d ago",  read: true  },
  { id: 4, type: "certificate", msg: "Your certificate for Child Safety has been issued",           time: "3d ago",  read: true  },
  { id: 5, type: "course",      msg: "New course available — Curriculum Design & Lesson Planning", time: "5d ago",  read: true  },
];

/* ═══════════════════════════════════════════
   TAB COMPONENTS
═══════════════════════════════════════════ */

function OverviewTab({ user, setActiveTab }) {
  const attendance = user.attendance || 90;
  const attColor   = attendance>=85 ? "#10b981" : attendance>=70 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Good morning, {user.name?.split(" ")[0]}! 👋</h1>
          <p style={{ fontSize: 13, margin: 0, opacity: 0.88 }}>{user.subject} Teacher · {user.batch || "SpacECE"} · {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</p>
        </div>
        <div style={{ fontSize: 48, opacity: 0.7 }}>🎓</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
        <span style={{ fontSize: 18 }}>📍</span>
        <span>Working Center : {user.workingCenter || "Dhayri, Pune, Maharashtra"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 24, marginTop: 16 }}>
        <StatCard icon="📚" label="My Classes"     val={user.classes||6}   color="#f59e0b" bg="#fef3c7"/>
        <StatCard icon="👥" label="Total Students" val={user.students||230} color="#3b82f6" bg="#dbeafe"/>
        <StatCard icon="📊" label="Attendance"     val={`${attendance}%`}  color={attColor} bg={attendance>=85?"#d1fae5":attendance>=70?"#fef3c7":"#fee2e2"}/>
        <StatCard icon="📝" label="Avg Grade"      val="82%"               color="#8b5cf6" bg="#ede9fe"/>
        <StatCard icon="🏆" label="Certificates"   val={MOCK_CERTIFICATES.length} color="#06b6d4" bg="#cffafe"/>
        <StatCard icon="⏳" label="Pending Tasks"  val={MOCK_ASSIGNMENTS.filter(a=>a.status==="pending"||a.status==="revision").length} color="#ef4444" bg="#fee2e2"/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <SectionCard title="📈 My Monthly Attendance">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 220, paddingTop: 15 }}>
            {MOCK_ATTENDANCE_MONTHLY.map((d, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <span style={{ marginBottom: 8, fontSize: 12, fontWeight: 800, color: d.val >= 90 ? "#10b981" : d.val >= 80 ? "#f59e0b" : "#ef4444" }}>{d.val}%</span>
                <div style={{ width: 36, height: `${d.val * 1.6}px`, borderRadius: "12px 12px 0 0", background: d.val >= 90 ? "linear-gradient(180deg,#34d399,#10b981)" : d.val >= 80 ? "linear-gradient(180deg,#fbbf24,#f59e0b)" : "linear-gradient(180deg,#f87171,#ef4444)", transition: "all .6s ease" }}/>
                <span style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{d.month}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="📚 Course Progress">
          {MOCK_COURSES.map((c,i)=>(
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{c.title.split(" ").slice(0,3).join(" ")}...</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>{c.progress}%</span>
              </div>
              <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 2 }}>
                <div style={{ height: "100%", width: `${c.progress}%`, background: "linear-gradient(90deg,#f59e0b,#d97706)", borderRadius: 4 }}/>
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>{c.completed}/{c.total} modules · Next: {c.nextSession}</div>
            </div>
          ))}
          <button onClick={()=>setActiveTab("courses")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}>View all courses →</button>
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SectionCard title="📅 Today's Classes">
          {MOCK_SCHEDULE.slice(0,4).map((cl,i)=>{
            const statusColor = { completed: "#10b981", ongoing: "#f59e0b", upcoming: "#6b7280" };
            return (
              <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor[cl.status], marginTop: 5, flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{cl.class} — {cl.topic}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{cl.time} · Room {cl.room}</div>
                </div>
                <StatusBadge status={cl.status}/>
              </div>
            );
          })}
          <button onClick={()=>setActiveTab("schedule")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 8 }}>Full schedule →</button>
        </SectionCard>

        <SectionCard title="📝 Assignment Status">
          {MOCK_ASSIGNMENTS.map((a,i)=>(
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: a.status==="approved"?"#10b981":a.status==="revision"?"#ef4444":"#f59e0b" }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>{a.title.substring(0,28)}...</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Due: {a.due}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {a.score && <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981" }}>{a.score}/100</span>}
                <StatusBadge status={a.status}/>
              </div>
            </div>
          ))}
          <button onClick={()=>setActiveTab("assignments")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 8 }}>View all →</button>
        </SectionCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COURSE CONTENT DATA
═══════════════════════════════════════════ */
const COURSE_CONTENT = {
  1: { // Pre-Primary Teacher Training
    color: "#f59e0b",
    icon: "👩‍🏫",
    modules: [
      {
        id: "m1", title: "Introduction to Pre-Primary Education",
        videos: [
          { id: "v1", title: "What is Pre-Primary Education?", ytId: "Y5KmNaoMEVM", duration: "12:34" },
          { id: "v2", title: "Developmental Stages of Early Childhood", ytId: "cWgCGKnUbZo", duration: "18:22" },
          { id: "v3", title: "Role of a Pre-Primary Teacher", ytId: "vQnFgLxVJhU", duration: "14:10" },
        ],
        notes: `## Introduction to Pre-Primary Education\n\n**Key Concepts:**\n- Pre-primary education covers ages 3–6 years\n- It forms the foundation for lifelong learning\n- Focus areas: cognitive, social, emotional, physical development\n\n**The 5 Pillars of Early Childhood Education:**\n1. Play-based learning\n2. Holistic development\n3. Child-centered approach\n4. Family involvement\n5. Safe & nurturing environment\n\n**Important Theories:**\n- Piaget's Cognitive Development Theory\n- Vygotsky's Zone of Proximal Development (ZPD)\n- Bronfenbrenner's Ecological Systems Theory\n\n**Key Terms:** Scaffolding · Parallel Play · Sensorimotor Stage · Preoperational Stage`
      },
      {
        id: "m2", title: "Classroom Setup & Environment",
        videos: [
          { id: "v4", title: "Designing a Child-Friendly Classroom", ytId: "I3mKV3UlCiE", duration: "16:45" },
          { id: "v5", title: "Learning Corners & Activity Zones", ytId: "QlJif-4NWOE", duration: "11:30" },
          { id: "v6", title: "Safety & Hygiene in Early Classrooms", ytId: "5TGp6X0KSAM", duration: "9:50" },
        ],
        notes: `## Classroom Setup & Environment\n\n**Key Areas to Set Up:**\n- Reading Corner: soft seating, picture books, literacy materials\n- Art & Craft Zone: easels, non-toxic supplies, display boards\n- Dramatic Play Area: dress-up, kitchen set, puppets\n- Construction Zone: blocks, LEGO, puzzles\n- Science Discovery Table: magnifiers, nature items\n\n**Arrangement Principles:**\n- Low shelves for child independence\n- Clear pathways for movement\n- Defined zones reduce conflict\n- Natural light when possible\n\n**Safety Checklist:**\n✅ No sharp corners at child height\n✅ Non-toxic materials only\n✅ Secure heavy furniture to walls\n✅ Clear emergency exit paths`
      },
      {
        id: "m3", title: "Lesson Planning & Activity Design",
        videos: [
          { id: "v7", title: "Writing an Effective Lesson Plan", ytId: "1L_jKoiAb8c", duration: "20:15" },
          { id: "v8", title: "Theme-Based Teaching Approach", ytId: "N6pCIqxtWE8", duration: "15:00" },
          { id: "v9", title: "Circle Time & Group Activities", ytId: "sTRCTbmJMsc", duration: "13:40" },
        ],
        notes: `## Lesson Planning & Activity Design\n\n**Lesson Plan Template:**\n1. **Objective** — What will children learn?\n2. **Materials** — What do you need?\n3. **Introduction** (5 min) — Hook/story/song\n4. **Main Activity** (15–20 min) — Core learning\n5. **Review** (5 min) — Recap & discussion\n6. **Assessment** — Observation notes\n\n**Theme-Based Planning Examples:**\n- Week Theme: "Animals"\n  - Art: animal masks\n  - Science: habitat sorting\n  - Literacy: animal sound books\n  - Math: counting legs\n\n**Circle Time Essentials:**\n- Greeting ritual\n- Calendar & weather\n- Story or song\n- Day preview`
      },
    ]
  },
  2: { // Child Psychology
    color: "#8b5cf6",
    icon: "🧠",
    modules: [
      {
        id: "m4", title: "Foundations of Child Psychology",
        videos: [
          { id: "v10", title: "Introduction to Child Psychology", ytId: "O5BOxhqHEUQ", duration: "17:20" },
          { id: "v11", title: "Attachment Theory — Bowlby & Ainsworth", ytId: "WjOowWxOXCg", duration: "21:05" },
          { id: "v12", title: "Emotional Development in Children", ytId: "m2jU92NqBMw", duration: "14:55" },
        ],
        notes: `## Foundations of Child Psychology\n\n**Core Theories:**\n\n**Bowlby's Attachment Theory:**\n- Secure attachment → confident exploration\n- Types: Secure, Anxious-Ambivalent, Avoidant, Disorganized\n- Primary caregiver relationship is critical (0–2 years)\n\n**Piaget's Stages (Cognitive):**\n| Stage | Age | Key Feature |\n|---|---|---|\n| Sensorimotor | 0–2 | Object permanence |\n| Preoperational | 2–7 | Symbolic thinking |\n| Concrete Op. | 7–11 | Logical thinking |\n| Formal Op. | 12+ | Abstract reasoning |\n\n**Erikson's Psychosocial Stages (Early Childhood):**\n- Trust vs Mistrust (0–18 months)\n- Autonomy vs Shame (18m–3 years)\n- Initiative vs Guilt (3–5 years)`
      },
      {
        id: "m5", title: "Behavioural & Social Development",
        videos: [
          { id: "v13", title: "Social Learning Theory — Bandura", ytId: "eGSB1GKbJQE", duration: "16:30" },
          { id: "v14", title: "Play & Peer Relationships", ytId: "yT-lSxHMGbg", duration: "19:10" },
          { id: "v15", title: "Understanding Child Behaviour Problems", ytId: "RX2pjGIiS4w", duration: "22:45" },
        ],
        notes: `## Behavioural & Social Development\n\n**Bandura's Social Learning Theory:**\n- Children learn by observation (modeling)\n- 4 Steps: Attention → Retention → Reproduction → Motivation\n- Self-efficacy: belief in one's own ability\n\n**Types of Play (Parten's Social Stages):**\n1. Solitary Play (2–3 years)\n2. Parallel Play (2.5–3.5 years)\n3. Associative Play (3–4 years)\n4. Cooperative Play (4+ years)\n\n**Common Behaviour Challenges:**\n- Tantrums: validate emotion, stay calm\n- Aggression: teach words for feelings\n- Separation anxiety: consistent goodbye routine\n- Refusal: offer limited choices\n\n**Positive Reinforcement Tips:**\n✅ Praise effort, not outcome\n✅ Be specific: "I love how you shared your blocks"\n✅ Use visual reward charts`
      },
      {
        id: "m6", title: "Special Needs & Inclusive Education",
        videos: [
          { id: "v16", title: "Introduction to Inclusive Education", ytId: "iVt5CX3BLGU", duration: "18:00" },
          { id: "v17", title: "Identifying Learning Difficulties Early", ytId: "BVoCN5lD6rg", duration: "15:30" },
        ],
        notes: `## Special Needs & Inclusive Education\n\n**Key Principles of Inclusion:**\n- Every child has the right to education\n- Adapt environment, not the child\n- Collaboration: teachers, parents, specialists\n\n**Common Learning Differences:**\n- **Dyslexia**: difficulty with reading/writing → use multi-sensory methods\n- **ADHD**: attention/hyperactivity → structured routines, movement breaks\n- **Autism Spectrum**: social/communication differences → visual schedules, sensory awareness\n- **Developmental Delay**: slower milestone achievement → differentiated activities\n\n**Classroom Adaptations:**\n- Flexible seating arrangements\n- Visual timetables on walls\n- Quiet zones for sensory breaks\n- Peer buddy systems\n- Modified instructions & materials`
      },
    ]
  },
  3: { // Curriculum Design
    color: "#10b981",
    icon: "📐",
    modules: [
      {
        id: "m7", title: "Principles of Curriculum Design",
        videos: [
          { id: "v18", title: "What is Curriculum? Types & Models", ytId: "sXpPDcBMBzs", duration: "20:00" },
          { id: "v19", title: "Bloom's Taxonomy Explained", ytId: "ayefSTAnCR8", duration: "16:45" },
          { id: "v20", title: "Backward Design — Understanding by Design", ytId: "d8F1SnWaIfE", duration: "18:30" },
        ],
        notes: `## Principles of Curriculum Design\n\n**Types of Curriculum:**\n- **Formal/Explicit**: planned, written syllabus\n- **Hidden**: unwritten social norms taught\n- **Null**: what is NOT taught\n- **Extracurricular**: beyond formal classes\n\n**Bloom's Taxonomy (Revised):**\n1. Remember (recall facts)\n2. Understand (explain ideas)\n3. Apply (use in new situations)\n4. Analyze (draw connections)\n5. Evaluate (justify decisions)\n6. Create (produce new work)\n\n**Backward Design (Wiggins & McTighe):**\n1. Identify desired results (What should students know?)\n2. Determine acceptable evidence (How will you know?)\n3. Plan learning experiences (How will you teach it?)\n\n**Key Curriculum Models:**\n- Tyler's Rational Model\n- Spiral Curriculum (Bruner)\n- Integrated/Thematic Model`
      },
      {
        id: "m8", title: "Assessment & Evaluation Methods",
        videos: [
          { id: "v21", title: "Formative vs Summative Assessment", ytId: "FuBEpGpnGr0", duration: "14:20" },
          { id: "v22", title: "Portfolio Assessment in Early Childhood", ytId: "U8ORh-l_i9Y", duration: "17:55" },
          { id: "v23", title: "Observation as an Assessment Tool", ytId: "nWXD_bVQ-Ro", duration: "12:10" },
        ],
        notes: `## Assessment & Evaluation Methods\n\n**Formative Assessment (ongoing):**\n- Observations during activities\n- Questioning & discussion\n- Exit tickets / quick checks\n- Peer feedback\n\n**Summative Assessment (end of unit):**\n- Projects & presentations\n- Portfolios\n- Performance tasks\n- Written tests (older children)\n\n**Portfolio Assessment:**\n- Collects work samples over time\n- Shows growth, not just achievement\n- Involves child in self-reflection\n- Contents: drawings, photos, writing samples, teacher notes\n\n**Observation Checklist Items:**\n✅ Can follow 2-step instructions\n✅ Uses scissors with control\n✅ Recognises own name in print\n✅ Takes turns in group play\n✅ Expresses needs verbally`
      },
      {
        id: "m9", title: "Technology Integration in Curriculum",
        videos: [
          { id: "v24", title: "EdTech Tools for Early Childhood", ytId: "bL4KNzBxDSk", duration: "15:40" },
          { id: "v25", title: "SAMR Model for Technology Integration", ytId: "SC5ARwUkVyg", duration: "11:25" },
        ],
        notes: `## Technology Integration in Curriculum\n\n**SAMR Model:**\n- **S**ubstitution: tech replaces traditional tool (digital worksheet)\n- **A**ugmentation: tech with functional improvement (auto-spell check)\n- **M**odification: tech allows significant redesign (collaborative docs)\n- **R**edefinition: tech creates new tasks previously inconceivable (global collaboration)\n\n**Recommended EdTech for Early Childhood:**\n| Tool | Use Case |\n|---|---|\n| Seesaw | Digital portfolios |\n| Kahoot | Interactive quizzes |\n| Book Creator | Digital storytelling |\n| Canva for Edu | Visual projects |\n| Google Classroom | Assignment management |\n\n**Screen Time Guidelines (WHO):**\n- Under 2: no screen time\n- 2–4: max 1 hour/day, with adult supervision\n- Quality over quantity — co-view & discuss`
      },
    ]
  }
};
function CoursesTab({ user }) {
  const [backendCourses, setBackendCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [activeCourseId, setActiveCourseId]   = useState(null);
  const [activeModuleId, setActiveModuleId]   = useState(null);
  const [activeVideoId,  setActiveVideoId]    = useState(null);
  const [activeTab,      setActiveTab]        = useState("video");
  const [completed, setCompleted] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("spaceece_completed") || "[]")); }
    catch { return new Set(); }
  });

  const saveCompleted = (newSet) => {
    setCompleted(newSet);
    localStorage.setItem("spaceece_completed", JSON.stringify([...newSet]));
  };

  const markDone = (courseId, moduleId, videoId) => {
    const key = `${courseId}-${moduleId}-${videoId}`;
    const next = new Set(completed);
    next.add(key);
    saveCompleted(next);
  };

  const isVideoDone = (courseId, moduleId, videoId) => completed.has(`${courseId}-${moduleId}-${videoId}`);

  // ── Extract YouTube ID from URL ──
  const getYtId = (url) => {
    if (!url) return "";
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    return m ? m[1] : "";
  };

  // ── Color & icon assignment based on course ID ──
  const COURSE_COLORS = ["#f59e0b", "#8b5cf6", "#14b8a6", "#3b82f6", "#ec4899", "#ef4444", "#06b6d4", "#84cc16"];
  const COURSE_ICONS  = ["👩\u200D🏫", "🧠", "📐", "📚", "🎨", "🔬", "📋", "🎭"];
  const simpleHash = (str) => { let h = 0; for (let i = 0; i < String(str).length; i++) { h = ((h << 5) - h) + String(str).charCodeAt(i); h |= 0; } return Math.abs(h); };

  // ── Fetch courses from DB ──
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch("/api/courses");
        if (res.ok) {
          const data = await res.json();
          const mapped = (Array.isArray(data) ? data : []).map(c => ({
            ...c,
            id: c._id || c.id,
            title: c.title || c.name || "Untitled Course",
            nextSession: c.startDate || c.nextSession || "TBD",
            status: c.status || "active"
          }));
          setBackendCourses(mapped);
        }
      } catch (err) { console.error("Error fetching courses:", err); }
      finally { setCoursesLoading(false); }
    };
    fetchCourses();
  }, []);

  // ── Build dynamic course content from DB data ──
  const dynamicContent = {};
  backendCourses.forEach(c => {
    const hasContents = c.modules && c.modules.length > 0 && c.modules.some(m => m.contents && m.contents.length > 0);
    if (hasContents) {
      const h = simpleHash(c.id);
      dynamicContent[c.id] = {
        color: COURSE_COLORS[h % COURSE_COLORS.length],
        icon: COURSE_ICONS[h % COURSE_ICONS.length],
        modules: c.modules.map(m => ({
          id: m._id || String(m.order) || m.title,
          title: m.title,
          notes: m.detailedNotes || m.description || "",
          videos: (m.contents || []).map(v => ({
            id: v._id || String(v.order) || v.title,
            title: v.title || "Untitled Video",
            ytId: getYtId(v.externalUrl || v.contentLink || ""),
            duration: v.suggestedDuration || (v.durationMinutes ? `${v.durationMinutes} min` : "—")
          }))
        }))
      };
    }
  });

  // ── Merge: DB content priority, fallback to hardcoded COURSE_CONTENT ──
  const allCourseContent = { ...COURSE_CONTENT, ...dynamicContent };

  // ── Course list: DB courses first, mock fallback if empty ──
  const coursesList = backendCourses.length > 0 ? backendCourses : MOCK_COURSES;

  // ── Progress calculations ──
  const getCourseProgress = (courseId) => {
    const content = allCourseContent[courseId];
    if (!content) return 0;
    const allVideos = content.modules.flatMap(m => m.videos.map(v => `${courseId}-${m.id}-${v.id}`));
    if (allVideos.length === 0) return 0;
    return Math.round((allVideos.filter(k => completed.has(k)).length / allVideos.length) * 100);
  };

  const getModuleProgress = (courseId, module) => {
    const allKeys = module.videos.map(v => `${courseId}-${module.id}-${v.id}`);
    const done = allKeys.filter(k => completed.has(k)).length;
    return { done, total: allKeys.length };
  };

  // ══════════════════════════════════════
  //  COURSE LIST VIEW
  // ══════════════════════════════════════
  if (!activeCourseId) {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <h1 style={S.pageTitle}>My Courses</h1>
        <p style={S.pageSub}>Your enrolled courses and learning progress</p>
        {coursesLoading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 14, fontWeight: "600" }}>Loading courses from server...</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {coursesList.map((c) => {
              const content = allCourseContent[c.id];
              const hasVideoContent = !!content;
              const videoProgress = hasVideoContent ? getCourseProgress(c.id) : 0;
              const totalVids = content ? content.modules.reduce((a,m)=>a+m.videos.length,0) : 0;
              const doneVids = content ? content.modules.reduce((a,m)=>a+m.videos.filter(v=>isVideoDone(c.id,m.id,v.id)).length,0) : 0;
              const displayProgress = hasVideoContent ? videoProgress : (c.progress || 0);
              const displayColor = content?.color || "#f59e0b";
              const displayIcon = content?.icon || "📚";
              const totalMods = content ? content.modules.length : (c.modules ? c.modules.length : 0);
              return (
                <div key={c.id} style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderLeft: `4px solid ${displayColor}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ fontSize: 36 }}>{displayIcon}</div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>{c.title}</h3>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <StatusBadge status={c.status || "active"}/>
                          {c.nextSession && <span style={{ fontSize: 11, color: "#9ca3af" }}>📅 Next: {c.nextSession}</span>}
                          {hasVideoContent && <span style={{ fontSize: 11, color: "#6b7280" }}>🎬 {doneVids}/{totalVids} videos</span>}
                          {c.level && <span style={{ fontSize: 11, color: "#6b7280" }}>📊 {c.level}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: displayColor }}>{displayProgress}%</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>Complete</div>
                    </div>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${displayProgress}%`, background: `linear-gradient(90deg,${displayColor},${displayColor})`, borderRadius: 4, transition: "width 0.8s ease" }}/>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{hasVideoContent ? `📖 ${content?.modules?.length || 0} modules · ${doneVids}/${totalVids} videos done` : `📖 ${totalMods} modules`}</span>
                    {hasVideoContent ? (
                      <button onClick={() => { setActiveCourseId(c.id); const fm = allCourseContent[c.id]?.modules[0]; setActiveModuleId(fm?.id || null); setActiveVideoId(fm?.videos[0]?.id || null); setActiveTab("video"); }} style={{ ...S.primaryBtn, padding: "8px 20px", fontSize: 12, background: `linear-gradient(135deg,${displayColor},${displayColor})` }}>
                        {displayProgress > 0 ? "Continue →" : "Start Course →"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Course content coming soon</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════
  //  COURSE DETAIL / VIDEO PLAYER VIEW
  // ══════════════════════════════════════
  const course = coursesList.find(c => c.id === activeCourseId);
  const courseContent = allCourseContent[activeCourseId];
  const activeModule = courseContent?.modules.find(m => m.id === activeModuleId);
  const activeVideo = activeModule?.videos.find(v => v.id === activeVideoId);
  const overallProg = getCourseProgress(activeCourseId);

  if (!courseContent) {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setActiveCourseId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#374151" }}>← Back</button>
          <h1 style={{ ...S.pageTitle, margin: 0 }}>{course?.title || "Course"}</h1>
        </div>
        <div style={{ background: "white", borderRadius: 16, padding: 60, textAlign: "center", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📺</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>No video content available for this course yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setActiveCourseId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#374151" }}>← Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...S.pageTitle, margin: 0 }}>{courseContent.icon} {course?.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", maxWidth: 300 }}>
              <div style={{ height: "100%", width: `${overallProg}%`, background: `linear-gradient(90deg,${courseContent.color},${courseContent.color})`, borderRadius: 4, transition: "width 0.6s" }}/>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: courseContent.color }}>{overallProg}% complete</span>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* ── Left Sidebar: Modules & Videos ── */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "14px 16px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>Course Content</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{courseContent.modules.length} modules</div>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 600 }}>
            {courseContent.modules.map((mod) => {
              const mp = getModuleProgress(activeCourseId, mod);
              const isModActive = mod.id === activeModuleId;
              return (
                <div key={mod.id}>
                  <div onClick={() => { setActiveModuleId(mod.id); setActiveVideoId(mod.videos[0]?.id); setActiveTab("video"); }} style={{ padding: "12px 16px", background: isModActive ? "#fffbeb" : "white", borderBottom: "1px solid #f9fafb", cursor: "pointer", borderLeft: `3px solid ${isModActive ? courseContent.color : "transparent"}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isModActive ? "#92400e" : "#374151" }}>{mod.title}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>
                      {mp.done}/{mp.total} videos
                      <span style={{ marginLeft: 6, background: mp.done===mp.total?"#d1fae5":"#f3f4f6", color: mp.done===mp.total?"#065f46":"#9ca3af", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                        {mp.done===mp.total?"Done":`${Math.round((mp.done/mp.total)*100)}%`}
                      </span>
                    </div>
                  </div>
                  {isModActive && mod.videos.map((vid) => {
                    const isActive = vid.id === activeVideoId;
                    const done = isVideoDone(activeCourseId, mod.id, vid.id);
                    return (
                      <div key={vid.id} onClick={() => { setActiveVideoId(vid.id); setActiveTab("video"); }} style={{ padding: "9px 16px 9px 28px", background: isActive ? "#fef3c7" : "#fafafa", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#10b981" : isActive ? courseContent.color : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", flexShrink: 0 }}>{done ? "✓" : isActive ? "▶" : ""}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: isActive?700:500, color: isActive?"#92400e":"#374151", lineHeight: 1.3 }}>{vid.title}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>⏱ {vid.duration}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Video Player / Notes ── */}
        <div>
          {activeVideo ? (
            <>
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 16 }}>
                <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
                  {["video","notes"].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: "12px", border: "none", background: activeTab===t?"#fffbeb":"white", color: activeTab===t?"#92400e":"#6b7280", fontWeight: activeTab===t?800:600, fontSize: 13, cursor: "pointer", borderBottom: `2px solid ${activeTab===t?courseContent.color:"transparent"}`, transition: "all 0.15s" }}>
                      {t === "video" ? "🎬 Video Lesson" : "📝 Notes"}
                    </button>
                  ))}
                </div>
                {activeTab === "video" ? (
                  <div>
                    {activeVideo.ytId ? (
                      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, background: "#000" }}>
                        <iframe src={`https://www.youtube.com/embed/${activeVideo.ytId}?rel=0&modestbranding=1`} title={activeVideo.title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                      </div>
                    ) : (
                      <div style={{ padding: 40, textAlign: "center", background: "#f9fafb" }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Video not available via YouTube embed</div>
                        <a href={activeVideo.ytId ? `https://www.youtube.com/watch?v=${activeVideo.ytId}` : "#"} target="_blank" rel="noopener noreferrer" style={{ color: courseContent.color, fontWeight: 700, fontSize: 13 }}>Open external link →</a>
                      </div>
                    )}
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{activeVideo.title}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>{activeModule?.title} · ⏱ {activeVideo.duration}</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {isVideoDone(activeCourseId, activeModuleId, activeVideoId) ? (
                          <span style={{ background: "#d1fae5", color: "#065f46", padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800 }}>✓ Completed</span>
                        ) : (
                          <button onClick={() => markDone(activeCourseId, activeModuleId, activeVideoId)} style={{ ...S.primaryBtn, background: `linear-gradient(135deg,${courseContent.color},${courseContent.color})`, fontSize: 13 }}>✅ Mark as Complete</button>
                        )}
                        <button onClick={() => setActiveTab("notes")} style={{ ...S.exportBtn, fontSize: 12 }}>📝 View Notes</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "20px 24px", maxHeight: 520, overflowY: "auto" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 12 }}>📝 Notes — {activeModule?.title}</div>
                    {activeModule?.notes ? (
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line", fontFamily: "inherit" }}>
                        {activeModule.notes.split('\n').map((line, i) => {
                          if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", margin: "16px 0 8px" }}>{line.replace('## ','')}</h3>;
                          if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 700, color: "#374151", margin: "8px 0 4px" }}>{line.replace(/\*\*/g,'')}</div>;
                          if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: 16, margin: "3px 0", color: "#4b5563" }}>• {line.slice(2)}</div>;
                          if (line.match(/^\d+\./)) return <div key={i} style={{ paddingLeft: 16, margin: "3px 0", color: "#4b5563" }}>{line}</div>;
                          if (line.startsWith('✅')) return <div key={i} style={{ paddingLeft: 16, margin: "3px 0", color: "#059669", fontWeight: 600 }}>{line}</div>;
                          if (line.startsWith('|')) return <div key={i} style={{ fontFamily: "monospace", fontSize: 12, background: "#f8fafc", padding: "3px 8px", margin: "1px 0" }}>{line}</div>;
                          if (line === '') return <div key={i} style={{ height: 6 }}/>;
                          return <div key={i} style={{ margin: "3px 0" }}>{line}</div>;
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: 20 }}>No notes available for this module.</div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{(() => { const av = courseContent.modules.flatMap(m => m.videos.map(v => ({ ...v, moduleId: m.id }))); const idx = av.findIndex(v => v.id === activeVideoId); return `Video ${idx+1} of ${av.length}`; })()}</div>
                <button onClick={() => { const av = courseContent.modules.flatMap(m => m.videos.map(v => ({ ...v, moduleId: m.id }))); const idx = av.findIndex(v => v.id === activeVideoId); if (idx < av.length - 1) { markDone(activeCourseId, activeModuleId, activeVideoId); const next = av[idx + 1]; setActiveModuleId(next.moduleId); setActiveVideoId(next.id); setActiveTab("video"); }}} style={{ ...S.primaryBtn, fontSize: 12, background: `linear-gradient(135deg,${courseContent.color},${courseContent.color})` }}>Next Video →</button>
              </div>
            </>
          ) : (
            <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 14, color: "#6b7280" }}>Select a video from the left to start learning</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function ScheduleTab({ user }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>My Schedule</h1>
      <p style={S.pageSub}>Subject: {user.subject} · {user.classes||6} classes today</p>
      <SectionCard title="📅 Today's Timetable">
        {MOCK_SCHEDULE.map((cl,i)=>{
          const bg = { completed: "#f0fdf4", ongoing: "#fffbeb", upcoming: "white" };
          const dot= { completed: "#10b981", ongoing: "#f59e0b", upcoming: "#d1d5db" };
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: bg[cl.status], borderRadius: 10, marginBottom: 8, border: "1px solid #f3f4f6" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot[cl.status], flexShrink: 0 }}/>
              <div style={{ width: 90, fontSize: 13, fontWeight: 800, color: "#d97706", flexShrink: 0 }}>{cl.time}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{cl.class}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>📖 {cl.topic}</div>
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>🚪 Room {cl.room}</div>
              <StatusBadge status={cl.status}/>
            </div>
          );
        })}
      </SectionCard>
    </div>
  );
}

function GradesTab() {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Grades Overview</h1>
      <p style={S.pageSub}>Student performance across all classes</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {MOCK_GRADES.map((g,i)=>(
          <div key={i} style={{ background: "white", borderRadius: 16, padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderTop: `3px solid ${g.avg>=85?"#10b981":g.avg>=75?"#f59e0b":"#ef4444"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917" }}>{g.class}</div>
              <Badge children={`${g.students} students`} color="#d97706" bg="#fef3c7"/>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#f59e0b", letterSpacing: "-1px", marginBottom: 8 }}>{g.avg}%</div>
            <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: `${g.avg}%`, borderRadius: 4, background: g.avg>=85?"#10b981":g.avg>=75?"#f59e0b":"#ef4444" }}/>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>
              <span>🏆 Highest: <b style={{ color: "#10b981" }}>{g.highest}%</b></span>
              <span>📉 Lowest: <b style={{ color: "#ef4444" }}>{g.lowest}%</b></span>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>📝 Assignments: {g.completed}/{g.assignments} submitted</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignmentsTab() {
  const [uploadModal, setUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(2) + " MB" });
    }
  };

  const handleCloseModal = () => { setUploadModal(false); setSelectedFile(null); };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>My Assignments</h1>
          <p style={S.pageSub}>{MOCK_ASSIGNMENTS.filter(a=>a.status==="pending").length} pending · {MOCK_ASSIGNMENTS.filter(a=>a.status==="revision").length} needs revision</p>
        </div>
        <button onClick={()=>setUploadModal(true)} style={S.primaryBtn}>+ Submit Assignment</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {MOCK_ASSIGNMENTS.map(a=>(
          <div key={a.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", borderLeft: `4px solid ${a.status==="approved"?"#10b981":a.status==="revision"?"#ef4444":"#f59e0b"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 24 }}>{a.status==="approved"?"✅":a.status==="revision"?"🔁":"📝"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{a.title}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{a.course} · Due: {a.due}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {a.score && <span style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>{a.score}/100</span>}
                <StatusBadge status={a.status}/>
                {(a.status==="revision"||a.status==="pending") &&
                  <button onClick={()=>setUploadModal(true)} style={{ ...S.primaryBtn, padding: "6px 12px", fontSize: 12 }}>{a.status==="revision"?"Resubmit":"Submit"}</button>
                }
              </div>
            </div>
            {a.status==="revision" && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, fontSize: 12, color: "#991b1b" }}>⚠️ Revision required — please review admin feedback and resubmit.</div>
            )}
          </div>
        ))}
      </div>

      {uploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "28px", width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1c1917", margin: 0 }}>Submit Assignment</h3>
              <button onClick={handleCloseModal} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            <label style={S.label}>Assignment Title</label>
            <input style={{ ...S.input, marginBottom: 12 }} placeholder="Enter assignment title"/>
            <label style={S.label}>Upload File</label>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.ppt,.pptx" style={{ display: "none" }}/>
            <div onClick={()=>fileInputRef.current?.click()} style={{ border: "2px dashed #fbbf24", borderRadius: 12, padding: "24px", textAlign: "center", marginBottom: 16, background: "#fffbeb", cursor: "pointer" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
              {selectedFile ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>📄 File Added Successfully!</div>
                  <div style={{ fontSize: 12, color: "#374151", marginTop: 4, fontWeight: 600, wordBreak: "break-all" }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Size: {selectedFile.size}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>Click to add from your device</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>PDF, DOCX, PPT up to 10MB</div>
                </>
              )}
            </div>
            <label style={S.label}>Notes (Optional)</label>
            <textarea style={{ ...S.input, height: 70, resize: "none", marginBottom: 20 }} placeholder="Any notes for the reviewer..."/>
            <button onClick={handleCloseModal} style={{ ...S.primaryBtn, width: "100%" }}>📤 Submit Assignment</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificatesTab() {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>My Certificates</h1>
      <p style={S.pageSub}>{MOCK_CERTIFICATES.length} certificates earned</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
        {MOCK_CERTIFICATES.map((c,i)=>(
          <div key={i} style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", borderRadius: 20, padding: "28px 24px", border: "2px solid #fbbf24", position: "relative", overflow: "hidden", boxShadow: "0 4px 20px rgba(245,158,11,0.15)" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "#fbbf24", opacity: 0.15 }}/>
            <div style={{ position: "absolute", bottom: -30, left: -20, width: 100, height: 100, borderRadius: "50%", background: "#f59e0b", opacity: 0.1 }}/>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 8, lineHeight: 1.4 }}>{c.title}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Badge children={`Grade: ${c.grade}`} color="#059669" bg="#d1fae5"/>
              <Badge children={c.issued} color="#d97706" bg="#fef3c7"/>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>🔑 Credential ID: <span style={{ fontWeight: 700, color: "#374151" }}>{c.credentialId}</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.primaryBtn, flex: 1, textAlign: "center" }}>⬇ Download PDF</button>
              <button style={{ ...S.exportBtn, flex: 1, textAlign: "center" }}>🔗 Share</button>
            </div>
          </div>
        ))}
        <div style={{ background: "#f9fafb", borderRadius: 20, padding: "28px 24px", border: "2px dashed #e5e7eb", opacity: 0.7 }}>
          <div style={{ fontSize: 40, marginBottom: 12, filter: "grayscale(1)" }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#9ca3af", marginBottom: 8 }}>Curriculum Design Certificate</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>Complete the course to unlock this certificate</div>
          <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "45%", background: "#d1d5db", borderRadius: 4 }}/>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>45% complete</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PROFILE TAB  (with editable Working Center)
───────────────────────────────────────── */
function ProfileTab({ user, onWorkingCenterChange }) {
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name:          user.name          || "Bhavarth Surgude",
    phone:         user.phone         || "+91 98765 43210",
    address:       user.address       || "Pune, Maharashtra, India",
    workingCenter: user.workingCenter || "Dhayri, Pune, Maharashtra",
    subject:       user.subject       || "Computer Applications",
    degree:        "M.Sc. Computer Applications",
    university:    "University of Pune",
    netStatus:     "UGC NET Qualified",
    netDesc:       "Assistant Professor Eligibility",
    expYears:      "3+ Years Active",
    expBio:        "Senior Pre-Primary Core Instructor & Curriculum Designer specializing in childhood developmental tracking logic and technology-based pedagogy framework."
  });

  const [savedForm, setSavedForm] = useState({ ...form });

  const handleSave = () => {
    setSavedForm({ ...form });
    onWorkingCenterChange && onWorkingCenterChange(form.workingCenter);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({ ...savedForm });
    setEditing(false);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <h1 style={S.pageTitle}>My Profile</h1>
          <p style={S.pageSub}>Your account information and settings</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editing && (
            <button onClick={handleCancel} style={S.exportBtn}>✕ Cancel</button>
          )}
          <button
            onClick={editing ? handleSave : () => setEditing(true)}
            style={editing ? { ...S.primaryBtn, background: "linear-gradient(135deg,#10b981,#059669)" } : S.primaryBtn}
          >
            {editing ? "💾 Save Changes" : "✏️ Edit Profile"}
          </button>
        </div>
      </div>

      {/* Basic info card */}
      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white" }}>
            {form.name?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <input style={{ ...S.input, padding: "6px 10px", fontSize: 16, fontWeight: 700, width: "80%" }} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
            ) : (
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>{form.name}</h2>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <Badge children={`${form.subject} Teacher`} color="#1d4ed8" bg="#dbeafe"/>
              <Badge children={user.batch || "SpacECE"} color="#d97706" bg="#fef3c7"/>
            </div>
          </div>
        </div>

        {/* 2-column info fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { icon: "📧", label: "Email",      val: user.email,         key: "email",   editable: false },
            { icon: "📱", label: "Phone",      val: form.phone,         key: "phone",   editable: true  },
            { icon: "📍", label: "Address",    val: form.address,       key: "address", editable: true  },
            { icon: "📅", label: "Joined",     val: user.joined,        key: "joined",  editable: false },
            { icon: "📚", label: "Subject",    val: form.subject,       key: "subject", editable: true  },
            { icon: "📊", label: "Attendance", val: `${user.attendance||90}%`, key: "", editable: false },
          ].map((r,i)=>(
            <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", border: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{r.label}</div>
              {editing && r.editable ? (
                <input style={{ ...S.input, padding: "5px 8px", fontSize: 12, background: "white" }} value={r.val} onChange={e=>setForm({...form,[r.key]:e.target.value})}/>
              ) : (
                <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{r.icon} {r.val}</div>
              )}
            </div>
          ))}
        </div>

        {/* Working Center — full-width, always visible, editable when editing */}
        <div style={{ marginTop: 12, background: editing ? "#fffbeb" : "#f9fafb", borderRadius: 10, padding: "12px 14px", border: `1px solid ${editing ? "#fbbf24" : "#f3f4f6"}`, transition: "background 0.2s, border-color 0.2s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Working Center</div>
            {editing && (
              <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", fontWeight: 700, borderRadius: 20, padding: "1px 8px", border: "1px solid #fbbf24" }}>Editable</span>
            )}
          </div>
          {editing ? (
            <input
              style={{ ...S.input, padding: "7px 10px", fontSize: 13, background: "white", width: "100%", boxSizing: "border-box" }}
              value={form.workingCenter}
              onChange={e => setForm({ ...form, workingCenter: e.target.value })}
              placeholder="e.g. Dhayri, Pune, Maharashtra"
            />
          ) : (
            <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>📍 {form.workingCenter}</div>
          )}
        </div>
      </div>

      {/* Portfolio & Qualifications */}
      <div style={{ background: "white", borderRadius: 20, padding: "24px 28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>🎓 Portfolio & Qualifications</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>📜</span>
              <Badge children="Highest Degree" color="#1e40af" bg="#dbeafe"/>
            </div>
            {editing ? (
              <>
                <input style={{ ...S.input, padding: "4px 8px", fontSize: 12, background: "white", marginBottom: 4 }} value={form.degree} onChange={e=>setForm({...form,degree:e.target.value})}/>
                <input style={{ ...S.input, padding: "4px 8px", fontSize: 11, background: "white" }} value={form.university} onChange={e=>setForm({...form,university:e.target.value})}/>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginTop: 8 }}>{form.degree}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{form.university}</div>
              </>
            )}
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <Badge children="National Level" color="#065f46" bg="#d1fae5"/>
            </div>
            {editing ? (
              <>
                <input style={{ ...S.input, padding: "4px 8px", fontSize: 12, background: "white", marginBottom: 4 }} value={form.netStatus} onChange={e=>setForm({...form,netStatus:e.target.value})}/>
                <input style={{ ...S.input, padding: "4px 8px", fontSize: 11, background: "white" }} value={form.netDesc} onChange={e=>setForm({...form,netDesc:e.target.value})}/>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginTop: 8 }}>{form.netStatus}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{form.netDesc}</div>
              </>
            )}
          </div>
        </div>

        <div style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: "14px 16px", background: "#fffbeb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>💼</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Professional Work Experience</div>
            </div>
            {editing ? (
              <input style={{ ...S.input, padding: "3px 6px", fontSize: 11, background: "white", width: 100, textAlign: "right" }} value={form.expYears} onChange={e=>setForm({...form,expYears:e.target.value})}/>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309" }}>{form.expYears}</span>
            )}
          </div>
          {editing ? (
            <textarea style={{ ...S.input, height: 60, fontSize: 12, background: "white", resize: "none", lineHeight: 1.4 }} value={form.expBio} onChange={e=>setForm({...form,expBio:e.target.value})}/>
          ) : (
            <div style={{ marginTop: 6, fontSize: 13, color: "#374151", fontWeight: 600, lineHeight: 1.5 }}>{form.expBio}</div>
          )}
        </div>

        {editing && (
          <button onClick={handleSave} style={{ ...S.primaryBtn, width: "100%", marginTop: 16, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
            💾 Save Portfolio Details
          </button>
        )}
      </div>

      {/* Change Password */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 14px" }}>🔒 Change Password</h3>
        {["Current Password","New Password","Confirm New Password"].map((label,i)=>(
          <div key={i} style={{ marginBottom: 12 }}>
            <label style={S.label}>{label}</label>
            <input style={S.input} type="password" placeholder="••••••••"/>
          </div>
        ))}
        <button style={{ ...S.primaryBtn, marginTop: 4 }}>Update Password</button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const icons = { session: "📹", assignment: "📝", approval: "✅", certificate: "🏆", course: "📚" };
  const markAll = () => setNotifications(prev=>prev.map(n=>({...n,read:true})));

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Notifications</h1>
          <p style={S.pageSub}>{notifications.filter(n=>!n.read).length} unread</p>
        </div>
        <button onClick={markAll} style={S.exportBtn}>✓ Mark all read</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map(n=>(
          <div key={n.id} onClick={()=>setNotifications(prev=>prev.map(p=>p.id===n.id?{...p,read:true}:p))} style={{ background: n.read?"white":"#fffbeb", borderRadius: 14, padding: "14px 18px", border: `1px solid ${n.read?"#f1f5f9":"#fbbf24"}`, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", borderLeft: `4px solid ${n.read?"#e5e7eb":"#f59e0b"}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: n.read?"#f3f4f6":"#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icons[n.type]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: n.read?500:700, color: "#1c1917" }}>{n.msg}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{n.time}</div>
            </div>
            {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN TEACHER DASHBOARD
═══════════════════════════════════════════ */
export default function TeacherDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab]         = useState("overview");
  const [toast, setToast]                 = useState({ msg: "", type: "" });
  // workingCenter lives here so OverviewTab reflects changes saved in ProfileTab
  const [workingCenter, setWorkingCenter] = useState(user.workingCenter || "Dhayri, Pune, Maharashtra");

  const unreadCount = MOCK_NOTIFICATIONS.filter(n=>!n.read).length;

  const navItems = [
    { key: "overview",      label: "Teacher's Dashboard", icon: "📊" },
    { key: "children_att",  label: "Daily Attendance",    icon: "📋" },
    { key: "geotag",        label: "Geotag Attendance",   icon: "📍" },
    { key: "training",      label: "Training & Lessons",  icon: "🎓" },
    { key: "courses",       label: "My Courses",          icon: "📚" },
    { key: "assessment",    label: "Assessments",         icon: "📝" },
    { key: "schedule",      label: "Schedule",            icon: "📅" },
    { key: "grades",        label: "Grades",              icon: "📊" },
    { key: "assignments",   label: "Assignments",         icon: "✏️", badge: MOCK_ASSIGNMENTS.filter(a=>a.status==="pending"||a.status==="revision").length },
    { key: "certificates",  label: "Certificates",        icon: "🏆" },
    { key: "notifications", label: "Notifications",       icon: "🔔", badge: unreadCount },
    { key: "profile",       label: "My Profile",          icon: "👤" },
  ];

  // Pass live workingCenter to every child
  const enrichedUser = { ...user, workingCenter };

  const renderContent = () => {
    switch(activeTab) {
      case "overview":      return <OverviewTab user={enrichedUser} setActiveTab={setActiveTab}/>;
      case "children_att":  return <AttendanceManager user={enrichedUser}/>;
      case "geotag":        return <GeotagAttendance user={enrichedUser}/>;
      case "training":      return <TrainingAndClassroomManager user={enrichedUser}/>;
      case "courses":       return <CoursesTab user={enrichedUser}/>
      case "assessment":    return <ProctoredAssessment user={enrichedUser}/>;
      case "schedule":      return <ScheduleTab user={enrichedUser}/>;
      case "grades":        return <GradesTab/>;
      case "assignments":   return <AssignmentsTab/>;
      case "certificates":  return <CertificatesTab/>;
      case "notifications": return <NotificationsTab/>;
      case "profile":       return <ProfileTab user={enrichedUser} onWorkingCenterChange={setWorkingCenter}/>;
      default:              return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI','Inter',-apple-system,sans-serif" }}>
      <style>{globalCSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({msg:"",type:""})}/>

      {/* Sidebar */}
      <div style={{ width: 240, background: "white", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 12px rgba(0,0,0,0.04)", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <Logo size={120}/>
          <div style={{ textAlign: "center", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", margin: "6px auto 0", display: "inline-block", width: "fit-content" }}>
            🎓 Teacher Panel
          </div>
        </div>
        <nav style={{ padding: "4px 10px", flex: 1 }}>
          {navItems.map(item=>(
            <button key={item.key} onClick={()=>setActiveTab(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "none", borderRadius: 10, background: activeTab===item.key?"#dbeafe":"transparent", color: activeTab===item.key?"#1e40af":"#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 2, transition: "all 0.18s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge>0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "1px 7px" }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>{user.name?.[0]}</div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{user.name?.split(" ")[0]}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.subject}</div>
          </div>
          <button onClick={onLogout} title="Sign Out" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 4 }}>⏻</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, width: "0px", minWidth: "0px", padding: "28px 32px", overflowY: "auto", maxHeight: "100vh" }}>
        {renderContent()}
      </div>
    </div>
  );
}