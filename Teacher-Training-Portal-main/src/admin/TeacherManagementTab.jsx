import { useState } from "react";
import { AttendanceBar, Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
import { MOCK_CATEGORIES } from "../data/mockData";
/* ── A2: Teacher Management ── */

/* ── Helper: CSV Export ── */
 function exportCSV(data, filename = "teachers.csv") {
  const headers = ["Name", "Email", "Phone", "Subject", "Course", "Batch", "Status", "Qualification", "Experience", "Joined", "Attendance"];
  const rows = data.map(t => [
    t.name, t.email, t.phone, t.subject, t.course || "—", t.batch || "—",
    t.status, t.qualification || "—", t.experience || "—", t.joined, t.attendance + "%"
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Reject Modal ── */
function RejectModal({ teacher, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const reasons = ["Incomplete documents", "Invalid qualification", "Duplicate account", "Suspicious activity", "Other"];
  return (
    <Modal title={`✕ Reject — ${teacher.name}`} onClose={onClose}>
      <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:12, color:"#991b1b" }}>
        ⚠️ Teacher will be notified via email with the rejection reason.
      </div>
      <label style={S.label}>Reason *</label>
      <select style={{ ...S.input, marginBottom:20 }} value={reason} onChange={e=>setReason(e.target.value)}>
        <option value="">Select a reason...</option>
        {reasons.map(r=><option key={r}>{r}</option>)}
      </select>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={()=>{ if(!reason) return; onConfirm(reason); }} style={{ ...S.btnRed, flex:1, padding:"10px", fontSize:13 }}>✕ Reject & Notify</button>
        <button onClick={onClose} style={{ ...S.tblBtn, flex:1, padding:"10px", fontSize:13 }}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ── Block Modal ── */
function BlockModal({ teacher, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const reasons = ["Policy violation", "Misconduct", "Fraudulent activity", "Repeated absence", "Other"];
  return (
    <Modal title={`🚫 Block — ${teacher.name}`} onClose={onClose}>
      <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:12, color:"#991b1b" }}>
        ⚠️ Blocking suspends access. Teacher can be unblocked later.
      </div>
      <label style={S.label}>Reason *</label>
      <select style={{ ...S.input, marginBottom:20 }} value={reason} onChange={e=>setReason(e.target.value)}>
        <option value="">Select a reason...</option>
        {reasons.map(r=><option key={r}>{r}</option>)}
      </select>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={()=>{ if(!reason) return; onConfirm(reason); }} style={{ ...S.btnRed, flex:1, padding:"10px", fontSize:13 }}>🚫 Block Access</button>
        <button onClick={onClose} style={{ ...S.tblBtn, flex:1, padding:"10px", fontSize:13 }}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ── Direct Message Modal ── */
function DirectMessageModal({ teacher, onClose, setToast }) {
  const [msg, setMsg] = useState("");
  const [channel, setChannel] = useState("in-app");
  const send = () => {
    if (!msg.trim()) { setToast({ msg:"Message cannot be empty.", type:"error" }); return; }
    setToast({ msg:`Message sent to ${teacher.name} via ${channel}!`, type:"success" });
    onClose();
  };
  return (
    <Modal title={`💬 Message — ${teacher.name}`} onClose={onClose}>
      <div style={{ marginBottom:12 }}>
        <label style={S.label}>Channel</label>
        <div style={{ display:"flex", gap:8 }}>
          {["in-app","email","sms"].map(c=>(
            <button key={c} onClick={()=>setChannel(c)}
              style={{ flex:1, padding:"8px", borderRadius:8, border:`1.5px solid ${channel===c?"#f59e0b":"#e5e7eb"}`, background:channel===c?"#fef3c7":"white", color:channel===c?"#92400e":"#6b7280", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {c==="in-app"?"📱 In-App":c==="email"?"📧 Email":"💬 SMS"}
            </button>
          ))}
        </div>
      </div>
      <label style={S.label}>To</label>
      <input style={{ ...S.input, marginBottom:12, background:"#f3f4f6", color:"#6b7280" }} value={`${teacher.name} (${teacher.email})`} readOnly/>
      <label style={S.label}>Message *</label>
      <textarea style={{ ...S.input, height:120, resize:"none", marginBottom:20 }} value={msg} onChange={e=>setMsg(e.target.value)} placeholder={`Write a message to ${teacher.name.split(" ")[0]}...`}/>
      <button onClick={send} style={{ ...S.primaryBtn, width:"100%" }}>📤 Send Message</button>
    </Modal>
  );
}

/* ── Edit Courses Modal ── */
function EditCoursesModal({ teacher, onSave, onClose }) {
  const ALL_COURSES = [
    "Pre-Primary Teacher Training (PPT)",
    "Montessori Teacher Training",
    "Child Psychology & Development",
    "NEP 2020 Alignment & FLN",
    "Curriculum Design & Lesson Planning",
    "Leadership & School Administration",
    "Special Education & Inclusive Ed",
    "Digital Literacy for Modern Teachers",
  ];
  const [selected, setSelected] = useState(teacher.course ? [teacher.course] : []);
  const toggle = c => setSelected(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c]);
  return (
    <Modal title={`📚 Edit Courses — ${teacher.name}`} onClose={onClose}>
      <div style={{ fontSize:12, color:"#6b7280", marginBottom:14 }}>Select courses to assign or remove.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
        {ALL_COURSES.map(c=>(
          <div key={c} onClick={()=>toggle(c)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, cursor:"pointer", border:`1.5px solid ${selected.includes(c)?"#f59e0b":"#e5e7eb"}`, background:selected.includes(c)?"#fef3c7":"#f9fafb" }}>
            <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${selected.includes(c)?"#f59e0b":"#d1d5db"}`, background:selected.includes(c)?"#f59e0b":"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"white", flexShrink:0 }}>
              {selected.includes(c)?"✓":""}
            </div>
            <span style={{ fontSize:13, fontWeight:selected.includes(c)?700:500, color:selected.includes(c)?"#92400e":"#374151" }}>{c}</span>
          </div>
        ))}
      </div>
      <button onClick={()=>onSave(selected)} style={{ ...S.primaryBtn, width:"100%" }}>
        Save Assignments ({selected.length} selected)
      </button>
    </Modal>
  );
}

/* ── Progress Report Modal ── */
function ProgressReportModal({ teacher, onClose }) {
  const modules = [
    { name:"Module 1 – Foundations",       done:true,  score:88, sessions:4 },
    { name:"Module 2 – Classroom Methods", done:true,  score:76, sessions:3 },
    { name:"Module 3 – Assessment",        done:false, score:null, sessions:1 },
    { name:"Module 4 – Practicum",         done:false, score:null, sessions:0 },
  ];
  const completed = modules.filter(m=>m.done).length;
  const avgScore = Math.round(modules.filter(m=>m.score).reduce((a,m)=>a+m.score,0)/completed);
  return (
    <Modal title={`📊 Progress Report — ${teacher.name}`} onClose={onClose}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
        {[
          { icon:"📚", label:"Modules Done", val:`${completed}/${modules.length}` },
          { icon:"📊", label:"Attendance",   val:`${teacher.attendance}%` },
          { icon:"🎯", label:"Avg Score",    val:`${avgScore}%` },
        ].map((s,i)=>(
          <div key={i} style={{ background:"#f9fafb", borderRadius:10, padding:"10px 12px", textAlign:"center", border:"1px solid #f1f5f9" }}>
            <div style={{ fontSize:18 }}>{s.icon}</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#1c1917" }}>{s.val}</div>
            <div style={{ fontSize:10, color:"#9ca3af" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:10 }}>Module Breakdown</div>
      {modules.map((m,i)=>(
        <div key={i} style={{ marginBottom:10, padding:"10px 14px", background:m.done?"#ecfdf5":"#f9fafb", borderRadius:10, border:`1px solid ${m.done?"#86efac":"#f1f5f9"}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:m.done?6:0 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{m.name}</span>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {m.score && <span style={{ fontSize:12, fontWeight:700, color:"#10b981" }}>{m.score}%</span>}
              <span style={{ fontSize:10, color:"#9ca3af" }}>{m.sessions} sessions</span>
              <span>{m.done?"✅":"⏳"}</span>
            </div>
          </div>
          {m.done && (
            <div style={{ height:5, background:"#d1fae5", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${m.score}%`, background:"#10b981", borderRadius:4 }}/>
            </div>
          )}
        </div>
      ))}
      <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginTop:8, marginBottom:6 }}>Attendance</div>
      <AttendanceBar val={teacher.attendance} name={teacher.name}/>
    </Modal>
  );
}

/* ── Issue Certificate Modal ── */
function IssueCertificateModal({ teacher, onClose, setToast }) {
  const [template, setTemplate] = useState("Gold Standard");
  const [course, setCourse] = useState(teacher.course||"");
  const templates = ["Gold Standard","Modern Blue","Classic"];
  const issue = () => {
    if(!course){ setToast({ msg:"Select a course first.", type:"error" }); return; }
    setToast({ msg:`Certificate issued to ${teacher.name}!`, type:"success" });
    onClose();
  };
  return (
    <Modal title={`🏅 Issue Certificate — ${teacher.name}`} onClose={onClose}>
      <div style={{ background:"#fef3c7", border:"1px solid #fbbf24", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#92400e" }}>
        🛈 Manual override. Use for special cases only.
      </div>
      <label style={S.label}>Course *</label>
      <input style={{ ...S.input, marginBottom:12 }} value={course} onChange={e=>setCourse(e.target.value)} placeholder="Course name"/>
      <label style={S.label}>Template</label>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {templates.map(t=>(
          <button key={t} onClick={()=>setTemplate(t)}
            style={{ flex:1, padding:"8px", borderRadius:8, border:`1.5px solid ${template===t?"#f59e0b":"#e5e7eb"}`, background:template===t?"#fef3c7":"white", color:template===t?"#92400e":"#6b7280", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            {t}
          </button>
        ))}
      </div>
      <button onClick={issue} style={{ ...S.primaryBtn, width:"100%" }}>🏅 Issue Certificate</button>
    </Modal>
  );
}

/* ── Reset Password Modal ── */
function ResetPasswordModal({ teacher, onClose, setToast }) {
  const [sent, setSent] = useState(false);
  const sendReset = () => {
    setSent(true);
    setTimeout(()=>{ setToast({ msg:`OTP sent to ${teacher.email}!`, type:"success" }); onClose(); }, 1200);
  };
  return (
    <Modal title={`🔒 Reset Password — ${teacher.name}`} onClose={onClose}>
      <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:12, color:"#0369a1" }}>
        An OTP will be sent to the teacher's registered email and phone.
      </div>
      <div style={{ background:"#f9fafb", borderRadius:10, padding:"12px 14px", marginBottom:20 }}>
        <div style={{ fontSize:11, color:"#9ca3af" }}>Sending OTP to</div>
        <div style={{ fontSize:13, fontWeight:700, color:"#1c1917", marginTop:2 }}>📧 {teacher.email}</div>
        <div style={{ fontSize:13, fontWeight:700, color:"#1c1917", marginTop:4 }}>📱 {teacher.phone}</div>
      </div>
      <button onClick={sendReset} disabled={sent} style={{ ...S.primaryBtn, width:"100%", opacity:sent?0.7:1 }}>
        {sent?"⏳ Sending OTP...":"🔑 Send Password Reset OTP"}
      </button>
    </Modal>
  );
}

/* ── Bulk Notify Modal ── */
function BulkNotifyModal({ count, onClose, setToast }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const send = () => {
    if(!subject||!body){ setToast({ msg:"Fill subject and message.", type:"error" }); return; }
    setToast({ msg:`Notification sent to ${count} teachers!`, type:"success" });
    onClose();
  };
  return (
    <Modal title={`🔔 Bulk Notify (${count} teachers)`} onClose={onClose}>
      <label style={S.label}>Subject *</label>
      <input style={{ ...S.input, marginBottom:12 }} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Notification subject"/>
      <label style={S.label}>Message *</label>
      <textarea style={{ ...S.input, height:100, resize:"none", marginBottom:20 }} value={body} onChange={e=>setBody(e.target.value)} placeholder="Type your message..."/>
      <button onClick={send} style={{ ...S.primaryBtn, width:"100%" }}>📤 Send to All Selected</button>
    </Modal>
  );
}

/* ── Teacher Full Profile View ── */
function TeacherProfileView({ teacher, onBack, onUpdate, setToast }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [showReject,   setShowReject]   = useState(false);
  const [showBlock,    setShowBlock]    = useState(false);
  const [showMsg,      setShowMsg]      = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showCourses,  setShowCourses]  = useState(false);
  const [showCert,     setShowCert]     = useState(false);
  const [showReset,    setShowReset]    = useState(false);

  const isPending  = teacher.status === "pending";
  const isApproved = teacher.status === "approved";
  const isBlocked  = teacher.status === "rejected";

  const quickActions = [
    { icon:"📊", label:"Progress Report",   onClick:()=>setShowProgress(true), color:"#3b82f6", bg:"#dbeafe" },
    { icon:"💬", label:"Send Message",       onClick:()=>setShowMsg(true),      color:"#8b5cf6", bg:"#ede9fe" },
    { icon:"📚", label:"Edit Courses",       onClick:()=>setShowCourses(true),  color:"#f59e0b", bg:"#fef3c7" },
    { icon:"🏅", label:"Issue Certificate",  onClick:()=>setShowCert(true),     color:"#10b981", bg:"#d1fae5" },
    { icon:"🔒", label:"Reset Password",     onClick:()=>setShowReset(true),    color:"#6b7280", bg:"#f3f4f6" },
  ];

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>

      {/* Modals */}
      {showReject && (
        <RejectModal teacher={teacher} onClose={()=>setShowReject(false)}
          onConfirm={reason=>{ onUpdate({ ...teacher, status:"rejected", rejectReason:reason }); setShowReject(false); setToast({ msg:"Teacher rejected & notified.", type:"error" }); }}/>
      )}
      {showBlock && (
        <BlockModal teacher={teacher} onClose={()=>setShowBlock(false)}
          onConfirm={reason=>{ onUpdate({ ...teacher, status:"rejected", blockReason:reason }); setShowBlock(false); setToast({ msg:"Teacher blocked.", type:"error" }); }}/>
      )}
      {showMsg      && <DirectMessageModal   teacher={teacher} onClose={()=>setShowMsg(false)}      setToast={setToast}/>}
      {showProgress && <ProgressReportModal  teacher={teacher} onClose={()=>setShowProgress(false)}/>}
      {showCert     && <IssueCertificateModal teacher={teacher} onClose={()=>setShowCert(false)}    setToast={setToast}/>}
      {showReset    && <ResetPasswordModal   teacher={teacher} onClose={()=>setShowReset(false)}    setToast={setToast}/>}
      {showCourses  && (
        <EditCoursesModal teacher={teacher} onClose={()=>setShowCourses(false)}
          onSave={selected=>{ onUpdate({ ...teacher, course:selected[0]||"" }); setToast({ msg:"Courses updated!", type:"success" }); setShowCourses(false); }}/>
      )}

      <button onClick={onBack} style={S.backBtn}>← Back to Teachers</button>

      {/* Profile Header */}
      <div style={{ background:"white", borderRadius:20, padding:"28px", border:"1px solid #f1f5f9", boxShadow:"0 4px 20px rgba(0,0,0,0.06)", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:20, marginBottom:24, paddingBottom:20, borderBottom:"1px solid #f3f4f6" }}>
          <div style={{ width:80, height:80, borderRadius:20, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, fontWeight:800, color:"white", flexShrink:0 }}>
            {teacher.name[0]}
          </div>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:22, fontWeight:900, color:"#1c1917", margin:"0 0 6px", letterSpacing:"-0.5px" }}>{teacher.name}</h2>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
              <StatusBadge status={teacher.status}/>
              <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:"#d97706", background:"#fef3c7" }}>{teacher.subject}</span>
              {teacher.batch && <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:"#7c3aed", background:"#ede9fe" }}>{teacher.batch}</span>}
              <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:"#0369a1", background:"#e0f2fe" }}>{teacher.experience||"—"}</span>
            </div>
            <div style={{ fontSize:13, color:"#6b7280" }}>📧 {teacher.email} &nbsp;|&nbsp; 📱 {teacher.phone} &nbsp;|&nbsp; 📍 {teacher.address||"—"}</div>
          </div>
          {/* Status action buttons */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
            {isPending && <>
              <button onClick={()=>{ onUpdate({ ...teacher, status:"approved" }); setToast({ msg:"Teacher approved!", type:"success" }); }} style={S.btnGreen}>✓ Approve</button>
              <button onClick={()=>setShowReject(true)} style={S.btnRed}>✕ Reject</button>
            </>}
            {isApproved && <button onClick={()=>setShowBlock(true)} style={S.btnOrange}>🚫 Block</button>}
            {isBlocked  && <button onClick={()=>{ onUpdate({ ...teacher, status:"approved" }); setToast({ msg:"Teacher unblocked!", type:"success" }); }} style={S.btnGreen}>🔓 Unblock</button>}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
          {quickActions.map((a,i)=>(
            <button key={i} onClick={a.onClick}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"12px 8px", border:`1px solid ${a.color}30`, borderRadius:12, background:a.bg, cursor:"pointer", fontFamily:"inherit" }}>
              <span style={{ fontSize:20 }}>{a.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:a.color, textAlign:"center", lineHeight:1.2 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["overview","documents","activity"].map(tab=>(
          <button key={tab} onClick={()=>setActiveSection(tab)}
            style={{ padding:"8px 18px", borderRadius:8, border:`1.5px solid ${activeSection===tab?"#f59e0b":"#e5e7eb"}`, background:activeSection===tab?"#fef3c7":"white", color:activeSection===tab?"#92400e":"#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {tab==="overview"?"📋 Overview":tab==="documents"?"📄 Documents":"🕓 Activity Log"}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection==="overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <SectionCard title="👤 Registration Details">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { icon:"🎓", label:"Qualification", val:teacher.qualification||"—" },
                { icon:"🏢", label:"Assigned Center", val:teacher.assignedCenter || "Not Assigned"},
                { icon:"💼", label:"Experience",    val:teacher.experience||"—"    },
                { icon:"📅", label:"Joined",        val:teacher.joined              },
                { icon:"📍", label:"Address",       val:teacher.address||"—"       },
                { icon:"📚", label:"Course",        val:teacher.course||"—"        },
                { icon:"🗂️", label:"Batch",         val:teacher.batch||"—"         },
                { icon:"👥", label:"Students",      val:teacher.students            },
                { icon:"🎓", label:"Classes",       val:teacher.classes             },
              ].map((r,i)=>(
                <div key={i} style={{ background:"#f9fafb", borderRadius:10, padding:"10px 14px", border:"1px solid #f3f4f6" }}>
                  <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>{r.label}</div>
                  <div style={{ fontSize:13, color:"#374151", fontWeight:600 }}>{r.icon} {r.val}</div>
                </div>
              ))}
            </div>
            {teacher.rejectReason && <div style={{ marginTop:12, background:"#fee2e2", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#991b1b" }}>✕ Rejected: {teacher.rejectReason}</div>}
            {teacher.blockReason  && <div style={{ marginTop:12, background:"#fef3c7", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#92400e"  }}>🚫 Blocked: {teacher.blockReason}</div>}
          </SectionCard>

          <SectionCard title="📊 Attendance & Performance">
            {teacher.status==="approved" ? (
              <>
                <AttendanceBar val={teacher.attendance} name="Overall Attendance"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14 }}>
                  <div style={{ background:"#d1fae5", borderRadius:10, padding:"12px", textAlign:"center", border:"1px solid #86efac" }}>
                    <div style={{ fontSize:16 }}>💰</div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#1c1917" }}>₹{(teacher.revenue/1000).toFixed(1)}k</div>
                    <div style={{ fontSize:10, color:"#6b7280" }}>Revenue Generated</div>
                  </div>
                  <div style={{ background:"#dbeafe", borderRadius:10, padding:"12px", textAlign:"center", border:"1px solid #93c5fd" }}>
                    <div style={{ fontSize:16 }}>📹</div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#1c1917" }}>{teacher.classes*3}</div>
                    <div style={{ fontSize:10, color:"#6b7280" }}>Sessions Attended</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"30px", color:"#9ca3af" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>⏳</div>
                <div style={{ fontSize:12 }}>Stats available after approval</div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Documents */}
      {activeSection==="documents" && (
        <SectionCard title="📄 Uploaded Documents">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {[
              { name:"Degree Certificate",     status:"verified", icon:"🎓" },
              { name:"B.Ed / D.El.Ed",         status:"verified", icon:"📜" },
              { name:"Identity Proof (Aadhar)",status:"pending",  icon:"🪪" },
              { name:"Address Proof",           status:"verified", icon:"🏠" },
              { name:"Passport Photo",          status:"verified", icon:"📷" },
              { name:"Experience Letter",       status:teacher.experience==="Fresher"?"draft":"pending", icon:"💼" },
            ].map((doc,i)=>(
              <div key={i} style={{ background:"#f9fafb", borderRadius:12, padding:"14px", border:"1px solid #f1f5f9", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{doc.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1c1917", marginBottom:6 }}>{doc.name}</div>
                <StatusBadge status={doc.status}/>
                {doc.status!=="draft" && <div style={{ marginTop:8 }}><button style={S.tblBtn}>View</button></div>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Activity Log */}
      {activeSection==="activity" && (
        <SectionCard title="🕓 Activity Log">
          {[
            { action:"Registered on platform",                        time:teacher.joined, icon:"👤", type:"info"    },
            { action:"Profile reviewed by admin",                     time:"—",            icon:"✅", type:"success"  },
            { action:`Enrolled in ${teacher.course||"course"}`,       time:"—",            icon:"📚", type:"info"    },
            { action:"Attended live session",                         time:"—",            icon:"📹", type:"info"    },
            { action:"Assignment submitted",                          time:"—",            icon:"📝", type:"info"    },
          ].map((a,i)=>(
            <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:"1px solid #f3f4f6" }}>
              <div style={{ width:32, height:32, borderRadius:8, background:a.type==="success"?"#d1fae5":"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{a.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1c1917" }}>{a.action}</div>
                <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}

/* ── Main TeacherManagementTab ── */
export default function TeacherManagementTab({ teachers, setTeachers, setToast }) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batchFilter,  setBatchFilter]  = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [selected,     setSelected]     = useState(null);
  const [addModal,     setAddModal]     = useState(false);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [bulkModal,    setBulkModal]    = useState(false);
  const [newT, setNewT] = useState({
  name:"",
  email:"",
  phone:"",
  subject:"",
  address:"",
  qualification:"Graduate",
  experience:"Fresher",
  course:"",
  assignedCenter:"",
  password:""
});

  const allBatches = ["all", ...new Set(teachers.filter(t=>t.batch).map(t=>t.batch))];
  const allCourses = ["all", ...new Set(teachers.filter(t=>t.course).map(t=>t.course))];

  const filtered = teachers.filter(t => {
    const q = search.toLowerCase();
    const matchSearch  = t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.phone.includes(q) || (t.subject||"").toLowerCase().includes(q);
    const matchStatus  = statusFilter==="all" || t.status===statusFilter;
    const matchBatch   = batchFilter==="all"  || t.batch===batchFilter;
    const matchCourse  = courseFilter==="all" || t.course===courseFilter;
    return matchSearch && matchStatus && matchBatch && matchCourse;
  });

  const approve      = id => { setTeachers(p=>p.map(t=>t.id===id?{ ...t, status:"approved" }:t)); setToast({ msg:"Teacher approved!", type:"success" }); };
  const updateTeacher= updated => setTeachers(p=>p.map(t=>t.id===updated.id?updated:t));
  const toggleAll    = () => setSelectedIds(selectedIds.length===filtered.length?[]:filtered.map(t=>t.id));
  const toggleOne    = id => setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const bulkApprove  = () => { setTeachers(p=>p.map(t=>selectedIds.includes(t.id)?{ ...t, status:"approved" }:t)); setToast({ msg:`${selectedIds.length} teachers approved!`, type:"success" }); setSelectedIds([]); };

  const handleAdd = e => {
    e.preventDefault();
    if(!newT.name||!newT.email||!newT.phone||!newT.subject||!newT.password){ setToast({ msg:"Fill all required fields.", type:"error" }); return; }
    const t = { id:Date.now(), ...newT, status:"approved", joined:new Date().toLocaleDateString("en-IN"), attendance:0, classes:0, students:0, batch:"", revenue:0 };
    setTeachers(prev=>[...prev,t]);
    setToast({ msg:"Teacher added successfully!", type:"success" });
    setAddModal(false);
    setNewT({ name:"",email:"",phone:"",subject:"",address:"",qualification:"Graduate",experience:"Fresher",course:"",assignedCenter:"",password:"" });
  };

  if (selected) return (
    <TeacherProfileView
      teacher={selected}
      onBack={()=>setSelected(null)}
      setToast={setToast}
      onUpdate={updated=>{ updateTeacher(updated); setSelected(updated); }}
    />
  );

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      {bulkModal && <BulkNotifyModal count={selectedIds.length} onClose={()=>setBulkModal(false)} setToast={setToast}/>}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={S.pageTitle}>Teacher Management</h1>
          <p style={S.pageSub}>{teachers.length} total &nbsp;·&nbsp; {teachers.filter(t=>t.status==="approved").length} active &nbsp;·&nbsp; {teachers.filter(t=>t.status==="pending").length} pending</p>
        </div>
        <button onClick={()=>setAddModal(true)} style={S.primaryBtn}>+ Add Teacher</button>
      </div>

      {/* Filters */}
      <div style={{ background:"white", borderRadius:16, padding:"16px 20px", border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", marginBottom:16 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
          <div style={{ flex:1, minWidth:200 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search name, email, mobile, subject..."/>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["all","approved","pending","rejected"].map(f=>(
              <button key={f} onClick={()=>setStatusFilter(f)}
                style={{ padding:"8px 14px", borderRadius:8, border:`1.5px solid ${statusFilter===f?"#f59e0b":"#e5e7eb"}`, background:statusFilter===f?"#fef3c7":"white", color:statusFilter===f?"#92400e":"#6b7280", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                {f==="all"?"All":f==="approved"?"✅ Active":f==="pending"?"⏳ Pending":"🚫 Blocked"}
                {f==="pending"&&teachers.filter(t=>t.status==="pending").length>0?` (${teachers.filter(t=>t.status==="pending").length})`:""}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:600, color:"#6b7280" }}>Batch:</span>
            <select value={batchFilter} onChange={e=>setBatchFilter(e.target.value)} style={{ ...S.input, width:150, marginBottom:0 }}>
              {allBatches.map(b=><option key={b} value={b}>{b==="all"?"All Batches":b}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:600, color:"#6b7280" }}>Course:</span>
            <select value={courseFilter} onChange={e=>setCourseFilter(e.target.value)} style={{ ...S.input, width:210, marginBottom:0 }}>
              {allCourses.map(c=><option key={c} value={c}>{c==="all"?"All Courses":c.substring(0,28)}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:600, color:"#6b7280" }}>From:</span>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ ...S.input, width:140, marginBottom:0 }}/>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:600, color:"#6b7280" }}>To:</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ ...S.input, width:140, marginBottom:0 }}/>
          </div>
          {(statusFilter!=="all"||batchFilter!=="all"||courseFilter!=="all"||search||dateFrom||dateTo) && (
            <button onClick={()=>{ setSearch(""); setStatusFilter("all"); setBatchFilter("all"); setCourseFilter("all"); setDateFrom(""); setDateTo(""); }}
              style={{ ...S.tblBtn, color:"#ef4444", borderColor:"#fca5a5" }}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length>0 && (
        <div style={{ background:"#fef3c7", border:"1px solid #fbbf24", borderRadius:12, padding:"12px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#92400e" }}>{selectedIds.length} teacher{selectedIds.length>1?"s":""} selected</span>
          <button onClick={bulkApprove} style={S.btnGreen}>✓ Bulk Approve</button>
          <button onClick={()=>setBulkModal(true)} style={{ ...S.tblBtn, color:"#3b82f6", borderColor:"#93c5fd" }}>🔔 Notify</button>
          <button onClick={()=>exportCSV(teachers.filter(t=>selectedIds.includes(t.id)),"selected_teachers.csv")} style={S.exportBtn}>⬇ Export CSV</button>
          <button onClick={()=>setSelectedIds([])} style={S.tblBtn}>✕ Deselect</button>
        </div>
      )}

      {/* Export row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:12, color:"#9ca3af" }}>Showing {filtered.length} of {teachers.length} teachers</span>
        <button onClick={()=>exportCSV(filtered,"teachers_export.csv")} style={S.exportBtn}>⬇ Export CSV</button>
      </div>

      {/* Table */}
<div style={{ background:"white", borderRadius:16, border:"1px solid #f1f5f9", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead>
      <tr style={{ background:"#f9fafb", borderBottom:"1px solid #f1f5f9" }}>
        <th style={{ padding:"12px 14px", width:40 }}>
          <input type="checkbox" checked={selectedIds.length===filtered.length&&filtered.length>0} onChange={toggleAll} style={{ cursor:"pointer" }}/>
        </th>
        {["Teacher","Mobile","Center","Course","Batch","Attendance","Registered","Status","Actions"].map(h=>(
          <th key={h} style={{ padding:"12px 14px", fontSize:11, fontWeight:700, color:"#9ca3af", textAlign:"left", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {filtered.map((t,i)=>(
        <tr key={t.id} style={{ borderBottom:"1px solid #f9fafb", background:selectedIds.includes(t.id)?"#fffbeb":i%2===0?"white":"#fafafa" }}>
          <td style={{ padding:"12px 14px" }}>
            <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={()=>toggleOne(t.id)} style={{ cursor:"pointer" }}/>
          </td>
          <td style={{ padding:"12px 14px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {/* 📸 Teacher Photo / Initial Avatar Fallback */}
              <img 
                src={t.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}`} 
                alt={t.name}
                style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: "50%", 
                  objectFit: "cover", 
                  border: "1.5px solid #e2e8f0",
                  background: "#f1f5f9",
                  flexShrink: 0 
                }} 
                onError={(e) => {
                  e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}`;
                }}
              />
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{t.name}</div>
                <div style={{ fontSize:11, color:"#9ca3af" }}>{t.email}</div>
              </div>
            </div>
          </td>
          <td style={{ padding:"12px 14px", fontSize:12, color:"#374151" }}>{t.phone}</td>
          <td style={{ padding:"12px 14px", fontSize:12, color:"#374151" }}>{t.assignedCenter || "—"}</td>
          <td style={{ padding:"12px 14px", fontSize:12, color:"#374151", maxWidth:160 }}>
            <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.course||<span style={{ color:"#d1d5db" }}>—</span>}</span>
          </td>
          <td style={{ padding:"12px 14px", fontSize:12, color:"#374151" }}>{t.batch||<span style={{ color:"#d1d5db" }}>—</span>}</td>
          <td style={{ padding:"12px 14px" }}>
            {t.status==="approved"?(
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:52, height:5, background:"#f3f4f6", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${t.attendance}%`, background:t.attendance>=85?"#10b981":t.attendance>=70?"#f59e0b":"#ef4444" }}/>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:t.attendance>=85?"#10b981":t.attendance>=70?"#f59e0b":"#ef4444" }}>{t.attendance}%</span>
              </div>
            ):<span style={{ fontSize:11, color:"#d1d5db" }}>—</span>}
          </td>
          <td style={{ padding:"12px 14px", fontSize:12, color:"#9ca3af" }}>{t.joined}</td>
          <td style={{ padding:"12px 14px" }}>
            <StatusBadge status={t.status}/>
            {t.blockReason && <div style={{ fontSize:9, color:"#dc2626", marginTop:2 }}>🚫 Blocked</div>}
            {t.rejectReason && !t.blockReason && <div style={{ fontSize:9, color:"#9ca3af", marginTop:2 }}>✕ Rejected</div>}
          </td>
          <td style={{ padding:"12px 14px" }}>
            <div style={{ display:"flex", gap:5 }}>
              <button onClick={()=>setSelected(t)} style={{ ...S.tblBtn, color:"#3b82f6", borderColor:"#93c5fd" }}>👁 View</button>
              {t.status==="pending" && <>
                <button onClick={()=>approve(t.id)} style={{ ...S.tblBtn, color:"#059669", borderColor:"#86efac" }}>✓</button>
                <button onClick={()=>setSelected(t)} style={{ ...S.tblBtn, color:"#dc2626", borderColor:"#fca5a5" }}>✕</button>
              </>}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  {filtered.length===0 && (
    <div style={{ textAlign:"center", padding:"50px", color:"#9ca3af" }}>
      <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
      <div style={{ fontSize:14, fontWeight:700 }}>No teachers found</div>
      <div style={{ fontSize:12, marginTop:4 }}>Try adjusting your filters</div>
    </div>
  )}
</div>  
  {/* Add Teacher Modal */}
      {addModal && (
        <Modal title="Add New Teacher" onClose={()=>setAddModal(false)}>
          <form onSubmit={handleAdd}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
              {[
                { key:"name",    label:"Full Name *", icon:"👤", ph:"Dr. Jane Smith"       },
                { key:"subject", label:"Subject *",   icon:"📘", ph:"Mathematics"          },
                { key:"email",   label:"Email *",     icon:"📧", ph:"teacher@school.edu", type:"email" },
                { key:"phone",   label:"Phone *",     icon:"📱", ph:"+91 98765 43210"       },
                { key:"course",  label:"Course",      icon:"📚", ph:"Pre-Primary Training" },
                { key:"address", label:"Address",     icon:"📍", ph:"City"                 },
              ].map(f=>(
                <div key={f.key}>
                  <label style={S.label}>{f.label}</label>
                  <div style={{ position:"relative" }}>
                    <span style={S.fieldIcon}>{f.icon}</span>
                    <input style={{ ...S.input, paddingLeft:32 }} type={f.type||"text"} value={newT[f.key]} onChange={e=>setNewT({ ...newT, [f.key]:e.target.value })} placeholder={f.ph}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
              <div>
                <label style={S.label}>Qualification</label>
                <select style={S.input} value={newT.qualification} onChange={e=>setNewT({ ...newT, qualification:e.target.value })}>
                  {["12th","Graduate","Post-Graduate","B.Ed","D.El.Ed","Other"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Experience</label>
                <select style={S.input} value={newT.experience} onChange={e=>setNewT({ ...newT, experience:e.target.value })}>
                  {["Fresher","1-2 yrs","3-5 yrs","5-10 yrs","10+ yrs"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
                 <label style={S.label}>Assigned Center</label>
                 <select style={S.input} value={newT.assignedCenter} onChange={(e)=> setNewT({...newT,assignedCenter:e.target.value})}>
                    <option value="">Select Center</option>
                    <option>Pune Center</option>
                    <option>Mumbai Center</option>
                    <option>Nashik Center</option>
                    <option>Nagpur Center</option>
                 </select>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={S.label}>Password *</label>
              <div style={{ position:"relative" }}>
                <span style={S.fieldIcon}>🔒</span>
                <input style={{ ...S.input, paddingLeft:32 }} type="password" value={newT.password} onChange={e=>setNewT({ ...newT, password:e.target.value })} placeholder="Set a password"/>
              </div>
            </div>
            <button type="submit" style={{ ...S.primaryBtn, width:"100%", marginTop:20 }}>Add Teacher →</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
