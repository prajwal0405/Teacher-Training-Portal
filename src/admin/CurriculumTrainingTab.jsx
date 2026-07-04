import { useState, useEffect } from "react";
import { Modal, S, SearchBar, StatCard, Toast } from "../components/Shared";
import { getCourses, createCourse, updateCourse, deleteCourse, getCourseAssignments, getAdminTeachers, generateCourseFromAI, assignCourse, getCourseNotes, createCourseNote, updateCourseNote, deleteCourseNote } from "../services/api";

const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:.*[?&]v=|embed\/)|youtu\.be\/)([^"&?/\s]{11})/;

function extractVideoUrl(course) {
  const candidates = [
    course?.contentLink,
    course?.youtubeUrl,
    course?.youtubeLink,
    ...(course?.modules || []).flatMap((module) => [
      ...(module?.contents || []).flatMap((item) => [item?.externalUrl, item?.videoUrl, item?.url]),
      ...(module?.lessons || []).flatMap((item) => [item?.externalUrl, item?.videoUrl, item?.url]),
    ]),
  ].filter(Boolean);
  return candidates.find((url) => YOUTUBE_ID_RE.test(String(url))) || candidates[0] || "";
}

function extractYoutubeId(url) {
  if (!url) return null;
  const match = String(url).match(YOUTUBE_ID_RE);
  return match ? match[1] : null;
}

const mapCourseFromApi = (c) => ({
  id: String(c._id || c.id),
  title: c.title,
  category: c.category || "Foundations of ECE",
  level: c.level || "Beginner",
  duration: c.duration || c.durationText || "2 Weeks",
  description: c.description || "",
  objectives: c.objectives || "",
  contentType: c.contentType || "Video",
  contentLink: extractVideoUrl(c),
  youtubeId: c.youtubeId || extractYoutubeId(extractVideoUrl(c)),
  assignedCount: c.assignedCount || 0,
  completedCount: c.completedCount || 0,
  completion: c.completion || (c.assignedCount ? Math.round((c.completedCount / c.assignedCount) * 100) : 0),
  modules: c.modules && c.modules.length ? c.modules : undefined,
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
  modules: c.modules,
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

/* ── Verify a YouTube video actually exists/is embeddable before we save it.
     Uses the public oEmbed endpoint — no API key required.
     Returns true if the video is real, false if it's invalid/private/deleted. ── */
async function verifyYoutubeVideo(youtubeId) {
  if (!youtubeId) return false;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
    );
    return res.ok;
  } catch {
    // If the check itself fails (e.g. offline), don't block saving —
    // just skip verification rather than wrongly rejecting a valid video.
    return true;
  }
}

/* ── Build a YouTube search URL as a fallback when no valid video is on file ── */
function youtubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/* ── YouTube Thumbnail ── */
function YoutubeThumbnail({ youtubeId, title, fallbackQuery }) {
  const [playing, setPlaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [invalid, setInvalid] = useState(false);

  // Reset state whenever the video actually changes
  // (e.g. after a "Refresh Video" re-fetch), so the new thumbnail shows up.
  useEffect(() => {
    setPlaying(false);
    setChecking(false);
    setInvalid(false);
  }, [youtubeId]);

  if (!youtubeId) return null;

  const handlePlayClick = async () => {
    if (checking) return;
    setChecking(true);
    const ok = await verifyYoutubeVideo(youtubeId);
    setChecking(false);
    if (ok) {
      setPlaying(true);
    } else {
      setInvalid(true);
    }
  };

  // The stored video turned out to be unavailable/private/deleted —
  // show a clear message + a direct link to search YouTube for the topic,
  // instead of a broken embedded player.
  if (invalid) {
    return (
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "12px 12px 0 0",
        overflow: "hidden", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>Video unavailable</div>
          <div style={{ color: "#9ca3af", fontSize: 11 }}>This video has been removed or is invalid.</div>
          <a
            href={youtubeSearchUrl(fallbackQuery || title)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: "white",
              background: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: 20, textDecoration: "none" }}
          >
            🔎 Search YouTube for this topic
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "12px 12px 0 0", overflow: "hidden", background: "#000", cursor: "pointer" }}
      onClick={handlePlayClick}>
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
              {checking ? (
                <div style={{ width: 22, height: 22, border: "3px solid rgba(255,255,255,0.4)",
                  borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <div style={{ width: 0, height: 0, borderTop: "10px solid transparent",
                  borderBottom: "10px solid transparent", borderLeft: "18px solid white", marginLeft: 4 }}/>
              )}
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.8)",
            color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
            🎥 YouTube
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    if (!course?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingNotes(true);
    getCourseNotes(course.id)
      .then(res => setNotes(res.notes || []))
      .catch(err => console.error("Failed to load notes for form:", err))
      .finally(() => setLoadingNotes(false));
  }, [course?.id]);

  const resetNoteForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setEditingNote(null);
    setShowNoteForm(false);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      setToast({ msg: "Note title and content are required.", type: "error" });
      return;
    }
    try {
      if (editingNote) {
        await updateCourseNote(editingNote._id || editingNote.id, { title: noteTitle, content: noteContent });
        setToast({ msg: "Note updated.", type: "success" });
      } else {
        const savedCourse = isEdit ? course : { _id: course?.id };
        const targetCourseId = form.id || savedCourse._id || savedCourse.id;
        if (!targetCourseId) {
          setToast({ msg: "Save the course first before adding notes.", type: "error" });
          return;
        }
        await createCourseNote(targetCourseId, { title: noteTitle, content: noteContent });
        setToast({ msg: "Note added.", type: "success" });
      }
      resetNoteForm();
      if (course?.id) {
        const res = await getCourseNotes(course.id);
        setNotes(res.notes || []);
      }
    } catch (err) {
      setToast({ msg: err.message || "Failed to save note.", type: "error" });
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title || "");
    setNoteContent(note.content || "");
    setShowNoteForm(true);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteCourseNote(noteId);
      setToast({ msg: "Note deleted.", type: "success" });
      if (course?.id) {
        const res = await getCourseNotes(course.id);
        setNotes(res.notes || []);
      }
    } catch (err) {
      setToast({ msg: err.message || "Failed to delete note.", type: "error" });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      setToast({ msg: "Please fill all required fields.", type: "error" }); return;
    }
    if (form.contentType === "Video" && !form.contentLink && (!form.modules || form.modules.length === 0)) {
      setToast({ msg: "Please add a YouTube URL or provide course modules.", type: "error" }); return;
    }
    const yId = form.contentType === "Video" && form.contentLink ? getYoutubeId(form.contentLink) : null;
    onSave({ ...form, youtubeId: yId, notes });
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

        {/* Notes Section */}
        <div style={{ marginBottom: 16, padding: 14, background: "#fffbeb", borderRadius: 10, border: "2px solid #fbbf24" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showNoteForm ? 10 : 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>📝 Course Notes & Materials</div>
            {!showNoteForm && (
              <button type="button" onClick={() => { resetNoteForm(); setShowNoteForm(true); }} style={{ ...S.tblBtn, fontSize: 11, padding: "4px 10px" }}>
                + Add Note
              </button>
            )}
          </div>

          {loadingNotes ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>Loading notes...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notes.map(note => (
                <div key={note._id || note.id} style={{ background: "white", borderRadius: 8, border: "1px solid #fde68a", padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{note.title}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => handleEditNote(note)} style={{ ...S.tblBtn, fontSize: 10, padding: "2px 8px" }}>✏️</button>
                      <button type="button" onClick={() => handleDeleteNote(note._id || note.id)} style={{ ...S.tblBtn, fontSize: 10, padding: "2px 8px", color: "#dc2626", borderColor: "#fca5a5" }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-line" }}>{note.content}</div>
                </div>
              ))}
            </div>
          )}

          {showNoteForm && (
            <div style={{ marginTop: 10 }}>
              <input
                style={{ ...S.input, marginBottom: 8 }}
                placeholder="Note title"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
              />
              <textarea
                style={{ ...S.input, minHeight: 80, resize: "vertical", marginBottom: 8, fontSize: 13 }}
                placeholder="Write instructions, links, or important information..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={handleSaveNote} style={{ ...S.primaryBtn, fontSize: 12, padding: "8px 16px" }}>
                  💾 {editingNote ? "Update" : "Save Note"}
                </button>
                <button type="button" onClick={resetNoteForm} style={{ ...S.tblBtn, fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>
          {isEdit ? "Update Course →" : "Create Course →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── AI Course Generator Modal ── */
function AICourseGeneratorModal({ onClose, onSave, setToast }) {
  const [form, setForm] = useState({
    topic: "",
    duration: "2 Weeks",
    level: "Beginner",
    category: "Foundations of ECE",
    format: "Video"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("idle");

  const phases = [
    { key: "structure",    label: "Generating Course Structure...",  ms: 600 },
    { key: "objectives",  label: "Creating Learning Objectives...",  ms: 800 },
    { key: "modules",     label: "Building Modules & Lessons...",    ms: 1000 },
    { key: "notes",       label: "Generating Notes & Assignments...", ms: 700 },
    { key: "saving",      label: "Saving Course...",                 ms: 500 },
  ];

  const runPhases = async () => {
    for (const p of phases) {
      setPhase(p.key);
      await new Promise(r => setTimeout(r, p.ms));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.topic.trim()) {
      setToast({ msg: "Please enter a course topic.", type: "error" });
      return;
    }
    if (!form.duration) {
      setToast({ msg: "Please select a course duration.", type: "error" });
      return;
    }

    setLoading(true);
    setPhase("structure");
    try {
      await runPhases();
      const response = await generateCourseFromAI(form);
      if (response.course) {
        setPhase("idle");
        setToast({ msg: "Course generated successfully.", type: "success" });
        onSave(response.course);
        onClose();
      }
    } catch {
      setPhase("idle");
      const message = "AI course generation is currently unavailable. Please try again later.";
      setError(message);
      setToast({ msg: "Unable to generate the course. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const currentLabel = phases.find(p => p.key === phase)?.label || "";

  return (
    <Modal title="🤖 AI Course Generator" onClose={onClose}>
      <div style={{ background: "#f0f9ff", padding: "14px 16px", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "#0c4a6e", border: "1px solid #bae6fd", lineHeight: 1.6 }}>
        <b>How it works:</b> Enter a course topic and our AI will build a complete training package — course structure, learning objectives, YouTube video lessons, notes, and assignments — ready to publish to your library.
      </div>

      <form onSubmit={handleSubmit}>
        <label style={S.label}>Course Topic *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.topic}
          onChange={e => setForm({ ...form, topic: e.target.value })}
          placeholder="e.g. Early childhood classroom management for anganwadi teachers" />

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
              onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 4 Weeks" />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Format</label>
          <select style={S.input} value={form.format} onChange={e => setForm({ ...form, format: e.target.value })}>
            <option value="Video">🎥 Video (YouTube embeds)</option>
            <option value="PDF">📄 PDF Guide</option>
            <option value="Document">📝 Document</option>
          </select>
        </div>

        {loading && (
          <div style={{ marginBottom: 16, padding: "14px 16px", background: "#fffbeb", borderRadius: 10, border: "2px solid #fbbf24" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, border: "2.5px solid #fbbf24", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{currentLabel}</span>
            </div>
            <div style={{ height: 4, background: "#fde68a", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#f59e0b", borderRadius: 2, animation: "progress 2s ease-in-out infinite" }}/>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", fontSize: 12, color: "#991b1b" }}>
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ ...S.primaryBtn, width: "100%", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "⏳ Please wait..." : "✨ Generate Course"}
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
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const fetchNotes = async () => {
    if (!course?.id) return;
    setLoadingNotes(true);
    try {
      const res = await getCourseNotes(course.id);
      setNotes(res.notes || []);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id]);

  const resetNoteForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setEditingNote(null);
    setShowNoteForm(false);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      setToast?.({ msg: "Please enter both note title and content.", type: "error" });
      return;
    }
    try {
      if (editingNote) {
        await updateCourseNote(editingNote._id || editingNote.id, { title: noteTitle, content: noteContent });
        setToast?.({ msg: "Note updated.", type: "success" });
      } else {
        await createCourseNote(course.id, { title: noteTitle, content: noteContent });
        setToast?.({ msg: "Note added. Teachers can view it now.", type: "success" });
      }
      resetNoteForm();
      fetchNotes();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to save note.", type: "error" });
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title || "");
    setNoteContent(note.content || "");
    setShowNoteForm(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Delete this note? Teachers will no longer see it.")) return;
    try {
      await deleteCourseNote(noteId);
      setToast?.({ msg: "Note deleted.", type: "success" });
      fetchNotes();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to delete note.", type: "error" });
    }
  };

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

      <div style={{ marginBottom: 14, padding: 14, background: "#fffbeb", borderRadius: 10, border: "2px solid #fbbf24" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showNoteForm ? 10 : 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>📝 Notes & Materials for Teachers</div>
          {!showNoteForm && (
            <button onClick={() => { resetNoteForm(); setShowNoteForm(true); }} style={{ ...S.tblBtn, fontSize: 11, padding: "4px 10px" }}>
              + Add Note
            </button>
          )}
        </div>

        {loadingNotes ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>Loading notes...</div>
        ) : notes.length === 0 && !showNoteForm ? (
          <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No notes or learning materials added yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notes.map(note => (
              <div key={note._id || note.id} style={{ background: "white", borderRadius: 8, border: "1px solid #fde68a", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{note.title}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleEditNote(note)} style={{ ...S.tblBtn, fontSize: 10, padding: "2px 8px" }}>✏️</button>
                    <button onClick={() => handleDeleteNote(note._id || note.id)} style={{ ...S.tblBtn, fontSize: 10, padding: "2px 8px", color: "#dc2626", borderColor: "#fca5a5" }}>🗑️</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-line" }}>{note.content}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>By {note.createdBy?.name || "Admin"} · {new Date(note.createdAt).toLocaleDateString("en-IN")}</div>
              </div>
            ))}
          </div>
        )}

        {showNoteForm && (
          <div style={{ marginTop: 10 }}>
            <input
              style={{ ...S.input, marginBottom: 8 }}
              placeholder="Note title"
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
            />
            <textarea
              style={{ ...S.input, minHeight: 80, resize: "vertical", marginBottom: 8, fontSize: 13 }}
              placeholder="Write instructions, links, or important information for teachers..."
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSaveNote} style={{ ...S.primaryBtn, fontSize: 12, padding: "8px 16px" }}>
                💾 {editingNote ? "Update" : "Save Note"}
              </button>
              <button onClick={resetNoteForm} style={{ ...S.tblBtn, fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        )}
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
                <button onClick={() => setToast?.({ msg: `Reminder sent to ${tname}!`, type: "success" })}
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

/* ── Assign Course Modal ── */
function AssignCourseModal({ course, teachers = [], onClose, onAssigned, setToast }) {
  const [teacherId, setTeacherId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!teacherId) { setToast({ msg: "Please select a teacher.", type: "error" }); return; }
    setAssigning(true);
    try {
      await assignCourse(course.id, { teacherId, dueDate: dueDate || undefined });
      setToast({ msg: `"${course.title}" assigned to teacher! It will appear on their dashboard.`, type: "success" });
      onAssigned();
      onClose();
    } catch (err) {
      setToast({ msg: err.message || "Failed to assign course", type: "error" });
    } finally {
      setAssigning(false);
    }
  };

  const approvedTeachers = teachers.filter(t => t.status === "approved");

  return (
    <Modal title={`📋 Assign Course — ${course.title}`} onClose={onClose}>
      <div style={{ background: "#f0f9ff", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 12, color: "#0c4a6e", border: "1px solid #bae6fd" }}>
        📢 Assigning this course will create a training task on the selected teacher's dashboard with a notification.
      </div>
      <form onSubmit={handleAssign}>
        <label style={S.label}>Select Teacher *</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={teacherId} onChange={e => setTeacherId(e.target.value)} required>
          <option value="">Choose an approved teacher...</option>
          {approvedTeachers.map(t => (
            <option key={t._id || t.id} value={t._id || t.id}>{t.name} — {t.email}</option>
          ))}
        </select>
        {approvedTeachers.length === 0 && (
          <div style={{ fontSize: 12, color: "#d97706", marginBottom: 12 }}>⚠️ No approved teachers found. Approve teachers first in Teacher Management.</div>
        )}
        <label style={S.label}>Due Date (optional)</label>
        <input type="date" style={{ ...S.input, marginBottom: 20 }} value={dueDate} onChange={e => setDueDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
        <button type="submit" disabled={assigning || !teacherId} style={{ ...S.primaryBtn, width: "100%", opacity: assigning ? 0.7 : 1 }}>
          {assigning ? "Assigning..." : "📋 Assign to Teacher →"}
        </button>
      </form>
    </Modal>
  );
}

export default function CurriculumTrainingTab({ setToast }) {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [trackingModal, setTrackingModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  const loadCourses = () => {
    setLoading(true);
    Promise.all([getCourses(), getCourseAssignments(), getAdminTeachers()])
      .then(([coursesRes, assignmentsRes, teachersRes]) => {
        // Build statistics dynamically for each course
        const assns = assignmentsRes.assignments || [];
        setAssignments(assns);
        setTeachers(teachersRes.teachers || []);

        const mapped = [...new Map((coursesRes.courses || []).map(c => [String(c._id || c.id), c]))]
          .map(([, c]) => mapCourseFromApi(c));

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const ms = c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const mc = catFilter === "all" || c.category === catFilter;
    const ml = levelFilter === "all" || c.level === levelFilter;
    const mt = typeFilter === "all" || c.contentType === typeFilter;
    return ms && mc && ml && mt;
  });

  const handleSave = async (saved) => {
    const { notes, ...courseData } = saved;
    const payload = mapCourseToApi(courseData);
    let course;
    if (selectedCourse) {
      course = await updateCourse(selectedCourse.id, payload);
      showToast({ msg: "Course updated in database!", type: "success" });
    } else if (saved?._id || saved?.course?._id) {
      showToast({ msg: "AI course generated successfully.", type: "success" });
      loadCourses();
      setFormModal(false);
      setSelectedCourse(null);
      return saved;
    } else {
      course = await createCourse(payload);
      showToast({ msg: "Course created in database!", type: "success" });
    }
    const courseId = selectedCourse?.id || course?.course?._id;
    if (notes?.length && courseId) {
      try {
        await Promise.all(notes.map(n => createCourseNote(courseId, n)));
      } catch (err) {
        console.error("Failed to save some notes:", err);
        showToast({ msg: "Course saved, but some notes failed to save.", type: "error" });
      }
    }
    setFormModal(false);
    setSelectedCourse(null);
    loadCourses();
    return course;
  };

  /* Open the confirm-delete modal instead of deleting immediately */
  const handleDeleteClick = (course) => {
    setSelectedCourse(course);
    setDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedCourse) return;
    setDeleting(true);
    deleteCourse(selectedCourse.id)
      .then(() => {
        showToast({ msg: "Course deleted successfully.", type: "success" });
        setDeleteModal(false);
        setSelectedCourse(null);
        loadCourses();
      })
      .catch(err => {
        console.error("Error deleting course:", err);
        showToast({ msg: "Failed to delete course: " + err.message, type: "error" });
      })
      .finally(() => setDeleting(false));
  };

  /* Re-fetch a topic-relevant video for an existing course via the AI generator,
     keeping all other course fields (title/description/objectives/etc.) untouched.
     The returned video is verified against YouTube's oEmbed endpoint before saving,
     so we never overwrite a working video with a broken/hallucinated one. */
  const handleRefreshVideo = (course) => {
    setRefreshingId(course.id);
    generateCourseFromAI({
      topic: course.title,
      duration: course.duration,
      level: course.level,
      category: course.category,
    })
      .then(async (response) => {
        const aiCourse = response.course || {};
        const newLink = aiCourse.contentLink || "";
        const newYoutubeId = aiCourse.youtubeId || getYoutubeId(newLink);

        if (!newLink && !newYoutubeId) {
          showToast({ msg: "AI couldn't find a matching video for this topic.", type: "error" });
          return;
        }

        const isValid = await verifyYoutubeVideo(newYoutubeId);
        if (!isValid) {
          showToast({ msg: "AI suggested a video that no longer exists. Try again.", type: "error" });
          return;
        }

        const payload = mapCourseToApi({
          ...course,
          contentType: "Video",
          contentLink: newLink || course.contentLink,
          youtubeId: newYoutubeId || course.youtubeId,
        });

        return updateCourse(course.id, payload).then(() => {
          showToast({ msg: `Video refreshed for "${course.title}"!`, type: "success" });
          loadCourses();
        });
      })
      .catch(err => {
        console.error("Error refreshing video:", err);
        showToast({ msg: "Failed to refresh video: " + err.message, type: "error" });
      })
      .finally(() => setRefreshingId(null));
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

      {aiModal && (
        <AICourseGeneratorModal onClose={() => { setAiModal(false); }} onSave={handleSave}
          setToast={showToast} />
      )}
      {formModal && (
        <CourseFormModal course={selectedCourse} onSave={handleSave}
          onClose={() => { setFormModal(false); setSelectedCourse(null); }} setToast={showToast} />
      )}
      {trackingModal && selectedCourse && (
        <CourseTrackingModal course={selectedCourse} assignments={assignments}
          onClose={() => { setTrackingModal(false); setSelectedCourse(null); }} setToast={showToast} />
      )}
      {assignModal && selectedCourse && (
        <AssignCourseModal
          course={selectedCourse}
          teachers={teachers}
          onClose={() => { setAssignModal(false); setSelectedCourse(null); }}
          onAssigned={loadCourses}
          setToast={showToast}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Training & Curriculum</h1>
          <p style={S.pageSub}>{courses.length} courses · {overallPct}% overall completion</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setAiModal(true); }} style={{ ...S.primaryBtn, backgroundColor: "#6366f1", color: "white" }}>🤖 AI Generate</button>
          <button onClick={() => { setSelectedCourse(null); setFormModal(true); }} style={S.primaryBtn}>+ Create Course</button>
        </div>
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
          <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
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
          const isRefreshing = refreshingId === c.id;

          return (
            <div key={c.id} style={{ background: "white", borderRadius: 14,
              border: "1px solid #f1f5f9", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              overflow: "hidden", display: "flex", flexDirection: "column",
              transition: "box-shadow 0.2s" }}>

              <div style={{ position: "relative" }}>
                <YoutubeThumbnail youtubeId={c.youtubeId} title={c.title} fallbackQuery={`${c.title} ECE training`} />
                {c.contentType === "Video" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRefreshVideo(c); }}
                    disabled={isRefreshing}
                    title="Re-fetch a topic-matched video for this course"
                    style={{
                      position: "absolute", top: 8, right: 8, zIndex: 2,
                      background: "rgba(0,0,0,0.75)", color: "white", border: "none",
                      borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700,
                      cursor: isRefreshing ? "default" : "pointer", opacity: isRefreshing ? 0.6 : 1,
                      display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    {isRefreshing ? "⏳ Refreshing..." : "🔄 Refresh Video"}
                  </button>
                )}
              </div>

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
                  <button onClick={() => { setSelectedCourse(c); setAssignModal(true); }}
                    style={{ ...S.tblBtn, flex: 1, color: "#059669", borderColor: "#6ee7b7" }}>
                    📋 Assign
                  </button>
                  <button onClick={() => { setSelectedCourse(c); setTrackingModal(true); }}
                    style={{ ...S.tblBtn, flex: 1, color: "#2563eb", borderColor: "#bfdbfe" }}>
                    📊 Track
                  </button>
                  <button onClick={() => { setSelectedCourse(c); setFormModal(true); }} style={S.tblBtn}>✏️</button>
                  <button onClick={() => handleDeleteClick(c)}
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
