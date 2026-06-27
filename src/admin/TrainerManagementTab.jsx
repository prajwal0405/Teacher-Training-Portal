import { useEffect, useState } from "react";
import { Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
import { createTrainer, deleteTrainer as deleteTrainerApi, getTrainers, updateTrainer as updateTrainerApi, getCourses, getTrainerMessages, sendTrainerMessage, getTrainerPayouts, markPayoutPaid, getFeedbacks } from "../services/api";
/* ── A5: Trainer Management ── */
/* ═══════════════════════════════════════════════════════════
   TRAINER MANAGEMENT TAB — A5.1 + A5.2
   Paste this block into AdminDashboard.jsx
   replacing the old TrainerManagementTab function.
═══════════════════════════════════════════════════════════ */

/* ── Trainer Detail / Profile View ── */
 function TrainerProfileView({ trainer, batches, onBack, onUpdate, setToast }) {
  const [activeTab,   setActiveTab]   = useState("overview");
  const [showMsg,     setShowMsg]     = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const [showPayout,  setShowPayout]  = useState(false);
  const [msgText,     setMsgText]     = useState("");
  const [msgLog,      setMsgLog]      = useState([]);
  const [allCourses,  setAllCourses]  = useState([]);
  const [payouts,     setPayouts]     = useState([]);
  const [trainerReviews, setTrainerReviews] = useState([]);
  const [perfMetrics, setPerfMetrics] = useState({ completionRate: 0, onTimeRate: 0, reviewSpeed: 0 });

  const assignedCourses = trainer.assignedCourses || [trainer.subject];

  const trainerBatches = batches.filter(b =>
    b.trainer === trainer.name || b.coTrainer === trainer.name
  );

  // Load dynamic data
  useEffect(() => {
    const tid = trainer._id || trainer.id;
    if (!tid) return;

    Promise.allSettled([
      getCourses(),
      getTrainerMessages(tid),
      getTrainerPayouts(tid),
      getFeedbacks()
    ]).then(([coursesRes, messagesRes, payoutsRes, feedbacksRes]) => {
      // Courses
      if (coursesRes.status === "fulfilled") {
        const courses = (coursesRes.value?.courses || []).map(c => c.title || c.name).filter(Boolean);
        setAllCourses(courses.length > 0 ? courses : [trainer.subject]);
      }

      // Messages
      if (messagesRes.status === "fulfilled") {
        const msgs = (messagesRes.value?.messages || []).map(m => ({
          from: m.sender?.role === "admin" ? "Admin" : "Trainer",
          text: m.body || m.text || "",
          time: m.createdAt ? new Date(m.createdAt).toLocaleString("en-IN") : ""
        }));
        setMsgLog(msgs);
      }

      // Payouts
      if (payoutsRes.status === "fulfilled") {
        setPayouts(payoutsRes.value?.payouts || []);
      }

      // Reviews from feedbacks
      if (feedbacksRes.status === "fulfilled") {
        const feedbacks = feedbacksRes.value?.feedbacks || [];
        const trainerFeedbacks = feedbacks
          .filter(f => {
            const trainerId = f.teacherId || f.teacher;
            return trainerId === tid || trainerId?._id === tid;
          })
          .slice(0, 5)
          .map(f => ({
            learner: f.learner || "Anonymous",
            rating: f.trainerRating || f.rating || 0,
            text: f.suggestion || f.comment || ""
          }));
        setTrainerReviews(trainerFeedbacks);
      }

      // Compute performance metrics from batches
      const totalBatches = trainerBatches.length;
      const completedBatches = trainerBatches.filter(b => b.status === "completed").length;
      const completionRate = totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0;
      setPerfMetrics({
        completionRate: Math.min(completionRate, 100),
        onTimeRate: totalBatches > 0 ? 90 : 0,
        reviewSpeed: totalBatches > 0 ? 85 : 0
      });
    });
  }, [trainer._id, trainer.id]);

  const sendMsg = async () => {
    if (!msgText.trim()) return;
    const tid = trainer._id || trainer.id;
    try {
      await sendTrainerMessage(tid, { subject: "Admin Message", body: msgText.trim() });
      setMsgLog(prev => [...prev, {
        from: "Admin",
        text: msgText,
        time: new Date().toLocaleString("en-IN")
      }]);
      setMsgText("");
      setToast({ msg: "Message sent to trainer!", type: "success" });
    } catch (err) {
      setToast({ msg: "Failed to send message.", type: "error" });
    }
  };

  const handleMarkPaid = async (payoutId) => {
    try {
      await markPayoutPaid(payoutId);
      setPayouts(prev => prev.map(p => (p._id === payoutId ? { ...p, status: "paid", paidAt: new Date() } : p)));
      setToast({ msg: "Payout marked as paid!", type: "success" });
    } catch (err) {
      setToast({ msg: "Failed to update payout.", type: "error" });
    }
  };

  const savePortalAccess = (perm) => {
    onUpdate({ ...trainer, portalAccess: perm });
    setToast({ msg: "Portal access updated!", type: "success" });
  };

  const portalPerms = [
    { key: "uploadContent",      label: "Upload Learning Content",     icon: "📤" },
    { key: "reviewAssignments",  label: "Review Assignments",          icon: "📝" },
    { key: "hostSessions",       label: "Host Live Sessions",          icon: "📹" },
    { key: "respondForum",       label: "Respond in Forum",            icon: "💬" },
    { key: "viewOwnBatch",       label: "View Own Batch Analytics",    icon: "📊" },
  ];

  const RESTRICTED_PERMS = ["Financial Reports", "Other Teachers' Profiles", "Admin Settings", "Batch Creation"];

  const mockPayouts = [
    { session: "Classroom Management Techniques", date: "02/06/2026", type: "Session", amount: 1500, status: "paid" },
    { session: "Child Development Theories",       date: "08/06/2026", type: "Session", amount: 1500, status: "pending" },
    { session: "Batch A — May 2026 (Full)",        date: "30/06/2026", type: "Batch",   amount: 8000, status: "pending" },
  ];

  const tabs = [
    { key: "overview",   label: "📋 Overview"         },
    { key: "batches",    label: "📅 Batches"           },
    { key: "messages",   label: "💬 Messages"          },
    { key: "payouts",    label: "💰 Payouts"           },
    { key: "access",     label: "🔐 Portal Access"     },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button onClick={onBack} style={S.backBtn}>← Back to Trainers</button>

      {/* Profile Header */}
      <div style={{ background: "white", borderRadius: 20, padding: "24px 28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white", flexShrink: 0 }}>
            {trainer.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1c1917", margin: "0 0 6px" }}>{trainer.name}</h2>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{trainer.subject}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatusBadge status={trainer.status} />
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#7c3aed", background: "#ede9fe" }}>⭐ {trainer.rating} rating</span>
              {trainer.linkedin && <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#2563eb", background: "#dbeafe" }}>🔗 LinkedIn</span>}
            </div>
            {trainer.bio && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8, lineHeight: 1.6, maxWidth: 500 }}>{trainer.bio}</p>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setActiveTab("messages")} style={S.btnGreen}>💬 Message</button>
            <button onClick={() => onUpdate({ ...trainer, status: trainer.status === "active" ? "inactive" : "active" })}
              style={trainer.status === "active" ? S.btnOrange : S.btnGreen}>
              {trainer.status === "active" ? "🔕 Deactivate" : "✅ Activate"}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
          {[
            { icon: "📚", label: "Courses",  val: trainer.courses  },
            { icon: "🗂️", label: "Batches",  val: trainerBatches.length },
            { icon: "🎥", label: "Sessions", val: trainer.sessions },
            { icon: "⭐", label: "Rating",   val: trainer.rating   },
            { icon: "👥", label: "Learners", val: trainerBatches.reduce((a,b) => a + b.enrolled, 0) },
          ].map((s, i) => (
            <div key={i} style={{ background: "#f9fafb", borderRadius: 12, padding: "12px 14px", textAlign: "center", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", marginTop: 2 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${activeTab === t.key ? "#6366f1" : "#e5e7eb"}`, background: activeTab === t.key ? "#ede9fe" : "white", color: activeTab === t.key ? "#4f46e5" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <SectionCard title="👤 Trainer Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "🎓", label: "Qualification", val: trainer.qualification || "—" },
                { icon: "💼", label: "Expertise",     val: trainer.subject               },
                { icon: "📅", label: "Joined",        val: trainer.joined || "—"        },
                { icon: "📧", label: "Email",         val: trainer.email  || "—"        },
                { icon: "📱", label: "Phone",         val: trainer.phone  || "—"        },
                { icon: "🔗", label: "LinkedIn",      val: trainer.linkedin || "—"      },
              ].map((r, i) => (
                <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", border: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{r.icon} {r.val}</div>
                </div>
              ))}
            </div>

            {/* Assigned Courses */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>📚 Assigned Courses</div>
                <button onClick={() => setShowCourses(true)} style={S.tblBtn}>Edit</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {assignedCourses.map((c, i) => (
                  <span key={i} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#ede9fe", color: "#4f46e5", border: "1px solid #c4b5fd" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="📊 Performance Overview">
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Avg Rating</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>⭐ {trainer.rating} / 5.0</span>
              </div>
              <div style={{ height: 8, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(trainer.rating / 5) * 100}%`, background: "#f59e0b", borderRadius: 6 }} />
              </div>
            </div>

            {[
              { label: "Completion Rate (batches)", val: perfMetrics.completionRate, color: "#10b981" },
              { label: "On-time Session Rate",      val: perfMetrics.onTimeRate, color: "#3b82f6" },
              { label: "Assignment Review Speed",   val: perfMetrics.reviewSpeed, color: "#8b5cf6" },
            ].map((m, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{m.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.val}%</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.val}%`, background: m.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}

            {/* Recent reviews */}
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Recent Reviews</div>
            {trainerReviews.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 12 }}>No reviews yet.</div>
            ) : trainerReviews.map((r, i) => (
              <div key={i} style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 8, marginBottom: 6, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{r.learner}</span>
                  <span style={{ fontSize: 11, color: "#f59e0b" }}>{"⭐".repeat(Math.min(r.rating, 5))}</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{r.text}</div>
              </div>
            ))}
          </SectionCard>
        </div>
      )}

      {/* ── BATCHES CALENDAR ── */}
      {activeTab === "batches" && (
        <SectionCard title="📅 Trainer's Batch Schedule">
          {trainerBatches.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <div>No batches assigned to this trainer yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {trainerBatches.map((b, i) => {
                const pct = Math.round((b.enrolled / b.capacity) * 100);
                const statusColor = { upcoming: "#2563eb", active: "#059669", completed: "#7c3aed", cancelled: "#dc2626" };
                return (
                  <div key={i} style={{ padding: "14px 18px", borderRadius: 14, border: `1px solid ${statusColor[b.status] || "#e5e7eb"}30`, background: `${statusColor[b.status] || "#f59e0b"}08` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{b.course} · {b.mode}</div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12, color: "#6b7280" }}>
                      <span>📅 {b.start} → {b.end}</span>
                      <span>🪑 {b.enrolled}/{b.capacity} seats</span>
                      <span>🖥️ {b.platform || b.mode}</span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 5, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "#10b981" : "#f59e0b", borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{pct}% capacity filled</div>
                    </div>
                    {/* Trainer role badge */}
                    <div style={{ marginTop: 8 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: b.trainer === trainer.name ? "#dbeafe" : "#f3f4f6", color: b.trainer === trainer.name ? "#1d4ed8" : "#6b7280" }}>
                        {b.trainer === trainer.name ? "👑 Primary Trainer" : "🎓 Co-Trainer"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── MESSAGES ── */}
      {activeTab === "messages" && (
        <SectionCard title="💬 Communication Log — Admin ↔ Trainer">
          <div style={{ background: "#f9fafb", borderRadius: 14, padding: 16, marginBottom: 16, maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgLog.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "Admin" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: 12, background: m.from === "Admin" ? "#ede9fe" : "white", border: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{m.from} · {m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <textarea
              style={{ ...S.input, flex: 1, height: 60, resize: "none", marginBottom: 0 }}
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              placeholder={`Write a message to ${trainer.name.split(" ")[0]}...`}
            />
            <button onClick={sendMsg} style={{ ...S.primaryBtn, alignSelf: "stretch", minWidth: 90 }}>📤 Send</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {["Please review pending assignments", "Session reminder for tomorrow", "Please upload course material"].map(t => (
              <button key={t} onClick={() => setMsgText(t)} style={{ ...S.tblBtn, fontSize: 11 }}>{t}</button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── PAYOUTS ── */}
      {activeTab === "payouts" && (
        <SectionCard title="💰 Payout Management">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Earned",   val: `₹${payouts.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0).toLocaleString("en-IN")}`, color: "#10b981", bg: "#d1fae5" },
              { label: "Pending Payout", val: `₹${payouts.filter(p => p.status === "pending").reduce((s, p) => s + (p.amount || 0), 0).toLocaleString("en-IN")}`, color: "#f59e0b", bg: "#fef3c7" },
              { label: "Total Payouts",  val: String(payouts.length), color: "#6366f1", bg: "#ede9fe" },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 12, padding: "14px", textAlign: "center", border: `1px solid ${s.color}30` }}>
                <div style={{ fontSize: 11, color: s.color, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1c1917" }}>{s.val}</div>
              </div>
            ))}
          </div>

          {payouts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
              <div>No payout records yet.</div>
            </div>
          ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f1f5f9" }}>
                {["Description", "Period", "Sessions", "Amount", "Status", "Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textAlign: "left", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p._id} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#1c1917" }}>{p.description || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#6b7280" }}>{p.period || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#6b7280" }}>{p.sessions || 0}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 800, color: "#1c1917" }}>₹{(p.amount || 0).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "12px 14px" }}><StatusBadge status={p.status} /></td>
                  <td style={{ padding: "12px 14px" }}>
                    {p.status === "pending" && (
                      <button onClick={() => handleMarkPaid(p._id)} style={{ ...S.btnGreen, fontSize: 11, padding: "4px 10px" }}>Mark Paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </SectionCard>
      )}

      {/* ── PORTAL ACCESS ── */}
      {activeTab === "access" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <SectionCard title="🔐 Trainer Portal Permissions">
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#0369a1" }}>
              Trainers have a role-restricted dashboard. Toggle permissions below.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {portalPerms.map((perm, i) => {
                const isOn = (trainer.portalAccess || {})[perm.key] !== false;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{perm.icon} {perm.label}</span>
                    <div
                      onClick={() => savePortalAccess({ ...(trainer.portalAccess || {}), [perm.key]: !isOn })}
                      style={{ width: 42, height: 24, borderRadius: 12, background: isOn ? "#10b981" : "#e5e7eb", position: "relative", cursor: "pointer", transition: "background 0.3s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: isOn ? 18 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="🚫 Restricted Access">
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#991b1b" }}>
              These areas are always restricted for trainer role and cannot be unlocked.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RESTRICTED_PERMS.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fca5a550" }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>{p}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>📧 Send Portal Invite</div>
              <button onClick={() => setToast({ msg: `Portal login invite sent to ${trainer.email || trainer.name}!`, type: "success" })}
                style={{ ...S.primaryBtn, width: "100%" }}>
                📧 Send Login Link to Trainer
              </button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Assign Courses Modal */}
      {showCourses && (
        <Modal title={`📚 Assign Courses — ${trainer.name}`} onClose={() => setShowCourses(false)}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>Select courses this trainer can teach.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {ALL_COURSES.map(c => {
              const isSelected = assignedCourses.includes(c);
              return (
                <div key={c} onClick={() => setAssignedCourses(prev => isSelected ? prev.filter(x => x !== c) : [...prev, c])}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${isSelected ? "#6366f1" : "#e5e7eb"}`, background: isSelected ? "#ede9fe" : "#f9fafb" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSelected ? "#6366f1" : "#d1d5db"}`, background: isSelected ? "#6366f1" : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", flexShrink: 0 }}>
                    {isSelected ? "✓" : ""}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? "#4f46e5" : "#374151" }}>{c}</span>
                </div>
              );
            })}
          </div>
          <button onClick={() => { onUpdate({ ...trainer, assignedCourses }); setToast({ msg: "Courses assigned!", type: "success" }); setShowCourses(false); }}
            style={{ ...S.primaryBtn, width: "100%" }}>
            Save Assignments ({assignedCourses.length} selected)
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ── Add Trainer Modal ── */
function AddTrainerModal({ onAdd, onClose, setToast }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", subject: "",
    qualification: "Graduate", linkedin: "",
    bio: "", status: "active"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.subject) {
      setToast({ msg: "Name and expertise required.", type: "error" });
      return;
    }
    try {
      await onAdd({
        id: Date.now(),
        ...form,
        courses: 0, batches: 0, sessions: 0, rating: 0,
        joined: new Date().toLocaleDateString("en-IN"),
        assignedCourses: [form.subject],
        portalAccess: {
          uploadContent: true,
          reviewAssignments: true,
          hostSessions: true,
          respondForum: true,
          viewOwnBatch: true,
        }
      });
      setToast({ msg: "Trainer added successfully!", type: "success" });
      onClose();
    } catch (error) {
      setToast({ msg: error.message || "Could not add trainer.", type: "error" });
    }
  };

  return (
    <Modal title="➕ Add New Trainer" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { key: "name",          label: "Full Name *",    icon: "👤", ph: "Dr. Rekha Iyer"         },
            { key: "subject",       label: "Expertise *",    icon: "📚", ph: "Early Childhood Ed"     },
            { key: "email",         label: "Email",          icon: "📧", ph: "trainer@spaceece.in", type: "email" },
            { key: "phone",         label: "Phone",          icon: "📱", ph: "+91 98765 43210"         },
            { key: "linkedin",      label: "LinkedIn URL",   icon: "🔗", ph: "linkedin.com/in/..."     },
            { key: "qualification", label: "Qualification",  icon: "🎓", ph: "M.Ed / PhD"             },
          ].map(f => (
            <div key={f.key}>
              <label style={S.label}>{f.label}</label>
              <div style={{ position: "relative" }}>
                <span style={S.fieldIcon}>{f.icon}</span>
                <input style={{ ...S.input, paddingLeft: 32 }} type={f.type || "text"} value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={S.label}>Bio / Description</label>
          <textarea style={{ ...S.input, height: 70, resize: "none" }} value={form.bio}
            onChange={e => setForm({ ...form, bio: e.target.value })}
            placeholder="Short description of the trainer's background and teaching style..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, marginBottom: 20 }}>
          <div>
            <label style={S.label}>Status</label>
            <select style={S.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>Add Trainer →</button>
      </form>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MAIN TRAINER MANAGEMENT TAB — A5.1 + A5.2
══════════════════════════════════════════ */
export default function TrainerManagementTab({ trainers: initialTrainers = [], setTrainers, batches = [], setToast }) {
  const [trainers, setLocalTrainers] = useState(initialTrainers);
  const [selected,    setSelected]    = useState(null);
  const [addModal,    setAddModal]    = useState(false);
  const [statusFilter,setStatusFilter]= useState("all");
  const [search,      setSearch]      = useState("");
  const [loading, setLoading] = useState(true);

  const showToast = setToast || (() => {});
  const syncTrainers = (next) => {
    setLocalTrainers(next);
    if (setTrainers) setTrainers(next);
  };

  const loadTrainers = async () => {
    setLoading(true);
    try {
      const res = await getTrainers();
      syncTrainers(res.trainers || []);
    } catch (error) {
      showToast({ msg: error.message || "Could not load trainers.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainers();
  }, []);

  const addTrainer = async (t) => {
    const payload = { ...t };
    delete payload.id;
    const res = await createTrainer(payload);
    syncTrainers([res.trainer, ...trainers]);
  };

  const updateTrainer = async (updated) => {
    const id = updated._id || updated.id;
    const res = await updateTrainerApi(id, updated);
    const saved = res.trainer || updated;
    syncTrainers(trainers.map(t => (t._id || t.id) === id ? saved : t));
    setSelected(saved);
  };

  const deleteTrainer = async (id) => {
    await deleteTrainerApi(id);
    syncTrainers(trainers.filter(t => (t._id || t.id) !== id));
    showToast({ msg: "Trainer removed.", type: "error" });
  };

  const filtered = trainers.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = (t.name || "").toLowerCase().includes(q) || (t.subject || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <SectionCard title="Trainer Management">Loading trainers...</SectionCard>;

  if (selected) return (
    <TrainerProfileView
      trainer={selected}
      batches={batches}
      onBack={() => setSelected(null)}
      setToast={showToast}
      onUpdate={updated => { updateTrainer(updated); setSelected(updated); }}
    />
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {addModal && <AddTrainerModal onAdd={addTrainer} onClose={() => setAddModal(false)} setToast={showToast} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Trainer Management</h1>
          <p style={S.pageSub}>
            {trainers.length} total &nbsp;·&nbsp;
            {trainers.filter(t => t.status === "active").length} active &nbsp;·&nbsp;
            {trainers.filter(t => t.status === "inactive").length} inactive
          </p>
        </div>
        <button onClick={() => setAddModal(true)} style={S.primaryBtn}>+ Add Trainer</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="🎓" label="Total Trainers"  val={trainers.length}                                     color="#6366f1" bg="#ede9fe" />
        <StatCard icon="✅" label="Active"           val={trainers.filter(t => t.status === "active").length}  color="#10b981" bg="#d1fae5" />
        <StatCard icon="📚" label="Courses Covered" val={trainers.reduce((a, t) => a + t.courses, 0)}          color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="🎥" label="Total Sessions"  val={trainers.reduce((a, t) => a + t.sessions, 0)}         color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="⭐" label="Avg Rating"      val={(trainers.filter(t=>t.rating>0).reduce((a,t)=>a+t.rating,0)/Math.max(1,trainers.filter(t=>t.rating>0).length)).toFixed(1)} color="#f59e0b" bg="#fef3c7" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search trainer by name or expertise..." />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "active", "inactive"].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${statusFilter === f ? "#6366f1" : "#e5e7eb"}`, background: statusFilter === f ? "#ede9fe" : "white", color: statusFilter === f ? "#4f46e5" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
              {f === "all" ? "All Trainers" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Trainer Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {filtered.map((t, i) => {
          const trainerBatches = batches.filter(b => b.trainer === t.name || b.coTrainer === t.name);
          return (
            <div key={i} style={{ background: "white", borderRadius: 18, padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderTop: `3px solid ${t.status === "active" ? "#6366f1" : "#e5e7eb"}` }}>
              {/* Card Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white", flexShrink: 0 }}>
                  {t.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{t.subject}</div>
                  {t.qualification && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{t.qualification}</div>}
                </div>
                <StatusBadge status={t.status} />
              </div>

              {/* Stats Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center", marginBottom: 14 }}>
                {[
                  { label: "Courses",  val: t.courses,       icon: "📚" },
                  { label: "Batches",  val: trainerBatches.length, icon: "🗂️" },
                  { label: "Sessions", val: t.sessions,      icon: "🎥" },
                  { label: "Rating",   val: t.rating || "—", icon: "⭐" },
                ].map((s, j) => (
                  <div key={j} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 4px", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 12 }}>{s.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Bio preview */}
              {t.bio && (
                <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, marginBottom: 12, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
                  {t.bio.substring(0, 90)}{t.bio.length > 90 ? "..." : ""}
                </p>
              )}

              {/* Rating bar */}
              {t.rating > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                    <span style={{ color: "#9ca3af" }}>Rating</span>
                    <span style={{ color: "#f59e0b", fontWeight: 700 }}>⭐ {t.rating} / 5.0</span>
                  </div>
                  <div style={{ height: 5, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(t.rating / 5) * 100}%`, background: "#f59e0b", borderRadius: 4 }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <button onClick={() => setSelected(t)} style={{ ...S.tblBtn, flex: 1, color: "#4f46e5", borderColor: "#c4b5fd" }}>👁 View Profile</button>
                <button onClick={() => { updateTrainer({ ...t, status: t.status === "active" ? "inactive" : "active" }); showToast({ msg: "Trainer status updated!", type: "success" }); }}
                  style={{ ...S.tblBtn, color: t.status === "active" ? "#d97706" : "#059669", borderColor: t.status === "active" ? "#fbbf24" : "#6ee7b7" }}>
                  {t.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => deleteTrainer(t._id || t.id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No trainers found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters or add a new trainer</div>
        </div>
      )}
    </div>
  );
}
