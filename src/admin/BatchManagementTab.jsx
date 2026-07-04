import { useState } from "react";
import { Modal, S, Toast } from "../components/Shared";
import { CLOSE_BTN, MODAL_BOX, MODAL_HDR, MODAL_OVERLAY } from "./adminStyles";
/* ── A4: Batch Management ── */
export default function BatchManagementTab({ batches, setBatches, teachers, setToast }) {
  // ── View state ──
  const [view, setView]           = useState("grid");   // "grid" | "detail" | "calendar"
  const [selected, setSelected]   = useState(null);
  const [addModal, setAddModal]   = useState(false);
  const [cloneTarget, setClone]   = useState(null);
  const [broadcastId, setBcastId] = useState(null);
  const [bcastMsg, setBcastMsg]   = useState("");
  const [statusFilter, setStatusF]= useState("all");
 
  // ── Form state ──
  const emptyForm = {
    name: "", course: "", start: "", end: "", capacity: "",
    mode: "Online", platform: "Zoom", meetingLink: "",
    trainer: "", coTrainer: "", status: "upcoming", autoEnroll: false,
  };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
 
  // ── Schedule state (for detail view) ──
  const [schedForm, setSchedForm] = useState({ title: "", date: "", time: "", type: "session", duration: 60 });
 
  const filtered = statusFilter === "all"
    ? batches
    : batches.filter(b => b.status === statusFilter);
 
  const statusColor  = { upcoming: "#2563eb", active: "#059669", completed: "#7c3aed", cancelled: "#dc2626" };
  const statusBg     = { upcoming: "#dbeafe", active: "#d1fae5", completed: "#ede9fe", cancelled: "#fee2e2" };
  const modeIcon     = { Online: "🖥️", Offline: "🏫", Hybrid: "🔀" };
 
  // ── Helpers ──
  const pct = b => b.capacity ? Math.round((b.enrolled / b.capacity) * 100) : 0;
  const heatColor = p => p >= 90 ? "#ef4444" : p >= 70 ? "#f59e0b" : "#10b981";
 
  const enrolledTeachers = b =>
    (teachers || []).filter(t => (b.teachers || []).includes(t.id));
 
  // ── Actions ──
  const handleCreate = e => {
    e.preventDefault();
    if (!form.name || !form.course || !form.start) {
      setToast({ msg: "Fill required fields (Name, Course, Start Date).", type: "error" });
      return;
    }
    const newBatch = {
      id: Date.now(),
      ...form,
      capacity: Number(form.capacity) || 30,
      enrolled: 0,
      schedule: [],
      teachers: [],
    };
    setBatches(p => [...p, newBatch]);
    setToast({ msg: "Batch created!", type: "success" });
    setAddModal(false);
    setForm(emptyForm);
  };
 
  const handleClone = () => {
    if (!cloneTarget) return;
    const clone = {
      ...cloneTarget,
      id: Date.now(),
      name: `${cloneTarget.name} (Copy)`,
      start: "",
      end: "",
      status: "upcoming",
      enrolled: 0,
      teachers: [],
      schedule: [],
    };
    setBatches(p => [...p, clone]);
    setToast({ msg: `"${cloneTarget.name}" cloned! Update dates.`, type: "success" });
    setClone(null);
  };
 
  const changeStatus = (id, status) => {
    setBatches(p => p.map(b => b.id === id ? { ...b, status } : b));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
    setToast({ msg: `Status updated to ${status}.`, type: "success" });
  };
 
  const addScheduleItem = () => {
    if (!schedForm.title || !schedForm.date) {
      setToast({ msg: "Fill title and date.", type: "error" });
      return;
    }
    const item = { id: Date.now(), ...schedForm };
    setBatches(p => p.map(b =>
      b.id === selected.id ? { ...b, schedule: [...(b.schedule || []), item] } : b
    ));
    setSelected(s => ({ ...s, schedule: [...(s.schedule || []), item] }));
    setSchedForm({ title: "", date: "", time: "", type: "session", duration: 60 });
    setToast({ msg: "Schedule item added!", type: "success" });
  };
 
  const removeScheduleItem = schedId => {
    setBatches(p => p.map(b =>
      b.id === selected.id
        ? { ...b, schedule: b.schedule.filter(s => s.id !== schedId) }
        : b
    ));
    setSelected(s => ({ ...s, schedule: s.schedule.filter(x => x.id !== schedId) }));
  };
 
  const sendBroadcast = () => {
    if (!bcastMsg.trim()) { setToast({ msg: "Message cannot be empty.", type: "error" }); return; }
    setToast({ msg: `Broadcast sent to all teachers in this batch! 📨`, type: "success" });
    setBcastId(null);
    setBcastMsg("");
  };
 
  // ─────────────────────────────────
  //  DETAIL VIEW
  // ─────────────────────────────────
  if (selected && view === "detail") {
    const bt = batches.find(b => b.id === selected.id) || selected;
    const enTeachers = enrolledTeachers(bt);
    const p = pct(bt);
 
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
 
        {/* Broadcast Modal */}
        {broadcastId && (
          <div style={MODAL_OVERLAY}>
            <div style={MODAL_BOX}>
              <div style={MODAL_HDR}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>📢 Broadcast to {bt.name}</span>
                <button onClick={() => setBcastId(null)} style={CLOSE_BTN}>✕</button>
              </div>
              <div style={{ padding: "20px 24px 24px" }}>
                <label style={S.label}>Message *</label>
                <textarea
                  style={{ ...S.input, height: 110, resize: "none", marginBottom: 16 }}
                  value={bcastMsg}
                  onChange={e => setBcastMsg(e.target.value)}
                  placeholder="Write a message to all enrolled teachers..."
                />
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
                  Will be sent to {enTeachers.length} enrolled teacher(s) via in-app + email.
                </div>
                <button onClick={sendBroadcast} style={{ ...S.primaryBtn, width: "100%" }}>
                  📤 Send Broadcast
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* Clone Modal */}
        {cloneTarget && (
          <div style={MODAL_OVERLAY}>
            <div style={{ ...MODAL_BOX, maxWidth: 420 }}>
              <div style={MODAL_HDR}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>🔁 Clone Batch</span>
                <button onClick={() => setClone(null)} style={CLOSE_BTN}>✕</button>
              </div>
              <div style={{ padding: "20px 24px 24px" }}>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                  A copy of <b>{cloneTarget.name}</b> will be created with blank dates and 0 enrollments.
                  You can update the dates after cloning.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleClone} style={{ ...S.primaryBtn, flex: 1 }}>🔁 Clone Now</button>
                  <button onClick={() => setClone(null)} style={{ ...S.tblBtn, flex: 1 }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
 
        {/* Back + Header */}
        <button onClick={() => { setSelected(null); setView("grid"); }} style={S.backBtn}>← Back to Batches</button>
 
        <div style={{ background: "white", borderRadius: 20, padding: 28, border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: statusBg[bt.status] || "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
              {modeIcon[bt.mode] || "🗂️"}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>{bt.name}</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusBg[bt.status], color: statusColor[bt.status] }}>{bt.status.toUpperCase()}</span>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#92400e" }}>{bt.course}</span>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#f3f4f6", color: "#374151" }}>{bt.mode}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setBcastId(bt.id)} style={{ ...S.primaryBtn }}>📢 Broadcast</button>
              <button onClick={() => setClone(bt)} style={{ ...S.exportBtn }}>🔁 Clone</button>
            </div>
          </div>
 
          {/* Status control */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Status Control</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["upcoming", "active", "completed", "cancelled"].map(s => (
                <button key={s} onClick={() => changeStatus(bt.id, s)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${bt.status === s ? statusColor[s] : "#e5e7eb"}`, background: bt.status === s ? statusBg[s] : "white", color: bt.status === s ? statusColor[s] : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
 
          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { icon: "📅", label: "Start Date", val: bt.start },
              { icon: "🏁", label: "End Date", val: bt.end },
              { icon: "🪑", label: "Capacity", val: `${bt.enrolled} / ${bt.capacity} seats` },
              { icon: "🖥️", label: "Platform", val: bt.platform },
              { icon: "👩‍🏫", label: "Trainer", val: bt.trainer || "—" },
              { icon: "👥", label: "Co-Trainer", val: bt.coTrainer || "—" },
            ].map((r, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 13px", border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.icon} {r.val}</div>
              </div>
            ))}
          </div>
 
          {bt.meetingLink && (
            <div style={{ marginTop: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>🔗</span>
              <a href={bt.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>{bt.meetingLink}</a>
            </div>
          )}
 
          {/* Capacity bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#9ca3af", fontWeight: 600 }}>Capacity Utilisation</span>
              <span style={{ fontWeight: 800, color: heatColor(p) }}>{p}%</span>
            </div>
            <div style={{ height: 8, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${p}%`, background: heatColor(p), borderRadius: 6, transition: "width 1s" }} />
            </div>
          </div>
        </div>
 
        {/* Enrolled Teachers */}
        <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>👩‍🏫 Enrolled Teachers ({enTeachers.length})</div>
          {enTeachers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>👥</div>
              <div style={{ fontSize: 12 }}>No teachers enrolled yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {enTeachers.map((t, i) => {
                const progVal = t.attendance || 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f9fafb", borderRadius: 12, border: "1px solid #f3f4f6" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>{t.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.subject} · {t.email}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <div style={{ width: 60, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progVal}%`, background: progVal >= 80 ? "#10b981" : progVal >= 60 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: progVal >= 80 ? "#10b981" : progVal >= 60 ? "#f59e0b" : "#ef4444" }}>{progVal}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
 
        {/* Schedule / Calendar */}
        <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>📅 Batch Schedule</div>
          </div>
 
          {/* Add schedule item */}
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, border: "1px solid #f3f4f6", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 }}>+ Add Schedule Item</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <label style={S.label}>Title *</label>
                <input style={{ ...S.input, marginBottom: 0 }} value={schedForm.title} onChange={e => setSchedForm(f => ({ ...f, title: e.target.value }))} placeholder="Session / Assignment title" />
              </div>
              <div>
                <label style={S.label}>Date *</label>
                <input style={{ ...S.input, marginBottom: 0 }} type="date" value={schedForm.date} onChange={e => setSchedForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Time</label>
                <input style={{ ...S.input, marginBottom: 0 }} type="time" value={schedForm.time} onChange={e => setSchedForm(f => ({ ...f, time: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Type</label>
                <select style={{ ...S.input, marginBottom: 0 }} value={schedForm.type} onChange={e => setSchedForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="session">Session</option>
                  <option value="assignment">Assignment Due</option>
                  <option value="quiz">Quiz</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
              <button onClick={addScheduleItem} style={{ ...S.primaryBtn, height: 38, whiteSpace: "nowrap" }}>+ Add</button>
            </div>
          </div>
 
          {/* Schedule list */}
          {(bt.schedule || []).length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>
              <div style={{ fontSize: 12 }}>No schedule items yet. Add sessions and deadlines above.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...(bt.schedule || [])].sort((a, b) => new Date(a.date) - new Date(b.date)).map((item, i) => {
                const typeColor = { session: "#3b82f6", assignment: "#f59e0b", quiz: "#8b5cf6", holiday: "#10b981" };
                const typeIcon  = { session: "🎥", assignment: "📝", quiz: "🧠", holiday: "🎉" };
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "white", borderRadius: 10, border: `1px solid ${typeColor[item.type] || "#e5e7eb"}20`, borderLeft: `4px solid ${typeColor[item.type] || "#e5e7eb"}` }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{typeIcon[item.type] || "📌"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {item.date}{item.time ? ` · ${item.time}` : ""}{item.duration ? ` · ${item.duration} min` : ""}
                      </div>
                    </div>
                    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${typeColor[item.type]}20`, color: typeColor[item.type] }}>
                      {item.type}
                    </span>
                    <button onClick={() => removeScheduleItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 16, padding: "2px 6px" }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
 
  // ─────────────────────────────────
  //  GRID VIEW (main list)
  // ─────────────────────────────────
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
 
      {/* Clone confirm modal (from grid) */}
      {cloneTarget && (
        <div style={MODAL_OVERLAY}>
          <div style={{ ...MODAL_BOX, maxWidth: 420 }}>
            <div style={MODAL_HDR}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>🔁 Clone Batch</span>
              <button onClick={() => setClone(null)} style={CLOSE_BTN}>✕</button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                A copy of <b>{cloneTarget.name}</b> will be created with blank dates and 0 enrollments.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleClone} style={{ ...S.primaryBtn, flex: 1 }}>🔁 Clone Now</button>
                <button onClick={() => setClone(null)} style={{ ...S.tblBtn, flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Create Batch Modal */}
      {addModal && (
        <div style={MODAL_OVERLAY}>
          <div style={{ ...MODAL_BOX, maxWidth: 680 }}>
            <div style={MODAL_HDR}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>+ Create New Batch</span>
              <button onClick={() => { setAddModal(false); setForm(emptyForm); }} style={CLOSE_BTN}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: "20px 24px 24px", overflowY: "auto", maxHeight: "75vh" }}>
              {/* Row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Batch Name *</label>
                  <input style={S.input} value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Batch A — July 2026" />
                </div>
                <div>
                  <label style={S.label}>Linked Course *</label>
                  <input style={S.input} value={form.course} onChange={e => upd("course", e.target.value)} placeholder="Pre-Primary Teacher Training" />
                </div>
              </div>
              {/* Row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Start Date *</label>
                  <input style={S.input} type="date" value={form.start} onChange={e => upd("start", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>End Date</label>
                  <input style={S.input} type="date" value={form.end} onChange={e => upd("end", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Max Capacity (Seats)</label>
                  <input style={S.input} type="number" value={form.capacity} onChange={e => upd("capacity", e.target.value)} placeholder="30" />
                </div>
              </div>
              {/* Row 3 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Mode</label>
                  <select style={S.input} value={form.mode} onChange={e => upd("mode", e.target.value)}>
                    {["Online", "Offline", "Hybrid"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Platform</label>
                  <select style={S.input} value={form.platform} onChange={e => upd("platform", e.target.value)}>
                    {["Zoom", "Google Meet", "Microsoft Teams", "In-Person", "Other"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Initial Status</label>
                  <select style={S.input} value={form.status} onChange={e => upd("status", e.target.value)}>
                    {["upcoming", "active", "completed", "cancelled"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              {/* Meeting Link */}
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Meeting Link</label>
                <input style={S.input} value={form.meetingLink} onChange={e => upd("meetingLink", e.target.value)} placeholder="https://zoom.us/j/..." />
              </div>
              {/* Trainers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Primary Trainer</label>
                  <input style={S.input} value={form.trainer} onChange={e => upd("trainer", e.target.value)} placeholder="Dr. Rekha Iyer" />
                </div>
                <div>
                  <label style={S.label}>Co-Trainer (optional)</label>
                  <input style={S.input} value={form.coTrainer} onChange={e => upd("coTrainer", e.target.value)} placeholder="Prof. Amol Desai" />
                </div>
              </div>
              {/* Auto-enroll */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6", marginBottom: 20 }}>
                <div
                  onClick={() => upd("autoEnroll", !form.autoEnroll)}
                  style={{ width: 42, height: 24, borderRadius: 12, background: form.autoEnroll ? "#10b981" : "#e5e7eb", position: "relative", cursor: "pointer", transition: "background .3s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: form.autoEnroll ? 18 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left .3s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Auto-Enroll Waiting Teachers</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Automatically enroll registered teachers waiting for this course</div>
                </div>
              </div>
              <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>Create Batch →</button>
            </form>
          </div>
        </div>
      )}
 
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Batch Management</h1>
          <p style={S.pageSub}>
            {batches.length} batches · {batches.filter(b => b.status === "active").length} active · {batches.filter(b => b.status === "upcoming").length} upcoming
          </p>
        </div>
        <button onClick={() => setAddModal(true)} style={S.primaryBtn}>+ Create Batch</button>
      </div>
 
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { icon: "🗂️", label: "Total Batches", val: batches.length,                                         color: "#f59e0b", bg: "#fef3c7" },
          { icon: "✅", label: "Active",         val: batches.filter(b => b.status === "active").length,     color: "#10b981", bg: "#d1fae5" },
          { icon: "⏳", label: "Upcoming",       val: batches.filter(b => b.status === "upcoming").length,   color: "#3b82f6", bg: "#dbeafe" },
          { icon: "🏁", label: "Completed",      val: batches.filter(b => b.status === "completed").length,  color: "#7c3aed", bg: "#ede9fe" },
          { icon: "🪑", label: "Total Seats",    val: batches.reduce((a, b) => a + (b.capacity || 0), 0),    color: "#06b6d4", bg: "#cffafe" },
        ].map((k, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: `1px solid ${k.color}30`, borderLeft: `3px solid ${k.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".3px" }}>{k.label}</div>
          </div>
        ))}
      </div>
 
      {/* Status filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {["all", "active", "upcoming", "completed", "cancelled"].map(f => (
          <button key={f} onClick={() => setStatusF(f)}
            style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${statusFilter === f ? "#f59e0b" : "#e5e7eb"}`, background: statusFilter === f ? "#fef3c7" : "white", color: statusFilter === f ? "#92400e" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
            {f === "all" ? "All Batches" : f}
            {f !== "all" && <span style={{ marginLeft: 4, fontSize: 10, opacity: .7 }}>({batches.filter(b => b.status === f).length})</span>}
          </button>
        ))}
      </div>
 
      {/* Batch Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
        {filtered.map((b, i) => {
          const p = pct(b);
          return (
            <div key={i} style={{ background: "white", borderRadius: 18, padding: 20, border: "1px solid #f1f5f9", borderTop: `3px solid ${statusColor[b.status] || "#f59e0b"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{b.course}</div>
                </div>
                <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: statusBg[b.status], color: statusColor[b.status], flexShrink: 0 }}>
                  {b.status.toUpperCase()}
                </span>
              </div>
 
              {/* Meta */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: "#6b7280" }}>
                <span>📅 {b.start} → {b.end}</span>
                <span>{modeIcon[b.mode]} {b.mode}</span>
                <span>👩‍🏫 {b.trainer || "—"}</span>
                <span>🪑 {b.enrolled}/{b.capacity} seats</span>
                {b.coTrainer && <span style={{ gridColumn: "1/-1" }}>👥 Co: {b.coTrainer}</span>}
              </div>
 
              {/* Capacity bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                  <span style={{ color: "#9ca3af" }}>Capacity</span>
                  <span style={{ fontWeight: 700, color: heatColor(p) }}>{p}%</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p}%`, background: heatColor(p), borderRadius: 4 }} />
                </div>
              </div>
 
              {/* Auto-enroll badge */}
              {b.autoEnroll && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "3px 8px", borderRadius: 6, display: "inline-block", width: "fit-content" }}>
                  ⚡ Auto-Enroll ON
                </div>
              )}
 
              {/* Actions */}
              <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: "1px solid #f3f4f6", flexWrap: "wrap" }}>
                <button onClick={() => { setSelected(b); setView("detail"); }}
                  style={{ ...S.tblBtn, color: "#2563eb", borderColor: "#93c5fd" }}>👁 View</button>
                <button onClick={() => setBcastId(b.id)}
                  style={S.tblBtn}>📢 Broadcast</button>
                <button onClick={() => setClone(b)}
                  style={S.tblBtn}>🔁 Clone</button>
                {/* Quick status toggle */}
                {b.status === "upcoming" && (
                  <button onClick={() => changeStatus(b.id, "active")}
                    style={{ ...S.tblBtn, color: "#059669", borderColor: "#86efac" }}>▶ Activate</button>
                )}
                {b.status === "active" && (
                  <button onClick={() => changeStatus(b.id, "completed")}
                    style={{ ...S.tblBtn, color: "#7c3aed", borderColor: "#c4b5fd" }}>✓ Complete</button>
                )}
              </div>
 
              {/* Broadcast panel inline */}
              {broadcastId === b.id && (
                <div style={{ marginTop: 4, background: "#fef3c7", borderRadius: 10, padding: 12, border: "1px solid #fbbf24" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>📢 Broadcast Message</div>
                  <textarea
                    value={bcastMsg}
                    onChange={e => setBcastMsg(e.target.value)}
                    rows={3}
                    style={{ ...S.input, marginBottom: 8, resize: "none" }}
                    placeholder="Write your message..."
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={sendBroadcast} style={{ ...S.primaryBtn, flex: 1, fontSize: 11 }}>📤 Send</button>
                    <button onClick={() => { setBcastId(null); setBcastMsg(""); }} style={{ ...S.tblBtn, flex: 1, fontSize: 11 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
 
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🗂️</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No batches found</div>
        </div>
      )}
    </div>
  );
}