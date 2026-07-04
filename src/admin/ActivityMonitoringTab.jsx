import { useState, useEffect, useMemo } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getActivities, reviewActivity, getCenters, sendAdminNotification, getClasses, getAdminTeachers } from "../services/api";
import { t } from "../services/i18n";

// BUG FIX: was hardcoded to http://localhost:5000, which breaks in any
// non-local environment. Now reuses the same base URL the API layer uses.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const REJECT_REASONS = [
  "Incomplete documentation",
  "Missing student attendance data",
  "Photo quality insufficient",
  "Activity does not match curriculum",
  "Duplicate submission",
  "Outside scheduled class time",
  "Other",
];

const getFileUrl = (file) => {
  if (!file) return null;
  const path = file.publicUrl || file.path || (typeof file === "string" ? file : "");
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
};

const mapActivityFromApi = (a) => ({
  id: a._id || a.id,
  date: a.activityDate ? new Date(a.activityDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—",
  centerName: a.center?.name || "Unassigned Center",
  centerId: a.center?._id || a.center || "",
  teacherName: a.teacher?.name || "Unknown Teacher",
  teacherAvatar: a.teacher?.name ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(a.teacher.name)}` : null,
  className: a.class?.name || "Unassigned Class",
  description: a.description || "",
  image: a.files?.length > 0 ? getFileUrl(a.files[0]) : null,
  imageName: a.files?.length > 0 ? a.files[0].originalName || "Classroom Photo" : "Classroom Photo",
  status: a.status || "pending",
  adminComments: a.adminComments || "",
  createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
});

/* ── Activity Review Modal ── */
function ActivityReviewModal({ activity, onAction, onClose }) {
  const [comments, setComments]       = useState(activity.adminComments || "");
  const [rejectReason, setRejectReason] = useState("");
  const [otherReason, setOtherReason]   = useState("");
  const [acting, setActing]           = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // FEATURE: "Other" reason had no way to specify what it actually was —
  // it would just submit the literal word "Other" with no detail.
  const reasonIsValid = rejectReason && (rejectReason !== "Other" || otherReason.trim());

  const handleAction = async (newStatus) => {
    if (newStatus === "rejected" && !reasonIsValid) return;
    setActing(true);
    const reasonText = rejectReason === "Other" ? otherReason.trim() : rejectReason;
    const finalComments = newStatus === "rejected"
      ? `Rejected: ${reasonText}${comments ? ". " + comments : ""}`
      : comments;
    await onAction(activity.id, newStatus, finalComments);
    setActing(false);
    onClose();
  };

  const statusColor = { pending: "#f59e0b", approved: "#10b981", flagged: "#dc2626", rejected: "#ef4444" };
  const sc = statusColor[activity.status] || "#6b7280";

  return (
    <>
      {lightboxOpen && activity.image && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1100,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 24 }}>
          <img src={activity.image} alt={activity.imageName}
            style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 8,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }} />
          <button onClick={() => setLightboxOpen(false)}
            style={{ position: "absolute", top: 20, right: 24, background: "rgba(255,255,255,0.15)",
              border: "none", color: "white", fontSize: 22, width: 40, height: 40, borderRadius: "50%",
              cursor: "pointer" }}>✕</button>
        </div>
      )}
    <Modal title="🔎 Review Activity Submission" onClose={onClose}>
      {/* Current status banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `${sc}10`, border: `1px solid ${sc}30`, borderRadius: 10,
        padding: "10px 14px", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: sc }}>
          Current Status: <b>{activity.status.toUpperCase()}</b>
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{activity.date}</span>
      </div>

      {/* Detail grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { icon: "👩‍🏫", label: "Teacher", val: activity.teacherName },
          { icon: "🏢", label: "Center", val: activity.centerName },
          { icon: "🎒", label: "Class", val: activity.className },
          { icon: "📅", label: "Activity Date", val: activity.date },
        ].map((item, idx) => (
          <div key={idx} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 2 }}>{item.label}</span>
            <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{item.icon} {item.val}</span>
          </div>
        ))}
      </div>

      {/* Description */}
      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>Activity Description</label>
        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 10,
          border: "1px solid #e2e8f0", fontSize: 12, lineHeight: "1.6", color: "#334155",
          maxHeight: 100, overflowY: "auto" }}>
          {activity.description || "No description provided."}
        </div>
      </div>

      {/* Image */}
      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>Submitted Photo / Documentation</label>
        {activity.image ? (
          <div
            onClick={() => setLightboxOpen(true)}
            title="Click to view full size"
            style={{ borderRadius: 12, border: "1px solid #cbd5e1", overflow: "hidden", background: "#f1f5f9", cursor: "zoom-in", position: "relative" }}>
            <img src={activity.image} alt={activity.imageName}
              style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }} />
            <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.55)",
              color: "white", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>🔍 Click to enlarge</span>
          </div>
        ) : (
          <div style={{ background: "#fef3c7", border: "1.5px dashed #f59e0b", borderRadius: 12,
            height: 80, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, color: "#b45309", fontSize: 12, fontWeight: 600 }}>
            <span style={{ fontSize: 24 }}>📷</span>
            No image submitted — text description only
          </div>
        )}
      </div>

      {/* Reject reason (shown when clicking reject) */}
      <div style={{ marginBottom: 12 }}>
        <label style={S.label}>
          Reject Reason <span style={{ fontSize: 10, color: "#9ca3af" }}>(required only when rejecting)</span>
        </label>
        <select style={{ ...S.input }} value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
          <option value="">Select reason for rejection...</option>
          {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {rejectReason === "Other" && (
          <input
            type="text"
            style={{ ...S.input, marginTop: 8 }}
            value={otherReason}
            onChange={e => setOtherReason(e.target.value)}
            placeholder="Please specify the reason..."
            autoFocus
          />
        )}
      </div>

      {/* Admin comments */}
      <div style={{ marginBottom: 18 }}>
        <label style={S.label}>Admin Feedback / Comments (optional)</label>
        <textarea style={{ ...S.input, height: 70, resize: "none" }}
          value={comments}
          onChange={e => setComments(e.target.value)}
          placeholder="Constructive feedback, follow-up notes..." />
      </div>

      {/* Action buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <button onClick={() => handleAction("approved")} disabled={acting}
          style={{ ...S.btnGreen, padding: "10px", fontSize: 12, fontWeight: 700, opacity: acting ? 0.7 : 1 }}>
          ✅ Approve
        </button>
        <button onClick={() => handleAction("flagged")} disabled={acting}
          style={{ ...S.tblBtn, padding: "10px", fontSize: 12, fontWeight: 700, color: "#d97706", borderColor: "#fbbf24", opacity: acting ? 0.7 : 1 }}>
          🚩 Flag
        </button>
        <button onClick={() => handleAction("rejected")} disabled={acting || !reasonIsValid}
          style={{ ...S.btnRed, padding: "10px", fontSize: 12, fontWeight: 700,
            opacity: acting || !reasonIsValid ? 0.5 : 1, cursor: reasonIsValid ? "pointer" : "not-allowed" }}>
          ✕ Reject
        </button>
      </div>
      {!reasonIsValid && (
        <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", marginTop: 6 }}>
          {rejectReason === "Other" ? "Please specify a reason in the text box above" : "Select a reject reason above to enable the Reject button"}
        </div>
      )}
    </Modal>
    </>
  );
}

/* ══════════════════════════════════════════
    MAIN ACTIVITY MONITORING TAB
   ══════════════════════════════════════════ */
export default function ActivityMonitoringTab({ setToast }) {
  const [activities, setActivities] = useState([]);
  const [centers, setCenters]       = useState([]);
  const [search, setSearch]         = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActing, setBulkActing] = useState(false);
  const [loading, setLoading]       = useState(true);
  // BUG FIX: previously, a failed load left the screen permanently blank
  // with no way to retry other than refreshing the whole page.
  const [loadError, setLoadError]   = useState(null);
  const [toast, setLocalToast]      = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [actRes, centersRes] = await Promise.all([getActivities(), getCenters()]);
      const sorted = (actRes.activities || [])
        .map(mapActivityFromApi)
        .sort((a, b) => b.createdAt - a.createdAt);
      setActivities(sorted);
      setCenters(centersRes.centers || []);
    } catch (err) {
      setLoadError(err.message || "Something went wrong");
      showToast({ msg: "Failed to fetch activities: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => activities.filter(act => {
    const q = search.toLowerCase();
    const matchSearch = act.teacherName.toLowerCase().includes(q) ||
      act.description.toLowerCase().includes(q) ||
      act.className.toLowerCase().includes(q) ||
      act.centerName.toLowerCase().includes(q);
    const matchCenter = centerFilter === "all" || act.centerId === centerFilter;
    const matchStatus = statusFilter === "all" || act.status === statusFilter;
    // FEATURE: date range filter
    const matchFrom = !dateFrom || act.createdAt >= new Date(dateFrom);
    const matchTo = !dateTo || act.createdAt <= new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    return matchSearch && matchCenter && matchStatus && matchFrom && matchTo;
  }), [activities, search, centerFilter, statusFilter, dateFrom, dateTo]);

  const hasActiveFilters = search || centerFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch(""); setCenterFilter("all"); setDateFrom(""); setDateTo("");
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const pendingInView = filtered.filter(a => a.status === "pending");
  const selectAllPendingInView = () => setSelectedIds(pendingInView.map(a => a.id));
  const clearSelection = () => setSelectedIds([]);

  // FEATURE: bulk approve — admins reviewing many submissions one-by-one
  // was slow; this approves every selected pending activity in one go.
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setBulkActing(true);
    let okCount = 0, failCount = 0;
    for (const id of selectedIds) {
      try {
        await reviewActivity(id, { status: "approved", adminComments: "" });
        okCount++;
      } catch {
        failCount++;
      }
    }
    setBulkActing(false);
    setSelectedIds([]);
    showToast({
      msg: failCount === 0
        ? `${okCount} activities approved successfully!`
        : `${okCount} approved, ${failCount} failed.`,
      type: failCount === 0 ? "success" : "error",
    });
    await loadData();
  };

  const handleReviewAction = async (id, newStatus, comments) => {
    try {
      await reviewActivity(id, { status: newStatus, adminComments: comments });
      const label = newStatus === "approved" ? "approved ✅" : newStatus === "flagged" ? "flagged 🚩" : "rejected ✕";
      showToast({ msg: `Activity ${label} successfully!`, type: newStatus === "approved" ? "success" : "error" });
      await loadData();
    } catch (err) {
      showToast({ msg: "Failed to save review: " + err.message, type: "error" });
    }
  };

  const handleExportCsv = () => {
    const rows = [["Date", "Teacher", "Center", "Class", "Description", "Status", "Admin Comments"]];
    filtered.forEach(a => {
      rows.push([a.date, a.teacherName, a.centerName, a.className, a.description.substring(0, 100), a.status, a.adminComments || ""]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-monitoring-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast({ msg: `Exported ${filtered.length} activities to CSV.`, type: "success" });
  };

  const handleSendReminders = async () => {
    const overdue = filtered.filter(a => a.status === "pending");
    if (overdue.length === 0) {
      showToast({ msg: "No pending activities to send reminders for.", type: "error" });
      return;
    }
    if (!window.confirm(`Send reminder notifications to ${overdue.length} teacher(s) with pending activities?`)) return;
    let sent = 0;
    for (const act of overdue) {
      try {
        await sendAdminNotification({
          recipient: act.id,
          title: "⏰ Activity Reminder",
          body: `You have a pending activity submission for "${act.className}" at ${act.centerName}. Please complete and submit it.`,
          channel: "in_app",
        });
        sent++;
      } catch (err) {
        console.error("Reminder failed for", act.id, err);
      }
    }
    showToast({ msg: `Sent ${sent} reminder notification(s).`, type: "success" });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #fef3c7", borderTopColor: "#f59e0b", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#d97706" }}>Loading Activities...</span>
      </div>
    );
  }

  // FEATURE / BUG FIX: surfaces a retry button instead of leaving a blank
  // screen when the initial load fails (e.g. network/server error).
  if (loadError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "40vh", gap: 14, textAlign: "center" }}>
        <span style={{ fontSize: 40 }}>⚠️</span>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>Couldn't load activities</div>
        <div style={{ fontSize: 12, color: "#9ca3af", maxWidth: 320 }}>{loadError}</div>
        <button onClick={loadData} style={{ ...S.primaryBtn, padding: "9px 20px" }}>↻ Retry</button>
      </div>
    );
  }

  const pending  = activities.filter(a => a.status === "pending").length;
  const approved = activities.filter(a => a.status === "approved").length;
  const flagged  = activities.filter(a => a.status === "flagged").length;
  const rejected = activities.filter(a => a.status === "rejected").length;

  const statusConfig = {
    pending:  { color: "#f59e0b", bg: "#fef3c7" },
    approved: { color: "#10b981", bg: "#d1fae5" },
    flagged:  { color: "#dc2626", bg: "#fee2e2" },
    rejected: { color: "#6b7280", bg: "#f3f4f6" },
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {selectedActivity && (
        <ActivityReviewModal
          activity={selectedActivity}
          onAction={handleReviewAction}
          onClose={() => setSelectedActivity(null)}
        />
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 60%,#b45309 100%)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fffbeb", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>{t("Activity Monitoring")}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>{t("Submitted Activities")}</h1>
            <p style={{ fontSize: 12, margin: 0, color: "rgba(255,255,255,0.85)" }}>{approved} {t("approved")} · {pending} {t("pending")} · {activities.length} {t("total")}</p>
          </div>
          {selectedIds.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleBulkApprove} style={S.btnGreen}>{t("Approve Selected")} ({selectedIds.length})</button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="📸" label="Total Submissions" val={activities.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="⏳" label="Awaiting Review"   val={pending}           color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Approved"           val={approved}          color="#10b981" bg="#d1fae5" />
        <StatCard icon="🚩" label="Flagged"            val={flagged}           color="#dc2626" bg="#fee2e2" />
        <StatCard icon="✕" label="Rejected"            val={rejected}          color="#6b7280" bg="#f3f4f6" />
      </div>

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["all", "All"], ["pending", "⏳ Pending"], ["approved", "✅ Approved"], ["flagged", "🚩 Flagged"], ["rejected", "✕ Rejected"]].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            style={{ padding: "7px 14px", borderRadius: 20,
              border: `1.5px solid ${statusFilter === val ? (statusConfig[val]?.color || "#374151") : "#e5e7eb"}`,
              background: statusFilter === val ? (statusConfig[val]?.bg || "#f3f4f6") : "white",
              color: statusFilter === val ? (statusConfig[val]?.color || "#374151") : "#6b7280",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {label} {val !== "all" && `(${activities.filter(a => a.status === val).length})`}
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div style={{ background: "white", borderRadius: 14, padding: "12px 16px",
        border: "1px solid #f1f5f9", marginBottom: 16,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by teacher, class, center, description..." />
        </div>
        <select style={{ ...S.input, width: 200, marginBottom: 0 }} value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
          <option value="all">All Centers</option>
          {centers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
        </select>
        {/* FEATURE: date range filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ ...S.input, width: 130, marginBottom: 0 }} title="From date" />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ ...S.input, width: 130, marginBottom: 0 }} title="To date" />
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            style={{ ...S.tblBtn, color: "#ef4444", borderColor: "#fca5a5" }}>✕ Clear</button>
        )}
        <button onClick={handleExportCsv}
          style={{ ...S.tblBtn, color: "#2563eb", borderColor: "#93c5fd" }}>📥 Export CSV</button>
        <button onClick={handleSendReminders}
          style={{ ...S.tblBtn, color: "#f59e0b", borderColor: "#fcd34d" }}>🔔 Send Reminders ({filtered.filter(a => a.status === "pending").length})</button>
      </div>

      {/* FEATURE: bulk approve bar — only relevant when there are pending items in view */}
      {pendingInView.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12,
          padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center",
          gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${pendingInView.length} pending in view`}
          </span>
          {selectedIds.length === 0 ? (
            <button onClick={selectAllPendingInView} style={{ ...S.tblBtn }}>
              Select all pending in view
            </button>
          ) : (
            <>
              <button onClick={handleBulkApprove} disabled={bulkActing}
                style={{ ...S.btnGreen, opacity: bulkActing ? 0.7 : 1 }}>
                {bulkActing ? "Approving..." : `✅ Approve ${selectedIds.length} selected`}
              </button>
              <button onClick={clearSelection} disabled={bulkActing} style={{ ...S.tblBtn }}>
                Clear selection
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
        Showing {filtered.length} of {activities.length} submissions
      </div>

      {/* Activities Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
        {filtered.map(act => {
          const sc = statusConfig[act.status] || { color: "#6b7280", bg: "#f3f4f6" };
          const isSelected = selectedIds.includes(act.id);
          return (
            <div key={act.id} style={{ background: "white", borderRadius: 16,
              border: isSelected ? "2px solid #f59e0b" : "1px solid #f1f5f9",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden", display: "flex", flexDirection: "column",
              borderTop: `3px solid ${sc.color}`, position: "relative" }}>

              {/* FEATURE: bulk-select checkbox, only shown for pending items */}
              {act.status === "pending" && (
                <label style={{ position: "absolute", top: 10, left: 10, zIndex: 2,
                  width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.9)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(act.id)}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#f59e0b" }} />
                </label>
              )}

              {/* Image */}
              {act.image ? (
                <div style={{ height: 160, overflow: "hidden", background: "#f1f5f9" }}>
                  <img src={act.image} alt={act.imageName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.target.parentElement.innerHTML = '<div style="height:160px;display:flex;align-items:center;justify-content:center;background:#fef3c7;color:#b45309;font-size:12px;font-weight:700;gap:8px"><span style=\'font-size:24px\'>📝</span>Image unavailable</div>'; }} />
                </div>
              ) : (
                <div style={{ height: 160, background: `${sc.bg}`, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", color: sc.color, gap: 6 }}>
                  <span style={{ fontSize: 40 }}>📝</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Text Report Only</span>
                </div>
              )}

              {/* Body */}
              <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {act.teacherAvatar && (
                      <img src={act.teacherAvatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${sc.color}` }} />
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{act.teacherName}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{act.date}</div>
                    </div>
                  </div>
                  <StatusBadge status={act.status} />
                </div>

                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
                  🏢 {act.centerName} · <span style={{ color: "#374151" }}>{act.className}</span>
                </div>

                <p style={{ fontSize: 12, color: "#475569", margin: "0 0 12px", lineHeight: 1.5, flex: 1 }}>
                  {act.description.length > 120 ? act.description.substring(0, 120) + "..." : act.description || "No description."}
                </p>

                {act.adminComments && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                    padding: "8px 10px", fontSize: 11, color: "#334155", marginBottom: 10 }}>
                    💬 <b>Admin:</b> {act.adminComments.length > 80 ? act.adminComments.substring(0, 80) + "..." : act.adminComments}
                  </div>
                )}

                <button onClick={() => setSelectedActivity(act)}
                  style={{ ...S.primaryBtn, width: "100%", fontSize: 12, padding: "9px 12px",
                    background: act.status === "pending"
                      ? "linear-gradient(135deg,#f59e0b,#d97706)"
                      : "linear-gradient(135deg,#6b7280,#4b5563)" }}>
                  {act.status === "pending" ? "🔎 Review & Decide" : "🔎 View & Update"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No activities found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {statusFilter !== "all" ? `No ${statusFilter} activities match your filters.` : "No activity submissions yet."}
          </div>
        </div>
      )}
    </div>
  );
}
