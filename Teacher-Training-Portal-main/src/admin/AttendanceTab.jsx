import { useState } from "react";
import { Modal, S, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
import { MOCK_ATTENDANCE_RECORDS } from "../data/mockData";
function AuditLogEntry({ entry }) {
  return (
    <div style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:"1px solid #f3f4f6", alignItems:"flex-start" }}>
      <div style={{ width:28, height:28, borderRadius:8, background:"#f0f9ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>📝</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, color:"#1c1917", fontWeight:600 }}>{entry.action}</div>
        <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>{entry.by} · {entry.time}</div>
      </div>
    </div>
  );
}

/* ── Status Badge for Attendance ── */
function AttStatusBadge({ status }) {
  const map = {
    present: { label:"Present", color:"#059669", bg:"#d1fae5" },
    late:    { label:"Late",    color:"#d97706", bg:"#fef3c7" },
    absent:  { label:"Absent",  color:"#dc2626", bg:"#fee2e2" },
    excused: { label:"Excused", color:"#6366f1", bg:"#ede9fe" },
  };
  const s = map[status] || { label:status, color:"#6b7280", bg:"#f3f4f6" };
  return (
    <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, color:s.color, background:s.bg, border:`1px solid ${s.color}30`, whiteSpace:"nowrap" }}>
      {s.label}
    </span>
  );
}

/* ── Manual Attendance Entry Modal ── */
function ManualAttendanceModal({ session, teachers, existingRecords, onSave, onClose, setToast }) {
  const batchTeachers = teachers.filter(t => t.batch === session.batch && t.status === "approved");
  const [entries, setEntries] = useState(
    batchTeachers.map(t => {
      const existing = existingRecords.find(r => r.teacherId === t.id && r.sessionId === session.id);
      return {
        teacherId:   t.id,
        teacherName: t.name,
        status:      existing?.status || "present",
        note:        existing?.note   || "",
      };
    })
  );

  const setStatus = (teacherId, status) =>
    setEntries(prev => prev.map(e => e.teacherId === teacherId ? { ...e, status } : e));

  const setNote = (teacherId, note) =>
    setEntries(prev => prev.map(e => e.teacherId === teacherId ? { ...e, note } : e));

  const handleSave = () => {
    const newRecords = entries.map(e => ({
      id:           Date.now() + e.teacherId,
      teacherId:    e.teacherId,
      teacherName:  e.teacherName,
      sessionId:    session.id,
      sessionTitle: session.title,
      batch:        session.batch,
      date:         session.date,
      status:       e.status,
      markedBy:     "admin",
      note:         e.note,
    }));
    onSave(newRecords, session.id);
    setToast({ msg:`Attendance saved for ${session.title}!`, type:"success" });
    onClose();
  };

  const statusColors = {
    present: { bg:"#d1fae5", color:"#059669", border:"#6ee7b7" },
    late:    { bg:"#fef3c7", color:"#d97706", border:"#fbbf24" },
    absent:  { bg:"#fee2e2", color:"#dc2626", border:"#fca5a5" },
    excused: { bg:"#ede9fe", color:"#6366f1", border:"#c4b5fd" },
  };

  return (
    <Modal title={`📋 Manual Attendance — ${session.title}`} onClose={onClose}>
      <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#0369a1" }}>
        📅 {session.date} · 🗂️ {session.batch} · 🕐 {session.time || "—"}
      </div>
      <div style={{ maxHeight:360, overflowY:"auto" }}>
        {batchTeachers.length === 0 ? (
          <div style={{ textAlign:"center", padding:20, color:"#9ca3af", fontSize:13 }}>No approved teachers in {session.batch}</div>
        ) : (
          entries.map(e => (
            <div key={e.teacherId} style={{ padding:"12px 0", borderBottom:"1px solid #f3f4f6" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white", flexShrink:0 }}>
                  {e.teacherName[0]}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1c1917", flex:1 }}>{e.teacherName}</div>
                <div style={{ display:"flex", gap:6 }}>
                  {["present","late","absent","excused"].map(s => (
                    <button key={s} onClick={() => setStatus(e.teacherId, s)}
                      style={{ padding:"4px 10px", borderRadius:8, border:`1.5px solid ${e.status===s?statusColors[s].border:"#e5e7eb"}`, background:e.status===s?statusColors[s].bg:"white", color:e.status===s?statusColors[s].color:"#9ca3af", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {(e.status === "late" || e.status === "excused" || e.status === "absent") && (
                <input
                  style={{ ...S.input, fontSize:11, padding:"6px 10px", marginLeft:42 }}
                  value={e.note}
                  onChange={ev => setNote(e.teacherId, ev.target.value)}
                  placeholder={e.status === "excused" ? "Reason for excuse..." : e.status === "late" ? "How late? Note..." : "Reason for absence..."}
                />
              )}
            </div>
          ))
        )}
      </div>
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={handleSave} style={{ ...S.primaryBtn, flex:1 }}>💾 Save Attendance</button>
        <button onClick={onClose}   style={{ ...S.tblBtn,    flex:1 }}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ── Edit Single Record Modal (Audit Log) ── */
function EditRecordModal({ record, onSave, onClose, setToast }) {
  const [status, setStatus] = useState(record.status);
  const [note,   setNote]   = useState(record.note || "");

  const handleSave = () => {
    onSave({ ...record, status, note, markedBy:"admin", editedAt:new Date().toLocaleString("en-IN") });
    setToast({ msg:"Attendance record updated!", type:"success" });
    onClose();
  };

  return (
    <Modal title={`✏️ Edit Attendance — ${record.teacherName}`} onClose={onClose}>
      <div style={{ background:"#f9fafb", borderRadius:10, padding:"12px 14px", marginBottom:14, fontSize:12, color:"#6b7280" }}>
        Session: <b>{record.sessionTitle}</b> · Date: <b>{record.date}</b>
      </div>
      <label style={S.label}>Status</label>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {["present","late","absent","excused"].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            style={{ flex:1, padding:"8px", borderRadius:8, border:`1.5px solid ${status===s?"#f59e0b":"#e5e7eb"}`, background:status===s?"#fef3c7":"white", color:status===s?"#92400e":"#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
            {s}
          </button>
        ))}
      </div>
      <label style={S.label}>Note / Reason</label>
      <textarea style={{ ...S.input, height:70, resize:"none", marginBottom:14 }} value={note} onChange={e=>setNote(e.target.value)} placeholder="Reason for change..."/>
      <div style={{ background:"#fef3c7", border:"1px solid #fbbf24", borderRadius:8, padding:"8px 12px", fontSize:11, color:"#92400e", marginBottom:16 }}>
        ⚠️ This edit will be logged in the audit trail with your admin credentials.
      </div>
      <button onClick={handleSave} style={{ ...S.primaryBtn, width:"100%" }}>Save Change →</button>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MAIN ATTENDANCE MANAGEMENT TAB — A9.1 + A9.2
══════════════════════════════════════════ */
export default function AttendanceTab({ teachers, sessions, attendanceRecords: propRecords, setAttendanceRecords: setPropRecords }) {
  /* ── Fallback internal state if prop not passed ── */
  const INITIAL_RECORDS = [
    { id:1, teacherId:1, teacherName:"Priya Sharma",  sessionId:1, sessionTitle:"Classroom Management Techniques",   batch:"Batch A", date:"02/06/2026", status:"present", markedBy:"auto",  note:"" },
    { id:2, teacherId:4, teacherName:"Meera Patel",   sessionId:1, sessionTitle:"Classroom Management Techniques",   batch:"Batch A", date:"02/06/2026", status:"late",    markedBy:"auto",  note:"Joined 10 mins late" },
    { id:3, teacherId:2, teacherName:"Rahul Verma",   sessionId:2, sessionTitle:"Montessori Material Demonstration", batch:"Batch B", date:"03/06/2026", status:"present", markedBy:"auto",  note:"" },
    { id:4, teacherId:7, teacherName:"Deepak Nair",   sessionId:2, sessionTitle:"Montessori Material Demonstration", batch:"Batch B", date:"03/06/2026", status:"absent",  markedBy:"auto",  note:"" },
    { id:5, teacherId:5, teacherName:"Suresh Kumar",  sessionId:3, sessionTitle:"NEP 2020 Overview & FLN Goals",     batch:"Batch C", date:"01/06/2026", status:"present", markedBy:"auto",  note:"" },
    { id:6, teacherId:1, teacherName:"Priya Sharma",  sessionId:5, sessionTitle:"Digital Tools for Preschool",       batch:"Batch A", date:"05/06/2026", status:"excused", markedBy:"admin", note:"Medical leave" },
    { id:7, teacherId:4, teacherName:"Meera Patel",   sessionId:5, sessionTitle:"Digital Tools for Preschool",       batch:"Batch A", date:"05/06/2026", status:"present", markedBy:"auto",  note:"" },
    { id:8, teacherId:2, teacherName:"Rahul Verma",   sessionId:4, sessionTitle:"Child Development Milestones",      batch:"Batch B", date:"30/05/2026", status:"present", markedBy:"auto",  note:"" },
    { id:9, teacherId:7, teacherName:"Deepak Nair",   sessionId:4, sessionTitle:"Child Development Milestones",      batch:"Batch B", date:"30/05/2026", status:"present", markedBy:"auto",  note:"" },
  ];

  const [records, setRecordsState] = useState(propRecords || MOCK_ATTENDANCE_RECORDS);
  const [activeTab,     setActiveTab]    = useState("register");
  const [batchFilter,   setBatchFilter]  = useState("all");
  const [sessionFilter, setSessionFilter]= useState("all");
  const [manualModal,   setManualModal]  = useState(null);  // session object
  const [editModal,     setEditModal]    = useState(null);  // record object
  const [auditLog,      setAuditLog]     = useState([
    { action:"Auto-captured attendance for Classroom Management (Batch A)",  by:"System (Zoom webhook)", time:"02/06/2026 11:32 AM" },
    { action:"Auto-captured attendance for Montessori Demonstration (Batch B)", by:"System (Google Meet)", time:"03/06/2026 12:05 PM" },
    { action:"Manual edit: Priya Sharma → Excused (Medical leave)",          by:"Admin",                  time:"05/06/2026 02:10 PM" },
  ]);

  const setRecords = (val) => {
    setRecordsState(val);
    if (setPropRecords) setPropRecords(val);
  };

  /* ── Derived Data ── */
  const batches  = ["all", ...new Set(sessions.map(s => s.batch))];
  const approved = teachers.filter(t => t.status === "approved");

  /* Per-teacher attendance percentage */
  const teacherStats = approved.map(t => {
    const teacherRecs = records.filter(r => r.teacherId === t.id);
    const total   = teacherRecs.length;
    const present = teacherRecs.filter(r => r.status === "present" || r.status === "late").length;
    const pct     = total > 0 ? Math.round((present / total) * 100) : t.attendance;
    return { ...t, recordCount:total, presentCount:present, pct };
  });

  const lowAlert  = teacherStats.filter(t => t.pct < 60);
  const warnAlert = teacherStats.filter(t => t.pct >= 60 && t.pct < 75);

  /* Session-level attendance matrix */
  const filteredSessions = sessions.filter(s => batchFilter === "all" || s.batch === batchFilter);

  /* Per-session stats */
  const sessionStats = filteredSessions.map(s => {
    const recs     = records.filter(r => r.sessionId === s.id);
    const present  = recs.filter(r => r.status === "present").length;
    const late     = recs.filter(r => r.status === "late").length;
    const absent   = recs.filter(r => r.status === "absent").length;
    const excused  = recs.filter(r => r.status === "excused").length;
    return { ...s, present, late, absent, excused, total:recs.length };
  });

  /* Batch comparison */
  const batchNames = [...new Set(sessions.map(s => s.batch))];
  const batchComparison = batchNames.map(batch => {
    const batchRecs     = records.filter(r => r.batch === batch);
    const batchPresent  = batchRecs.filter(r => r.status === "present" || r.status === "late").length;
    const pct           = batchRecs.length > 0 ? Math.round((batchPresent / batchRecs.length) * 100) : 0;
    return { batch, total:batchRecs.length, present:batchPresent, pct };
  });

  /* Save manual attendance */
  const saveManualAttendance = (newRecs, sessionId) => {
    setRecords(prev => {
      const filtered = prev.filter(r => r.sessionId !== sessionId || !newRecs.find(nr => nr.teacherId === r.teacherId));
      return [...filtered, ...newRecs];
    });
    setAuditLog(prev => [{
      action:`Manual attendance entered for session ID ${sessionId}`,
      by:"Admin",
      time:new Date().toLocaleString("en-IN"),
    }, ...prev]);
  };

  /* Save edit */
  const saveEdit = (updated) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setAuditLog(prev => [{
      action:`Edited: ${updated.teacherName} → ${updated.status}${updated.note ? ` (${updated.note})` : ""}`,
      by:"Admin",
      time:new Date().toLocaleString("en-IN"),
    }, ...prev]);
  };

  /* Export CSV */
  const exportCSV = () => {
    const headers = ["Teacher","Session","Batch","Date","Status","Marked By","Note"];
    const rows    = records.map(r => [r.teacherName, r.sessionTitle, r.batch, r.date, r.status, r.markedBy, r.note]);
    const csv     = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const blob    = new Blob([csv], { type:"text/csv" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    a.href = url; a.download = "attendance_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { key:"register",   label:"📋 Attendance Register" },
    { key:"matrix",     label:"🗂️ Session Matrix"      },
    { key:"analytics",  label:"📊 Analytics"           },
    { key:"audit",      label:"🕓 Audit Log"            },
  ];

  const statusIcon = { present:"✅", late:"⏰", absent:"❌", excused:"💙" };

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>

      {/* Modals */}
      {manualModal && (
        <ManualAttendanceModal
          session={manualModal}
          teachers={teachers}
          existingRecords={records}
          onSave={saveManualAttendance}
          onClose={() => setManualModal(null)}
          setToast={() => {}}
        />
      )}
      {editModal && (
        <EditRecordModal
          record={editModal}
          onSave={saveEdit}
          onClose={() => setEditModal(null)}
          setToast={() => {}}
        />
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={S.pageTitle}>Attendance Management</h1>
          <p style={S.pageSub}>Session attendance, reports, and analytics across all batches</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={exportCSV} style={S.exportBtn}>⬇ Export CSV</button>
          <button onClick={() => alert("PDF export requires a PDF library. CSV is available.")} style={S.exportBtn}>⬇ Export PDF</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:14, marginBottom:20 }}>
        <StatCard icon="📋" label="Total Records"   val={records.length}                                              color="#f59e0b" bg="#fef3c7"/>
        <StatCard icon="✅" label="Present"         val={records.filter(r=>r.status==="present").length}              color="#10b981" bg="#d1fae5"/>
        <StatCard icon="⏰" label="Late"            val={records.filter(r=>r.status==="late").length}                 color="#d97706" bg="#fef3c7"/>
        <StatCard icon="❌" label="Absent"          val={records.filter(r=>r.status==="absent").length}               color="#ef4444" bg="#fee2e2"/>
        <StatCard icon="⚠️" label="Low Attendance" val={lowAlert.length}                                             color="#ef4444" bg="#fee2e2"/>
      </div>

      {/* Low Attendance Alert */}
      {lowAlert.length > 0 && (
        <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{ fontSize:22, flexShrink:0 }}>🚨</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#991b1b", marginBottom:4 }}>
              Low Attendance Alert — {lowAlert.length} teacher{lowAlert.length>1?"s":""} below 60%
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {lowAlert.map(t => (
                <span key={t.id} style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fee2e2", color:"#dc2626", border:"1px solid #fca5a5" }}>
                  {t.name} ({t.pct}%)
                </span>
              ))}
            </div>
          </div>
          <button style={{ ...S.primaryBtn, fontSize:11, padding:"7px 14px", flexShrink:0 }}>
            📧 Send Alerts
          </button>
        </div>
      )}
      {warnAlert.length > 0 && (
        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div style={{ fontSize:12, color:"#92400e" }}>
            <b>{warnAlert.length} teacher{warnAlert.length>1?"s":""}</b> between 60–75%: {warnAlert.map(t=>`${t.name} (${t.pct}%)`).join(" · ")}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding:"8px 16px", borderRadius:8, border:`1.5px solid ${activeTab===t.key?"#f59e0b":"#e5e7eb"}`, background:activeTab===t.key?"#fef3c7":"white", color:activeTab===t.key?"#92400e":"#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: REGISTER ══ */}
      {activeTab === "register" && (
        <div>
          {/* Filters */}
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {batches.map(b => (
                <button key={b} onClick={() => setBatchFilter(b)}
                  style={{ padding:"7px 14px", borderRadius:8, border:`1.5px solid ${batchFilter===b?"#f59e0b":"#e5e7eb"}`, background:batchFilter===b?"#fef3c7":"white", color:batchFilter===b?"#92400e":"#6b7280", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  {b === "all" ? "All Batches" : b}
                </button>
              ))}
            </div>
          </div>

          {/* Per-Teacher Attendance Register */}
          <SectionCard title="👩‍🏫 Teacher Attendance Register">
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
                <thead>
                  <tr style={{ background:"#f9fafb", borderBottom:"1px solid #f1f5f9" }}>
                    {["Teacher","Batch","Sessions","Present","Late","Absent","Excused","Rate","Alert"].map(h => (
                      <th key={h} style={{ padding:"10px 14px", fontSize:11, fontWeight:700, color:"#9ca3af", textAlign:"left", textTransform:"uppercase", letterSpacing:"0.5px", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teacherStats
                    .filter(t => batchFilter === "all" || t.batch === batchFilter)
                    .map((t, i) => {
                      const tRecs   = records.filter(r => r.teacherId === t.id);
                      const present = tRecs.filter(r => r.status === "present").length;
                      const late    = tRecs.filter(r => r.status === "late").length;
                      const absent  = tRecs.filter(r => r.status === "absent").length;
                      const excused = tRecs.filter(r => r.status === "excused").length;
                      const pctColor = t.pct >= 75 ? "#10b981" : t.pct >= 60 ? "#f59e0b" : "#ef4444";
                      return (
                        <tr key={t.id} style={{ borderBottom:"1px solid #f9fafb", background:i%2===0?"white":"#fafafa" }}>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white", flexShrink:0 }}>{t.name[0]}</div>
                              <div>
                                <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{t.name}</div>
                                <div style={{ fontSize:10, color:"#9ca3af" }}>{t.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"12px 14px", fontSize:12, color:"#374151" }}>{t.batch || "—"}</td>
                          <td style={{ padding:"12px 14px", fontSize:13, fontWeight:600, color:"#374151", textAlign:"center" }}>{tRecs.length || t.classes}</td>
                          <td style={{ padding:"12px 14px", textAlign:"center" }}><span style={{ fontSize:12, fontWeight:700, color:"#10b981" }}>{present || "—"}</span></td>
                          <td style={{ padding:"12px 14px", textAlign:"center" }}><span style={{ fontSize:12, fontWeight:700, color:"#d97706" }}>{late || "—"}</span></td>
                          <td style={{ padding:"12px 14px", textAlign:"center" }}><span style={{ fontSize:12, fontWeight:700, color:"#ef4444" }}>{absent || "—"}</span></td>
                          <td style={{ padding:"12px 14px", textAlign:"center" }}><span style={{ fontSize:12, fontWeight:700, color:"#6366f1" }}>{excused || "—"}</span></td>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:52, height:6, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${t.pct}%`, background:pctColor }}/>
                              </div>
                              <span style={{ fontSize:11, fontWeight:800, color:pctColor }}>{t.pct}%</span>
                            </div>
                          </td>
                          <td style={{ padding:"12px 14px" }}>
                            {t.pct < 60 && <span style={{ fontSize:10, fontWeight:700, color:"#dc2626", background:"#fee2e2", padding:"2px 8px", borderRadius:20 }}>🚨 LOW</span>}
                            {t.pct >= 60 && t.pct < 75 && <span style={{ fontSize:10, fontWeight:700, color:"#d97706", background:"#fef3c7", padding:"2px 8px", borderRadius:20 }}>⚠️ WARN</span>}
                            {t.pct >= 75 && <span style={{ fontSize:10, color:"#9ca3af" }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Session List with Manual Entry Buttons */}
          <SectionCard title="📅 Sessions — Mark or Edit Attendance">
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filteredSessions.map((s, i) => {
                const stat = sessionStats.find(ss => ss.id === s.id);
                const isCompleted = s.status === "completed";
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderRadius:12, border:"1px solid #f1f5f9", background:isCompleted?"#f9fafb":"white" }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:isCompleted?"#d1fae5":"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                      {isCompleted ? "✅" : "📹"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{s.title}</div>
                      <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>📅 {s.date} · 🗂️ {s.batch} · 👩‍🏫 {s.trainer}</div>
                    </div>
                    {/* Stats pills */}
                    {stat && stat.total > 0 && (
                      <div style={{ display:"flex", gap:6 }}>
                        {[["✅",stat.present,"#d1fae5","#059669"],["⏰",stat.late,"#fef3c7","#d97706"],["❌",stat.absent,"#fee2e2","#dc2626"],["💙",stat.excused,"#ede9fe","#6366f1"]].map(([icon,val,bg,color],j)=>(
                          val > 0 && <span key={j} style={{ fontSize:11, fontWeight:700, color, background:bg, padding:"2px 8px", borderRadius:20 }}>{icon} {val}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      <StatusBadge status={s.status}/>
                      <button onClick={() => setManualModal(s)} style={{ ...S.tblBtn, color:"#3b82f6", borderColor:"#93c5fd" }}>
                        {stat && stat.total > 0 ? "✏️ Edit" : "📋 Mark"}
                      </button>
                      {s.status === "upcoming" && (
                        <span style={{ fontSize:10, color:"#9ca3af", padding:"4px 8px", background:"#f0f9ff", borderRadius:8, border:"1px solid #bae6fd" }}>🔗 Zoom Auto</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══ TAB: MATRIX ══ */}
      {activeTab === "matrix" && (
        <SectionCard title="🗂️ Attendance Matrix — Teacher × Session">
          <div style={{ marginBottom:14, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:12, color:"#6b7280", fontWeight:600 }}>Filter by batch:</span>
            {batches.map(b => (
              <button key={b} onClick={() => setBatchFilter(b)}
                style={{ padding:"5px 12px", borderRadius:8, border:`1.5px solid ${batchFilter===b?"#f59e0b":"#e5e7eb"}`, background:batchFilter===b?"#fef3c7":"white", color:batchFilter===b?"#92400e":"#6b7280", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                {b === "all" ? "All" : b}
              </button>
            ))}
          </div>

          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", minWidth:600 }}>
              <thead>
                <tr style={{ background:"#f9fafb" }}>
                  <th style={{ padding:"10px 14px", fontSize:11, fontWeight:700, color:"#9ca3af", textAlign:"left", minWidth:160, borderBottom:"1px solid #f1f5f9" }}>TEACHER</th>
                  {filteredSessions.map(s => (
                    <th key={s.id} style={{ padding:"8px 10px", fontSize:10, fontWeight:700, color:"#9ca3af", textAlign:"center", borderBottom:"1px solid #f1f5f9", minWidth:100 }}>
                      <div style={{ maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.title}</div>
                      <div style={{ fontSize:9, color:"#d1d5db", marginTop:2 }}>{s.date}</div>
                    </th>
                  ))}
                  <th style={{ padding:"10px 14px", fontSize:11, fontWeight:700, color:"#9ca3af", textAlign:"center", borderBottom:"1px solid #f1f5f9", minWidth:80 }}>RATE</th>
                </tr>
              </thead>
              <tbody>
                {approved
                  .filter(t => batchFilter === "all" || t.batch === batchFilter)
                  .map((t, ri) => {
                    const tRecs  = records.filter(r => r.teacherId === t.id);
                    const total   = filteredSessions.length;
                    const present = tRecs.filter(r => r.status === "present" || r.status === "late").length;
                    const pct     = total > 0 ? Math.round((present / Math.max(1, tRecs.length)) * 100) : t.attendance;
                    return (
                      <tr key={t.id} style={{ borderBottom:"1px solid #f9fafb", background:ri%2===0?"white":"#fafafa" }}>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#1c1917" }}>{t.name}</div>
                          <div style={{ fontSize:10, color:"#9ca3af" }}>{t.batch}</div>
                        </td>
                        {filteredSessions.map(s => {
                          const rec = records.find(r => r.teacherId === t.id && r.sessionId === s.id);
                          const cellBg = !rec ? "#f9fafb" : rec.status==="present" ? "#d1fae5" : rec.status==="late" ? "#fef3c7" : rec.status==="absent" ? "#fee2e2" : "#ede9fe";
                          return (
                            <td key={s.id} style={{ padding:"8px 10px", textAlign:"center", background:cellBg, border:"1px solid white" }}>
                              {rec ? (
                                <button onClick={() => setEditModal(rec)}
                                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:16 }}
                                  title={`${rec.status}${rec.note ? ` — ${rec.note}` : ""}`}>
                                  {statusIcon[rec.status] || "?"}
                                </button>
                              ) : (
                                <span style={{ fontSize:12, color:"#d1d5db" }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding:"10px 14px", textAlign:"center" }}>
                          <span style={{ fontSize:12, fontWeight:800, color:pct>=75?"#10b981":pct>=60?"#f59e0b":"#ef4444" }}>{pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ display:"flex", gap:16, marginTop:14, flexWrap:"wrap" }}>
            {[["✅","Present","#d1fae5"],["⏰","Late","#fef3c7"],["❌","Absent","#fee2e2"],["💙","Excused","#ede9fe"],["—","No Record","#f9fafb"]].map(([icon,label,bg]) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, border:"1px solid #e5e7eb" }}>{icon}</div>
                <span style={{ fontSize:11, color:"#6b7280" }}>{label}</span>
              </div>
            ))}
            <span style={{ fontSize:11, color:"#9ca3af", marginLeft:"auto" }}>Click any cell to edit (with audit log)</span>
          </div>
        </SectionCard>
      )}

      {/* ══ TAB: ANALYTICS ══ */}
      {activeTab === "analytics" && (
        <div>
          {/* Batch Comparison */}
          <SectionCard title="📊 Attendance Rate Comparison — Across Batches">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:20 }}>
              {batchComparison.map((b, i) => {
                const color = b.pct >= 80 ? "#10b981" : b.pct >= 65 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={i} style={{ background:"white", borderRadius:14, padding:"16px", border:`1px solid ${color}30`, borderTop:`3px solid ${color}` }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"#1c1917", marginBottom:4 }}>{b.batch}</div>
                    <div style={{ fontSize:28, fontWeight:900, color, marginBottom:4 }}>{b.pct}%</div>
                    <div style={{ fontSize:11, color:"#9ca3af" }}>{b.present} present of {b.total} records</div>
                    <div style={{ height:6, background:"#f3f4f6", borderRadius:4, overflow:"hidden", marginTop:10 }}>
                      <div style={{ height:"100%", width:`${b.pct}%`, background:color, borderRadius:4 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Individual Teacher Analytics */}
          <SectionCard title="👩‍🏫 Individual Teacher Attendance % by Course">
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {teacherStats.map(t => {
                const pctColor = t.pct >= 75 ? "#10b981" : t.pct >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={t.id} style={{ padding:"14px 16px", borderRadius:12, border:`1px solid ${t.pct<60?"#fca5a5":t.pct<75?"#fde68a":"#f1f5f9"}`, background:t.pct<60?"#fef2f2":t.pct<75?"#fffbeb":"white" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"white", flexShrink:0 }}>{t.name[0]}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{t.name}</div>
                        <div style={{ fontSize:11, color:"#9ca3af" }}>{t.course || "—"} · {t.batch || "—"}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:22, fontWeight:900, color:pctColor }}>{t.pct}%</div>
                        {t.pct < 60 && <span style={{ fontSize:10, fontWeight:700, color:"#dc2626", background:"#fee2e2", padding:"2px 8px", borderRadius:20 }}>🚨 LOW</span>}
                        {t.pct >= 60 && t.pct < 75 && <span style={{ fontSize:10, fontWeight:700, color:"#d97706", background:"#fef3c7", padding:"2px 8px", borderRadius:20 }}>⚠️ WARN</span>}
                      </div>
                    </div>
                    <div style={{ height:8, background:"#f3f4f6", borderRadius:6, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${t.pct}%`, background:pctColor, borderRadius:6, transition:"width 0.8s" }}/>
                    </div>
                    <div style={{ display:"flex", gap:16, marginTop:8 }}>
                      {[["✅",records.filter(r=>r.teacherId===t.id&&r.status==="present").length,"Present"],["⏰",records.filter(r=>r.teacherId===t.id&&r.status==="late").length,"Late"],["❌",records.filter(r=>r.teacherId===t.id&&r.status==="absent").length,"Absent"],["💙",records.filter(r=>r.teacherId===t.id&&r.status==="excused").length,"Excused"]].map(([icon,val,label])=>(
                        val > 0 && <span key={label} style={{ fontSize:11, color:"#6b7280" }}>{icon} {val} {label}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Session attendance stats */}
          <SectionCard title="📅 Per-Session Attendance Breakdown" action={<button onClick={exportCSV} style={S.exportBtn}>⬇ Export Excel</button>}>
            {sessionStats.filter(s => s.total > 0).map((s, i) => {
              const pct = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
              return (
                <div key={i} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{s.title}</div>
                      <div style={{ fontSize:11, color:"#9ca3af" }}>{s.batch} · {s.date}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:16, fontWeight:800, color:pct>=75?"#10b981":pct>=60?"#f59e0b":"#ef4444" }}>{pct}%</div>
                      <div style={{ fontSize:10, color:"#9ca3af" }}>{s.present+s.late}/{s.total} attended</div>
                    </div>
                  </div>
                  <div style={{ height:8, background:"#f3f4f6", borderRadius:6, overflow:"hidden", marginBottom:6 }}>
                    <div style={{ height:"100%", borderRadius:6, display:"flex" }}>
                      <div style={{ width:`${s.total>0?(s.present/s.total*100):0}%`, background:"#10b981" }}/>
                      <div style={{ width:`${s.total>0?(s.late/s.total*100):0}%`, background:"#f59e0b" }}/>
                      <div style={{ width:`${s.total>0?(s.absent/s.total*100):0}%`, background:"#ef4444" }}/>
                      <div style={{ width:`${s.total>0?(s.excused/s.total*100):0}%`, background:"#6366f1" }}/>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:12, fontSize:10, color:"#6b7280" }}>
                    <span>✅ {s.present} Present</span>
                    <span>⏰ {s.late} Late</span>
                    <span>❌ {s.absent} Absent</span>
                    <span>💙 {s.excused} Excused</span>
                  </div>
                </div>
              );
            })}
            {sessionStats.filter(s => s.total > 0).length === 0 && (
              <div style={{ textAlign:"center", padding:20, color:"#9ca3af", fontSize:13 }}>No attendance records yet.</div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ══ TAB: AUDIT LOG ══ */}
      {activeTab === "audit" && (
        <SectionCard title="🕓 Attendance Audit Log">
          <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#0369a1" }}>
            Every manual edit and auto-capture event is logged here for compliance.
          </div>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {auditLog.map((entry, i) => (
              <AuditLogEntry key={i} entry={entry}/>
            ))}
            {auditLog.length === 0 && (
              <div style={{ textAlign:"center", padding:20, color:"#9ca3af", fontSize:13 }}>No audit entries yet.</div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}