import { useEffect, useMemo, useState } from "react";
import { StatCard, SectionCard } from "../components/Shared";
import { getTeacherAttendance, sendAdminNotification } from "../services/api";

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
  primaryBtn: { padding: "8px 16px", background: "#f59e0b", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
};

function exportCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const MiniBarChart = ({ data, color = "#f59e0b", height = 100 }) => {
  const max = Math.max(...data.map(d => d.val || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height, padding: "0 2px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#374151" }}>{d.val || 0}</span>
          <div style={{ width: "100%", height: `${Math.max(((d.val || 0) / max) * 100, 4)}%`, background: color, borderRadius: 3, transition: "height 0.3s" }} />
          <span style={{ fontSize: 8, color: "#9ca3af", fontWeight: 600 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function AttendanceTab({ teachers = [] }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getTeacherAttendance(dateFilter ? { date: dateFilter } : {})
      .then((data) => setRecords(data?.records || []))
      .catch((error) => console.error("Failed to load teacher attendance", error))
      .finally(() => setLoading(false));
  }, [dateFilter]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const teacherName = String(record.teacher?.name || "").toLowerCase();
      const teacherEmail = String(record.teacher?.email || "").toLowerCase();
      const matchesSearch = !query || teacherName.includes(query) || teacherEmail.includes(query);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const summary = useMemo(() => ({
    total: filteredRecords.length,
    present: filteredRecords.filter((r) => r.status === "present").length,
    late: filteredRecords.filter((r) => r.status === "late").length,
    absent: filteredRecords.filter((r) => r.status === "absent").length,
    excused: filteredRecords.filter((r) => r.status === "excused").length,
  }), [filteredRecords]);

  const attendanceByTeacher = useMemo(() => {
    return teachers
      .filter((t) => t.status === "approved")
      .map((teacher) => {
        const teacherRecords = records.filter((r) => String(r.teacher?._id || r.teacher) === String(teacher._id));
        const presentCount = teacherRecords.filter((r) => ["present", "late"].includes(r.status)).length;
        const pct = teacherRecords.length ? Math.round((presentCount / teacherRecords.length) * 100) : 0;
        return { teacher, pct, count: teacherRecords.length, absentCount: teacherRecords.filter(r => r.status === "absent").length };
      })
      .sort((a, b) => a.pct - b.pct);
  }, [records, teachers]);

  /* ── Absent Teacher Flagging ── */
  const flaggedTeachers = useMemo(() => {
    return attendanceByTeacher.filter(item => {
      if (item.count === 0) return true; // No attendance records at all
      if (item.pct < 50) return true; // Less than 50% attendance
      // Check for 3+ consecutive absences
      const teacherRecords = records
        .filter(r => String(r.teacher?._id || r.teacher) === String(item.teacher._id))
        .sort((a, b) => new Date(b.attendanceDate) - new Date(a.attendanceDate));
      let consecutive = 0;
      for (const r of teacherRecords.slice(0, 5)) {
        if (r.status === "absent") consecutive++;
        else break;
      }
      return consecutive >= 3;
    });
  }, [attendanceByTeacher, records]);

  /* ── Weekly Trend Data (last 4 weeks) ── */
  const weeklyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (3 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekRecords = records.filter(r => {
        const d = r.attendanceDate ? new Date(r.attendanceDate) : null;
        return d && d >= weekStart && d <= weekEnd;
      });
      const present = weekRecords.filter(r => ["present", "late"].includes(r.status)).length;
      const total = weekRecords.length || 1;
      return {
        label: `W${4 - i}`,
        present,
        absent: weekRecords.filter(r => r.status === "absent").length,
        total: weekRecords.length,
        pct: Math.round((present / total) * 100),
      };
    });
  }, [records]);

  /* ── Daily Trend (last 7 days) ── */
  const dailyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toISOString().split("T")[0];
      const dayRecords = records.filter(r => {
        const rd = r.attendanceDate ? new Date(r.attendanceDate).toISOString().split("T")[0] : "";
        return rd === dayStr;
      });
      const present = dayRecords.filter(r => ["present", "late"].includes(r.status)).length;
      return {
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        val: present,
        absent: dayRecords.filter(r => r.status === "absent").length,
        total: dayRecords.length,
      };
    });
  }, [records]);

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Teacher Attendance</h1>
          <p style={S.pageSub}>Live attendance records with trend analysis and absent-teacher flagging.</p>
        </div>
        <button onClick={() => exportCsv("teacher-attendance.csv", [
          ["Teacher", "Email", "Date", "Status", "Source", "Note"],
          ...filteredRecords.map(r => [r.teacher?.name || "", r.teacher?.email || "", r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString("en-IN") : "", r.status, r.source || "", r.note || ""])
        ])} style={S.exportBtn}>📥 Export CSV</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="📊" label="Total Records" val={summary.total} color="#6366f1" bg="#e0e7ff" />
        <StatCard icon="✅" label="Present" val={summary.present} color="#10b981" bg="#d1fae5" />
        <StatCard icon="⏰" label="Late" val={summary.late} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="❌" label="Absent" val={summary.absent} color="#ef4444" bg="#fee2e2" />
        <StatCard icon="🚨" label="Flagged Teachers" val={flaggedTeachers.length} color="#dc2626" bg="#fee2e2" />
      </div>

      {/* Trend Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>📈 Daily Attendance (Last 7 Days)</div>
          <MiniBarChart data={dailyTrend} color="#3b82f6" height={120} />
        </div>
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>📊 Weekly Trend (Last 4 Weeks)</div>
          <MiniBarChart data={weeklyTrend.map(w => ({ label: w.label, val: w.pct }))} color="#10b981" height={120} />
          <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center" }}>
            {weeklyTrend.map((w, i) => (
              <div key={i} style={{ fontSize: 10, color: "#6b7280", textAlign: "center" }}>
                <span style={{ fontWeight: 700 }}>{w.pct}%</span> ({w.total} rec)
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flagged Teachers Alert */}
      {flaggedTeachers.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#991b1b" }}>Absent Teachers Flagged ({flaggedTeachers.length})</span>
          </div>
          <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 12 }}>Teachers with &lt;50% attendance or 3+ consecutive absences need attention.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {flaggedTeachers.map(item => (
              <div key={item.teacher._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", borderRadius: 10, padding: "10px 14px", border: "1px solid #fecaca" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#991b1b" }}>
                    {item.teacher.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{item.teacher.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{item.count} records · {item.pct}% attendance · {item.absentCount} absences</div>
                  </div>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#991b1b" }}>
                  {item.count === 0 ? "No Records" : item.pct < 50 ? "Low Attendance" : "Consecutive Absent"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9ca3af" }}>🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teacher or email..."
                style={{ ...S.input, paddingLeft: 36, marginBottom: 0, background: "white" }} />
            </div>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              style={{ ...S.input, width: 150, marginBottom: 0, background: "white" }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ ...S.input, width: 140, marginBottom: 0, background: "white" }}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
              ))}
            </select>
            {(statusFilter !== "all" || dateFilter || search) && (
              <button onClick={() => { setSearch(""); setStatusFilter("all"); setDateFilter(""); }}
                style={{ ...S.tblBtn, color: "#ef4444", borderColor: "#fca5a5", padding: "6px 10px" }}>✕ Clear</button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading attendance records...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No attendance records found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {filteredRecords.slice(0, 100).map((record) => {
              const statusColors = STATUS_COLORS[record.status] || STATUS_COLORS.present;
              const recordDate = record.attendanceDate ? new Date(record.attendanceDate) : null;
              const isToday = recordDate && recordDate.toISOString().split("T")[0] === today;
              return (
                <div key={record._id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 20px", background: isToday ? "#f0fdf4" : "white",
                  borderBottom: "1px solid #f3f4f6",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${statusColors.bg}, ${statusColors.bg}cc)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0,
                    }}>
                      {(record.teacher?.name || "T")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{record.teacher?.name || "Unknown"}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        📅 {recordDate ? recordDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "—"}
                        · {record.source === "geo" ? "📍 Geo" : "📝 Manual"}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    textTransform: "capitalize", background: statusColors.light, color: statusColors.text,
                  }}>{record.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teacher Attendance Rankings */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, marginTop: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 12 }}>👩‍🏫 Teacher Attendance Rankings</div>
        {attendanceByTeacher.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 13 }}>No approved teachers found</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto" }}>
            {attendanceByTeacher.map((item, idx) => {
              const badgeColor = item.pct >= 85 ? "#10b981" : item.pct >= 60 ? "#f59e0b" : "#ef4444";
              const isFlagged = flaggedTeachers.some(f => f.teacher._id === item.teacher._id);
              return (
                <div key={item.teacher._id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 10,
                  background: isFlagged ? "#fef2f2" : "#f9fafb",
                  border: isFlagged ? "1px solid #fecaca" : "1px solid #f3f4f6",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: idx === 0 ? "#fbbf24" : idx === 1 ? "#d1d5db" : idx === 2 ? "#f97316" : "#e5e7eb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: idx < 3 ? 14 : 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.teacher.name}</span>
                      {isFlagged && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#fee2e2", color: "#991b1b", fontWeight: 700 }}>⚠️ FLAGGED</span>}
                    </div>
                    <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                      <div style={{
                        height: "100%", width: `${Math.max(item.pct, 4)}%`,
                        background: badgeColor, borderRadius: 3, transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: badgeColor, minWidth: 45, textAlign: "right" }}>{item.pct}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
