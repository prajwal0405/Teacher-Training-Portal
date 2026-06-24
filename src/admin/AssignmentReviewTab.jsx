import { useMemo, useState } from "react";
import { S } from "../components/Shared";
import { updateCourseAssignmentReview } from "../services/api";
import { AR_BTN_GHOST, AR_BTN_PRIMARY, AR_CLOSE, AR_HDR, AR_MODAL, AR_OVERLAY } from "./adminStyles";

const FALLBACK_REVIEWERS = ["Dr. Rekha Iyer", "Prof. Amol Desai", "Ms. Geeta Rao", "Dr. Vikram Shah", "Mr. Sunil Mehta"];

const DEFAULT_RUBRIC = [
  { criterion: "Content accuracy", score: null, maxScore: 25 },
  { criterion: "Age-appropriate planning", score: null, maxScore: 25 },
  { criterion: "Presentation and clarity", score: null, maxScore: 20 },
  { criterion: "Practical classroom use", score: null, maxScore: 30 },
];

const workflowSteps = [
  "Open the assignment from the inbox list.",
  "Assign a reviewer if the task needs a specific trainer.",
  "Fill in rubric marks and written feedback.",
  "Save the review, then approve it or request a revision.",
];

const toText = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "object") {
    return String(value.name || value.title || value.fullName || value.email || value._id || value.id || fallback).trim() || fallback;
  }
  return String(value).trim() || fallback;
};

const assignmentId = (assignment) => String(assignment?.id || assignment?._id || "");
const getTeacherName = (assignment) => toText(assignment?.teacher, "Unknown Teacher");
const getCourseName = (assignment) => toText(assignment?.course, "Unknown Course");
const getReviewerName = (assignment) => toText(assignment?.reviewedBy || assignment?.trainer, "Unassigned");

const getRubricRows = (assignment) => {
  if (Array.isArray(assignment?.rubric) && assignment.rubric.length > 0) return assignment.rubric;
  return DEFAULT_RUBRIC.map((row) => ({ ...row }));
};

const rubricTotal = (assignment) => getRubricRows(assignment).reduce((sum, row) => sum + (Number(row.score) || 0), 0);
const rubricMax = (assignment) => getRubricRows(assignment).reduce((sum, row) => sum + (Number(row.maxScore) || 0), 0);
const rubricPct = (assignment) => {
  const max = rubricMax(assignment);
  return max ? Math.round((rubricTotal(assignment) / max) * 100) : 0;
};

const statusColor = {
  pending: "#f59e0b",
  "under review": "#3b82f6",
  reviewed: "#10b981",
  revision: "#ef4444",
  approved: "#7c3aed",
};

const statusBg = {
  pending: "#fef9c3",
  "under review": "#dbeafe",
  reviewed: "#d1fae5",
  revision: "#fee2e2",
  approved: "#ede9fe",
};

const nowLabel = (value) => {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export default function AssignmentReviewTab({ assignments, setAssignments, setToast, teachers = [], user }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [reviewerFilter, setReviewerFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [activePanel, setActivePanel] = useState("review");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [annoColor, setAnnoColor] = useState("#f59e0b");
  const [annoText, setAnnoText] = useState("");
  const [annoPage, setAnnoPage] = useState(1);
  const [addAnnoMode, setAddAnnoMode] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [assignReviewer, setAssignReviewer] = useState("");

  const reviewers = useMemo(() => {
    const names = [];
    teachers.forEach((teacher) => {
      const name = toText(teacher);
      if (name) names.push(name);
    });
    assignments.forEach((item) => {
      const reviewer = getReviewerName(item);
      if (reviewer && reviewer !== "Unassigned") names.push(reviewer);
    });
    const unique = [...new Set(names.filter(Boolean))];
    return unique.length > 0 ? unique : FALLBACK_REVIEWERS;
  }, [teachers, assignments]);

  const courseOptions = useMemo(
    () => [...new Set(assignments.map(getCourseName).filter(Boolean))],
    [assignments]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = assignments.filter((item) => {
      const teacher = getTeacherName(item).toLowerCase();
      const title = toText(item?.title, "Course Assignment").toLowerCase();
      const course = getCourseName(item).toLowerCase();
      const reviewer = getReviewerName(item).toLowerCase();
      const matchesSearch = !q || teacher.includes(q) || title.includes(q) || course.includes(q) || reviewer.includes(q);
      const matchesStatus = statusFilter === "all" || item?.status === statusFilter;
      const matchesCourse = courseFilter === "all" || getCourseName(item) === courseFilter;
      const matchesReviewer = reviewerFilter === "all" || getReviewerName(item) === reviewerFilter;
      return matchesSearch && matchesStatus && matchesCourse && matchesReviewer;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.submittedDate || b.updatedAt || b.createdAt || 0) - new Date(a.submittedDate || a.updatedAt || a.createdAt || 0);
      }
      if (sortBy === "course") return getCourseName(a).localeCompare(getCourseName(b));
      if (sortBy === "teacher") return getTeacherName(a).localeCompare(getTeacherName(b));
      if (sortBy === "status") return String(a.status || "").localeCompare(String(b.status || ""));
      return 0;
    });
  }, [assignments, courseFilter, reviewerFilter, search, sortBy, statusFilter]);

  const pending = assignments.filter((item) => item.status === "pending").length;
  const underReview = assignments.filter((item) => item.status === "under review").length;
  const reviewed = assignments.filter((item) => item.status === "reviewed").length;
  const approved = assignments.filter((item) => item.status === "approved").length;
  const revision = assignments.filter((item) => item.status === "revision").length;

  const patchAssignment = async (id, changes, successMessage) => {
    const previousAssignments = assignments;
    const previousSelected = selected;
    const nextAssignments = assignments.map((item) => (assignmentId(item) === String(id) ? { ...item, ...changes } : item));
    const nextSelected = previousSelected && assignmentId(previousSelected) === String(id)
      ? { ...previousSelected, ...changes }
      : previousSelected;

    setAssignments(nextAssignments);
    setSelected(nextSelected);

    try {
      const response = await updateCourseAssignmentReview(id, changes);
      const saved = response?.assignment ? response.assignment : null;
      if (saved) {
        const normalized = {
          ...saved,
          id: saved._id || saved.id,
        };
        setAssignments((current) => current.map((item) => (assignmentId(item) === String(id) ? { ...item, ...normalized } : item)));
        if (nextSelected && assignmentId(nextSelected) === String(id)) {
          setSelected((current) => (current && assignmentId(current) === String(id) ? { ...current, ...normalized } : current));
        }
      }
      if (successMessage) {
        setToast({ msg: successMessage, type: "success" });
      }
      return response;
    } catch (error) {
      setAssignments(previousAssignments);
      setSelected(previousSelected);
      setToast({ msg: error.message || "Could not save assignment review.", type: "error" });
      throw error;
    }
  };

  const updateRubricScore = async (id, index, score) => {
    const target = assignments.find((item) => assignmentId(item) === String(id));
    if (!target) return;
    const rows = getRubricRows(target).map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const safeScore = score === "" ? null : Math.max(0, Math.min(Number(score) || 0, Number(row.maxScore) || 0));
      return { ...row, score: safeScore };
    });
    await patchAssignment(id, { rubric: rows, score: rows.reduce((sum, row) => sum + (Number(row.score) || 0), 0) });
  };

  const buildReviewPayload = (assignment, extra = {}) => ({
    ...extra,
    reviewedBy: user?.id || user?._id || undefined,
    reviewedAt: new Date().toISOString(),
    score: extra.score ?? rubricTotal(assignment),
  });

  const canFinalize = (assignment) => {
    const rows = getRubricRows(assignment);
    if (!rows.length) return false;
    return rows.every((row) => row.score !== null && row.score !== undefined && row.score !== "");
  };

  const handleStartReview = async (id) => {
    await patchAssignment(id, { status: "under review", reviewedBy: user?.id || user?._id || undefined, reviewedAt: new Date().toISOString() }, "Marked as under review.");
  };

  const handleSaveReview = async (assignment) => {
    if (!toText(assignment.feedback).trim()) {
      setToast({ msg: "Please add feedback before saving the review.", type: "error" });
      return;
    }
    await patchAssignment(
      assignment.id,
      buildReviewPayload(assignment, { status: "reviewed", feedback: assignment.feedback, rubric: getRubricRows(assignment) }),
      "Review saved."
    );
  };

  const handleApprove = async (assignment) => {
    if (!canFinalize(assignment)) {
      setToast({ msg: "Fill every rubric score before approving.", type: "error" });
      return;
    }
    if (!toText(assignment.feedback).trim()) {
      setToast({ msg: "Add written feedback before approving.", type: "error" });
      return;
    }
    await patchAssignment(
      assignment.id,
      buildReviewPayload(assignment, { status: "approved", feedback: assignment.feedback, rubric: getRubricRows(assignment) }),
      "Assignment approved."
    );
  };

  const handleRevision = async (assignment) => {
    if (!toText(assignment.feedback).trim()) {
      setToast({ msg: "Add feedback before requesting a revision.", type: "error" });
      return;
    }
    await patchAssignment(
      assignment.id,
      buildReviewPayload(assignment, { status: "revision", feedback: assignment.feedback, rubric: getRubricRows(assignment) }),
      "Revision requested."
    );
  };

  const handleNotify = async (id) => {
    await patchAssignment(id, { notified: true }, "Teacher notified.");
  };

  const handleAssignReviewer = async (id) => {
    if (!assignReviewer) {
      setToast({ msg: "Select a reviewer.", type: "error" });
      return;
    }
    await patchAssignment(
      id,
      {
        trainer: assignReviewer,
        status: "under review",
        reviewedBy: user?.id || user?._id || undefined,
        reviewedAt: new Date().toISOString(),
      },
      `Assigned to ${assignReviewer}.`
    );
    setAssignModal(null);
    setAssignReviewer("");
  };

  const addAnnotation = async (id) => {
    if (!annoText.trim()) {
      setToast({ msg: "Annotation text cannot be empty.", type: "error" });
      return;
    }
    const target = assignments.find((item) => assignmentId(item) === String(id));
    const annotation = {
      id: String(Date.now()),
      page: annoPage,
      x: Math.round(Math.random() * 60 + 10),
      y: Math.round(Math.random() * 60 + 10),
      text: annoText.trim(),
      color: annoColor,
    };
    const nextAnnotations = [...(target?.annotations || []), annotation];
    await patchAssignment(id, { annotations: nextAnnotations }, "Annotation added.");
    setAnnoText("");
    setAddAnnoMode(false);
  };

  const removeAnnotation = async (assignmentToUpdate, annotationId) => {
    const nextAnnotations = (assignmentToUpdate.annotations || []).filter((item) => item.id !== annotationId);
    await patchAssignment(assignmentToUpdate.id, { annotations: nextAnnotations }, "Annotation removed.");
  };

  const runAiFeedback = async (assignment) => {
    setAiLoading(true);
    setAiSuggestion("");
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const pct = rubricPct(assignment);
    const teacherName = getTeacherName(assignment).split(" ")[0] || "Teacher";
    const title = toText(assignment?.title, "the assignment");

    const suggestion = pct >= 85
      ? `Dear ${teacherName},\n\nExcellent work on "${title}". Your submission is clear, aligned to the course outcomes, and ready for approval.\n\nHighlights:\n- Strong content accuracy\n- Clear presentation\n- Practical classroom application\n\nBest regards,\nAdmin Team`
      : pct >= 60
        ? `Dear ${teacherName},\n\nThank you for submitting "${title}". The submission is on the right track, but a few areas need strengthening.\n\n- Add a little more classroom detail\n- Tighten the structure and sequencing\n- Review the rubric comments before final submission\n\nBest regards,\nAdmin Team`
        : `Dear ${teacherName},\n\nThank you for submitting "${title}". The work needs more improvement before it can be approved.\n\n- Revisit the assignment instructions\n- Improve alignment with the learning outcomes\n- Expand the practical examples\n\nBest regards,\nAdmin Team`;

    setAiSuggestion(suggestion);
    setAiLoading(false);
  };

  const applyAiFeedback = async (assignment) => {
    await patchAssignment(assignment.id, { feedback: aiSuggestion }, "AI feedback applied.");
    setAiSuggestion("");
  };

  const listHeader = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
      <div>
        <h1 style={S.pageTitle}>Assignment Review</h1>
        <p style={S.pageSub}>{pending} pending, {underReview} under review, {revision} need revision</p>
      </div>
    </div>
  );

  const howToUse = (
    <div style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>How this page works</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        {workflowSteps.map((step, index) => (
          <div key={step} style={{ border: "1px solid #f3f4f6", borderRadius: 10, padding: 12, background: "#fafafa" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#92400e", marginBottom: 4 }}>Step {index + 1}</div>
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{step}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const reviewerModal = assignModal ? (
    <div style={AR_OVERLAY}>
      <div style={AR_MODAL}>
        <div style={AR_HDR}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Assign Reviewer</span>
          <button onClick={() => setAssignModal(null)} style={AR_CLOSE}>x</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>
          <label style={S.label}>Select reviewer *</label>
          <select
            style={{ ...S.input, marginBottom: 20 }}
            value={assignReviewer}
            onChange={(e) => setAssignReviewer(e.target.value)}
          >
            <option value="">Select a reviewer...</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer} value={reviewer}>{reviewer}</option>
            ))}
          </select>
          <button onClick={() => handleAssignReviewer(assignModal)} style={{ ...AR_BTN_PRIMARY, width: "100%" }}>
            Assign and move to review
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const renderDetail = (assignment) => {
    const rows = getRubricRows(assignment);
    const total = rubricTotal(assignment);
    const max = rubricMax(assignment);
    const pct = rubricPct(assignment);
    const scoreColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
    const currentTeacher = getTeacherName(assignment);
    const currentCourse = getCourseName(assignment);

    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {reviewerModal}
        <button onClick={() => { setSelected(null); setAiSuggestion(""); }} style={S.backBtn}>Back to assignments</button>

        <div style={{ background: "white", borderRadius: 18, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white", flexShrink: 0 }}>
              {currentTeacher[0] || "A"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>{toText(assignment.title, "Course Assignment")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusBg[assignment.status] || "#f3f4f6", color: statusColor[assignment.status] || "#6b7280" }}>
                  {(assignment.status || "pending").toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Teacher: {currentTeacher}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Course: {currentCourse}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Reviewer: {getReviewerName(assignment)}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Submitted: {assignment.submitted || "Not submitted"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setAssignModal(assignment.id)} style={AR_BTN_GHOST}>Assign</button>
              {!assignment.notified && (assignment.status === "approved" || assignment.status === "revision" || assignment.status === "reviewed") && (
                <button onClick={() => handleNotify(assignment.id)} style={{ ...AR_BTN_PRIMARY, background: "#8b5cf6" }}>Notify Teacher</button>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {[
              { label: "Assigned Reviewer", value: assignment.trainer || "Unassigned" },
              { label: "Reviewed By", value: getReviewerName(assignment) },
              { label: "Reviewed At", value: nowLabel(assignment.reviewedAt) },
              { label: "Score", value: assignment.score != null ? `${assignment.score} / ${max}` : "Not saved" },
            ].map((item) => (
              <div key={item.label} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 13px", border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {assignment.status === "pending" && (
              <button onClick={() => handleStartReview(assignment.id)} style={{ ...AR_BTN_GHOST, color: "#2563eb", borderColor: "#93c5fd" }}>Start Review</button>
            )}
            <button onClick={() => handleSaveReview(assignment)} style={{ ...AR_BTN_PRIMARY, background: "#0f766e" }}>Save Review</button>
            <button onClick={() => handleApprove(assignment)} style={{ ...AR_BTN_PRIMARY, background: "#059669" }}>Approve</button>
            <button onClick={() => handleRevision(assignment)} style={{ ...AR_BTN_PRIMARY, background: "#dc2626" }}>Request Revision</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #f3f4f6" }}>
          {[
            { key: "review", label: "Review & Feedback" },
            { key: "rubric", label: "Scoring Rubric" },
            { key: "pdf", label: "PDF Viewer" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActivePanel(tab.key)}
              style={{
                padding: "10px 18px",
                border: "none",
                borderBottom: `2px solid ${activePanel === tab.key ? "#f59e0b" : "transparent"}`,
                background: "none",
                color: activePanel === tab.key ? "#92400e" : "#9ca3af",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: -2,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activePanel === "review" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18 }}>
            <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Written Feedback</div>
                <button
                  onClick={() => runAiFeedback(assignment)}
                  disabled={aiLoading}
                  style={{ ...AR_BTN_PRIMARY, background: "#8b5cf6", fontSize: 11, opacity: aiLoading ? 0.7 : 1 }}
                >
                  {aiLoading ? "Generating..." : "AI Assist"}
                </button>
              </div>

              <textarea
                value={assignment.feedback || ""}
                onChange={(e) => patchAssignment(assignment.id, { feedback: e.target.value })}
                rows={8}
                style={{ ...S.input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, fontSize: 13 }}
                placeholder="Write detailed feedback for the teacher here..."
              />

              {aiLoading && (
                <div style={{ marginTop: 10, padding: 14, background: "#f5f3ff", borderRadius: 10, border: "1px solid #c4b5fd", fontSize: 12, color: "#7c3aed" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>AI is preparing a feedback draft...</div>
                  <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
                    <div style={{ height: "100%", width: "65%", background: "#8b5cf6", borderRadius: 4 }} />
                  </div>
                </div>
              )}

              {aiSuggestion && (
                <div style={{ marginTop: 10, padding: 14, background: "#f5f3ff", borderRadius: 10, border: "1px solid #c4b5fd" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", marginBottom: 6 }}>AI Suggested Feedback</div>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#374151", lineHeight: 1.6, fontFamily: "inherit", maxHeight: 180, overflowY: "auto" }}>{aiSuggestion}</pre>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => applyAiFeedback(assignment)} style={{ ...AR_BTN_PRIMARY, flex: 1, fontSize: 11 }}>Use This Feedback</button>
                    <button onClick={() => setAiSuggestion("")} style={{ ...AR_BTN_GHOST, flex: 1, fontSize: 11 }}>Dismiss</button>
                  </div>
                </div>
              )}

              {!assignment.notified && (assignment.status === "approved" || assignment.status === "revision" || assignment.status === "reviewed") && (
                <button onClick={() => handleNotify(assignment.id)} style={{ ...AR_BTN_PRIMARY, width: "100%", marginTop: 10, background: "#8b5cf6" }}>
                  Send feedback notification to teacher
                </button>
              )}
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Review Summary</div>
              {rows.map((row, index) => {
                const rowPct = row.score != null ? Math.round((row.score / row.maxScore) * 100) : 0;
                const rowColor = row.score != null ? (rowPct >= 80 ? "#10b981" : rowPct >= 60 ? "#f59e0b" : "#ef4444") : "#d1d5db";
                return (
                  <div key={`${row.criterion}-${index}`} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: "#374151" }}>{row.criterion}</span>
                      <span style={{ fontWeight: 800, color: rowColor }}>
                        {row.score != null ? `${row.score} / ${row.maxScore}` : `- / ${row.maxScore}`}
                      </span>
                    </div>
                    <div style={{ height: 7, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${rowPct}%`, background: rowColor, borderRadius: 6, transition: "width .5s" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: "2px solid #f3f4f6", paddingTop: 12, marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Total</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor }}>{total} / {max}</span>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: scoreColor, borderRadius: 6 }} />
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, textAlign: "right" }}>
                  {pct >= 80 ? "Pass" : pct >= 60 ? "Borderline" : "Needs work"}
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel === "rubric" && (
          <div style={{ background: "white", borderRadius: 16, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Scoring Rubric - {toText(assignment.title, "Course Assignment")}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>Fill every score before approval. Total marks: {max}.</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {rows.map((row, index) => {
                const rowPct = row.score != null ? Math.round((row.score / row.maxScore) * 100) : 0;
                const rowColor = row.score != null ? (rowPct >= 80 ? "#10b981" : rowPct >= 60 ? "#f59e0b" : "#ef4444") : "#d1d5db";
                return (
                  <div key={`${row.criterion}-${index}`} style={{ padding: 16, background: "#f9fafb", borderRadius: 12, border: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{row.criterion}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Maximum: {row.maxScore} marks</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="number"
                          min="0"
                          max={row.maxScore}
                          value={row.score ?? ""}
                          onChange={(e) => updateRubricScore(assignment.id, index, e.target.value)}
                          placeholder="0"
                          style={{ width: 72, padding: "8px 10px", borderRadius: 9, border: `2px solid ${rowColor}`, fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: rowColor, textAlign: "center", outline: "none" }}
                        />
                        <span style={{ fontSize: 14, color: "#9ca3af" }}>/ {row.maxScore}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${rowPct}%`, background: rowColor, borderRadius: 4, transition: "width .4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, padding: 18, background: `${scoreColor}15`, borderRadius: 14, border: `2px solid ${scoreColor}40`, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Total Score</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor }}>{total} <span style={{ fontSize: 18, color: "#9ca3af" }}>/ {max}</span></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: scoreColor, marginTop: 4 }}>{pct}% - {pct >= 80 ? "Pass" : pct >= 60 ? "Borderline" : "Needs work"}</div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={() => handleSaveReview(assignment)} style={{ ...AR_BTN_PRIMARY, flex: 1, background: "#0f766e" }}>Save Review</button>
              <button onClick={() => handleApprove(assignment)} style={{ ...AR_BTN_PRIMARY, flex: 1, background: "#059669" }}>Approve</button>
              <button onClick={() => handleRevision(assignment)} style={{ ...AR_BTN_PRIMARY, flex: 1, background: "#dc2626" }}>Request Revision</button>
            </div>
          </div>
        )}

        {activePanel === "pdf" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>PDF</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1 }}>{toText(assignment.title, "assignment")}.pdf</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Page</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={annoPage}
                    onChange={(e) => setAnnoPage(Number(e.target.value))}
                    style={{ width: 48, padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb", textAlign: "center", fontSize: 12, fontFamily: "inherit" }}
                  />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>of 5</span>
                </div>
              </div>

              <div style={{ position: "relative", background: "#fff", minHeight: 480, padding: 24 }}>
                <div style={{ fontFamily: "Georgia, serif", color: "#374151" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, textAlign: "center", color: "#0f172a" }}>
                    {toText(assignment.title, "Course Assignment")}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginBottom: 20 }}>
                    Submitted by {currentTeacher} | {assignment.submitted || "Not submitted"} | {currentCourse}
                  </div>
                  {[
                    "This assignment explores the core principles of early childhood education with a focus on age-appropriate learning methodologies.",
                    "Section 1: Learning objectives and planned outcomes.",
                    "Section 2: Activity design and classroom implementation.",
                    "Section 3: Assessment strategy and evidence collection.",
                    "Section 4: Resources required for delivery.",
                  ].map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 12, color: "#374151" }}>{paragraph}</p>
                  ))}
                </div>

                {(assignment.annotations || []).filter((item) => item.page === annoPage).map((annotation) => (
                  <div key={annotation.id} style={{ position: "absolute", left: `${annotation.x}%`, top: `${annotation.y}%`, zIndex: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: annotation.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white", fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", border: "2px solid white" }} title={annotation.text}>
                      Note
                    </div>
                    <div style={{ position: "absolute", left: 28, top: -4, background: annotation.color, color: "white", padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", maxWidth: 160 }}>
                      {annotation.text}
                    </div>
                  </div>
                ))}

                {addAnnoMode && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(245,158,11,0.08)", border: "2px dashed #f59e0b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "crosshair", zIndex: 5 }}>
                    <div style={{ background: "#fef3c7", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#92400e" }}>Click anywhere on the document to place annotation</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Add Annotation</div>
                <label style={S.label}>Annotation Text</label>
                <textarea
                  value={annoText}
                  onChange={(e) => setAnnoText(e.target.value)}
                  rows={3}
                  style={{ ...S.input, resize: "none", marginBottom: 10, fontSize: 12 }}
                  placeholder="Add a note or comment..."
                />
                <label style={S.label}>Color</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAnnoColor(color)}
                      style={{ width: 26, height: 26, borderRadius: "50%", background: color, cursor: "pointer", border: `3px solid ${annoColor === color ? "#0f172a" : "transparent"}` }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setAddAnnoMode((value) => !value)} style={{ ...AR_BTN_GHOST, flex: 1 }}>
                    {addAnnoMode ? "Cancel Pin Mode" : "Pin Mode"}
                  </button>
                  <button onClick={() => addAnnotation(assignment.id)} style={{ ...AR_BTN_PRIMARY, flex: 1 }}>Add Pin</button>
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>Annotations ({(assignment.annotations || []).length})</div>
                {(assignment.annotations || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 12 }}>No annotations yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                    {(assignment.annotations || []).map((annotation) => (
                      <div key={annotation.id} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${annotation.color}40`, background: `${annotation.color}10`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: annotation.color, flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{annotation.text}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Page {annotation.page}</div>
                        </div>
                        <button onClick={() => removeAnnotation(assignment, annotation.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 0 }}>x</button>
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
  };

  const renderList = () => (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {reviewerModal}
      {listHeader}
      {howToUse}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Pending", val: pending, color: "#f59e0b" },
          { label: "Under Review", val: underReview, color: "#3b82f6" },
          { label: "Reviewed", val: reviewed, color: "#10b981" },
          { label: "Revision", val: revision, color: "#ef4444" },
          { label: "Approved", val: approved, color: "#7c3aed" },
        ].map((item) => (
          <div
            key={item.label}
            style={{ background: "white", borderRadius: 12, padding: "12px 14px", border: `1px solid ${item.color}30`, borderLeft: `3px solid ${item.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer" }}
            onClick={() => setStatusFilter((value) => (value === item.label.toLowerCase() ? "all" : item.label.toLowerCase()))}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{item.val}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".3px" }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>Find</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teacher, title, course..."
              style={{ ...S.input, paddingLeft: 34, marginBottom: 0 }} />
          </div>
          {["all", "pending", "under review", "reviewed", "revision", "approved"].map((item) => (
            <button
              key={item}
              onClick={() => setStatusFilter(item)}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${statusFilter === item ? "#f59e0b" : "#e5e7eb"}`, background: statusFilter === item ? "#fef3c7" : "white", color: statusFilter === item ? "#92400e" : "#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", whiteSpace: "nowrap" }}
            >
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={{ ...S.input, marginBottom: 0, width: 220 }}>
            <option value="all">All Courses</option>
            {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
          </select>
          <select value={reviewerFilter} onChange={(e) => setReviewerFilter(e.target.value)} style={{ ...S.input, marginBottom: 0, width: 220 }}>
            <option value="all">All Reviewers</option>
            {reviewers.map((reviewer) => <option key={reviewer} value={reviewer}>{reviewer}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...S.input, marginBottom: 0, width: 160 }}>
            <option value="date">Sort: Date</option>
            <option value="course">Sort: Course</option>
            <option value="teacher">Sort: Teacher</option>
            <option value="status">Sort: Status</option>
          </select>
          {(search || statusFilter !== "all" || courseFilter !== "all" || reviewerFilter !== "all") && (
            <button onClick={() => { setSearch(""); setStatusFilter("all"); setCourseFilter("all"); setReviewerFilter("all"); }} style={{ ...AR_BTN_GHOST, color: "#ef4444", borderColor: "#fca5a5" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>Showing {filtered.length} of {assignments.length} assignments</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((item) => {
          const max = rubricMax(item);
          const pct = rubricPct(item);
          const scoreColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";

          return (
            <div key={assignmentId(item)} style={{ background: "white", borderRadius: 14, padding: "16px 20px", border: "1px solid #f1f5f9", borderLeft: `4px solid ${statusColor[item.status] || "#e5e7eb"}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "white", flexShrink: 0 }}>
                  {getTeacherName(item)[0] || "A"}
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{toText(item.title, "Course Assignment")}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>Teacher: {getTeacherName(item)}</span>
                    <span>Course: {getCourseName(item)}</span>
                    <span>Reviewer: {getReviewerName(item)}</span>
                    <span>Submitted: {item.submitted || "Not submitted"}</span>
                  </div>
                </div>

                {item.score != null && (
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: scoreColor }}>{item.score}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>/ {max}</div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: statusBg[item.status] || "#f3f4f6", color: statusColor[item.status] || "#6b7280" }}>
                    {(item.status || "pending").toUpperCase()}
                  </span>
                  {item.notified && <span style={{ fontSize: 10, color: "#059669" }}>Notified</span>}
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                  <button onClick={() => { setSelected(item); setActivePanel("review"); }} style={{ ...AR_BTN_PRIMARY, fontSize: 12 }}>
                    {item.status === "pending" ? "Review" : "View"}
                  </button>
                  {item.status === "pending" && (
                    <button onClick={() => setAssignModal(assignmentId(item))} style={AR_BTN_GHOST}>Assign</button>
                  )}
                  {!item.notified && (item.status === "approved" || item.status === "revision" || item.status === "reviewed") && (
                    <button onClick={() => handleNotify(assignmentId(item))} style={{ ...AR_BTN_GHOST, color: "#8b5cf6", borderColor: "#c4b5fd" }}>Notify</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>Inbox</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No assignments found</div>
          </div>
        )}
      </div>
    </div>
  );

  return selected ? renderDetail(selected) : renderList();
}
