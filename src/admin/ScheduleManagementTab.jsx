import { useState, useEffect } from "react";
import { Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getAdminTeachers } from "../services/api";

// ─────────────────────────────────────────────────────────────
// 🚧 FEATURE FLAG
// Set this to `false` whenever you want to re-enable the full
// Schedule Management UI (form, list, stats, filters, etc).
// Setting it to `true` shows the "under work" placeholder instead,
// WITHOUT deleting or breaking any of the existing functionality below.
// ─────────────────────────────────────────────────────────────
const SHOW_UNDER_CONSTRUCTION = true;

// Reusable "under construction" placeholder — same visual style as
// the "Training & Lessons is under work" screen.
function UnderConstruction({ title = "This section", icon = "🎓" }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "48px 56px",
          border: "2px dashed #f59e0b",
          textAlign: "center",
          maxWidth: 460,
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
          {title} is under work
        </div>
        <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
          This section is currently being built and is not connected yet. Please check back soon — thank you for your patience!
        </div>
      </div>
    </div>
  );
}

// We need schedule APIs from api.js - inline them since they're already defined
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("spaceece_auth_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

const getAdminSchedules = () => apiRequest("/api/schedules/admin");
const getScheduleTeachers = () => apiRequest("/api/schedules/admin/teachers");
const createSchedule = (payload) =>
  apiRequest("/api/schedules", { method: "POST", body: JSON.stringify(payload) });
const updateSchedule = (id, payload) =>
  apiRequest(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
const deleteSchedule = (id) =>
  apiRequest(`/api/schedules/${id}`, { method: "DELETE" });

const STATUS_COLORS = {
  upcoming: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",
  in_progress: "#3b82f6",
};

const STATUS_BG = {
  upcoming: "#fef3c7",
  completed: "#d1fae5",
  cancelled: "#fee2e2",
  in_progress: "#dbeafe",
};

export default function ScheduleManagementTab({ setToast }) {
  // 🚧 Early-return placeholder. Flip SHOW_UNDER_CONSTRUCTION to false
  // above to restore the full, working tab instantly — nothing else
  // in this file needs to change.
  if (SHOW_UNDER_CONSTRUCTION) {
    return <UnderConstruction title="Schedule Management" icon="📅" />;
  }

  const [schedules, setSchedules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [blockedDates, setBlockedDates] = useState(() => {
    try { return JSON.parse(localStorage.getItem("spaceece_blocked_dates") || "[]"); } catch { return []; }
  });
  const [localToast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || ((msg) => setLocalToast(msg));

  const loadData = () => {
    setLoading(true);
    Promise.all([getAdminSchedules(), getScheduleTeachers()])
      .then(([schedRes, teacherRes]) => {
        setSchedules(schedRes.schedules || []);
        setTeachers(teacherRes.teachers || []);
      })
      .catch((err) => {
        showToast({ msg: "Failed to load schedules: " + err.message, type: "error" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = schedules.filter((s) => {
    const q = search.toLowerCase();
    const teacherName = s.teacher?.name || "";
    return (
      (teacherName.toLowerCase().includes(q) ||
        (s.topic || "").toLowerCase().includes(q) ||
        (s.className || "").toLowerCase().includes(q)) &&
      (filterTeacher === "all" || String(s.teacher?._id || s.teacher) === filterTeacher) &&
      (filterStatus === "all" || s.status === filterStatus)
    );
  });

  const handleSave = async (form) => {
    try {
      if (editSchedule) {
        await updateSchedule(editSchedule._id, form);
        showToast({ msg: "Schedule updated!", type: "success" });
      } else {
        await createSchedule(form);
        showToast({ msg: "Schedule created and teacher notified!", type: "success" });
      }
      setFormModal(false);
      setEditSchedule(null);
      loadData();
    } catch (err) {
      showToast({ msg: err.message || "Failed to save schedule", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this schedule?")) return;
    try {
      await deleteSchedule(id);
      showToast({ msg: "Schedule deleted.", type: "success" });
      loadData();
    } catch (err) {
      showToast({ msg: err.message, type: "error" });
    }
  };

  const handleEdit = (schedule) => {
    setEditSchedule(schedule);
    setFormModal(true);
  };

  const toggleBlockDate = (dateStr) => {
    const newBlocked = blockedDates.includes(dateStr)
      ? blockedDates.filter(d => d !== dateStr)
      : [...blockedDates, dateStr];
    setBlockedDates(newBlocked);
    localStorage.setItem("spaceece_blocked_dates", JSON.stringify(newBlocked));
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Schedules...
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={localToast.msg} type={localToast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {formModal && (
        <ScheduleFormModal
          schedule={editSchedule}
          teachers={teachers}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditSchedule(null); }}
          setToast={showToast}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Schedule Management</h1>
          <p style={S.pageSub}>Create and manage teaching schedules for teachers</p>
        </div>
        <button onClick={() => { setEditSchedule(null); setFormModal(true); }} style={S.primaryBtn}>
          + Create Schedule
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="📅" label="Total Schedules" val={schedules.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="⏳" label="Upcoming" val={schedules.filter((s) => s.status === "upcoming").length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="✅" label="Completed" val={schedules.filter((s) => s.status === "completed").length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="🚫" label="Blocked Dates" val={blockedDates.length} color="#ef4444" bg="#fee2e2" />
        <StatCard icon="👩‍🏫" label="Teachers Scheduled" val={new Set(schedules.map((s) => String(s.teacher?._id || s.teacher)).filter(Boolean)).size} color="#8b5cf6" bg="#ede9fe" />
      </div>

      {/* View Mode Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setViewMode("list")} style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${viewMode === "list" ? "#f59e0b" : "#e5e7eb"}`, background: viewMode === "list" ? "#fef3c7" : "white", color: viewMode === "list" ? "#92400e" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>📋 List View</button>
        <button onClick={() => setViewMode("calendar")} style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${viewMode === "calendar" ? "#f59e0b" : "#e5e7eb"}`, background: viewMode === "calendar" ? "#fef3c7" : "white", color: viewMode === "calendar" ? "#92400e" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🗓️ Calendar View</button>
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by teacher, topic..."
            style={S.input}
          />
        </div>
        <select style={{ ...S.input, width: 200, marginBottom: 0 }} value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}>
          <option value="all">All Teachers</option>
          {teachers.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} - {t.teacherProfile?.center?.name || ""}
            </option>
          ))}
        </select>
        <select style={{ ...S.input, width: 150, marginBottom: 0 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => { setCalMonth(m => m === 0 ? 11 : m - 1); setCalYear(y => calMonth === 0 ? y - 1 : y); }} style={{ ...S.tblBtn }}>← Prev</button>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{MONTH_NAMES[calMonth]} {calYear}</div>
            <button onClick={() => { setCalMonth(m => m === 11 ? 0 : m + 1); setCalYear(y => calMonth === 11 ? y + 1 : y); }} style={{ ...S.tblBtn }}>Next →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#9ca3af", padding: 6 }}>{d}</div>
            ))}
            {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const daySchedules = schedules.filter(s => {
                const st = s.time ? new Date(s.time).toISOString().split("T")[0] : "";
                return st === dateStr;
              });
              const isBlocked = blockedDates.includes(dateStr);
              const isToday = dateStr === new Date().toISOString().split("T")[0];
              return (
                <div key={day} onClick={() => toggleBlockDate(dateStr)} style={{
                  padding: 6, borderRadius: 8, minHeight: 60, cursor: "pointer", border: `1.5px solid ${isToday ? "#f59e0b" : isBlocked ? "#fecaca" : "#f3f4f6"}`,
                  background: isBlocked ? "#fef2f2" : isToday ? "#fffbeb" : "#fafafa",
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isBlocked ? "#dc2626" : "#374151", marginBottom: 4 }}>{day}</div>
                  {isBlocked && <div style={{ fontSize: 9, color: "#dc2626", fontWeight: 600 }}>🚫 Blocked</div>}
                  {daySchedules.slice(0, 2).map((s, si) => (
                    <div key={si} style={{ fontSize: 9, padding: "2px 4px", borderRadius: 4, background: STATUS_BG[s.status] || "#f3f4f6", color: STATUS_COLORS[s.status] || "#6b7280", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.topic || s.className || "Schedule"}
                    </div>
                  ))}
                  {daySchedules.length > 2 && <div style={{ fontSize: 8, color: "#9ca3af" }}>+{daySchedules.length - 2} more</div>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#6b7280", textAlign: "center" }}>Click a date to toggle blocked/unblocked (blocked dates are skipped by auto-generation)</div>
        </div>
      )}

      {viewMode === "list" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((s) => (
          <div
            key={s._id}
            style={{
              background: "white",
              borderRadius: 14,
              padding: "16px 20px",
              border: "1px solid #f1f5f9",
              borderLeft: `4px solid ${STATUS_COLORS[s.status] || "#e5e7eb"}`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  fontWeight: 800,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {s.teacher?.name?.[0] || "T"}
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  {s.topic || s.className || "Untitled Schedule"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>👩‍🏫 {s.teacher?.name || "Unknown Teacher"}</span>
                  <span>📅 {s.time ? new Date(s.time).toLocaleString("en-IN") : "No time set"}</span>
                  {s.room && <span>🚪 Room: {s.room}</span>}
                </div>
              </div>

              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: STATUS_BG[s.status] || "#f3f4f6",
                  color: STATUS_COLORS[s.status] || "#6b7280",
                }}
              >
                {(s.status || "upcoming").toUpperCase()}
              </span>

              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => handleEdit(s)} style={{ ...S.tblBtn }}>
                  ✏️ Edit
                </button>
                <button
                  onClick={() => {
                    const nextStatus = s.status === "upcoming" ? "in_progress" : s.status === "in_progress" ? "completed" : "upcoming";
                    updateSchedule(s._id, { status: nextStatus }).then(() => {
                      showToast({ msg: `Status changed to ${nextStatus}`, type: "success" });
                      loadData();
                    }).catch(err => {
                      showToast({ msg: err.message || "Failed to update status.", type: "error" });
                    });
                  }}
                  style={{ ...S.tblBtn, color: "#2563eb", borderColor: "#bfdbfe" }}
                >
                  {s.status === "completed" ? "🔄 Reset" : s.status === "in_progress" ? "✓ Complete" : "▶ Start"}
                </button>
                <button onClick={() => handleDelete(s._id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  🗑️
                </button>
              </div>
            </div>
            {s.notes && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>📝 {s.notes}</div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No schedules found</div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function ScheduleFormModal({ schedule, teachers = [], onSave, onClose, setToast }) {
  const isEdit = !!schedule;
  const formatTimeForInput = (time) => {
    if (!time) return "";
    const d = new Date(time);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    teacherId: schedule?.teacher?._id || schedule?.teacher || "",
    className: schedule?.className || "",
    time: formatTimeForInput(schedule?.time) || "",
    topic: schedule?.topic || "",
    room: schedule?.room || "",
    status: schedule?.status || "upcoming",
    notes: schedule?.notes || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.teacherId || !form.topic) {
      setToast({ msg: "Teacher and topic are required.", type: "error" });
      return;
    }
    onSave({
      ...form,
      time: form.time ? new Date(form.time).toISOString() : new Date().toISOString(),
    });
  };

  return (
    <Modal title={isEdit ? "✏️ Edit Schedule" : "📅 Create Schedule for Teacher"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Select Teacher *</label>
        <select
          style={{ ...S.input, marginBottom: 12 }}
          value={form.teacherId}
          onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
          required
        >
          <option value="">Choose a teacher...</option>
          {teachers.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} — {t.email}
            </option>
          ))}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Class Name</label>
            <input
              style={S.input}
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
              placeholder="e.g. Nursery A"
            />
          </div>
          <div>
            <label style={S.label}>Room / Location</label>
            <input
              style={S.input}
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              placeholder="e.g. Room 101"
            />
          </div>
        </div>

        <label style={S.label}>Topic / Subject *</label>
        <input
          style={{ ...S.input, marginBottom: 12 }}
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          placeholder="e.g. Phonics Lesson - Week 3"
          required
        />

        <label style={S.label}>Date & Time</label>
        <input
          type="datetime-local"
          style={{ ...S.input, marginBottom: 12 }}
          value={form.time}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
        />

        <label style={S.label}>Status</label>
        <select
          style={{ ...S.input, marginBottom: 12 }}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="upcoming">Upcoming</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <label style={S.label}>Notes (optional)</label>
        <textarea
          style={{ ...S.input, height: 70, resize: "none", marginBottom: 20 }}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any instructions or notes for the teacher..."
        />

        <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>
          {isEdit ? "Update Schedule →" : "Create & Notify Teacher →"}
        </button>
      </form>
    </Modal>
  );
}