import { useState } from "react";

/* ─── Colour tokens pulled from the dashboard theme ─── */
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

/* ─── Guide data ─── */
const SECTIONS = [
  {
    id: "overview",
    icon: "📊",
    label: "Admin Dashboard",
    color: AMBER,
    bg: AMBER_L,
    description: "The central command centre. See live stats and recent platform activity at a glance.",
    features: [
      {
        title: "Hero Banner",
        desc: "Greets you with the current date, pending-approval count, and active teacher count. Color turns red when pending approvals need urgent attention.",
        example: "If you see '3 Pending Approval' in the red chip, head straight to Teacher Management to review those registrations.",
        badge: "Live",
      },
      {
        title: "Stat Cards",
        desc: "Six quick-glance tiles: Centers, Teachers, Pending Approvals, Children, Course Completion %, and Pending Activities. Each updates every 8 seconds.",
        example: "Course Completion shows 0% → means no assignment has been marked complete yet. Assign and track progress under Course Management.",
        badge: "Auto-refresh",
      },
      {
        title: "Teacher Registrations Chart",
        desc: "A bar chart covering the last 6 months of teacher sign-ups. Hover a bar to see that month's count.",
        example: "A spike in June means a recruitment drive worked. Use this to plan trainer capacity.",
        badge: "Chart",
      },
      {
        title: "Platform Summary",
        desc: "Four donut gauges: Attendance Today, Course Completion Rate, Pending Lessons, and Activity Reviews Needed.",
        example: "Attendance gauge shows 0/27 — you can now send a bulk nudge from the Notifications tab.",
        badge: "Gauges",
      },
      {
        title: "Top Performing Teachers",
        desc: "Leaderboard of up to 5 approved teachers sorted by performance rating. Medal icons (🥇🥈🥉) highlight the top three.",
        example: "Reward the 🥇 teacher with recognition — their rating is derived from evaluation scores entered in Teacher Management.",
        badge: "Leaderboard",
      },
      {
        title: "Centers at a Glance",
        desc: "Scrollable list of centers showing city, active teacher count, and status badge.",
        example: "'Spaceece Pune · 0 teachers' signals that center needs staff allocation.",
        badge: "Quick-view",
      },
      {
        title: "Recent Activity Feed",
        desc: "Timestamped log of the latest teacher registrations and course assignments.",
        example: "'Priya Sharma assigned to Child Psychology & Development — 23 Jun' lets you trace when a course was last touched.",
        badge: "Feed",
      },
    ],
  },
  {
    id: "center",
    icon: "🏫",
    label: "Center Management",
    color: GREEN,
    bg: GREEN_L,
    description: "Create and manage all SpacECE learning centers across cities.",
    features: [
      {
        title: "Add Center",
        desc: "Click 'Add Center' to fill a form with name, city, address, and status. Save to make it available for teacher assignment.",
        example: "Add 'SpacECE Kothrud' → set city 'Pune' → Status: Active → Save. It now appears in the Centers dropdown when onboarding teachers.",
        badge: "Create",
      },
      {
        title: "Edit / Deactivate",
        desc: "Click the pencil icon on any center row to update details or toggle the center status to Inactive.",
        example: "A center is temporarily closed? Set status to Inactive so it won't appear in dropdown menus used by teachers.",
        badge: "Edit",
      },
      {
        title: "Teacher Count Badge",
        desc: "Each center card shows the number of teachers currently assigned. Click to filter the Teacher Management list by that center.",
        example: "'Ravet · 2 teachers' — click to see exactly who those 2 teachers are.",
        badge: "Filter",
      },
    ],
  },
  {
    id: "teacher",
    icon: "👩‍🏫",
    label: "Teacher Management",
    color: AMBER,
    bg: AMBER_L,
    description: "Approve, reject, and manage all teacher accounts on the platform.",
    features: [
      {
        title: "Pending Approvals Queue",
        desc: "New teacher registrations land here with a yellow 'pending' badge. Review profile, then click Approve ✅ or Reject ❌.",
        example: "1 pending shows in the sidebar badge. Click the teacher name, read their profile, click Approve → they can now log in.",
        badge: "Action required",
      },
      {
        title: "Search & Filter",
        desc: "Filter teachers by status (approved / pending / rejected), center, or class using the dropdowns at the top.",
        example: "Select 'Center: Pune' + 'Status: Approved' to see only active teachers in your Pune branch.",
        badge: "Filter",
      },
      {
        title: "Edit Teacher Profile",
        desc: "Click a teacher row to view and edit their assigned center, class, and profile information.",
        example: "Transfer a teacher from Ravet to Beed — update their Center field here without them needing to re-register.",
        badge: "Edit",
      },
      {
        title: "Export",
        desc: "Download the full teacher list as a CSV for payroll or HR reporting.",
        example: "Month-end: click Export → open in Excel → filter approved teachers for attendance reconciliation.",
        badge: "Export",
      },
    ],
  },
  {
    id: "course",
    icon: "📚",
    label: "Course Management",
    color: BLUE,
    bg: BLUE_L,
    description: "Build, publish, and assign courses. Track which teachers are learning what.",
    features: [
      {
        title: "Create Course",
        desc: "Click 'New Course', fill in title, description, target age group, and upload a cover image. Set status to Draft or Published.",
        example: "'Child Psychology & Development' → Publish → it becomes assignable to teachers immediately.",
        badge: "Create",
      },
      {
        title: "Assign to Teachers",
        desc: "Open any published course and click 'Assign'. Pick teachers from the list — they get notified automatically.",
        example: "Assign 'Social Emotional Learning' to all 5 Pune teachers in one step using multi-select.",
        badge: "Assign",
      },
      {
        title: "Track Completion",
        desc: "The completion bar shows how many assigned teachers have marked the course done.",
        example: "3/5 (60%) on 'Child Psychology' → two teachers are still in progress. Send a reminder via Notifications.",
        badge: "Progress",
      },
    ],
  },
  {
    id: "activity",
    icon: "🎯",
    label: "Activity Monitoring",
    color: PURPLE,
    bg: PURPLE_L,
    description: "Review teacher-submitted classroom activities and approve or request revisions.",
    features: [
      {
        title: "Submissions Queue",
        desc: "Each card shows the activity title, submitting teacher, and submission date. Click 'Review' to open the full detail view.",
        example: "2 Pending Activities in the dashboard → open Activity Monitoring → review 'Finger Painting Week 3' submitted by Priya.",
        badge: "Review",
      },
      {
        title: "Approve / Request Revision",
        desc: "Approve an activity to mark it complete, or click 'Request Changes' and type feedback. The teacher is notified.",
        example: "Photos missing from the submission? Click 'Request Changes' → type 'Please attach 3 photos' → teacher re-submits.",
        badge: "Action",
      },
    ],
  },
  {
    id: "lessonplan",
    icon: "📋",
    label: "Lesson Plans",
    color: CYAN,
    bg: CYAN_L,
    description: "Create weekly lesson plan templates and assign them to classes or centers.",
    features: [
      {
        title: "Create Lesson Plan",
        desc: "Click 'New Plan', set a theme (e.g. 'Monsoon Week'), add daily activities for each day of the week, and assign an age group.",
        example: "'Monsoon Week' plan: Monday – Paper boat crafts, Tuesday – Rain song, … Assign to all Toddler classes.",
        badge: "Create",
      },
      {
        title: "Assign & Publish",
        desc: "Set a start date and assign the plan to specific centers or classes. Teachers see it in their Lesson Plans view.",
        example: "Publish 'Diwali Theme' for Week of Oct 20 → assigned teachers see the daily schedule in their teacher dashboard.",
        badge: "Publish",
      },
    ],
  },
  {
    id: "children",
    icon: "👶",
    label: "Children & Classes",
    color: GREEN,
    bg: GREEN_L,
    description: "Manage child enrollments, class assignments, and track attendance per child.",
    features: [
      {
        title: "Enroll Child",
        desc: "Add a child with parent details, DOB, and assign to a class. The enrollment appears in the center's roll.",
        example: "Enroll 'Aryan Sharma' (DOB 12 Mar 2022) into Toddlers A at Pune center.",
        badge: "Enroll",
      },
      {
        title: "Class View",
        desc: "See all children grouped by class with current attendance rates and teacher assigned.",
        example: "Toddlers A — 8 children, 75% avg attendance, Teacher: Priya Sharma. Low attendance? Trigger a parent notification.",
        badge: "View",
      },
    ],
  },
  {
    id: "trainer",
    icon: "🎓",
    label: "Trainer Management",
    color: AMBER,
    bg: AMBER_L,
    description: "Add expert trainers who deliver courses and sessions to your teachers.",
    features: [
      {
        title: "Add Trainer",
        desc: "Create a trainer profile with subject expertise, bio, and status. Trainers are separate from teachers — they teach the teachers.",
        example: "Add 'Dr. Meena Kulkarni — Child Development' as an Active trainer. She can now be linked to courses.",
        badge: "Create",
      },
      {
        title: "Performance Table",
        desc: "View each trainer's course count, batch count, session count, and rating in a sortable table.",
        example: "Trainer with rating 4.8 across 10 sessions → excellent. Rating 2.1 → initiate a feedback conversation.",
        badge: "Analytics",
      },
    ],
  },
  {
    id: "assignments",
    icon: "✏️",
    label: "Assignment Review",
    color: BLUE,
    bg: BLUE_L,
    description: "Review and grade written or practical assignments submitted by teachers for their enrolled courses.",
    features: [
      {
        title: "Pending Assignments",
        desc: "List of submitted assignments awaiting review. Each shows teacher name, course, and submission date.",
        example: "'Gauri Thorat — Child Psychology — Submitted 23 Jun' → open, review, score and mark Approved.",
        badge: "Review",
      },
      {
        title: "Grade & Feedback",
        desc: "Enter a score and written feedback. Approved assignments count toward Course Completion %.",
        example: "Score 85/100 + feedback 'Strong understanding of attachment theory' → teacher's profile completion updates.",
        badge: "Grade",
      },
    ],
  },
  {
    id: "attendance",
    icon: "📅",
    label: "Attendance",
    color: GREEN,
    bg: GREEN_L,
    description: "Record and monitor teacher attendance across sessions and centers.",
    features: [
      {
        title: "Mark Attendance",
        desc: "Select a date and center, then mark each teacher as Present, Late, or Absent. Bulk-mark with 'Mark All Present'.",
        example: "Wednesday 24 Jun → Pune center → 4 present, 1 late, 0 absent → Save. Dashboard updates within 8 seconds.",
        badge: "Record",
      },
      {
        title: "Attendance History",
        desc: "View per-teacher attendance bars showing overall % across all recorded sessions.",
        example: "Teacher with 45% attendance over 20 sessions → follow up before it impacts their active status.",
        badge: "History",
      },
    ],
  },
  {
    id: "reports",
    icon: "📈",
    label: "Reports & Analytics",
    color: AMBER,
    bg: AMBER_L,
    description: "Four report types generated live from platform data. Export any as CSV.",
    features: [
      {
        title: "Enrollment Report",
        desc: "Bar chart of teacher sign-ups over the past 6 months, plus a list of the 8 most recently added teachers.",
        example: "27 teachers added in June — share this with management as proof of growth.",
        badge: "Chart",
      },
      {
        title: "Completion Report",
        desc: "Per-course progress bars showing how many assigned teachers have completed each course.",
        example: "Green bar (≥80%) = healthy. Red bar (<50%) = that course needs a follow-up push notification.",
        badge: "Progress",
      },
      {
        title: "Attendance Report",
        desc: "All approved teachers ranked by attendance %, highest first.",
        example: "Top 3 teachers at 95%+ → recognise them in your next team meeting.",
        badge: "Ranking",
      },
      {
        title: "Trainer Report",
        desc: "Full table of trainers with subject, courses, batches, sessions, rating, and status.",
        example: "Export CSV → send to HR for trainer contract renewals.",
        badge: "Table + Export",
      },
    ],
  },
  {
    id: "notifications",
    icon: "🔔",
    label: "Notifications",
    color: RED,
    bg: RED_L,
    description: "Broadcast or target messages to teachers, trainers, or parents.",
    features: [
      {
        title: "Send Notification",
        desc: "Choose audience (All Teachers / Specific Center / Individual), write a message, and hit Send.",
        example: "Attendance low today? Send 'Reminder: Please mark today's attendance before 5 PM' to All Teachers.",
        badge: "Broadcast",
      },
      {
        title: "Notification History",
        desc: "View all past notifications with timestamp, audience, and read receipt count.",
        example: "Check if last week's reminder was read by 20/27 teachers — follow up with the 7 who didn't open it.",
        badge: "History",
      },
    ],
  },
  {
    id: "settings",
    icon: "⚙️",
    label: "Settings & Roles",
    color: PURPLE,
    bg: PURPLE_L,
    description: "Platform configuration, admin role management, and system preferences.",
    features: [
      {
        title: "Role Management",
        desc: "Create roles (Super Admin, Center Admin, Trainer) and assign them to users with specific permission sets.",
        example: "Promote a Center Head to 'Center Admin' so they can approve teachers at their center only.",
        badge: "Permissions",
      },
      {
        title: "Platform Settings",
        desc: "Configure default language, timezone, academic year start, and notification preferences.",
        example: "Set Academic Year start to June 1 so reports align with your school calendar.",
        badge: "Config",
      },
    ],
  },
  {
    id: "feedback",
    icon: "💬",
    label: "Feedback",
    color: CYAN,
    bg: CYAN_L,
    description: "Collect, review, and act on feedback from teachers and parents.",
    features: [
      {
        title: "Feedback Inbox",
        desc: "All submitted feedback cards with sender, date, rating (if applicable), and message.",
        example: "Teacher Priya rates the training content 3/5 with note 'Need more practical examples' → create an action item.",
        badge: "Inbox",
      },
      {
        title: "Respond",
        desc: "Click any feedback card to reply directly. The sender is notified of your response.",
        example: "Parent concern about schedule change → reply 'We've updated the timetable — check the notice board.' → resolved.",
        badge: "Reply",
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

/* ─── Main component ─── */
export default function UserGuidePage({ onBack }) {
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
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1c1917" }}>📖 SpacECE Admin Guide</div>
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
            Welcome to the Admin Guide 👋
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
            <div style={{ fontSize: 12, marginTop: 4 }}>Try searching for a tab name like "Teacher" or a feature like "export".</div>
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
              The sidebar badge (red dot) on Teacher Management tells you how many teachers are waiting for approval.
              Approve or reject them promptly — unapproved teachers cannot access the platform.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}