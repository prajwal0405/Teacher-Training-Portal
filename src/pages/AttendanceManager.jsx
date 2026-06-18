import { useState, useEffect, useRef } from "react";
import { SectionCard, S, Badge } from "../components/Shared";
import { getTeacherMe, getTeacherChildren, getChildAttendance, saveChildAttendance, createTeacherChild } from "../services/api";

const EMAILJS_SERVICE_ID  = "service_ckzt1le";
const EMAILJS_TEMPLATE_ID = "template_xycsvf7";
const EMAILJS_PUBLIC_KEY  = "yPV6fZ9hYl5XpEQ1w";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const generateOTP   = () => String(Math.floor(100000 + Math.random() * 900000));

let emailJsLoaded = false;

export default function AttendanceManager({ user }) {
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceDict, setAttendanceDict] = useState({});
  const [isSavedRecord, setIsSavedRecord] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState("sending"); // "sending"|"input"|"verifying"
  const [otpInput, setOtpInput] = useState(["","","","","",""]);
  const [pendingChange, setPendingChange] = useState(null);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const otpRef = useRef(null);
  const cooldownRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Load teacher profile, center, and class on mount
  useEffect(() => {
    getTeacherMe()
      .then(res => {
        setTeacherProfile(res.teacher);
      })
      .catch(err => {
        console.error("Error fetching teacher profile:", err);
      });
  }, []);

  // Fetch children list and attendance for selected date
  const loadRosterAndAttendance = () => {
    if (!teacherProfile) return;
    setLoading(true);

    Promise.all([
      getTeacherChildren(),
      getChildAttendance({ date: selectedDate })
    ]).then(([childrenRes, attendanceRes]) => {
      const dbChildren = childrenRes.children || [];
      const roster = dbChildren.map(c => ({
        id: c._id || c.id,
        rollNo: c.rollNo || "N/A",
        name: c.fullName || c.name,
      }));
      setStudents(roster);

      const sessions = attendanceRes.sessions || [];
      const classId = teacherProfile?.teacherProfile?.class?._id || teacherProfile?.teacherProfile?.class;
      const classSession = sessions.find(s => {
        const scid = s.class?._id || s.class?.id || s.class;
        return scid === classId;
      });

      if (classSession) {
        const dict = {};
        const statusMap = { present: "P", absent: "A", late: "L" };
        classSession.records.forEach(r => {
          const cid = r.child?._id || r.child?.id || r.child;
          dict[cid] = statusMap[r.status] || "P";
        });
        setAttendanceDict(dict);
        setIsSavedRecord(true);
      } else {
        const dict = {};
        roster.forEach(st => {
          dict[st.id] = "P";
        });
        setAttendanceDict(dict);
        setIsSavedRecord(false);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error loading roster/attendance:", err);
      setLoading(false);
      triggerToast("Failed to fetch records from database.", true);
    });
  };

  useEffect(() => {
    if (teacherProfile) {
      loadRosterAndAttendance();
    }
  }, [selectedDate, teacherProfile]);

  // OTP expiry countdown
  useEffect(() => {
    if (!otpExpiry) return;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(tick);
        setOtpError("OTP has expired. Please request a new one.");
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [otpExpiry]);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const triggerToast = (msg, isError = false) => {
    if (isError) { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 4000); }
  };

  const ensureEmailJs = () =>
    new Promise((resolve, reject) => {
      if (emailJsLoaded && window.emailjs) { resolve(); return; }
      if (window.emailjs) { emailJsLoaded = true; resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
      script.onload = () => {
        window.emailjs.init(EMAILJS_PUBLIC_KEY);
        emailJsLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load EmailJS SDK"));
      document.head.appendChild(script);
    });

  const sendOtpEmail = async (otp, studentName, oldStatus, newStatus) => {
    await ensureEmailJs();
    const label = s => s === "P" ? "Present" : s === "A" ? "Absent" : "Leave";
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: user.email,
      teacher_name: user.name || "Teacher",
      passcode: otp,
      student_name: studentName,
      date: selectedDate,
      old_status: label(oldStatus),
      new_status: label(newStatus),
    });
  };

  const startCooldown = () => {
    clearInterval(cooldownRef.current);
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const doSendOtp = async (studentName, oldStatus, newStatus) => {
    const otp = generateOTP();
    otpRef.current = otp;
    setOtpStep("sending");
    try {
      await sendOtpEmail(otp, studentName, oldStatus, newStatus);
      setOtpExpiry(Date.now() + OTP_EXPIRY_MS);
      setOtpStep("input");
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      startCooldown();
    } catch (err) {
      console.error("EmailJS error:", err);
      setOtpError("Failed to send OTP. Please check your EmailJS configuration.");
      setOtpStep("input");
    }
  };

  const handleStatusToggle = (childId, currentStatus) => {
    const nextStatus = currentStatus === "P" ? "A" : currentStatus === "A" ? "L" : "P";
    if (isSavedRecord) {
      const student = students.find(s => s.id === childId);
      const change = {
        childId,
        nextStatus,
        currentStatus,
        studentName: student?.name || `Child #${childId}`
      };
      setPendingChange(change);
      setShowOtpModal(true);
      setOtpInput(["","","","","",""]);
      setOtpError("");
      setOtpExpiry(null);
      setTimeLeft(null);
      doSendOtp(change.studentName, currentStatus, nextStatus);
    } else {
      setAttendanceDict(prev => ({ ...prev, [childId]: nextStatus }));
    }
  };

  const handleOtpDigit = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otpInput];
    updated[index] = value.slice(-1);
    setOtpInput(updated);
    setOtpError("");
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpInput[index] && index > 0)
      otpInputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const updated = ["","","","","",""];
    pasted.split("").forEach((ch, i) => { updated[i] = ch; });
    setOtpInput(updated);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const saveAttendanceToDb = (dict) => {
    const centerId = teacherProfile?.teacherProfile?.center?._id || teacherProfile?.teacherProfile?.center;
    const classId = teacherProfile?.teacherProfile?.class?._id || teacherProfile?.teacherProfile?.class;

    if (!centerId || !classId) {
      return Promise.reject(new Error("Center/Class assignment missing in teacher profile."));
    }

    const recordsPayload = Object.entries(dict).map(([childId, status]) => {
      const statusMap = { P: "present", A: "absent", L: "late" };
      return {
        childId,
        status: statusMap[status] || "present"
      };
    });

    return saveChildAttendance({
      centerId,
      classId,
      attendanceDate: selectedDate,
      records: recordsPayload
    });
  };

  const handleVerifyOtp = () => {
    if (timeLeft === 0) { setOtpError("OTP has expired. Please request a new one."); return; }
    const entered = otpInput.join("");
    if (entered.length < 6) { setOtpError("Please enter all 6 digits."); return; }
    setOtpStep("verifying");
    setTimeout(() => {
      if (entered === otpRef.current) {
        if (pendingChange) {
          const updatedDict = { ...attendanceDict, [pendingChange.childId]: pendingChange.nextStatus };
          setAttendanceDict(updatedDict);
          saveAttendanceToDb(updatedDict)
            .then(() => {
              triggerToast("✅ OTP verified and attendance updated in database!");
            })
            .catch(err => {
              console.error("Error saving attendance:", err);
              triggerToast("Failed to save to database: " + err.message, true);
            });
        }
        setShowOtpModal(false);
        setPendingChange(null);
        otpRef.current = null;
      } else {
        setOtpStep("input");
        setOtpError("❌ Incorrect OTP. Please check your email.");
        setOtpInput(["","","","","",""]);
        otpInputRefs.current[0]?.focus();
      }
    }, 800);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !pendingChange) return;
    setOtpInput(["","","","","",""]);
    setOtpError("");
    setOtpExpiry(null);
    setTimeLeft(null);
    await doSendOtp(pendingChange.studentName, pendingChange.currentStatus, pendingChange.nextStatus);
    triggerToast("New OTP sent to your email.");
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setPendingChange(null);
    otpRef.current = null;
    setOtpInput(["","","","","",""]);
    setOtpError("");
    clearInterval(cooldownRef.current);
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    createTeacherChild({ fullName: newStudentName.trim(), status: "active" })
      .then(() => {
        triggerToast("Child enrolled successfully in database!");
        setNewStudentName("");
        setShowAddModal(false);
        loadRosterAndAttendance();
      })
      .catch(err => {
        console.error("Error adding child:", err);
        triggerToast("Failed to add child: " + err.message, true);
      });
  };

  const handleSaveSheet = () => {
    saveAttendanceToDb(attendanceDict)
      .then(() => {
        setIsSavedRecord(true);
        triggerToast(`Attendance sheet submitted to database for ${selectedDate}`);
      })
      .catch(err => {
        console.error("Error saving attendance:", err);
        triggerToast("Failed to submit sheet: " + err.message, true);
      });
  };

  const handleClearSheetRecord = () => {
    if (!window.confirm("Reset this attendance record to defaults?")) return;
    const resetDict = {};
    students.forEach(st => { resetDict[st.id] = "P"; });
    setAttendanceDict(resetDict);
    saveAttendanceToDb(resetDict)
      .then(() => {
        setIsSavedRecord(false);
        triggerToast("Attendance record reset to defaults.");
      })
      .catch(err => {
        console.error("Error resetting sheet:", err);
        triggerToast("Failed to reset record: " + err.message, true);
      });
  };

  const maskedEmail = user.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c)
    : "your registered email";

  const formatTime = secs => {
    if (secs === null) return "";
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  };

  const otpFilled = otpInput.join("").length === 6;

  if (loading && students.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Children Roster...
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Children Attendance</h1>
          <p style={S.pageSub}>Manage rosters and record daily attendance registers.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={S.primaryBtn}>+ Enroll Child</button>
      </div>

      {/* Toast banners */}
      {successMsg && (
        <div style={{ padding: "12px 16px", marginBottom: 16, background: "#d1fae5", color: "#065f46", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: "12px 16px", marginBottom: 16, background: "#fee2e2", color: "#991b1b", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Date picker */}
      <SectionCard title="📅 Daily Register Date Lookup">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ ...S.label, margin: 0, fontWeight: 700 }}>Select Sheet Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ ...S.input, width: "auto", padding: "8px 12px" }}
            />
            {isSavedRecord
              ? <Badge children="📝 Reviewing Saved Sheet History" color="#1e40af" bg="#dbeafe" />
              : <Badge children="✨ New Unsaved Data Register"     color="#854d0e" bg="#fef9c3" />
            }
          </div>
          <Badge children={`Class: ${teacherProfile?.teacherProfile?.class?.name || "Unassigned"}`} color="#d97706" bg="#fef3c7" />
        </div>

        {isSavedRecord && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 8, fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔐</span>
            <span>This is a <strong>saved record</strong>. Any change requires <strong>Email OTP verification</strong> sent to <strong>{maskedEmail}</strong>.</span>
          </div>
        )}
      </SectionCard>

      {/* Roster table */}
      <div style={{ marginTop: 20 }}>
        <SectionCard title={`👥 Children Register — Date: ${selectedDate} (${students.length} children)`}>
          {students.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
              No children enrolled in this class yet. Click "+ Enroll Child" above.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", background: "#f9fafb", borderRadius: 8, fontWeight: 700, fontSize: 12, color: "#6b7280" }}>
                <div style={{ width: 100 }}>Roll No.</div>
                <div style={{ flex: 1 }}>Full Student Name</div>
                <div style={{ width: 160, textAlign: "right" }}>Status</div>
              </div>

              {students.map(st => {
                const status = attendanceDict[st.id] || "P";
                const badge  =
                  status === "P" ? { bg: "#d1fae5", text: "#065f46", lbl: "Present" } :
                  status === "A" ? { bg: "#fee2e2", text: "#991b1b", lbl: "Absent"  } :
                                   { bg: "#fef3c7", text: "#92400e", lbl: "Leave"   };
                return (
                  <div key={st.id} style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "white", border: "1px solid #f1f5f9", borderRadius: 10, transition: "all 0.15s" }}>
                    <div style={{ width: 100, fontSize: 13, fontWeight: 800, color: "#d97706" }}>{st.rollNo}</div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1c1917" }}>{st.name}</div>
                    <div style={{ width: 160, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                      {isSavedRecord && <span title="OTP required to edit" style={{ fontSize: 13, color: "#f59e0b" }}>🔐</span>}
                      <button
                        onClick={() => handleStatusToggle(st.id, status)}
                        style={{ border: "none", background: badge.bg, color: badge.text, padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {badge.lbl}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Footer actions */}
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  {isSavedRecord && (
                    <button onClick={handleClearSheetRecord} style={{ ...S.exportBtn, color: "#ef4444", border: "1px solid #fca5a5" }}>
                      🗑️ Reset Sheet
                    </button>
                  )}
                </div>
                <button onClick={handleSaveSheet} style={{ ...S.primaryBtn, padding: "10px 24px" }}>
                  {isSavedRecord ? "💾 Submit Update" : "💾 Submit Attendance Register"}
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* MODAL 1 — Enroll Student */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1c1917", margin: 0 }}>Register New Child</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <label style={S.label}>Student Full Name</label>
              <input
                required
                style={{ ...S.input, marginBottom: 20 }}
                placeholder="Enter first and last name…"
                value={newStudentName}
                onChange={e => setNewStudentName(e.target.value)}
              />
              <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>Enrole Pupil →</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 — OTP Verification */}
      {showOtpModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}>
          <div style={{ background: "white", borderRadius: 24, padding: "32px 28px", width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", position: "relative" }}>
            <button onClick={closeOtpModal} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>

            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>
                {otpStep === "sending" ? "📤" : otpStep === "verifying" ? "⏳" : "📧"}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>
                {otpStep === "sending"   ? "Sending OTP…"      :
                 otpStep === "verifying" ? "Verifying OTP…"    :
                                           "Email OTP Verification"}
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
                {otpStep === "sending" ? "Checking network parameters..." : `We've sent a 6-digit OTP passcode to ${maskedEmail}.`}
              </p>
            </div>

            {otpStep !== "sending" && (
              <>
                {timeLeft !== null && timeLeft > 0 && (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color:      timeLeft > 60 ? "#059669" : timeLeft > 30 ? "#d97706" : "#dc2626",
                      background: timeLeft > 60 ? "#f0fdf4" : timeLeft > 30 ? "#fef3c7" : "#fef2f2",
                      border: `1px solid ${timeLeft > 60 ? "#a7f3d0" : timeLeft > 30 ? "#fde68a" : "#fca5a5"}`,
                      padding: "5px 16px", borderRadius: 20
                    }}>
                      ⏱ Expires in {formatTime(timeLeft)}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }} onPaste={handleOtpPaste}>
                  {otpInput.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpDigit(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      style={{
                        width: 46, height: 54,
                        textAlign: "center", fontSize: 22, fontWeight: 800,
                        border: `2px solid ${otpError ? "#ef4444" : digit ? "#f59e0b" : "#e2e8f0"}`,
                        borderRadius: 10, outline: "none",
                        background: digit ? "#fffbf0" : "white",
                        color: "#1c1917",
                        transition: "border-color 0.15s, background 0.15s",
                        caretColor: "#f59e0b"
                      }}
                    />
                  ))}
                </div>

                {otpError && (
                  <div style={{ textAlign: "center", marginBottom: 14, fontSize: 12, color: "#dc2626", fontWeight: 600, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
                    {otpError}
                  </div>
                )}

                <button
                  onClick={handleVerifyOtp}
                  disabled={!otpFilled || timeLeft === 0}
                  style={{
                    width: "100%", padding: 13, marginBottom: 12,
                    background: (!otpFilled || timeLeft === 0) ? "#e2e8f0" : "linear-gradient(135deg,#f59e0b,#d97706)",
                    color:  (!otpFilled || timeLeft === 0) ? "#94a3b8" : "white",
                    border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800,
                    cursor: (!otpFilled || timeLeft === 0) ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  ✅ Verify OTP & Apply Change
                </button>

                <div style={{ textAlign: "center", fontSize: 12, color: "#64748b" }}>
                  Didn't receive it?{" "}
                  {resendCooldown > 0
                    ? <span style={{ color: "#94a3b8", fontWeight: 600 }}>Resend in {resendCooldown}s</span>
                    : <button onClick={handleResendOtp} style={{ background: "none", border: "none", color: "#d97706", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12, textDecoration: "underline" }}>Resend OTP</button>
                  }
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}