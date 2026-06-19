import { useState } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CENTERS = [
  { id: 1, name: "SpacECE Preschool — Pune Central" },
  { id: 2, name: "SpacECE Preschool — Mumbai West" },
  { id: 4, name: "SpacECE Preschool — Delhi NCR" },
];

const MOCK_CLASSES = [
  { id: "playgroup", name: "Playgroup" },
  { id: "nursery-a", name: "Nursery - A" },
  { id: "kg-1", name: "Kindergarten 1" },
  { id: "kg-2", name: "Kindergarten 2" },
];

const MOCK_COURSES = [
  { id: "c1", name: "Early Literacy Foundations" },
  { id: "c2", name: "Numeracy & Counting" },
  { id: "c3", name: "Creative Arts & Expression" },
  { id: "c4", name: "Social-Emotional Learning" },
];

const MOCK_TEACHERS = [
  { id: 101, name: "Priya Kulkarni",  centerId: 1, classId: "nursery-a", courseId: "c1" },
  { id: 102, name: "Sunita Pawar",    centerId: 1, classId: "playgroup",  courseId: "c4" },
  { id: 103, name: "Meena Joshi",     centerId: 2, classId: "kg-1",       courseId: "c2" },
  { id: 104, name: "Rekha Sharma",    centerId: 4, classId: "kg-2",       courseId: "c3" },
];

const MOCK_PLANS = [
  {
    id: 1,
    title: "Letter Recognition — Week 1",
    description: "Introduce uppercase A–E through songs, flashcards, and tracing worksheets.",
    centerId: 1,
    classId: "nursery-a",
    courseId: "c1",
    scheduleType: "weekly",
    scheduledDate: "2026-06-09",
    objectives: "Children will identify and name letters A, B, C, D, E.",
    activities: "Alphabet song · Letter tracing · Flashcard matching game",
    resources: "Letter tracing sheets, foam letter set, A4 flashcards",
    status: "active",
    allocatedTeachers: [101],
    completionMap: { 101: "completed" },
  },
  {
    id: 2,
    title: "Counting 1–10 with Objects",
    description: "Hands-on counting using everyday classroom objects and number cards.",
    centerId: 2,
    classId: "kg-1",
    courseId: "c2",
    scheduleType: "daily",
    scheduledDate: "2026-06-11",
    objectives: "Children will count objects up to 10 and match quantity to numeral.",
    activities: "Counting jar activity · Number card sequencing · Group counting circle",
    resources: "Number cards 1–10, counting jars, small manipulatives",
    status: "active",
    allocatedTeachers: [103],
    completionMap: { 103: "pending" },
  },
  {
    id: 3,
    title: "Feelings Wheel — Emotion Vocabulary",
    description: "Build emotional vocabulary through the feelings wheel poster and guided discussion.",
    centerId: 1,
    classId: "playgroup",
    courseId: "c4",
    scheduleType: "weekly",
    scheduledDate: "2026-06-10",
    objectives: "Children will name 4+ basic emotions and relate them to personal experiences.",
    activities: "Feelings wheel circle time · Emotion face puppets · Buddy sharing",
    resources: "Feelings wheel poster, emotion face puppet set, reflection journal",
    status: "active",
    allocatedTeachers: [102],
    completionMap: { 102: "pending" },
  },
  {
    id: 4,
    title: "Colour Mixing — Primary to Secondary",
    description: "Explore colour theory with paint-mixing experiments and colour charts.",
    centerId: 4,
    classId: "kg-2",
    courseId: "c3",
    scheduleType: "daily",
    scheduledDate: "2026-05-28",
    objectives: "Children will mix primary colours to produce secondary colours.",
    activities: "Paint mixing trays · Colour wheel artwork · Group mural",
    resources: "Tempera paints (R/Y/B), mixing trays, A3 paper, aprons",
    status: "inactive",
    allocatedTeachers: [104],
    completionMap: { 104: "completed" },
  },
];

const EMPTY_FORM = {
  title: "", description: "", centerId: "", classId: "", courseId: "",
  scheduleType: "weekly", scheduledDate: "", objectives: "",
  activities: "", resources: "", status: "active",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveName(list, id, field = "name") {
  return list.find(i => String(i.id) === String(id))?.[field] || "—";
}

/** Returns teachers that match at least one of center / class / course */
function autoAllocate(centerId, classId, courseId) {
  return MOCK_TEACHERS.filter(t =>
    String(t.centerId) === String(centerId) ||
    t.classId === classId ||
    t.courseId === courseId
  ).map(t => t.id);
}

const SCHEDULE_COLORS = {
  daily:  { bg: "#dbeafe", color: "#1d4ed8" },
  weekly: { bg: "#ede9fe", color: "#7c3aed" },
};

// ─── Plan Form Modal ──────────────────────────────────────────────────────────

function PlanFormModal({ plan, onSave, onClose, setToast }) {
  const isEdit = !!plan;
  const [form, setForm] = useState(
    plan
      ? { ...plan, centerId: String(plan.centerId) }
      : EMPTY_FORM
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.centerId || !form.classId || !form.courseId || !form.scheduledDate) {
      setToast({ msg: "Please fill all required fields.", type: "error" });
      return;
    }
    const allocated = autoAllocate(form.centerId, form.classId, form.courseId);
    const completionMap = {};
    allocated.forEach(id => {
      completionMap[id] = plan?.completionMap?.[id] || "pending";
    });
    onSave({
      ...form,
      id: plan?.id || Date.now(),
      centerId: Number(form.centerId),
      allocatedTeachers: allocated,
      completionMap,
    });
    setToast({ msg: isEdit ? "Lesson plan updated!" : "Lesson plan created & distributed!", type: "success" });
    onClose();
  };

  const inputRow = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 12 }}>
      <label style={S.label}>{label}</label>
      <input
        style={S.input}
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  const selectRow = (label, key, options, placeholder = "Select…") => (
    <div>
      <label style={S.label}>{label} *</label>
      <select style={S.input} value={form[key]} onChange={e => set(key, e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );

  const textareaRow = (label, key, placeholder = "") => (
    <div style={{ marginBottom: 12 }}>
      <label style={S.label}>{label}</label>
      <textarea
        style={{ ...S.input, height: 68, resize: "vertical", fontFamily: "inherit" }}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  // Preview auto-allocation
  const preview = autoAllocate(form.centerId, form.classId, form.courseId);

  return (
    <Modal title={isEdit ? "✏️ Edit Lesson Plan" : "📋 Create Lesson Plan"} onClose={onClose}>
      <form onSubmit={handleSubmit}>

        {/* Title */}
        {inputRow("Plan Title *", "title", "text", "e.g. Letter Recognition — Week 1")}

        {/* Description */}
        {textareaRow("Short Description", "description", "Brief summary of this lesson plan…")}

        {/* Assignment basis */}
        <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", marginBottom: 10 }}>
            🎯 Auto-Allocation Basis
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {selectRow("By Center", "centerId", MOCK_CENTERS, "Select Center")}
            {selectRow("By Class", "classId", MOCK_CLASSES, "Select Class")}
            {selectRow("By Course", "courseId", MOCK_COURSES, "Select Course")}
          </div>

          {/* Live allocation preview */}
          {(form.centerId || form.classId || form.courseId) && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: "white", borderRadius: 8, border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                👩‍🏫 Teachers who will receive this plan
              </div>
              {preview.length > 0
                ? preview.map(tid => {
                    const t = MOCK_TEACHERS.find(x => x.id === tid);
                    return (
                      <div key={tid} style={{ fontSize: 11, color: "#374151", paddingBottom: 2 }}>
                        ✓ {t?.name} — {resolveName(MOCK_CENTERS, t?.centerId)} · {resolveName(MOCK_CLASSES, t?.classId)}
                      </div>
                    );
                  })
                : <div style={{ fontSize: 11, color: "#9ca3af" }}>No matching teachers found for the selected filters.</div>
              }
            </div>
          )}
        </div>

        {/* Schedule */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Schedule Type *</label>
            <select style={S.input} value={form.scheduleType} onChange={e => set("scheduleType", e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Start Date *</label>
            <input style={S.input} type="date" value={form.scheduledDate} onChange={e => set("scheduledDate", e.target.value)} />
          </div>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "4px 0 14px" }} />

        {/* Lesson Content */}
        {textareaRow("Learning Objectives", "objectives", "e.g. Children will identify letters A–E…")}
        {textareaRow("Activities", "activities", "e.g. Alphabet song · Letter tracing · Flashcard game")}
        {textareaRow("Resources & Materials", "resources", "e.g. Flashcards, foam letters, tracing worksheets")}

        <label style={S.label}>Status</label>
        <select style={{ ...S.input, marginBottom: 20 }} value={form.status} onChange={e => set("status", e.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>
          {isEdit ? "Update Plan →" : "Create & Distribute Plan →"}
        </button>
      </form>
    </Modal>
  );
}

// ─── Plan Detail Modal ────────────────────────────────────────────────────────

function PlanDetailModal({ plan, onClose, onOverride }) {
  const allocated = MOCK_TEACHERS.filter(t => plan.allocatedTeachers.includes(t.id));

  return (
    <Modal title={`📋 ${plan.title}`} onClose={onClose}>

      {/* Meta chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { icon: "🏫", val: resolveName(MOCK_CENTERS, plan.centerId) },
          { icon: "🎒", val: resolveName(MOCK_CLASSES, plan.classId) },
          { icon: "📘", val: resolveName(MOCK_COURSES, plan.courseId) },
        ].map((c, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#f3f4f6", borderRadius: 20, padding: "4px 10px" }}>
            {c.icon} {c.val}
          </div>
        ))}
        <div style={{
          fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 10px",
          ...(SCHEDULE_COLORS[plan.scheduleType] || { bg: "#f3f4f6", color: "#374151" }),
          background: SCHEDULE_COLORS[plan.scheduleType]?.bg,
          color: SCHEDULE_COLORS[plan.scheduleType]?.color,
        }}>
          🗓 {plan.scheduleType.charAt(0).toUpperCase() + plan.scheduleType.slice(1)} · {plan.scheduledDate}
        </div>
      </div>

      {/* Content sections */}
      {[
        { icon: "🎯", label: "Learning Objectives", val: plan.objectives },
        { icon: "🎪", label: "Activities",          val: plan.activities },
        { icon: "📦", label: "Resources",           val: plan.resources },
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
              const isComplete = status === "completed";
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f1f5f9", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>
                      {resolveName(MOCK_CENTERS, t.centerId)} · {resolveName(MOCK_CLASSES, t.classId)}
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

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN TAB
// ══════════════════════════════════════════════════════════════════════════════

export default function LessonPlanManagementTab({ setToast }) {
  const [plans, setPlans] = useState(MOCK_PLANS);
  const [search, setSearch] = useState("");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSchedule, setFilterSchedule] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [detailPlan, setDetailPlan] = useState(null);
  const [localToast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = plans.filter(p => {
    const q = search.toLowerCase();
    const matchQ = p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchCenter = filterCenter === "all" || String(p.centerId) === filterCenter;
    const matchClass = filterClass === "all" || p.classId === filterClass;
    const matchSched = filterSchedule === "all" || p.scheduleType === filterSchedule;
    return matchQ && matchCenter && matchClass && matchSched;
  });

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = (saved) => {
    setPlans(prev =>
      editPlan
        ? prev.map(p => p.id === saved.id ? saved : p)
        : [...prev, saved]
    );
    setFormModal(false);
    setEditPlan(null);
  };

  const handleDeactivate = (id) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: "inactive" } : p));
    showToast({ msg: "Lesson plan set to inactive.", type: "error" });
  };

  const handleOverride = (planId, teacherId) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, completionMap: { ...p.completionMap, [teacherId]: "completed" } };
    }));
    // also refresh detailPlan so the modal re-renders
    setDetailPlan(prev => prev && prev.id === planId
      ? { ...prev, completionMap: { ...prev.completionMap, [teacherId]: "completed" } }
      : prev
    );
    showToast({ msg: "Lesson marked as completed.", type: "success" });
  };

  const openEdit = (plan) => { setEditPlan(plan); setFormModal(true); };
  const openAdd  = ()     => { setEditPlan(null); setFormModal(true); };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const active = plans.filter(p => p.status === "active").length;
  const completedTeacherEntries = plans.flatMap(p => Object.values(p.completionMap)).filter(v => v === "completed").length;
  const pendingTeacherEntries   = plans.flatMap(p => Object.values(p.completionMap)).filter(v => v === "pending").length;

  // ── select style (reuse existing S.input pattern) ─────────────────────────
  const filterSelect = {
    padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e5e7eb",
    background: "white", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={localToast.msg} type={localToast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {/* ── Modals ── */}
      {formModal && (
        <PlanFormModal
          plan={editPlan}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditPlan(null); }}
          setToast={showToast}
        />
      )}
      {detailPlan && (
        <PlanDetailModal
          plan={detailPlan}
          onClose={() => setDetailPlan(null)}
          onOverride={handleOverride}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Lesson Plan Management</h1>
          <p style={S.pageSub}>
            {active} active plans · {plans.length} total · {completedTeacherEntries} teacher completions · {pendingTeacherEntries} pending
          </p>
        </div>
        <button onClick={openAdd} style={S.primaryBtn}>+ Create Plan</button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard icon="📋" label="Total Plans"      val={plans.length}              color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="✅" label="Active Plans"     val={active}                    color="#10b981" bg="#d1fae5" />
        <StatCard icon="⏳" label="Pending Lessons"  val={pendingTeacherEntries}     color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="🏆" label="Completed"        val={completedTeacherEntries}   color="#3b82f6" bg="#dbeafe" />
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search plans by title or description…" />
        </div>
        <select style={filterSelect} value={filterCenter} onChange={e => setFilterCenter(e.target.value)}>
          <option value="all">📍 All Centers</option>
          {MOCK_CENTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={filterSelect} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="all">🎒 All Classes</option>
          {MOCK_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={filterSelect} value={filterSchedule} onChange={e => setFilterSchedule(e.target.value)}>
          <option value="all">🗓 All Schedules</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {/* ── Plan Cards Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 16 }}>
        {filtered.map(plan => {
          const completed = Object.values(plan.completionMap).filter(v => v === "completed").length;
          const total     = plan.allocatedTeachers.length;
          const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
          const schedStyle = SCHEDULE_COLORS[plan.scheduleType] || { bg: "#f3f4f6", color: "#374151" };

          return (
            <div
              key={plan.id}
              style={{
                background: "white",
                borderRadius: 18,
                padding: "20px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                borderTop: `3px solid ${plan.status === "active" ? "#8b5cf6" : "#e5e7eb"}`,
              }}
            >
              {/* Title row */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#ede9fe,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 3, lineHeight: 1.3 }}>{plan.title}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>{plan.description}</div>
                </div>
                <StatusBadge status={plan.status} />
              </div>

              {/* Assignment metadata */}
              <div style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6", marginBottom: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", borderRadius: 20, padding: "2px 8px" }}>
                    🏫 {resolveName(MOCK_CENTERS, plan.centerId)}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", borderRadius: 20, padding: "2px 8px" }}>
                    🎒 {resolveName(MOCK_CLASSES, plan.classId)}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", borderRadius: 20, padding: "2px 8px" }}>
                    📘 {resolveName(MOCK_COURSES, plan.courseId)}
                  </span>
                </div>

                {/* Schedule */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: schedStyle.bg, color: schedStyle.color }}>
                    🗓 {plan.scheduleType.charAt(0).toUpperCase() + plan.scheduleType.slice(1)}
                  </span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>Start: {plan.scheduledDate}</span>
                </div>
              </div>

              {/* Completion bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#374151" }}>👩‍🏫 Teacher Completion</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: pct === 100 ? "#10b981" : "#f59e0b" }}>
                    {completed}/{total} · {pct}%
                  </span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10b981" : "#8b5cf6", borderRadius: 99, transition: "width 0.4s ease" }} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <button onClick={() => setDetailPlan(plan)} style={{ ...S.tblBtn, flex: 1, color: "#4f46e5", borderColor: "#c4b5fd" }}>
                  👁 Details
                </button>
                <button onClick={() => openEdit(plan)} style={{ ...S.tblBtn, flex: 1 }}>
                  ✏️ Edit
                </button>
                <button onClick={() => handleDeactivate(plan.id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  🔕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No lesson plans found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Adjust your filters or create a new plan</div>
        </div>
      )}
    </div>
  );
}
