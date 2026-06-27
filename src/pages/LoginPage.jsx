import { useState, useEffect } from "react";
import { Logo, Toast, Particles, S, globalCSS } from "../components/Shared";
import { loginUser, registerTeacher, requestPasswordReset, resetPassword, verifyPasswordResetToken, requestPasswordResetOtp, verifyPasswordOtp } from "../services/api";

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
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState({ msg: "", type: "" });

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) { setToast({ msg: "Please fill in all fields.", type: "error" }); return; }

    setLoading(true);
    loginUser({ email, password })
      .then((data) => {
        onLogin(data);
      })
      .catch((err) => {
        setToast({ msg: err.message || "Incorrect credentials. Please try again.", type: "error" });
      })
      .finally(() => {
        setLoading(false);
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
          <input style={{ ...S.input, paddingLeft: 32 }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" disabled={loading} />
        </div>
        <label style={S.label}>Password</label>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <span style={S.fieldIcon}>🔒</span>
          <input style={{ ...S.input, paddingLeft: 32 }} type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" disabled={loading} />
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

/* ── OTP Input Component ── */
function OtpInput({ length = 6, value, onChange, disabled }) {
  const inputs = Array.from({ length }, (_, i) => i);
  
  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length > 1) return;
    const newOtp = value.split("");
    newOtp[index] = val;
    onChange(newOtp.join("").slice(0, length));
    // Auto-focus next input
    if (val && index < length - 1) {
      const next = e.target.parentElement.querySelector(`input[data-index="${index + 1}"]`);
      if (next) next.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      const prev = e.target.parentElement.querySelector(`input[data-index="${index - 1}"]`);
      if (prev) prev.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {inputs.map(i => (
        <input
          key={i}
          data-index={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          style={{
            width: 48, height: 56, textAlign: "center", fontSize: 22, fontWeight: 800,
            border: "2px solid", borderRadius: 12, outline: "none", fontFamily: "monospace",
            borderColor: value[i] ? "#f59e0b" : "#e5e7eb",
            background: value[i] ? "#fef3c7" : "white",
            color: "#92400e",
            transition: "all 0.2s",
          }}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

/* ── Forgot Password Form (OTP-based) ── */
function ForgotPasswordForm({ onBack }) {
  const [email, setEmail]           = useState("");
  const [step, setStep]             = useState("email"); // email | otp | reset
  const [otp, setOtp]               = useState("");
  const [otpExpiry, setOtpExpiry]   = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState({ msg: "", type: "" });
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) { setToast({ msg: "Please enter your email address.", type: "error" }); return; }
    setLoading(true);
    try {
      const data = await requestPasswordResetOtp(email);
      if (data.emailSent === false) {
        setToast({ msg: "Failed to send OTP email. Please check your email configuration or contact admin.", type: "error" });
        setLoading(false);
        return;
      }
      setOtpExpiry(data.otpExpiryMinutes || 10);
      setStep("otp");
      setResendTimer(60);
      setToast({ msg: "OTP sent to your email! Check your inbox.", type: "success" });
    } catch (err) {
      setToast({ msg: err.message || "Failed to send OTP.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setToast({ msg: "Please enter the complete 6-digit OTP.", type: "error" }); return; }
    setLoading(true);
    try {
      const data = await verifyPasswordOtp(email, otp);
      setResetToken(data.resetToken);
      setStep("reset");
      setToast({ msg: "OTP verified! Set your new password.", type: "success" });
    } catch (err) {
      setToast({ msg: err.message || "Invalid OTP.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) { setToast({ msg: "Please fill both password fields.", type: "error" }); return; }
    if (password !== confirmPassword) { setToast({ msg: "Passwords do not match.", type: "error" }); return; }
    if (password.length < 8) { setToast({ msg: "Password must be at least 8 characters.", type: "error" }); return; }
    setLoading(true);
    try {
      await resetPassword(resetToken, password);
      setToast({ msg: "Password updated successfully!", type: "success" });
      setTimeout(onBack, 1800);
    } catch (err) {
      setToast({ msg: err.message || "Failed to reset password.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const data = await requestPasswordResetOtp(email);
      if (data.emailSent === false) {
        setToast({ msg: "Failed to send OTP email. Please contact admin.", type: "error" });
        setLoading(false);
        return;
      }
      setResendTimer(60);
      setOtp("");
      setToast({ msg: "New OTP sent to your email!", type: "success" });
    } catch (err) {
      setToast({ msg: err.message || "Failed to resend OTP.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Enter email
  if (step === "email") {
    return (
      <>
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
        <Logo size={140} />
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
          <span style={ls.badge}>Forgot Password</span>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontStyle: "italic" }}>
            Enter your email to receive a 6-digit OTP
          </p>
        </div>
        <form onSubmit={handleRequestOtp}>
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
              disabled={loading}
            />
          </div>
          <button type="submit" style={{ ...S.primaryBtn, width: "100%", padding: "12px" }} disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP →"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 16, marginBottom: 0 }}>
          Remembered it?{" "}
          <span onClick={onBack} style={{ color: "#d97706", fontWeight: 700, cursor: "pointer" }}>Sign in</span>
        </p>
      </>
    );
  }

  // Step 2: Enter OTP
  if (step === "otp") {
    return (
      <>
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
        <Logo size={140} />
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📬</div>
          <span style={ls.badge}>Enter OTP</span>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, lineHeight: 1.6 }}>
            A 6-digit OTP has been sent to<br />
            <strong style={{ color: "#92400e" }}>{email}</strong>
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            Expires in {otpExpiry} minutes
          </p>
        </div>
        <form onSubmit={handleVerifyOtp}>
          <OtpInput length={6} value={otp} onChange={setOtp} disabled={loading} />
          <div style={{ marginTop: 24 }}>
            <button type="submit" style={{ ...S.primaryBtn, width: "100%", padding: "12px" }} disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify OTP →"}
            </button>
          </div>
        </form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span
            onClick={handleResendOtp}
            style={{
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              color: resendTimer > 0 ? "#9ca3af" : "#d97706",
              pointerEvents: resendTimer > 0 ? "none" : "auto",
            }}
          >
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
          </span>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 12, marginBottom: 0 }}>
          <span onClick={() => { setStep("email"); setOtp(""); }} style={{ color: "#d97706", fontWeight: 700, cursor: "pointer" }}>
            ← Change email
          </span>
          {" · "}
          <span onClick={onBack} style={{ color: "#d97706", fontWeight: 700, cursor: "pointer" }}>Sign in</span>
        </p>
      </>
    );
  }

  // Step 3: Set new password
  return (
    <>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
      <Logo size={140} />
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
        <span style={ls.badge}>Set New Password</span>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontStyle: "italic" }}>
          OTP verified for <strong style={{ color: "#92400e" }}>{email}</strong>
        </p>
      </div>
      <form onSubmit={handleResetPassword}>
        <label style={S.label}>New Password</label>
        <div style={{ position: "relative", marginBottom: 4 }}>
          <span style={S.fieldIcon}>🔒</span>
          <input
            style={{ ...S.input, paddingLeft: 32 }}
            type={showPass ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            autoFocus
            disabled={loading}
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
              style={{ ...S.input, paddingLeft: 32 }}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              disabled={loading}
            />
          </div>
          {confirmPassword && (
            <p style={{ fontSize: 11, marginTop: 4, color: password === confirmPassword ? "#10b981" : "#ef4444", fontWeight: 600 }}>
              {password === confirmPassword ? "✅ Passwords match" : "❌ Passwords do not match"}
            </p>
          )}
        </div>
        <button type="submit" style={{ ...S.primaryBtn, width: "100%", padding: "12px" }} disabled={loading}>
          {loading ? "Updating Password..." : "Update Password →"}
        </button>
      </form>
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
    verifyPasswordResetToken(token)
      .then((data) => {
        setTokenValid(Boolean(data?.valid));
        setTokenEmail(data?.email || "");
      })
      .catch(() => {
        setTokenValid(false);
      });
  }, [token]);

  const handleReset = (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) { setToast({ msg: "Please fill in both fields.", type: "error" }); return; }
    if (password !== confirmPassword)  { setToast({ msg: "Passwords do not match.", type: "error" }); return; }
    if (password.length < 8)           { setToast({ msg: "Password must be at least 8 characters.", type: "error" }); return; }

    resetPassword(token, password)
      .then(() => {
        setToast({ msg: "Password updated successfully!", type: "success" });
        setTimeout(onDone, 1800);
      })
      .catch((error) => {
        setToast({ msg: error.message || "Unable to reset password.", type: "error" });
      });
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
    if (!name || !email || !phone || !address || !subject || !password || !confirmPassword) {
      setToast({ msg: "Please fill all required fields.", type: "error" });
      return;
    }

    // Validate email format strictly
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setToast({ msg: "Please enter a valid email address (e.g. teacher@school.com)", type: "error" });
      return;
    }

    if (password !== confirmPassword) {
      setToast({ msg: "Passwords do not match.", type: "error" });
      return;
    }
    if (password.length < 8) {
      setToast({ msg: "Password must be at least 8 characters.", type: "error" });
      return;
    }

    registerTeacher({
      name: name.trim(),
      email: email.trim().toLowerCase(),
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
          { key: "email", label: "Email Address *", icon: "📧", type: "email", ph: "teacher@school.edu" },
          { key: "phone", label: "Phone *", icon: "📱", type: "tel", ph: "+91 98765 43210" },
        ].map(f => (
          <div key={f.key}>
            <label style={S.label}>{f.label}</label>
            <div style={{ position: "relative", marginBottom: f.key === "email" ? 4 : 12 }}>
              <span style={S.fieldIcon}>{f.icon}</span>
              <input
                style={{ ...S.input, paddingLeft: 32, borderColor: f.key === "email" && form.email && !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email) ? "#ef4444" : "#e5e7eb" }}
                type={f.type}
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.ph}
              />
            </div>
            {f.key === "email" && form.email && (
              <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 10, marginTop: 2, color: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email) ? "#10b981" : "#ef4444" }}>
                {/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email) ? "✅ Valid email address" : "❌ Invalid email — use format: name@domain.com"}
              </p>
            )}
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
