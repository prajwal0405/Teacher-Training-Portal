import { useState } from "react";
import { Modal, S, SectionCard, StatCard, Toast } from "../components/Shared";
/* ── A8: Live Sessions ── */
export default function LiveSessionsTab({ sessions, setSessions, teachers, batches, setToast }) {

  const [view,          setView]          = useState("list");   // list | detail
  const [selected,      setSelected]      = useState(null);
  const [addModal,      setAddModal]      = useState(false);
  const [postModal,     setPostModal]     = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [batchFilter,   setBatchFilter]   = useState("all");
  const [search,        setSearch]        = useState("");

  const PLATFORMS = ["Zoom","Google Meet","Microsoft Teams","Webex"];
  const TRAINERS  = [...new Set((teachers||[]).filter(t=>t.status==="approved").map(t=>t.name))];
  const BATCHES   = [...new Set((batches||[]).map(b=>b.name))];

  const emptyForm = {
    title:"", date:"", time:"", duration:60, batch:"", trainer:"", backupTrainer:"",
    platform:"Zoom", meetingLink:"", maxParticipants:40,
    recurrence:"none", recurrenceEnd:"", status:"upcoming",
  };
  const [form, setForm] = useState(emptyForm);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));

  // Post-session form state
  const [postForm, setPostForm] = useState({
    recording:"", newMaterial:"", feedbackMsg:"", summary:"",
  });

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.title.toLowerCase().includes(q) || s.trainer.toLowerCase().includes(q) || s.batch.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchBatch  = batchFilter  === "all" || s.batch  === batchFilter;
    return matchSearch && matchStatus && matchBatch;
  });

  const updateSession = (id, changes) => {
    setSessions(prev => prev.map(s => s.id===id ? {...s,...changes} : s));
    if (selected?.id === id) setSelected(s => ({...s,...changes}));
  };

  // ── Auto-generate meeting link ──
  const generateLink = (platform) => {
    const id = Math.random().toString(36).substring(2,11);
    const links = {
      "Zoom":              `https://zoom.us/j/${Math.floor(Math.random()*9000000000+1000000000)}`,
      "Google Meet":       `https://meet.google.com/${id.substring(0,3)}-${id.substring(3,7)}-${id.substring(7,10)}`,
      "Microsoft Teams":   `https://teams.microsoft.com/l/meetup-join/${id}`,
      "Webex":             `https://webex.com/meet/${id}`,
    };
    upd("meetingLink", links[platform] || links["Zoom"]);
    setToast({ msg:"Meeting link generated!", type:"success" });
  };

  // ── Create session (with recurrence expansion) ──
  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title||!form.date||!form.time||!form.batch||!form.trainer) {
      setToast({ msg:"Fill required fields: title, date, time, batch, trainer.", type:"error" });
      return;
    }

    const base = {
      ...form,
      duration:       Number(form.duration),
      maxParticipants:Number(form.maxParticipants),
      attendees:0, recording:"", materials:[], feedbackSent:false, summary:"",
      reminderSent24h:false, reminderSent1h:false,
    };

    const newSessions = [];

    if (form.recurrence !== "none" && form.recurrenceEnd) {
      const startDate = new Date(form.date);
      const endDate   = new Date(form.recurrenceEnd);
      const stepDays  = form.recurrence === "weekly" ? 7 : 14;
      let current     = new Date(startDate);

      while (current <= endDate) {
        newSessions.push({
          ...base,
          id:   Date.now() + newSessions.length,
          date: current.toLocaleDateString("en-IN"),
        });
        current.setDate(current.getDate() + stepDays);
      }
      setToast({ msg:`${newSessions.length} recurring sessions created!`, type:"success" });
    } else {
      newSessions.push({ ...base, id:Date.now(), date:new Date(form.date).toLocaleDateString("en-IN") });
      setToast({ msg:"Session scheduled!", type:"success" });
    }

    setSessions(prev => [...prev, ...newSessions]);
    setAddModal(false);
    setForm(emptyForm);
  };

  // ── Send reminders ──
  const sendReminder = (id, type) => {
    const key = type === "24h" ? "reminderSent24h" : "reminderSent1h";
    updateSession(id, { [key]:true });
    setToast({ msg:`${type === "24h" ? "24-hour" : "1-hour"} reminder sent via email + SMS!`, type:"success" });
  };

  // ── Post-session save ──
  const savePostSession = (id) => {
    const s = sessions.find(x=>x.id===id);
    const updates = {};
    if (postForm.recording)    updates.recording = postForm.recording;
    if (postForm.newMaterial)  updates.materials = [...(s?.materials||[]), postForm.newMaterial];
    if (postForm.summary)      updates.summary   = postForm.summary;
    if (postForm.feedbackMsg)  updates.feedbackSent = true;
    updateSession(id, updates);
    setToast({ msg:"Post-session tasks saved!", type:"success" });
    setPostModal(null);
    setPostForm({ recording:"", newMaterial:"", feedbackMsg:"", summary:"" });
  };

  // ── AI session summary ──
  const generateAISummary = async (session) => {
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    const summary = `📋 AI Session Summary — ${session.title}\n\nDate: ${session.date} | Duration: ${session.duration} min | Batch: ${session.batch}\nTrainer: ${session.trainer} | Platform: ${session.platform}\nAttendees: ${session.attendees} / ${session.maxParticipants}\n\nKey Topics Covered:\n• Introduction and context setting for ${session.batch}\n• Core concepts aligned with course curriculum\n• Interactive Q&A with ${session.attendees} participants\n• Practical demonstrations and activity walkthroughs\n\nEngagement Level: ${session.attendees > 20 ? "High" : "Moderate"}\nCompletion Rate: ${Math.round((session.attendees/session.maxParticipants)*100)}%\n\nNext Steps:\n• Review uploaded materials before next session\n• Complete assigned module quiz by end of week\n• Trainer to follow up with absentees`;
    setPostForm(f => ({...f, summary}));
    setAiLoading(false);
    setToast({ msg:"AI summary generated!", type:"success" });
  };

  const platformIcon = { "Zoom":"📹", "Google Meet":"📞", "Microsoft Teams":"💼", "Webex":"🌐" };
  const statusColor  = { upcoming:"#2563eb", completed:"#7c3aed", cancelled:"#dc2626", live:"#059669" };
  const statusBg     = { upcoming:"#dbeafe", completed:"#ede9fe", cancelled:"#fee2e2", live:"#d1fae5" };

  // ── DETAIL VIEW ──
  if (view === "detail" && selected) {
    const s = sessions.find(x=>x.id===selected.id) || selected;
    return (
      <div style={{ animation:"fadeIn 0.3s ease" }}>

        {/* Post-session modal */}
        {postModal && (
          <Modal title={`📋 Post-Session Tasks — ${s.title}`} onClose={()=>setPostModal(null)}>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Recording upload */}
              <div>
                <label style={S.label}>🎥 Session Recording URL</label>
                <input style={S.input} value={postForm.recording} onChange={e=>setPostForm(f=>({...f,recording:e.target.value}))}
                  placeholder="https://recordings.spaceece.in/session.mp4 or Drive link"/>
                {s.recording && <div style={{ fontSize:11, color:"#059669", marginTop:4 }}>✓ Current: {s.recording.substring(0,40)}...</div>}
              </div>

              {/* Materials */}
              <div>
                <label style={S.label}>📎 Upload Session Material</label>
                <input style={S.input} value={postForm.newMaterial} onChange={e=>setPostForm(f=>({...f,newMaterial:e.target.value}))}
                  placeholder="Filename or URL e.g. Session_Notes.pdf"/>
                {s.materials?.length > 0 && (
                  <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:6 }}>
                    {s.materials.map((m,i)=>(
                      <span key={i} style={{ fontSize:11, padding:"3px 10px", background:"#dbeafe", color:"#1d4ed8", borderRadius:20, fontWeight:600 }}>📎 {m}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendance button */}
              <div style={{ padding:"12px 14px", background:"#f9fafb", borderRadius:10, border:"1px solid #f3f4f6" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:6 }}>📊 Mark Attendance</div>
                <div style={{ fontSize:12, color:"#6b7280", marginBottom:8 }}>Attendance for this session is managed in the Attendance tab.</div>
                <button onClick={()=>{ setToast({ msg:"Go to Attendance tab to mark this session.", type:"success" }); setPostModal(null); }}
                  style={{ ...S.exportBtn, fontSize:11 }}>Go to Attendance →</button>
              </div>

              {/* Feedback form */}
              <div>
                <label style={S.label}>💬 Send Feedback Form to Attendees</label>
                <textarea style={{ ...S.input, height:60, resize:"none" }}
                  value={postForm.feedbackMsg}
                  onChange={e=>setPostForm(f=>({...f,feedbackMsg:e.target.value}))}
                  placeholder="Optional message to include with feedback form link..."/>
                {s.feedbackSent && <div style={{ fontSize:11, color:"#059669", marginTop:4 }}>✓ Feedback form already sent</div>}
              </div>

              {/* AI Summary */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <label style={S.label}>🤖 AI Session Summary</label>
                  <button onClick={()=>generateAISummary(s)} disabled={aiLoading}
                    style={{ ...S.exportBtn, fontSize:11, opacity:aiLoading?0.7:1 }}>
                    {aiLoading ? "⏳ Generating..." : "🤖 Generate"}
                  </button>
                </div>
                <textarea style={{ ...S.input, height:130, resize:"none", fontSize:11, fontFamily:"inherit", lineHeight:1.6 }}
                  value={postForm.summary}
                  onChange={e=>setPostForm(f=>({...f,summary:e.target.value}))}
                  placeholder="AI-generated or manual session summary..."/>
                {s.summary && !postForm.summary && (
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>
                    <button onClick={()=>setPostForm(f=>({...f,summary:s.summary}))} style={{ ...S.tblBtn, fontSize:10 }}>Load existing summary</button>
                  </div>
                )}
              </div>

              <button onClick={()=>savePostSession(s.id)} style={{ ...S.primaryBtn, width:"100%" }}>
                💾 Save Post-Session Tasks
              </button>
            </div>
          </Modal>
        )}

        <button onClick={()=>{ setView("list"); setSelected(null); }} style={S.backBtn}>← Back to Sessions</button>

        {/* Session header card */}
        <div style={{ background:"white", borderRadius:20, padding:28, border:"1px solid #f1f5f9", boxShadow:"0 4px 20px rgba(0,0,0,0.06)", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:20, paddingBottom:18, borderBottom:"1px solid #f3f4f6" }}>
            <div style={{ width:60, height:60, borderRadius:16, background:statusBg[s.status]||"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
              {platformIcon[s.platform]||"📹"}
            </div>
            <div style={{ flex:1 }}>
              <h2 style={{ fontSize:20, fontWeight:900, color:"#0f172a", margin:"0 0 6px" }}>{s.title}</h2>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={{ padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:statusBg[s.status], color:statusColor[s.status] }}>{s.status.toUpperCase()}</span>
                <span style={{ padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fef3c7", color:"#92400e" }}>{s.batch}</span>
                <span style={{ padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:"#f3f4f6", color:"#374151" }}>{s.platform}</span>
                {s.recurrence !== "none" && <span style={{ padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:"#ede9fe", color:"#6d28d9" }}>🔁 {s.recurrence}</span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {s.status === "upcoming" && (
                <button onClick={()=>updateSession(s.id,{status:"live"})} style={{ ...S.btnGreen }}>▶ Go Live</button>
              )}
              {s.status === "live" && (
                <button onClick={()=>updateSession(s.id,{status:"completed"})} style={{ ...S.btnOrange }}>■ End Session</button>
              )}
              <button onClick={()=>{ setPostForm({ recording:s.recording||"", newMaterial:"", feedbackMsg:"", summary:s.summary||"" }); setPostModal(s); }}
                style={S.exportBtn}>📋 Post-Session Tasks</button>
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
            {[
              { icon:"📅", label:"Date",          val:s.date                                      },
              { icon:"🕐", label:"Time",          val:s.time                                      },
              { icon:"⏱",  label:"Duration",      val:`${s.duration} min`                         },
              { icon:"👩‍🏫", label:"Primary Trainer",val:s.trainer                                 },
              { icon:"👥", label:"Backup Trainer", val:s.backupTrainer||"Not assigned"             },
              { icon:"🪑", label:"Capacity",       val:`${s.attendees}/${s.maxParticipants} seats` },
            ].map((r,i)=>(
              <div key={i} style={{ background:"#f9fafb", borderRadius:10, padding:"10px 13px", border:"1px solid #f3f4f6" }}>
                <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:".4px", marginBottom:2 }}>{r.label}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{r.icon} {r.val}</div>
              </div>
            ))}
          </div>

          {/* Meeting link */}
          {s.meetingLink && (
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <span style={{ fontSize:16 }}>🔗</span>
              <a href={s.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize:12, fontWeight:700, color:"#2563eb", flex:1 }}>{s.meetingLink}</a>
              <button onClick={()=>{ navigator.clipboard?.writeText(s.meetingLink); setToast({ msg:"Link copied!", type:"success" }); }}
                style={{ ...S.tblBtn, fontSize:11 }}>📋 Copy</button>
            </div>
          )}

          {/* Reminders */}
          {s.status === "upcoming" && (
            <div style={{ background:"#f9fafb", borderRadius:12, padding:"14px 16px", border:"1px solid #f3f4f6" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:10 }}>🔔 Session Reminders</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <div style={{ flex:1, padding:"10px 14px", background:"white", borderRadius:10, border:`1px solid ${s.reminderSent24h?"#86efac":"#e5e7eb"}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#374151" }}>24-Hour Reminder</div>
                  <div style={{ fontSize:11, color:"#9ca3af", marginBottom:8 }}>Email + SMS to all enrolled teachers</div>
                  {s.reminderSent24h
                    ? <span style={{ fontSize:11, color:"#059669", fontWeight:700 }}>✓ Sent</span>
                    : <button onClick={()=>sendReminder(s.id,"24h")} style={{ ...S.btnGreen, fontSize:11, padding:"5px 12px" }}>Send Now</button>}
                </div>
                <div style={{ flex:1, padding:"10px 14px", background:"white", borderRadius:10, border:`1px solid ${s.reminderSent1h?"#86efac":"#e5e7eb"}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#374151" }}>1-Hour Reminder</div>
                  <div style={{ fontSize:11, color:"#9ca3af", marginBottom:8 }}>Email + SMS to all enrolled teachers</div>
                  {s.reminderSent1h
                    ? <span style={{ fontSize:11, color:"#059669", fontWeight:700 }}>✓ Sent</span>
                    : <button onClick={()=>sendReminder(s.id,"1h")} style={{ ...S.btnGreen, fontSize:11, padding:"5px 12px" }}>Send Now</button>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recording & Materials */}
        {s.status === "completed" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
            <SectionCard title="🎥 Session Recording">
              {s.recording ? (
                <div>
                  <div style={{ background:"#f9fafb", borderRadius:10, padding:"14px", border:"1px solid #f3f4f6", marginBottom:10 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:4 }}>Recording Available</div>
                    <a href={s.recording} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"#2563eb", wordBreak:"break-all" }}>{s.recording}</a>
                  </div>
                  <div style={{ fontSize:11, color:"#059669", fontWeight:600 }}>✓ Auto-available in Live Session page for enrolled teachers</div>
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:20, color:"#9ca3af" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🎥</div>
                  <div style={{ fontSize:12, marginBottom:10 }}>No recording uploaded yet</div>
                  <button onClick={()=>{ setPostForm({ recording:"", newMaterial:"", feedbackMsg:"", summary:"" }); setPostModal(s); }}
                    style={S.primaryBtn}>Upload Recording</button>
                </div>
              )}
            </SectionCard>

            <SectionCard title="📎 Session Materials">
              {s.materials?.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {s.materials.map((m,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#f9fafb", borderRadius:8, border:"1px solid #f3f4f6" }}>
                      <span style={{ fontSize:16 }}>📄</span>
                      <span style={{ fontSize:12, fontWeight:600, color:"#374151", flex:1 }}>{m}</span>
                      <button style={{ ...S.tblBtn, fontSize:10 }}>⬇ Download</button>
                    </div>
                  ))}
                  <button onClick={()=>{ setPostForm(f=>({...f})); setPostModal(s); }} style={{ ...S.exportBtn, marginTop:4, fontSize:11 }}>+ Add More</button>
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:20, color:"#9ca3af" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
                  <div style={{ fontSize:12, marginBottom:10 }}>No materials uploaded</div>
                  <button onClick={()=>{ setPostForm({ recording:"", newMaterial:"", feedbackMsg:"", summary:"" }); setPostModal(s); }}
                    style={S.exportBtn}>Upload Material</button>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* AI Summary */}
        {s.summary && (
          <SectionCard title="🤖 AI Session Summary">
            <pre style={{ whiteSpace:"pre-wrap", fontSize:12, color:"#374151", lineHeight:1.7, fontFamily:"inherit", background:"#f9fafb", padding:14, borderRadius:10, border:"1px solid #f3f4f6" }}>
              {s.summary}
            </pre>
          </SectionCard>
        )}

        {/* Post-session checklist */}
        {s.status === "completed" && (
          <SectionCard title="✅ Post-Session Checklist">
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { label:"Recording uploaded",         done:!!s.recording    },
                { label:"Materials uploaded",          done:(s.materials?.length||0)>0 },
                { label:"Attendance marked",           done:s.attendees>0   },
                { label:"Feedback form sent",          done:s.feedbackSent  },
                { label:"Session summary generated",   done:!!s.summary     },
              ].map((item,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:item.done?"#ecfdf5":"#f9fafb", borderRadius:10, border:`1px solid ${item.done?"#86efac":"#f3f4f6"}` }}>
                  <span style={{ fontSize:18 }}>{item.done?"✅":"⏳"}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:item.done?"#065f46":"#6b7280" }}>{item.label}</span>
                  {!item.done && (
                    <button onClick={()=>{ setPostForm({ recording:s.recording||"", newMaterial:"", feedbackMsg:"", summary:s.summary||"" }); setPostModal(s); }}
                      style={{ ...S.tblBtn, marginLeft:"auto", fontSize:11 }}>Complete →</button>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>

      {/* Schedule Session Modal */}
      {addModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)", padding:20 }}>
          <div style={{ background:"white", borderRadius:20, width:"100%", maxWidth:680, maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", overflow:"hidden" }}>
            <div style={{ padding:"20px 28px", borderBottom:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <h3 style={{ fontSize:17, fontWeight:900, color:"#1c1917", margin:0 }}>📅 Schedule New Session</h3>
              <button onClick={()=>{ setAddModal(false); setForm(emptyForm); }} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#9ca3af" }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding:"20px 28px 24px", overflowY:"auto" }}>

              {/* Title */}
              <label style={S.label}>Session Title *</label>
              <input style={{ ...S.input, marginBottom:12 }} value={form.title} onChange={e=>upd("title",e.target.value)} placeholder="e.g. Classroom Management Techniques"/>

              {/* Date / Time / Duration */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <label style={S.label}>Date *</label>
                  <input style={S.input} type="date" value={form.date} onChange={e=>upd("date",e.target.value)}/>
                </div>
                <div>
                  <label style={S.label}>Time *</label>
                  <input style={S.input} type="time" value={form.time} onChange={e=>upd("time",e.target.value)}/>
                </div>
                <div>
                  <label style={S.label}>Duration (min)</label>
                  <input style={S.input} type="number" value={form.duration} onChange={e=>upd("duration",e.target.value)} min="15" max="300"/>
                </div>
              </div>

              {/* Batch / Max Participants */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <label style={S.label}>Batch *</label>
                  <select style={S.input} value={form.batch} onChange={e=>upd("batch",e.target.value)}>
                    <option value="">Select batch...</option>
                    {BATCHES.map(b=><option key={b}>{b}</option>)}
                    <option value="All Batches">All Batches</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Max Participants</label>
                  <input style={S.input} type="number" value={form.maxParticipants} onChange={e=>upd("maxParticipants",e.target.value)} min="1"/>
                </div>
              </div>

              {/* Trainers */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <label style={S.label}>Primary Trainer *</label>
                  <select style={S.input} value={form.trainer} onChange={e=>upd("trainer",e.target.value)}>
                    <option value="">Select trainer...</option>
                    {["Dr. Rekha Iyer","Prof. Amol Desai","Ms. Geeta Rao","Dr. Vikram Shah","Mr. Sunil Mehta"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Backup Trainer</label>
                  <select style={S.input} value={form.backupTrainer} onChange={e=>upd("backupTrainer",e.target.value)}>
                    <option value="">None</option>
                    {["Dr. Rekha Iyer","Prof. Amol Desai","Ms. Geeta Rao","Dr. Vikram Shah","Mr. Sunil Mehta"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Platform + Meeting Link */}
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Platform</label>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  {PLATFORMS.map(p=>(
                    <button key={p} type="button" onClick={()=>upd("platform",p)}
                      style={{ flex:1, padding:"8px", borderRadius:8, border:`1.5px solid ${form.platform===p?"#f59e0b":"#e5e7eb"}`, background:form.platform===p?"#fef3c7":"white", color:form.platform===p?"#92400e":"#6b7280", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      {platformIcon[p]} {p}
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input style={{ ...S.input, marginBottom:0, flex:1 }} value={form.meetingLink} onChange={e=>upd("meetingLink",e.target.value)} placeholder="Paste meeting link or auto-generate below"/>
                  <button type="button" onClick={()=>generateLink(form.platform)} style={{ ...S.exportBtn, whiteSpace:"nowrap" }}>⚡ Auto-Generate</button>
                </div>
              </div>

              {/* Recurrence */}
              <div style={{ background:"#f9fafb", borderRadius:12, padding:"14px 16px", border:"1px solid #f3f4f6", marginBottom:20 }}>
                <label style={{ ...S.label, marginBottom:8 }}>🔁 Recurrence</label>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  {["none","weekly","bi-weekly"].map(r=>(
                    <button key={r} type="button" onClick={()=>upd("recurrence",r)}
                      style={{ flex:1, padding:"8px", borderRadius:8, border:`1.5px solid ${form.recurrence===r?"#f59e0b":"#e5e7eb"}`, background:form.recurrence===r?"#fef3c7":"white", color:form.recurrence===r?"#92400e":"#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
                      {r==="none"?"One-time":r==="weekly"?"Weekly":"Bi-weekly"}
                    </button>
                  ))}
                </div>
                {form.recurrence !== "none" && (
                  <div>
                    <label style={S.label}>Repeat Until *</label>
                    <input style={{ ...S.input, marginBottom:0 }} type="date" value={form.recurrenceEnd} onChange={e=>upd("recurrenceEnd",e.target.value)}/>
                    {form.date && form.recurrenceEnd && (
                      <div style={{ fontSize:11, color:"#6366f1", marginTop:4, fontWeight:600 }}>
                        ≈ {Math.ceil((new Date(form.recurrenceEnd)-new Date(form.date))/(1000*60*60*24)/(form.recurrence==="weekly"?7:14))+1} sessions will be created
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button type="submit" style={{ ...S.primaryBtn, width:"100%" }}>Schedule Session →</button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={S.pageTitle}>Live Session Management</h1>
          <p style={S.pageSub}>
            {sessions.filter(s=>s.status==="upcoming").length} upcoming &nbsp;·&nbsp;
            {sessions.filter(s=>s.status==="live").length} live now &nbsp;·&nbsp;
            {sessions.filter(s=>s.status==="completed").length} completed
          </p>
        </div>
        <button onClick={()=>setAddModal(true)} style={S.primaryBtn}>+ Schedule Session</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:14, marginBottom:20 }}>
        {[
          { icon:"📅", label:"Total Sessions",  val:sessions.length,                                          color:"#f59e0b", bg:"#fef3c7" },
          { icon:"🟢", label:"Live Now",         val:sessions.filter(s=>s.status==="live").length,             color:"#10b981", bg:"#d1fae5" },
          { icon:"⏳", label:"Upcoming",         val:sessions.filter(s=>s.status==="upcoming").length,         color:"#3b82f6", bg:"#dbeafe" },
          { icon:"✅", label:"Completed",        val:sessions.filter(s=>s.status==="completed").length,        color:"#7c3aed", bg:"#ede9fe" },
          { icon:"🎥", label:"Recordings Ready", val:sessions.filter(s=>s.recording).length,                  color:"#ef4444", bg:"#fee2e2" },
          { icon:"🔁", label:"Recurring",        val:sessions.filter(s=>s.recurrence!=="none").length,         color:"#06b6d4", bg:"#cffafe" },
        ].map((k,i)=>(
          <StatCard key={i} icon={k.icon} label={k.label} val={k.val} color={k.color} bg={k.bg}/>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:1, minWidth:200, position:"relative" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:14 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search session, trainer, batch..."
            style={{ ...S.input, paddingLeft:34, marginBottom:0 }}/>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["all","upcoming","live","completed","cancelled"].map(f=>(
            <button key={f} onClick={()=>setStatusFilter(f)}
              style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${statusFilter===f?"#f59e0b":"#e5e7eb"}`, background:statusFilter===f?"#fef3c7":"white", color:statusFilter===f?"#92400e":"#6b7280", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
              {f==="all"?"All":f}
            </button>
          ))}
        </div>
        <select value={batchFilter} onChange={e=>setBatchFilter(e.target.value)} style={{ ...S.input, width:160, marginBottom:0 }}>
          <option value="all">All Batches</option>
          {BATCHES.map(b=><option key={b}>{b}</option>)}
        </select>
      </div>

      {/* Session Cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {filtered.map((s,i)=>(
          <div key={i} style={{ background:"white", borderRadius:16, padding:"16px 20px", border:`1px solid ${s.status==="live"?"#86efac":"#f1f5f9"}`, borderLeft:`4px solid ${statusColor[s.status]||"#e5e7eb"}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>

              {/* Platform icon */}
              <div style={{ width:48, height:48, borderRadius:12, background:statusBg[s.status]||"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                {platformIcon[s.platform]||"📹"}
              </div>

              {/* Info */}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>{s.title}</div>
                <div style={{ fontSize:12, color:"#6b7280", marginTop:3, display:"flex", gap:14, flexWrap:"wrap" }}>
                  <span>📅 {s.date} · 🕐 {s.time}</span>
                  <span>⏱ {s.duration} min</span>
                  <span>🗂️ {s.batch}</span>
                  <span>👩‍🏫 {s.trainer}</span>
                  {s.backupTrainer && <span>👥 Backup: {s.backupTrainer}</span>}
                  <span>🪑 {s.attendees}/{s.maxParticipants}</span>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
                  <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:statusBg[s.status], color:statusColor[s.status] }}>{s.status.toUpperCase()}</span>
                  {s.recurrence !== "none" && <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#ede9fe", color:"#6d28d9" }}>🔁 {s.recurrence}</span>}
                  {s.recording  && <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#dbeafe", color:"#1d4ed8" }}>🎥 Recording</span>}
                  {s.feedbackSent && <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#d1fae5", color:"#065f46" }}>💬 Feedback Sent</span>}
                  {s.summary    && <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#ede9fe", color:"#6d28d9" }}>🤖 AI Summary</span>}
                  {!s.reminderSent24h && s.status==="upcoming" && <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#fef3c7", color:"#92400e" }}>⏰ Reminder Pending</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap" }}>
                <button onClick={()=>{ setSelected(s); setView("detail"); }} style={{ ...S.tblBtn, color:"#2563eb", borderColor:"#93c5fd" }}>👁 View</button>
                {s.status === "upcoming" && <>
                  <button onClick={()=>updateSession(s.id,{status:"live"})} style={{ ...S.btnGreen, fontSize:11 }}>▶ Start</button>
                  {!s.reminderSent24h && <button onClick={()=>sendReminder(s.id,"24h")} style={{ ...S.tblBtn, fontSize:11 }}>🔔 Remind</button>}
                </>}
                {s.status === "live" && (
                  <button onClick={()=>updateSession(s.id,{status:"completed"})} style={{ ...S.btnOrange, fontSize:11 }}>■ End</button>
                )}
                {s.status === "completed" && (
                  <button onClick={()=>{ setPostForm({ recording:s.recording||"", newMaterial:"", feedbackMsg:"", summary:s.summary||"" }); setPostModal(s); }}
                    style={{ ...S.tblBtn, color:"#7c3aed", borderColor:"#c4b5fd", fontSize:11 }}>📋 Post-Tasks</button>
                )}
                <button onClick={()=>{ setSessions(prev=>prev.filter(x=>x.id!==s.id)); setToast({ msg:"Session deleted.", type:"error" }); }}
                  style={{ ...S.tblBtn, color:"#dc2626", borderColor:"#fca5a5", fontSize:11 }}>🗑</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:60, color:"#9ca3af" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📅</div>
            <div style={{ fontSize:14, fontWeight:700 }}>No sessions found</div>
          </div>
        )}
      </div>
    </div>
  );
}