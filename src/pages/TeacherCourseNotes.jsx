import { useState, useEffect } from "react";
import { S, StatusBadge } from "../components/Shared";
import { getCourseNotes } from "../services/api";

/* ══════════════════════════════════════════════════════════════
   TEACHER "MY COURSES" — Notes Reader (replaces the video player)
   - Every course is a set of admin-authored notes, fetched from
     the SAME Course Notes API the admin uses to create them
     (getCourseNotes/createCourseNote/etc in CurriculumTrainingTab).
   - Each note = one "topic" in the reader. Reading a topic marks
     it "read"; completion % = topics read / total topics, saved
     through the SAME onMarkDone callback used previously for video
     progress, so admin tracking keeps working unchanged.
   - Once 100% of a course's notes are read, a banner invites the
     teacher to take that course's Assessment.
══════════════════════════════════════════════════════════════ */

function isTopicRead(assignment, topicId) {
  return assignment?.completedContent?.includes(topicId) || false;
}

export default function TeacherCourseNotes({ assignments = [], onMarkDone, onGoToAssessment }) {
  const [activeAssignmentId, setActiveAssignmentId] = useState(null);
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);

  // notesByCourseId: { [courseId]: { loading, topics: [{_id, title, notes}] } }
  const [notesByCourseId, setNotesByCourseId] = useState({});

  const getCourseId = (assignment) => assignment?.course?._id || assignment?.course?.id || assignment?.course;

  // Load note counts for every assignment up front, so the overview
  // cards can show accurate "X/Y topics read" + completion %.
  useEffect(() => {
    assignments.forEach((a) => {
      const courseId = getCourseId(a);
      if (!courseId || notesByCourseId[courseId]) return;
      setNotesByCourseId((prev) => ({ ...prev, [courseId]: { loading: true, topics: [] } }));
      getCourseNotes(courseId)
        .then((res) => {
          const topics = (res.notes || []).map((n) => ({
            _id: n._id || n.id,
            title: n.title,
            notes: n.content,
          }));
          setNotesByCourseId((prev) => ({ ...prev, [courseId]: { loading: false, topics } }));
        })
        .catch((err) => {
          console.error("Failed to load course notes:", err);
          setNotesByCourseId((prev) => ({ ...prev, [courseId]: { loading: false, topics: [] } }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments]);

  const activeAssignment = assignments.find((a) => a._id === activeAssignmentId);
  const activeCourseId = activeAssignment ? getCourseId(activeAssignment) : null;
  const topics = activeCourseId ? notesByCourseId[activeCourseId]?.topics || [] : [];
  const activeTopic = topics[activeTopicIdx];

  const markTopicRead = (assignment, topicId) => {
    if (!assignment || isTopicRead(assignment, topicId)) return;
    const completedContent = [...(assignment.completedContent || []), topicId];
    const allTopics = notesByCourseId[getCourseId(assignment)]?.topics || [];
    const progressPercent = allTopics.length > 0 ? Math.round((completedContent.length / allTopics.length) * 100) : 0;
    onMarkDone && onMarkDone(assignment._id, {
      completedContent,
      progressPercent,
      status: progressPercent === 100 ? "completed" : "in_progress",
    });
  };

  /* ── Course list view ── */
  if (!activeAssignmentId) {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <h1 style={S.pageTitle}>My Courses</h1>
        <p style={S.pageSub}>Read each course's topic-wise notes to complete it — no videos, just focused study material.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {assignments.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
              No courses assigned yet. Your admin will assign courses from the Course Library.
            </div>
          ) : (
            assignments.map((c) => {
              const courseId = getCourseId(c);
              const entry = notesByCourseId[courseId];
              const allTopics = entry?.topics || [];
              const notesLoading = entry?.loading;
              const done = allTopics.filter((t) => isTopicRead(c, t._id)).length;
              const progress = allTopics.length ? Math.round((done / allTopics.length) * 100) : (c.progressPercent || 0);
              return (
                <div key={c._id} style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderLeft: "4px solid #f59e0b" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ fontSize: 36 }}>📖</div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>{c.course?.title}</h3>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <StatusBadge status={c.status} />
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>📅 Due: {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "No due date"}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>
                            📖 {notesLoading ? "Loading…" : `${done}/${allTopics.length} topics read`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>{progress}%</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>Complete</div>
                    </div>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#f59e0b,#d97706)", borderRadius: 4, transition: "width 0.8s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>📚 {allTopics.length} topics total</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {progress === 100 && allTopics.length > 0 && onGoToAssessment && (
                        <button onClick={() => onGoToAssessment(c)} style={{ ...S.exportBtn, borderColor: "#10b981", color: "#059669" }}>📝 Take Assessment</button>
                      )}
                      <button
                        onClick={() => { setActiveAssignmentId(c._id); setActiveTopicIdx(0); }}
                        style={{ ...S.primaryBtn, padding: "8px 20px", fontSize: 12 }}
                      >
                        {progress > 0 ? "Continue Reading →" : "Start Reading →"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  /* ── Notes reader view ── */
  const notesLoading = activeCourseId ? notesByCourseId[activeCourseId]?.loading : false;
  const readCount = topics.filter((t) => isTopicRead(activeAssignment, t._id)).length;
  const overallProg = topics.length ? Math.round((readCount / topics.length) * 100) : 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setActiveAssignmentId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#374151" }}>← Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...S.pageTitle, margin: 0 }}>📖 {activeAssignment?.course?.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", maxWidth: 300 }}>
              <div style={{ height: "100%", width: `${overallProg}%`, background: "#f59e0b", borderRadius: 4, transition: "width 0.6s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>{overallProg}% complete</span>
          </div>
        </div>
        {overallProg === 100 && topics.length > 0 && onGoToAssessment && (
          <button onClick={() => onGoToAssessment(activeAssignment)} style={{ ...S.primaryBtn, background: "linear-gradient(135deg,#10b981,#059669)" }}>📝 Take Assessment →</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* Topic list sidebar */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "14px 16px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>Course Topics</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{topics.length} topics · {readCount} read</div>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 600 }}>
            {topics.map((topic, i) => {
              const topicId = topic._id;
              const read = isTopicRead(activeAssignment, topicId);
              const isActive = i === activeTopicIdx;
              return (
                <div key={topicId || i} onClick={() => setActiveTopicIdx(i)}
                  style={{ padding: "12px 16px", background: isActive ? "#fef3c7" : "white", borderBottom: "1px solid #f9fafb", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}` }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: read ? "#10b981" : isActive ? "#f59e0b" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", flexShrink: 0 }}>
                    {read ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? "#92400e" : "#374151", lineHeight: 1.3 }}>{topic.title}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes content */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          {notesLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 14 }}>Loading notes…</div>
            </div>
          ) : activeTopic ? (
            <div style={{ padding: "24px 28px" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, marginBottom: 6 }}>TOPIC {activeTopicIdx + 1} OF {topics.length}</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: "#1c1917", marginBottom: 18 }}>{activeTopic.title}</div>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.9, whiteSpace: "pre-line", marginBottom: 24 }}>
                {activeTopic.notes || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No content was added for this note.</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                <button
                  disabled={activeTopicIdx === 0}
                  onClick={() => setActiveTopicIdx((i) => Math.max(0, i - 1))}
                  style={{ ...S.tblBtn, opacity: activeTopicIdx === 0 ? 0.4 : 1 }}
                >← Previous Topic</button>

                {isTopicRead(activeAssignment, activeTopic._id) ? (
                  <span style={{ background: "#d1fae5", color: "#065f46", padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800 }}>✓ Marked as Read</span>
                ) : (
                  <button
                    onClick={() => markTopicRead(activeAssignment, activeTopic._id)}
                    style={{ ...S.primaryBtn }}
                  >
                    ✅ Mark as Read & Continue
                  </button>
                )}

                <button
                  disabled={activeTopicIdx === topics.length - 1}
                  onClick={() => {
                    markTopicRead(activeAssignment, activeTopic._id);
                    setActiveTopicIdx((i) => Math.min(topics.length - 1, i + 1));
                  }}
                  style={{ ...S.primaryBtn, opacity: activeTopicIdx === topics.length - 1 ? 0.4 : 1 }}
                >Next Topic →</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 14 }}>No notes found for this course yet. Ask your admin to add notes in Course Management.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}