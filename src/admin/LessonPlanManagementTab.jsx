import { useState, useEffect } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";
import { 
  getLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan,
  getCenters, getClasses, getCourses, getAdminTeachers,
  getAdminLessonAssignments, assignLessonPlan, updateLessonPlanAssignment,
  getAdminLessonReports, reviewLessonReport,
  autoGenerateLessonPlan, autoPublishLessonPlan
} from "../services/api";
import ACTIVITY_BANK from "../data/activityBank";

/* ── Activity Bank helpers (dataset-driven topics) ── */
const getActivityTypes = () => [...new Set(ACTIVITY_BANK.map(a => a.type))].sort();

const getActivityLevels = (type) =>
  [...new Set(ACTIVITY_BANK.filter(a => !type || a.type === type).map(a => a.level))]
    .sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")));

const getActivityTopics = (type, level) => {
  const seen = new Set();
  const topics = [];
  ACTIVITY_BANK.forEach(a => {
    if (type && a.type !== type) return;
    if (level && a.level !== level) return;
    if (!seen.has(a.activity)) {
      seen.add(a.activity);
      topics.push(a.activity);
    }
  });
  return topics.sort();
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* Builds a preview.schedule (same shape the UI/backend already expect)
   entirely from the activity bank dataset — no backend call needed. */
const generateScheduleFromDataset = ({ type, level, topic, startDate, durationWeeks, maxActivitiesPerDay }) => {
  const pool = ACTIVITY_BANK.filter(a => a.type === type && a.level === level);
  if (pool.length === 0) return null;

  // Put the chosen topic's activity/activities first, then the rest of the
  // matching pool (deduped by activity name) so the schedule stays varied
  // instead of repeating one activity every day.
  const chosen = pool.filter(a => a.activity === topic);
  const restSeen = new Set(chosen.map(a => a.activity));
  const rest = [];
  pool.forEach(a => {
    if (!restSeen.has(a.activity)) { restSeen.add(a.activity); rest.push(a); }
  });
  const orderedPool = [...chosen, ...rest];

  const days = [];
  const cur = new Date(startDate);
  const totalWorkingDays = durationWeeks * 5;
  while (days.length < totalWorkingDays) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) { // skip Sat/Sun
      days.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }

  let cursor = 0;
  const schedule = days.map(d => {
    const activities = [];
    for (let i = 0; i < maxActivitiesPerDay; i++) {
      const a = orderedPool[cursor % orderedPool.length];
      cursor++;
      activities.push({
        order: i + 1,
        contentTitle: a.activity,
        moduleTitle: `${a.type} · ${a.level}`,
        contentType: a.duration,
        durationMinutes: a.durationMinutes,
        // Extra dataset detail kept for the admin preview / richer teacher
        // instructions. Safe to ignore if the backend schema doesn't use it.
        materials: a.materials,
        purpose: a.purpose,
        howToConduct: a.howToConduct,
        facilitatorRole: a.facilitatorRole,
        expectedOutcomes: a.expectedOutcomes,
      });
    }
    return {
      date: d.toISOString().split("T")[0],
      dayOfWeek: WEEKDAY_NAMES[d.getDay()],
      activities,
    };
  });

  const totalActivities = schedule.reduce((sum, d) => sum + d.activities.length, 0);
  return {
    course: { title: topic }, // kept as `course` so existing render code needs no other changes
    totalActivities,
    totalDays: schedule.length,
    durationWeeks,
    schedule,
  };
};

const mapTeacherFromApi = (t) => ({
  id: t._id || t.id,
  name: t.name,
  centerId: t.teacherProfile?.center?._id || t.teacherProfile?.center || "",
  classId: (t.teacherProfile?.classes || [])[0]?._id || "",
});

const mapPlanFromApi = (p, assignments = []) => {
  const pid = p._id || p.id;
  const planAssns = assignments.filter(a => {
    const lpid = a.lessonPlan?._id || a.lessonPlan?.id || a.lessonPlan;
    return lpid === pid;
  });

  const allocatedTeachers = planAssns.map(a => a.teacher?._id || a.teacher?.id || a.teacher).filter(Boolean);
  const completionMap = {};
  planAssns.forEach(a => {
    if (a.teacher) {
      const tid = a.teacher._id || a.teacher.id || a.teacher;
      completionMap[tid] = a.status;
    }
  });

  const firstAssn = planAssns[0] || {};

  return {
    id: pid,
    title: p.title,
    description: p.instructions || "",
    centerId: firstAssn.center?._id || firstAssn.center || p.center || "",
    classId: firstAssn.class?._id || firstAssn.class || p.class || "",
    courseId: p.course?._id || p.course || "",
    scheduleType: p.scheduleWeek ? "weekly" : "daily",
    scheduledDate: p.scheduleDate ? new Date(p.scheduleDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    objectives: p.objectives || "",
    activities: p.activities || "",
    resources: p.resources || "",
    status: "active",
    allocatedTeachers,
    completionMap,
  };
};

/* ── helper: name resolver ── */
function resolveName(list, id, key = "name") {
  if (!id) return "—";
  const found = list.find(x => (x._id || x.id) === id);
  return found ? found[key] : "—";
}

/* ── Report Review Actions ── */
function ReportReviewActions({ reportId, onReview, setToast }) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    await onReview(reportId, "approved", feedback || "Approved by admin");
    setLoading(false);
    setFeedback("");
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      setToast({ msg: "Please provide feedback before rejecting.", type: "error" });
      return;
    }
    setLoading(true);
    await onReview(reportId, "rejected", feedback);
    setLoading(false);
    setFeedback("");
  };

  const handleRequestRevision = async () => {
    if (!feedback.trim()) {
      setToast({ msg: "Please provide feedback for revision.", type: "error" });
      return;
    }
    setLoading(true);
    await onReview(reportId, "revision_requested", feedback);
    setLoading(false);
    setFeedback("");
  };

  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Admin Review</div>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Write feedback for the teacher..."
        rows={3}
        style={{ ...S.input, resize: "none", marginBottom: 10, fontSize: 12 }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={handleApprove} disabled={loading} style={{ ...S.btnGreen, flex: 1 }}>
          {loading ? "..." : "✓ Approve"}
        </button>
        <button onClick={handleRequestRevision} disabled={loading} style={{ ...S.btnOrange, flex: 1 }}>
          {loading ? "..." : "↻ Revision"}
        </button>
        <button onClick={handleReject} disabled={loading} style={{ ...S.btnRed, flex: 1 }}>
          {loading ? "..." : "✕ Reject"}
        </button>
      </div>
    </div>
  );
}

/* ── Plan Form Modal ── */
function PlanFormModal({ plan, centers = [], classes = [], courses = [], onSave, onClose, setToast }) {
  const isEdit = !!plan;
  const EMPTY_FORM = {
    title: "", description: "", centerId: "", classId: "", courseId: "",
    scheduleType: "daily", scheduledDate: new Date().toISOString().split("T")[0],
    objectives: "", activities: "", resources: "", status: "active",
  };
  const [form, setForm] = useState(plan || EMPTY_FORM);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      setToast({ msg: "Please fill in title and instructions.", type: "error" });
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Modal title={isEdit ? "✏️ Edit Lesson Plan" : "📋 Create & Allocate Lesson Plan"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Lesson Title *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Letter Recognition — Week 1" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Allocated Center</label>
            <select style={S.input} value={form.centerId} onChange={e => setForm({ ...form, centerId: e.target.value })}>
              <option value="">All Centers</option>
              {centers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Allocated Class Room</label>
            <select style={S.input} value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
              <option value="">All Classes</option>
              {classes.map(cls => <option key={cls._id || cls.id} value={cls._id || cls.id}>{cls.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Course Reference</label>
            <select style={S.input} value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
              <option value="">None</option>
              {courses.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Schedule Type</label>
            <select style={S.input} value={form.scheduleType} onChange={e => setForm({ ...form, scheduleType: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Target Date</label>
            <input style={S.input} type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
          </div>
        </div>

        <label style={S.label}>Teacher Instructions / Description *</label>
        <textarea style={{ ...S.input, height: 60, resize: "none", marginBottom: 12 }}
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Step-by-step guidelines for the teacher to follow..." />

        <label style={S.label}>Learning Objectives</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.objectives}
          onChange={e => setForm({ ...form, objectives: e.target.value })} placeholder="e.g. Children can count items 1-10" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={S.label}>Class Activities</label>
            <input style={S.input} value={form.activities}
              onChange={e => setForm({ ...form, activities: e.target.value })} placeholder="e.g. Tracing, Song time" />
          </div>
          <div>
            <label style={S.label}>Required Resources</label>
            <input style={S.input} value={form.resources}
              onChange={e => setForm({ ...form, resources: e.target.value })} placeholder="e.g. Flashcards, clay" />
          </div>
        </div>

        <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>
          {isEdit ? "Update Lesson Plan →" : "Allocate Lesson Plan →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Plan Detail Modal ── */
function PlanDetailModal({ plan, centers = [], classes = [], teachers = [], onOverride, onClose }) {
  const allocated = teachers.filter(t => plan.allocatedTeachers.includes(t.id));

  return (
    <Modal title={`🔎 Lesson Detail: ${plan.title}`} onClose={onClose}>
      {/* Context info banner */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={{ background: "#f1f5f9", padding: 8, borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#475569" }}>
          🏫 {resolveName(centers, plan.centerId) || "All Centers"}
        </div>
        <div style={{ background: "#f1f5f9", padding: 8, borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#475569" }}>
          🎒 {resolveName(classes, plan.classId) || "All Classes"}
        </div>
        <div style={{ background: "#f5f3ff", padding: 8, borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6d28d9" }}>
          🗓 {plan.scheduleType.charAt(0).toUpperCase() + plan.scheduleType.slice(1)} · {plan.scheduledDate}
        </div>
      </div>

      {/* Content sections */}
      {[
        { icon: "🎯", label: "Learning Objectives", val: plan.objectives },
        { icon: "🎪", label: "Activities", val: plan.activities },
        { icon: "📦", label: "Resources", val: plan.resources },
        { icon: "📝", label: "Teacher Instructions", val: plan.description }
      ].map((s, i) => (
        <div key={i} style={{ marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>
            {s.icon} {s.label}
          </div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{s.val || "—"}</div>
        </div>
      ))}

      {/* Allocated teachers + completion */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          👩‍🏫 Allocated Teachers &amp; Progress
        </div>
        {allocated.length === 0
          ? <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 12 }}>No teachers allocated.</div>
          : allocated.map(t => {
              const status = plan.completionMap[t.id] || "pending";
              const isComplete = status === "completed" || status === "reviewed";
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f1f5f9", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>
                      Center: {resolveName(centers, t.centerId)} · Class: {resolveName(classes, t.classId)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isComplete ? "#10b981" : "#f59e0b" }}>
                      ● {isComplete ? "Completed" : "Pending"}
                    </span>
                    {!isComplete && (
                      <button
                        onClick={() => onOverride(plan.id, t.id)}
                        style={{ ...S.tblBtn, fontSize: 10, padding: "3px 8px", color: "#10b981", borderColor: "#6ee7b7" }}
                      >
                        ✓ Mark Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })
        }
      </div>
    </Modal>
  );
}

/* ── Auto-Generation Wizard ── */
function AutoGenerateWizard({ centers, classes, courses, teachers, onPublish, onClose, setToast }) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    type: "", level: "", topic: "",
    classId: "", centerId: "",
    startDate: new Date().toISOString().split("T")[0],
    durationWeeks: 4, maxActivitiesPerDay: 2,
    title: "",
  });
  const [preview, setPreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const availableLevels = getActivityLevels(config.type);
  const availableTopics = getActivityTopics(config.type, config.level);

  const handleGenerate = async () => {
    if (!config.type || !config.level || !config.topic) {
      setToast({ msg: "Please select a developmental type, level, and topic.", type: "error" });
      return;
    }
    setGenerating(true);
    try {
      const result = generateScheduleFromDataset(config);
      if (!result) {
        setToast({ msg: "No activities found for that type/level combination.", type: "error" });
        return;
      }
      setPreview(result);
      setStep(2);
    } catch (err) {
      setToast({ msg: err.message || "Failed to generate plan.", type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await autoPublishLessonPlan({
        classId: config.classId,
        centerId: config.centerId,
        title: config.title || `${preview.course.title} Plan`,
        schedule: preview.schedule,
      });
      setToast({ msg: res.message, type: "success" });
      onPublish();
      onClose();
    } catch (err) {
      setToast({ msg: err.message || "Failed to publish.", type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  const moveDay = (from, to) => {
    if (to < 0 || to >= preview.schedule.length) return;
    const newSchedule = [...preview.schedule];
    const [item] = newSchedule.splice(from, 1);
    newSchedule.splice(to, 0, item);
    setPreview({ ...preview, schedule: newSchedule });
  };

  const moveActivity = (dayIdx, from, to) => {
    if (to < 0 || to >= preview.schedule[dayIdx].activities.length) return;
    const newSchedule = [...preview.schedule];
    const day = { ...newSchedule[dayIdx], activities: [...newSchedule[dayIdx].activities] };
    const [item] = day.activities.splice(from, 1);
    day.activities.splice(to, 0, item);
    day.activities.forEach((a, i) => a.order = i + 1);
    newSchedule[dayIdx] = day;
    setPreview({ ...preview, schedule: newSchedule });
  };

  const removeActivity = (dayIdx, actIdx) => {
    const newSchedule = [...preview.schedule];
    const day = { ...newSchedule[dayIdx], activities: [...newSchedule[dayIdx].activities] };
    day.activities.splice(actIdx, 1);
    day.activities.forEach((a, i) => a.order = i + 1);
    newSchedule[dayIdx] = day;
    setPreview({ ...preview, schedule: newSchedule });
  };

  const filteredClasses = config.centerId
    ? classes.filter(c => String(c.center?._id || c.center) === config.centerId)
    : classes;

  return (
    <Modal title="🤖 Auto-Generate Lesson Plan" onClose={onClose}>
      {step === 1 && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? "#f59e0b" : "#e5e7eb" }} />
            ))}
          </div>

          <label style={S.label}>Developmental Type *</label>
          <select
            style={S.input}
            value={config.type}
            onChange={e => setConfig({ ...config, type: e.target.value, level: "", topic: "" })}
          >
            <option value="">Select a type...</option>
            {getActivityTypes().map(ty => <option key={ty} value={ty}>{ty}</option>)}
          </select>

          <label style={{ ...S.label, marginTop: 12 }}>Level *</label>
          <select
            style={S.input}
            value={config.level}
            disabled={!config.type}
            onChange={e => setConfig({ ...config, level: e.target.value, topic: "" })}
          >
            <option value="">{config.type ? "Select a level..." : "Select a type first"}</option>
            {availableLevels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
          </select>

          <label style={{ ...S.label, marginTop: 12 }}>Topic * (from activity bank)</label>
          <select
            style={S.input}
            value={config.topic}
            disabled={!config.level}
            onChange={e => setConfig({ ...config, topic: e.target.value })}
          >
            <option value="">{config.level ? `Select a topic... (${availableTopics.length} available)` : "Select a level first"}</option>
            {availableTopics.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label style={S.label}>Center</label>
              <select style={S.input} value={config.centerId} onChange={e => setConfig({ ...config, centerId: e.target.value, classId: "" })}>
                <option value="">All Centers</option>
                {centers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Class</label>
              <select style={S.input} value={config.classId} onChange={e => setConfig({ ...config, classId: e.target.value })}>
                <option value="">All Classes</option>
                {filteredClasses.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label style={S.label}>Start Date *</label>
              <input style={S.input} type="date" value={config.startDate} onChange={e => setConfig({ ...config, startDate: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Duration (weeks)</label>
              <input style={S.input} type="number" min={1} max={52} value={config.durationWeeks} onChange={e => setConfig({ ...config, durationWeeks: parseInt(e.target.value) || 4 })} />
            </div>
            <div>
              <label style={S.label}>Max Activities/Day</label>
              <input style={S.input} type="number" min={1} max={5} value={config.maxActivitiesPerDay} onChange={e => setConfig({ ...config, maxActivitiesPerDay: parseInt(e.target.value) || 2 })} />
            </div>
          </div>

          <label style={{ ...S.label, marginTop: 12 }}>Plan Title (optional)</label>
          <input style={S.input} value={config.title} onChange={e => setConfig({ ...config, title: e.target.value })} placeholder="e.g. Early Childhood — Week 1-4" />

          <button onClick={handleGenerate} disabled={generating} style={{ ...S.primaryBtn, width: "100%", marginTop: 16, opacity: generating ? 0.7 : 1 }}>
            {generating ? "⏳ Generating Schedule..." : "🤖 Generate Day-by-Day Schedule →"}
          </button>
        </div>
      )}

      {step === 2 && preview && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= 2 ? "#f59e0b" : "#e5e7eb" }} />
            ))}
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>✅ Generated Schedule</div>
            <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
              <strong>{preview.course.title}</strong> · {preview.totalActivities} activities across {preview.totalDays} working days · {preview.durationWeeks} weeks
            </div>
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
            {preview.schedule.map((day, di) => (
              <div key={di} style={{ marginBottom: 12, border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                    📅 {day.date} ({day.dayOfWeek}) — {day.activities.length} activity(ies)
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => moveDay(di, di - 1)} disabled={di === 0} style={{ ...S.tblBtn, fontSize: 10, padding: "2px 6px", opacity: di === 0 ? 0.4 : 1 }}>↑</button>
                    <button onClick={() => moveDay(di, di + 1)} disabled={di === preview.schedule.length - 1} style={{ ...S.tblBtn, fontSize: 10, padding: "2px 6px", opacity: di === preview.schedule.length - 1 ? 0.4 : 1 }}>↓</button>
                  </div>
                </div>
                {day.activities.map((act, ai) => (
                  <div key={ai} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: ai < day.activities.length - 1 ? "1px solid #f9fafb" : "none" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", width: 16 }}>{act.order}.</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>{act.contentTitle}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{act.moduleTitle} · {act.contentType} · {act.durationMinutes}min</div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button onClick={() => moveActivity(di, ai, ai - 1)} disabled={ai === 0} style={{ ...S.tblBtn, fontSize: 9, padding: "2px 4px", opacity: ai === 0 ? 0.4 : 1 }}>↑</button>
                      <button onClick={() => moveActivity(di, ai, ai + 1)} disabled={ai === day.activities.length - 1} style={{ ...S.tblBtn, fontSize: 9, padding: "2px 4px", opacity: ai === day.activities.length - 1 ? 0.4 : 1 }}>↓</button>
                      <button onClick={() => removeActivity(di, ai)} style={{ ...S.tblBtn, fontSize: 9, padding: "2px 4px", color: "#dc2626", borderColor: "#fca5a5" }}>✕</button>
                    </div>
                  </div>
                ))}
                {day.activities.length === 0 && (
                  <div style={{ padding: "12px", textAlign: "center", fontSize: 11, color: "#9ca3af" }}>No activities — free day</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => setStep(1)} style={{ ...S.tblBtn, flex: 1 }}>← Back</button>
            <button onClick={handlePublish} disabled={publishing} style={{ ...S.primaryBtn, flex: 2, opacity: publishing ? 0.7 : 1 }}>
              {publishing ? "⏳ Publishing..." : `🚀 Publish ${preview.schedule.length} Plans & Assign Teachers →`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Main Tab ── */
export default function LessonPlanManagementTab({ setToast }) {
  const [plans, setPlans] = useState([]);
  const [centers, setCenters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("plans");

  const [search, setSearch] = useState("");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSchedule, setFilterSchedule] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [detailPlan, setDetailPlan] = useState(null);
  const [autoModal, setAutoModal] = useState(false);
  const [localToast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getLessonPlans(),
      getCenters(),
      getClasses(),
      getCourses(),
      getAdminTeachers(),
      getAdminLessonAssignments(),
      getAdminLessonReports()
    ]).then(([plansRes, centersRes, classesRes, coursesRes, teachersRes, assnsRes, reportsRes]) => {
      const dbCenters = centersRes.centers || [];
      const dbClasses = classesRes.classes || [];
      const dbCourses = coursesRes.courses || [];
      const dbTeachers = (teachersRes.teachers || []).map(mapTeacherFromApi);
      const dbAssns = assnsRes.assignments || [];
      const dbReports = reportsRes.reports || [];

      setCenters(dbCenters);
      setClasses(dbClasses);
      setCourses(dbCourses);
      setTeachers(dbTeachers);
      setAssignments(dbAssns);
      setReports(dbReports);

      const dbPlans = (plansRes.lessonPlans || []).map(p => mapPlanFromApi(p, dbAssns));
      setPlans(dbPlans);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading lesson plan management data:", err);
      setLoading(false);
      showToast({ msg: "Failed to load lesson plan data from database.", type: "error" });
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = plans.filter(p => {
    const q = search.toLowerCase();
    const matchQ = p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchCenter = filterCenter === "all" || String(p.centerId) === filterCenter;
    const matchClass = filterClass === "all" || String(p.classId) === filterClass;
    const matchSched = filterSchedule === "all" || p.scheduleType === filterSchedule;
    return matchQ && matchCenter && matchClass && matchSched;
  });

  const handleSave = (saved) => {
    const planPayload = {
      title: saved.title,
      instructions: saved.description,
      objectives: saved.objectives,
      activities: saved.activities,
      resources: saved.resources,
      scheduleDate: saved.scheduledDate ? new Date(saved.scheduledDate) : new Date(),
      course: saved.courseId || undefined,
    };

    if (saved.scheduleType === "weekly") {
      planPayload.scheduleWeek = 1; // dummy value to signify weekly
    }

    if (editPlan) {
      updateLessonPlan(editPlan.id, planPayload)
        .then(() => {
          showToast({ msg: "Lesson plan updated!", type: "success" });
          loadData();
        })
        .catch(err => showToast({ msg: err.message, type: "error" }));
    } else {
      createLessonPlan(planPayload)
        .then((res) => {
          const newPlan = res.lessonPlan;
          // Allocate to matching teachers
          const matchedTeachers = teachers.filter(t => {
            return (!saved.centerId || t.centerId === saved.centerId) && (!saved.classId || t.classId === saved.classId);
          });

          if (matchedTeachers.length > 0) {
            const assignPromises = matchedTeachers.map(t => assignLessonPlan({
              lessonPlanId: newPlan._id || newPlan.id,
              teacherId: t.id,
              centerId: saved.centerId || t.centerId,
              classId: saved.classId || t.classId,
              assignedDate: saved.scheduledDate ? new Date(saved.scheduledDate) : new Date(),
            }));
            return Promise.all(assignPromises);
          }
        })
        .then(() => {
          showToast({ msg: "Lesson plan created and allocated!", type: "success" });
          loadData();
        })
        .catch(err => showToast({ msg: err.message, type: "error" }));
    }
    setFormModal(false);
    setEditPlan(null);
  };

  const handleDeactivate = (id) => {
    deleteLessonPlan(id)
      .then(() => {
        showToast({ msg: "Lesson plan deleted successfully.", type: "success" });
        loadData();
      })
      .catch(err => showToast({ msg: err.message, type: "error" }));
  };

  const handleOverride = (planId, teacherId) => {
    const match = assignments.find(a => {
      const pid = a.lessonPlan?._id || a.lessonPlan?.id || a.lessonPlan;
      const tid = a.teacher?._id || a.teacher?.id || a.teacher;
      return pid === planId && tid === teacherId;
    });

    if (match) {
      updateLessonPlanAssignment(match._id || match.id, { status: "completed" })
        .then(() => {
          showToast({ msg: "Lesson plan assignment marked completed!", type: "success" });
          loadData();
          setDetailPlan(null); // close detail modal to refresh
        })
        .catch(err => showToast({ msg: err.message, type: "error" }));
    } else {
      showToast({ msg: "Assignment record not found.", type: "error" });
    }
  };

  const openEdit = (plan) => { setEditPlan(plan); setFormModal(true); };
  const openAdd  = ()     => { setEditPlan(null); setFormModal(true); };

  const handleReviewReport = async (reportId, status, feedback) => {
    try {
      await reviewLessonReport(reportId, { status, adminFeedback: feedback });
      showToast({ msg: `Report ${status} successfully!`, type: "success" });
      loadData();
    } catch (err) {
      showToast({ msg: err.message || "Failed to review report.", type: "error" });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Lesson Plans...
      </div>
    );
  }

  const activePlansCount = plans.length;
  const completedTeacherEntries = assignments.filter(a => a.status === "completed" || a.status === "reviewed").length;
  const pendingTeacherEntries   = assignments.filter(a => a.status === "pending").length;
  const pendingReports = reports.filter(r => r.status === "pending").length;
  const reviewedReports = reports.filter(r => r.status === "approved" || r.status === "reviewed").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={localToast.msg} type={localToast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {/* Modals */}
      {formModal && (
        <PlanFormModal
          plan={editPlan}
          centers={centers}
          classes={classes}
          courses={courses}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditPlan(null); }}
          setToast={showToast}
        />
      )}
      {detailPlan && (
        <PlanDetailModal
          plan={detailPlan}
          centers={centers}
          classes={classes}
          teachers={teachers}
          onClose={() => setDetailPlan(null)}
          onOverride={handleOverride}
        />
      )}
      {autoModal && (
        <AutoGenerateWizard
          centers={centers}
          classes={classes}
          courses={courses}
          teachers={teachers}
          onPublish={loadData}
          onClose={() => setAutoModal(false)}
          setToast={showToast}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Lesson Plans & Allocation</h1>
          <p style={S.pageSub}>{activePlansCount} active base plans · {completedTeacherEntries} completions delivered</p>
        </div>
        <button onClick={openAdd} style={S.primaryBtn}>+ Create Base Plan</button>
        <button onClick={() => setAutoModal(true)} style={{ ...S.primaryBtn, background: "#7c3aed", marginLeft: 8 }}>🤖 Auto-Generate</button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f3f4f6" }}>
        {[
          { key: "plans", label: "Base Plans" },
          { key: "reports", label: `Completion Reports (${pendingReports} pending)` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 18px",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.key ? "#f59e0b" : "transparent"}`,
              background: "none",
              color: activeTab === tab.key ? "#92400e" : "#9ca3af",
              fontSize: 13,
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

      {/* KPI Display */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard icon="📋" label="Base Plans" val={activePlansCount} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="⏳" label="Teacher Pending" val={pendingTeacherEntries} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="✅" label="Delivered Done" val={completedTeacherEntries} color="#10b981" bg="#d1fae5" />
        {activeTab === "reports" && <StatCard icon="📝" label="Pending Reports" val={pendingReports} color="#8b5cf6" bg="#ede9fe" />}
        {activeTab === "reports" && <StatCard icon="✅" label="Reviewed Reports" val={reviewedReports} color="#10b981" bg="#d1fae5" />}
      </div>

      {activeTab === "plans" && (
        <>
      {/* Filter Toolbar */}
      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search plans by title or objectives..." />
        </div>
        <select style={{ ...S.input, width: 200, marginBottom: 0 }} value={filterCenter} onChange={e => setFilterCenter(e.target.value)}>
          <option value="all">All Centers</option>
          {centers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
        </select>
        <select style={{ ...S.input, width: 160, marginBottom: 0 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
        </select>
        <select style={{ ...S.input, width: 140, marginBottom: 0 }} value={filterSchedule} onChange={e => setFilterSchedule(e.target.value)}>
          <option value="all">All Schedules</option>
          <option value="daily">Daily Only</option>
          <option value="weekly">Weekly Only</option>
        </select>
      </div>

      {/* Plans List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {filtered.map(p => {
          const totalAlloc = p.allocatedTeachers.length;
          const doneAlloc = Object.values(p.completionMap).filter(v => v === "completed" || v === "reviewed").length;
          const completePct = totalAlloc > 0 ? Math.round((doneAlloc / totalAlloc) * 100) : 0;

          return (
            <div key={p.id} style={{ background: "white", borderRadius: 18, padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderTop: "3px solid #f59e0b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#b45309", textTransform: "capitalize" }}>
                  🗓️ {p.scheduleType}
                </span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{p.scheduledDate}</span>
              </div>

              <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 6 }}>{p.title}</div>
              
              <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 14 }}>
                {p.description.length > 120 ? p.description.substring(0, 120) + "..." : p.description}
              </p>

              {/* Progress bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                  <span style={{ color: "#6b7280" }}>Teacher Delivery Rate</span>
                  <span style={{ fontWeight: 700, color: completePct >= 75 ? "#10b981" : "#f59e0b" }}>{completePct}% ({doneAlloc}/{totalAlloc})</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${completePct}%`, background: completePct >= 75 ? "#10b981" : "#f59e0b", borderRadius: 4 }} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <button onClick={() => setDetailPlan(p)} style={{ ...S.tblBtn, flex: 1.2, color: "#2563eb", borderColor: "#bfdbfe" }}>
                  👁 Review Progress
                </button>
                <button onClick={() => openEdit(p)} style={{ ...S.tblBtn, flex: 0.8 }}>
                  ✏️ Edit
                </button>
                <button onClick={() => handleDeactivate(p.id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No lesson plans found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Create a new base plan or check filters.</div>
        </div>
      )}
        </>
      )}

      {activeTab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No completion reports yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Reports will appear here when teachers submit lesson completions.</div>
            </div>
          ) : reports.map(r => {
            const teacherName = r.teacher?.name || "Unknown Teacher";
            const planTitle = r.assignment?.lessonPlan?.title || "Unknown Plan";
            const centerName = r.assignment?.center?.name || "—";
            const className = r.assignment?.class?.name || "—";
            const isPending = r.status === "pending";
            return (
              <div key={r._id || r.id} style={{ background: "white", borderRadius: 14, padding: "18px 22px", border: "1px solid #f1f5f9", borderLeft: `4px solid ${isPending ? "#f59e0b" : "#10b981"}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{planTitle}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>Teacher: {teacherName}</span>
                      <span>Center: {centerName}</span>
                      <span>Class: {className}</span>
                      <span>Submitted: {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}</span>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {r.teachingNotes && (
                  <div style={{ marginBottom: 10, padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>Teaching Notes</div>
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{r.teachingNotes}</div>
                  </div>
                )}

                {r.activityDescription && (
                  <div style={{ marginBottom: 10, padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>Activity Description</div>
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{r.activityDescription}</div>
                  </div>
                )}

                {r.adminFeedback && (
                  <div style={{ marginBottom: 10, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", textTransform: "uppercase", marginBottom: 4 }}>Admin Feedback</div>
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{r.adminFeedback}</div>
                  </div>
                )}

                {isPending && (
                  <ReportReviewActions reportId={r._id || r.id} onReview={handleReviewReport} setToast={showToast} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}