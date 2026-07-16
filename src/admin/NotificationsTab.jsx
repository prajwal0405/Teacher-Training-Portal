import { useState } from "react";
import { Modal, S, Toast } from "../components/Shared";
import { MOCK_CHANNEL_CONFIG, MOCK_NOTIFICATION_LOG, MOCK_NOTIFICATION_TEMPLATES } from "../data/mockData";
import { NT_BTN_GHOST, NT_BTN_PRIMARY, NT_CLOSE, NT_HDR, NT_MODAL, NT_OVERLAY } from "./adminStyles";
/* ── A10: Notifications ── */
export default function NotificationsTab({ teachers, setToast }) {
  const [activeTab,      setActiveTab]      = useState("compose");
  const [templates,      setTemplates]      = useState(MOCK_NOTIFICATION_TEMPLATES);
  const [notifLog,       setNotifLog]       = useState(MOCK_NOTIFICATION_LOG);
  const [channelConfig,  setChannelConfig]  = useState(MOCK_CHANNEL_CONFIG);
 
  // Compose state
  const [channels,       setChannels]       = useState(["email"]);
  const [audience,       setAudience]       = useState("all");
  const [courseAudience, setCourseAudience] = useState("");
  const [batchAudience,  setBatchAudience]  = useState("");
  const [subject,        setSubject]        = useState("");
  const [subjectB,       setSubjectB]       = useState("");     // A/B test
  const [body,           setBody]           = useState("");
  const [scheduleMode,   setScheduleMode]   = useState("now");  // now | scheduled
  const [schedDate,      setSchedDate]      = useState("");
  const [schedTime,      setSchedTime]      = useState("");
  const [abTest,         setAbTest]         = useState(false);
  const [sending,        setSending]        = useState(false);
  const [sentAnim,       setSentAnim]       = useState(false);
 
  // Template edit
  const [editTemplate,   setEditTemplate]   = useState(null);
 
  // Channel config edit
  const [editChannel,    setEditChannel]    = useState(null);
  const [chanFormData,   setChanFormData]   = useState({});
 
  const ALL_COURSES = [...new Set(teachers.map(t => t.course).filter(Boolean))];
  const ALL_BATCHES = [...new Set(teachers.map(t => t.batch).filter(Boolean))];
 
  const CHANNEL_META = {
    email:    { icon:"📧", label:"Email",    color:"#3b82f6", provider:"SendGrid / AWS SES / SMTP"     },
    sms:      { icon:"💬", label:"SMS",      color:"#10b981", provider:"Twilio / MSG91"                },
    "in-app": { icon:"🔔", label:"In-App",   color:"#8b5cf6", provider:"Built-in Push"                },
    whatsapp: { icon:"💚", label:"WhatsApp", color:"#25d366", provider:"WhatsApp Business API"         },
  };
 
  const getAudienceCount = () => {
    if (audience === "all")    return teachers.length;
    if (audience === "course") return teachers.filter(t => t.course === courseAudience).length;
    if (audience === "batch")  return teachers.filter(t => t.batch  === batchAudience).length;
    if (audience === "approved") return teachers.filter(t => t.status === "approved").length;
    if (audience === "pending")  return teachers.filter(t => t.status === "pending").length;
    return 0;
  };
 
  const toggleChannel = ch => setChannels(p => p.includes(ch) ? p.filter(x => x !== ch) : [...p, ch]);
 
  const handleSend = async () => {
    if (!subject || !body)    { setToast({ msg:"Fill subject and message.", type:"error" }); return; }
    if (channels.length === 0){ setToast({ msg:"Select at least one channel.", type:"error" }); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 1800));
    const count = getAudienceCount();
    const now   = new Date().toLocaleString("en-IN");
    // Add to log
    const newEntries = Array.from({ length: Math.min(count, 5) }, (_, i) => ({
      id: Date.now() + i,
      type: "Manual Broadcast",
      recipient: teachers[i]?.name || `Teacher ${i+1}`,
      channel: channels[0],
      subject,
      sentAt: now,
      status: "delivered",
      opened: false,
      clicked: false,
    }));
    setNotifLog(p => [...newEntries, ...p]);
    setSending(false);
    setSentAnim(true);
    setTimeout(() => setSentAnim(false), 3000);
    setToast({ msg: `${scheduleMode === "now" ? "Sent" : "Scheduled"} to ${count} teachers via ${channels.join(", ")}! 📨`, type:"success" });
    setSubject(""); setBody(""); setSubjectB(""); setAbTest(false);
  };
 
  // Delivery stats
  const deliveryStats = {
    sent:      notifLog.length,
    delivered: notifLog.filter(n => n.status === "delivered").length,
    opened:    notifLog.filter(n => n.opened).length,
    clicked:   notifLog.filter(n => n.clicked).length,
    bounced:   notifLog.filter(n => n.status === "bounced").length,
  };
  const openRate  = deliveryStats.delivered > 0 ? Math.round((deliveryStats.opened   / deliveryStats.delivered) * 100) : 0;
  const clickRate = deliveryStats.opened    > 0 ? Math.round((deliveryStats.clicked  / deliveryStats.opened)    * 100) : 0;
 
  // ─────────────────────────────────────────────
  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
 
      {/* Template Edit Modal */}
      {editTemplate && (
        <div style={NT_OVERLAY}>
          <div style={NT_MODAL}>
            <div style={NT_HDR}>
              <span style={{ fontSize:15, fontWeight:800 }}>✏️ Edit Template — {editTemplate.type}</span>
              <button onClick={() => setEditTemplate(null)} style={NT_CLOSE}>✕</button>
            </div>
            <div style={{ padding:"20px 24px 24px", overflowY:"auto", maxHeight:"75vh" }}>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Notification Type</label>
                <input style={{ ...S.input, background:"#f9fafb", color:"#9ca3af" }} value={editTemplate.type} readOnly />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Trigger</label>
                <input style={S.input} value={editTemplate.trigger}
                  onChange={e => setEditTemplate(t => ({ ...t, trigger:e.target.value }))} />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Subject Line</label>
                <input style={S.input} value={editTemplate.subject}
                  onChange={e => setEditTemplate(t => ({ ...t, subject:e.target.value }))} />
                <div style={{ fontSize:10, color:"#9ca3af", marginTop:3 }}>
                  Variables: {"{{name}}, {{course}}, {{batch}}, {{sessionTitle}}, {{dueDate}}, {{downloadLink}}"}
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={S.label}>Message Body</label>
                <textarea style={{ ...S.input, height:120, resize:"vertical" }} value={editTemplate.body}
                  onChange={e => setEditTemplate(t => ({ ...t, body:e.target.value }))} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={S.label}>Channels</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {Object.entries(CHANNEL_META).map(([ch, meta]) => (
                    <button key={ch} onClick={() => setEditTemplate(t => ({
                      ...t,
                      channel: t.channel.includes(ch) ? t.channel.filter(x => x !== ch) : [...t.channel, ch]
                    }))}
                      style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${editTemplate.channel.includes(ch) ? meta.color : "#e5e7eb"}`, background:editTemplate.channel.includes(ch) ? `${meta.color}15` : "white", color:editTemplate.channel.includes(ch) ? meta.color : "#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      {meta.icon} {meta.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => {
                  setTemplates(p => p.map(t => t.id === editTemplate.id ? editTemplate : t));
                  setEditTemplate(null);
                  setToast({ msg:"Template saved!", type:"success" });
                }} style={{ ...NT_BTN_PRIMARY, flex:1 }}>💾 Save Template</button>
                <button onClick={() => setEditTemplate(null)} style={{ ...NT_BTN_GHOST, flex:1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Channel Config Modal */}
      {editChannel && (
        <div style={NT_OVERLAY}>
          <div style={{ ...NT_MODAL, maxWidth:480 }}>
            <div style={NT_HDR}>
              <span style={{ fontSize:15, fontWeight:800 }}>
                {CHANNEL_META[editChannel]?.icon} Configure {CHANNEL_META[editChannel]?.label}
              </span>
              <button onClick={() => setEditChannel(null)} style={NT_CLOSE}>✕</button>
            </div>
            <div style={{ padding:"20px 24px 24px" }}>
              {editChannel === "email" && (
                <div>
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Provider</label>
                    <select style={S.input} value={chanFormData.provider || channelConfig.email.provider}
                      onChange={e => setChanFormData(p => ({ ...p, provider:e.target.value }))}>
                      {["SendGrid","AWS SES","SMTP","Mailgun"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>API Key</label>
                    <input style={S.input} type="password" placeholder="••••••••••••••••"
                      value={chanFormData.apiKey || ""}
                      onChange={e => setChanFormData(p => ({ ...p, apiKey:e.target.value }))} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    <div>
                      <label style={S.label}>From Name</label>
                      <input style={S.input} value={chanFormData.fromName || channelConfig.email.fromName}
                        onChange={e => setChanFormData(p => ({ ...p, fromName:e.target.value }))} />
                    </div>
                    <div>
                      <label style={S.label}>From Email</label>
                      <input style={S.input} type="email" value={chanFormData.fromEmail || channelConfig.email.fromEmail}
                        onChange={e => setChanFormData(p => ({ ...p, fromEmail:e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}
              {editChannel === "sms" && (
                <div>
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Provider</label>
                    <select style={S.input} value={chanFormData.provider || channelConfig.sms.provider}
                      onChange={e => setChanFormData(p => ({ ...p, provider:e.target.value }))}>
                      {["MSG91","Twilio","TextLocal","Kaleyra"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>API Key</label>
                    <input style={S.input} type="password" placeholder="••••••••••••••••"
                      onChange={e => setChanFormData(p => ({ ...p, apiKey:e.target.value }))} />
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Sender ID</label>
                    <input style={S.input} value={chanFormData.senderId || channelConfig.sms.senderId}
                      onChange={e => setChanFormData(p => ({ ...p, senderId:e.target.value }))} placeholder="SPCEDU" />
                  </div>
                </div>
              )}
              {editChannel === "whatsapp" && (
                <div>
                  <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#166534" }}>
                    💚 WhatsApp Business API — requires Meta Business account verification.
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Access Token</label>
                    <input style={S.input} type="password" placeholder="••••••••••••••••"
                      onChange={e => setChanFormData(p => ({ ...p, token:e.target.value }))} />
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Phone Number ID</label>
                    <input style={S.input} value={chanFormData.phoneNumberId || channelConfig.whatsapp.phoneNumberId}
                      onChange={e => setChanFormData(p => ({ ...p, phoneNumberId:e.target.value }))} />
                  </div>
                </div>
              )}
              {editChannel === "in-app" && (
                <div style={{ textAlign:"center", padding:20 }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>🔔</div>
                  <div style={{ fontSize:13, color:"#374151", fontWeight:600, marginBottom:6 }}>Built-in Push Notifications</div>
                  <div style={{ fontSize:12, color:"#9ca3af" }}>In-app notifications are handled natively. No external configuration required.</div>
                </div>
              )}
              <div style={{ display:"flex", gap:10, marginTop:16 }}>
                <button onClick={() => {
                  setChannelConfig(p => ({ ...p, [editChannel]: { ...p[editChannel], ...chanFormData, connected:true } }));
                  setEditChannel(null);
                  setChanFormData({});
                  setToast({ msg:`${CHANNEL_META[editChannel]?.label} channel configured!`, type:"success" });
                }} style={{ ...NT_BTN_PRIMARY, flex:1 }}>💾 Save Configuration</button>
                <button onClick={() => { setEditChannel(null); setChanFormData({}); }} style={{ ...NT_BTN_GHOST, flex:1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={S.pageTitle}>Notifications Management</h1>
          <p style={S.pageSub}>Email · SMS · In-App · WhatsApp — templates, bulk messaging & delivery reports</p>
        </div>
      </div>
 
      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { icon:"📤", label:"Sent",      val:deliveryStats.sent,      color:"#f59e0b", bg:"#fef9c3" },
          { icon:"✅", label:"Delivered", val:deliveryStats.delivered, color:"#10b981", bg:"#d1fae5" },
          { icon:"👁", label:"Open Rate", val:`${openRate}%`,          color:"#3b82f6", bg:"#dbeafe" },
          { icon:"🖱", label:"Click Rate",val:`${clickRate}%`,         color:"#8b5cf6", bg:"#ede9fe" },
          { icon:"⚠️", label:"Bounced",   val:deliveryStats.bounced,   color:"#ef4444", bg:"#fee2e2" },
        ].map((k,i) => (
          <div key={i} style={{ background:"white", borderRadius:12, padding:"12px 14px", border:`1px solid ${k.color}30`, borderLeft:`3px solid ${k.color}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.val}</div>
            <div style={{ fontSize:10, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:".3px" }}>{k.label}</div>
          </div>
        ))}
      </div>
 
      {/* Sub Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:18, borderBottom:"2px solid #f3f4f6" }}>
        {[
          { key:"compose",   label:"✉️ Compose & Send"    },
          { key:"templates", label:"📋 Templates"         },
          { key:"channels",  label:"⚙️ Channel Config"    },
          { key:"reports",   label:"📊 Delivery Reports"  },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding:"10px 18px", border:"none", borderBottom:`2px solid ${activeTab===t.key?"#f59e0b":"transparent"}`, background:"none", color:activeTab===t.key?"#92400e":"#9ca3af", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:-2 }}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ── COMPOSE TAB ── */}
      {activeTab === "compose" && (
        <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:20 }}>
          {/* Compose form */}
          <div style={{ background:"white", borderRadius:16, padding:22, border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#0f172a", marginBottom:16 }}>✉️ New Notification</div>
 
            {/* Channel selector */}
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Send via (select multiple)</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {Object.entries(CHANNEL_META).map(([ch, meta]) => {
                  const cfg = channelConfig[ch === "in-app" ? "inapp" : ch];
                  const connected = ch === "in-app" ? true : cfg?.connected;
                  return (
                    <button key={ch} onClick={() => connected && toggleChannel(ch)}
                      title={!connected ? "Not configured — go to Channel Config" : ""}
                      style={{ padding:"8px 14px", borderRadius:9, border:`1.5px solid ${channels.includes(ch) ? meta.color : "#e5e7eb"}`, background:channels.includes(ch) ? `${meta.color}15` : connected ? "white" : "#f9fafb", color:channels.includes(ch) ? meta.color : connected ? "#6b7280" : "#d1d5db", fontSize:12, fontWeight:700, cursor:connected ? "pointer" : "not-allowed", fontFamily:"inherit", position:"relative" }}>
                      {meta.icon} {meta.label}
                      {!connected && <span style={{ fontSize:9, marginLeft:4 }}>🔴</span>}
                    </button>
                  );
                })}
              </div>
            </div>
 
            {/* Audience */}
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Send To</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
                {[
                  { val:"all",      label:`All Teachers (${teachers.length})`                                        },
                  { val:"approved", label:`Active Only (${teachers.filter(t=>t.status==="approved").length})`         },
                  { val:"pending",  label:`Pending (${teachers.filter(t=>t.status==="pending").length})`              },
                  { val:"course",   label:"By Course"                                                                 },
                  { val:"batch",    label:"By Batch"                                                                  },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setAudience(opt.val)}
                    style={{ padding:"8px 12px", borderRadius:8, border:`1.5px solid ${audience===opt.val?"#f59e0b":"#e5e7eb"}`, background:audience===opt.val?"#fef3c7":"white", color:audience===opt.val?"#92400e":"#6b7280", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {audience === "course" && (
                <select style={{ ...S.input, marginBottom:0 }} value={courseAudience} onChange={e => setCourseAudience(e.target.value)}>
                  <option value="">Select course...</option>
                  {ALL_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {audience === "batch" && (
                <select style={{ ...S.input, marginBottom:0 }} value={batchAudience} onChange={e => setBatchAudience(e.target.value)}>
                  <option value="">Select batch...</option>
                  {ALL_BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
              <div style={{ fontSize:12, color:"#9ca3af", marginTop:6 }}>
                📨 Reaching <b style={{ color:"#f59e0b" }}>{getAudienceCount()} teachers</b>
              </div>
            </div>
 
            {/* Subject with A/B toggle */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <label style={{ ...S.label, margin:0 }}>Subject Line</label>
                <button onClick={() => setAbTest(!abTest)}
                  style={{ padding:"3px 10px", borderRadius:20, border:`1px solid ${abTest?"#8b5cf6":"#e5e7eb"}`, background:abTest?"#ede9fe":"white", color:abTest?"#7c3aed":"#9ca3af", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {abTest ? "🧪 A/B ON" : "🧪 A/B Test"}
                </button>
              </div>
              <input style={{ ...S.input, marginBottom: abTest ? 8 : 0 }} value={subject} onChange={e => setSubject(e.target.value)} placeholder={abTest ? "Version A subject..." : "Notification subject..."} />
              {abTest && (
                <input style={{ ...S.input, marginBottom:0, borderColor:"#c4b5fd" }} value={subjectB} onChange={e => setSubjectB(e.target.value)} placeholder="Version B subject..." />
              )}
              {abTest && (
                <div style={{ fontSize:10, color:"#7c3aed", marginTop:4, fontWeight:600 }}>
                  🧪 A/B test: 50% will receive Version A, 50% Version B. Results shown in Delivery Reports.
                </div>
              )}
            </div>
 
            {/* Message body */}
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Message Body</label>
              <textarea style={{ ...S.input, height:130, resize:"vertical", fontFamily:"inherit", lineHeight:1.6 }}
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="Write your message... Use {{name}}, {{course}}, {{batch}} for personalisation." />
              <div style={{ fontSize:10, color:"#9ca3af", marginTop:3 }}>
                {body.length} chars · Variables: {"{{name}}, {{course}}, {{batch}}, {{dueDate}}"}
              </div>
            </div>
 
            {/* Schedule */}
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Send</label>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                {[["now","Send Now"],["scheduled","Schedule"]].map(([val, label]) => (
                  <button key={val} onClick={() => setScheduleMode(val)}
                    style={{ flex:1, padding:"8px", borderRadius:8, border:`1.5px solid ${scheduleMode===val?"#f59e0b":"#e5e7eb"}`, background:scheduleMode===val?"#fef3c7":"white", color:scheduleMode===val?"#92400e":"#6b7280", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    {val === "now" ? "⚡ " : "📅 "}{label}
                  </button>
                ))}
              </div>
              {scheduleMode === "scheduled" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div>
                    <label style={S.label}>Date</label>
                    <input type="date" style={{ ...S.input, marginBottom:0 }} value={schedDate} onChange={e => setSchedDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>Time</label>
                    <input type="time" style={{ ...S.input, marginBottom:0 }} value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
 
            {/* Send button */}
            {sentAnim ? (
              <div style={{ background:"#d1fae5", border:"1px solid #86efac", borderRadius:12, padding:"16px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:4 }}>✅</div>
                <div style={{ fontSize:13, fontWeight:800, color:"#065f46" }}>
                  {scheduleMode === "now" ? "Sent successfully!" : "Scheduled!"}
                </div>
              </div>
            ) : (
              <button onClick={handleSend} disabled={sending}
                style={{ ...NT_BTN_PRIMARY, width:"100%", padding:"12px", fontSize:14, opacity:sending?0.7:1 }}>
                {sending ? "⏳ Sending..." : scheduleMode === "now" ? `📤 Send to ${getAudienceCount()} Teachers` : `📅 Schedule for ${schedDate} ${schedTime}`}
              </button>
            )}
          </div>
 
          {/* Quick templates panel */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:"white", borderRadius:16, padding:20, border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#0f172a", marginBottom:14 }}>⚡ Quick Templates</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {templates.filter(t => t.active).slice(0,6).map(t => (
                  <div key={t.id} onClick={() => { setSubject(t.subject); setBody(t.body); setChannels(t.channel); }}
                    style={{ padding:"12px 14px", background:"#f9fafb", borderRadius:10, cursor:"pointer", border:"1px solid #f3f4f6", transition:"all .15s" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{t.type}</div>
                      <div style={{ display:"flex", gap:4 }}>
                        {t.channel.map(ch => (
                          <span key={ch} style={{ fontSize:14 }}>{CHANNEL_META[ch]?.icon || "📢"}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{t.trigger}</div>
                  </div>
                ))}
              </div>
            </div>
 
            {/* Channel status */}
            <div style={{ background:"white", borderRadius:16, padding:20, border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#0f172a", marginBottom:12 }}>⚙️ Channel Status</div>
              {Object.entries(CHANNEL_META).map(([ch, meta]) => {
                const cfgKey = ch === "in-app" ? "inapp" : ch;
                const cfg = channelConfig[cfgKey];
                const connected = ch === "in-app" ? true : cfg?.connected;
                return (
                  <div key={ch} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #f9fafb" }}>
                    <span style={{ fontSize:18 }}>{meta.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>{meta.label}</div>
                      <div style={{ fontSize:10, color:"#9ca3af" }}>{ch !== "in-app" ? cfg?.provider : "Built-in"}</div>
                    </div>
                    <span style={{ padding:"2px 9px", borderRadius:20, fontSize:10, fontWeight:700, background:connected?"#d1fae5":"#fee2e2", color:connected?"#059669":"#dc2626" }}>
                      {connected ? "✓ Connected" : "✕ Not Connected"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
 
      {/* ── TEMPLATES TAB ── */}
      {activeTab === "templates" && (
        <div>
          <div style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>
            Manage auto-triggered notification templates. Click Edit to customise any template.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {templates.map(t => (
              <div key={t.id} style={{ background:"white", borderRadius:14, padding:"16px 20px", border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:t.active?"#fef3c7":"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {t.channel[0] ? CHANNEL_META[t.channel[0]]?.icon : "📢"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>{t.type}</div>
                    {t.channel.map(ch => (
                      <span key={ch} style={{ padding:"1px 7px", borderRadius:20, fontSize:10, fontWeight:700, background:`${CHANNEL_META[ch]?.color}15`, color:CHANNEL_META[ch]?.color || "#6b7280" }}>
                        {CHANNEL_META[ch]?.icon} {CHANNEL_META[ch]?.label}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:"#9ca3af" }}>🔁 {t.trigger}</div>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>Subject: {t.subject}</div>
                </div>
                <div style={{ textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:"#0f172a" }}>{t.sentCount}</div>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>sent</div>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>{t.lastSent}</div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  {/* Toggle active */}
                  <div onClick={() => setTemplates(p => p.map(x => x.id===t.id ? {...x,active:!x.active} : x))}
                    style={{ width:40, height:22, borderRadius:11, background:t.active?"#10b981":"#e5e7eb", position:"relative", cursor:"pointer", transition:"background .3s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:2, left:t.active?18:2, width:18, height:18, borderRadius:"50%", background:"white", transition:"left .3s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
                  </div>
                  <button onClick={() => setEditTemplate({ ...t })} style={NT_BTN_GHOST}>✏️ Edit</button>
                  <button onClick={() => { setSubject(t.subject); setBody(t.body); setChannels(t.channel); setActiveTab("compose"); setToast({ msg:"Template loaded in Compose!", type:"success" }); }}
                    style={NT_BTN_PRIMARY}>Use →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* ── CHANNEL CONFIG TAB ── */}
      {activeTab === "channels" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
          {Object.entries(CHANNEL_META).map(([ch, meta]) => {
            const cfgKey = ch === "in-app" ? "inapp" : ch;
            const cfg    = channelConfig[cfgKey];
            const connected = ch === "in-app" ? true : cfg?.connected;
            return (
              <div key={ch} style={{ background:"white", borderRadius:16, padding:20, border:`1px solid ${meta.color}30`, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:`${meta.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{meta.icon}</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:"#0f172a" }}>{meta.label}</div>
                    <div style={{ fontSize:11, color:"#9ca3af" }}>{meta.provider}</div>
                  </div>
                  <span style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, background:connected?"#d1fae5":"#fee2e2", color:connected?"#059669":"#dc2626" }}>
                    {connected ? "✓ Live" : "✕ Off"}
                  </span>
                </div>
 
                {ch !== "in-app" && cfg && (
                  <div style={{ background:"#f9fafb", borderRadius:10, padding:"10px 12px", marginBottom:12, fontSize:11, color:"#6b7280" }}>
                    <div>Provider: <b>{cfg.provider}</b></div>
                    {cfg.fromEmail && <div>From: <b>{cfg.fromEmail}</b></div>}
                    {cfg.senderId  && <div>Sender ID: <b>{cfg.senderId}</b></div>}
                    {cfg.phoneNumberId && <div>Phone ID: <b>{cfg.phoneNumberId}</b></div>}
                  </div>
                )}
 
                {ch === "whatsapp" && !connected && (
                  <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:11, color:"#166534" }}>
                    💚 Optional advanced feature. Requires Meta Business verification.
                  </div>
                )}
 
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { setEditChannel(ch); setChanFormData({}); }}
                    style={{ ...NT_BTN_PRIMARY, flex:1 }}>{connected ? "⚙️ Reconfigure" : "🔗 Connect"}</button>
                  {connected && ch !== "in-app" && (
                    <button onClick={() => {
                      setChannelConfig(p => ({ ...p, [cfgKey]: { ...p[cfgKey], connected:false } }));
                      setToast({ msg:`${meta.label} disconnected.`, type:"error" });
                    }} style={{ ...NT_BTN_GHOST, color:"#dc2626", borderColor:"#fca5a5" }}>Disconnect</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
 
      {/* ── DELIVERY REPORTS TAB ── */}
      {activeTab === "reports" && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          {/* Summary bars */}
          <div style={{ background:"white", borderRadius:16, padding:20, border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#0f172a", marginBottom:16 }}>📊 Delivery Performance</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
              {[
                { label:"Delivery Rate", val:deliveryStats.delivered, total:deliveryStats.sent,      pct:Math.round((deliveryStats.delivered/Math.max(deliveryStats.sent,1))*100), color:"#10b981" },
                { label:"Open Rate",     val:deliveryStats.opened,    total:deliveryStats.delivered, pct:openRate,  color:"#3b82f6" },
                { label:"Click Rate",    val:deliveryStats.clicked,   total:deliveryStats.opened,    pct:clickRate, color:"#8b5cf6" },
                { label:"Bounce Rate",   val:deliveryStats.bounced,   total:deliveryStats.sent,      pct:Math.round((deliveryStats.bounced/Math.max(deliveryStats.sent,1))*100), color:"#ef4444" },
              ].map((stat,i) => (
                <div key={i} style={{ padding:14, background:"#f9fafb", borderRadius:12, border:"1px solid #f3f4f6" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>{stat.label}</span>
                    <span style={{ fontSize:16, fontWeight:900, color:stat.color }}>{stat.pct}%</span>
                  </div>
                  <div style={{ height:6, background:"#e5e7eb", borderRadius:4, overflow:"hidden", marginBottom:4 }}>
                    <div style={{ height:"100%", width:`${stat.pct}%`, background:stat.color, borderRadius:4 }} />
                  </div>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>{stat.val} of {stat.total}</div>
                </div>
              ))}
            </div>
          </div>
 
          {/* A/B Test results simulation */}
          <div style={{ background:"white", borderRadius:16, padding:20, border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#0f172a", marginBottom:14 }}>🧪 A/B Test Results</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[
                { label:"Version A", subject:"Live Session Tomorrow: Classroom Management", openRate:68, clickRate:42, sent:Math.floor(getAudienceCount()/2), winner:true  },
                { label:"Version B", subject:"Don't Miss Tomorrow's Live Session!",         openRate:54, clickRate:35, sent:Math.ceil(getAudienceCount()/2),  winner:false },
              ].map((v,i) => (
                <div key={i} style={{ padding:16, background:v.winner?"#ecfdf5":"#f9fafb", borderRadius:12, border:`1.5px solid ${v.winner?"#86efac":"#f3f4f6"}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:800, color:"#0f172a" }}>{v.label}</span>
                    {v.winner && <span style={{ padding:"2px 9px", borderRadius:20, fontSize:10, fontWeight:700, background:"#d1fae5", color:"#059669" }}>🏆 Winner</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#6b7280", marginBottom:10, fontStyle:"italic" }}>"{v.subject}"</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {[{l:"Sent",v:v.sent,c:"#374151"},{l:"Open Rate",v:`${v.openRate}%`,c:"#3b82f6"},{l:"Click Rate",v:`${v.clickRate}%`,c:"#8b5cf6"}].map((s,j) => (
                      <div key={j} style={{ textAlign:"center", background:"white", borderRadius:8, padding:"8px 4px" }}>
                        <div style={{ fontSize:14, fontWeight:800, color:s.c }}>{s.v}</div>
                        <div style={{ fontSize:9, color:"#9ca3af", fontWeight:600, textTransform:"uppercase" }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          {/* Notification log table */}
          <div style={{ background:"white", borderRadius:16, border:"1px solid #f1f5f9", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#0f172a" }}>📋 Notification Log ({notifLog.length})</div>
              <button onClick={() => {
                const csv = [["Recipient","Type","Channel","Subject","Sent At","Status","Opened","Clicked"],
                  ...notifLog.map(n => [n.recipient,n.type,n.channel,n.subject,n.sentAt,n.status,n.opened?"Yes":"No",n.clicked?"Yes":"No"])
                ].map(r => r.map(v=>`"${v}"`).join(",")).join("\n");
                const a = document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURI(csv); a.download="notification_log.csv"; a.click();
                setToast({ msg:"Log exported!", type:"success" });
              }} style={NT_BTN_GHOST}>⬇ Export CSV</button>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#f9fafb", borderBottom:"1px solid #f1f5f9" }}>
                    {["Recipient","Type","Channel","Subject","Sent At","Status","Opened","Clicked"].map(h => (
                      <th key={h} style={{ padding:"10px 12px", fontSize:10.5, fontWeight:700, color:"#9ca3af", textAlign:"left", textTransform:"uppercase", letterSpacing:".4px", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {notifLog.map((n,i) => (
                    <tr key={n.id} style={{ borderBottom:"1px solid #f9fafb", background:i%2===0?"white":"#fafafa" }}>
                      <td style={{ padding:"10px 12px", fontSize:13, fontWeight:700, color:"#0f172a" }}>{n.recipient}</td>
                      <td style={{ padding:"10px 12px", fontSize:11, color:"#6b7280" }}>{n.type}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <span style={{ fontSize:14 }}>{CHANNEL_META[n.channel]?.icon || "📢"}</span>
                        <span style={{ fontSize:11, color:"#6b7280", marginLeft:4 }}>{CHANNEL_META[n.channel]?.label || n.channel}</span>
                      </td>
                      <td style={{ padding:"10px 12px", fontSize:11, color:"#374151", maxWidth:160, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.subject}</td>
                      <td style={{ padding:"10px 12px", fontSize:11, color:"#9ca3af" }}>{n.sentAt}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <span style={{ padding:"2px 9px", borderRadius:20, fontSize:10, fontWeight:700, background:n.status==="delivered"?"#d1fae5":"#fee2e2", color:n.status==="delivered"?"#059669":"#dc2626" }}>
                          {n.status}
                        </span>
                      </td>
                      <td style={{ padding:"10px 12px", textAlign:"center" }}>
                        <span style={{ fontSize:14 }}>{n.opened ? "👁" : "—"}</span>
                      </td>
                      <td style={{ padding:"10px 12px", textAlign:"center" }}>
                        <span style={{ fontSize:14 }}>{n.clicked ? "🖱" : "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
