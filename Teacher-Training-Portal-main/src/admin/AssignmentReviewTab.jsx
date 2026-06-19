import { useState } from "react";
import { Modal, S, Toast } from "../components/Shared";
import { MOCK_ATTENDANCE_RECORDS } from "../data/mockData";
import { AR_BTN_GHOST, AR_BTN_PRIMARY, AR_CLOSE, AR_HDR, AR_MODAL, AR_OVERLAY } from "./adminStyles";
/* ── A6: Assignment Review ── */
export default function AssignmentReviewTab({ assignments, setAssignments, setToast }) {
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [courseFilter,  setCourseFilter]  = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [sortBy,        setSortBy]        = useState("date");
  const [search,        setSearch]        = useState("");
  const [selected,      setSelected]      = useState(null);
  const [activePanel,   setActivePanel]   = useState("review"); // review | pdf | rubric
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiSuggestion,  setAiSuggestion]  = useState("");
  const [annoColor,     setAnnoColor]     = useState("#f59e0b");
  const [annoText,      setAnnoText]      = useState("");
  const [annoPage,      setAnnoPage]      = useState(1);
  const [addAnnoMode,   setAddAnnoMode]   = useState(false);
  const [assignModal,   setAssignModal]   = useState(null);
  const [assignTrainer, setAssignTrainer] = useState("");
 
  const TRAINERS = ["Dr. Rekha Iyer", "Prof. Amol Desai", "Ms. Geeta Rao", "Dr. Vikram Shah", "Mr. Sunil Mehta"];
  const ALL_COURSES = [...new Set(assignments.map(a => a.course))];
  const STATUS_COLOR = { pending: "#f59e0b", "under review": "#3b82f6", reviewed: "#10b981", revision: "#ef4444", approved: "#7c3aed" };
  const STATUS_BG    = { pending: "#fef9c3", "under review": "#dbeafe", reviewed: "#d1fae5", revision: "#fee2e2", approved: "#ede9fe" };
 
  // ── Filter + Sort ──
  const filtered = assignments
    .filter(a => {
      const q = search.toLowerCase();
      const matchSearch  = a.teacher.toLowerCase().includes(q) || a.title.toLowerCase().includes(q) || a.course.toLowerCase().includes(q);
      const matchStatus  = statusFilter  === "all" || a.status  === statusFilter;
      const matchCourse  = courseFilter  === "all" || a.course  === courseFilter;
      const matchTrainer = trainerFilter === "all" || a.trainer === trainerFilter;
      return matchSearch && matchStatus && matchCourse && matchTrainer;
    })
    .sort((a, b) => {
      if (sortBy === "date")    return new Date(b.submittedDate) - new Date(a.submittedDate);
      if (sortBy === "course")  return a.course.localeCompare(b.course);
      if (sortBy === "batch")   return a.batch.localeCompare(b.batch);
      if (sortBy === "status")  return a.status.localeCompare(b.status);
      return 0;
    });
 
  // ── Actions ──
  const updateAssignment = (id, changes) => {
    setAssignments(p => p.map(a => a.id === id ? { ...a, ...changes } : a));
    if (selected?.id === id) setSelected(s => ({ ...s, ...changes }));
  };
 
  const updateRubricScore = (id, index, score) => {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    const rubric = a.rubric.map((r, i) => i === index ? { ...r, score: score === "" ? null : Math.min(Number(score), r.maxScore) } : r);
    const total = rubric.reduce((sum, r) => sum + (r.score || 0), 0);
    updateAssignment(id, { rubric, score: total });
  };
 
  const handleApprove = id => {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    const rubricComplete = a.rubric.every(r => r.score !== null);
    if (!rubricComplete) { setToast({ msg: "Please fill all rubric scores first.", type: "error" }); return; }
    if (!a.feedback.trim()) { setToast({ msg: "Please add written feedback before approving.", type: "error" }); return; }
    updateAssignment(id, { status: "approved", reviewedBy: "Admin" });
    setToast({ msg: "Assignment approved! ✓", type: "success" });
  };
 
  const handleRevision = id => {
    const a = assignments.find(x => x.id === id);
    if (!a?.feedback.trim()) { setToast({ msg: "Add feedback before requesting revision.", type: "error" }); return; }
    updateAssignment(id, { status: "revision", reviewedBy: "Admin" });
    setToast({ msg: "Revision requested. Teacher notified.", type: "error" });
  };
 
  const handleMarkUnderReview = id => {
    updateAssignment(id, { status: "under review", reviewedBy: "Admin" });
    setToast({ msg: "Marked as Under Review.", type: "success" });
  };
 
  const handleNotify = id => {
    updateAssignment(id, { notified: true });
    setToast({ msg: "Teacher notified via email & in-app! 📨", type: "success" });
  };
 
  const handleAssignTrainer = id => {
    if (!assignTrainer) { setToast({ msg: "Select a trainer.", type: "error" }); return; }
    updateAssignment(id, { trainer: assignTrainer, status: "under review" });
    setAssignModal(null);
    setAssignTrainer("");
    setToast({ msg: `Assigned to ${assignTrainer}!`, type: "success" });
  };
 
  const addAnnotation = id => {
    if (!annoText.trim()) { setToast({ msg: "Annotation text cannot be empty.", type: "error" }); return; }
    const a = assignments.find(x => x.id === id);
    const newAnno = { id: Date.now(), page: annoPage, x: Math.round(Math.random() * 60 + 10), y: Math.round(Math.random() * 60 + 10), text: annoText, color: annoColor };
    updateAssignment(id, { annotations: [...(a?.annotations || []), newAnno] });
    setAnnoText("");
    setAddAnnoMode(false);
    setToast({ msg: "Annotation added!", type: "success" });
  };
 
  const removeAnnotation = (assignId, annoId) => {
    const a = assignments.find(x => x.id === assignId);
    updateAssignment(assignId, { annotations: a.annotations.filter(n => n.id !== annoId) });
  };
 
  const runAiFeedback = async id => {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    setAiLoading(true);
    setAiSuggestion("");
    await new Promise(r => setTimeout(r, 2000));
    const totalScore = a.rubric.reduce((s, r) => s + (r.score || 0), 0);
    const maxScore   = a.rubric.reduce((s, r) => s + r.maxScore, 0);
    const pct = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;
    let suggestion = "";
    if (pct >= 85) {
      suggestion = `Dear ${a.teacher.split(" ")[0]},\n\nExcellent work on "${a.title}"! Your submission demonstrates a strong grasp of the core concepts. The content is well-structured, age-appropriate, and shows creativity. Your practical approach to the learning objectives is commendable.\n\nHighlights:\n• Strong content accuracy and curriculum alignment\n• Excellent presentation and layout\n• Creative and engaging activities\n\nKeep up the outstanding work! You are well on track in this course.\n\nBest regards,\nAdmin Team`;
    } else if (pct >= 60) {
      suggestion = `Dear ${a.teacher.split(" ")[0]},\n\nThank you for submitting "${a.title}". Your work shows a good foundational understanding. There are a few areas that could be strengthened:\n\n• Review the practical applicability section — consider adding more real classroom examples\n• The presentation could benefit from clearer headings and structure\n• Content accuracy is good overall but double-check Module 2 references\n\nPlease review the rubric feedback and feel free to resubmit if required.\n\nBest regards,\nAdmin Team`;
    } else {
      suggestion = `Dear ${a.teacher.split(" ")[0]},\n\nThank you for submitting "${a.title}". We appreciate your effort. However, the submission needs significant improvement in the following areas:\n\n• Content accuracy requires more alignment with course objectives\n• Activities need to be more age-appropriate for the target group\n• Presentation and formatting need to meet the assignment guidelines\n\nPlease review the detailed rubric scores, revise accordingly, and resubmit at your earliest.\n\nBest regards,\nAdmin Team`;
    }
    setAiSuggestion(suggestion);
    setAiLoading(false);
  };
 
  const applyAiFeedback = id => {
    updateAssignment(id, { feedback: aiSuggestion });
    setAiSuggestion("");
    setToast({ msg: "AI feedback applied!", type: "success" });
  };
 
  // ── Stats ──
  const pending    = assignments.filter(a => a.status === "pending").length;
  const underRev   = assignments.filter(a => a.status === "under review").length;
  const reviewed   = assignments.filter(a => a.status === "reviewed").length;
  const approved   = assignments.filter(a => a.status === "approved").length;
  const revision   = assignments.filter(a => a.status === "revision").length;
 
  // ─────────────────────────────────────────────
  //  REVIEW DETAIL VIEW
  // ─────────────────────────────────────────────
  if (selected) {
    const a = assignments.find(x => x.id === selected.id) || selected;
    const rubricTotal = a.rubric.reduce((s, r) => s + (r.score || 0), 0);
    const rubricMax   = a.rubric.reduce((s, r) => s + r.maxScore, 0);
    const rubricPct   = rubricMax ? Math.round((rubricTotal / rubricMax) * 100) : 0;
    const scoreColor  = rubricPct >= 80 ? "#10b981" : rubricPct >= 60 ? "#f59e0b" : "#ef4444";
 
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
 
        {/* Assign Trainer Modal */}
        {assignModal && (
          <div style={AR_OVERLAY}>
            <div style={AR_MODAL}>
              <div style={AR_HDR}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>👩‍🏫 Assign Reviewer</span>
                <button onClick={() => setAssignModal(null)} style={AR_CLOSE}>✕</button>
              </div>
              <div style={{ padding: "20px 24px 24px" }}>
                <label style={S.label}>Select Trainer *</label>
                <select style={{ ...S.input, marginBottom: 20 }} value={assignTrainer} onChange={e => setAssignTrainer(e.target.value)}>
                  <option value="">Select a trainer...</option>
                  {TRAINERS.map(t => <option key={t}>{t}</option>)}
                </select>
                <button onClick={() => handleAssignTrainer(assignModal)} style={{ ...AR_BTN_PRIMARY, width: "100%" }}>
                  Assign & Notify →
                </button>
              </div>
            </div>
          </div>
        )}
 
        <button onClick={() => { setSelected(null); setAiSuggestion(""); }} style={S.backBtn}>← Back to Assignments</button>
 
        {/* Assignment Header */}
        <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white", flexShrink: 0 }}>
              {a.teacher[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>{a.title}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: STATUS_BG[a.status] || "#f3f4f6", color: STATUS_COLOR[a.status] || "#6b7280" }}>
                  {a.status.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>👤 {a.teacher}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>📚 {a.course}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>🗂️ {a.batch}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>📅 {a.submitted}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setAssignModal(a.id)} style={AR_BTN_GHOST}>👩‍🏫 Assign</button>
              {!a.notified && (a.status === "approved" || a.status === "revision" || a.status === "reviewed") && (
                <button onClick={() => handleNotify(a.id)} style={{ ...AR_BTN_PRIMARY, background: "#8b5cf6" }}>📨 Notify Teacher</button>
              )}
              {a.notified && <span style={{ fontSize: 11, color: "#9ca3af", alignSelf: "center" }}>✓ Notified</span>}
            </div>
          </div>
 
          {/* Reviewer + Score strip */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Assigned Reviewer", val: a.trainer || "Unassigned" },
              { label: "Reviewed By",       val: a.reviewedBy || "—" },
              { label: "Total Score",       val: a.score != null ? `${a.score} / ${rubricMax}` : "—" },
              { label: "Percentage",        val: a.score != null ? `${rubricPct}%` : "—" },
            ].map((r, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 13px", border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: i === 2 || i === 3 ? scoreColor : "#0f172a" }}>{r.val}</div>
              </div>
            ))}
          </div>
 
          {/* Quick Action Buttons */}
          {(a.status === "pending" || a.status === "under review") && (
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {a.status === "pending" && (
                <button onClick={() => handleMarkUnderReview(a.id)} style={{ ...AR_BTN_GHOST, color: "#2563eb", borderColor: "#93c5fd" }}>▶ Start Review</button>
              )}
              <button onClick={() => handleApprove(a.id)} style={{ ...AR_BTN_PRIMARY, background: "#059669" }}>✓ Approve</button>
              <button onClick={() => handleRevision(a.id)} style={{ ...AR_BTN_PRIMARY, background: "#dc2626" }}>↩ Request Revision</button>
            </div>
          )}
          {a.status === "revision" && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#fee2e2", borderRadius: 10, fontSize: 12, color: "#991b1b", border: "1px solid #fca5a5" }}>
              ↩ Revision requested. Awaiting teacher resubmission.
            </div>
          )}
          {a.status === "approved" && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#d1fae5", borderRadius: 10, fontSize: 12, color: "#065f46", border: "1px solid #86efac" }}>
              ✓ Assignment approved and marks finalised.
            </div>
          )}
        </div>
 
        {/* Panel Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #f3f4f6" }}>
          {[
            { key: "review", label: "✏️ Review & Feedback" },
            { key: "rubric", label: "📊 Scoring Rubric"    },
            { key: "pdf",    label: "📄 PDF Viewer"        },
          ].map(t => (
            <button key={t.key} onClick={() => setActivePanel(t.key)}
              style={{ padding: "10px 18px", border: "none", borderBottom: `2px solid ${activePanel === t.key ? "#f59e0b" : "transparent"}`, background: "none", color: activePanel === t.key ? "#92400e" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>
 
        {/* ── REVIEW & FEEDBACK PANEL ── */}
        {activePanel === "review" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {/* Written Feedback */}
            <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>📝 Written Feedback</div>
                <button
                  onClick={() => runAiFeedback(a.id)}
                  disabled={aiLoading}
                  style={{ ...AR_BTN_PRIMARY, background: "#8b5cf6", fontSize: 11, opacity: aiLoading ? 0.7 : 1 }}>
                  {aiLoading ? "⏳ Generating..." : "🤖 AI Assist"}
                </button>
              </div>
 
              <textarea
                value={a.feedback}
                onChange={e => updateAssignment(a.id, { feedback: e.target.value })}
                rows={8}
                style={{ ...S.input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, fontSize: 13 }}
                placeholder="Write detailed feedback for the teacher here..."
              />
 
              {/* AI Suggestion */}
              {aiLoading && (
                <div style={{ marginTop: 10, padding: 14, background: "#f5f3ff", borderRadius: 10, border: "1px solid #c4b5fd", fontSize: 12, color: "#7c3aed" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>🤖 AI is analysing rubric scores...</div>
                  <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
                    <div style={{ height: "100%", width: "65%", background: "#8b5cf6", borderRadius: 4 }} />
                  </div>
                </div>
              )}
 
              {aiSuggestion && (
                <div style={{ marginTop: 10, padding: 14, background: "#f5f3ff", borderRadius: 10, border: "1px solid #c4b5fd" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", marginBottom: 6 }}>🤖 AI Suggested Feedback</div>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#374151", lineHeight: 1.6, fontFamily: "inherit", maxHeight: 180, overflowY: "auto" }}>{aiSuggestion}</pre>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => applyAiFeedback(a.id)} style={{ ...AR_BTN_PRIMARY, flex: 1, fontSize: 11 }}>✓ Use This Feedback</button>
                    <button onClick={() => setAiSuggestion("")} style={{ ...AR_BTN_GHOST, flex: 1, fontSize: 11 }}>✕ Dismiss</button>
                  </div>
                </div>
              )}
 
              {/* Approve / Revision buttons */}
              {(a.status === "pending" || a.status === "under review") && (
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={() => handleApprove(a.id)} style={{ ...AR_BTN_PRIMARY, flex: 1, background: "#059669" }}>✓ Approve</button>
                  <button onClick={() => handleRevision(a.id)} style={{ ...AR_BTN_PRIMARY, flex: 1, background: "#dc2626" }}>↩ Revision</button>
                </div>
              )}
 
              {/* Notify button */}
              {!a.notified && (a.status === "approved" || a.status === "revision") && (
                <button onClick={() => handleNotify(a.id)} style={{ ...AR_BTN_PRIMARY, width: "100%", marginTop: 10, background: "#8b5cf6" }}>
                  📨 Send Feedback Notification to Teacher
                </button>
              )}
              {a.notified && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#059669", fontWeight: 600, textAlign: "center" }}>✓ Teacher has been notified</div>
              )}
            </div>
 
            {/* Rubric Summary */}
            <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>📊 Rubric Summary</div>
              {a.rubric.map((r, i) => {
                const rPct = r.score != null ? Math.round((r.score / r.maxScore) * 100) : 0;
                const rColor = r.score != null ? (rPct >= 80 ? "#10b981" : rPct >= 60 ? "#f59e0b" : "#ef4444") : "#d1d5db";
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: "#374151" }}>{r.criterion}</span>
                      <span style={{ fontWeight: 800, color: rColor }}>
                        {r.score != null ? `${r.score} / ${r.maxScore}` : `— / ${r.maxScore}`}
                      </span>
                    </div>
                    <div style={{ height: 7, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${rPct}%`, background: rColor, borderRadius: 6, transition: "width .5s" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: "2px solid #f3f4f6", paddingTop: 12, marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Total</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor }}>{rubricTotal} / {rubricMax}</span>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
                  <div style={{ height: "100%", width: `${rubricPct}%`, background: scoreColor, borderRadius: 6 }} />
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, textAlign: "right" }}>
                  {rubricPct >= 80 ? "🟢 Pass" : rubricPct >= 60 ? "🟡 Borderline" : "🔴 Fail"}
                </div>
              </div>
            </div>
          </div>
        )}
 
        {/* ── SCORING RUBRIC PANEL ── */}
        {activePanel === "rubric" && (
          <div style={{ background: "white", borderRadius: 16, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>📊 Scoring Rubric — {a.title}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>Enter marks for each criterion. Total = {rubricMax} marks.</div>
 
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {a.rubric.map((r, i) => {
                const rPct   = r.score != null ? Math.round((r.score / r.maxScore) * 100) : 0;
                const rColor = r.score != null ? (rPct >= 80 ? "#10b981" : rPct >= 60 ? "#f59e0b" : "#ef4444") : "#d1d5db";
                return (
                  <div key={i} style={{ padding: 16, background: "#f9fafb", borderRadius: 12, border: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{r.criterion}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Maximum: {r.maxScore} marks</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="number"
                          min="0"
                          max={r.maxScore}
                          value={r.score ?? ""}
                          onChange={e => updateRubricScore(a.id, i, e.target.value)}
                          placeholder="0"
                          style={{ width: 70, padding: "8px 10px", borderRadius: 9, border: `2px solid ${rColor}`, fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: rColor, textAlign: "center", outline: "none" }}
                        />
                        <span style={{ fontSize: 14, color: "#9ca3af" }}>/ {r.maxScore}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${rPct}%`, background: rColor, borderRadius: 4, transition: "width .4s" }} />
                    </div>
 
                    {/* Per-criterion guide */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 }}>
                      {[
                        { label: "Excellent", range: `${r.maxScore}–${Math.ceil(r.maxScore * 0.85)}`, color: "#10b981" },
                        { label: "Good",      range: `${Math.ceil(r.maxScore * 0.84)}–${Math.ceil(r.maxScore * 0.70)}`, color: "#3b82f6" },
                        { label: "Average",   range: `${Math.ceil(r.maxScore * 0.69)}–${Math.ceil(r.maxScore * 0.50)}`, color: "#f59e0b" },
                        { label: "Poor",      range: `< ${Math.ceil(r.maxScore * 0.50)}`, color: "#ef4444" },
                      ].map((g, j) => (
                        <div key={j} style={{ padding: "4px 8px", borderRadius: 6, background: `${g.color}15`, textAlign: "center" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: g.color }}>{g.label}</div>
                          <div style={{ fontSize: 9, color: "#9ca3af" }}>{g.range}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
 
            {/* Total */}
            <div style={{ marginTop: 20, padding: 18, background: `${scoreColor}15`, borderRadius: 14, border: `2px solid ${scoreColor}40`, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Total Score</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor }}>{rubricTotal} <span style={{ fontSize: 18, color: "#9ca3af" }}>/ {rubricMax}</span></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: scoreColor, marginTop: 4 }}>{rubricPct}% — {rubricPct >= 80 ? "Pass ✓" : rubricPct >= 60 ? "Borderline" : "Fail ✕"}</div>
            </div>
 
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => handleApprove(a.id)} style={{ ...AR_BTN_PRIMARY, flex: 1, background: "#059669" }}>✓ Approve with These Scores</button>
              <button onClick={() => handleRevision(a.id)} style={{ ...AR_BTN_PRIMARY, flex: 1, background: "#dc2626" }}>↩ Request Revision</button>
            </div>
          </div>
        )}
 
        {/* ── PDF VIEWER & ANNOTATION PANEL ── */}
        {activePanel === "pdf" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
            {/* PDF Viewer (simulated) */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1 }}>{a.title}.pdf</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Page</span>
                  <input type="number" min="1" max="5" value={annoPage} onChange={e => setAnnoPage(Number(e.target.value))}
                    style={{ width: 48, padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb", textAlign: "center", fontSize: 12, fontFamily: "inherit" }} />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>of 5</span>
                </div>
              </div>
 
              {/* Simulated PDF page with annotations */}
              <div style={{ position: "relative", background: "#fff", minHeight: 480, padding: 24 }}>
                {/* Fake PDF content */}
                <div style={{ fontFamily: "Georgia, serif", color: "#374151" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, textAlign: "center", color: "#0f172a" }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginBottom: 20 }}>
                    Submitted by {a.teacher} · {a.submitted} · {a.course}
                  </div>
                  {[
                    "This assignment explores the core principles of early childhood education with a specific focus on age-appropriate learning methodologies.",
                    "Section 1: Learning Objectives — The primary objective of this lesson plan is to foster foundational literacy skills among children aged 3-4 years through play-based learning.",
                    "Section 2: Activity Design — Each activity has been carefully designed to align with developmental milestones and NEP 2020 guidelines for the foundational stage.",
                    "Section 3: Assessment Strategy — Formative assessment will be conducted through observation checklists and portfolio documentation.",
                    "Section 4: Resources Required — Materials include story cards, number blocks, sand trays, and printed worksheets tailored for motor skill development.",
                  ].map((para, pi) => (
                    <p key={pi} style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 12, color: "#374151" }}>{para}</p>
                  ))}
                </div>
 
                {/* Annotation pins */}
                {(a.annotations || []).filter(n => n.page === annoPage).map(ann => (
                  <div key={ann.id} style={{ position: "absolute", left: `${ann.x}%`, top: `${ann.y}%`, zIndex: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: ann.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white", fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", border: "2px solid white" }}
                      title={ann.text}>💬</div>
                    <div style={{ position: "absolute", left: 28, top: -4, background: ann.color, color: "white", padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", maxWidth: 160 }}>
                      {ann.text}
                    </div>
                  </div>
                ))}
 
                {/* Click to annotate overlay */}
                {addAnnoMode && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(245,158,11,0.08)", border: "2px dashed #f59e0b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "crosshair", zIndex: 5 }}>
                    <div style={{ background: "#fef3c7", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#92400e" }}>Click anywhere on the document to place annotation</div>
                  </div>
                )}
              </div>
            </div>
 
            {/* Annotation Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>✍️ Add Annotation</div>
                <label style={S.label}>Annotation Text</label>
                <textarea value={annoText} onChange={e => setAnnoText(e.target.value)} rows={3}
                  style={{ ...S.input, resize: "none", marginBottom: 10, fontSize: 12 }}
                  placeholder="Add a note or comment..." />
                <label style={S.label}>Colour</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"].map(c => (
                    <div key={c} onClick={() => setAnnoColor(c)}
                      style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: `3px solid ${annoColor === c ? "#0f172a" : "transparent"}` }} />
                  ))}
                </div>
                <button onClick={() => addAnnotation(a.id)} style={{ ...AR_BTN_PRIMARY, width: "100%" }}>📌 Add Pin (Page {annoPage})</button>
              </div>
 
              {/* Existing Annotations */}
              <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                  📋 Annotations ({(a.annotations || []).length})
                </div>
                {(a.annotations || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 12 }}>No annotations yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                    {(a.annotations || []).map(ann => (
                      <div key={ann.id} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${ann.color}40`, background: `${ann.color}10`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: ann.color, flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{ann.text}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Page {ann.page}</div>
                        </div>
                        <button onClick={() => removeAnnotation(a.id, ann.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
 
  // ─────────────────────────────────────────────
  //  INBOX LIST VIEW
  // ─────────────────────────────────────────────
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
 
      {/* Assign Trainer Modal (from list) */}
      {assignModal && (
        <div style={AR_OVERLAY}>
          <div style={AR_MODAL}>
            <div style={AR_HDR}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>👩‍🏫 Assign Reviewer</span>
              <button onClick={() => setAssignModal(null)} style={AR_CLOSE}>✕</button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <label style={S.label}>Select Trainer *</label>
              <select style={{ ...S.input, marginBottom: 20 }} value={assignTrainer} onChange={e => setAssignTrainer(e.target.value)}>
                <option value="">Select a trainer...</option>
                {TRAINERS.map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={() => handleAssignTrainer(assignModal)} style={{ ...AR_BTN_PRIMARY, width: "100%" }}>
                Assign & Notify →
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Assignment Review</h1>
          <p style={S.pageSub}>{pending} pending · {underRev} under review · {revision} revision requested</p>
        </div>
      </div>
 
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { icon: "📥", label: "Pending",      val: pending,  color: "#f59e0b", bg: "#fef9c3" },
          { icon: "🔍", label: "Under Review", val: underRev, color: "#3b82f6", bg: "#dbeafe" },
          { icon: "✅", label: "Reviewed",     val: reviewed, color: "#10b981", bg: "#d1fae5" },
          { icon: "↩", label: "Revision",      val: revision, color: "#ef4444", bg: "#fee2e2" },
          { icon: "🏅", label: "Approved",     val: approved, color: "#7c3aed", bg: "#ede9fe" },
        ].map((k, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: "12px 14px", border: `1px solid ${k.color}30`, borderLeft: `3px solid ${k.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer" }}
            onClick={() => setStatusFilter(statusFilter === k.label.toLowerCase() ? "all" : k.label.toLowerCase())}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{k.val}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".3px" }}>{k.label}</div>
          </div>
        ))}
      </div>
 
      {/* Filters */}
      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teacher, title, course..."
              style={{ ...S.input, paddingLeft: 34, marginBottom: 0 }} />
          </div>
          {/* Status filter pills */}
          {["all", "pending", "under review", "reviewed", "revision", "approved"].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${statusFilter === f ? "#f59e0b" : "#e5e7eb"}`, background: statusFilter === f ? "#fef3c7" : "white", color: statusFilter === f ? "#92400e" : "#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", whiteSpace: "nowrap" }}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          {/* Course filter */}
          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} style={{ ...S.input, marginBottom: 0, width: 220 }}>
            <option value="all">All Courses</option>
            {ALL_COURSES.map(c => <option key={c} value={c}>{c.substring(0, 30)}</option>)}
          </select>
          {/* Trainer filter */}
          <select value={trainerFilter} onChange={e => setTrainerFilter(e.target.value)} style={{ ...S.input, marginBottom: 0, width: 200 }}>
            <option value="all">All Trainers</option>
            {TRAINERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...S.input, marginBottom: 0, width: 160 }}>
            <option value="date">Sort: Date</option>
            <option value="course">Sort: Course</option>
            <option value="batch">Sort: Batch</option>
            <option value="status">Sort: Status</option>
          </select>
          {(search || statusFilter !== "all" || courseFilter !== "all" || trainerFilter !== "all") && (
            <button onClick={() => { setSearch(""); setStatusFilter("all"); setCourseFilter("all"); setTrainerFilter("all"); }}
              style={{ ...AR_BTN_GHOST, color: "#ef4444", borderColor: "#fca5a5" }}>✕ Clear</button>
          )}
        </div>
      </div>
 
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>Showing {filtered.length} of {assignments.length} assignments</div>
 
      {/* Inbox List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(a => {
          const rubricTotal = a.rubric.reduce((s, r) => s + (r.score || 0), 0);
          const rubricMax   = a.rubric.reduce((s, r) => s + r.maxScore, 0);
          const rubricPct   = rubricMax ? Math.round((rubricTotal / rubricMax) * 100) : 0;
          const sc          = rubricPct >= 80 ? "#10b981" : rubricPct >= 60 ? "#f59e0b" : "#ef4444";
 
          return (
            <div key={a.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", border: "1px solid #f1f5f9", borderLeft: `4px solid ${STATUS_COLOR[a.status] || "#e5e7eb"}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Avatar */}
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "white", flexShrink: 0 }}>{a.teacher[0]}</div>
 
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>👤 {a.teacher}</span>
                    <span>📚 {a.course}</span>
                    <span>🗂️ {a.batch}</span>
                    <span>👩‍🏫 {a.trainer}</span>
                    <span>📅 {a.submitted}</span>
                  </div>
                </div>
 
                {/* Score badge */}
                {a.score != null && (
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: sc }}>{a.score}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>/ {rubricMax}</div>
                  </div>
                )}
 
                {/* Status + notified */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: STATUS_BG[a.status] || "#f3f4f6", color: STATUS_COLOR[a.status] || "#6b7280" }}>
                    {a.status.toUpperCase()}
                  </span>
                  {a.notified && <span style={{ fontSize: 10, color: "#059669" }}>✓ Notified</span>}
                </div>
 
                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setSelected(a); setActivePanel("review"); }}
                    style={{ ...AR_BTN_PRIMARY, fontSize: 12 }}>
                    {a.status === "pending" ? "▶ Review" : "👁 View"}
                  </button>
                  {a.status === "pending" && (
                    <button onClick={() => setAssignModal(a.id)} style={AR_BTN_GHOST}>Assign</button>
                  )}
                  {!a.notified && (a.status === "approved" || a.status === "revision") && (
                    <button onClick={() => handleNotify(a.id)} style={{ ...AR_BTN_GHOST, color: "#8b5cf6", borderColor: "#c4b5fd" }}>📨</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No assignments found</div>
          </div>
        )}
      </div>
    </div>
  );
}