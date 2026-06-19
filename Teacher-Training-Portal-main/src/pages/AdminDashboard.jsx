import { useState, useEffect } from "react";
import { Logo, Toast, S, globalCSS } from "../components/Shared";
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
import LearningContentManagementTab from "../admin/LearningContentManagementTab";
import FeedbackManagementTab from "../admin/FeedbackManagementTab";
import { MOCK_TEACHERS, MOCK_COURSES, MOCK_BATCHES, MOCK_TRAINERS, MOCK_SESSIONS, MOCK_ASSIGNMENTS, MOCK_CONTENT_ITEMS, MOCK_ASSESSMENTS, MOCK_CERTIFICATES, MOCK_FEEDBACKS, MOCK_CATEGORIES } from "../data/mockData";
//import CourseManagementTab from "../admin/CourseManagementTab";
//import BatchManagementTab from "../admin/BatchManagementTab";
//import AssessmentManagementTab from "../admin/AssessmentManagementTab";
//import CertificateManagementTab from "../admin/CertificateManagementTab";
//import LiveSessionsTab from "../admin/LiveSessionsTab";









/* ═══════════════════════════════════════════
   MAIN ADMIN DASHBOARD
═══════════════════════════════════════════ */
export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [teachers,  setTeachers]  = useState(MOCK_TEACHERS);
  const [trainers,  setTrainers]  = useState(MOCK_TRAINERS);
  const [feedbacks, setFeedbacks] = useState(MOCK_FEEDBACKS);
  const [assignments,setAssignments] = useState(MOCK_ASSIGNMENTS);
  const [toast, setToast] = useState({msg:"",type:""});
  
  //const [sessions,  setSessions]  = useState(MOCK_SESSIONS);
  //const [contentItems, setContentItems] = useState(MOCK_CONTENT_ITEMS);
  //const [assessmentsData, setAssessmentsData] = useState(MOCK_ASSESSMENTS);
  //const [certificates, setCertificates] = useState(MOCK_CERTIFICATES);
  //const [courses,   setCourses]   = useState(MOCK_COURSES);
  //const [batches,   setBatches]   = useState(MOCK_BATCHES);
  //const [categories, setCategories] = useState(MOCK_CATEGORIES);

  const pending = teachers.filter(t=>t.status==="pending");

  const navItems = [
    { key:"overview",     label:"Admin Dashboard",          icon:"📊" },
    { key:"centers",      label:"Center Management", icon:"🏫" },
    { key:"teachers",     label:"Teacher Management",icon:"👩‍🏫", badge:pending.length },
    { key: "curriculum", label: "Course Management", icon: "📚" },
    { key: "activities", label: "Activity Monitoring", icon: "📸" },
    { key: "lessonplans", label: "Lesson Plans", icon: "📋" },
    { key: "children", label: "Children & Classes", icon: "👶" },
    { key:"trainers",     label:"Trainer Management",icon:"🎓" },
    { key:"assignments",  label:"Assignment Review", icon:"📝", badge:assignments.filter(a=>a.status==="pending").length },
    { key:"attendance",   label:"Attendance",        icon:"📋" },
   
    { key:"reports",      label:"Reports & Analytics",icon:"📈" },
    { key:"notifications",label:"Notifications",     icon:"🔔" },
    { key:"settings",     label:"Settings & Roles",  icon:"⚙️" },
    { key:"feedback",     label:"Feedback",              icon:"💬" },
    //{ key:"courses",      label:"Course Management", icon:"📚" },
    //{ key:"batches",      label:"Batch Management",  icon:"🗂️" },
    // { key:"content",      label:"Learning Content",      icon:"🎬" },
    // { key:"assessments",  label:"Assessment Management", icon:"🧠" },
    // { key:"certificates", label:"Certificates",          icon:"🏅" },
    //{ key:"sessions",     label:"Live Sessions",     icon:"📹" },
    
  ];
  const persistTeachers = (updater) => {
  setTeachers(prev => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    const toStore = next.filter(t => t.password);
    localStorage.setItem("spaceece_teachers", JSON.stringify(toStore));
    return next;
  });
};


  const renderContent = () => {
    switch(activeTab) {
      case "overview":     return <OverviewTab teachers={teachers} courses={[]} batches={[]} sessions={[]}/>;
      case "centers": return <CenterManagementTab teachers={teachers} setToast={setToast}/>;
      case "teachers": return <TeacherManagementTab teachers={teachers} setTeachers={persistTeachers} setToast={setToast}/>;
      case "curriculum": return <CurriculumTrainingTab setToast={setToast}/>;
      case "activities": return <ActivityMonitoringTab setToast={setToast}/>;
      case "lessonplans": return <LessonPlanManagementTab setToast={setToast} />;
      case "children": return <ChildrenManagementTab setToast={setToast}/>;
      case "trainers": return <TrainerManagementTab trainers={trainers} setTrainers={setTrainers} batches={[]} setToast={setToast}/>;
      case "assignments":  return <AssignmentReviewTab assignments={assignments} setAssignments={setAssignments} setToast={setToast}/>;
      case "attendance":   return <AttendanceTab teachers={teachers} sessions={[]}/>;
      case "reports":      return <ReportsTab teachers={teachers} courses={[]} batches={[]}/>;
      case "notifications":return <NotificationsTab teachers={teachers} setToast={setToast}/>;
      case "settings":     return <SettingsTab/>;
      case "feedback":     return <FeedbackManagementTab feedbacks={feedbacks} setFeedbacks={setFeedbacks} setToast={setToast}/>;
      //case "sessions": return <LiveSessionsTab sessions={sessions} setSessions={setSessions} teachers={teachers} batches={[]} setToast={setToast}/>;
      //case "courses":      return <CourseManagementTab courses={courses} setCourses={setCourses} categories={categories} setCategories={setCategories} setToast={setToast}/>;
      //case "batches": return <BatchManagementTab batches={batches} setBatches={setBatches} teachers={teachers} setToast={setToast}/>;
      //case "content":      return <LearningContentManagementTab contentItems={contentItems} setContentItems={setContentItems} setToast={setToast}/>;
      //case "assessments":  return <AssessmentManagementTab assessmentsData={assessmentsData} setAssessmentsData={setAssessmentsData} setToast={setToast}/>;
      //case "certificates": return <CertificateManagementTab certificates={certificates} setCertificates={setCertificates} setToast={setToast}/>;
      
      default:             return null;
    }
  };
  useEffect(() => {
  const stored = JSON.parse(localStorage.getItem("spaceece_teachers") || "[]");
  // Stored teachers (registered via form) take priority — merge with mocks
  const storedIds = new Set(stored.map(t => t.email));
  const merged = [
    ...MOCK_TEACHERS.filter(t => !storedIds.has(t.email)),
    ...stored,
  ];
  setTeachers(merged);
}, []);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f8fafc", fontFamily:"'Segoe UI','Inter',-apple-system,sans-serif" }}>
      <style>{globalCSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({msg:"",type:""})}/>

      {/* ── Sidebar ── */}
      <div style={{ width:250, background:"white", borderRight:"1px solid #f1f5f9", display:"flex", flexDirection:"column", flexShrink:0, boxShadow:"2px 0 12px rgba(0,0,0,0.04)", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
        <div style={{ padding:"20px 16px 12px" }}>
          <Logo size={120}/>
          <div style={{ textAlign:"center", padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
            background:"#fef3c7", color:"#92400e", border:"1px solid #fbbf24", margin:"6px auto 0", display:"inline-block", width:"fit-content", letterSpacing:"0.3px" }}>
            🛡️ Admin Panel
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
              <span style={{ flex:1 }}>{item.label}</span>
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
          <button onClick={onLogout} title="Sign Out"
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#9ca3af", padding:4 }}>⏻</button>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, padding:"28px 32px", overflowY:"auto", maxHeight:"100vh" }}>
        {renderContent()}
      </div>
    </div>
  );
}
