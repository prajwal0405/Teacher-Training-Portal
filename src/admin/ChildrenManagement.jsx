import { useState, useEffect } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getChildren, createChild, updateChild, deleteChild, getCenters, getClasses } from "../services/api";

const mapChildFromApi = (c) => ({
  id: c._id || c.id,
  name: c.fullName || c.name,
  age: c.age || 4,
  gender: c.gender || "Male",
  parentName: c.guardianName || c.parentName || "",
  phone: c.guardianPhone || c.phone || "",
  email: c.email || "",
  centerId: c.center?._id || c.center || "",
  classId: c.class?._id || c.class || "",
  status: c.status || "active",
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
function ChildFormModal({ child, centers = [], classes = [], onSave, onClose, setToast }) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.parentName || !form.phone || !form.centerId || !form.classId) {
      setToast({ msg: "Please fill all required fields.", type: "error" });
      return;
    }
    onSave(form);
  };

  // Filter classes by selected center in the form - use string comparison for ObjectId compatibility
  const formClasses = classes.filter(cls => {
    const cid = cls.center?._id || cls.center?.id || cls.center;
    return form.centerId ? String(cid) === String(form.centerId) : true;
  });

  // When editing, show all classes (user can re-assign); when adding, show only center classes
  const classesToShow = isEdit ? classes : formClasses;

  return (
    <Modal title={isEdit ? "✏️ Edit Child Profile" : "👶 Enroll New Child"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Child's Full Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Aarav Sharma" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Age *</label>
            <input style={S.input} type="number" value={form.age}
              onChange={e => setForm({ ...form, age: e.target.value })} placeholder="e.g. 4" />
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
            <select style={S.input} value={form.centerId}
              onChange={e => setForm({ ...form, centerId: e.target.value, classId: "" })}>
              <option value="">Select Center</option>
              {centers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Assigned Class *</label>
            <select style={S.input} value={form.classId}
              onChange={e => setForm({ ...form, classId: e.target.value })} disabled={!form.centerId}>
              <option value="">Select Class</option>
              {classesToShow.map(cls => <option key={cls._id || cls.id} value={cls._id || cls.id}>{cls.name}</option>)}
            </select>
          </div>
        </div>

        <hr style={{ border: "0", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />

        <label style={S.label}>Parent / Guardian Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.parentName}
          onChange={e => setForm({ ...form, parentName: e.target.value })}
          placeholder="e.g. Rajesh Sharma" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Parent Phone *</label>
            <input style={S.input} value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543211" />
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

        <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>
          {isEdit ? "Update Profile →" : "Enroll Child →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Child Detail & History View ── */
function ChildDetailModal({ child, centers = [], classes = [], onClose }) {
  const centerName = centers.find(c => (c._id || c.id) === child.centerId)?.name || "Unassigned Center";
  const className = classes.find(c => (c._id || c.id) === child.classId)?.name || "Unassigned Class";

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
  const [toast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  const loadData = () => {
    setLoading(true);
    Promise.all([getChildren(), getCenters(), getClasses()])
      .then(([childrenRes, centersRes, classesRes]) => {
        const dbChildren = (childrenRes.children || []).map(mapChildFromApi);
        const dbCenters = centersRes.centers || [];
        const dbClasses = classesRes.classes || [];

        setChildren(dbChildren);
        setCenters(dbCenters);
        setClasses(dbClasses);

        // Pre-select first center if none selected
        if (dbCenters.length > 0 && !selectedCenterId) {
          setSelectedCenterId(dbCenters[0]._id || dbCenters[0].id);
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
    loadData();
  }, []);

  const filteredChildren = children.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.parentName.toLowerCase().includes(q);
    const matchCenter = !selectedCenterId || c.centerId === selectedCenterId;
    const matchClass = !selectedClassId || c.classId === selectedClassId;
    return matchSearch && matchCenter && matchClass;
  });

  const handleSave = (saved) => {
    let payload;
    try {
      payload = mapChildToApi(saved);
    } catch (validationError) {
      showToast({ msg: validationError.message, type: "error" });
      return;
    }
    if (editChild) {
      updateChild(editChild.id, payload)
        .then(() => {
          showToast({ msg: "Child profile updated!", type: "success" });
          loadData();
        })
        .catch(err => showToast({ msg: err.message, type: "error" }));
    } else {
      createChild(payload)
        .then(() => {
          showToast({ msg: "Child enrolled successfully in database!", type: "success" });
          loadData();
        })
        .catch(err => showToast({ msg: err.message, type: "error" }));
    }
    setFormModal(false);
    setEditChild(null);
  };

  const handleDeactivate = (id) => {
    updateChild(id, { status: "inactive" })
      .then(() => {
        showToast({ msg: "Child profile marked as inactive.", type: "success" });
        loadData();
      })
      .catch(err => showToast({ msg: err.message, type: "error" }));
  };

  const handleDeleteChild = (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this child's enrollment?")) return;
    deleteChild(id)
      .then(() => {
        showToast({ msg: "Child enrollment permanently deleted.", type: "success" });
        loadData();
      })
      .catch(err => showToast({ msg: err.message, type: "error" }));
  };

  const openEdit = (child) => {
    setEditChild(child);
    setFormModal(true);
  };

  const openAdd = () => {
    setEditChild({ ...EMPTY_FORM, centerId: selectedCenterId || "" });
    setFormModal(true);
  };

  const handleCenterSelect = (centerId) => {
    setSelectedCenterId(centerId);
    setSelectedClassId(null);
  };

  const getClassStudentCount = (classId) => {
    return children.filter(c => c.centerId === selectedCenterId && c.classId === classId).length;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Children & Classes...
      </div>
    );
  }

  const active = children.filter(c => c.status === "active").length;
  const inactive = children.filter(c => c.status === "inactive").length;

  const activeCenterClasses = classes.filter(cls => {
    const cid = cls.center?._id || cls.center?.id || cls.center;
    return cid === selectedCenterId;
  });

  return (
    <div style={{ animation: "fadeIn 0.3s ease", fontFamily: "inherit" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {formModal && (
        <ChildFormModal
          child={editChild}
          centers={centers}
          classes={classes}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditChild(null); }}
          setToast={showToast}
        />
      )}

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
          <h1 style={S.pageTitle}>Children & Class Management</h1>
          <p style={S.pageSub}>{active} active enrolled · {inactive} inactive · {children.length} total profiles</p>
        </div>
        <button onClick={openAdd} style={S.primaryBtn}>+ Enroll Child</button>
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {centers.map(center => {
            const cid = center._id || center.id;
            const isSelected = selectedCenterId === cid;
            const centerCount = children.filter(c => c.centerId === cid).length;
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
      </div>

      {/* ── STEP 2: CLASSES CHIPS ROW ── */}
      {selectedCenterId && (
        <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            🎒 Select Class Room
          </div>
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
              All Classes ({children.filter(c => c.centerId === selectedCenterId).length})
            </button>
            {activeCenterClasses.map(cls => {
              const clid = cls._id || cls.id;
              const isSelected = selectedClassId === clid;
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
        </div>
      )}

      {/* Filter Text Query Search Box */}
      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search within selection by child or parent name..." />
      </div>

      {/* ── STEP 3: ENROLLED STUDENTS GRID DISPLAY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {filteredChildren.map((c) => {
          const centerObj = centers.find(cen => (cen._id || cen.id) === c.centerId);
          const classObj = classes.find(cls => (cls._id || cls.id) === c.classId);

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
          <div style={{ fontSize: 12, marginTop: 4 }}>No child is currently matching this filter choice layout.</div>
        </div>
      )}
    </div>
  );
}