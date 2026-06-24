import { useState } from "react";

/* ─── Colour tokens pulled from the Teacher Dashboard theme ─── */
const AMBER   = "#f59e0b";
const AMBER_L = "#fef3c7";
const AMBER_D = "#92400e";
const GREEN   = "#10b981";
const GREEN_L = "#d1fae5";
const BLUE    = "#3b82f6";
const BLUE_L  = "#dbeafe";
const PURPLE  = "#8b5cf6";
const PURPLE_L= "#ede9fe";
const RED     = "#ef4444";
const RED_L   = "#fee2e2";
const CYAN    = "#06b6d4";
const CYAN_L  = "#cffafe";

/* ─── Guide data — one section per Teacher Dashboard tab ─── */
const SECTIONS = [
  {
    id: "overview",
    icon: "📊",
    label: "Teacher's Dashboard",
    color: AMBER,
    bg: AMBER_L,
    description: "Your home screen. A quick snapshot of your class, students, attendance, grades and pending work.",
    features: [
      {
        title: "Hero Banner",
        desc: "Greets you by name with your subject, class and today's date. This updates automatically every day.",
        example: "\"Good morning, Dr. Bhavesh! Maths – No class assigned – Wednesday, 24 June\" tells you instantly if a class still needs to be assigned to you.",
        badge: "Live",
      },
      {
        title: "Working Center",
        desc: "Shows the learning center you're currently attached to, right below the banner.",
        example: "If it shows the wrong center, contact your admin to update your profile assignment.",
        badge: "Info",
      },
      {
        title: "Stat Cards (CL · ST · AT · GR · CE · TK)",
        desc: "Six tiles: My Class, Total Students, Attendance %, Avg Grade, Certificates earned, and Pending Tasks.",
        example: "\"AT 0%\" with red accent means no attendance has been marked yet today — head to Daily Attendance to fix that.",
        badge: "Auto-refresh",
      },
      {
        title: "My Attendance Summary",
        desc: "A simple bar chart of your class's attendance rate. Bar color changes from green to amber to red as attendance drops.",
        example: "A red bar at 40% is a signal to follow up with absent students' parents.",
        badge: "Chart",
      },
      {
        title: "Course Progress",
        desc: "Lists up to 3 of your assigned courses with a progress bar each. Click 'View all courses' to see the rest.",
        example: "\"No assigned courses yet\" means your admin hasn't enrolled you in training yet — check back later or ask your center head.",
        badge: "Progress",
      },
    ],
  },
  {
    id: "children_att",
    icon: "📋",
    label: "Daily Attendance",
    color: GREEN,
    bg: GREEN_L,
    description: "Mark and review your students' attendance for each school day.",
    features: [
      {
        title: "Mark Attendance",
        desc: "Pick today's date (or any past date) and mark every student Present, Absent, or Late. Use 'Mark All Present' to save time.",
        example: "Wednesday class of 18 → Mark All Present → manually flip 2 names to Absent → Save. Done in under a minute.",
        badge: "Record",
      },
      {
        title: "Attendance History",
        desc: "Scroll back through previous days to see who was marked present/absent, useful when a parent disputes a record.",
        example: "Parent says child attended Monday — open History → 18 June → confirm the record before replying.",
        badge: "History",
      },
      {
        title: "Class Attendance %",
        desc: "A running percentage for your whole class is calculated automatically and feeds the AT stat card on your dashboard.",
        example: "Attendance dipping below 70% triggers the amber/red warning color on your Overview tab.",
        badge: "Auto-calc",
      },
    ],
  },
  {
    id: "geotag",
    icon: "📍",
    label: "Geotag Attendance",
    color: BLUE,
    bg: BLUE_L,
    description: "Confirm your own attendance by checking in with your device's location, proving you're physically at the center.",
    features: [
      {
        title: "Check-In",
        desc: "Tap 'Check In' and allow location access. Your GPS coordinates and timestamp are recorded against today's date.",
        example: "Arrive at the Pune center at 8:55 AM → tap Check-In → location pin confirms you're within range → marked Present.",
        badge: "Action",
      },
      {
        title: "Location Validation",
        desc: "The system compares your coordinates to the center's registered address. If you're too far away, check-in is flagged.",
        example: "Trying to check in from home shows a warning — you'll need to be on-site at the center to confirm attendance.",
        badge: "Validation",
      },
      {
        title: "Check-In History",
        desc: "View your past check-in records with date, time and map location for each day.",
        example: "Useful for resolving a payroll query about which days you physically reported to the center.",
        badge: "History",
      },
    ],
  },
  {
    id: "training",
    icon: "🎓",
    label: "Training & Lessons",
    color: PURPLE,
    bg: PURPLE_L,
    description: "Access your assigned training modules and classroom lesson plans in one place.",
    features: [
      {
        title: "Training Modules",
        desc: "Lists training content assigned to you (videos, reading material, quizzes). Click any module to start or resume it.",
        example: "\"Child Psychology Module 2\" shows 60% complete — click to pick up exactly where you left off.",
        badge: "Resume",
      },
      {
        title: "Lesson Plans",
        desc: "Weekly classroom lesson plans created by your admin appear here with daily activities for your class.",
        example: "\"Monsoon Week\" plan shows Monday – Paper boat crafts, Tuesday – Rain song… follow the plan day-by-day in your classroom.",
        badge: "Plan",
      },
      {
        title: "Mark as Complete",
        desc: "Once you finish a training module, mark it complete so it counts toward your Course Progress and Certificates.",
        example: "Completing all modules in a course unlocks a certificate, visible under the Certificates tab.",
        badge: "Progress",
      },
    ],
  },
  {
    id: "courses",
    icon: "📚",
    label: "My Courses",
    color: AMBER,
    bg: AMBER_L,
    description: "All courses assigned to you by the admin, with progress tracking for each.",
    features: [
      {
        title: "Course List",
        desc: "Every course you've been enrolled in appears as a card with a progress bar and status (Not Started / In Progress / Completed).",
        example: "\"Social Emotional Learning – 45%\" → click the card to continue from your last completed lesson.",
        badge: "Track",
      },
      {
        title: "Course Notes",
        desc: "Open a course to view notes, reference material and downloadable resources for that course.",
        example: "Download the PDF handout for 'Child Development Basics' to use during your own classroom prep.",
        badge: "Resources",
      },
      {
        title: "Completion → Certificate",
        desc: "Finishing 100% of a course automatically generates a certificate, visible in the Certificates tab.",
        example: "Hit 100% on 'Early Literacy' → a new certificate appears under Certificates within seconds.",
        badge: "Auto-generate",
      },
    ],
  },
  {
    id: "assessment",
    icon: "📝",
    label: "Assessments",
    color: RED,
    bg: RED_L,
    description: "Take proctored tests and quizzes that are part of your training requirements.",
    features: [
      {
        title: "Start Assessment",
        desc: "Click 'Start' on any assigned assessment. Some assessments are proctored and may request camera access during the test.",
        example: "\"Module 3 Quiz – 20 mins\" → click Start → answer the 15 questions → Submit before the timer runs out.",
        badge: "Timed",
      },
      {
        title: "View Results",
        desc: "After submission, your score and pass/fail status appear instantly (or after grading, for written assessments).",
        example: "Score 18/20 (90%) — Passed. Anything below the pass mark lets you request a retake.",
        badge: "Results",
      },
      {
        title: "Retake Policy",
        desc: "If you don't clear the pass mark, a 'Retake' button appears once the cooldown period configured by admin has passed.",
        example: "Failed with 55%? Wait for the retake window to open, then attempt again with the same module material reviewed first.",
        badge: "Retry",
      },
    ],
  },
  {
    id: "schedule",
    icon: "📅",
    label: "Schedule",
    color: GREEN,
    bg: GREEN_L,
    description: "Your personal calendar of classes, trainings, and important center events.",
    features: [
      {
        title: "Weekly View",
        desc: "See your classes and training sessions laid out by day and time for the current week.",
        example: "Tuesday 10 AM 'Training: Module 4' is blocked on your schedule — plan your classroom coverage around it.",
        badge: "Calendar",
      },
      {
        title: "Upcoming Events",
        desc: "A list of upcoming center events, deadlines, or parent-meeting dates pulled from the admin calendar.",
        example: "\"Parent-Teacher Meeting – 30 June\" appears here a week in advance so you can prepare.",
        badge: "Reminder",
      },
    ],
  },
  {
    id: "grades",
    icon: "📊",
    label: "Grades",
    color: PURPLE,
    bg: PURPLE_L,
    description: "Enter and review grades for your students' assignments and assessments.",
    features: [
      {
        title: "Enter Grades",
        desc: "Select a student and assignment, then enter a score and optional written feedback.",
        example: "Grade Aarav's 'Counting Worksheet' as 9/10 with feedback 'Great job, watch number 7!'",
        badge: "Grade",
      },
      {
        title: "Grade Book",
        desc: "A table view of all your students with their grades across assignments — sort by name or score.",
        example: "Sort by lowest score first to quickly spot students who may need extra support this week.",
        badge: "Table",
      },
      {
        title: "Average Grade",
        desc: "Your class's average score feeds directly into the GR (Avg Grade) stat card on your dashboard Overview.",
        example: "Avg Grade shows 'N/A' until at least one assignment has been graded for the class.",
        badge: "Auto-calc",
      },
    ],
  },
  {
    id: "assignments",
    icon: "✏️",
    label: "Assignments",
    color: AMBER,
    bg: AMBER_L,
    description: "Create, distribute, and track assignments given to your students.",
    features: [
      {
        title: "Create Assignment",
        desc: "Click 'New Assignment', add a title, instructions, and due date, then assign it to your whole class or specific students.",
        example: "\"Shapes Worksheet\" due 28 June, assigned to all 18 students in your class.",
        badge: "Create",
      },
      {
        title: "Track Status",
        desc: "Each assignment shows a status badge: Assigned, Submitted, Revision Needed, or Graded.",
        example: "A red badge count next to 'Assignments' in the sidebar tells you how many are still pending review.",
        badge: "Status",
      },
      {
        title: "Request Revision",
        desc: "If a submission is incomplete, click 'Request Revision' and leave a note — the student/parent is notified.",
        example: "Missing photo attachment → 'Request Revision: please attach a photo of the completed worksheet.'",
        badge: "Action",
      },
    ],
  },
  {
    id: "certificates",
    icon: "🏆",
    label: "Certificates",
    color: CYAN,
    bg: CYAN_L,
    description: "View and download certificates you've earned by completing courses and training.",
    features: [
      {
        title: "Certificate Gallery",
        desc: "Every completed course automatically generates a certificate card here, with the course name and completion date.",
        example: "\"Early Literacy – Completed 12 June\" — click to view or download the certificate as a PDF.",
        badge: "Auto-issued",
      },
      {
        title: "Download / Share",
        desc: "Download any certificate as a PDF to keep for your records or share with the center admin for verification.",
        example: "Download your 'Child Psychology & Development' certificate before a performance review meeting.",
        badge: "Export",
      },
    ],
  },
  {
    id: "notifications",
    icon: "🔔",
    label: "Notifications",
    color: RED,
    bg: RED_L,
    description: "All announcements and alerts sent to you by the admin or system.",
    features: [
      {
        title: "Notification List",
        desc: "Unread notifications show a red dot/badge. Click any notification to read the full message and mark it read.",
        example: "\"Reminder: Mark today's attendance before 5 PM\" — clicking it marks it read and links you to Daily Attendance.",
        badge: "Inbox",
      },
      {
        title: "Unread Counter",
        desc: "The number badge next to 'Notifications' in the sidebar shows how many messages you haven't opened yet.",
        example: "Badge shows '3' → open the tab to clear it down to 0 after reading each one.",
        badge: "Counter",
      },
    ],
  },
  {
    id: "feedback",
    icon: "💬",
    label: "Feedback",
    color: BLUE,
    bg: BLUE_L,
    description: "Share feedback about courses, training, or the platform directly with the admin team.",
    features: [
      {
        title: "Submit Feedback",
        desc: "Write your comments or rating about a course or training session and submit it to the admin team.",
        example: "Rate 'Module 2 Training' 4/5 with the note: 'Great content, would like more video examples.'",
        badge: "Submit",
      },
      {
        title: "Feedback History",
        desc: "View all the feedback you've submitted in the past, along with any admin response.",
        example: "Check whether your last suggestion about scheduling was acknowledged by the admin team.",
        badge: "History",
      },
    ],
  },
  {
    id: "profile",
    icon: "👤",
    label: "My Profile",
    color: GREEN,
    bg: GREEN_L,
    description: "Manage your personal information, profile photo, password, and language preference.",
    features: [
      {
        title: "Edit Profile",
        desc: "Update your name, subject, contact details, or upload a new profile photo.",
        example: "Replace your placeholder initial avatar with a real photo so students and parents recognize you.",
        badge: "Edit",
      },
      {
        title: "Change Password",
        desc: "Enter your current password and a new one to update your login credentials securely.",
        example: "Change your password every few months for better account security.",
        badge: "Security",
      },
      {
        title: "Language Preference",
        desc: "Switch the entire dashboard's display language from the dropdown in your profile settings.",
        example: "Switch to Hindi or Marathi if that's more comfortable for day-to-day use.",
        badge: "Settings",
      },
    ],
  },
];

/* ─── Sub-components ─── */

function BadgeChip({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      color,
      background: bg,
      letterSpacing: "0.3px",
    }}>
      {label}
    </span>
  );
}

function FeatureCard({ feature, color, bg }) {
  return (
    <div style={{
      background: "white",
      border: `1px solid #f1f5f9`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{feature.title}</span>
        <BadgeChip label={feature.badge} color={color} bg={bg} />
      </div>
      <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: "0 0 8px" }}>{feature.desc}</p>
      <div style={{
        background: "#f8fafc",
        borderRadius: 7,
        padding: "8px 12px",
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
        <span style={{ fontSize: 11, color: "#374151", lineHeight: 1.6 }}><strong>Example:</strong> {feature.example}</span>
      </div>
    </div>
  );
}

function SectionPanel({ section, isOpen, onToggle }) {
  return (
    <div style={{
      borderRadius: 14,
      border: `1.5px solid ${isOpen ? section.color : "#f1f5f9"}`,
      marginBottom: 14,
      overflow: "hidden",
      transition: "border-color 0.2s",
      boxShadow: isOpen ? `0 4px 20px ${section.color}18` : "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 18px",
          background: isOpen ? section.bg : "white",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.2s",
          fontFamily: "inherit",
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: section.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
          border: `1.5px solid ${section.color}40`,
        }}>
          {section.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{section.label}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{section.description}</div>
        </div>
        <span style={{ fontSize: 18, color: section.color, flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>
          ▾
        </span>
      </button>

      {/* Expandable content */}
      {isOpen && (
        <div style={{ padding: "0 18px 16px", background: "white" }}>
          <div style={{ height: 1, background: "#f3f4f6", marginBottom: 14 }} />
          {section.features.map((f, i) => (
            <FeatureCard key={i} feature={f} color={section.color} bg={section.bg} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ───
   Props:
   - onBack: function to call to return to the Teacher Dashboard
*/
export default function TeacherUserGuidePage({ onBack }) {
  const [openSection, setOpenSection] = useState("overview");
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? SECTIONS.filter(
        (s) =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()) ||
          s.features.some(
            (f) =>
              f.title.toLowerCase().includes(search.toLowerCase()) ||
              f.desc.toLowerCase().includes(search.toLowerCase())
          )
      )
    : SECTIONS;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "white",
        borderBottom: "1.5px solid #f1f5f9",
        padding: "14px 28px",
        display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px",
            borderRadius: 10,
            border: `1.5px solid ${AMBER}`,
            background: AMBER_L,
            color: AMBER_D,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = AMBER; e.currentTarget.style.color = "white"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = AMBER_L; e.currentTarget.style.color = AMBER_D; }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1c1917" }}>📖 SpacECE Teacher Guide</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>A complete walkthrough of every tab and feature</div>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af" }}>🔍</span>
          <input
            type="text"
            placeholder="Search features…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "8px 12px 8px 30px",
              borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              fontSize: 12,
              outline: "none",
              fontFamily: "inherit",
              width: 200,
              color: "#374151",
            }}
          />
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{
        background: `linear-gradient(135deg, #d97706 0%, ${AMBER} 60%, #fbbf24 100%)`,
        padding: "36px 28px 32px",
        color: "white",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 8 }}>
            Welcome to the Teacher Guide 👋
          </div>
          <p style={{ fontSize: 14, opacity: 0.9, maxWidth: 560, lineHeight: 1.7, margin: "0 0 20px" }}>
            Every tab, every button — explained with plain English and real examples.
            Click any section below to expand its detailed guide.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { icon: "🗂️", val: `${SECTIONS.length} Tabs covered` },
              { icon: "✨", val: `${SECTIONS.reduce((a, s) => a + s.features.length, 0)} Features explained` },
              { icon: "💡", val: "Real-world examples" },
            ].map((chip, i) => (
              <div key={i} style={{
                padding: "6px 14px", borderRadius: 20,
                background: "rgba(255,255,255,0.2)",
                fontSize: 12, fontWeight: 700,
                backdropFilter: "blur(4px)",
              }}>
                {chip.icon} {chip.val}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick-nav pills ── */}
      <div style={{ background: "white", borderBottom: "1px solid #f1f5f9", padding: "12px 28px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setOpenSection(s.id); setSearch(""); document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: `1.5px solid ${openSection === s.id ? s.color : "#e5e7eb"}`,
                background: openSection === s.id ? s.bg : "white",
                color: openSection === s.id ? s.color : "#6b7280",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sections ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px 60px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No results for "{search}"</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try searching for a tab name like "Attendance" or a feature like "certificate".</div>
          </div>
        )}

        {filtered.map((section) => (
          <div key={section.id} id={`section-${section.id}`}>
            <SectionPanel
              section={section}
              isOpen={openSection === section.id}
              onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
            />
          </div>
        ))}

        {/* Footer tip */}
        <div style={{
          marginTop: 24,
          padding: "16px 20px",
          background: AMBER_L,
          borderRadius: 12,
          border: `1px solid ${AMBER}40`,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}>
          <span style={{ fontSize: 22 }}>💡</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: AMBER_D, marginBottom: 2 }}>Pro tip</div>
            <div style={{ fontSize: 12, color: "#92400e" }}>
              The sidebar badges (red dots) on Assignments and Notifications tell you how many items still need your attention.
              Clear them regularly so nothing slips through.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}