import { useState, useEffect } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";
import { 
  getLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan,
  getCenters, getClasses, getCourses, getAdminTeachers,
  getAdminLessonAssignments, assignLessonPlan, updateLessonPlanAssignment 
} from "../services/api";

const mapTeacherFromApi = (t) => ({
  id: t._id || t.id,
  name: t.name,
  centerId: t.teacherProfile?.center?._id || t.teacherProfile?.center || "",
  classId: t.teacherProfile?.class?._id || t.teacherProfile?.class || "",
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

/* ── Main Tab ── */
export default function LessonPlanManagementTab({ setToast }) {
  const [plans, setPlans] = useState([]);
  const [centers, setCenters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSchedule, setFilterSchedule] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [detailPlan, setDetailPlan] = useState(null);
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
      getAdminLessonAssignments()
    ]).then(([plansRes, centersRes, classesRes, coursesRes, teachersRes, assnsRes]) => {
      const dbCenters = centersRes.centers || [];
      const dbClasses = classesRes.classes || [];
      const dbCourses = coursesRes.courses || [];
      const dbTeachers = (teachersRes.teachers || []).map(mapTeacherFromApi);
      const dbAssns = assnsRes.assignments || [];

      setCenters(dbCenters);
      setClasses(dbClasses);
      setCourses(dbCourses);
      setTeachers(dbTeachers);
      setAssignments(dbAssns);

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

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Lesson Plans & Allocation</h1>
          <p style={S.pageSub}>{activePlansCount} active base plans · {completedTeacherEntries} completions delivered</p>
        </div>
        <button onClick={openAdd} style={S.primaryBtn}>+ Create Base Plan</button>
      </div>

      {/* KPI Display */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard icon="📋" label="Base Plans" val={activePlansCount} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="⏳" label="Teacher Pending" val={pendingTeacherEntries} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="✅" label="Delivered Done" val={completedTeacherEntries} color="#10b981" bg="#d1fae5" />
      </div>

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
    </div>
  );
}
