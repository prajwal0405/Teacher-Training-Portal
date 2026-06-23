import { useEffect, useState, useCallback } from "react";
import { Modal, S, SectionCard, StatCard, StatusBadge } from "../components/Shared";
import { getAdminDashboard, getAdminTeachers, getTrainers, getCourses, getAdminUsers, getPortalSettings, updatePortalSettings, testSmtpEmail } from "../services/api";
import { setLanguage, getCurrentLanguage } from "../services/i18n";

const safeBool = (val, defaultVal = false) => {
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return defaultVal;
};

const safeNum = (val, defaultVal = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : defaultVal;
};

export default function SettingsTab({ setToast }) {
  const [activeSection, setActiveSection] = useState("portal");
  const [settings, setSettings] = useState({
    portalName: "SpacECE Teacher Training Portal",
    adminLanguage: getCurrentLanguage(),
    timezone: "Asia/Kolkata (IST)",
    maintenanceMode: false,
  });
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", fromEmail: "", fromName: "",
  });
  const [twilioConfig, setTwilioConfig] = useState({
    twilioSid: "", twilioToken: "", twilioFrom: "",
  });
  const [passwordPolicy, setPasswordPolicy] = useState({
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: false,
    expiryDays: 90,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [roleUsers, setRoleUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  // Load all data with individual fallbacks — one failure doesn't block everything
  useEffect(() => {
    let cancelled = false;
    const errors = [];

    const load = async () => {
      // 1. Load server settings
      try {
        const settingsData = await getPortalSettings();
        if (cancelled) return;
        const serverSettings = settingsData?.settings || {};
        if (Object.keys(serverSettings).length > 0) {
          setSettings((prev) => ({
            portalName: serverSettings.portalName || prev.portalName,
            adminLanguage: serverSettings.adminLanguage || prev.adminLanguage,
            timezone: serverSettings.timezone || prev.timezone,
            maintenanceMode: safeBool(serverSettings.maintenanceMode, prev.maintenanceMode),
          }));
          setEmailConfig((prev) => ({
            smtpHost: serverSettings.smtpHost || prev.smtpHost,
            smtpPort: serverSettings.smtpPort || prev.smtpPort,
            smtpUser: serverSettings.smtpUser || prev.smtpUser,
            smtpPass: serverSettings.smtpPass || prev.smtpPass,
            fromEmail: serverSettings.fromEmail || prev.fromEmail,
            fromName: serverSettings.fromName || prev.fromName,
          }));
          setTwilioConfig((prev) => ({
            twilioSid: serverSettings.twilioSid || prev.twilioSid,
            twilioToken: serverSettings.twilioToken || prev.twilioToken,
            twilioFrom: serverSettings.twilioFrom || prev.twilioFrom,
          }));
          setPasswordPolicy((prev) => ({
            minLength: safeNum(serverSettings.minLength, prev.minLength),
            requireUppercase: safeBool(serverSettings.requireUppercase, prev.requireUppercase),
            requireNumbers: safeBool(serverSettings.requireNumbers, prev.requireNumbers),
            requireSpecial: safeBool(serverSettings.requireSpecial, prev.requireSpecial),
            expiryDays: safeNum(serverSettings.expiryDays, prev.expiryDays),
          }));
        }
      } catch {
        errors.push("settings");
      }

      // 2. Load dashboard stats
      let dashboardData = {};
      try {
        const data = await getAdminDashboard();
        if (!cancelled) dashboardData = data || {};
      } catch {
        errors.push("dashboard");
      }

      // 3. Load teachers
      let teachers = [];
      try {
        const data = await getAdminTeachers();
        if (!cancelled) teachers = data?.teachers || [];
      } catch {
        errors.push("teachers");
      }

      // 4. Load trainers
      let trainers = [];
      try {
        const data = await getTrainers();
        if (!cancelled) trainers = data?.trainers || [];
      } catch {
        errors.push("trainers");
      }

      // 5. Load courses
      let courses = [];
      try {
        const data = await getCourses();
        if (!cancelled) courses = data?.courses || [];
      } catch {
        errors.push("courses");
      }

      // 6. Load all users (for admins count)
      let allUsers = [];
      try {
        const data = await getAdminUsers();
        if (!cancelled) allUsers = data?.users || [];
      } catch {
        errors.push("users");
      }

      if (cancelled) return;

      const admins = allUsers.filter((u) => u.role === "admin");

      setStats({
        totalTeachers: teachers.length,
        approvedTeachers: teachers.filter((t) => t.status === "approved").length,
        pendingTeachers: teachers.filter((t) => t.status === "pending").length,
        totalTrainers: trainers.length,
        activeTrainers: trainers.filter((t) => t.status === "active").length,
        totalCourses: courses.length,
        totalAdmins: admins.length,
        ...dashboardData,
      });

      // Build role-wise user data
      setRoleUsers([
        {
          role: "admin",
          label: "Super Admin",
          count: admins.length,
          users: admins.map((u) => ({ name: u.name, email: u.email, status: u.status || "active", _id: u._id })),
        },
        {
          role: "trainer",
          label: "Trainer",
          count: trainers.length,
          users: trainers.map((t) => ({ name: t.name, email: t.email || "", status: t.status || "active", _id: t._id })),
        },
        {
          role: "teacher",
          label: "Teacher",
          count: teachers.length,
          users: teachers.map((t) => ({ name: t.name, email: t.email, status: t.status, _id: t._id })),
        },
      ]);

      setLoadErrors(errors);
      setLoading(false);
    };

    load();

    return () => { cancelled = true; };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        portalName: settings.portalName,
        adminLanguage: settings.adminLanguage,
        timezone: settings.timezone,
        maintenanceMode: settings.maintenanceMode,
        minLength: passwordPolicy.minLength,
        requireUppercase: passwordPolicy.requireUppercase,
        requireNumbers: passwordPolicy.requireNumbers,
        requireSpecial: passwordPolicy.requireSpecial,
        expiryDays: passwordPolicy.expiryDays,
        smtpHost: emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort,
        smtpUser: emailConfig.smtpUser,
        smtpPass: emailConfig.smtpPass,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
        twilioSid: twilioConfig.twilioSid,
        twilioToken: twilioConfig.twilioToken,
        twilioFrom: twilioConfig.twilioFrom,
      };

      const data = await updatePortalSettings(payload);
      if (data?.settings) {
        setDirty(false);
        setToast?.({ msg: "All settings saved to server successfully!", type: "success" });
      }
    } catch (error) {
      setToast?.({ msg: error.message || "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  }, [settings, passwordPolicy, emailConfig, twilioConfig, setToast]);

  const markDirty = useCallback(() => setDirty(true), []);

  const handleTestEmail = useCallback(async () => {
    if (!testEmailTo.trim()) {
      setTestEmailResult({ success: false, message: "Please enter a recipient email address." });
      return;
    }
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const data = await testSmtpEmail(testEmailTo.trim());
      setTestEmailResult({ success: data.success, message: data.message });
      if (data.success) {
        setToast?.({ msg: `✅ Test email sent to ${testEmailTo}!`, type: "success" });
      } else {
        setToast?.({ msg: data.message || "Test email failed.", type: "error" });
      }
    } catch (error) {
      const msg = error.message || "Failed to send test email.";
      setTestEmailResult({ success: false, message: msg });
      setToast?.({ msg, type: "error" });
    } finally {
      setTestEmailSending(false);
    }
  }, [testEmailTo, setToast]);

  const roleCards = [
    {
      role: "Super Admin",
      access: "Full access to all modules including financial and role management",
      count: stats?.totalAdmins || 0,
      color: "#ef4444",
      bg: "#fee2e2",
    },
    {
      role: "Trainer",
      access: "Content upload, assignment review, live sessions, forum",
      count: stats?.activeTrainers || 0,
      color: "#8b5cf6",
      bg: "#ede9fe",
    },
    {
      role: "Teacher",
      access: "Course access, lesson plan submission, attendance, feedback",
      count: stats?.approvedTeachers || 0,
      color: "#10b981",
      bg: "#d1fae5",
    },
    {
      role: "Pending Teachers",
      access: "Awaiting approval in Teacher Management tab",
      count: stats?.pendingTeachers || 0,
      color: "#f59e0b",
      bg: "#fef3c7",
    },
  ];

  const sections = [
    { key: "portal", label: "⚙️ Portal" },
    { key: "email", label: "📧 Email" },
    { key: "messaging", label: "📱 SMS & WhatsApp" },
    { key: "security", label: "🔒 Security" },
    { key: "roles", label: "🛡️ Roles" },
  ];

  const openUserModal = (roleLabel) => {
    setSelectedRole(roleLabel);
    setShowUserModal(true);
  };

  const modalUsers = (() => {
    const roleMap = {
      "Super Admin": "admin",
      "Trainer": "trainer",
      "Teacher": "teacher",
      "Pending Teachers": "teacher",
    };
    const roleKey = roleMap[selectedRole] || "";
    const matched = roleUsers.find((r) => r.role === roleKey);
    if (!matched) return [];
    if (selectedRole === "Pending Teachers") {
      return matched.users.filter((u) => u.status === "pending");
    }
    return matched.users;
  })();

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {showUserModal && (
        <Modal title={`Users — ${selectedRole}`} onClose={() => setShowUserModal(false)}>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {modalUsers.length > 0 ? (
              modalUsers.map((u, i) => (
                <div key={u._id || i} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{u.name || "Unnamed"}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{u.email || "—"}</div>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: 30, color: "#9ca3af", fontSize: 13 }}>No users found for this role.</div>
            )}
          </div>
        </Modal>
      )}

      <h1 style={S.pageTitle}>Settings & Roles</h1>
      <p style={S.pageSub}>Manage portal settings, email configuration, security policies, and role-based access.</p>

      {/* Load errors banner */}
      {loadErrors.length > 0 && !loading && (
        <div style={{ marginBottom: 16, padding: "10px 16px", background: "#fef3c7", borderRadius: 10, border: "1px solid #fbbf24", fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚠️</span>
          <span>Could not load: {loadErrors.join(", ")}. Some data may be unavailable.</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>Loading system data...</div>
      ) : (
        <>
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14, marginBottom: 20 }}>
              <StatCard icon="👥" label="Total Teachers" val={stats.totalTeachers} color="#f59e0b" bg="#fef3c7" />
              <StatCard icon="✅" label="Approved" val={stats.approvedTeachers} color="#10b981" bg="#d1fae5" />
              <StatCard icon="⏳" label="Pending" val={stats.pendingTeachers} color="#3b82f6" bg="#dbeafe" />
              <StatCard icon="🎓" label="Trainers" val={stats.totalTrainers} color="#8b5cf6" bg="#ede9fe" />
              <StatCard icon="📚" label="Courses" val={stats.totalCourses} color="#06b6d4" bg="#cffafe" />
            </div>
          )}

          <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "2px solid #f3f4f6" }}>
            {sections.map((s) => (
              <button key={s.key} onClick={() => setActiveSection(s.key)} style={{ padding: "10px 18px", border: "none", borderBottom: `2px solid ${activeSection === s.key ? "#f59e0b" : "transparent"}`, background: "none", color: activeSection === s.key ? "#92400e" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: -2 }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Portal Settings */}
          {activeSection === "portal" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <SectionCard title="⚙️ General Settings">
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Portal Name</label>
                  <input style={S.input} value={settings.portalName} onChange={(e) => { setSettings((p) => ({ ...p, portalName: e.target.value })); markDirty(); }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Admin Panel Language</label>
                  <select style={S.input} value={settings.adminLanguage} onChange={(e) => {
                    const newLang = e.target.value;
                    setSettings((p) => ({ ...p, adminLanguage: newLang }));
                    setLanguage(newLang);
                    markDirty();
                  }}>
                    <option value="English">English</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                    <option value="Marathi">मराठी (Marathi)</option>
                  </select>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>This language applies to your admin panel only. Teachers control their own language in My Profile.</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Timezone</label>
                  <select style={S.input} value={settings.timezone} onChange={(e) => { setSettings((p) => ({ ...p, timezone: e.target.value })); markDirty(); }}>
                    <option>Asia/Kolkata (IST)</option>
                    <option>UTC</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #f3f4f6", marginTop: 4 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>🔧 Maintenance Mode</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>Disable public access to portal</div>
                  </div>
                  <div onClick={() => { setSettings((p) => ({ ...p, maintenanceMode: !p.maintenanceMode })); markDirty(); }} style={{ width: 46, height: 26, borderRadius: 13, background: settings.maintenanceMode ? "#ef4444" : "#e5e7eb", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
                    <div style={{ position: "absolute", top: 3, left: settings.maintenanceMode ? 22 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="📊 System Information">
                {stats && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Active Centers", val: stats.totalCenters || 0 },
                      { label: "Total Children", val: stats.totalChildren || 0 },
                      { label: "Pending Activities", val: stats.pendingActivities || 0 },
                      { label: "Course Completion", val: `${stats.courseCompletionPercent || 0}%`, color: "#10b981" },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: "12px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: item.color || "#1c1917" }}>{item.val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* Email Configuration */}
          {activeSection === "email" && (
            <SectionCard title="📧 Email (SMTP) Configuration">
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
                Configure SMTP settings to send real emails to registered teacher email addresses. Used for notifications, password resets, and system alerts.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>SMTP Host</label>
                  <input type="text" style={S.input} placeholder="smtp.gmail.com" value={emailConfig.smtpHost} onChange={(e) => { setEmailConfig((p) => ({ ...p, smtpHost: e.target.value })); markDirty(); }} />
                </div>
                <div>
                  <label style={S.label}>SMTP Port</label>
                  <input type="number" style={S.input} placeholder="587" value={emailConfig.smtpPort} onChange={(e) => { setEmailConfig((p) => ({ ...p, smtpPort: Number(e.target.value) })); markDirty(); }} />
                </div>
                <div>
                  <label style={S.label}>SMTP Username</label>
                  <input type="text" style={S.input} placeholder="your-email@gmail.com" value={emailConfig.smtpUser} onChange={(e) => { setEmailConfig((p) => ({ ...p, smtpUser: e.target.value })); markDirty(); }} />
                </div>
                <div>
                  <label style={S.label}>SMTP Password / App Password</label>
                  <input type="password" style={S.input} placeholder="••••••••" value={emailConfig.smtpPass} onChange={(e) => { setEmailConfig((p) => ({ ...p, smtpPass: e.target.value })); markDirty(); }} />
                </div>
                <div>
                  <label style={S.label}>From Email</label>
                  <input type="email" style={S.input} placeholder="noreply@portal.com" value={emailConfig.fromEmail} onChange={(e) => { setEmailConfig((p) => ({ ...p, fromEmail: e.target.value })); markDirty(); }} />
                </div>
                <div>
                  <label style={S.label}>From Name</label>
                  <input type="text" style={S.input} placeholder="SpacECE Portal" value={emailConfig.fromName} onChange={(e) => { setEmailConfig((p) => ({ ...p, fromName: e.target.value })); markDirty(); }} />
                </div>
              </div>

              <div style={{ background: "#fef3c7", padding: "12px 16px", borderRadius: 10, border: "1px solid #fbbf24", fontSize: 12, color: "#92400e", marginBottom: 20 }}>
                💡 <strong>Gmail users:</strong> Use host <code>smtp.gmail.com</code>, port <code>587</code>, and generate an <strong>App Password</strong> (not your regular password) from Google Account → Security → 2-Step Verification → App passwords.
              </div>

              {/* ─── Test Email ─── */}
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", marginBottom: 4 }}>🧪 Test Email Delivery</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, lineHeight: 1.5 }}>
                  Save your SMTP settings first, then send a test email to verify delivery is working. You can use your own email address to confirm receipt.
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <input
                      id="test-email-recipient"
                      type="email"
                      style={{ ...S.input, marginBottom: 0 }}
                      placeholder="Enter recipient email to test (e.g. your@email.com)"
                      value={testEmailTo}
                      onChange={(e) => { setTestEmailTo(e.target.value); setTestEmailResult(null); }}
                    />
                  </div>
                  <button
                    id="btn-send-test-email"
                    onClick={handleTestEmail}
                    disabled={testEmailSending}
                    style={{
                      ...S.primaryBtn,
                      whiteSpace: "nowrap",
                      opacity: testEmailSending ? 0.7 : 1,
                      minWidth: 130,
                    }}
                  >
                    {testEmailSending ? "Sending..." : "📤 Send Test"}
                  </button>
                </div>

                {testEmailResult && (
                  <div style={{
                    marginTop: 12,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: testEmailResult.success ? "#d1fae5" : "#fee2e2",
                    border: `1px solid ${testEmailResult.success ? "#6ee7b7" : "#fca5a5"}`,
                    fontSize: 13,
                    color: testEmailResult.success ? "#065f46" : "#991b1b",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <span>{testEmailResult.success ? "✅" : "❌"}</span>
                    <span>{testEmailResult.message}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* SMS / WhatsApp Configuration */}
          {activeSection === "messaging" && (
            <SectionCard title="💬 SMS & WhatsApp (Twilio) Configuration">
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
                Configure Twilio credentials to send real SMS and WhatsApp messages to registered teacher phone numbers.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Twilio Account SID</label>
                  <input type="text" style={S.input} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioConfig.twilioSid} onChange={(e) => { setTwilioConfig((p) => ({ ...p, twilioSid: e.target.value })); markDirty(); }} />
                </div>
                <div>
                  <label style={S.label}>Twilio Auth Token</label>
                  <input type="password" style={S.input} placeholder="••••••••••••••••••••••••••••" value={twilioConfig.twilioToken} onChange={(e) => { setTwilioConfig((p) => ({ ...p, twilioToken: e.target.value })); markDirty(); }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={S.label}>Twilio From Number</label>
                  <input type="text" style={S.input} placeholder="+1234567890 (for WhatsApp: whatsapp:+1234567890)" value={twilioConfig.twilioFrom} onChange={(e) => { setTwilioConfig((p) => ({ ...p, twilioFrom: e.target.value })); markDirty(); }} />
                </div>
              </div>
              <div style={{ background: "#fef3c7", padding: "12px 16px", borderRadius: 10, border: "1px solid #fbbf24", fontSize: 12, color: "#92400e" }}>
                Get credentials from <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>Twilio Console</a>. For WhatsApp, enable the WhatsApp sandbox and use <code>whatsapp:+14155238886</code> as the from number.
              </div>
            </SectionCard>
          )}

          {/* Security / Password Policy */}
          {activeSection === "security" && (
            <SectionCard title="🔒 Password & Security Policy">
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
                Configure password requirements for all users. These rules will be enforced on registration and password reset.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={S.label}>Minimum Password Length</label>
                  <input type="number" style={S.input} value={passwordPolicy.minLength} onChange={(e) => { setPasswordPolicy((p) => ({ ...p, minLength: Number(e.target.value) })); markDirty(); }} min={6} max={32} />
                </div>
                <div>
                  <label style={S.label}>Password Expiry (days)</label>
                  <input type="number" style={S.input} value={passwordPolicy.expiryDays} onChange={(e) => { setPasswordPolicy((p) => ({ ...p, expiryDays: Number(e.target.value) })); markDirty(); }} min={0} max={365} />
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>0 = never expires</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { key: "requireUppercase", label: "Require Uppercase Letter", desc: "At least one uppercase character" },
                  { key: "requireNumbers", label: "Require Numbers", desc: "At least one numeric character" },
                  { key: "requireSpecial", label: "Require Special Characters", desc: "At least one special character (!@#$ etc.)" },
                ].map((item) => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1917" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>Password must contain {item.desc}</div>
                    </div>
                    <div onClick={() => { setPasswordPolicy((p) => ({ ...p, [item.key]: !p[item.key] })); markDirty(); }} style={{ width: 40, height: 22, borderRadius: 11, background: passwordPolicy[item.key] ? "#10b981" : "#e5e7eb", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
                      <div style={{ position: "absolute", top: 2, left: passwordPolicy[item.key] ? 19 : 2, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Roles */}
          {activeSection === "roles" && (
            <SectionCard title="🛡️ Role-Based Access Control">
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14, lineHeight: 1.5 }}>
                Live user counts from the database. Click &quot;View Users&quot; to see the actual users assigned to each role.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {roleCards.map((r, i) => (
                  <div key={i} style={{ padding: "12px 16px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{r.role}</span>
                          <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: r.count > 0 ? r.bg : "#f3f4f6", color: r.count > 0 ? r.color : "#9ca3af" }}>
                            {r.count > 0 ? `${r.count} user${r.count !== 1 ? "s" : ""}` : "No users"}
                          </span>
                        </div>
                      </div>
                      {r.count > 0 && (
                        <button onClick={() => openUserModal(r.role)} style={{ ...S.tblBtn, fontSize: 10, padding: "4px 10px" }}>
                          👥 View Users
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, paddingLeft: 18 }}>{r.access}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {dirty && (
            <div style={{ position: "sticky", bottom: 0, background: "white", padding: "16px 24px", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)", marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "#d97706", fontWeight: 600 }}>⚠️ You have unsaved changes</div>
              <button onClick={handleSave} disabled={saving} style={{ ...S.primaryBtn }}>{saving ? "Saving..." : "💾 Save All Settings"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
