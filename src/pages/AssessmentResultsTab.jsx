import { useState, useEffect } from "react";
import { S, StatCard, SearchBar } from "../components/Shared";
import { getAdminAssessmentResults } from "../services/api";

/* ══════════════════════════════════════════════════════════════
   ADMIN — Assessment Results
   Shows every teacher's assessment attempts (score, grade, course,
   warnings) so admin can monitor course-completion quality, not
   just reading completion %.
══════════════════════════════════════════════════════════════ */
export default function AssessmentResultsTab({ setToast }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");

  useEffect(() => {
    getAdminAssessmentResults()
      .then((res) => setResults(res.results || []))
      .catch((err) => setToast && setToast({ msg: err.message || "Failed to load assessment results.", type: "error" }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const courseTitles = [...new Set(results.map((r) => r.courseTitle || r.course?.title).filter(Boolean))];

  const filtered = results.filter((r) => {
    const teacherName = r.teacher?.name || "";
    const courseTitle = r.courseTitle || r.course?.title || "";
    const q = search.toLowerCase();
    const matchesSearch = teacherName.toLowerCase().includes(q) || courseTitle.toLowerCase().includes(q);
    const matchesCourse = courseFilter === "all" || courseTitle === courseFilter;
    return matchesSearch && matchesCourse;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Assessment Results...
      </div>
    );
  }

  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length) : 0;
  const passCount = results.filter((r) => (r.percentage || 0) >= 60).length;
  const flaggedCount = results.filter((r) => (r.warnings || 0) >= 3 || r.forced).length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>📝 Assessment Results</h1>
      <p style={S.pageSub}>Every teacher's proctored assessment score, synced automatically after each attempt.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="📝" label="Total Attempts" val={results.length} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="📊" label="Average Score" val={`${avgScore}%`} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Passed (≥60%)" val={passCount} color="#10b981" bg="#d1fae5" />
        <StatCard icon="⚠️" label="Flagged Attempts" val={flaggedCount} color="#ef4444" bg="#fee2e2" />
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by teacher or course..." />
        </div>
        <select style={{ ...S.input, width: 260, marginBottom: 0 }} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="all">All Courses</option>
          {courseTitles.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f1f5f9" }}>
              {["Teacher", "Course", "Score", "Grade", "Warnings", "Date"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const gradeColor = r.grade === "A+" || r.grade === "A" ? "#10b981" : r.grade === "B+" || r.grade === "B" ? "#3b82f6" : r.grade === "C" ? "#f59e0b" : "#ef4444";
              return (
                <tr key={r._id || i} style={{ borderBottom: "1px solid #f9fafb", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{r.teacher?.name || "Unknown"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151" }}>{r.courseTitle || r.course?.title}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#374151" }}>{r.score}/{r.total} ({r.percentage}%)</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: `${gradeColor}20`, color: gradeColor }}>{r.grade}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: (r.warnings || 0) >= 3 ? "#dc2626" : "#6b7280" }}>
                    {r.warnings || 0}{r.forced ? " (auto-submitted)" : ""}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af" }}>
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No assessment results yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Scores will appear here as teachers complete their assessments.</div>
          </div>
        )}
      </div>
    </div>
  );
}
