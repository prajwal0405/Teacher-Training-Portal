import { useState, useEffect } from "react";
import { Logo, Toast, Badge, StatusBadge, StatCard, SectionCard, S, globalCSS } from "../components/Shared";
import { t, setLanguage, getLanguageList, getCurrentLanguage } from "../services/i18n";
import { getAutomationStatus, sendAttendanceReminders, autoAssignCourse, getAdminDashboard, getCourses } from "../services/api";

export default function AutomationTab({ user }) {
  const [automationStatus, setAutomationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "" });
  const [sendingReminders, setSendingReminders] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courses, setCourses] = useState([]);
  const [reminderChannel, setReminderChannel] = useState("in_app");

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    setLoading(true);
    try {
      const [statusRes, dashboardRes, coursesRes] = await Promise.all([
        getAutomationStatus(),
        getAdminDashboard(),
        getCourses(),
      ]);
      setAutomationStatus(statusRes);
      setCourses(coursesRes.courses || []);
    } catch (err) {
      console.error("Failed to load automation data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const result = await sendAttendanceReminders(reminderChannel);
      setToast({ msg: result.message || "Reminders sent successfully!", type: "success" });
      loadAutomationData();
    } catch (err) {
      setToast({ msg: err.message || "Failed to send reminders.", type: "error" });
    } finally {
      setSendingReminders(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!selectedCourse) {
      setToast({ msg: "Please select a course first.", type: "error" });
      return;
    }
    setAutoAssigning(true);
    try {
      const result = await autoAssignCourse(selectedCourse);
      setToast({ msg: result.message || "Auto-assignment completed!", type: "success" });
      setSelectedCourse("");
      loadAutomationData();
    } catch (err) {
      setToast({ msg: err.message || "Failed to auto-assign.", type: "error" });
    } finally {
      setAutoAssigning(false);
    }
  };

  const status = automationStatus?.automationStatus || {};

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#d97706" }}>🔄 Loading Automation Status...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>⚙️ Automation Center</h1>
          <p style={S.pageSub}>Monitor and control automated processes across the portal</p>
        </div>
        <button onClick={loadAutomationData} style={S.exportBtn}>🔄 Refresh Status</button>
      </div>

      {/* Automation Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard 
          icon="📍" 
          label="Attendance Reminders" 
          val={status.attendanceReminders?.pending || 0} 
          sub={`${status.attendanceReminders?.total || 0} total teachers`}
          color="#f59e0b" 
          bg="#fef3c7"
        />
        <StatCard 
          icon="📚" 
          label="Pending Assignments" 
          val={status.courseAssignments?.pending || 0} 
          sub="Awaiting completion"
          color="#3b82f6" 
          bg="#dbeafe"
        />
        <StatCard 
          icon="🔔" 
          label="Unread Notifications" 
          val={status.notifications?.unread || 0} 
          sub="Across all teachers"
          color="#ef4444" 
          bg="#fee2e2"
        />
        <StatCard 
          icon="✅" 
          label="Automation Status" 
          val="Active" 
          sub="All systems running"
          color="#10b981" 
          bg="#d1fae5"
        />
      </div>

      {/* Automation Features Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        
        {/* Attendance Auto-Reminder */}
        <SectionCard title="📍 Auto Attendance Reminders">
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
            Automatically send reminders to teachers who haven't marked attendance today.
          </p>
          
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Notification Channel</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "in_app", label: "In-App", icon: "🔔" },
                { key: "email", label: "Email", icon: "📧" },
                { key: "sms", label: "SMS", icon: "📱" },
                { key: "whatsapp", label: "WhatsApp", icon: "💬" },
                { key: "all", label: "All Channels", icon: "🌐" },
              ].map(ch => (
                <button
                  key={ch.key}
                  onClick={() => setReminderChannel(ch.key)}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "1.5px solid",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    borderColor: reminderChannel === ch.key ? "#f59e0b" : "#e5e7eb",
                    background: reminderChannel === ch.key ? "#fef3c7" : "white",
                    color: reminderChannel === ch.key ? "#92400e" : "#6b7280",
                  }}
                >
                  {ch.icon} {ch.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Teachers pending: <strong style={{ color: "#f59e0b" }}>{status.attendanceReminders?.pending || 0}</strong>
              </div>
            </div>
            <button
              onClick={handleSendReminders}
              disabled={sendingReminders || (status.attendanceReminders?.pending || 0) === 0}
              style={{
                ...S.primaryBtn,
                background: "linear-gradient(135deg,#f59e0b,#d97706)",
                opacity: (sendingReminders || (status.attendanceReminders?.pending || 0) === 0) ? 0.6 : 1,
              }}
            >
              {sendingReminders ? "Sending..." : "📤 Send Reminders"}
            </button>
          </div>

          <div style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>
              ✅ Auto-sends reminders via the selected channel to teachers who haven't checked in today.
            </div>
          </div>
        </SectionCard>

        {/* Auto Course Assignment */}
        <SectionCard title="📚 Auto Course Assignment">
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
            Automatically assign courses to teachers based on their subject specialization.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Select Course</label>
            <select
              style={{ ...S.input, padding: "10px 14px" }}
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
            >
              <option value="">-- Select a course --</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.title || "Untitled Course"}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAutoAssign}
            disabled={autoAssigning || !selectedCourse}
            style={{
              ...S.primaryBtn,
              width: "100%",
              background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
              opacity: (autoAssigning || !selectedCourse) ? 0.6 : 1,
            }}
          >
            {autoAssigning ? "Assigning..." : "🤖 Auto-Assign to Matching Teachers"}
          </button>

          <div style={{ marginTop: 16, padding: "10px 14px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>
              💡 Matching logic: Teachers with the same subject specialization as the course category will be auto-assigned.
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Automation History / Logs */}
      <SectionCard title="📋 Automation Activity Log">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
          {[
            { 
              title: "Attendance System", 
              status: "active", 
              lastRun: "Daily 9:00 AM",
              icon: "📍",
              description: "Sends reminders to teachers who haven't marked attendance"
            },
            { 
              title: "Course Notifications", 
              status: "active", 
              lastRun: "On assignment",
              icon: "📚",
              description: "Notifies teachers when new courses are assigned"
            },
            { 
              title: "Assignment Alerts", 
              status: "active", 
              lastRun: "On submission",
              icon: "📝",
              description: "Alerts admin when teachers submit assignments"
            },
            { 
              title: "OTP Password Reset", 
              status: "active", 
              lastRun: "On request",
              icon: "🔐",
              description: "SHA-256 hashed OTP for secure password resets"
            },
            { 
              title: "Multi-Language Support", 
              status: "active", 
              lastRun: "Always",
              icon: "🌐",
              description: "6 languages: EN, HI, MR, TE, KN, TA"
            },
            { 
              title: "Real-time Notifications", 
              status: "active", 
              lastRun: "Instant",
              icon: "⚡",
              description: "Socket.IO for live updates across devices"
            },
          ].map((item, i) => (
            <div key={i} style={{ 
              padding: "16px", background: "white", borderRadius: 12, 
              border: "1px solid #f1f5f9", borderLeft: "4px solid #10b981" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{item.lastRun}</div>
                </div>
                <StatusBadge status="active" />
              </div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>{item.description}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Quick Actions */}
      <SectionCard title="⚡ Quick Actions">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const allPending = status.attendanceReminders?.pending || 0;
              if (allPending > 0) {
                handleSendReminders();
              } else {
                setToast({ msg: "All teachers have marked attendance today!", type: "success" });
              }
            }}
            style={{ ...S.primaryBtn, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
          >
            📍 Send All Attendance Reminders
          </button>
          <button
            onClick={loadAutomationData}
            style={S.exportBtn}
          >
            🔄 Refresh All Status
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
