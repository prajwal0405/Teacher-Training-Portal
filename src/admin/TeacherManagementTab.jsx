import { useState, useEffect } from "react";
import { AttendanceBar, Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getAdminTeachers, updateTeacherStatus, updateTeacherProfile, registerTeacher, getCenters } from "../services/api";

const mapTeacherFromApi = (t) => ({
  id: t._id || t.id,
  name: t.name,
  email: t.email,
  phone: t.phone || "",
  subject: t.teacherProfile?.subject || "N/A",
  address: t.teacherProfile?.address || "N/A",
  qualification: t.teacherProfile?.qualification || "N/A",
  experience: t.teacherProfile?.experience || "N/A",
  status: t.status || "pending",
  joined: t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN") : "—",
  attendance: t.teacherProfile?.performanceRating ? Math.round(t.teacherProfile.performanceRating * 20) : 85,
  classes: t.teacherProfile?.lessonsCompleted || 0,
  students: 25,
  batch: t.teacherProfile?.class?.name || "—",
  course: t.teacherProfile?.center?.name || "—",
  assignedCenter: t.teacherProfile?.center?.name || "Not Assigned",
  centerId: t.teacherProfile?.center?._id || t.teacherProfile?.center || "",
  classId: t.teacherProfile?.class?._id || t.teacherProfile?.class || "",
});

/* ── CSV Export ── */
function exportCSV(data, filename = "teachers.csv") {
  const headers = ["Name", "Email", "Phone", "Subject", "Center", "Class/Batch", "Status", "Qualification", "Experience", "Joined", "Attendance"];
  const rows = data.map(t => [
    t.name, t.email, t.phone, t.subject, t.assignedCenter || "—", t.batch || "—",
    t.status, t.qualification || "—", t.experience || "—", t.joined, t.attendance + "%"
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Reject Modal ── */
function RejectModal({ teacher, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const reasons = ["Incomplete documents", "Invalid qualification", "Duplicate account", "Suspicious activity", "Other"];
  return (
    <Modal title={`✕ Reject — ${teacher.name}`} onClose={onClose}>
      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#991b1b" }}>
        ⚠️ Teacher status will be marked as rejected.
      </div>
      <label style={S.label}>Reason *</label>
      <select style={{ ...S.input, marginBottom: 20 }} value={reason} onChange={e => setReason(e.target.value)}>
        <option value="">Select a reason...</option>
        {reasons.map(r => <option key={r}>{r}</option>)}
      </select>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { if (!reason) return; onConfirm(reason); }} style={{ ...S.btnRed, flex: 1, padding: "10px", fontSize: 13 }}>✕ Reject</button>
        <button onClick={onClose} style={{ ...S.tblBtn, flex: 1, padding: "10px", fontSize: 13 }}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ── Block Modal ── */
function BlockModal({ teacher, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const reasons = ["Policy violation", "Misconduct", "Fraudulent activity", "Repeated absence", "Other"];
  return (
    <Modal title={`🚫 Block — ${teacher.name}`} onClose={onClose}>
      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#991b1b" }}>
        ⚠️ Blocking suspends access. Teacher can be unblocked later.
      </div>
      <label style={S.label}>Reason *</label>
      <select style={{ ...S.input, marginBottom: 20 }} value={reason} onChange={e => setReason(e.target.value)}>
        <option value="">Select a reason...</option>
        {reasons.map(r => <option key={r}>{r}</option>)}
      </select>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { if (!reason) return; onConfirm(reason); }} style={{ ...S.btnRed, flex: 1, padding: "10px", fontSize: 13 }}>🚫 Block Access</button>
        <button onClick={onClose} style={{ ...S.tblBtn, flex: 1, padding: "10px", fontSize: 13 }}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ── Direct Message Modal ── */
function DirectMessageModal({ teacher, onClose, setToast }) {
  const [msg, setMsg] = useState("");
  const [channel, setChannel] = useState("in-app");
  const send = () => {
    if (!msg.trim()) { setToast({ msg: "Message cannot be empty.", type: "error" }); return; }
    setToast({ msg: `Message sent to ${teacher.name} via ${channel}!`, type: "success" });
    onClose();
  };
  return (
    <Modal title={`💬 Message — ${teacher.name}`} onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <label style={S.label}>Channel</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["in-app", "email", "sms"].map(c => (
            <button key={c} onClick={() => setChannel(c)}
              style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${channel === c ? "#f59e0b" : "#e5e7eb"}`, background: channel === c ? "#fef3c7" : "white", color: channel === c ? "#92400e" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {c === "in-app" ? "📱 In-App" : c === "email" ? "📧 Email" : "💬 SMS"}
            </button>
          ))}
        </div>
      </div>
      <label style={S.label}>To</label>
      <input style={{ ...S.input, marginBottom: 12, background: "#f3f4f6", color: "#6b7280" }} value={`${teacher.name} (${teacher.email})`} readOnly />
      <label style={S.label}>Message *</label>
      <textarea style={{ ...S.input, height: 120, resize: "none", marginBottom: 20 }} value={msg} onChange={e => setMsg(e.target.value)} placeholder={`Write a message to ${teacher.name.split(" ")[0]}...`} />
      <button onClick={send} style={{ ...S.primaryBtn, width: "100%" }}>📤 Send Message</button>
    </Modal>
  );
}

/* ── Edit Courses Modal ── */
function EditCoursesModal({ teacher, centers = [], onSave, onClose }) {
  const [selectedCenter, setSelectedCenter] = useState(teacher.centerId || "");

  const handleSave = () => {
    onSave(selectedCenter);
  };

  return (
    <Modal title={`🏫 Change Center — ${teacher.name}`} onClose={onClose}>
      <label style={S.label}>Select Training Center</label>
      <select style={{ ...S.input, marginBottom: 20 }} value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)}>
        <option value="">No Center Assigned</option>
        {centers.map(c => (
          <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
        ))}
      </select>
      <button onClick={handleSave} style={{ ...S.primaryBtn, width: "100%" }}>Save Changes</button>
    </Modal>
  );
}

/* ── Progress Report Modal ── */
function ProgressReportModal({ teacher, onClose }) {
  const modules = [
    { name: "Pre-Primary Foundation", sessions: 8, score: 92, done: true },
    { name: "Child Developmental Stages", sessions: 6, score: 85, done: true },
    { name: "Classroom Setup & Management", sessions: 10, score: 78, done: true },
    { name: "NEP 2020 Guidelines & FLN", sessions: 4, score: null, done: false },
  ];
  return (
    <Modal title={`📊 Training Report — ${teacher.name}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Lessons Done", val: teacher.classes, icon: "📋" },
          { label: "Attendance", val: `${teacher.attendance}%`, icon: "📅" },
          { label: "Score", val: "85%", icon: "⭐" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px", textAlign: "center", border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1c1917" }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Module Breakdown</div>
      {modules.map((m, i) => (
        <div key={i} style={{ marginBottom: 10, padding: "10px 14px", background: m.done ? "#ecfdf5" : "#f9fafb", borderRadius: 10, border: `1px solid ${m.done ? "#86efac" : "#f1f5f9"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: m.done ? 6 : 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{m.name}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {m.score && <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>{m.score}%</span>}
              <span style={{ fontSize: 10, color: "#9ca3af" }}>{m.sessions} sessions</span>
              <span>{m.done ? "✅" : "⏳"}</span>
            </div>
          </div>
          {m.done && (
            <div style={{ height: 5, background: "#d1fae5", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${m.score}%`, background: "#10b981", borderRadius: 4 }} />
            </div>
          )}
        </div>
      ))}
    </Modal>
  );
}

/* ── Teacher Full Profile View ── */
function TeacherProfileView({ teacher, centers = [], onBack, onUpdate, setToast }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [showReject, setShowReject] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const isPending = teacher.status === "pending";
  const isApproved = teacher.status === "approved";
  const isRejected = teacher.status === "rejected";

  const quickActions = [
    { icon: "📊", label: "Progress Report", onClick: () => setShowProgress(true), color: "#3b82f6", bg: "#dbeafe" },
    { icon: "💬", label: "Send Message", onClick: () => setShowMsg(true), color: "#8b5cf6", bg: "#ede9fe" },
    { icon: "🏫", label: "Change Center", onClick: () => setShowCourses(true), color: "#f59e0b", bg: "#fef3c7" },
    { icon: "🔒", label: "Reset Password", onClick: () => setShowReset(true), color: "#6b7280", bg: "#f3f4f6" },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {showReject && (
        <RejectModal teacher={teacher} onClose={() => setShowReject(false)}
          onConfirm={reason => {
            updateTeacherStatus(teacher.id, "rejected")
              .then(() => {
                onUpdate();
                setShowReject(false);
                setToast({ msg: "Teacher rejected successfully.", type: "error" });
              })
              .catch(err => setToast({ msg: err.message, type: "error" }));
          }} />
      )}
      {showBlock && (
        <BlockModal teacher={teacher} onClose={() => setShowBlock(false)}
          onConfirm={reason => {
            updateTeacherStatus(teacher.id, "rejected")
              .then(() => {
                onUpdate();
                setShowBlock(false);
                setToast({ msg: "Teacher blocked successfully.", type: "error" });
              })
              .catch(err => setToast({ msg: err.message, type: "error" }));
          }} />
      )}
      {showMsg && <DirectMessageModal teacher={teacher} onClose={() => setShowMsg(false)} setToast={setToast} />}
      {showProgress && <ProgressReportModal teacher={teacher} onClose={() => setShowProgress(false)} />}
      {showCourses && (
        <EditCoursesModal teacher={teacher} centers={centers} onClose={() => setShowCourses(false)}
          onSave={centerId => {
            updateTeacherProfile(teacher.id, { teacherProfile: { center: centerId } })
              .then(() => {
                onUpdate();
                setToast({ msg: "Teacher center assignment updated!", type: "success" });
                setShowCourses(false);
              })
              .catch(err => setToast({ msg: err.message, type: "error" }));
          }} />
      )}

      <button onClick={onBack} style={S.backBtn}>← Back to Teachers</button>

      {/* Profile Header */}
      <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", display: "flex", gap: 20, alignItems: "center", marginBottom: 20 }}>
        <img
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacher.name)}`}
          alt={teacher.name}
          style={{ width: 70, height: 70, borderRadius: "50%", border: "2.5px solid #f59e0b" }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1c1917", margin: 0 }}>{teacher.name}</h2>
            <StatusBadge status={teacher.status} />
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 6px" }}>{teacher.subject} Teacher · {teacher.assignedCenter}</p>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#9ca3af" }}>
            <span>📧 {teacher.email}</span>
            <span>📱 {teacher.phone}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isPending && (
            <>
              <button onClick={() => {
                updateTeacherStatus(teacher.id, "approved")
                  .then(() => { onUpdate(); setToast({ msg: "Teacher approved!", type: "success" }); })
                  .catch(err => setToast({ msg: err.message, type: "error" }));
              }} style={S.primaryBtn}>✓ Approve</button>
              <button onClick={() => setShowReject(true)} style={S.btnRed}>✕ Reject</button>
            </>
          )}
          {isApproved && (
            <button onClick={() => setShowBlock(true)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>🚫 Block Teacher</button>
          )}
          {isRejected && (
            <button onClick={() => {
              updateTeacherStatus(teacher.id, "approved")
                .then(() => { onUpdate(); setToast({ msg: "Teacher approved!", type: "success" }); })
                .catch(err => setToast({ msg: err.message, type: "error" }));
            }} style={S.primaryBtn}>✓ Approve/Reactivate</button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        {quickActions.map((act, i) => (
          <button key={i} onClick={act.onClick}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, border: "1px solid #f1f5f9", background: act.bg, color: act.color, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "transform 0.1s" }}>
            <span style={{ fontSize: 20 }}>{act.icon}</span>
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      {/* Details Tabs */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
        {["overview", "documents", "activity"].map(sec => (
          <button key={sec} onClick={() => setActiveSection(sec)}
            style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: activeSection === sec ? "2.5px solid #f59e0b" : "2.5px solid transparent", color: activeSection === sec ? "#d97706" : "#6b7280", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
            {sec}
          </button>
        ))}
      </div>

      {activeSection === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <SectionCard title="👤 Registration Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "🎓", label: "Qualification", val: teacher.qualification },
                { icon: "🏢", label: "Assigned Center", val: teacher.assignedCenter },
                { icon: "💼", label: "Experience", val: teacher.experience },
                { icon: "📅", label: "Joined", val: teacher.joined },
                { icon: "📍", label: "Address", val: teacher.address },
                { icon: "📚", label: "Course / Center Name", val: teacher.course },
                { icon: "🗂️", label: "Class Assigned", val: teacher.batch },
                { icon: "👥", label: "Students", val: teacher.students },
                { icon: "🎓", label: "Completed Lessons", val: teacher.classes },
              ].map((r, i) => (
                <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", border: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{r.icon} {r.val}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="📊 Performance Statistics">
            {isApproved ? (
              <>
                <AttendanceBar val={teacher.attendance} name="Overall Performance Rate" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                  <div style={{ background: "#d1fae5", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #86efac" }}>
                    <div style={{ fontSize: 16 }}>✅</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917" }}>{teacher.classes}</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Lessons Completed</div>
                  </div>
                  <div style={{ background: "#dbeafe", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #93c5fd" }}>
                    <div style={{ fontSize: 16 }}>📋</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917" }}>{teacher.attendance}%</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Score Rate</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 12 }}>Stats available after approval</div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeSection === "documents" && (
        <SectionCard title="📄 Uploaded Documents">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 14 }}>
            {[
              { name: "Degree Certificate", status: "verified", icon: "🎓" },
              { name: "Professional Certs", status: "verified", icon: "📜" },
              { name: "Identity Proof", status: "verified", icon: "🪪" },
            ].map((doc, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 12, padding: "14px", border: "1px solid #f1f5f9", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{doc.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>{doc.name}</div>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeSection === "activity" && (
        <SectionCard title="🕓 Activity Log">
          {[
            { action: "Registered on platform", time: teacher.joined, icon: "👤", type: "info" },
            { action: "Teacher record saved in database", time: "Just now", icon: "💾", type: "success" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: a.type === "success" ? "#d1fae5" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1917" }}>{a.action}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}

/* ── Main TeacherManagementTab Component ── */
export default function TeacherManagementTab({ setToast }) {
  const [teachers, setTeachers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newT, setNewT] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    address: "",
    qualification: "Graduate",
    experience: "Fresher",
    assignedCenter: "",
    password: ""
  });

  const showToast = setToast || console.log;

  const loadData = () => {
    setLoading(true);
    Promise.all([getAdminTeachers(), getCenters()])
      .then(([teachersRes, centersRes]) => {
        setTeachers((teachersRes.teachers || []).map(mapTeacherFromApi));
        setCenters(centersRes.centers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading teachers:", err);
        setLoading(false);
        showToast({ msg: "Failed to fetch teachers from database.", type: "error" });
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = teachers.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.phone.includes(q) || (t.subject || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchCenter = courseFilter === "all" || t.centerId === courseFilter;
    return matchSearch && matchStatus && matchCenter;
  });

  const handleAdd = e => {
    e.preventDefault();
    if (!newT.name || !newT.email || !newT.phone || !newT.subject || !newT.password) {
      showToast({ msg: "Please fill in all required fields.", type: "error" });
      return;
    }

    const payload = {
      name: newT.name,
      email: newT.email,
      phone: newT.phone,
      password: newT.password,
      qualification: newT.qualification,
      subject: newT.subject,
      experience: newT.experience,
      address: newT.address,
      center: newT.assignedCenter || undefined
    };

    registerTeacher(payload)
      .then((res) => {
        // Teacher is registered as pending. We can auto-approve them for admin convenience
        const newTeacherId = res.teacher.id || res.teacher._id;
        return updateTeacherStatus(newTeacherId, "approved");
      })
      .then(() => {
        showToast({ msg: "Teacher registered and approved in database!", type: "success" });
        setAddModal(false);
        setNewT({
          name: "", email: "", phone: "", subject: "", address: "",
          qualification: "Graduate", experience: "Fresher", assignedCenter: "", password: ""
        });
        loadData();
      })
      .catch(err => {
        console.error("Error registering teacher:", err);
        showToast({ msg: "Error: " + err.message, type: "error" });
      });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Teachers...
      </div>
    );
  }

  if (selected) {
    const freshTeacher = teachers.find(t => t.id === selected.id) || selected;
    return (
      <TeacherProfileView
        teacher={freshTeacher}
        centers={centers}
        onBack={() => { setSelected(null); loadData(); }}
        onUpdate={() => loadData()}
        setToast={showToast}
      />
    );
  }

  const pendingCount = teachers.filter(t => t.status === "pending").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Teacher Management</h1>
          <p style={S.pageSub}>{teachers.filter(t => t.status === "approved").length} approved · {pendingCount} pending registration requests</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportCSV(filtered)} style={S.tblBtn}>📤 Export CSV</button>
          <button onClick={() => setAddModal(true)} style={S.primaryBtn}>+ Add Teacher</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="👩‍🏫" label="Total Registered" val={teachers.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="✅" label="Approved Teachers" val={teachers.filter(t => t.status === "approved").length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="⏳" label="Pending Approval" val={pendingCount} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="🚫" label="Rejected / Blocked" val={teachers.filter(t => t.status === "rejected").length} color="#ef4444" bg="#fee2e2" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, phone or subject..." />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ ...S.input, width: 140, padding: "8px 12px", height: "auto" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected / Blocked</option>
          </select>
          <select style={{ ...S.input, width: 180, padding: "8px 12px", height: "auto" }} value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
            <option value="all">All Centers</option>
            {centers.map(c => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              <th style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Teacher Details</th>
              <th style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Phone</th>
              <th style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Assigned Center</th>
              <th style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Joined Date</th>
              <th style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #f9fafb", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}`}
                      alt={t.name}
                      style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f1f5f9" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>{t.phone}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>{t.assignedCenter}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "#9ca3af" }}>{t.joined}</td>
                <td style={{ padding: "12px 14px" }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setSelected(t)} style={{ ...S.tblBtn, color: "#3b82f6", borderColor: "#93c5fd" }}>👁 View Profile</button>
                    {t.status === "pending" && (
                      <button onClick={() => {
                        updateTeacherStatus(t.id, "approved")
                          .then(() => { loadData(); showToast({ msg: "Teacher approved!", type: "success" }); })
                          .catch(err => showToast({ msg: err.message, type: "error" }));
                      }} style={{ ...S.tblBtn, color: "#059669", borderColor: "#86efac" }}>✓ Approve</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No teachers found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters</div>
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
      {addModal && (
        <Modal title="Add New Teacher" onClose={() => setAddModal(false)}>
          <form onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              {[
                { key: "name", label: "Full Name *", icon: "👤", ph: "Priya Sharma" },
                { key: "subject", label: "Subject *", icon: "📘", ph: "Mathematics" },
                { key: "email", label: "Email *", icon: "📧", ph: "teacher@school.edu", type: "email" },
                { key: "phone", label: "Phone *", icon: "📱", ph: "+91 98765 43210" },
                { key: "address", label: "Address", icon: "📍", ph: "City" },
              ].map(f => (
                <div key={f.key}>
                  <label style={S.label}>{f.label}</label>
                  <div style={{ position: "relative" }}>
                    <span style={S.fieldIcon}>{f.icon}</span>
                    <input style={{ ...S.input, paddingLeft: 32 }} type={f.type || "text"} value={newT[f.key]} onChange={e => setNewT({ ...newT, [f.key]: e.target.value })} placeholder={f.ph} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={S.label}>Qualification</label>
                <select style={S.input} value={newT.qualification} onChange={e => setNewT({ ...newT, qualification: e.target.value })}>
                  {["Graduate", "Post-Graduate", "B.Ed", "D.El.Ed", "Other"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Experience</label>
                <select style={S.input} value={newT.experience} onChange={e => setNewT({ ...newT, experience: e.target.value })}>
                  {["Fresher", "1-2 yrs", "3-5 yrs", "5-10 yrs", "10+ yrs"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={S.label}>Assigned Center</label>
              <select style={S.input} value={newT.assignedCenter} onChange={(e) => setNewT({ ...newT, assignedCenter: e.target.value })}>
                <option value="">Select Center</option>
                {centers.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={S.label}>Password *</label>
              <div style={{ position: "relative" }}>
                <span style={S.fieldIcon}>🔒</span>
                <input style={{ ...S.input, paddingLeft: 32 }} type="password" value={newT.password} onChange={e => setNewT({ ...newT, password: e.target.value })} placeholder="Set a password" />
              </div>
            </div>
            <button type="submit" style={{ ...S.primaryBtn, width: "100%", marginTop: 20 }}>Add Teacher & Approve →</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
