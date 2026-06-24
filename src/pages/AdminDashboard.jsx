import { useState, useEffect } from "react";
import { Logo, Toast, globalCSS } from "../components/Shared";
import { t } from "../services/i18n";

// ── Existing tabs (unchanged imports) ──
import OverviewTab              from "../admin/OverviewTab";
import CenterManagementTab      from "../admin/CenterManagementTab";
import TeacherManagementTab     from "../admin/TeacherManagementTab";
import LessonPlanManagementTab  from "../admin/LessonPlanManagementTab";
import CurriculumTrainingTab    from "../admin/CurriculumTrainingTab";
import ActivityMonitoringTab    from "../admin/ActivityMonitoringTab";
import ChildrenManagementTab    from "../admin/ChildrenManagement";
import TrainerManagementTab     from "../admin/TrainerManagementTab";
import AssignmentReviewTab      from "../admin/AssignmentReviewTab";
import AttendanceTab            from "../admin/AttendanceTab";
import ReportsTab               from "../admin/ReportsTab";
import NotificationsTab         from "../admin/NotificationsTab";
import SettingsTab              from "../admin/SettingsTab";
import FeedbackManagementTab    from "../admin/FeedbackManagementTab";

// ── Newly activated tabs ──
import CourseManagementTab      from "../admin/CourseManagementTab";
import BatchManagementTab       from "../admin/BatchManagementTab";
import AssessmentManagementTab  from "../admin/AssessmentManagementTab";
import CertificateManagementTab from "../admin/CertificateManagementTab";
import LiveSessionsTab          from "../admin/LiveSessionsTab";

// ── User Guide page ──
import UserGuidePage            from "../pages/UserGuidePage";

// ── API (untouched) ──
import {
  getAdminTeachers,
  getCourseAssignments,
  getCourses,
  updateTeacherStatus,
} from "../services/api";

/* ─────────────────────────────────────────────────────────────
   INITIAL LOCAL STATE FOR NEW TABS
   (these hold UI-only data; swap for API calls when your
    backend endpoints are ready — just follow the same pattern
    used for teachers / courses / assignments above)
───────────────────────────────────────────────────────────── */
const INITIAL_BATCHES = [];

const INITIAL_ASSESSMENTS = [
  { id: 1, title: "Child Development Quiz",      course: "Child Psychology & Development", questions: 10, passMark: 60, dueDate: "2026-07-15", status: "published", attempts: 5, avgScore: 72 },
  { id: 2, title: "Montessori Fundamentals Test", course: "Montessori Method",              questions: 15, passMark: 70, dueDate: "2026-07-30", status: "draft",     attempts: 0, avgScore: 0  },
];

const INITIAL_CERTIFICATES = [
  { id: 1, certificateId: "SPC-2026-001", learner: "Priya Sharma",       course: "Child Psychology & Development", template: "Gold Standard", issuedOn: "15 Jun 2026", qrStatus: "verified", status: "issued"  },
  { id: 2, certificateId: "SPC-2026-002", learner: "Gauri Thorat",        course: "Montessori Method",              template: "Modern Blue",   issuedOn: "18 Jun 2026", qrStatus: "verified", status: "issued"  },
  { id: 3, certificateId: "SPC-2026-003", learner: "Dnyaneshwari Thorat", course: "NEP 2020 Framework",             template: "Classic",       issuedOn: "—",           qrStatus: "queued",   status: "queued"  },
];

const INITIAL_SESSIONS = [];

/* ===========================================
   MAIN ADMIN DASHBOARD
=========================================== */
export default function AdminDashboard({ user, onLogout }) {
  const [activeTab,    setActiveTab]    = useState("overview");
  const [showGuide,    setShowGuide]    = useState(false);

  // ── Shared state (DB-backed) ──
  const [teachers,    setTeachers]    = useState([]);
  const [courses,     setCourses]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [toast,       setToast]       = useState({ msg: "", type: "" });

  // ── New tab local state ──
  const [batches,      setBatches]      = useState(INITIAL_BATCHES);
  const [assessmentsData, setAssessmentsData] = useState(INITIAL_ASSESSMENTS);
  const [certificates, setCertificates] = useState(INITIAL_CERTIFICATES);
  const [sessions,     setSessions]     = useState(INITIAL_SESSIONS);

  /* ── Derived ── */
  const pending = teachers.filter(t => t.status === "pending");

  /* ── Assignment shape mapper (unchanged) ── */
  const mapCourseAssignmentForReview = (assignment) => {
    const course  = assignment.course  || {};
    const teacher = assignment.teacher || {};
    const statusMap = {
      assigned:    "pending",
      in_progress: "under review",
      completed:   "reviewed",
      submitted:   "pending",
      reviewed:    "reviewed",
      approved:    "approved",
      revision:    "revision",
    };
    const rubric = assignment.rubric?.length
      ? assignment.rubric
      : [
          { criterion: "Content accuracy",            score: null, maxScore: 25 },
          { criterion: "Age-appropriate planning",    score: null, maxScore: 25 },
          { criterion: "Presentation and clarity",    score: null, maxScore: 20 },
          { criterion: "Practical classroom use",     score: null, maxScore: 30 },
        ];

    return {
      id:            assignment._id,
      teacher:       teacher.name  || "Unknown Teacher",
      teacherEmail:  teacher.email || "",
      title:         assignment.title || course.title || "Course Assignment",
      course:        course.title || "Training Course",
      batch:         assignment.batch || "DB Assignment",
      submitted:     (assignment.submittedAt || assignment.completedAt)
                       ? new Date(assignment.submittedAt || assignment.completedAt).toLocaleDateString("en-IN")
                       : "Not submitted",
      submittedDate: assignment.submittedAt || assignment.completedAt || assignment.updatedAt || assignment.createdAt,
      status:        statusMap[assignment.status] || assignment.status || "pending",
      feedback:      assignment.feedback  || "",
      score:         assignment.score,
      rubric,
      trainer:       assignment.trainer    || "",
      reviewedBy:    assignment.reviewedBy || "",
      reviewedAt:    assignment.reviewedAt || "",
      notified:      assignment.notified   || false,
      annotations:   assignment.annotations || [],
    };
  };

  /* ── persistTeachers — syncs status changes back to DB (unchanged) ── */
  const persistTeachers = (updater) => {
    setTeachers(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      next.forEach(teacher => {
        const previous = prev.find(item => (item._id || item.id) === (teacher._id || teacher.id));
        if (previous && previous.status !== teacher.status) {
          updateTeacherStatus(teacher._id || teacher.id, teacher.status).catch(error => {
            setToast({ msg: error.message || "Could not update teacher status.", type: "error" });
          });
        }
      });
      return next;
    });
  };

  /* ── Nav items ── */
  const navItems = [
    { key: "overview",      label: "Admin Dashboard",      icon: "📊" },
    { key: "centers",       label: "Center Management",    icon: "🏫" },
    { key: "teachers",      label: "Teacher Management",   icon: "👩‍🏫", badge: pending.length },
    { key: "curriculum",    label: "Course Management",    icon: "📚" },
    { key: "batches",       label: "Batch Management",     icon: "🗂️" },
    { key: "livesessions",  label: "Live Sessions",        icon: "🎥" },
    { key: "activities",    label: "Activity Monitoring",  icon: "📸" },
    { key: "lessonplans",   label: "Lesson Plans",         icon: "📋" },
    { key: "children",      label: "Children & Classes",   icon: "👶" },
    { key: "trainers",      label: "Trainer Management",   icon: "🎓" },
    { key: "assignments",   label: "Assignment Review",    icon: "📝", badge: assignments.filter(a => a.status === "pending").length },
    { key: "assessments",   label: "Assessments",          icon: "🧠" },
    { key: "certificates",  label: "Certificates",         icon: "🏅" },
    { key: "attendance",    label: "Attendance",           icon: "📅" },
    { key: "reports",       label: "Reports & Analytics",  icon: "📈" },
    { key: "notifications", label: "Notifications",        icon: "🔔" },
    { key: "settings",      label: "Settings & Roles",     icon: "⚙️" },
    { key: "feedback",      label: "Feedback",             icon: "💬" },
  ];

  /* ── Tab renderer ── */
  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab teachers={teachers} courses={courses} batches={batches} sessions={sessions} />;

      case "centers":
        return <CenterManagementTab allTeachers={teachers} setToast={setToast} />;

      case "teachers":
        return <TeacherManagementTab teachers={teachers} setTeachers={persistTeachers} setToast={setToast} />;

      case "curriculum":
        return <CurriculumTrainingTab setToast={setToast} />;

      // ── NEW: Batch Management ──
      case "batches":
        return (
          <BatchManagementTab
            batches={batches}
            setBatches={setBatches}
            teachers={teachers}
            setToast={setToast}
          />
        );

      // ── NEW: Live Sessions ──
      case "livesessions":
        return (
          <LiveSessionsTab
            sessions={sessions}
            setSessions={setSessions}
            teachers={teachers}
            batches={batches}
            setToast={setToast}
          />
        );

      case "activities":
        return <ActivityMonitoringTab setToast={setToast} />;

      case "lessonplans":
        return <LessonPlanManagementTab setToast={setToast} />;

      case "children":
        return <ChildrenManagementTab setToast={setToast} />;

      case "trainers":
        return <TrainerManagementTab batches={batches} setToast={setToast} />;

      case "assignments":
        return (
          <AssignmentReviewTab
            assignments={assignments}
            setAssignments={setAssignments}
            setToast={setToast}
            teachers={teachers}
            user={user}
          />
        );

      // ── NEW: Assessments ──
      case "assessments":
        return (
          <AssessmentManagementTab
            assessmentsData={assessmentsData}
            setAssessmentsData={setAssessmentsData}
            setToast={setToast}
          />
        );

      // ── NEW: Certificates ──
      case "certificates":
        return (
          <CertificateManagementTab
            certificates={certificates}
            setCertificates={setCertificates}
            setToast={setToast}
          />
        );

      case "attendance":
        return <AttendanceTab teachers={teachers} sessions={sessions} />;

      case "reports":
        return <ReportsTab teachers={teachers} courses={courses} batches={batches} />;

      case "notifications":
        return <NotificationsTab teachers={teachers} setToast={setToast} />;

      case "settings":
        return <SettingsTab setToast={setToast} />;

      case "feedback":
        return <FeedbackManagementTab setToast={setToast} />;

      default:
        return null;
    }
  };

  /* ── Initial data fetch + 30-second poll (DB connectivity unchanged) ── */
  useEffect(() => {
    let ignore       = false;
    let isInitialLoad = true;

    const fetchDashboardData = () => {
      Promise.all([getAdminTeachers(), getCourses(), getCourseAssignments()])
        .then(([teacherRes, courseRes, assignmentRes]) => {
          if (ignore) return;
          setTeachers(teacherRes.teachers || []);
          setCourses(courseRes.courses   || []);
          setAssignments((assignmentRes.assignments || []).map(mapCourseAssignmentForReview));
          isInitialLoad = false;
        })
        .catch(error => {
          if (!ignore && isInitialLoad) {
            setToast({ msg: error.message || "Could not load dashboard data from MongoDB.", type: "error" });
          }
          console.error("Dashboard poll failed:", error);
        });
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  /* ── If the User Guide is open, render it full-screen ── */
  if (showGuide) {
    return <UserGuidePage onBack={() => setShowGuide(false)} />;
  }

  /* ── Main layout ── */
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI','Inter',-apple-system,sans-serif" }}>
      <style>{globalCSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />

      {/* ── Sidebar ── */}
      <div style={{
        width: 250, background: "white", borderRight: "1px solid #f1f5f9",
        display: "flex", flexDirection: "column", flexShrink: 0,
        boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <Logo size={120} />
          <div style={{
            textAlign: "center", padding: "4px 12px", borderRadius: 20,
            fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#92400e",
            border: "1px solid #fbbf24", margin: "6px auto 0",
            display: "inline-block", width: "fit-content", letterSpacing: "0.3px",
          }}>
            🛡️ {t("Admin Panel")}
          </div>
        </div>

        <nav style={{ padding: "4px 10px", flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", border: "none", borderRadius: 10,
                background: activeTab === item.key ? "#fef3c7" : "transparent",
                color: activeTab === item.key ? "#92400e" : "#6b7280",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", textAlign: "left", marginBottom: 2,
                transition: "all 0.18s",
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{t(item.label)}</span>
              {item.badge > 0 && (
                <span style={{
                  background: "#ef4444", color: "white", borderRadius: 20,
                  fontSize: 10, fontWeight: 800, padding: "1px 7px",
                  minWidth: 18, textAlign: "center",
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar footer — admin info + sign-out icon */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg,#f59e0b,#d97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "white",
          }}>A</div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>Admin</div>
            <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
          </div>
          <button
            onClick={onLogout}
            title={t("Sign Out")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 4 }}
          >⏻</button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", maxHeight: "100vh" }}>

        {/* ── Top bar: User Guide + Logout ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>

          {/* 📖 User Guide button */}
          <button
            onClick={() => setShowGuide(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10,
              border: "1.5px solid #f59e0b",
              background: "#fef3c7", color: "#92400e",
              fontSize: 12, fontWeight: 700,
              fontFamily: "inherit", cursor: "pointer",
              transition: "all 0.18s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f59e0b"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fef3c7"; e.currentTarget.style.color = "#92400e"; }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>📖</span>
            User Guide
          </button>

          {/* ⎋ Logout button (unchanged styling) */}
          <button
            onClick={onLogout}
            title="Sign Out"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10,
              border: "1px solid #fbbf24",
              background: "#fef3c7", color: "#92400e",
              fontSize: 12, fontWeight: 700,
              fontFamily: "inherit", cursor: "pointer",
              transition: "all 0.18s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fde68a"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fef3c7"; }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>⎋</span>
            Logout
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}