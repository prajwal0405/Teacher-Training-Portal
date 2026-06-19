import { useState } from "react";
import { Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";

const MOCK_CENTERS = [
  {
    id: 1,
    name: "SpacECE Preschool — Pune Central",
    location: "123, MG Road, Shivajinagar, Pune - 411005",
    city: "Pune",
    pincode: "411005",
    phone: "9876543210",
    email: "pune.central@spaceece.in",
    contactPerson: "Mrs. Rekha Iyer",
    status: "active",
    teachers: [1, 4],
    children: 42,
    classes: 3,
  },
  {
    id: 2,
    name: "SpacECE Preschool — Mumbai West",
    location: "45, SV Road, Andheri West, Mumbai - 400058",
    city: "Mumbai",
    pincode: "400058",
    phone: "9123456780",
    email: "mumbai.west@spaceece.in",
    contactPerson: "Mr. Amol Desai",
    status: "active",
    teachers: [2, 7],
    children: 58,
    classes: 4,
  },
  {
    id: 3,
    name: "SpacECE Preschool — Nagpur",
    location: "78, Wardha Road, Dharampeth, Nagpur - 440010",
    city: "Nagpur",
    pincode: "440010",
    phone: "9988776655",
    email: "nagpur@spaceece.in",
    contactPerson: "Ms. Geeta Rao",
    status: "inactive",
    teachers: [],
    children: 0,
    classes: 0,
  },
  {
    id: 4,
    name: "SpacECE Preschool — Delhi NCR",
    location: "12, Sector 18, Noida, Delhi NCR - 201301",
    city: "Noida",
    pincode: "201301",
    phone: "9765432100",
    email: "delhi.ncr@spaceece.in",
    contactPerson: "Dr. Vikram Shah",
    status: "active",
    teachers: [5],
    children: 35,
    classes: 2,
  },
];

const MOCK_TEACHERS_LIST = [
  { id:1, name:"Priya Sharma"  },
  { id:2, name:"Rahul Verma"   },
  { id:4, name:"Meera Patel"   },
  { id:5, name:"Suresh Kumar"  },
  { id:7, name:"Deepak Nair"   },
];

const EMPTY_FORM = {
  name: "", location: "", city: "", pincode: "",
  phone: "", email: "", contactPerson: "",
  status: "active", teachers: [], children: 0, classes: 0,
};

/* ── Add / Edit Modal ── */
function CenterFormModal({ center, onSave, onClose, setToast }) {
  const isEdit = !!center;
  const [form, setForm] = useState(center || EMPTY_FORM);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.phone) {
      setToast({ msg:"Please fill all required fields.", type:"error" });
      return;
    }
    onSave({ ...form, id: center?.id || Date.now() });
    setToast({ msg: isEdit ? "Center updated!" : "Center added!", type:"success" });
    onClose();
  };

  const toggleTeacher = (id) => {
    setForm(prev => ({
      ...prev,
      teachers: prev.teachers.includes(id)
        ? prev.teachers.filter(t => t !== id)
        : [...prev.teachers, id],
    }));
  };

  return (
    <Modal title={isEdit ? "✏️ Edit Center" : "➕ Add New Center"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Center Name *</label>
        <input style={{ ...S.input, marginBottom:12 }} value={form.name}
          onChange={e => setForm({...form, name:e.target.value})}
          placeholder="e.g. SpacECE Preschool — Pune Central" />

        <label style={S.label}>Full Address *</label>
        <textarea style={{ ...S.input, height:60, resize:"none", marginBottom:12 }}
          value={form.location}
          onChange={e => setForm({...form, location:e.target.value})}
          placeholder="Street, Area, City - Pincode" />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label style={S.label}>City</label>
            <input style={S.input} value={form.city}
              onChange={e => setForm({...form, city:e.target.value})} placeholder="e.g. Pune" />
          </div>
          <div>
            <label style={S.label}>Pincode</label>
            <input style={S.input} value={form.pincode}
              onChange={e => setForm({...form, pincode:e.target.value})} placeholder="e.g. 411005" />
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label style={S.label}>Phone *</label>
            <input style={S.input} value={form.phone}
              onChange={e => setForm({...form, phone:e.target.value})} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={form.email}
              onChange={e => setForm({...form, email:e.target.value})} placeholder="center@spaceece.in" />
          </div>
        </div>

        <label style={S.label}>Contact Person</label>
        <input style={{ ...S.input, marginBottom:12 }} value={form.contactPerson}
          onChange={e => setForm({...form, contactPerson:e.target.value})}
          placeholder="e.g. Mrs. Rekha Iyer" />

        <label style={S.label}>Status</label>
        <select style={{ ...S.input, marginBottom:16 }} value={form.status}
          onChange={e => setForm({...form, status:e.target.value})}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <label style={S.label}>Assign Teachers</label>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
          {MOCK_TEACHERS_LIST.map(t => {
            const selected = form.teachers.includes(t.id);
            return (
              <div key={t.id} onClick={() => toggleTeacher(t.id)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                  borderRadius:8, cursor:"pointer",
                  border:`1.5px solid ${selected?"#f59e0b":"#e5e7eb"}`,
                  background:selected?"#fef3c7":"#f9fafb" }}>
                <div style={{ width:18, height:18, borderRadius:4,
                  border:`2px solid ${selected?"#f59e0b":"#d1d5db"}`,
                  background:selected?"#f59e0b":"white",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, color:"white", flexShrink:0 }}>
                  {selected ? "✓" : ""}
                </div>
                <span style={{ fontSize:13, fontWeight:selected?700:500,
                  color:selected?"#92400e":"#374151" }}>{t.name}</span>
              </div>
            );
          })}
        </div>

        <button type="submit" style={{ ...S.primaryBtn, width:"100%" }}>
          {isEdit ? "Update Center →" : "Add Center →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Center Detail View ── */
function CenterDetailModal({ center, teachers, onClose }) {
  const assignedTeachers = teachers.filter(t => center.teachers.includes(t.id));

  return (
    <Modal title={`🏫 ${center.name}`} onClose={onClose}>
      {/* Info Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[
          { icon:"📍", label:"Location",       val:center.location       },
          { icon:"📱", label:"Phone",          val:center.phone          },
          { icon:"📧", label:"Email",          val:center.email || "—"   },
          { icon:"👤", label:"Contact Person", val:center.contactPerson || "—" },
          { icon:"🏙️", label:"City",           val:center.city || "—"    },
          { icon:"📮", label:"Pincode",        val:center.pincode || "—" },
        ].map((r,i) => (
          <div key={i} style={{ background:"#f9fafb", borderRadius:10, padding:"10px 12px", border:"1px solid #f3f4f6" }}>
            <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{r.label}</div>
            <div style={{ fontSize:12, color:"#374151", fontWeight:600 }}>{r.icon} {r.val}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
        <div style={{ background:"#fef3c7", borderRadius:10, padding:"12px", textAlign:"center", border:"1px solid #fbbf24" }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#1c1917" }}>{center.teachers.length}</div>
          <div style={{ fontSize:11, color:"#92400e", fontWeight:700 }}>Teachers</div>
        </div>
        <div style={{ background:"#dbeafe", borderRadius:10, padding:"12px", textAlign:"center", border:"1px solid #93c5fd" }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#1c1917" }}>{center.children}</div>
          <div style={{ fontSize:11, color:"#1d4ed8", fontWeight:700 }}>Children</div>
        </div>
        <div style={{ background:"#d1fae5", borderRadius:10, padding:"12px", textAlign:"center", border:"1px solid #6ee7b7" }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#1c1917" }}>{center.classes}</div>
          <div style={{ fontSize:11, color:"#065f46", fontWeight:700 }}>Classes</div>
        </div>
      </div>

      {/* Assigned Teachers */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>👩‍🏫 Assigned Teachers</div>
        {assignedTeachers.length > 0 ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {assignedTeachers.map((t,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                background:"#f9fafb", borderRadius:8, border:"1px solid #f1f5f9" }}>
                <div style={{ width:30, height:30, borderRadius:8,
                  background:"linear-gradient(135deg,#f59e0b,#d97706)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:13, fontWeight:800, color:"white" }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{t.name}</div>
                  <div style={{ fontSize:11, color:"#9ca3af" }}>{t.subject} · {t.batch || "No batch"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"16px", color:"#9ca3af", fontSize:12 }}>
            No teachers assigned yet.
          </div>
        )}
      </div>

      {/* Children & Classes */}
      <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10,
        padding:"12px 14px", fontSize:12, color:"#0369a1" }}>
        👶 This center has <b>{center.children}</b> children enrolled across <b>{center.classes}</b> classes.
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MAIN CENTER MANAGEMENT TAB
══════════════════════════════════════════ */
export default function CenterManagementTab({ teachers = MOCK_TEACHERS_LIST, setToast }) {
  const [centers, setCenters] = useState(MOCK_CENTERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [editCenter, setEditCenter] = useState(null);
  const [detailCenter, setDetailCenter] = useState(null);
  const [toast, setLocalToast] = useState({ msg:"", type:"" });

  const showToast = setToast || setLocalToast;

  const filtered = centers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = (saved) => {
    if (editCenter) {
      setCenters(prev => prev.map(c => c.id === saved.id ? saved : c));
    } else {
      setCenters(prev => [...prev, saved]);
    }
    setFormModal(false);
    setEditCenter(null);
  };

  const handleDelete = (id) => {
    setCenters(prev => prev.map(c => c.id === id ? { ...c, status:"inactive" } : c));
    showToast({ msg:"Center deactivated.", type:"error" });
  };

  const openEdit = (center) => {
    setEditCenter(center);
    setFormModal(true);
  };

  const openAdd = () => {
    setEditCenter(null);
    setFormModal(true);
  };

  const active   = centers.filter(c => c.status === "active").length;
  const inactive = centers.filter(c => c.status === "inactive").length;
  const totalChildren  = centers.reduce((a,c) => a + c.children, 0);
  const totalTeachers  = centers.reduce((a,c) => a + c.teachers.length, 0);

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setLocalToast({msg:"",type:""})}/>}

      {/* Modals */}
      {formModal && (
        <CenterFormModal
          center={editCenter}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditCenter(null); }}
          setToast={showToast}
        />
      )}
      {detailCenter && (
        <CenterDetailModal
          center={detailCenter}
          teachers={teachers}
          onClose={() => setDetailCenter(null)}
        />
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={S.pageTitle}>Center Management</h1>
          <p style={S.pageSub}>{active} active · {inactive} inactive · {centers.length} total centers</p>
        </div>
        <button onClick={openAdd} style={S.primaryBtn}>+ Add Center</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14, marginBottom:20 }}>
        <StatCard icon="🏫" label="Total Centers"   val={centers.length} color="#f59e0b" bg="#fef3c7"/>
        <StatCard icon="✅" label="Active"           val={active}         color="#10b981" bg="#d1fae5"/>
        <StatCard icon="🔕" label="Inactive"         val={inactive}       color="#6b7280" bg="#f3f4f6"/>
        <StatCard icon="👩‍🏫" label="Total Teachers"  val={totalTeachers}  color="#3b82f6" bg="#dbeafe"/>
        <StatCard icon="👶" label="Total Children"   val={totalChildren}  color="#8b5cf6" bg="#ede9fe"/>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:1, minWidth:200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, city, or contact person..."/>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {["all","active","inactive"].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{ padding:"8px 14px", borderRadius:8,
                border:`1.5px solid ${statusFilter===f?"#f59e0b":"#e5e7eb"}`,
                background:statusFilter===f?"#fef3c7":"white",
                color:statusFilter===f?"#92400e":"#6b7280",
                fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
              {f === "all" ? "All Centers" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Centers Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
        {filtered.map((c,i) => (
          <div key={c.id} style={{ background:"white", borderRadius:18, padding:"20px",
            border:"1px solid #f1f5f9", boxShadow:"0 2px 10px rgba(0,0,0,0.05)",
            borderTop:`3px solid ${c.status==="active"?"#f59e0b":"#e5e7eb"}` }}>

            {/* Card Header */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
              <div style={{ width:48, height:48, borderRadius:14,
                background:"linear-gradient(135deg,#fef3c7,#fbbf24)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22, flexShrink:0 }}>🏫</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#1c1917", marginBottom:4 }}>{c.name}</div>
                <div style={{ fontSize:11, color:"#9ca3af" }}>📍 {c.city} · {c.pincode}</div>
              </div>
              <StatusBadge status={c.status}/>
            </div>

            {/* Details */}
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14,
              padding:"12px", background:"#f9fafb", borderRadius:10, border:"1px solid #f3f4f6" }}>
              <div style={{ fontSize:12, color:"#6b7280" }}>📱 {c.phone}</div>
              {c.email && <div style={{ fontSize:12, color:"#6b7280" }}>📧 {c.email}</div>}
              {c.contactPerson && <div style={{ fontSize:12, color:"#6b7280" }}>👤 {c.contactPerson}</div>}
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>📍 {c.location}</div>
            </div>

            {/* Stats Row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                { icon:"👩‍🏫", label:"Teachers", val:c.teachers.length, color:"#f59e0b", bg:"#fef3c7" },
                { icon:"👶",  label:"Children", val:c.children,         color:"#3b82f6", bg:"#dbeafe" },
                { icon:"🏛️",  label:"Classes",  val:c.classes,          color:"#10b981", bg:"#d1fae5" },
              ].map((s,j) => (
                <div key={j} style={{ background:s.bg, borderRadius:8, padding:"8px",
                  textAlign:"center", border:`1px solid ${s.color}30` }}>
                  <div style={{ fontSize:14 }}>{s.icon}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#1c1917" }}>{s.val}</div>
                  <div style={{ fontSize:9, color:s.color, fontWeight:700 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:6, paddingTop:12, borderTop:"1px solid #f3f4f6" }}>
              <button onClick={() => setDetailCenter(c)}
                style={{ ...S.tblBtn, flex:1, color:"#4f46e5", borderColor:"#c4b5fd" }}>
                👁 View
              </button>
              <button onClick={() => openEdit(c)} style={{ ...S.tblBtn, flex:1 }}>
                ✏️ Edit
              </button>
              <button onClick={() => handleDelete(c.id)}
                style={{ ...S.tblBtn, color:"#dc2626", borderColor:"#fca5a5" }}>
                🔕
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"#9ca3af" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏫</div>
          <div style={{ fontSize:14, fontWeight:700 }}>No centers found</div>
          <div style={{ fontSize:12, marginTop:4 }}>Try adjusting filters or add a new center</div>
        </div>
      )}
    </div>
  );
}