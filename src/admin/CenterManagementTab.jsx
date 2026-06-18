import { useState } from "react";
import { Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";

const API = '/api';
async function fetchAPI(url, options = {}) {
  const token = localStorage.getItem("token") || localStorage.getItem("spacece_token") || localStorage.getItem("authToken");
  const res = await fetch(`${API}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error("API Error");
  return res.json();
}

const EMPTY_FORM = {
  name: "", address: "", city: "", pincode: "",
  contactPhone: "", email: "", contactPerson: "",
  status: "active", capacity: 0,
};

/* ── Add / Edit Modal ── */
function CenterFormModal({ center, onSave, onClose, setToast, teachers }) {
  const isEdit = !!center;
  const [form, setForm] = useState(center ? {
    name: center.name || "",
    address: center.address || "",
    city: center.city || "",
    pincode: center.pincode || "",
    contactPhone: center.contactPhone || center.phone || "",
    email: center.email || "",
    contactPerson: center.contactPerson || "",
    status: center.status || "active",
    capacity: center.capacity || 0,
  } : EMPTY_FORM);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.contactPhone) {
      setToast({ msg: "Please fill all required fields.", type: "error" });
      return;
    }
    try {
      if (isEdit) {
        await fetchAPI(`/centers/${center._id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await fetchAPI("/centers", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      setToast({ msg: isEdit ? "Center updated!" : "Center added!", type: "success" });
      onSave();
      onClose();
    } catch (err) {
      setToast({ msg: "Failed to save center.", type: "error" });
    }
  };

  return (
    <Modal title={isEdit ? "✏️ Edit Center" : "➕ Add New Center"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Center Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. SpacECE Preschool — Pune Central" />

        <label style={S.label}>Full Address *</label>
        <textarea style={{ ...S.input, height: 60, resize: "none", marginBottom: 12 }}
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
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
            <input style={S.input} value={form.contactPhone}
              onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} placeholder="center@spacece.in" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Contact Person</label>
            <input style={S.input} value={form.contactPerson}
              onChange={e => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="e.g. Mrs. Rekha Iyer" />
          </div>
          <div>
            <label style={S.label}>Capacity</label>
            <input style={S.input} type="number" value={form.capacity}
              onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 50" />
          </div>
        </div>

        <label style={S.label}>Status</label>
        <select style={{ ...S.input, marginBottom: 20 }} value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>
          {isEdit ? "Update Center →" : "Add Center →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Center Detail View ── */
function CenterDetailModal({ center, teachers, children, onClose }) {
  const centerTeachers = (teachers || []).filter(t => {
    const tc = typeof t.center === "object" ? t.center?._id : t.center;
    return tc === center._id;
  });
  const centerChildren = (children || []).filter(c => {
    const cc = typeof c.center === "object" ? c.center?._id : c.center;
    return cc === center._id;
  });

  return (
    <Modal title={`🏫 ${center.name}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "📍", label: "Location", val: center.address || center.location || "—" },
          { icon: "📱", label: "Phone", val: center.contactPhone || center.phone || "—" },
          { icon: "📧", label: "Email", val: center.email || "—" },
          { icon: "👤", label: "Contact Person", val: center.contactPerson || "—" },
          { icon: "🏙️", label: "City", val: center.city || "—" },
          { icon: "📮", label: "Pincode", val: center.pincode || "—" },
        ].map((r, i) => (
          <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{r.icon} {r.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#fef3c7", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #fbbf24" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{centerTeachers.length}</div>
          <div style={{ fontSize: 11, color: "#92400e", fontWeight: 700 }}>Teachers</div>
        </div>
        <div style={{ background: "#dbeafe", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #93c5fd" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{centerChildren.length}</div>
          <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>Children</div>
        </div>
        <div style={{ background: "#d1fae5", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #6ee7b7" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{center.capacity || 0}</div>
          <div style={{ fontSize: 11, color: "#065f46", fontWeight: 700 }}>Capacity</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>👩‍🏫 Assigned Teachers</div>
        {centerTeachers.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {centerTeachers.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                background: "#f9fafb", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8,
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "white" }}>{(t.name || "?")[0]}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.specialization || t.subjects?.[0] || "—"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "16px", color: "#9ca3af", fontSize: 12 }}>
            No teachers assigned yet.
          </div>
        )}
      </div>

      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10,
        padding: "12px 14px", fontSize: 12, color: "#0369a1" }}>
        👶 This center has <b>{centerChildren.length}</b> children enrolled (Capacity: {center.capacity || 0}).
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MAIN CENTER MANAGEMENT TAB
══════════════════════════════════════════ */
export default function CenterManagementTab({ centers = [], teachers = [], children = [], setToast, onRefresh }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [editCenter, setEditCenter] = useState(null);
  const [detailCenter, setDetailCenter] = useState(null);
  const [toast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  const filtered = centers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = (c.name || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.contactPerson || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async () => {
    if (onRefresh) await onRefresh();
  };

  const handleDelete = async (id) => {
    try {
      await fetchAPI(`/centers/${id}`, { method: "DELETE" });
      showToast({ msg: "Center deleted.", type: "error" });
      if (onRefresh) await onRefresh();
    } catch (err) {
      showToast({ msg: "Failed to delete center.", type: "error" });
    }
  };

  const openEdit = (center) => {
    setEditCenter(center);
    setFormModal(true);
  };

  const openAdd = () => {
    setEditCenter(null);
    setFormModal(true);
  };

  // Calculate stats from DB
  const active = centers.filter(c => c.status === "active").length;
  const inactive = centers.filter(c => c.status === "inactive").length;
  const totalChildren = children.length;
  const totalTeachers = teachers.length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {formModal && (
        <CenterFormModal
          center={editCenter}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditCenter(null); }}
          setToast={showToast}
          teachers={teachers}
        />
      )}
      {detailCenter && (
        <CenterDetailModal
          center={detailCenter}
          teachers={teachers}
          children={children}
          onClose={() => setDetailCenter(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Center Management</h1>
          <p style={S.pageSub}>{active} active · {inactive} inactive · {centers.length} total centers</p>
        </div>
        <button onClick={openAdd} style={S.primaryBtn}>+ Add Center</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="🏫" label="Total Centers" val={centers.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Active" val={active} color="#10b981" bg="#d1fae5" />
        <StatCard icon="🔕" label="Inactive" val={inactive} color="#6b7280" bg="#f3f4f6" />
        <StatCard icon="👩‍🏫" label="Total Teachers" val={totalTeachers} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="👶" label="Total Children" val={totalChildren} color="#8b5cf6" bg="#ede9fe" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, city, or contact person..." />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "active", "inactive"].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{ padding: "8px 14px", borderRadius: 8,
                border: `1.5px solid ${statusFilter === f ? "#f59e0b" : "#e5e7eb"}`,
                background: statusFilter === f ? "#fef3c7" : "white",
                color: statusFilter === f ? "#92400e" : "#6b7280",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
              {f === "all" ? "All Centers" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Centers Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {filtered.map((c) => {
          // Count teachers/children for this center
          const cTeachers = teachers.filter(t => {
            const tc = typeof t.center === "object" ? t.center?._id : t.center;
            return tc === c._id;
          });
          const cChildren = children.filter(ch => {
            const cc = typeof ch.center === "object" ? ch.center?._id : ch.center;
            return cc === c._id;
          });

          return (
            <div key={c._id || c.id} style={{ background: "white", borderRadius: 18, padding: "20px",
              border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              borderTop: `3px solid ${c.status === "active" ? "#f59e0b" : "#e5e7eb"}` }}>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14,
                  background: "linear-gradient(135deg,#fef3c7,#fbbf24)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0 }}>🏫</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>📍 {c.city} · {c.pincode}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14,
                padding: "12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>📱 {c.contactPhone || c.phone}</div>
                {c.email && <div style={{ fontSize: 12, color: "#6b7280" }}>📧 {c.email}</div>}
                {c.contactPerson && <div style={{ fontSize: 12, color: "#6b7280" }}>👤 {c.contactPerson}</div>}
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>📍 {c.address || c.location}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { icon: "👩‍🏫", label: "Teachers", val: cTeachers.length, color: "#f59e0b", bg: "#fef3c7" },
                  { icon: "👶", label: "Children", val: cChildren.length, color: "#3b82f6", bg: "#dbeafe" },
                  { icon: "🏛️", label: "Capacity", val: c.capacity || 0, color: "#10b981", bg: "#d1fae5" },
                ].map((s, j) => (
                  <div key={j} style={{ background: s.bg, borderRadius: 8, padding: "8px",
                    textAlign: "center", border: `1px solid ${s.color}30` }}>
                    <div style={{ fontSize: 14 }}>{s.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1c1917" }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <button onClick={() => setDetailCenter(c)}
                  style={{ ...S.tblBtn, flex: 1, color: "#4f46e5", borderColor: "#c4b5fd" }}>
                  👁 View
                </button>
                <button onClick={() => openEdit(c)} style={{ ...S.tblBtn, flex: 1 }}>
                  ✏️ Edit
                </button>
                <button onClick={() => handleDelete(c._id)}
                  style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  🔕
                </button>
              </div>
            </div>
          );
        })}
      </div>

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