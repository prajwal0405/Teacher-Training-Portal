import { useState, useEffect } from "react";
import { Logo, Toast, globalCSS } from "../components/Shared";
import { t } from "../services/i18n";
import OverviewTab from "../admin/OverviewTab";
import CenterManagementTab from "../admin/CenterManagementTab";
import TeacherManagementTab from "../admin/TeacherManagementTab";
import LessonPlanManagementTab from "../admin/LessonPlanManagementTab";
import CurriculumTrainingTab from "../admin/CurriculumTrainingTab";
import ActivityMonitoringTab from "../admin/ActivityMonitoringTab";
import ChildrenManagementTab from "../admin/ChildrenManagement";
import TrainerManagementTab from "../admin/TrainerManagementTab";
import AssignmentReviewTab from "../admin/AssignmentReviewTab";
import AttendanceTab from "../admin/AttendanceTab";
import ReportsTab from "../admin/ReportsTab";
import NotificationsTab from "../admin/NotificationsTab";
import SettingsTab from "../admin/SettingsTab";
import FeedbackManagementTab from "../admin/FeedbackManagementTab";
import ScheduleManagementTab from "../admin/ScheduleManagementTab";
import CertificateManagementTab from "../admin/CertificateManagementTab";
import AutomationTab from "../admin/AutomationTab";
import SystemHealthTab from "../admin/SystemHealthTab";
import AdminProfileTab from "../admin/AdminProfileTab";
import HelpFAQTab from "../admin/HelpFAQTab";
import { getAdminTeachers, getCourseAssignments, getCourses, updateTeacherStatus } from "../services/api";
//import CourseManagementTab from "../admin/CourseManagementTab";
//import BatchManagementTab from "../admin/BatchManagementTab";
//import AssessmentManagementTab from "../admin/AssessmentManagementTab";
//import CertificateManagementTab from "../admin/CertificateManagementTab";
//import LiveSessionsTab from "../admin/LiveSessionsTab";









/* ===========================================
   MAIN ADMIN DASHBOARD
=========================================== */
export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [teachers,  setTeachers]  = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments,setAssignments] = useState([]);
  const [toast, setToast] = useState({msg:"",type:""});

  const pending = teachers.filter(t=>t.status==="pending");
  const mapCourseAssignmentForReview = (assignment) => {
    const course = assignment.course || {};
    const teacher = assignment.teacher || {};
    const statusMap = {
      assigned: "pending",
      in_progress: "under review",
      completed: "reviewed",
      submitted: "submitted",
      reviewed: "reviewed",
      approved: "approved",
      revision: "revision",
    };
    const rubric = assignment.rubric?.length ? assignment.rubric : [
      { criterion: "Content accuracy", score: null, maxScore: 25 },
      { criterion: "Age-appropriate planning", score: null, maxScore: 25 },
      { criterion: "Presentation and clarity", score: null, maxScore: 20 },
      { criterion: "Practical classroom use", score: null, maxScore: 30 },
    ];

    return {
      id: assignment._id,
      teacher: teacher.name || "Unknown Teacher",
      teacherEmail: teacher.email || "",
      title: assignment.title || course.title || "Course Assignment",
      course: course.title || "Training Course",
      batch: assignment.batch || "DB Assignment",
      submitted: (assignment.submittedAt || assignment.completedAt) ? new Date(assignment.submittedAt || assignment.completedAt).toLocaleDateString("en-IN") : "Not submitted",
      submittedDate: assignment.submittedAt || assignment.completedAt || assignment.updatedAt || assignment.createdAt,
      status: statusMap[assignment.status] || assignment.status || "pending",
      feedback: assignment.feedback || "",
      score: assignment.score,
      rubric,
      trainer: assignment.trainer || "",
      reviewedBy: assignment.reviewedBy || "",
      reviewedAt: assignment.reviewedAt || "",
      notified: assignment.notified || false,
      annotations: assignment.annotations || [],
    };
  };

  const navItems = [
    { key:"overview",     label:"Admin Dashboard",          icon:"\uD83D\uDCCA" },
    { key:"centers",      label:"Center Management", icon:"\uD83C\uDFEB" },
    { key:"teachers",     label:"Teacher Management",icon:"\uD83D\uDC69\u200D\uD83C\uDFEB", badge:pending.length },
    { key: "curriculum", label: "Course Management", icon: "\uD83D\uDCDA" },
    { key: "activities", label: "Activity Monitoring", icon: "\uD83D\uDCF8" },
    { key: "lessonplans", label: "Lesson Plans", icon: "\uD83D\uDCCB" },
    { key: "children", label: "Children & Classes", icon: "\uD83D\uDC76" },
    { key:"trainers",     label:"Trainer Management",icon:"\uD83C\uDF93" },
    { key:"assignments",  label:"Assignment Review", icon:"\uD83D\uDCDD", badge:assignments.filter(a=>a.status==="pending").length },
    { key:"attendance",   label:"Attendance",        icon:"\uD83D\uDCC5" },
   
    { key:"reports",      label:"Reports & Analytics",icon:"\uD83D\uDCC8" },
    { key:"notifications",label:"Notifications",     icon:"\uD83D\uDD14" },
    { key:"settings",     label:"Settings & Roles",  icon:"\u2699\uFE0F" },
    { key:"schedules",    label:"Schedule Management", icon:"\uD83D\uDCC5" },
    { key:"certificates", label:"Certificates",        icon:"\uD83C\uDFC6" },
    { key:"feedback",     label:"Feedback",              icon:"\uD83D\uDCAC" },
    { key:"automation",   label:"Automation Center",     icon:"\u2699\uFE0F" },
  ];
  const persistTeachers = (updater) => {
  setTeachers(prev => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    next.forEach((teacher) => {
      const previous = prev.find((item) => (item._id || item.id) === (teacher._id || teacher.id));
      if (previous && previous.status !== teacher.status) {
        updateTeacherStatus(teacher._id || teacher.id, teacher.status).catch((error) => {
          setToast({ msg: error.message || "Could not update teacher status.", type: "error" });
        });
      }
    });
    return next;
  });
};


  const renderContent = () => {
    switch(activeTab) {
      case "overview":     return <OverviewTab teachers={teachers} courses={courses} batches={[]} sessions={[]}/>;
      case "centers": return <CenterManagementTab allTeachers={teachers} setToast={setToast}/>;
      case "teachers": return <TeacherManagementTab teachers={teachers} setTeachers={persistTeachers} setToast={setToast}/>;
      case "curriculum": return <CurriculumTrainingTab setToast={setToast}/>;
      case "activities": return <ActivityMonitoringTab setToast={setToast}/>;
      case "lessonplans": return <LessonPlanManagementTab setToast={setToast} />;
      case "children": return <ChildrenManagementTab setToast={setToast}/>;
      case "trainers": return <TrainerManagementTab batches={[]} setToast={setToast}/>;
      case "assignments":  return <AssignmentReviewTab assignments={assignments} setAssignments={setAssignments} setToast={setToast} teachers={teachers} user={user}/>;
      case "attendance":   return <AttendanceTab teachers={teachers} sessions={[]}/>;
      case "reports":      return <ReportsTab teachers={teachers} courses={courses} batches={[]}/>;
      case "notifications":return <NotificationsTab teachers={teachers} setToast={setToast}/>;
      case "settings":     return <SettingsTab setToast={setToast}/>;
      case "schedules":    return <ScheduleManagementTab setToast={setToast}/>;
      case "certificates": return <CertificateManagementTab setToast={setToast}/>;
      case "feedback":     return <FeedbackManagementTab setToast={setToast}/>;
      case "automation":   return <AutomationTab user={user} setToast={setToast}/>;
      default:             return null;
    }
  };
  useEffect(() => {
    let ignore = false;
    let isInitialLoad = true;

    const fetchDashboardData = () => {
      Promise.all([getAdminTeachers(), getCourses(), getCourseAssignments()])
        .then(([teacherRes, courseRes, assignmentRes]) => {
          if (ignore) return;
          setTeachers(teacherRes.teachers || []);
          setCourses(courseRes.courses || []);
          setAssignments((assignmentRes.assignments || []).map(mapCourseAssignmentForReview));
          isInitialLoad = false;
        })
        .catch((error) => {
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

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f8fafc", fontFamily:"'Segoe UI','Inter',-apple-system,sans-serif" }}>
      <style>{globalCSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({msg:"",type:""})}/>

      {/* Sidebar */}
      <div style={{ width:250, background:"white", borderRight:"1px solid #f1f5f9", display:"flex", flexDirection:"column", flexShrink:0, boxShadow:"2px 0 12px rgba(0,0,0,0.04)", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
        <div style={{ padding:"20px 16px 12px" }}>
          <Logo size={120}/>
          <div style={{ textAlign:"center", padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
            background:"#fef3c7", color:"#92400e", border:"1px solid #fbbf24", margin:"6px auto 0", display:"inline-block", width:"fit-content", letterSpacing:"0.3px" }}>
            🛡️ {t("Admin Panel")}
          </div>
        </div>

        <nav style={{ padding:"4px 10px", flex:1 }}>
          {navItems.map(item=>(
            <button key={item.key} onClick={()=>setActiveTab(item.key)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 12px",
                border:"none", borderRadius:10, background:activeTab===item.key?"#fef3c7":"transparent",
                color:activeTab===item.key?"#92400e":"#6b7280", fontSize:12, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit", textAlign:"left", marginBottom:2,
                transition:"all 0.18s" }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{t(item.label)}</span>
              {item.badge>0 && <span style={{ background:"#ef4444", color:"white", borderRadius:20, fontSize:10, fontWeight:800, padding:"1px 7px", minWidth:18, textAlign:"center" }}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding:"12px 16px", borderTop:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"white" }}>A</div>
          <div style={{ flex:1, overflow:"hidden" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#1c1917" }}>Admin</div>
            <div style={{ fontSize:10, color:"#9ca3af", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
          </div>
          <button onClick={onLogout} title={t("Sign Out")}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#9ca3af", padding:4 }}>⏻</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex:1, padding:"28px 32px", overflowY:"auto", maxHeight:"100vh" }}>
        {/* Top bar with logout button, top-right corner */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
          <button
            onClick={onLogout}
            title="Sign Out"
            style={{
              display:"flex",
              alignItems:"center",
              gap:6,
              padding:"8px 16px",
              borderRadius:10,
              border:"1px solid #fbbf24",
              background:"#fef3c7",
              color:"#92400e",
              fontSize:12,
              fontWeight:700,
              fontFamily:"inherit",
              cursor:"pointer",
              transition:"all 0.18s",
              boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={(e)=>{ e.currentTarget.style.background="#fde68a"; }}
            onMouseLeave={(e)=>{ e.currentTarget.style.background="#fef3c7"; }}
          >
            <span style={{ fontSize:14, lineHeight:1 }}>⎋</span>
            Logout
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
