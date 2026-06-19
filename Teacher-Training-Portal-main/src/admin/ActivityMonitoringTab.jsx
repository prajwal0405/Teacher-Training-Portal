import { useState } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";

// Mock data structured with context fields, placeholders for images, and operational status workflows
const MOCK_ACTIVITIES = [
  {
    id: 1,
    date: "2026-06-11",
    centerName: "SpacECE Preschool — Pune Central",
    centerId: 1,
    teacherName: "Priya Sharma",
    className: "Nursery - A",
    description: "Conducted an interactive finger-painting workshop today focused on primary color mixing techniques. Children successfully combined yellow and blue to create various shades of green.",
    image: "🎨 Finger-Painting Session Photo",
    status: "pending",
    adminComments: ""
  },
  {
    id: 2,
    date: "2026-06-10",
    centerName: "SpacECE Preschool — Mumbai West",
    centerId: 2,
    teacherName: "Rahul Verma",
    className: "Kindergarten 1",
    description: "Organized a mini indoor phonics reading tree session. Kids match high-frequency sight words to corresponding branches on our interactive physical cardboard tree model.",
    image: "🌳 Interactive Word Tree Photo",
    status: "approved",
    adminComments: "Excellent use of physical props to reinforce literacy foundations!"
  },
  {
    id: 3,
    date: "2026-06-09",
    centerName: "SpacECE Preschool — Pune Central",
    centerId: 1,
    teacherName: "Meera Patel",
    className: "Playgroup",
    description: "Outdoor dynamic obstacle course setup involving balancing blocks, safe stepping stones, and simple running exercises to monitor fine and gross motor skill adjustments.",
    image: "🏃 Physical Development Grid Photo",
    status: "flagged",
    adminComments: "Please ensure all safety crash mats are fully visible in the photographic confirmation next time."
  }
];

const MOCK_CENTERS = [
  { id: 1, name: "SpacECE Preschool — Pune Central" },
  { id: 2, name: "SpacECE Preschool — Mumbai West" },
  { id: 4, name: "SpacECE Preschool — Delhi NCR" },
];

/* ── Activity Process/Detail Modal ── */
function ActivityReviewModal({ activity, onAction, onClose }) {
  const [comments, setComments] = useState(activity.adminComments || "");

  const handleStatusUpdate = (newStatus) => {
    onAction(activity.id, newStatus, comments);
    onClose();
  };

  return (
    <Modal title="🔎 Review Classroom Activity Submission" onClose={onClose}>
      {/* Detail Fields Matrix Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { icon: "📅", label: "Date", val: activity.date },
          { icon: "🏢", label: "Center Context", val: activity.centerName },
          { icon: "👩‍🏫", label: "Teacher", val: activity.teacherName },
          { icon: "🎒", label: "Class Target", val: activity.className },
        ].map((item, idx) => (
          <div key={idx} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 2 }}>{item.label}</span>
            <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{item.icon} {item.val}</span>
          </div>
        ))}
      </div>

      {/* Description Content Box */}
      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>Activity Description Summary</label>
        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12, lineHeight: "1.5", color: "#334155" }}>
          {activity.description}
        </div>
      </div>

      {/* Mock Uploaded Media Reference Box */}
      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>Uploaded Documentation Media</label>
        <div style={{ background: "#f0fdf4", border: "1.5px dashed #10b981", borderRadius: 12, height: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#047857" }}>
          <span style={{ fontSize: 24, marginBottom: 4 }}>📸</span>
          <b style={{ fontSize: 12 }}>{activity.image}</b>
          <span style={{ fontSize: 10, color: "#065f46", marginTop: 2 }}>Asset Verified Securely via Cloud Registry</span>
        </div>
      </div>

      {/* Admin Review Workspace Feedback Form */}
      <div style={{ marginBottom: 18 }}>
        <label style={S.label}>Admin Feedback Comments</label>
        <textarea 
          style={{ ...S.input, height: 60, resize: "none" }} 
          value={comments} 
          onChange={e => setComments(e.target.value)} 
          placeholder="Add modification notes, positive reinforcement feedback, or reason for flagging..."
        />
      </div>

      {/* Action Footbar System */}
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
        <button onClick={() => handleStatusUpdate("flagged")} style={{ ...S.primaryBtn, flex: 1, background: "#dc2626", borderColor: "#b91c1c" }}>
          🚩 Flag Review Flag
        </button>
        <button onClick={() => handleStatusUpdate("approved")} style={{ ...S.primaryBtn, flex: 1.5, background: "#16a34a", borderColor: "#15803d" }}>
          ✅ Authorize & Approve
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MAIN ACTIVITY MONITORING TAB
══════════════════════════════════════════ */
export default function ActivityMonitoringTab({ setToast }) {
  const [activities, setActivities] = useState(MOCK_ACTIVITIES);
  const [search, setSearch] = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [reviewTarget, setReviewTarget] = useState(null);
  const [toast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  // Evaluation filtering framework execution
  const filtered = activities.filter(act => {
    const q = search.toLowerCase();
    const matchSearch = act.description.toLowerCase().includes(q) || act.teacherName.toLowerCase().includes(q) || act.className.toLowerCase().includes(q);
    const matchCenter = centerFilter === "all" || act.centerId === Number(centerFilter);
    const matchStatus = statusFilter === "all" || act.status === statusFilter;
    return matchSearch && matchCenter && matchStatus;
  });

  const handleReviewAction = (id, nextStatus, nextComments) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus, adminComments: nextComments } : a));
    showToast({ 
      msg: nextStatus === "approved" ? "Activity successfully approved and finalized!" : "Activity flagged for verification follow-up.", 
      type: nextStatus === "approved" ? "success" : "error" 
    });
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {reviewTarget && (
        <ActivityReviewModal
          activity={reviewTarget}
          onAction={handleReviewAction}
          onClose={() => setReviewTarget(null)}
        />
      )}

      {/* Header Profile Dashboard Overview */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={S.pageTitle}>Classroom Activity Monitoring</h1>
        <p style={S.pageSub}>Audit real-time lesson execution proof, supply feedback, and authorize structural classroom records.</p>
      </div>

      {/* Metric Counters Tracker Display */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="⏳" label="Pending Audit" val={activities.filter(a => a.status === "pending").length} color="#d97706" bg="#fef3c7" />
        <StatCard icon="🟢" label="Approved Assets" val={activities.filter(a => a.status === "approved").length} color="#16a34a" bg="#d1fae5" />
        <StatCard icon="🚩" label="Flagged Follow-ups" val={activities.filter(a => a.status === "flagged").length} color="#dc2626" bg="#fee2e2" />
      </div>

      {/* Filter Management Command Deck */}
      <div style={{ background: "white", padding: 14, borderRadius: 14, border: "1px solid #f1f5f9", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search by description keyword, teacher name, class..." />
          </div>
          
          <div style={{ display: "flex", gap: 8 }}>
            <select 
              style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 12, fontWeight: 600, background: "white" }}
              value={centerFilter} onChange={e => setCenterFilter(e.target.value)}
            >
              <option value="all">📍 All Centers</option>
              {MOCK_CENTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select 
              style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 12, fontWeight: 600, background: "white" }}
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">🔍 All Statuses</option>
              <option value="pending">⏳ Pending Audit</option>
              <option value="approved">🟢 Approved</option>
              <option value="flagged">🚩 Flagged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submission Card Grid Engine Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
        {filtered.map(act => (
          <div key={act.id} style={{ background: "white", borderRadius: 18, padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "relative" }}>
            
            {/* Upper Context Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>📅 {act.date} · 🎒 {act.className}</div>
              <StatusBadge status={act.status} />
            </div>

            {/* Middle Block Data fields */}
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>🧑‍🏫 Teacher: {act.teacherName}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>🏢 {act.centerName}</div>
            
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 14px 0", lineHeight: "1.4", height: "50px", overflow: "hidden", textOverflow: "ellipsis" }}>
              {act.description}
            </p>

            {/* Small Quick-media block banner preview line */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#0f766e", marginBottom: 14 }}>
              📸 Asset Check: {act.image}
            </div>

            {/* Display active comments directly if mapped on record check */}
            {act.adminComments && (
              <div style={{ fontSize: 11, background: "#f1f5f9", padding: "8px 10px", borderRadius: 6, color: "#475569", marginBottom: 14, borderLeft: "3px solid #64748b" }}>
                <b>Feedback Note:</b> {act.adminComments}
              </div>
            )}

            {/* Action Row Entry Button */}
            <button onClick={() => setReviewTarget(act)} style={{ ...S.primaryBtn, width: "100%", padding: "8px", fontSize: 12, background: act.status === "pending" ? "#2563eb" : "#f1f5f9", color: act.status === "pending" ? "white" : "#475569", borderColor: act.status === "pending" ? "#1d4ed8" : "#cbd5e1" }}>
              {act.status === "pending" ? "⚖️ Review & Process Action" : "👁 View Complete Workspace Audit"}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No classroom activity logs matching configurations found</div>
        </div>
      )}
    </div>
  );
}