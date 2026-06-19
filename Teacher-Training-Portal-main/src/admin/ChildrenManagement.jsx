import { useState } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";

// Expanded mock data with diverse children, centers, and classes for robust testing
const MOCK_CHILDREN = [
  {
    id: 1,
    name: "Aarav Sharma",
    age: 4,
    gender: "Male",
    parentName: "Rajesh Sharma",
    phone: "9876543211",
    email: "rajesh.sharma@gmail.com",
    centerId: 1, // Pune Central
    classId: "nursery-a",
    status: "active",
    attendanceRate: "94%",
    activities: [
      { date: "2026-06-10", activity: "Finger Painting", status: "Present" },
      { date: "2026-06-09", activity: "Storytelling Circle", status: "Present" },
    ]
  },
  {
    id: 2,
    name: "Ananya Desai",
    age: 5,
    gender: "Female",
    parentName: "Amol Desai",
    phone: "9123456780",
    email: "amol.desai@yahoo.com",
    centerId: 2, // Mumbai West
    classId: "kg-1",
    status: "active",
    attendanceRate: "98%",
    activities: [
      { date: "2026-06-10", activity: "Phonics Basics", status: "Present" },
      { date: "2026-06-09", activity: "Clay Modeling", status: "Present" },
    ]
  },
  {
    id: 3,
    name: "Kabir Mehta",
    age: 3,
    gender: "Male",
    parentName: "Megha Mehta",
    phone: "9988776651",
    email: "megha.mehta@outlook.com",
    centerId: 1, // Pune Central
    classId: "playgroup",
    status: "inactive",
    attendanceRate: "72%",
    activities: [
      { date: "2026-05-15", activity: "Building Blocks", status: "Absent" },
    ]
  },
  {
    id: 4,
    name: "Reyansh Malhotra",
    age: 4,
    gender: "Male",
    parentName: "Vikas Malhotra",
    phone: "9822334455",
    email: "vikas.m@gmail.com",
    centerId: 1, // Pune Central
    classId: "nursery-a",
    status: "active",
    attendanceRate: "91%",
    activities: [
      { date: "2026-06-12", activity: "Alphabet Puzzle", status: "Present" },
      { date: "2026-06-11", activity: "Rhyme Session", status: "Present" },
    ]
  },
  {
    id: 5,
    name: "Diya Iyer",
    age: 5,
    gender: "Female",
    parentName: "Ramesh Iyer",
    phone: "9566778899",
    email: "ramesh.iyer@hotmail.com",
    centerId: 1, // Pune Central
    classId: "kg-1",
    status: "active",
    attendanceRate: "96%",
    activities: [
      { date: "2026-06-12", activity: "Math Counting", status: "Present" },
    ]
  },
  {
    id: 6,
    name: "Vivaan Joshi",
    age: 5,
    gender: "Male",
    parentName: "Siddharth Joshi",
    phone: "9811223344",
    email: "sid.joshi@gmail.com",
    centerId: 2, // Mumbai West
    classId: "kg-1",
    status: "active",
    attendanceRate: "95%",
    activities: [
      { date: "2026-06-10", activity: "Phonics Basics", status: "Present" },
    ]
  },
  {
    id: 7,
    name: "Ira Kulkarni",
    age: 6,
    gender: "Female",
    parentName: "Nitin Kulkarni",
    phone: "9733445566",
    email: "nitin.k@yahoo.com",
    centerId: 2, // Mumbai West
    classId: "kg-2",
    status: "active",
    attendanceRate: "100%",
    activities: [
      { date: "2026-06-11", activity: "Advanced Reading", status: "Present" },
      { date: "2026-06-10", activity: "Drawing Board", status: "Present" },
    ]
  },
  {
    id: 8,
    name: "Zoya Khan",
    age: 3,
    gender: "Female",
    parentName: "Asif Khan",
    phone: "9000112233",
    email: "asif.khan@gmail.com",
    centerId: 4, // Delhi NCR
    classId: "playgroup",
    status: "active",
    attendanceRate: "88%",
    activities: [
      { date: "2026-06-12", activity: "Color Identification", status: "Present" },
    ]
  },
  {
    id: 9,
    name: "Arjun Nair",
    age: 4,
    gender: "Male",
    parentName: "Madhavan Nair",
    phone: "9444555666",
    email: "m.nair@outlook.com",
    centerId: 4, // Delhi NCR
    classId: "nursery-a",
    status: "active",
    attendanceRate: "93%",
    activities: [
      { date: "2026-06-12", activity: "Paper Crafting", status: "Present" },
    ]
  }
];

const MOCK_CENTERS_LIST = [
  { id: 1, name: "SpacECE Preschool — Pune Central" },
  { id: 2, name: "SpacECE Preschool — Mumbai West" },
  { id: 4, name: "SpacECE Preschool — Delhi NCR" },
];

const MOCK_CLASSES_LIST = [
  { id: "playgroup", name: "Playgroup" },
  { id: "nursery-a", name: "Nursery - A" },
  { id: "kg-1", name: "Kindergarten 1" },
  { id: "kg-2", name: "Kindergarten 2" },
];

const EMPTY_FORM = {
  name: "", age: "", gender: "Male", parentName: "",
  phone: "", email: "", centerId: "", classId: "",
  status: "active", attendanceRate: "100%", activities: []
};

/* ── Add / Edit Modal ── */
function ChildFormModal({ child, onSave, onClose, setToast }) {
  const isEdit = !!child;
  const [form, setForm] = useState(child || EMPTY_FORM);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.parentName || !form.phone || !form.centerId || !form.classId) {
      setToast({ msg: "Please fill all required fields.", type: "error" });
      return;
    }
    onSave({ 
      ...form, 
      id: child?.id || Date.now(),
      centerId: Number(form.centerId) 
    });
    setToast({ msg: isEdit ? "Child record updated!" : "Child enrolled successfully!", type: "success" });
    onClose();
  };

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
              onChange={e => setForm({ ...form, centerId: e.target.value })}>
              <option value="">Select Center</option>
              {MOCK_CENTERS_LIST.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Assigned Class *</label>
            <select style={S.input} value={form.classId}
              onChange={e => setForm({ ...form, classId: e.target.value })}>
              <option value="">Select Class</option>
              {MOCK_CLASSES_LIST.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
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
function ChildDetailModal({ child, centers, classes, onClose }) {
  const centerName = centers.find(c => c.id === child.centerId)?.name || "Unassigned Center";
  const className = classes.find(c => c.id === child.classId)?.name || "Unassigned Class";

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

      {/* Activity & Attendance Timeline */}
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
  const [children, setChildren] = useState(MOCK_CHILDREN);
  const [search, setSearch] = useState("");
  
  // Drill-down states
  const [selectedCenterId, setSelectedCenterId] = useState(MOCK_CENTERS_LIST[0]?.id || null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  
  const [formModal, setFormModal] = useState(false);
  const [editChild, setEditChild] = useState(null);
  const [detailChild, setDetailChild] = useState(null);
  const [toast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  // Filter children based on active hierarchy selections & explicit text search values
  const filteredChildren = children.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.parentName.toLowerCase().includes(q);
    const matchCenter = !selectedCenterId || c.centerId === selectedCenterId;
    const matchClass = !selectedClassId || c.classId === selectedClassId;
    return matchSearch && matchCenter && matchClass;
  });

  const handleSave = (saved) => {
    if (editChild) {
      setChildren(prev => prev.map(c => c.id === saved.id ? saved : c));
    } else {
      setChildren(prev => [...prev, saved]);
    }
    setFormModal(false);
    setEditChild(null);
  };

  const handleDeactivate = (id) => {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, status: "inactive" } : c));
    showToast({ msg: "Child profile set to inactive.", type: "error" });
  };

  const openEdit = (child) => {
    setEditChild(child);
    setFormModal(true);
  };

  const openAdd = () => {
    setEditChild(null);
    setFormModal(true);
  };

  const handleCenterSelect = (centerId) => {
    setSelectedCenterId(centerId);
    setSelectedClassId(null); // Reset class selection upon center shift
  };

  // Dynamically compute counters for classes inside the active center context
  const getClassStudentCount = (classId) => {
    return children.filter(c => c.centerId === selectedCenterId && c.classId === classId).length;
  };

  const active = children.filter(c => c.status === "active").length;
  const inactive = children.filter(c => c.status === "inactive").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease", fontFamily: "inherit" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {formModal && (
        <ChildFormModal
          child={editChild}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditChild(null); }}
          setToast={showToast}
        />
      )}

      {detailChild && (
        <ChildDetailModal
          child={detailChild}
          centers={MOCK_CENTERS_LIST}
          classes={MOCK_CLASSES_LIST}
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
          {MOCK_CENTERS_LIST.map(center => {
            const isSelected = selectedCenterId === center.id;
            const centerCount = children.filter(c => c.centerId === center.id).length;
            return (
              <button
                key={center.id}
                onClick={() => handleCenterSelect(center.id)}
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
            {MOCK_CLASSES_LIST.map(cls => {
              const isSelected = selectedClassId === cls.id;
              const count = getClassStudentCount(cls.id);
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
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
          const centerObj = MOCK_CENTERS_LIST.find(cen => cen.id === c.centerId);
          const classObj = MOCK_CLASSES_LIST.find(cls => cls.id === c.classId);

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
                <button onClick={() => handleDeactivate(c.id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  🔕
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