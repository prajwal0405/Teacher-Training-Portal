import { useState, useEffect } from "react";
import { Modal, S, StatCard, StatusBadge, Toast, SearchBar } from "../components/Shared";
import { getTeacherLessonPlans, submitLessonCompletion, submitActivity, uploadFile, getCenters, getClasses, getActivities } from "../services/api";

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not scheduled";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ── Activity Submission Modal ── */
function ActivitySubmissionModal({ user, onClose, onSuccess }) {
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState(null);
  
  const userCenters = user?.teacherProfile?.center ? [user.teacherProfile.center] : [];
  const userClasses = user?.teacherProfile?.classes || [];

  const [selectedCenter, setSelectedCenter] = useState(userCenters[0]?._id || userCenters[0]?.id || "");
  const [selectedClass, setSelectedClass] = useState(userClasses[0]?._id || userClasses[0]?.id || "");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please provide an activity description.");
      return;
    }
    if (!selectedCenter || !selectedClass) {
      setError("Please select a center and class.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let fileId = null;
      if (file) {
        const uploadRes = await uploadFile(file);
        console.log("uploadRes:", uploadRes);
        if (uploadRes && uploadRes.asset) {
          fileId = uploadRes.asset._id || uploadRes.asset.id;
        } else if (uploadRes && uploadRes.file) {
          fileId = uploadRes.file._id || uploadRes.file.id;
        } else {
          throw new Error("File upload failed. Server response: " + JSON.stringify(uploadRes));
        }
      }

      await submitActivity({
        center: selectedCenter,
        class: selectedClass,
        description,
        activityDate,
        files: fileId ? [fileId] : []
      });

      onSuccess("Activity submitted successfully!");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit activity.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="📤 Submit Activity" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <label style={S.label}>Center *</label>
        <select
          style={{ ...S.input, marginBottom: 12 }}
          value={selectedCenter}
          onChange={(e) => setSelectedCenter(e.target.value)}
          required
        >
          <option value="">Select Center...</option>
          {userCenters.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
        </select>

        <label style={S.label}>Class *</label>
        <select
          style={{ ...S.input, marginBottom: 12 }}
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          required
        >
          <option value="">Select Class...</option>
          {userClasses.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
        </select>

        <label style={S.label}>Activity Date *</label>
        <input
          type="date"
          style={{ ...S.input, marginBottom: 12 }}
          value={activityDate}
          onChange={(e) => setActivityDate(e.target.value)}
          required
        />

        <label style={S.label}>Description *</label>
        <textarea
          style={{ ...S.input, height: 80, resize: "none", marginBottom: 12 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the activity you conducted..."
          required
        />

        <label style={S.label}>Attach Document (Optional)</label>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
          Supports any file type (PNG, JPG, PDFs, Excel, Videos, Zips, etc.)
        </div>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ marginBottom: 20, width: "100%", fontSize: 13 }}
        />

        <button type="submit" disabled={submitting} style={{ ...S.primaryBtn, width: "100%" }}>
          {submitting ? "Submitting..." : "Submit Activity"}
        </button>
      </form>
    </Modal>
  );
}

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
  if (assignment.isActivity) {
    const act = assignment.originalActivity || {};
    return (
      <Modal title="📖 Submitted Activity" onClose={onClose}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <StatusBadge status="completed" />
          <span style={{ fontSize: 12, color: "#6b7280" }}>📅 {formatDate(act.activityDate || act.createdAt)}</span>
          {act.class?.name && <span style={{ fontSize: 12, color: "#6b7280" }}>🎒 {act.class.name}</span>}
        </div>
        
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>
            📝 Description
          </div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{act.description || "—"}</div>
        </div>

        {act.files && act.files.length > 0 && (
          <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", textTransform: "uppercase", marginBottom: 8 }}>
              📎 Attached Files
            </div>
            {act.files.map((f, i) => {
              // Basic check if it's an image
              const isImage = f.mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(f.originalName || "");
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <a 
                    href={`http://localhost:5000${f.publicUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fff", border: "1px solid #10b981", borderRadius: 6, fontSize: 12, color: "#10b981", textDecoration: "none", fontWeight: 600 }}
                  >
                    ⬇️ Download {f.originalName || "Attachment"}
                  </a>
                  {isImage && (
                    <div style={{ marginTop: 8 }}>
                      <img src={`http://localhost:5000${f.publicUrl}`} alt={f.originalName} style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "" });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getTeacherLessonPlans().catch(err => {
        console.error("Failed to load lesson plans:", err);
        return { assignments: [], lessonPlans: [] };
      }),
      getActivities().catch(err => {
        console.error("Failed to load activities:", err);
        return { activities: [] };
      })
    ]).then(([lessonRes, activityRes]) => {
      const lessons = lessonRes.assignments || lessonRes.lessonPlans || [];
      const activities = activityRes.activities || [];
      const mappedActivities = activities.map(act => {
        let title = "Activity";
        if (act.description) {
           title = "Activity: " + (act.description.length > 40 ? act.description.slice(0, 40) + "..." : act.description);
        }
        return {
          _id: act._id || act.id,
          isActivity: true,
          lessonPlan: { title },
          assignedDate: act.activityDate || act.createdAt,
          class: act.class,
          status: "completed",
          adminFeedback: act.adminFeedback,
          originalActivity: act
        };
      });
      setAssignments([...lessons, ...mappedActivities].sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate)));
    }).finally(() => setLoading(false));
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
      {showActivityModal && (
        <ActivitySubmissionModal
          user={user}
          onClose={() => setShowActivityModal(false)}
          onSuccess={(msg) => {
            setToast({ msg, type: "success" });
            loadData();
          }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={S.pageTitle}>Training & Lessons</h1>
          <p style={S.pageSub}>Lesson plans allocated to you by the admin</p>
        </div>
        <button onClick={() => setShowActivityModal(true)} style={{ ...S.primaryBtn, padding: "10px 16px" }}>
          ➕ Submit Activity
        </button>
      </div>

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