import { useState, useEffect, useMemo } from "react";
import { S, SearchBar, SectionCard, StatCard } from "../components/Shared";
import { getAdminAssessmentResults } from "../services/api";

export default function AssessmentManagementTab({ setToast }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const showToast = setToast || (() => {});

  useEffect(() => {
    setLoading(true);
    getAdminAssessmentResults()
      .then((res) => {
        setResults(res.results || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load assessment results:", err);
        showToast({ msg: "Failed to load assessment results.", type: "error" });
        setLoading(false);
      });
  }, [showToast]);

  // Aggregate results by course/libraryId
  const aggregatedStats = useMemo(() => {
    const stats = {};
    results.forEach(r => {
      const key = r.libraryId || r.courseId || "unknown";
      if (!stats[key]) {
        stats[key] = {
          title: r.libraryTitle || r.courseTitle || r.libraryId || "Unknown Course",
          attempts: 0,
          totalScore: 0,
          totalPossible: 0,
          passCount: 0,
          passMark: 60 // Assuming 60% is standard pass mark
        };
      }
      stats[key].attempts += 1;
      stats[key].totalScore += (r.score || 0);
      stats[key].totalPossible += (r.total || 10);
      
      const pct = r.total ? ((r.score || 0) / r.total) * 100 : (r.percentage || 0);
      if (pct >= stats[key].passMark) {
        stats[key].passCount += 1;
      }
    });

    return Object.values(stats).map(stat => ({
      ...stat,
      avgScore: stat.totalPossible > 0 ? Math.round((stat.totalScore / stat.totalPossible) * 100) : 0,
      passRate: stat.attempts > 0 ? Math.round((stat.passCount / stat.attempts) * 100) : 0
    }));
  }, [results]);

  const filtered = aggregatedStats.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalAttempts = aggregatedStats.reduce((a, x) => a + x.attempts, 0);
  const avgOverallScore = aggregatedStats.length
    ? Math.round(aggregatedStats.reduce((a, x) => a + x.avgScore, 0) / aggregatedStats.length)
    : 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Assessment Results</h1>
          <p style={S.pageSub}>Track teacher performance across completed proctored assessments</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard icon="🧠" label="Active Quizzes" val={aggregatedStats.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="👥" label="Total Attempts" val={totalAttempts} color="#06b6d4" bg="#cffafe" />
        <StatCard icon="📈" label="Avg Score" val={`${avgOverallScore}%`} color="#8b5cf6" bg="#ede9fe" />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by course name..." />

      <SectionCard title="📊 Aggregated Results">
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>⏳ Loading results...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>No assessment results found.</div>
        ) : (
          filtered.map((a, idx) => (
            <div key={idx} style={{ marginBottom: 16, padding: "12px 16px", border: "1px solid #f1f5f9", borderRadius: 12, background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{a.title}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: a.avgScore >= a.passMark ? "#10b981" : "#ef4444" }}>
                  Avg {a.avgScore}% · {a.attempts} {a.attempts === 1 ? "attempt" : "attempts"}
                </span>
              </div>
              <div style={{ height: 10, background: "#f3f4f6", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${a.avgScore}%`, background: a.avgScore >= a.passMark ? "#10b981" : "#f59e0b", borderRadius: 6 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>
                <span>Pass mark: {a.passMark}%</span>
                <span>Pass rate: {a.passRate}% ({a.passCount} passed)</span>
              </div>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}
