import { useState, useEffect } from "react";
import { Logo, Toast, Particles, S, globalCSS } from "../components/Shared";
import { loginUser, registerTeacher } from "../services/api";

/* ── Animated illustration ── */
function LoginIllustration() {
  return (
    <div style={{ position: "relative", width: 320, height: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glow-ring ring-1" /><div className="glow-ring ring-2" /><div className="glow-ring ring-3" />
      <div className="blob-wrap">
        <div className="blob blob-a" /><div className="blob blob-b" /><div className="blob blob-c" />
        <div className="cap-center">🎓</div>
      </div>
      <div className="orbit orbit-a"><div className="planet p-blue" /></div>
      <div className="orbit orbit-b"><div className="planet p-violet" /></div>
      <div className="orbit orbit-c"><div className="planet p-teal" /></div>
      <div className="orbit orbit-d"><div className="planet p-amber" /></div>
      {["📐 Math", "🔬 Science", "📜 History", "📖 Literature", "⚛️ Physics", "🌍 Geography"].map((l, i) => (
        <div key={i} className={`chip chip-${i + 1}`}>{l}</div>
      ))}
      <svg className="arcs-svg" viewBox="0 0 370 370" fill="none">
        <path d="M185 30 Q340 100 320 185 Q300 270 185 340 Q70 270 50 185 Q30 100 185 30Z"
          stroke="url(#g1)" strokeWidth="1" strokeDasharray="8 6" opacity="0.35">
          <animateTransform attributeName="transform" type="rotate" from="0 185 185" to="360 185 185" dur="18s" repeatCount="indefinite" />
        </path>
        <path d="M185 55 Q310 110 295 185 Q280 260 185 315 Q90 260 75 185 Q60 110 185 55Z"
          stroke="url(#g2)" strokeWidth="1.5" strokeDasharray="12 8" opacity="0.28">
          <animateTransform attributeName="transform" type="rotate" from="360 185 185" to="0 185 185" dur="14s" repeatCount="indefinite" />
        </path>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="370" y2="370" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient>
          <linearGradient id="g2" x1="370" y1="0" x2="0" y2="370" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#1c1917" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ── Password Strength Indicator ── */
function StrengthBar({ password }) {
  let s = 0;
  if (password.length >= 8) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;

  const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  if (!password) return null;

  return (
    <div style={{ marginTop: 6, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 3 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < s ? colors[s - 1] : "rgba(0,0,0,0.08)", transition: "background 0.3s" }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[s - 1], fontWeight: 600 }}>{labels[s - 1]}</span>
    </div>
  );
}

/* ── Login Form ── */
function LoginForm({ onLogin, onGoRegister, onGoForgot }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast]       = useState({ msg: "", type: "" });

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) { setToast({ msg: "Please fill in all fields.", type: "error" }); return; }

    loginUser({ email, password })
      .then((data) => {
        onLogin(data);
      })
      .catch((err) => {
        setToast({ msg: err.message || "Incorrect credentials. Please try again.", type: "error" });
      });
  };

  return (
    <>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
      <Logo size={160} />
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <span style={ls.badge}>Welcome Back</span>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontStyle: "italic" }}>Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin}>
        <label style={S.label}>Email Address</label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={S.fieldIcon}>📧</span>
          <input style={{ ...S.input, paddingLeft: 32 }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        </div>
        <label style={S.label}>Password</label>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <span style={S.fieldIcon}>🔒</span>
          <input style={{ ...S.input, paddingLeft: 32 }} type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
          <button type="button" onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af" }}>
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>

        {/* Forgot Password Link */}
        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <span onClick={onGoForgot} style={{ fontSize: 12, color: "#d97706", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
            Forgot password?
          </span>
        </div>

        <button type="submit" style={{ ...S.primaryBtn, width: "100%", padding: "12px" }}>Sign In →</button>
      </form>
      <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 16, marginBottom: 0 }}>
        New teacher?{" "}
        <span onClick={onGoRegister} style={{ color: "#d97706", fontWeight: 700, cursor: "pointer" }}>Register here</span>
      </p>
    </>
  );
}

/* ── Forgot Password Form ── */
function ForgotPasswordForm({ onBack }) {
  const [email, setEmail]       = useState("");
  const [sent, setSent]         = useState(false);
  const [toast, setToast]       = useState({ msg: "", type: "" });
  const [mockLink, setMockLink] = useState("");

  const handleForgot = (e) => {
    e.preventDefault();
    if (!email) { setToast({ msg: "Please enter your email address.", type: "error" }); return; }

    const teachers  = JSON.parse(localStorage.getItem("spaceece_teachers") || "[]");
    const isTeacher = teachers.find(t => t.email === email);
    const isAdmin   = email === ADMIN_CREDENTIALS.email;

    if (!isTeacher && !isAdmin) {
      setToast({ msg: "No account found with this email address.", type: "error" });
      return;
    }

    const token     = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiry    = Date.now() + 15 * 60 * 1000;
    const resetData = { email, token, expiry };
    localStorage.setItem("spaceece_reset_token", JSON.stringify(resetData));

    const simulatedLink = `${window.location.origin}${window.location.pathname}?reset_token=${token}`;
    setMockLink(simulatedLink);
    setSent(true);
  };

  if (sent) {
    return (
      <>
        <Logo size={140} />
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
          <span style={ls.badge}>Check Your Inbox</span>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8, lineHeight: 1.6 }}>
            A password reset link has been sent to<br />
            <strong style={{ color: "#92400e" }}>{email}</strong>
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>Link expires in 15 minutes.</p>
        </div>

        <div style={{ background: "#fffbeb", border: "1px dashed #fbbf24", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: "#92400e", fontWeight: 700, marginBottom: 6 }}>
            🛠️ Demo Mode — No real email server connected
          </p>
          <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, lineHeight: 1.5 }}>
            In production, this link goes to the user's inbox. For now, copy it below to test the reset flow:
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              readOnly
              value={mockLink}
              style={{ ...S.input, fontSize: 10, flex: 1, padding: "6px 10px", color: "#374151", background: "#fff" }}
            />
            <button
              onClick={() => { navigator.clipboard.writeText(mockLink); setToast({ msg: "Link copied!", type: "success" }); }}
              style={{ ...S.primaryBtn, padding: "6px 12px", fontSize: 11, whiteSpace: "nowrap" }}
            >
              Copy
            </button>
          </div>
        </div>

        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
        <button onClick={onBack} style={{ ...S.primaryBtn, width: "100%", padding: "12px" }}>← Back to Sign In</button>
      </>
    );
  }

  return (
    <>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
      <Logo size={140} />
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔑</div>
        <span style={ls.badge}>Reset Password</span>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontStyle: "italic" }}>
          Enter your registered email and we'll send a reset link
        </p>
      </div>
      <form onSubmit={handleForgot}>
        <label style={S.label}>Registered Email Address</label>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <span style={S.fieldIcon}>📧</span>
          <input
            style={{ ...S.input, paddingLeft: 32 }}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoFocus
          />
        </div>
        <button type="submit" style={{ ...S.primaryBtn, width: "100%", padding: "12px" }}>
          Send Reset Link →
        </button>
      </form>
      <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 16, marginBottom: 0 }}>
        Remembered it?{" "}
        <span onClick={onBack} style={{ color: "#d97706", fontWeight: 700, cursor: "pointer" }}>Sign in</span>
      </p>
    </>
  );
}

/* ── Reset Password Form (reached via reset link token) ── */
function ResetPasswordForm({ token, onDone }) {
  const [password, setPassword]       = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [toast, setToast]             = useState({ msg: "", type: "" });
  const [tokenValid, setTokenValid]   = useState(null);
  const [tokenEmail, setTokenEmail]   = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("spaceece_reset_token");
    if (!raw) { setTokenValid(false); return; }
    try {
      const data = JSON.parse(raw);
      if (data.token !== token || Date.now() > data.expiry) {
        setTokenValid(false);
      } else {
        setTokenValid(true);
        setTokenEmail(data.email);
      }
    } catch {
      setTokenValid(false);
    }
  }, [token]);

  const handleReset = (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) { setToast({ msg: "Please fill in both fields.", type: "error" }); return; }
    if (password !== confirmPassword)  { setToast({ msg: "Passwords do not match.", type: "error" }); return; }
    if (password.length < 8)           { setToast({ msg: "Password must be at least 8 characters.", type: "error" }); return; }

    if (tokenEmail !== ADMIN_CREDENTIALS.email) {
      const teachers = JSON.parse(localStorage.getItem("spaceece_teachers") || "[]");
      const updated  = teachers.map(t => t.email === tokenEmail ? { ...t, password } : t);
      localStorage.setItem("spaceece_teachers", JSON.stringify(updated));
    }

    localStorage.removeItem("spaceece_reset_token");
    setToast({ msg: "Password updated successfully!", type: "success" });
    setTimeout(onDone, 1800);
  };

  if (tokenValid === null) {
    return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Verifying link…</div>;
  }

  if (tokenValid === false) {
    return (
      <>
        <Logo size={140} />
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⛔</div>
          <span style={ls.badge}>Link Expired or Invalid</span>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 10, lineHeight: 1.6 }}>
            This password reset link is no longer valid.<br />
            Please request a new one.
          </p>
          <button onClick={onDone} style={{ ...S.primaryBtn, marginTop: 24, padding: "10px 28px" }}>
            ← Back to Sign In
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
      <Logo size={140} />
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
        <span style={ls.badge}>Set New Password</span>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontStyle: "italic" }}>
          Resetting password for <strong style={{ color: "#92400e" }}>{tokenEmail}</strong>
        </p>
      </div>
      <form onSubmit={handleReset}>
        <label style={S.label}>New Password</label>
        <div style={{ position: "relative", marginBottom: 4 }}>
          <span style={S.fieldIcon}>🔒</span>
          <input
            style={S.input}
            type={showPass ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            autoFocus
          />
          <button type="button" onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>
        <StrengthBar password={password} />
        <div style={{ marginTop: 14, marginBottom: 20 }}>
          <label style={S.label}>Confirm New Password</label>
          <div style={{ position: "relative" }}>
            <span style={S.fieldIcon}>🛡️</span>
            <input
              style={S.input}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>
          {confirmPassword && (
            <p style={{ fontSize: 11, marginTop: 4, color: password === confirmPassword ? "#10b981" : "#ef4444", fontWeight: 600 }}>
              {password === confirmPassword ? "✅ Passwords match" : "❌ Passwords do not match"}
            </p>
          )}
        </div>
        <button type="submit" style={{ ...S.primaryBtn, width: "100%", padding: "12px" }}>
          Update Password →
        </button>
      </form>
    </>
  );
}

/* ── Register Form ── */
function RegisterForm({ onBack }) {
  const [form, setForm]         = useState({ name: "", email: "", phone: "", address: "", subject: "", photo: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast]       = useState({ msg: "", type: "" });

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setToast({ msg: "Please upload an image file (PNG/JPG).", type: "error" }); return; }
    if (file.size > 1024 * 1024)         { setToast({ msg: "Image is too large. Please select a photo under 1MB.", type: "error" }); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, photo: reader.result });
    reader.readAsDataURL(file);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const { name, email, phone, address, subject, password, confirmPassword } = form;
    if (!name || !email || !phone || !address || !subject || !password || !confirmPassword) { setToast({ msg: "Please fill all fields.", type: "error" }); return; }
    if (password !== confirmPassword) { setToast({ msg: "Passwords do not match.", type: "error" }); return; }
    if (password.length < 8)          { setToast({ msg: "Password must be at least 8 characters.", type: "error" }); return; }

    registerTeacher({
      name,
      email,
      phone,
      password,
      qualification: "B.Ed",
      subject,
      experience: "2 years",
      address,
    })
      .then(() => {
        setToast({ msg: "Registration submitted! Awaiting admin approval.", type: "success" });
        setTimeout(onBack, 2000);
      })
      .catch((err) => {
        setToast({ msg: err.message || "Failed to submit registration.", type: "error" });
      });
  };

  return (
    <>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
      <Logo size={140} />
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={ls.badge}>Teacher Registration</span>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontStyle: "italic" }}>Admin will approve your account</p>
      </div>
      <form onSubmit={handleRegister}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Full Name</label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={S.fieldIcon}>👤</span>
              <input style={{ ...S.input, paddingLeft: 32 }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Subject</label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={S.fieldIcon}>📘</span>
              <input style={{ ...S.input, paddingLeft: 32 }} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Mathematics" />
            </div>
          </div>
        </div>
        {[
          { key: "email", label: "Email", icon: "📧", type: "email", ph: "teacher@school.edu" },
          { key: "phone", label: "Phone", icon: "📱", type: "tel", ph: "+91 98765 43210" },
        ].map(f => (
          <div key={f.key}>
            <label style={S.label}>{f.label}</label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={S.fieldIcon}>{f.icon}</span>
              <input style={{ ...S.input, paddingLeft: 32 }} type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph} />
            </div>
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Upload Profile Photo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <input type="file" accept="image/*" onChange={handlePhotoUpload}
              style={{ fontSize: 12, color: "#6b7280", width: "100%", padding: "8px", borderRadius: 8, border: "1px dashed #d97706", background: "#fffbeb", cursor: "pointer" }} />
            {form.photo && <img src={form.photo} alt="Preview" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #fbbf24" }} />}
          </div>
        </div>
        <label style={S.label}>School / Address</label>
        <textarea style={{ ...S.input, height: 56, resize: "none", marginBottom: 12, paddingLeft: 32 }}
          value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="School name and location" />
        <label style={S.label}>Password</label>
        <div style={{ position: "relative", marginBottom: 4 }}>
          <span style={S.fieldIcon}>🔒</span>
          <input style={{ ...S.input, paddingLeft: 32 }} type={showPass ? "text" : "password"} value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" />
          <button type="button" onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>
        <StrengthBar password={form.password} />
        <div style={{ marginTop: 12, marginBottom: 20 }}>
          <label style={S.label}>Confirm Password</label>
          <div style={{ position: "relative" }}>
            <span style={S.fieldIcon}>🛡️</span>
            <input style={{ ...S.input, paddingLeft: 32 }} type="password" value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Re-enter password" />
          </div>
        </div>
        <button type="submit" style={{ ...S.primaryBtn, width: "100%", padding: "12px" }}>Submit Registration →</button>
      </form>
      <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 14, marginBottom: 0 }}>
        Already registered?{" "}
        <span onClick={onBack} style={{ color: "#d97706", fontWeight: 700, cursor: "pointer" }}>Sign in</span>
      </p>
    </>
  );
}

/* ── Main LoginPage Export ── */
export default function LoginPage({ onLogin }) {
  const [view, setView] = useState("login"); // login | register | forgot | reset

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("reset_token");
    if (token) {
      setView({ type: "reset", token });
    }
  }, []);

  const handleResetDone = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setView("login");
  };

  const isResetView = typeof view === "object" && view.type === "reset";

  return (
    <div style={ls.bg}>
      <Particles />
      <style>{globalCSS}</style>
      <div style={ls.panel}>
        {/* Left — illustration (hidden on reset view for cleaner focus) */}
        {!isResetView && (
          <div style={ls.left}>
            <LoginIllustration />
            <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginTop: 20, letterSpacing: "0.3px" }}>
              🎓 SpacECE Teacher Portal
            </p>
          </div>
        )}

        {/* Right — form */}
        <div style={isResetView ? { ...ls.right, maxWidth: 500, margin: "0 auto", flex: "unset", width: "100%" } : ls.right}>
          {isResetView ? (
            <ResetPasswordForm token={view.token} onDone={handleResetDone} />
          ) : view === "login" ? (
            <LoginForm onLogin={onLogin} onGoRegister={() => setView("register")} onGoForgot={() => setView("forgot")} />
          ) : view === "register" ? (
            <RegisterForm onBack={() => setView("login")} />
          ) : (
            <ForgotPasswordForm onBack={() => setView("login")} />
          )}
        </div>
      </div>
    </div>
  );
}

const ls = {
  bg:    { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
           background: "linear-gradient(135deg,#fef3c7 0%,#fde68a 30%,#fbbf24 65%,#f59e0b 100%)",
           position: "relative", overflow: "hidden", padding: "24px",
           fontFamily: "'Segoe UI','Inter',-apple-system,sans-serif" },
  panel: { display: "flex", alignItems: "stretch", background: "rgba(255,255,255,0.97)",
           borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(180,120,0,0.18)",
           border: "1px solid rgba(245,158,11,0.2)", zIndex: 1, width: "100%", maxWidth: 900 },
  left:  { flex: "0 0 440px", background: "linear-gradient(160deg,#fffbeb,#fef3c7)", padding: "48px 32px",
           display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
           borderRight: "1px solid rgba(245,158,11,0.15)" },
  right: { flex: 1, padding: "48px 44px", display: "flex", flexDirection: "column", justifyContent: "center", overflowY: "auto" },
  badge: { display: "inline-block", padding: "4px 14px", background: "#fef3c7", color: "#92400e",
           borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid #fbbf24" },
};