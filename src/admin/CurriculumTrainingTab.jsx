import { useState, useEffect } from "react";
import { Modal, S, SearchBar, StatCard, Toast } from "../components/Shared";
import { getCourses, createCourse, updateCourse, deleteCourse, getCourseAssignments, getAdminTeachers } from "../services/api";

const mapCourseFromApi = (c) => ({
  id: c._id || c.id,
  title: c.title,
  category: c.category || "Foundations of ECE",
  level: c.level || "Beginner",
  duration: c.duration || c.durationText || "2 Weeks",
  description: c.description || "",
  objectives: c.objectives || "",
  contentType: c.contentType || "Video",
  contentLink: c.contentLink || "",
  youtubeId: c.youtubeId || "",
  assignedCount: c.assignedCount || 0,
  completedCount: c.completedCount || 0,
});

const mapCourseToApi = (c) => ({
  title: c.title,
  category: c.category,
  level: c.level,
  durationText: c.duration,
  duration: c.duration,
  description: c.description,
  objectives: c.objectives,
  contentType: c.contentType,
  contentLink: c.contentLink,
  youtubeId: c.youtubeId,
  assignedCount: c.assignedCount,
  completedCount: c.completedCount,
});

const CATEGORIES = [
  "all",
  "Foundations of ECE",
  "Curriculum Planning",
  "Instructional Strategies",
  "Assessment & Evaluation",
  "Classroom Management",
  "Family & Community",
  "Professional Development",
  "Health, Safety & Nutrition",
  "Practical Training"
];

const LEVEL_COLORS = {
  Beginner:     { bg: "#d1fae5", color: "#065f46" },
  Intermediate: { bg: "#dbeafe", color: "#1d4ed8" },
  Advanced:     { bg: "#ede9fe", color: "#5b21b6" },
};

const TYPE_ICONS = { Video: "🎥", PDF: "📄", Document: "📝" };

const CAT_COLORS = {
  "Foundations of ECE":       "#f59e0b",
  "Curriculum Planning":      "#10b981",
  "Instructional Strategies": "#3b82f6",
  "Assessment & Evaluation":  "#8b5cf6",
  "Classroom Management":     "#ef4444",
  "Family & Community":       "#ec4899",
  "Professional Development": "#f97316",
  "Health, Safety & Nutrition":"#06b6d4",
  "Practical Training":       "#14b8a6",
};

const EMPTY_FORM = {
  title: "", category: "Foundations of ECE", level: "Beginner", duration: "",
  description: "", objectives: "", contentType: "Video", contentLink: "",
  youtubeId: "", assignedCount: 0, completedCount: 0,
};

/* ── Extract YouTube ID from URL ── */
function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

/* ── YouTube Thumbnail ── */
function YoutubeThumbnail({ youtubeId, title }) {
  const [playing, setPlaying] = useState(false);
  if (!youtubeId) return null;

  return (
    <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "12px 12px 0 0", overflow: "hidden", background: "#000", cursor: "pointer" }}
      onClick={() => setPlaying(true)}>
      {playing ? (
        <iframe
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          title={title}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : (
        <>
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
            alt={title}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,0,0,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
              <div style={{ width: 0, height: 0, borderTop: "10px solid transparent",
                borderBottom: "10px solid transparent", borderLeft: "18px solid white", marginLeft: 4 }}/>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.8)",
            color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
            🎥 YouTube
          </div>
        </>
      )}
    </div>
  );
}

/* ── Data Stats Row ── */
function CourseDataRow({ course }) {
  const pct = course.assignedCount > 0 ? Math.round((course.completedCount / course.assignedCount) * 100) : 0;
  const notStarted = course.assignedCount - course.completedCount;

  return (
    <div style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "0 0 12px 12px",
      padding: "10px 14px",
      borderTop: "none",
    }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>COMPLETION</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444",
            borderRadius: 6,
            transition: "width 0.4s ease"
          }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <div style={{ textAlign: "center", background: "white", borderRadius: 8, padding: "6px 4px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{course.assignedCount}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Assigned</div>
        </div>
        <div style={{ textAlign: "center", background: "white", borderRadius: 8, padding: "6px 4px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981" }}>{course.completedCount}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Completed</div>
        </div>
        <div style={{ textAlign: "center", background: "white", borderRadius: 8, padding: "6px 4px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: notStarted > 0 ? "#ef4444" : "#10b981" }}>{notStarted}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Remaining</div>
        </div>
      </div>
    </div>
  );
}

/* ── Course Form Modal ── */
function CourseFormModal({ course, onSave, onClose, setToast }) {
  const isEdit = !!course;
  const [form, setForm] = useState(course || EMPTY_FORM);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.contentLink) {
      setToast({ msg: "Please fill all required fields.", type: "error" }); return;
    }
    const yId = form.contentType === "Video" ? getYoutubeId(form.contentLink) : null;
    onSave({ ...form, youtubeId: yId });
    onClose();
  };

  return (
    <Modal title={isEdit ? "✏️ Edit Course" : "📚 Create New Course"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Course Title *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Advanced Phonics Instruction" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Category</label>
            <select style={S.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.filter(c => c !== "all").map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Level</label>
            <select style={S.input} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Duration</label>
            <input style={S.input} value={form.duration}
              onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 2 Weeks" />
          </div>
        </div>

        <label style={S.label}>Description *</label>
        <textarea style={{ ...S.input, height: 60, resize: "none", marginBottom: 12 }}
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Brief outline of the training program..." />

        <label style={S.label}>Learning Objectives</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.objectives}
          onChange={e => setForm({ ...form, objectives: e.target.value })} placeholder="Skills gained upon completion..." />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Content Format</label>
            <select style={S.input} value={form.contentType} onChange={e => setForm({ ...form, contentType: e.target.value })}>
              <option value="Video">🎥 Video (YouTube / Vimeo)</option>
              <option value="PDF">📄 PDF Guide / Handbook</option>
              <option value="Document">📝 Document / PPTX</option>
            </select>
          </div>
          <div>
            <label style={S.label}>
              {form.contentType === "Video" ? "YouTube URL *" : "File URL / Link *"}
            </label>
            <input style={S.input} value={form.contentLink}
              onChange={e => setForm({ ...form, contentLink: e.target.value })}
              placeholder={form.contentType === "Video" ? "https://youtube.com/watch?v=..." : "https://..."} />
          </div>
        </div>

        {form.contentType === "Video" && form.contentLink && (
          <div style={{ marginBottom: 16 }}>
            <YoutubeThumbnail youtubeId={getYoutubeId(form.contentLink)} title={form.title} />
          </div>
        )}

        <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>
          {isEdit ? "Update Course →" : "Create Course →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Tracking Modal ── */
function CourseTrackingModal({ course, assignments = [], onClose, setToast }) {
  const courseAssignments = assignments.filter(a => {
    const cid = a.course?._id || a.course?.id || a.course;
    return cid === course.id;
  });

  const pct = course.assignedCount > 0 ? Math.round((course.completedCount / course.assignedCount) * 100) : 0;

  return (
    <Modal title={`📊 Tracker: ${course.title}`} onClose={onClose}>
      <div style={{ background: "#f9fafb", borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Completion Rate</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 6 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#9ca3af" }}>
          <span>✅ {course.completedCount} completed</span>
          <span>👥 {course.assignedCount} assigned</span>
        </div>
      </div>

      <div style={{ marginBottom: 14, fontSize: 12, color: "#0369a1", background: "#f0f9ff",
        padding: "10px 14px", borderRadius: 8, border: "1px solid #bae6fd" }}>
        📎 <b>Resource:</b>{" "}
        <a href={course.contentLink} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
          {course.contentLink}
        </a>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>👩‍🏫 Teacher Status</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 250, overflowY: "auto" }}>
        {courseAssignments.length > 0 ? courseAssignments.map(a => {
          const tname = a.teacher?.name || "Unknown Teacher";
          const statusText = a.status === "completed" || a.progressPercent === 100 ? "Completed" : "In Progress";
          const progress = a.progressPercent || 0;
          return (
            <div key={a._id || a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{tname}</div>
                <div style={{ fontSize: 11, fontWeight: 600,
                  color: statusText === "Completed" ? "#16a34a" : "#d97706" }}>
                  ● {statusText} ({progress}%)
                </div>
              </div>
              {statusText !== "Completed" && (
                <button onClick={() => setToast({ msg: `Reminder sent to ${tname}!`, type: "success" })}
                  style={{ ...S.tblBtn, fontSize: 11, color: "#dc2626", borderColor: "#fca5a5" }}>
                  🔔 Remind
                </button>
              )}
            </div>
          );
        }) : (
          <div style={{ textAlign: "center", padding: 16, color: "#9ca3af", fontSize: 12 }}>
            No teachers assigned to this course yet.
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function CurriculumTrainingTab({ setToast }) {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [trackingModal, setTrackingModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  const loadCourses = () => {
    setLoading(true);
    Promise.all([getCourses(), getCourseAssignments()])
      .then(([coursesRes, assignmentsRes]) => {
        // Build statistics dynamically for each course
        const assns = assignmentsRes.assignments || [];
        setAssignments(assns);

        const mapped = (coursesRes.courses || []).map(c => {
          const flatCourse = mapCourseFromApi(c);
          // calculate real assigned/completed count
          const courseAssns = assns.filter(a => {
            const cid = a.course?._id || a.course?.id || a.course;
            return cid === flatCourse.id;
          });
          flatCourse.assignedCount = courseAssns.length;
          flatCourse.completedCount = courseAssns.filter(a => a.status === "completed" || a.progressPercent === 100).length;
          return flatCourse;
        });

        setCourses(mapped);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading curriculum:", err);
        setLoading(false);
        showToast({ msg: "Failed to load courses from database.", type: "error" });
      });
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const ms = c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const mc = catFilter === "all" || c.category === catFilter;
    const ml = levelFilter === "all" || c.level === levelFilter;
    const mt = typeFilter === "all" || c.contentType === typeFilter;
    return ms && mc && ml && mt;
  });

  const handleSave = (saved) => {
    const payload = mapCourseToApi(saved);
    if (selectedCourse) {
      updateCourse(selectedCourse.id, payload)
        .then(() => {
          showToast({ msg: "Course updated in database!", type: "success" });
          loadCourses();
        })
        .catch(err => {
          console.error("Error updating course:", err);
          showToast({ msg: "Failed to update course: " + err.message, type: "error" });
        });
    } else {
      createCourse(payload)
        .then(() => {
          showToast({ msg: "Course created in database!", type: "success" });
          loadCourses();
        })
        .catch(err => {
          console.error("Error creating course:", err);
          showToast({ msg: "Failed to create course: " + err.message, type: "error" });
        });
    }
    setFormModal(false);
    setSelectedCourse(null);
  };

  const handleDelete = (id) => {
    deleteCourse(id)
      .then(() => {
        showToast({ msg: "Course deleted successfully.", type: "success" });
        loadCourses();
      })
      .catch(err => {
        console.error("Error deleting course:", err);
        showToast({ msg: "Failed to delete course: " + err.message, type: "error" });
      });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Courses Curriculum...
      </div>
    );
  }

  const totalAssigned = courses.reduce((a, c) => a + c.assignedCount, 0);
  const totalCompleted = courses.reduce((a, c) => a + c.completedCount, 0);
  const overallPct = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {formModal && (
        <CourseFormModal course={selectedCourse} onSave={handleSave}
          onClose={() => { setFormModal(false); setSelectedCourse(null); }} setToast={showToast} />
      )}
      {trackingModal && selectedCourse && (
        <CourseTrackingModal course={selectedCourse} assignments={assignments}
          onClose={() => { setTrackingModal(false); setSelectedCourse(null); }} setToast={showToast} />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Training & Curriculum</h1>
          <p style={S.pageSub}>{courses.length} courses · {overallPct}% overall completion</p>
        </div>
        <button onClick={() => { setSelectedCourse(null); setFormModal(true); }} style={S.primaryBtn}>+ Create Course</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="📚" label="Total Courses" val={courses.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="🎥" label="Video" val={courses.filter(c => c.contentType === "Video").length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="📄" label="PDF Guides" val={courses.filter(c => c.contentType === "PDF").length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="📝" label="Documents" val={courses.filter(c => c.contentType === "Document").length} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="✅" label="Completion" val={`${overallPct}%`} color="#06b6d4" bg="#cffafe" />
      </div>

      {/* Filters */}
      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px",
        border: "1px solid #f1f5f9", marginBottom: 16,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." />
        </div>
        <select style={{ ...S.input, width: 200, marginBottom: 0 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
        </select>
        <select style={{ ...S.input, width: 150, marginBottom: 0 }} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="all">All Levels</option>
          <option>Beginer</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
        </select>
        <select style={{ ...S.input, width: 150, marginBottom: 0 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Formats</option>
          <option value="Video">🎥 Video</option>
          <option value="PDF">📄 PDF</option>
          <option value="Document">📝 Document</option>
        </select>
        {(catFilter !== "all" || levelFilter !== "all" || typeFilter !== "all" || search) && (
          <button onClick={() => { setCatFilter("all"); setLevelFilter("all"); setTypeFilter("all"); setSearch(""); }}
            style={{ ...S.tblBtn, color: "#ef4444", borderColor: "#fca5a5" }}>✕ Clear</button>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
        Showing {filtered.length} of {courses.length} courses
      </div>

      {/* Course Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
        {filtered.map(c => {
          const lc = LEVEL_COLORS[c.level] || LEVEL_COLORS.Beginner;
          const pct = c.assignedCount > 0 ? Math.round((c.completedCount / c.assignedCount) * 100) : 0;
          const catColor = CAT_COLORS[c.category] || "#f59e0b";

          return (
            <div key={c.id} style={{ background: "white", borderRadius: 14,
              border: "1px solid #f1f5f9", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              overflow: "hidden", display: "flex", flexDirection: "column",
              transition: "box-shadow 0.2s" }}>

              <YoutubeThumbnail youtubeId={c.youtubeId} title={c.title} />

              <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: `${catColor}20`, color: catColor }}>{c.category}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: lc.bg, color: lc.color }}>{c.level}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: "#f3f4f6", color: "#6b7280" }}>{TYPE_ICONS[c.contentType]} {c.contentType}</span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 6, lineHeight: 1.4 }}>
                  {c.title}
                </div>

                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                  <span>⏱️ {c.duration || "—"}</span>
                  <span>👥 {c.assignedCount} assigned</span>
                  <span style={{ color: pct >= 75 ? "#10b981" : "#f59e0b", fontWeight: 700 }}>✅ {pct}% done</span>
                </div>

                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px", lineHeight: 1.5, flex: 1 }}>
                  {c.description && c.description.length > 100 ? c.description.substring(0, 100) + "..." : c.description}
                </p>

                <div style={{ fontSize: 11, background: "#f8fafc", padding: "8px 10px",
                  borderRadius: 8, color: "#475569", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  🎯 {c.objectives}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {c.contentType === "Video" ? (
                    <a href={c.contentLink} target="_blank" rel="noreferrer"
                      style={{ ...S.tblBtn, flex: 1.2, textAlign: "center", textDecoration: "none",
                        color: "#dc2626", borderColor: "#fca5a5", fontWeight: 700 }}>
                      ▶ Watch
                    </a>
                  ) : (
                    <a href={c.contentLink} target="_blank" rel="noreferrer"
                      style={{ ...S.tblBtn, flex: 1.2, textAlign: "center", textDecoration: "none",
                        color: "#2563eb", borderColor: "#bfdbfe", fontWeight: 700 }}>
                      👁 View
                    </a>
                  )}
                  <button onClick={() => { setSelectedCourse(c); setTrackingModal(true); }}
                    style={{ ...S.tblBtn, flex: 1, color: "#2563eb", borderColor: "#bfdbfe" }}>
                    📊 Track
                  </button>
                  <button onClick={() => { setSelectedCourse(c); setFormModal(true); }} style={S.tblBtn}>✏️</button>
                  <button onClick={() => handleDelete(c.id)}
                    style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>🗑️</button>
                </div>
              </div>

              <CourseDataRow course={c} />
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No courses found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting filters or create a new course</div>
        </div>
      )}
    </div>
  );
}