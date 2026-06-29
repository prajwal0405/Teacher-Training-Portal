import { useState, useEffect } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getChildren, updateChild, deleteChild, getCenters, getClasses } from "../services/api";

const mapChildFromApi = (c) => ({
  id: c._id || c.id,
  name: c.fullName || c.name,
  age: c.age || 4,
  gender: c.gender || "Male",
  parentName: c.guardianName || c.parentName || "",
  phone: c.guardianPhone || c.phone || "",
  email: c.email || "",
  centerId: String(c.center?._id || c.center || ""),
  classId: String(c.class?._id || c.class || ""),
  status: c.status || "active",
  addedBy: c.createdBy?.name || "",
  attendanceRate: "95%",
  activities: c.activities || [
    { date: "2026-06-15", activity: "Standard Classroom Play", status: "Present" }
  ],
});

const mapChildToApi = (c) => {
  const centerId = c.centerId || c.center || "";
  const classId = c.classId || c.class || "";

  if (!centerId || centerId === "undefined") {
    throw new Error("Center is required. Please select a center for the child.");
  }
  if (!classId || classId === "undefined") {
    throw new Error("Class is required. Please select a class for the child.");
  }

  return {
    fullName: c.name,
    age: Number(c.age),
    gender: c.gender,
    guardianName: c.parentName,
    guardianPhone: c.phone,
    email: c.email,
    centerId: String(centerId),
    classId: String(classId),
    status: c.status,
  };
};

const EMPTY_FORM = {
  name: "", age: "", gender: "Male", parentName: "",
  phone: "", email: "", centerId: "", classId: "",
  status: "active", attendanceRate: "100%", activities: []
};

/* ── Add / Edit Modal ── */
function ChildFormModal({ child, centers = [], classes = [], children: allChildren = [], onSave, onClose, setToast }) {
  const isEdit = !!child && !!child.id;
  const [form, setForm] = useState(() => {
    if (isEdit && child) {
      return {
        ...child,
        centerId: child.centerId || child.center || "",
        classId: child.classId || child.class || "",
      };
    }
    return { ...EMPTY_FORM };
  });
  const [saving, setSaving] = useState(false);
  const selectedClass = classes.find(cls => String(cls._id || cls.id) === String(form.classId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const classCenterId = selectedClass ? String(selectedClass.center?._id || selectedClass.center?.id || selectedClass.center || "") : "";
    const resolvedCenterId = form.centerId || classCenterId;

    if (!form.name || !form.parentName || !form.phone || !resolvedCenterId || !form.classId) {
      setToast({ msg: "Please fill all required fields including center and class.", type: "error" });
      return;
    }

    // Capacity check
    if (!isEdit && selectedClass && selectedClass.capacity > 0) {
      const classChildren = allChildren.filter(c => String(c.classId || c.class) === String(form.classId) && c.status === "active");
      if (classChildren.length >= selectedClass.capacity) {
        setToast({ msg: `Class "${selectedClass.name}" is full (${classChildren.length}/${selectedClass.capacity}). Cannot add more children.`, type: "error" });
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({ ...form, centerId: resolvedCenterId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Child Profile" : "Child Profile"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Child's Full Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Aarav Sharma" required />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Age *</label>
            <input style={S.input} type="number" min={1} max={18} value={form.age}
              onChange={e => setForm({ ...form, age: e.target.value })} placeholder="e.g. 4" required />
          </div>
          <div>
            <label style={S.label}>Gender</label>
            <select style={S.input} value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value })}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Assigned Center *</label>
            <select
              style={S.input}
              value={form.centerId}
              onChange={e => setForm({ ...form, centerId: e.target.value })}
              required
            >
              <option value="">-- Select Center --</option>
              {centers.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
              ))}
            </select>
            {centers.length === 0 && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                No centers found. Please create a center first.
              </div>
            )}
          </div>
          <div>
            <label style={S.label}>Assigned Class *</label>
            <select
              style={S.input}
              value={form.classId}
              onChange={e => {
                const nextClassId = e.target.value;
                const nextClass = classes.find(cls => String(cls._id || cls.id) === String(nextClassId));
                const nextCenterId = String(nextClass?.center?._id || nextClass?.center?.id || nextClass?.center || "");
                setForm(prev => ({
                  ...prev,
                  classId: nextClassId,
                  centerId: nextCenterId || prev.centerId,
                }));
              }}
              required
            >
              <option value="">-- Select Class --</option>
              {classes.map(cls => {
                const clsCenterId = String(cls.center?._id || cls.center?.id || cls.center || "");
                const enrolled = allChildren.filter(c => String(c.classId || c.class) === String(cls._id || cls.id) && c.status === "active").length;
                const cap = cls.capacity || 0;
                const isFull = cap > 0 && enrolled >= cap;
                return (
                  <option key={cls._id || cls.id} value={cls._id || cls.id} disabled={isFull && !isEdit}>
                    {cls.name}{cap > 0 ? ` (${enrolled}/${cap}${isFull ? " FULL" : ""})` : ` (${enrolled} enrolled)`}
                  </option>
                );
              })}
            </select>
            {classes.length === 0 && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                No classes found. Please create a class first.
              </div>
            )}
            {classes.length > 0 && !form.centerId && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Choose a class to auto-fill the center, or select a center manually.
              </div>
            )}
          </div>
        </div>

        <hr style={{ border: "0", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />

        <label style={S.label}>Parent / Guardian Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.parentName}
          onChange={e => setForm({ ...form, parentName: e.target.value })}
          placeholder="e.g. Rajesh Sharma" required />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Parent Phone *</label>
            <input style={S.input} value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543211" required />
          </div>
          <div>
            <label style={S.label}>Parent Email</label>
            <input style={S.input} type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} placeholder="parent@gmail.com" />
          </div>
        </div>

        <label style={S.label}>Status</label>
        <select style={{ ...S.input, marginBottom: 20 }} value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button type="submit" disabled={saving} style={{ ...S.primaryBtn, width: "100%", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : isEdit ? "Update Profile" : "Save"}
        </button>
      </form>
    </Modal>
  );
}

function ChildDetailModal({ child, centers = [], classes = [], onClose }) {
  const centerName = centers.find(c => String(c._id || c.id) === String(child.centerId))?.name || "Unassigned Center";
  const className = classes.find(c => String(c._id || c.id) === String(child.classId))?.name || "Unassigned Class";

  return (
    <Modal title={`👶 Profile: ${child.name}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "🏫", label: "Center", val: centerName },
          { icon: "🎒", label: "Class", val: className },
          { icon: "🎂", label: "Age / Gender", val: `${child.age} Years · ${child.gender}` },
          { icon: "📈", label: "Attendance Rate", val: child.attendanceRate },
          { icon: "👤", label: "Guardian", val: child.parentName },
          { icon: "📱", label: "Contact", val: child.phone },
        ].map((r, i) => (
          <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{r.icon} {r.val}</div>
          </div>
        ))}
      </div>

      {/* Activity Timeline */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>📋 Activity & Attendance History</div>
        {child.activities && child.activities.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {child.activities.map((act, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{act.activity}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{act.date}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: act.status === "Present" ? "#10b981" : "#dc2626" }}>
                  ● {act.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "16px", color: "#9ca3af", fontSize: 12 }}>
            No recent activity logs found.
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
    MAIN CHILDREN MANAGEMENT TAB
   ══════════════════════════════════════════ */
export default function ChildrenManagementTab({ setToast }) {
  const [children, setChildren] = useState([]);
  const [centers, setCenters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCenterId, setSelectedCenterId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [formModal, setFormModal] = useState(false);
  const [editChild, setEditChild] = useState(null);
  const [detailChild, setDetailChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localToast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  const loadData = () => {
    setLoading(true);
    Promise.all([getChildren(), getCenters(), getClasses()])
      .then(([childrenRes, centersRes, classesRes]) => {
        const dbChildren = (childrenRes.children || []).map(mapChildFromApi);
        const dbCenters = centersRes.centers || [];
        const dbClasses = (classesRes.classes || []).map(c => ({
          _id: c._id || c.id,
          id: c._id || c.id,
          name: c.name,
          // Normalize center reference to string ID
          center: String(c.center?._id || c.center?.id || c.center || ""),
          ageGroup: c.ageGroup || "",
          curriculumLevel: c.curriculumLevel || "",
          schedule: c.schedule || "",
        }));

        setChildren(dbChildren);
        setCenters(dbCenters);
        setClasses(dbClasses);

        // Pre-select first center if none selected
        if (dbCenters.length > 0 && !selectedCenterId) {
          setSelectedCenterId(String(dbCenters[0]._id || dbCenters[0].id));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading children data:", err);
        setLoading(false);
        showToast({ msg: "Failed to load kids & classes from database.", type: "error" });
      });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ── */
  const handleCenterSelect = (cid) => {
    setSelectedCenterId(String(cid));
    setSelectedClassId(null); // reset class filter
  };

  const openEdit = (child) => {
    setEditChild(child);
    setFormModal(true);
  };

  const handleSaveChild = async (form) => {
    try {
      const payload = mapChildToApi(form);
      if (editChild && editChild.id) {
        const res = await updateChild(editChild.id, payload);
        const updated = mapChildFromApi(res.child || res);
        setChildren(prev => prev.map(c => c.id === updated.id ? updated : c));
        showToast({ msg: "Child profile updated!", type: "success" });
      }
      setFormModal(false);
      setEditChild(null);
    } catch (err) {
      showToast({ msg: err.message || "Failed to save child.", type: "error" });
      throw err;
    }
  };

  const handleDeleteChild = async (id) => {
    if (!window.confirm("Are you sure you want to delete this child profile?")) return;
    try {
      await deleteChild(id);
      setChildren(prev => prev.filter(c => c.id !== id));
      showToast({ msg: "Child profile deleted.", type: "error" });
    } catch (err) {
      showToast({ msg: err.message || "Failed to delete child.", type: "error" });
    }
  };

  /* ── Computed values ── */
  const active = children.filter(c => c.status === "active").length;
  const inactive = children.filter(c => c.status === "inactive").length;

  // Classes belonging to the currently selected center
  const activeCenterClasses = classes.filter(cls => {
    const cid = String(cls.center?._id || cls.center?.id || cls.center || "");
    return selectedCenterId ? cid === String(selectedCenterId) : true;
  });

  // Count children enrolled in a given class
  const getClassStudentCount = (classId) =>
    children.filter(c => String(c.classId) === String(classId)).length;

  // Multi-level filter: center → class → search
  const filteredChildren = children.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.parentName.toLowerCase().includes(q);
    const matchCenter = selectedCenterId ? String(c.centerId) === String(selectedCenterId) : true;
    const matchClass = selectedClassId ? String(c.classId) === String(selectedClassId) : true;
    return matchSearch && matchCenter && matchClass;
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Loading children data...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {localToast.msg && <Toast msg={localToast.msg} type={localToast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {/* Form Modal */}
      {formModal && (
        <ChildFormModal
          child={editChild}
          centers={centers}
          classes={classes}
          children={children}
          onSave={handleSaveChild}
          onClose={() => { setFormModal(false); setEditChild(null); }}
          setToast={showToast}
        />
      )}

      {/* Detail Modal */}
      {detailChild && (
        <ChildDetailModal
          child={detailChild}
          centers={centers}
          classes={classes}
          onClose={() => setDetailChild(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Children &amp; Class Management</h1>
          <p style={S.pageSub}>{active} active enrolled · {inactive} inactive · {children.length} total profiles</p>
        </div>
        <div style={{ padding: "8px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12, color: "#065f46", fontWeight: 600 }}>
          👩‍🏫 Children are enrolled by Teachers from their dashboard
        </div>
      </div>

      {/* KPI Display */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard icon="👶" label="Total Children" val={children.length} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="✅" label="Active Enrolled" val={active} color="#10b981" bg="#d1fae5" />
        <StatCard icon="🔕" label="Inactive Profiles" val={inactive} color="#6b7280" bg="#f3f4f6" />
      </div>

      {/* ── STEP 1: CENTERS NAVIGATION TABS ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          📍 Select Center
        </div>
        {centers.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9ca3af", padding: "12px", background: "#f9fafb", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
            No centers found. Please create a center from Center Management first.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {centers.map(center => {
              const cid = center._id || center.id;
              const isSelected = String(selectedCenterId) === String(cid);
              const centerCount = children.filter(c => String(c.centerId) === String(cid)).length;
              return (
                <button
                  key={cid}
                  onClick={() => handleCenterSelect(cid)}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 12,
                    border: isSelected ? "2px solid #8b5cf6" : "1px solid #e2e8f0",
                    background: isSelected ? "#f5f3ff" : "white",
                    color: isSelected ? "#6d28d9" : "#475569",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s"
                  }}
                >
                  🏢 {center.name}
                  <span style={{
                    background: isSelected ? "#8b5cf6" : "#f1f5f9",
                    color: isSelected ? "white" : "#64748b",
                    padding: "2px 7px",
                    borderRadius: 8,
                    fontSize: 11
                  }}>
                    {centerCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── STEP 2: CLASSES CHIPS ROW ── */}
      {selectedCenterId && (
        <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            🎒 Select Class Room
          </div>
          {activeCenterClasses.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              No classes found for this center. Add classes from the Batch/Class Management section.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedClassId(null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: "1px solid",
                  borderColor: !selectedClassId ? "#8b5cf6" : "#cbd5e1",
                  background: !selectedClassId ? "#8b5cf6" : "white",
                  color: !selectedClassId ? "white" : "#64748b",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                All Classes ({children.filter(c => String(c.centerId) === String(selectedCenterId)).length})
              </button>
              {activeCenterClasses.map(cls => {
                const clid = cls._id || cls.id;
                const isSelected = String(selectedClassId) === String(clid);
                const count = getClassStudentCount(clid);
                return (
                  <button
                    key={clid}
                    onClick={() => setSelectedClassId(clid)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 20,
                      border: "1px solid",
                      borderColor: isSelected ? "#8b5cf6" : "#cbd5e1",
                      background: isSelected ? "#8b5cf6" : "white",
                      color: isSelected ? "white" : "#64748b",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    {cls.name}
                    <span style={{
                      background: isSelected ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                      color: isSelected ? "white" : "#64748b",
                      padding: "1px 5px",
                      borderRadius: 6,
                      fontSize: 10
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filter Text Query Search Box */}
      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search within selection by child or parent name..." />
      </div>

      {/* ── STEP 3: ENROLLED STUDENTS GRID DISPLAY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {filteredChildren.map((c) => {
          const centerObj = centers.find(cen => String(cen._id || cen.id) === String(c.centerId));
          const classObj = classes.find(cls => String(cls._id || cls.id) === String(c.classId));

          return (
            <div key={c.id} style={{ background: "white", borderRadius: 18, padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderTop: `3px solid ${c.status === "active" ? "#8b5cf6" : "#e5e7eb"}` }}>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#ede9fe,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>👶</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>🎒 {classObj?.name || "Unassigned"} · Age: {c.age}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, padding: "12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Center Assignment</div>
                <div style={{ fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 4 }}>🏢 {centerObj?.name || "None"}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>👤 Parent: {c.parentName}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>📱 Phone: {c.phone}</div>
                {c.addedBy && <div style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 600, marginTop: 2 }}>👩‍🏫 Added by: {c.addedBy}</div>}
              </div>

              {/* Action Layout */}
              <div style={{ display: "flex", gap: 6, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <button onClick={() => setDetailChild(c)} style={{ ...S.tblBtn, flex: 1, color: "#4f46e5", borderColor: "#c4b5fd" }}>
                  👁 History
                </button>
                <button onClick={() => openEdit(c)} style={{ ...S.tblBtn, flex: 1 }}>
                  ✏️ Edit
                </button>
                <button onClick={() => handleDeleteChild(c.id)} title="Delete Child" style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredChildren.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👶</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No children found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {search ? "No child matches your search." : "No children enrolled yet. Teachers add children from their dashboard."}
          </div>
        </div>
      )}
    </div>
  );
}