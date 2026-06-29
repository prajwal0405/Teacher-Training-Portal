import { useEffect, useMemo, useState } from "react";
import { Modal, S, StatCard } from "../components/Shared";
import { getAdminNotifications, sendAdminNotification, deleteNotification, markAllNotificationsRead } from "../services/api";

const NOTIFICATION_TEMPLATES = [
  { name: "Welcome", subject: "Welcome to SpacECE Teacher Training Portal", channel: "in_app" },
  { name: "Assignment", subject: "Assignment Submission Reminder", channel: "in_app" },
  { name: "Session", subject: "Upcoming Live Session Reminder", channel: "in_app" },
  { name: "Course Update", subject: "New Course Content Available", channel: "in_app" },
  { name: "Feedback", subject: "We Value Your Feedback — Share Your Thoughts", channel: "in_app" },
  { name: "Announcement", subject: "Important Announcement for All Teachers", channel: "in_app" },
];

const CHANNEL_CONFIG = {
  in_app: { icon: "📱", label: "In-app", color: "#6366f1", bg: "#e0e7ff" },
  email: { icon: "📧", label: "Email", color: "#0ea5e9", bg: "#cffafe" },
  sms: { icon: "💬", label: "SMS", color: "#10b981", bg: "#d1fae5" },
  whatsapp: { icon: "🟢", label: "WhatsApp", color: "#25d366", bg: "#dcfce7" },
};

export default function NotificationsTab({ teachers = [], setToast }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [channel, setChannel] = useState("in_app");
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logChannelFilter, setLogChannelFilter] = useState("all");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const refreshNotifications = async () => {
    setLoading(true);
    try {
      const data = await getAdminNotifications();
      setNotifications(data?.notifications || []);
    } catch (error) {
      setToast?.({ msg: error.message || "Failed to load notifications.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, []);

  const audienceCount = useMemo(() => {
    if (audience === "approved") return teachers.filter((t) => t.status === "approved").length;
    if (audience === "pending") return teachers.filter((t) => t.status === "pending").length;
    return teachers.length;
  }, [audience, teachers]);

  const deliveryStats = useMemo(() => {
    const byChannel = {};
    notifications.forEach((n) => {
      const ch = n.channel || "in_app";
      if (!byChannel[ch]) byChannel[ch] = { total: 0, delivered: 0, failed: 0 };
      byChannel[ch].total += 1;
      if (n.status === "delivered") byChannel[ch].delivered += 1;
      if (n.status === "failed") byChannel[ch].failed += 1;
    });
    return {
      total: notifications.length,
      delivered: notifications.filter((item) => item.status === "delivered").length,
      sent: notifications.filter((item) => item.status === "sent").length,
      unread: notifications.filter((item) => !item.read).length,
      failed: notifications.filter((item) => item.status === "failed").length,
      byChannel,
    };
  }, [notifications]);

  const bodyCharCount = body.length;
  const bodyMaxChars = 5000;

  const applyTemplate = (template) => {
    setSubject(template.subject);
    setBody("");
    setChannel(template.channel);
    setAudience("approved");
    setToast?.({ msg: `Template "${template.name}" applied — compose your message.`, type: "success" });
  };

  const clearForm = () => {
    setSubject("");
    setBody("");
    setAudience("all");
    setChannel("in_app");
  };

  const handleSend = async (keepForm = false) => {
    if (!subject.trim() || !body.trim()) {
      setToast?.({ msg: "Subject and message are required.", type: "error" });
      return;
    }
    setSending(true);
    try {
      const data = await sendAdminNotification({
        subject: subject.trim(),
        body: body.trim(),
        audience: selectedTeacherId ? "specific" : audience,
        channel,
        teacherIds: selectedTeacherId ? [selectedTeacherId] : [],
      });

      if (!keepForm) clearForm();

      setToast?.({
        msg: `Notification sent to ${data?.recipientCount || 0} teachers.`,
        type: "success",
      });

      setShowPreview(false);
      await refreshNotifications();
    } catch (error) {
      setToast?.({ msg: error.message || "Failed to send notification.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (item) => {
    if (retryingId) return;

    setRetryingId(item._id);
    try {
      const retryPayload = {
        subject: item.subject || item.title || "",
        body: item.body || "",
        channel: item.channel || "in_app",
        audience: item.audience || (item.recipient ? "specific" : "approved"),
        teacherIds: item.recipient ? [item.recipient._id || item.recipient] : [],
        isRetry: true,
        originalNotificationId: item._id,
      };

      const data = await sendAdminNotification(retryPayload);

      if (data?.recipientCount > 0) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === item._id
              ? {
                  ...n,
                  status: "delivered",
                  error: null,
                  read: false,
                  readAt: null,
                }
              : n
          )
        );
        setToast?.({
          msg: `Notification resent successfully to ${data?.recipientCount} teachers.`,
          type: "success",
        });
      } else {
        setToast?.({ msg: "Retry failed - no recipients found.", type: "error" });
      }
    } catch (error) {
      setToast?.({ msg: error.message || "Retry failed.", type: "error" });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setToast?.({ msg: "Notification deleted.", type: "success" });
    } catch (error) {
      setToast?.({ msg: error.message || "Failed to delete.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => (n.read ? n : { ...n, read: true, readAt: new Date().toISOString() }))
      );
      setToast?.({ msg: "All notifications marked as read.", type: "success" });
    } catch (err) {
      setToast?.({ msg: "Failed to mark all as read.", type: "error" });
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const q = logSearch.toLowerCase().trim();

      const matchSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.subject?.toLowerCase().includes(q) ||
        item.body?.toLowerCase().includes(q) ||
        item.recipient?.name?.toLowerCase().includes(q) ||
        item.recipient?.email?.toLowerCase().includes(q);

      const matchChannel = logChannelFilter === "all" || item.channel === logChannelFilter;
      const matchStatus = logStatusFilter === "all" || item.status === logStatusFilter;

      return matchSearch && matchChannel && matchStatus;
    });
  }, [notifications, logSearch, logChannelFilter, logStatusFilter]);

  const channelOptions = ["all", "in_app", "email", "sms", "whatsapp"];
  const statusOptions = ["all", "sent", "delivered", "failed"];
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {showPreview && (
        <Modal title="📨 Preview Notification" onClose={() => setShowPreview(false)}>
          <div
            style={{
              padding: "16px",
              background: "#f8fafc",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
              To
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
              {audience === "all" ? "All teachers" : audience === "approved" ? "Approved teachers" : "Pending teachers"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {audienceCount} recipient(s) · {CHANNEL_CONFIG[channel]?.label || "In-app"}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{audienceCount} recipient(s) · {channel.replace("_", " ")}</div>
          </div>

          <div
            style={{
              padding: "16px",
              background: "white",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{subject}</div>
            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{body}</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowPreview(false)} style={{ ...S.tblBtn, flex: 1, textAlign: "center" }}>
              Edit
            </button>
            <button onClick={() => handleSend(false)} disabled={sending} style={{ ...S.primaryBtn, flex: 2, textAlign: "center" }}>
              {sending ? "Sending..." : `Send to ${audienceCount} teacher(s)`}
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => handleSend(true)}
              disabled={sending}
              style={{ ...S.tblBtn, width: "100%", textAlign: "center", fontSize: 11 }}
            >
              {sending ? "Sending..." : "Send & Keep Editing"}
            </button>
          </div>
        </Modal>
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={S.pageTitle}>Notifications Management</h1>
        <p style={S.pageSub}>Send real notifications to teachers and review the delivery log.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="📨" label="Total Sent" val={deliveryStats.total} color="#6366f1" bg="#e0e7ff" />
        <StatCard icon="✅" label="Delivered" val={deliveryStats.delivered} color="#10b981" bg="#d1fae5" />
        <StatCard icon="🔔" label="Unread" val={deliveryStats.unread} color="#0ea5e9" bg="#cffafe" />
        <StatCard icon="⚠️" label="Failed" val={deliveryStats.failed} color="#ef4444" bg="#fee2e2" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Compose Notification</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Quick Templates</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {NOTIFICATION_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(t)}
                  style={{
                    ...S.tblBtn,
                    fontSize: 11,
                    padding: "5px 10px",
                    background: "#f1f5f9",
                  }}
                  title={t.name}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Audience</label>
            <select
              value={audience}
              onChange={(e) => { setAudience(e.target.value); setSelectedTeacherId(""); }}
              style={{ ...S.input, marginBottom: 8, background: "white" }}
            >
              <option value="all">All teachers ({teachers.length})</option>
              <option value="approved">Approved teachers ({teachers.filter((t) => t.status === "approved").length})</option>
              <option value="pending">Pending teachers ({teachers.filter((t) => t.status === "pending").length})</option>
              <option value="specific">Specific teacher...</option>
            </select>
            {audience === "specific" && (
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                style={{ ...S.input, marginBottom: 12, background: "white" }}
              >
                <option value="">Select a teacher...</option>
                {teachers.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {t.name} {t.email ? `(${t.email})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ ...S.input, marginBottom: 8, background: "white" }}>
              <option value="in_app">📱 In-app notification</option>
              <option value="email">📧 Email (requires SMTP config)</option>
              <option value="sms">💬 SMS (requires Twilio config)</option>
              <option value="whatsapp">🟢 WhatsApp (requires Twilio config)</option>
            </select>
          </div>

          <div style={{ marginBottom: 12, fontSize: 12, color: "#64748b" }}>
            Estimated recipients: <b style={{ color: "#0f172a" }}>{audienceCount}</b>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Subject *</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ ...S.input, marginBottom: 8, background: "white" }}
              placeholder="Enter notification subject..."
            />
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={S.label}>Message *</label>
            <div style={{ position: "relative" }}>
              <textarea
                value={body}
                onChange={(e) => {
                  if (e.target.value.length <= bodyMaxChars) setBody(e.target.value);
                }}
                style={{ ...S.input, minHeight: 120, resize: "vertical", marginBottom: 4, background: "white" }}
                placeholder="Write your notification message here..."
              />
              <div
                style={{
                  fontSize: 10,
                  color: bodyCharCount > bodyMaxChars * 0.9 ? "#ef4444" : "#94a3b8",
                  textAlign: "right",
                  marginBottom: 6,
                }}
              >
                {bodyCharCount}/{bodyMaxChars}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                if (!subject.trim() || !body.trim()) {
                  setToast?.({ msg: "Subject and message are required.", type: "error" });
                  return;
                }
                setShowPreview(true);
              }}
              disabled={sending}
              style={{ ...S.primaryBtn, flex: 1, textAlign: "center", opacity: sending ? 0.7 : 1 }}
            >
              {sending ? "Sending..." : "Review & Send"}
            </button>
            {(subject || body) && (
              <button onClick={clearForm} style={{ ...S.tblBtn, fontSize: 11 }}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Delivery Log</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {hasUnread && (
                <button onClick={handleMarkAllRead} style={{ ...S.tblBtn, fontSize: 11, color: "#2563eb", borderColor: "#93c5fd" }}>
                  ✓ Mark all read
                </button>
              )}
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{filteredNotifications.length} shown</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search..."
              style={{ ...S.input, marginBottom: 0, flex: 1, minWidth: 120, fontSize: 12, padding: "6px 10px", background: "white" }}
            />
            <select
              value={logChannelFilter}
              onChange={(e) => setLogChannelFilter(e.target.value)}
              style={{ ...S.input, marginBottom: 0, width: 110, fontSize: 12, padding: "6px 8px", background: "white" }}
            >
              {channelOptions.map((o) => (
                <option key={o} value={o}>
                  {o === "all" ? "All channels" : CHANNEL_CONFIG[o]?.label || o}
                </option>
              ))}
            </select>
            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value)}
              style={{ ...S.input, marginBottom: 0, width: 100, fontSize: 12, padding: "6px 8px", background: "white" }}
            >
              {statusOptions.map((o) => (
                <option key={o} value={o}>
                  {o === "all" ? "All status" : o}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading notification history...</div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>No notifications found</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", maxHeight: 300 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#64748b", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#64748b", textAlign: "left" }}>Subject</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#64748b", textAlign: "left" }}>Recipient</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#64748b", textAlign: "center" }}>Status</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#64748b", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.map((item) => {
                    return (
                      <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px", fontSize: 12, color: "#64748b" }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td style={{ padding: "10px", fontSize: 13, color: "#111827", fontWeight: 500 }}>
                          {item.subject || item.title}
                        </td>
                        <td style={{ padding: "10px", fontSize: 12, color: "#64748b" }}>
                          {item.recipient?.name || "All teachers"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              background: item.status === "failed" ? "#fee2e2" : item.status === "delivered" ? "#d1fae5" : "#fef3c7",
                              color: item.status === "failed" ? "#991b1b" : item.status === "delivered" ? "#065f46" : "#92400e",
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          {item.status === "failed" && (
                            <button
                              onClick={() => handleRetry(item)}
                              disabled={retryingId === item._id}
                              style={{
                                ...S.tblBtn,
                                color: "#2563eb",
                                borderColor: "#93c5fd",
                                fontSize: 11,
                                padding: "4px 10px",
                              }}
                            >
                              {retryingId === item._id ? "Retrying..." : "🔄 Retry"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item._id)}
                            disabled={deletingId === item._id}
                            style={{
                              ...S.tblBtn,
                              color: "#dc2626",
                              borderColor: "#fca5a5",
                              fontSize: 11,
                              padding: "4px 10px",
                              marginLeft: 6,
                            }}
                          >
                            {deletingId === item._id ? "..." : "🗑️"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Triggered Notifications Summary */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, marginTop: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 6 }}>⚡ Auto-Triggered Notifications</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>System-generated notifications sent automatically on key events.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {[
            { icon: "👤", title: "New Teacher Registration", desc: "Sent to Admin when a teacher registers", color: "#3b82f6", bg: "#dbeafe" },
            { icon: "⏰", title: "Activity Overdue (>24h)", desc: "Sent to Admin + Teacher", color: "#ef4444", bg: "#fee2e2" },
            { icon: "✅", title: "Submission Approved", desc: "Sent to Teacher on admin approval", color: "#10b981", bg: "#d1fae5" },
            { icon: "🔄", title: "Revision Requested", desc: "Sent to Teacher with admin comment", color: "#f59e0b", bg: "#fef3c7" },
            { icon: "🚨", title: "Child Absent 3+ Days", desc: "Sent to Admin for consecutive absences", color: "#dc2626", bg: "#fee2e2" },
            { icon: "📋", title: "Lesson Plan Published", desc: "Sent to Teacher when plan is assigned", color: "#8b5cf6", bg: "#ede9fe" },
            { icon: "📚", title: "Training Scheduled", desc: "Sent to assigned Teachers", color: "#06b6d4", bg: "#cffafe" },
            { icon: "📝", title: "Attendance Not Submitted", desc: "Sent to Teacher if not marked by 10:30 AM", color: "#f97316", bg: "#ffedd5" },
          ].map((item, i) => {
            const autoCount = notifications.filter(n => {
              const t = (n.title || n.subject || "").toLowerCase();
              return t.includes(item.title.toLowerCase().split(" ")[0].toLowerCase());
            }).length;
            return (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: item.bg, border: `1px solid ${item.color}30` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.title}</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{item.desc}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: item.color }}>Sent: {autoCount} times</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}