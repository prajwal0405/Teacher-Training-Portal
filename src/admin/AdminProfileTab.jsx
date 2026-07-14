import { useState, useEffect } from "react";
import { getAdminProfile, updateAdminProfile, changeAdminPassword } from "../services/api";

export default function AdminProfileTab({ user, setToast, onUserUpdate }) {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", photoUrl: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    getAdminProfile().then(res => {
      if (res?.profile) setProfile({ name: res.profile.name || "", email: res.profile.email || "", phone: res.profile.phone || "", photoUrl: res.profile.photoUrl || "" });
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    if (!profile.name || !profile.email) return setToast({ msg: "Name and email are required", type: "error" });
    setSaving(true);
    try {
      const res = await updateAdminProfile(profile);
      setToast({ msg: "Profile updated!", type: "success" });
      if (onUserUpdate && res?.profile) onUserUpdate(prev => ({ ...prev, ...res.profile }));
    } catch (e) { setToast({ msg: e.message || "Failed", type: "error" }); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return setToast({ msg: "Fill all password fields", type: "error" });
    if (pwForm.newPassword !== pwForm.confirmPassword) return setToast({ msg: "Passwords don't match", type: "error" });
    if (pwForm.newPassword.length < 8) return setToast({ msg: "Password must be at least 8 characters", type: "error" });
    setPwSaving(true);
    try {
      await changeAdminPassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setToast({ msg: "Password changed!", type: "success" });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) { setToast({ msg: e.message || "Failed", type: "error" }); }
    setPwSaving(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>👤 Admin Profile</h2>

      <div style={{ background: "white", borderRadius: 14, padding: 24, border: "1px solid #e2e8f0", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Profile Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Full Name</label>
            <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Email</label>
            <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Phone</label>
            <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Photo URL</label>
            <input value={profile.photoUrl} onChange={e => setProfile({...profile, photoUrl: e.target.value})} placeholder="https://..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
        </div>
        <button onClick={handleSaveProfile} disabled={saving}
          style={{ marginTop: 16, padding: "10px 24px", borderRadius: 10, background: "#2563eb", color: "white", border: "none", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: 24, border: "1px solid #e2e8f0" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🔒 Change Password</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Current Password</label>
            <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>New Password</label>
            <input type="password" value={pwForm.newPassword} onChange={e => setPwForm({...pwForm, newPassword: e.target.value})}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Confirm New Password</label>
            <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({...pwForm, confirmPassword: e.target.value})}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
        </div>
        <button onClick={handleChangePassword} disabled={pwSaving}
          style={{ marginTop: 16, padding: "10px 24px", borderRadius: 10, background: "#dc2626", color: "white", border: "none", fontWeight: 700, fontSize: 13, cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.6 : 1 }}>
          {pwSaving ? "Changing..." : "Change Password"}
        </button>
      </div>
    </div>
  );
}
