import { useState, useEffect } from "react";
import { Modal, S, StatCard, StatusBadge, Toast, SearchBar } from "../components/Shared";
import { getTeacherLessonPlans, submitLessonCompletion } from "../services/api";

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not scheduled";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ── Completion Submission Modal ── */
function CompleteLessonModal({ assignment, onSubmit, onClose }) {
  const [teachingNotes, setTeachingNotes] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const plan = assignment.lessonPlan || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teachingNotes.trim() && !activityDescription.trim()) {
      setError("Please add teaching notes or an activity description before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(assignment._id || assignment.id, { teachingNotes, activityDescription });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit completion report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`✅ Mark Complete: ${plan.title || "Lesson"}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <label style={S.label}>What did you teach today? (Activity Description)</label>
        <textarea
          style={{ ...S.input, height: 70, resize: "none", marginBottom: 12 }}
          value={activityDescription}
          onChange={(e) => setActivityDescription(e.target.value)}
          placeholder="Briefly describe what was covered in class..."
        />

        <label style={S.label}>Teaching Notes / Observations</label>
        <textarea
          style={{ ...S.input, height: 90, resize: "none", marginBottom: 20 }}
          value={teachingNotes}
          onChange={(e) => setTeachingNotes(e.target.value)}
          placeholder="How did the children respond? Any challenges or highlights?"
        />

        <button type="submit" disabled={submitting} style={{ ...S.primaryBtn, width: "100%" }}>
          {submitting ? "Submitting..." : "📤 Submit Completion Report"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Lesson Detail Modal (read-only) ── */
function LessonDetailModal({ assignment, onClose }) {
  const plan = assignment.lessonPlan || {};
  const sections = [
    { icon: "🎯", label: "Learning Objectives", val: plan.objectives },
    { icon: "🎪", label: "Activities", val: plan.activities },
    { icon: "📦", label: "Resources", val: plan.resources },
    { icon: "📝", label: "Instructions", val: plan.instructions },
  ];

  return (
    <Modal title={`📖 ${plan.title || "Lesson"}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <StatusBadge status={assignment.status} />
        <span style={{ fontSize: 12, color: "#6b7280" }}>📅 {formatDate(assignment.assignedDate)}</span>
        {assignment.class?.name && <span style={{ fontSize: 12, color: "#6b7280" }}>🎒 {assignment.class.name}</span>}
      </div>
      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>
            {s.icon} {s.label}
          </div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{s.val || "—"}</div>
        </div>
      ))}
      {assignment.adminFeedback && (
        <div style={{ marginTop: 4, padding: "10px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", textTransform: "uppercase", marginBottom: 4 }}>
            💬 Admin Feedback
          </div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{assignment.adminFeedback}</div>
        </div>
      )}
    </Modal>
  );
}

/* ── Main Component ── */
export default function TrainingAndClassroomManager({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailAssignment, setDetailAssignment] = useState(null);
  const [completeAssignment, setCompleteAssignment] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "" });

  const loadData = () => {
    setLoading(true);
    getTeacherLessonPlans()
      .then((res) => setAssignments(res.assignments || res.lessonPlans || []))
      .catch((err) => {
        console.error("Failed to load lesson plans:", err);
        setToast({ msg: "Failed to load your lesson plans.", type: "error" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompleteSubmit = async (assignmentId, payload) => {
    await submitLessonCompletion(assignmentId, payload);
    setToast({ msg: "Completion report submitted for admin review!", type: "success" });
    loadData();
  };

  const filtered = assignments.filter((a) => {
    const plan = a.lessonPlan || {};
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && a.status === "pending") ||
      (filter === "completed" && (a.status === "completed" || a.status === "reviewed"));
    const q = search.toLowerCase();
    const matchesSearch = !q || (plan.title || "").toLowerCase().includes(q) || (plan.instructions || "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = assignments.filter((a) => a.status === "pending").length;
  const completedCount = assignments.filter((a) => a.status === "completed" || a.status === "reviewed").length;

  const filterBtn = (key, label) => (
    <button
      onClick={() => setFilter(key)}
      style={{ ...S.exportBtn, background: filter === key ? "#f59e0b" : "white", color: filter === key ? "white" : "#6b7280", borderColor: filter === key ? "#f59e0b" : "#e5e7eb" }}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Training & Lessons...
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />

      {detailAssignment && (
        <LessonDetailModal assignment={detailAssignment} onClose={() => setDetailAssignment(null)} />
      )}
      {completeAssignment && (
        <CompleteLessonModal
          assignment={completeAssignment}
          onSubmit={handleCompleteSubmit}
          onClose={() => setCompleteAssignment(null)}
        />
      )}

      <h1 style={S.pageTitle}>Training & Lessons</h1>
      <p style={S.pageSub}>Lesson plans allocated to you by the admin</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard icon="📋" label="Total Assigned" val={assignments.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="⏳" label="Pending" val={pendingCount} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Completed" val={completedCount} color="#10b981" bg="#d1fae5" />
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search lessons..." />
        </div>
        {filterBtn("all", "All")}
        {filterBtn("pending", "Pending")}
        {filterBtn("completed", "Completed")}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
          No lesson plans assigned yet. Check back once your admin allocates one.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
          {filtered.map((a) => {
            const plan = a.lessonPlan || {};
            const isDone = a.status === "completed" || a.status === "reviewed";
            return (
              <div
                key={a._id || a.id}
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: "18px 20px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  borderLeft: `4px solid ${isDone ? "#10b981" : "#f59e0b"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{plan.title || "Lesson"}</div>
                  <StatusBadge status={a.status} />
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>📅 {formatDate(a.assignedDate)}</div>
                <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 14 }}>
                  {(plan.instructions || "No instructions provided.").slice(0, 110)}
                  {(plan.instructions || "").length > 110 ? "..." : ""}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setDetailAssignment(a)} style={{ ...S.tblBtn, flex: 1 }}>
                    👁 View Details
                  </button>
                  {!isDone && (
                    <button onClick={() => setCompleteAssignment(a)} style={{ ...S.primaryBtn, flex: 1, padding: "8px 12px", fontSize: 12 }}>
                      ✅ Mark Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}