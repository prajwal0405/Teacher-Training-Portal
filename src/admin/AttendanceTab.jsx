import { useEffect, useMemo, useState } from "react";
import { StatCard } from "../components/Shared";
import { getTeacherAttendance } from "../services/api";

const STATUS_COLORS = {
  present: { bg: "#10b981", light: "#d1fae5", text: "#065f46" },
  late: { bg: "#f59e0b", light: "#fef3c7", text: "#92400e" },
  absent: { bg: "#ef4444", light: "#fee2e2", text: "#991b1b" },
  excused: { bg: "#8b5cf6", light: "#ede9fe", text: "#6b21a8" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Status", icon: "📋" },
  { value: "present", label: "Present", icon: "✅" },
  { value: "late", label: "Late", icon: "⏰" },
  { value: "absent", label: "Absent", icon: "❌" },
  { value: "excused", label: "Excused", icon: "📝" },
];

const S = {
  pageTitle: { fontSize: 24, fontWeight: 900, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" },
  pageSub: { fontSize: 13, color: "#64748b", margin: "0 0 24px", fontWeight: 500 },
  exportBtn: { padding: "7px 14px", background: "white", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  input: { width: "100%", padding: "9px 12px 9px 34px", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#111827" },
  tblBtn: { padding: "5px 10px", background: "white", color: "#475569", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  label: { display: "block", fontSize: 12, color: "#334155", marginBottom: 5, fontWeight: 600, letterSpacing: "0.3px" },
};

function exportCsv(rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "teacher-attendance.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceTab({ teachers = [] }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadRecords = () => {
      setLoading(true);
      getTeacherAttendance(dateFilter ? { date: dateFilter } : {})
        .then((data) => {
          setRecords(data?.records || []);
        })
        .catch((error) => {
          console.error("Failed to load teacher attendance", error);
        })
        .finally(() => {
          setLoading(false);
        });
    };
    loadRecords();
  }, [dateFilter]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const teachersMap = new Map((teachers || []).map(t => [String(t._id || t.id), {
      name: t.name || "",
      email: t.email || ""
    }]));
    return records
      .map((record) => {
        let displayNote = record.note || "";
        try {
          if (record.note && typeof record.note === "string") {
            const parsed = JSON.parse(record.note);
            if (parsed.checkedIn !== undefined || parsed.checkedOut !== undefined) {
              const hasCheckedIn = parsed.checkedIn === true || !!parsed.checkInTime;
              const hasCheckedOut = parsed.checkedOut === true || !!parsed.checkOutTime;
              if (hasCheckedIn && hasCheckedOut) {
                displayNote = `In: ${parsed.checkInTime || "recorded"} / Out: ${parsed.checkOutTime || "recorded"}`;
              } else if (hasCheckedIn) {
                displayNote = `Checked in at: ${parsed.checkInTime || "recorded"}`;
              } else {
                displayNote = "Attendance pending";
              }
            }
          }
        } catch {
          // Keep original note if JSON parsing fails
        }
        return { ...record, displayNote };
      })
      .filter((record) => {
        const teacherId = String(record.teacher?._id || record.teacherId || "");
        const teacherFromMap = teachersMap.get(teacherId);
        const teacherName = String(
          record.teacher?.name ||
          teacherFromMap?.name ||
          ""
        ).toLowerCase();
        const teacherEmail = String(
          record.teacher?.email ||
          teacherFromMap?.email ||
          ""
        ).toLowerCase();
        const matchesSearch = !query || teacherName.includes(query) || teacherEmail.includes(query) || teacherId.includes(query);
        const matchesStatus = statusFilter === "all" || record.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [records, search, statusFilter, teachers]);

  const summary = useMemo(() => ({
    total: filteredRecords.length,
    present: filteredRecords.filter((record) => record.status === "present").length,
    late: filteredRecords.filter((record) => record.status === "late").length,
    absent: filteredRecords.filter((record) => record.status === "absent").length,
    excused: filteredRecords.filter((record) => record.status === "excused").length,
  }), [filteredRecords]);

  const attendanceByTeacher = useMemo(() => {
    return teachers
      .filter((teacher) => teacher.status === "approved")
      .map((teacher) => {
        const teacherRecords = records.filter((record) => String(record.teacher?._id || record.teacher) === String(teacher._id));
        const presentCount = teacherRecords.filter((record) => ["present", "late"].includes(record.status)).length;
        const pct = teacherRecords.length ? Math.round((presentCount / teacherRecords.length) * 100) : 0;
        return { teacher, pct, count: teacherRecords.length };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [records, teachers]);

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split("T")[0];

  const displayedRecords = useMemo(() => {
    if (search || dateFilter || statusFilter !== "all") {
      return filteredRecords;
    }
    return filteredRecords.filter((r) => {
      const d = r.attendanceDate ? new Date(r.attendanceDate).toISOString().split("T")[0] : "";
      return d === today || d === yesterday || d === twoDaysAgo;
    }).slice(0, 50);
  }, [filteredRecords, search, dateFilter, statusFilter, today, yesterday, twoDaysAgo]);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Teacher Attendance</h1>
          <p style={S.pageSub}>Live teacher attendance records from the database.</p>
        </div>
        <button
          onClick={() => exportCsv([
            ["Teacher", "Email", "Date", "Status", "Source", "Latitude", "Longitude", "Note"],
            ...filteredRecords.map((record) => [
              record.teacher?.name || "",
              record.teacher?.email || "",
              record.attendanceDate ? new Date(record.attendanceDate).toLocaleDateString("en-IN") : "",
              record.status,
              record.source || "",
              record.latitude || "",
              record.longitude || "",
              record.displayNote || "",
            ]),
          ])}
          style={S.exportBtn}
        >
          Export CSV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="📊" label="Total Records" val={summary.total} color="#6366f1" bg="#e0e7ff" />
        <StatCard icon="✅" label="Present" val={summary.present} color="#10b981" bg="#d1fae5" />
        <StatCard icon="⏰" label="Late" val={summary.late} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="❌" label="Absent" val={summary.absent} color="#ef4444" bg="#fee2e2" />
        <StatCard icon="📝" label="Excused" val={summary.excused} color="#8b5cf6" bg="#ede9fe" />
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9ca3af" }}>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teacher or email..."
                style={{ ...S.input, paddingLeft: 36, marginBottom: 0, background: "white" }}
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ ...S.input, width: 150, marginBottom: 0, background: "white" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ ...S.input, width: 140, marginBottom: 0, background: "white" }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
            {(statusFilter !== "all" || dateFilter || search) && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); setDateFilter(""); }}
                style={{ ...S.tblBtn, color: "#ef4444", borderColor: "#fca5a5", padding: "6px 10px", fontSize: 12 }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading attendance records...</div>
        ) : displayedRecords.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No attendance records found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {displayedRecords.map((record) => {
              const statusColors = STATUS_COLORS[record.status] || STATUS_COLORS.present;
              const recordDate = record.attendanceDate ? new Date(record.attendanceDate) : null;
              const isToday = recordDate && recordDate.toISOString().split("T")[0] === today;
              const isYesterday = recordDate && recordDate.toISOString().split("T")[0] === yesterday;

              return (
                <div
                  key={record._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    background: isToday ? "#f0fdf4" : isYesterday ? "#fafafa" : "white",
                    borderBottom: "1px solid #f3f4f6",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${statusColors.bg}, ${statusColors.bg}cc)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 800,
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {(record.teacher?.name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                        {record.teacher?.name || "Unknown teacher"}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {record.teacher?.email || "No email"}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                        <span>📅 {recordDate ? recordDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "—"}</span>
                        <span>•</span>
                        <span>{record.source === "geo" ? "📍 Geotagged" : "📝 Manual"}</span>
                        {record.displayNote && (
                          <>
                            <span>•</span>
                            <span title={record.displayNote}>{record.displayNote.slice(0, 40)}...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        background: statusColors.light,
                        color: statusColors.text,
                      }}
                    >
                      {record.status}
                    </span>
                    {isToday && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 600,
                          background: "#d1fae5",
                          color: "#065f46",
                        }}
                      >
                        Today
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 12 }}>All Approved Teachers</div>
          {attendanceByTeacher.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>No approved teachers found</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 350, overflowY: "auto" }}>
              {attendanceByTeacher.map((item, idx) => {
                const badgeColor = item.pct >= 85 ? "#10b981" : item.pct >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={item.teacher._id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: idx === 0 ? "#fbbf24" : idx === 1 ? "#d1d5db" : idx === 2 ? "#f97316" : "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.teacher.name}
                      </div>
                      <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max(item.pct, 4)}%`,
                            background: `linear-gradient(90deg, ${badgeColor}, ${badgeColor === "#10b981" ? "#059669" : badgeColor === "#f59e0b" ? "#d97706" : "#dc2626"})`,
                            borderRadius: 3,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: badgeColor, minWidth: 45, textAlign: "right" }}>
                      {item.pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Attendance Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {[
              { label: "Present", value: summary.present, color: "#10b981" },
              { label: "Late", value: summary.late, color: "#f59e0b" },
              { label: "Absent", value: summary.absent, color: "#ef4444" },
              { label: "Excused", value: summary.excused, color: "#8b5cf6" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "16px 12px",
                  background: `${item.color}08`,
                  borderRadius: 12,
                  border: `1px solid ${item.color}30`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>{item.value}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
