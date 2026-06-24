// CenterManagementTab.jsx
import { useState, useEffect } from "react";
import { Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getCenters, createCenter, updateCenter, deleteCenter, getAdminTeachers, updateTeacherProfile, getClasses, createClass, updateClass, deleteClass, getClassLogs } from "../services/api";

const mapCenterFromApi = (c) => ({
  id: c._id || c.id,
  name: c.name,
  location: c.address || c.location || "",
  city: c.city || "",
  pincode: c.pincode || "",
  phone: c.phone || "",
  email: c.email || "",
  contactPerson: c.contactPerson || "",
  status: c.status || "active",
  teachers: c.teachers || [],
  children: c.children || 0,
  classes: c.classes || 0,
});

const mapCenterToApi = (c) => ({
  name: c.name,
  address: c.location,
  city: c.city,
  pincode: c.pincode,
  phone: c.phone,
  email: c.email,
  contactPerson: c.contactPerson,
  status: c.status,
  teachers: c.teachers,
});

const EMPTY_FORM = {
  name: "", address: "", city: "", pincode: "",
  contactPhone: "", email: "", contactPerson: "",
  status: "active", capacity: 0,
};

/* ── Add / Edit Modal ── */
function CenterFormModal({ center, allTeachers = [], onSave, onClose, setToast }) {
  const isEdit = !!center;
  const [form, setForm] = useState(center ? { ...center } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.phone) {
      setToast({ msg: "Please fill all required fields.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const toggleTeacher = (id) => {
    setForm(prev => ({
      ...prev,
      teachers: prev.teachers.includes(id)
        ? prev.teachers.filter(t => t !== id)
        : [...prev.teachers, id],
    }));
  };

  const approvedTeachers = allTeachers.filter(t => t.status === "approved" || t.status === "pending");

  return (
    <Modal title={isEdit ? "✏️ Edit Center" : "➕ Add New Center"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Center Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. SpacECE Preschool — Pune Central" />

        <label style={S.label}>Full Address *</label>
        <textarea style={{ ...S.input, height: 60, resize: "none", marginBottom: 12 }}
          value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
          placeholder="Street, Area, City - Pincode" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>City</label>
            <input style={S.input} value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Pune" />
          </div>
          <div>
            <label style={S.label}>Pincode</label>
            <input style={S.input} value={form.pincode}
              onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="e.g. 411005" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Phone *</label>
            <input style={S.input} value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} placeholder="center@spaceece.in" />
          </div>
        </div>

        <label style={S.label}>Contact Person</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.contactPerson}
          onChange={e => setForm({ ...form, contactPerson: e.target.value })}
          placeholder="e.g. Mrs. Rekha Iyer" />

        <label style={S.label}>Status</label>
        <select style={{ ...S.input, marginBottom: 16 }} value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <label style={S.label}>
          Assign Teachers
          <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>
            (selected teachers will have this center set on their dashboard)
          </span>
        </label>
        <div style={{
          display: "flex", flexDirection: "column", gap: 6, marginBottom: 20,
          maxHeight: 180, overflowY: "auto",
          border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px"
        }}>
          {approvedTeachers.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
              No teachers available.
            </div>
          ) : approvedTeachers.map(t => {
            const teacherId = t._id || t.id;
            const selected = form.teachers.includes(teacherId);
            return (
              <div key={teacherId} onClick={() => toggleTeacher(teacherId)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                  border: `1.5px solid ${selected ? "#f59e0b" : "#e5e7eb"}`,
                  background: selected ? "#fef3c7" : "#f9fafb",
                  transition: "all 0.15s"
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: `2px solid ${selected ? "#f59e0b" : "#d1d5db"}`,
                  background: selected ? "#f59e0b" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "white", flexShrink: 0
                }}>
                  {selected ? "✓" : ""}
                </div>
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}`}
                  alt="" style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #e5e7eb" }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? "#92400e" : "#374151" }}>
                    {t.name}
                  </span>
                  <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 6 }}>{t.email}</span>
                </div>
                <StatusBadge status={t.status} />
              </div>
            );
          })}
        </div>

        {form.teachers.length > 0 && (
          <div style={{
            background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8,
            padding: "8px 12px", fontSize: 11, color: "#92400e", marginBottom: 16
          }}>
            🏫 <b>{form.teachers.length} teacher(s)</b> will be linked to this center — it will appear on their dashboard automatically.
          </div>
        )}

        <button type="submit" disabled={saving}
          style={{ ...S.primaryBtn, width: "100%", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : isEdit ? "Update Center →" : "Add Center →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Center Detail View ── */
function CenterDetailModal({ center, allTeachers = [], onClose }) {
  const assignedTeachers = allTeachers.filter(t => {
    const tid = t._id || t.id;
    return center.teachers.includes(tid);
  });

  return (
    <Modal title={`🏫 ${center.name}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <StatusBadge status={center.status} />
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          📍 {center.city}{center.pincode ? ` · ${center.pincode}` : ""}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "📍", label: "Location",       val: center.location },
          { icon: "📱", label: "Phone",           val: center.phone },
          { icon: "📧", label: "Email",           val: center.email || "—" },
          { icon: "👤", label: "Contact Person",  val: center.contactPerson || "—" },
          { icon: "🏙️", label: "City",           val: center.city || "—" },
          { icon: "📮", label: "Pincode",         val: center.pincode || "—" },
        ].map((r, i) => (
          <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{r.icon} {r.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#fef3c7", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #fbbf24" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{center.teachers.length}</div>
          <div style={{ fontSize: 11, color: "#92400e", fontWeight: 700 }}>Teachers</div>
        </div>
        <div style={{ background: "#dbeafe", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #93c5fd" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{center.children}</div>
          <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>Children</div>
        </div>
        <div style={{ background: "#d1fae5", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #6ee7b7" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{center.classes}</div>
          <div style={{ fontSize: 11, color: "#065f46", fontWeight: 700 }}>Classes</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>👩‍🏫 Assigned Teachers</div>
        {assignedTeachers.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {assignedTeachers.map((t, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", background: "#f9fafb",
                borderRadius: 8, border: "1px solid #f1f5f9"
              }}>
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}`}
                  alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid #f59e0b" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.email}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "16px", color: "#9ca3af", fontSize: 12 }}>
            No teachers assigned to this center yet.
          </div>
        )}
      </div>

      <div style={{
        background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10,
        padding: "12px 14px", fontSize: 12, color: "#92400e"
      }}>
        👶 This center has <b>{center.children}</b> children enrolled across <b>{center.classes}</b> classes.
      </div>
    </Modal>
  );
}

/* ── Standalone Add Class Modal ── */
function AddClassModal({ centers, onSave, onClose, setToast }) {
  const [form, setForm] = useState({
    name: "",
    ageGroup: "",
    curriculumLevel: "",
    schedule: "",
    center: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.center) {
      setToast({ msg: "Class name and center are required.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await createClass(form);
      setToast({ msg: "Class created successfully!", type: "success" });
      onSave();
      onClose();
    } catch (err) {
      setToast({ msg: "Failed to create class: " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const activeCenters = centers.filter(c => c.status === "active");

  return (
    <Modal title="➕ Add New Class" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Select Center *</label>
        <select
          style={{ ...S.input, marginBottom: 12 }}
          value={form.center}
          onChange={e => setForm({ ...form, center: e.target.value })}
        >
          <option value="">Choose a center...</option>
          {activeCenters.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
          ))}
        </select>
        {activeCenters.length === 0 && (
          <div style={{ fontSize: 11, color: "#dc2626", marginBottom: 12 }}>
            No active centers found. Please create a center first.
          </div>
        )}

        <label style={S.label}>Class Name *</label>
        <input
          style={{ ...S.input, marginBottom: 12 }}
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Nursery A, LKG B, UKG C"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Age Group</label>
            <input
              style={S.input}
              value={form.ageGroup}
              onChange={e => setForm({ ...form, ageGroup: e.target.value })}
              placeholder="e.g. 3-4 years"
            />
          </div>
          <div>
            <label style={S.label}>Curriculum Level</label>
            <input
              style={S.input}
              value={form.curriculumLevel}
              onChange={e => setForm({ ...form, curriculumLevel: e.target.value })}
              placeholder="e.g. Foundation, Pre-Primary"
            />
          </div>
        </div>

        <label style={S.label}>Schedule</label>
        <input
          style={{ ...S.input, marginBottom: 20 }}
          value={form.schedule}
          onChange={e => setForm({ ...form, schedule: e.target.value })}
          placeholder="e.g. Mon-Fri 9:00 AM to 12:00 PM"
        />

        <button
          type="submit"
          disabled={saving || !form.center || !form.name}
          style={{
            ...S.primaryBtn,
            width: "100%",
            opacity: saving || !form.center || !form.name ? 0.6 : 1,
            cursor: saving || !form.center || !form.name ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Creating Class..." : "Create Class →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Classes Management Modal ── */
function ClassManagementModal({ centerId, centerName, classes, onSave, onClose, setToast }) {
  const [centerClasses, setCenterClasses] = useState(classes.filter(c => String(c.center) === String(centerId) || String(c.center?._id) === String(centerId)));
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [classLogs, setClassLogs] = useState([]);
  const [formData, setFormData] = useState({ name: "", ageGroup: "", curriculumLevel: "", schedule: "" });

  const filteredClasses = classes.filter(c => String(c.center) === String(centerId) || String(c.center?._id) === String(centerId));

  useEffect(() => {
    setCenterClasses(filteredClasses);
  }, [classes, centerId]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setToast({ msg: "Class name is required", type: "error" });
      return;
    }
    try {
      await createClass({ ...formData, center: centerId });
      setToast({ msg: "Class added successfully!", type: "success" });
      setShowAddForm(false);
      setFormData({ name: "", ageGroup: "", curriculumLevel: "", schedule: "" });
      onSave();
    } catch (err) {
      setToast({ msg: "Failed to add class: " + err.message, type: "error" });
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setToast({ msg: "Class name is required", type: "error" });
      return;
    }
    try {
      await updateClass(editClass._id || editClass.id, formData);
      setToast({ msg: "Class updated successfully!", type: "success" });
      setEditClass(null);
      setShowAddForm(false);
      onSave();
    } catch (err) {
      setToast({ msg: "Failed to update class: " + err.message, type: "error" });
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await deleteClass(id);
      setToast({ msg: "Class deleted successfully!", type: "success" });
      onSave();
    } catch (err) {
      setToast({ msg: "Failed to delete class: " + err.message, type: "error" });
    }
  };

  const loadClassLogs = async () => {
    try {
      const res = await getClassLogs();
      setClassLogs(res.logs || []);
    } catch (err) {
      setToast({ msg: "Failed to load class logs: " + err.message, type: "error" });
    }
  };

  const openEditForm = (cls) => {
    setEditClass(cls);
    setFormData({
      name: cls.name,
      ageGroup: cls.ageGroup || "",
      curriculumLevel: cls.curriculumLevel || "",
      schedule: cls.schedule || "",
    });
    setShowAddForm(true);
  };

  return (
    <Modal title={`🏛️ Manage Classes for ${centerName}`} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowAddForm(true)} style={{ ...S.primaryBtn }}>
          + Add New Class
        </button>
      </div>

      {showAddForm && (
        <div style={{ marginBottom: 16, padding: "16px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
            {editClass ? "Edit Class" : "Add New Class"}
          </h4>
          <form onSubmit={editClass ? handleUpdateClass : handleAddClass}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={S.label}>Class Name *</label>
                <input
                  style={S.input}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Nursery A"
                />
              </div>
              <div>
                <label style={S.label}>Age Group</label>
                <input
                  style={S.input}
                  value={formData.ageGroup}
                  onChange={e => setFormData({ ...formData, ageGroup: e.target.value })}
                  placeholder="e.g. 3-4 years"
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={S.label}>Curriculum Level</label>
                <input
                  style={S.input}
                  value={formData.curriculumLevel}
                  onChange={e => setFormData({ ...formData, curriculumLevel: e.target.value })}
                  placeholder="e.g. Foundation"
                />
              </div>
              <div>
                <label style={S.label}>Schedule</label>
                <input
                  style={S.input}
                  value={formData.schedule}
                  onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="e.g. Mon-Fri 9AM-12PM"
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={S.primaryBtn}>Save</button>
              <button type="button" onClick={() => { setShowAddForm(false); setEditClass(null); setFormData({ name: "", ageGroup: "", curriculumLevel: "", schedule: "" }); }} style={S.tblBtn}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Class Name</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Age Group</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Curriculum Level</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Schedule</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {centerClasses.length > 0 ? (
              centerClasses.map(cls => (
                <tr key={cls._id || cls.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1c1917" }}>{cls.name}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{cls.ageGroup || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{cls.curriculumLevel || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{cls.schedule || "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <button onClick={() => openEditForm(cls)} style={{ ...S.tblBtn, padding: "6px 12px", fontSize: 12, marginRight: 6 }}>✏️ Edit</button>
                    <button onClick={() => handleDeleteClass(cls._id || cls.id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5", padding: "6px 12px", fontSize: 12 }}>🗑️ Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  No classes added yet. Click "Add New Class" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
</div>
       </Modal>
   );
}

/* ── Class Activity Logs Modal ── */
function ClassLogsModal({ logs = [], onClose }) {
  const [logsData, setLogsData] = useState(logs);

  useEffect(() => {
    setLogsData(logs);
  }, [logs]);

  return (
    <Modal title="📋 Class Activity Logs" onClose={onClose}>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Action</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Class</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>By</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>When</th>
            </tr>
          </thead>
          <tbody>
            {logsData.length > 0 ? (
              logsData.map((log, i) => (
                <tr key={log._id || log.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: log.action === "create" ? "#d1fae5" : log.action === "update" ? "#fef3c7" : "#fee2e2",
                      color: log.action === "create" ? "#065f46" : log.action === "update" ? "#92400e" : "#991b1b"
                    }}>
                      {log.action?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px" }}>{log.className || "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{log.performedByName || "—"}</td>
                  <td style={{ padding: "8px 12px", color: "#6b7280", fontSize: 11 }}>
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  No class activity logs found. Actions on classes will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MAIN CENTER MANAGEMENT TAB
   ══════════════════════════════════════════ */
export default function CenterManagementTab({ setToast }) {
  const [centers, setCenters]         = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formModal, setFormModal]     = useState(false);
  const [editCenter, setEditCenter]   = useState(null);
  const [detailCenter, setDetailCenter] = useState(null);
  const [classesModal, setClassesModal] = useState(false);
  const [manageCenterId, setManageCenterId] = useState(null);
  const [addClassModal, setAddClassModal] = useState(false);
  const [classes, setClasses]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [toast, setLocalToast]        = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  const loadData = async () => {
    try {
      const [centersRes, teachersRes, classesRes] = await Promise.all([getCenters(), getAdminTeachers(), getClasses()]);
      setCenters((centersRes.centers || []).map(mapCenterFromApi));
      setAllTeachers(teachersRes.teachers || []);
      setClasses((classesRes.classes || []).map(c => ({
        id: c._id || c.id,
        name: c.name,
        center: String(c.center?._id || c.center || ""),
        ageGroup: c.ageGroup || "",
        curriculumLevel: c.curriculumLevel || "",
        schedule: c.schedule || "",
      })));
    } catch (err) {
      showToast({ msg: "Failed to load centers: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = centers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q)
    ) && (statusFilter === "all" || c.status === statusFilter);
  });

  const handleSave = async (saved) => {
    const payload = mapCenterToApi(saved);
    try {
      let centerId;
      if (editCenter) {
        await updateCenter(editCenter.id, payload);
        centerId = editCenter.id;
        showToast({ msg: "Center updated successfully!", type: "success" });
      } else {
        const res = await createCenter(payload);
        centerId = res.center?._id || res.center?.id;
        showToast({ msg: "Center created successfully!", type: "success" });
      }

      // KEY: push centerId to every selected teacher so it shows on their dashboard
      if (centerId && saved.teachers?.length > 0) {
        await Promise.all(
          saved.teachers.map(tid =>
            updateTeacherProfile(tid, { teacherProfile: { center: centerId } })
              .catch(err => console.warn(`Failed to update teacher ${tid}:`, err))
          )
        );
      }

      // KEY: also clear center from teachers who were REMOVED from this center
      if (editCenter && centerId) {
        const previousTeachers = editCenter.teachers || [];
        const newTeachers = saved.teachers || [];
        const removedTeachers = previousTeachers.filter(tid => !newTeachers.includes(tid));
        if (removedTeachers.length > 0) {
          await Promise.all(
            removedTeachers.map(tid =>
              updateTeacherProfile(tid, { teacherProfile: { center: null } })
                .catch(err => console.warn(`Failed to unlink teacher ${tid}:`, err))
            )
          );
        }
      }

      setFormModal(false);
      setEditCenter(null);
      await loadData();
    } catch (err) {
      showToast({ msg: "Error saving center: " + err.message, type: "error" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCenter(id);
      showToast({ msg: "Center deactivated successfully.", type: "success" });
      await loadData();
    } catch (err) {
      showToast({ msg: "Error deactivating center: " + err.message, type: "error" });
    }
  };

  const openEdit = (center) => { setEditCenter(center); setFormModal(true); };
  const openAdd  = ()       => { setEditCenter(null);   setFormModal(true); };
  const openManageClasses = (centerId) => { setManageCenterId(centerId); setClassesModal(true); loadClasses(); };

  const loadClasses = async () => {
    try {
      const res = await getClasses();
      setClasses((res.classes || []).map(c => ({
        id: c._id || c.id,
        name: c.name,
        center: String(c.center?._id || c.center || ""),
        ageGroup: c.ageGroup || "",
        curriculumLevel: c.curriculumLevel || "",
        schedule: c.schedule || "",
      })));
    } catch (err) {
      showToast({ msg: "Failed to load classes: " + err.message, type: "error" });
    }
  };

  const handleAddClassSaved = async () => {
    await loadClasses();
    await loadData();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #fef3c7", borderTopColor: "#f59e0b", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#d97706" }}>Loading Centers...</span>
      </div>
    );
  }

  const active        = centers.filter(c => c.status === "active").length;
  const inactive      = centers.filter(c => c.status === "inactive").length;
  const totalChildren = centers.reduce((a, c) => a + (c.children || 0), 0);
  const totalTeachers = centers.reduce((a, c) => a + (c.teachers?.length || 0), 0);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {formModal && (
        <CenterFormModal
          center={editCenter}
          allTeachers={allTeachers}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditCenter(null); }}
          setToast={showToast}
          teachers={teachers}
        />
      )}
      {addClassModal && (
        <AddClassModal
          centers={centers}
          onSave={handleAddClassSaved}
          onClose={() => setAddClassModal(false)}
          setToast={showToast}
        />
      )}
      {detailCenter && (
        <CenterDetailModal
          center={detailCenter}
          allTeachers={allTeachers}
          onClose={() => setDetailCenter(null)}
        />
      )}

      {/* ── Header — orange gradient (matches ActivityMonitoringTab amber palette) ── */}
      <div style={{
        background: "linear-gradient(135deg,#92400e 0%,#b45309 50%,#d97706 100%)",
        borderRadius: 20, padding: "24px 28px", marginBottom: 24,
        color: "white", position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fef3c7", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>Center Management</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Training Centers</h1>
            <p style={{ fontSize: 12, margin: 0, color: "rgba(255,255,255,0.75)" }}>
              {active} active · {inactive} inactive · {centers.length} total centers
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={openAdd} style={{ ...S.primaryBtn, whiteSpace: "nowrap", background: "#f59e0b", border: "1.5px solid rgba(255,255,255,0.35)", color: "white", padding: "14px 28px", fontSize: 15, borderRadius: 14, fontWeight: 700 }}>
              + Add Center
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="🏫" label="Total Centers"  val={centers.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Active"          val={active}         color="#10b981" bg="#d1fae5" />
        <StatCard icon="🔕" label="Inactive"        val={inactive}       color="#6b7280" bg="#f3f4f6" />
        <StatCard icon="👩‍🏫" label="Total Teachers" val={totalTeachers}  color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="👶" label="Total Children"  val={totalChildren}  color="#8b5cf6" bg="#ede9fe" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, city, or contact person..." />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "active", "inactive"].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{
                padding: "8px 14px", borderRadius: 8,
                border: `1.5px solid ${statusFilter === f ? "#f59e0b" : "#e5e7eb"}`,
                background: statusFilter === f ? "#fef3c7" : "white",
                color: statusFilter === f ? "#92400e" : "#6b7280",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", textTransform: "capitalize"
              }}>
              {f === "all" ? "All Centers" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Centers Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {filtered.map((c) => (
          <div key={c.id} style={{
            background: "white", borderRadius: 18, padding: "20px",
            border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            borderTop: `3px solid ${c.status === "active" ? "#f59e0b" : "#e5e7eb"}`,
            transition: "box-shadow 0.2s"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "linear-gradient(135deg,#fef3c7,#fbbf24)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0
              }}>🏫</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>📍 {c.city}{c.pincode ? ` · ${c.pincode}` : ""}</div>
              </div>
              <StatusBadge status={c.status} />
            </div>

            <div style={{
              display: "flex", flexDirection: "column", gap: 5, marginBottom: 14,
              padding: "12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6"
            }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>📱 {c.phone}</div>
              {c.email && <div style={{ fontSize: 12, color: "#6b7280" }}>📧 {c.email}</div>}
              {c.contactPerson && <div style={{ fontSize: 12, color: "#6b7280" }}>👤 {c.contactPerson}</div>}
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>📍 {c.location}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { icon: "👩‍🏫", label: "Teachers", val: c.teachers.length, color: "#f59e0b", bg: "#fef3c7" },
                { icon: "👶",   label: "Children", val: c.children,         color: "#3b82f6", bg: "#dbeafe" },
                { icon: "🏛️",  label: "Classes",  val: c.classes,           color: "#10b981", bg: "#d1fae5" },
              ].map((s, j) => (
                <div key={j} style={{ background: s.bg, borderRadius: 8, padding: "8px", textAlign: "center", border: `1px solid ${s.color}30` }}>
                  <div style={{ fontSize: 14 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1c1917" }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
              <button onClick={() => setDetailCenter(c)} style={{ ...S.tblBtn, flex: 1, color: "#4f46e5", borderColor: "#c4b5fd" }}>
                👁 View
              </button>
              <button onClick={() => { setClassesModal(true); setManageCenterId(c.id); }} style={{ ...S.tblBtn, flex: 1, color: "#10b981", borderColor: "#86efac" }}>
                🏛️ Classes
              </button>
              <button onClick={() => openEdit(c)} style={{ ...S.tblBtn, flex: 1 }}>
                ✏️ Edit
              </button>
              <button onClick={() => handleDelete(c.id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                🔕
              </button>
            </div>
          );
        })}
      </div>

      {/* ── View All Classes Section ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>🏛️ All Classes</h2>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Complete class directory across all centers</p>
          </div>
          <button onClick={() => setAddClassModal(true)} style={{ ...S.primaryBtn, whiteSpace: "nowrap", background: "#f59e0b", padding: "10px 20px", fontSize: 13, borderRadius: 10, fontWeight: 700 }}>
            + Add Class
          </button>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Class Name</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Center</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Age Group</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Curriculum Level</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Schedule</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.length > 0 ? (
                classes.map(cls => {
                  const center = centers.find(c => c.id === (cls.center || cls.center?._id));
                  return (
                    <tr key={cls.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1c1917" }}>{cls.name}</td>
                      <td style={{ padding: "12px 16px", color: "#6b7280" }}>{center ? center.name : "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#6b7280" }}>{cls.ageGroup || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#6b7280" }}>{cls.curriculumLevel || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#6b7280" }}>{cls.schedule || "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button onClick={() => { setManageCenterId(cls.center || cls.center?._id); setClassesModal(true); }} style={{ ...S.tblBtn, padding: "6px 12px", fontSize: 12, marginRight: 6 }}>👁 Manage</button>
                        <button onClick={() => { if (window.confirm("Delete this class?")) { deleteClass(cls.id).then(() => { showToast({ msg: "Class deleted", type: "success" }); handleAddClassSaved(); }); }}} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5", padding: "6px 12px", fontSize: 12 }}>🗑️</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    No classes found. Click "+ Add Class" to create your first class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {classesModal && manageCenterId && (
        <ClassManagementModal
          centerId={manageCenterId}
          centerName={centers.find(c => c.id === manageCenterId)?.name || "Center"}
          classes={classes}
          onSave={() => loadClasses()}
          onClose={() => setClassesModal(false)}
          setToast={showToast}
        />
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏫</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No centers found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting filters or add a new center</div>
        </div>
      )}
    </div>
  );
}
