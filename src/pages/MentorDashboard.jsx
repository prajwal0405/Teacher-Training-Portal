import { useState, useEffect } from "react";
import { Logo, Toast, Badge, StatusBadge, StatCard, SectionCard, S, globalCSS } from "../components/Shared";
import { t } from "../services/i18n";
import { getStoredSession, getMyCenter } from "../services/api";
import { MentorProfileTab, MentorNotificationsTab, MentorFeedbackTab, MenteeManagementTab, ImpactCapstoneTab, PDCATab } from "./MentorDashboardTabs";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getMentorPhotoUrl = (user) => {
  const photo = user?.mentorProfile?.profilePhoto || user?.mentorProfile?.photo || user?.photoUrl || user?.profilePhoto;
  if (!photo) return null;
  if (typeof photo === "string") return photo.startsWith("http") ? photo : `${API_BASE_URL}${photo}`;
  const url = photo.publicUrl || photo.url || photo.path;
  return url || null;
};

/* ── Placeholder for tabs ── */
function UnderConstructionTab({ label = "This page", icon = "🚧" }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{
        background: "white",
        borderRadius: 20,
        padding: "48px 56px",
        textAlign: "center",
        border: "1px dashed #fbbf24",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        maxWidth: 460
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", marginBottom: 8 }}>
          {label} is under work
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          This section is currently being built and is not connected yet. Please check back soon — thank you for your patience!
        </div>
      </div>
    </div>
  );
}

/* ── OverviewTab ── */
function OverviewTab({ user, workingCenter }) {
  const photoUrl = getMentorPhotoUrl(user);
  const semester = user?.mentorProfile?.fellowshipSemester || 3;
  const mentees = user?.mentorProfile?.assignedTeachers || [];
  const centerName = workingCenter
    ? [workingCenter.name, workingCenter.city].filter(Boolean).join(", ")
    : "Center not assigned";

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Good morning, {user.name?.split(" ")[0] || "Mentor"}!</h1>
          <p style={{ fontSize: 13, margin: 0, opacity: 0.88 }}>UMANG Fellowship - Semester {semester} - {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</p>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(255,255,255,0.3)", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {photoUrl ? (
              <img src={photoUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{user.name?.[0] || "?"}</span>
            )}
          </div>
          {photoUrl && <span style={{ position: "absolute", bottom: 0, right: 0, background: "#10b981", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, border: "2px solid white" }}>📷</span>}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
        <span style={{ fontSize: 18 }}>@</span>
        <span>Working Center: {centerName}</span>
      </div>

      {/* ── My Assigned Mentees Section ── */}
      <div style={{ marginBottom: 20, marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>👥</span> My Assigned Mentees
        </div>
        
        {mentees.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {mentees.map((mentee, i) => (
              <div key={mentee?._id || mentee?.id || i} style={{
                background: "white", borderRadius: 14, padding: "16px",
                border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                borderLeft: "4px solid #f59e0b"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "linear-gradient(135deg,#fef3c7,#fbbf24)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0
                  }}>👩‍🏫</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{mentee?.name || "Unknown Teacher"}</div>
                    {mentee?.teacherProfile?.subject && <div style={{ fontSize: 11, color: "#6b7280" }}>{mentee.teacherProfile.subject}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: "white", borderRadius: 14, padding: "24px",
            border: "1px solid #e5e7eb", textAlign: "center"
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>No mentees assigned yet</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Contact admin to assign teachers to you</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 24, marginTop: 16 }}>
        <StatCard icon="👥" label="Assigned Mentees" val={mentees.length || "0"} color="#3b82f6" bg="#dbeafe"/>
        <StatCard icon="📈" label="Impact Score" val="0" color="#10b981" bg="#d1fae5"/>
        <StatCard icon="📝" label="Observations" val="0" color="#8b5cf6" bg="#ede9fe"/>
        <StatCard icon="🏆" label="Capstone Progress" val="0%" color="#06b6d4" bg="#cffafe"/>
      </div>
      
      <SectionCard title="Recent Activity" icon="🕒">
         <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 12 }}>
            No recent activity.
         </div>
      </SectionCard>
    </div>
  );
}

/* ── Sidebar Avatar Component ── */
function SidebarAvatar({ user, size = 34 }) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getMentorPhotoUrl(user);
  
  if (!photoUrl || imgError) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
        {user?.name?.[0] || "?"}
      </div>
    );
  }
  
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <img src={photoUrl} alt={user?.name} onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
      <span style={{ position: "absolute", bottom: 0, right: 0, background: "#10b981", borderRadius: "50%", width: 12, height: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, border: "1.5px solid white" }}>📷</span>
    </div>
  );
}

/* ── Main MentorDashboard Export ── */
export default function MentorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [currentUser, setCurrentUser] = useState(user);
  const [workingCenter, setWorkingCenter] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "" });
  
  useEffect(() => {
    getMyCenter().then(res => {
      if (res.center) setWorkingCenter(res.center);
    }).catch(err => console.error("Failed to load working center", err));
  }, []);

  // Dummy notifications for now, since we haven't implemented mentor notifications endpoint
  const [notifications, setNotifications] = useState([
    { id: 1, type: "info", msg: "Welcome to the new Mentor Dashboard!", time: "Just now", read: false }
  ]);

  const handleMarkNotifRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllNotifRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  
  const navItems = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "mentees", label: "Mentee Management", icon: "👥" },
    { key: "impact", label: "Impact & Capstone", icon: "📈" },
    { key: "documentation", label: "Documentation (PDCA)", icon: "📝" },
    { key: "notifications", label: "Notifications", icon: "🔔", badge: notifications.filter(n=>!n.read).length },
    { key: "feedback", label: "Feedback", icon: "💬" },
    { key: "profile", label: "Profile", icon: "👤" },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case "overview": return <OverviewTab user={currentUser} workingCenter={workingCenter} />;
      case "mentees": return <MenteeManagementTab user={currentUser} setToast={setToast} onUserUpdate={setCurrentUser} />;
      case "impact": return <ImpactCapstoneTab user={currentUser} setToast={setToast} onUserUpdate={setCurrentUser} />;
      case "documentation": return <PDCATab user={currentUser} setToast={setToast} onUserUpdate={setCurrentUser} />;
      case "notifications": return <MentorNotificationsTab notifications={notifications} onMarkRead={handleMarkNotifRead} onMarkAllRead={handleMarkAllNotifRead} />;
      case "feedback": return <MentorFeedbackTab user={currentUser} setToast={setToast} />;
      case "profile": return <MentorProfileTab user={currentUser} onWorkingCenterChange={setWorkingCenter} onUserUpdate={setCurrentUser} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI','Inter',-apple-system,sans-serif" }}>
      <style>{globalCSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
      
      {/* Sidebar - Matching Teacher Dashboard */}
      <div style={{ width: 240, background: "white", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 12px rgba(0,0,0,0.04)", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <Logo size={120}/>
          <div style={{ textAlign: "center", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", margin: "6px auto 0", display: "inline-block", width: "fit-content" }}>
            🎓 {t("Mentor Panel")}
          </div>
        </div>
        <nav style={{ padding: "4px 10px", flex: 1 }}>
          {navItems.map(item=>(
            <button key={item.key} onClick={()=>setActiveTab(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "none", borderRadius: 10, background: activeTab===item.key?"#dbeafe":"transparent", color: activeTab===item.key?"#1e40af":"#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 2, transition: "all 0.18s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{t(item.label)}</span>
              {item.badge > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "1px 7px" }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <SidebarAvatar user={currentUser} size={34} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{currentUser.name?.split(" ")[0]}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Mentor</div>
          </div>
          <button onClick={onLogout} title={t("Sign Out")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 4 }}>⏻</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, width: "0px", minWidth: "0px", padding: "28px 32px", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab("profile")}
            title={t("My Profile")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px", borderRadius: 20,
              border: "1px solid #e2e8f0", background: "white",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
          >
            <SidebarAvatar user={currentUser} size={28} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{currentUser.name?.split(" ")[0]}</span>
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
