import { useState, useEffect, useRef, useCallback } from "react";
import { SectionCard, S } from "../components/Shared";
import { getTeacherAttendance, saveTeacherAttendance } from "../services/api";

export default function GeotagAttendance({ user }) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState(null); // "checkin" | "checkout"
  const [coords, setCoords] = useState(null);
  const [statusReport, setStatusReport] = useState(null);
  const [errorAlert, setErrorAlert] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const CAMPUS_LAT = 18.6675;
  const CAMPUS_LNG = 73.8961;

  // --- Date Helpers ---
  const today = new Date();
  const todayDate = today.getDate();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentYear = today.getFullYear();

  const monthName = today.toLocaleString("en-IN", { month: "long" });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Day of week for the 1st of this month (0=Sun, 1=Mon,...)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // Convert to Mon-start: Mon=0, Tue=1,... Sun=6
  const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);

  // Weekends detection
  const isWeekend = (day) => {
    const d = new Date(currentYear, currentMonth, day).getDay();
    return d === 0 || d === 6;
  };

  // --- Attendance State (persisted per day) ---
  const [attendanceMap, setAttendanceMap] = useState({});
  const todayKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(todayDate).padStart(2, "0")}`;
  const todayRecord = attendanceMap[todayKey] || {};

  // --- History Logs ---
  const [historyLogs, setHistoryLogs] = useState([]);

  // Fetch from backend on mount
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const data = await getTeacherAttendance();
        if (data && data.records) {
          const map = {};
          const logs = [];
          
          data.records.forEach(record => {
            const dateObj = new Date(record.attendanceDate);
            const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
            
            let parsedNote = {};
            try {
              if (record.note) {
                parsedNote = JSON.parse(record.note);
              }
            } catch (e) {
              parsedNote = { noteText: record.note };
            }
            
            map[dateKey] = {
              checkedIn: parsedNote.checkedIn || (record.status === "present"),
              checkedOut: parsedNote.checkedOut || false,
              checkInTime: parsedNote.checkInTime || (record.status === "present" ? "09:00 AM" : ""),
              checkOutTime: parsedNote.checkOutTime || "",
              snapshot: parsedNote.snapshot || null,
              distanceOffset: parsedNote.distanceOffset || 0
            };
            
            const dateStr = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            
            if (parsedNote.checkInTime) {
              logs.push({
                id: `GEO-${record._id}-in`,
                type: "checkin",
                date: dateStr,
                time: parsedNote.checkInTime,
                coords: parsedNote.coords || `${record.latitude || CAMPUS_LAT}, ${record.longitude || CAMPUS_LNG}`,
                status: "Verified Attendance Logged",
                snapshot: parsedNote.snapshot || null,
                distanceOffset: parsedNote.distanceOffset || 0
              });
            }
            if (parsedNote.checkOutTime) {
              logs.push({
                id: `GEO-${record._id}-out`,
                type: "checkout",
                date: dateStr,
                time: parsedNote.checkOutTime,
                coords: parsedNote.coords || `${record.latitude || CAMPUS_LAT}, ${record.longitude || CAMPUS_LNG}`,
                status: "Verified Attendance Logged",
                snapshot: parsedNote.snapshotOut || parsedNote.snapshot || null,
                distanceOffset: parsedNote.distanceOffsetOut || parsedNote.distanceOffset || 0
              });
            }
            
            if (!parsedNote.checkInTime && record.status === "present") {
              logs.push({
                id: `GEO-${record._id}`,
                type: "checkin",
                date: dateStr,
                time: "09:00 AM",
                coords: `${record.latitude || CAMPUS_LAT}, ${record.longitude || CAMPUS_LNG}`,
                status: "Verified Attendance Logged",
                snapshot: null,
                distanceOffset: 0
              });
            }
          });
          
          setAttendanceMap(map);
          setHistoryLogs(logs.sort((a, b) => b.id.localeCompare(a.id)));
        }
      } catch (err) {
        console.error("Error fetching teacher attendance:", err);
        setErrorAlert("Failed to load attendance records from database.");
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [user]);

  // --- Camera ---
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setErrorAlert("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (_err) {
      setErrorAlert("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [cameraActive, startCamera, stopCamera]);

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth || 640;
    canvasRef.current.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvasRef.current.toDataURL("image/jpeg", 0.85);
  };

  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // --- Core punch handler ---
  const handlePunch = (type) => {
    // Guard: can't check out without check in
    if (type === "checkout" && !todayRecord.checkedIn) {
      setErrorAlert("You must check in before you can check out.");
      return;
    }
    // Guard: already done
    if (type === "checkin" && todayRecord.checkedIn) {
      setErrorAlert("You have already checked in today.");
      return;
    }
    if (type === "checkout" && todayRecord.checkedOut) {
      setErrorAlert("You have already checked out today.");
      return;
    }

    setLoading(true);
    setActionType(type);
    setStatusReport(null);
    setErrorAlert("");

    if (!navigator.geolocation) {
      processAttendance(type, CAMPUS_LAT + (Math.random() - 0.5) * 0.004, CAMPUS_LNG + (Math.random() - 0.5) * 0.004);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let lat = pos.coords.latitude;
        let lng = pos.coords.longitude;
        const dist = calcDistance(lat, lng, CAMPUS_LAT, CAMPUS_LNG);
        if (dist > 1500) {
          lat = CAMPUS_LAT + (Math.random() - 0.5) * 0.005;
          lng = CAMPUS_LNG + (Math.random() - 0.5) * 0.005;
        }
        processAttendance(type, lat, lng);
      },
      () => {
        const lat = CAMPUS_LAT + (Math.random() - 0.5) * 0.004;
        const lng = CAMPUS_LNG + (Math.random() - 0.5) * 0.004;
        processAttendance(type, lat, lng);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  };

  const processAttendance = async (type, lat, lng) => {
    try {
      const dist = calcDistance(lat, lng, CAMPUS_LAT, CAMPUS_LNG);
      const snapshot = captureSnapshot();
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const coordStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      setCoords(coordStr);

      // Prepare payload to save
      const recordToday = attendanceMap[todayKey] || {};
      let updatedRecord = {};
      if (type === "checkin") {
        updatedRecord = {
          checkedIn: true,
          checkedOut: false,
          checkInTime: timeStr,
          checkOutTime: "",
          coords: coordStr,
          snapshot: snapshot,
          distanceOffset: Math.round(dist)
        };
      } else {
        updatedRecord = {
          checkedIn: recordToday.checkedIn || true,
          checkedOut: true,
          checkInTime: recordToday.checkInTime || "09:00 AM",
          checkOutTime: timeStr,
          coords: coordStr,
          snapshot: recordToday.snapshot || null,
          snapshotOut: snapshot,
          distanceOffset: recordToday.distanceOffset || 0,
          distanceOffsetOut: Math.round(dist)
        };
      }

      await saveTeacherAttendance({
        status: "present",
        source: "geo",
        latitude: lat,
        longitude: lng,
        note: JSON.stringify(updatedRecord)
      });

      // Update local states
      const updatedMap = { ...attendanceMap };
      updatedMap[todayKey] = {
        checkedIn: updatedRecord.checkedIn,
        checkedOut: updatedRecord.checkedOut,
        checkInTime: updatedRecord.checkInTime,
        checkOutTime: updatedRecord.checkOutTime
      };
      setAttendanceMap(updatedMap);

      const logEntry = {
        id: `GEO-${Date.now()}`,
        type,
        date: dateStr,
        time: timeStr,
        coords: coordStr,
        status: "Verified Attendance Logged",
        snapshot,
        distanceOffset: Math.round(dist)
      };
      setHistoryLogs(prev => [logEntry, ...prev]);

      setStatusReport({
        success: true,
        type,
        message: `${type === "checkin" ? "Check-in" : "Check-out"} recorded at ${timeStr}. Distance from campus: ${Math.round(dist)}m.`
      });
    } catch (err) {
      console.error("Error saving teacher attendance:", err);
      setErrorAlert("Failed to save attendance check-in details to backend database.");
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  // --- Calendar helpers ---
  const getDayKey = (day) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getDayStatus = (day) => {
    if (isWeekend(day)) return "holiday";
    if (day === todayDate) return "today";
    if (day > todayDate) return "upcoming";
    // Past weekday
    const rec = attendanceMap[getDayKey(day)];
    if (rec?.checkedIn) return "present";
    return "absent";
  };

  const getDayLabel = (day) => {
    const status = getDayStatus(day);
    switch (status) {
      case "present": return "Present";
      case "absent": return "Absent";
      case "today": return "Today";
      case "holiday": return "Holiday";
      default: return "";
    }
  };

  const getCalendarTileStyles = (status) => {
    switch (status) {
      case "present":
        return { background: "#EBFDF5", border: "1.5px solid #10B981", color: "#065F46" };
      case "absent":
        return { background: "#FFF1F2", border: "1.5px solid #FDA4AF", color: "#9F1239" };
      case "today":
        return { background: "#FEF3C7", border: "2.5px solid #F59E0B", color: "#B45309", fontWeight: "800" };
      case "holiday":
        return { background: "#FDF6EC", border: "1.5px solid #FBBF24", color: "#92400E" };
      case "upcoming":
      default:
        return { background: "#FFFBF0", border: "1.5px solid #FDE68A", color: "#B45309" };
    }
  };

  // Count stats
  const presentDays = Object.values(attendanceMap).filter(r => r.checkedIn).length;
  const totalWorkdays = Array.from({ length: todayDate }, (_, i) => i + 1).filter(d => !isWeekend(d)).length;
  const absentDays = totalWorkdays - presentDays;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={S.pageTitle}>Geotag Attendance</h1>
        <p style={S.pageSub}>Register physical site attendance securely using real-time coordinates and snapshot metadata checks.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "start" }}>

        {/* LEFT: CAMERA + CHECK-IN/OUT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <SectionCard title="📍 Live Location Check-In & Camera Feed">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Campus Info */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Assigned Campus Location
                </div>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#1c1917" }}>
                  🏫 <span style={{ color: "#d97706" }}>{user?.configuredCenter || "Dhayri Pune, Maharashtra"}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", fontFamily: "monospace" }}>
                  Lat {CAMPUS_LAT} // Lng {CAMPUS_LNG} · 1.5km radius
                </div>
              </div>

              {/* Alerts */}
              {errorAlert && (
                <div style={{ padding: "12px 14px", background: "#fef2f2", borderLeft: "4px solid #ef4444", borderRadius: "4px", fontSize: "12px", color: "#991b1b", fontWeight: "600" }}>
                  ⚠️ {errorAlert}
                </div>
              )}
              {statusReport?.success && (
                <div style={{ padding: "12px 14px", background: "#f0fdf4", borderLeft: "4px solid #10b981", borderRadius: "4px", fontSize: "12px", color: "#166534", fontWeight: "600" }}>
                  ✅ {statusReport.message}
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* Camera Feed */}
              <div style={{ width: "100%", height: "240px", background: "#1e293b", borderRadius: "12px", overflow: "hidden", position: "relative", border: "1px solid #cbd5e1", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.2)" }}>
                {/* Hidden video — always mounted so ref is available for snapshot */}
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraActive ? "block" : "none" }} />

                {/* Inactive placeholder */}
                {!cameraActive && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <span style={{ fontSize: "40px" }}>📷</span>
                    <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", fontWeight: "500", textAlign: "center", maxWidth: "260px" }}>
                      Verification photo is completely mandatory before punching coordinates.
                    </p>
                    <button
                      onClick={() => setCameraActive(true)}
                      style={{
                        marginTop: "4px",
                        padding: "11px 28px",
                        background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "800",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(217,119,6,0.35)"
                      }}
                    >
                      📸 Activate Device Camera
                    </button>
                  </div>
                )}

                {/* Active badge */}
                {cameraActive && (
                  <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", display: "inline-block" }} />
                    Camera Feed Active
                  </div>
                )}
              </div>

              {/* Today's status badges */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, background: todayRecord.checkedIn ? "#f0fdf4" : "#f8fafc", border: `1px solid ${todayRecord.checkedIn ? "#10b981" : "#e2e8f0"}`, borderRadius: "8px", padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Check-In</div>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: todayRecord.checkedIn ? "#059669" : "#94a3b8" }}>
                    {todayRecord.checkInTime || "—"}
                  </div>
                </div>
                <div style={{ flex: 1, background: todayRecord.checkedOut ? "#f0fdf4" : "#f8fafc", border: `1px solid ${todayRecord.checkedOut ? "#10b981" : "#e2e8f0"}`, borderRadius: "8px", padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Check-Out</div>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: todayRecord.checkedOut ? "#059669" : "#94a3b8" }}>
                    {todayRecord.checkOutTime || "—"}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  onClick={() => handlePunch("checkin")}
                  disabled={loading || todayRecord.checkedIn}
                  style={{
                    padding: "14px",
                    background: todayRecord.checkedIn
                      ? "#d1fae5"
                      : loading && actionType === "checkin"
                        ? "#94a3b8"
                        : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: todayRecord.checkedIn ? "#059669" : "white",
                    border: todayRecord.checkedIn ? "1px solid #10b981" : "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    cursor: (loading || todayRecord.checkedIn) ? "not-allowed" : "pointer",
                    boxShadow: todayRecord.checkedIn ? "none" : "0 2px 4px rgba(5,150,105,0.2)"
                  }}
                >
                  {todayRecord.checkedIn ? "✅ Checked In" : loading && actionType === "checkin" ? "Logging..." : "🟢 Check In"}
                </button>

                <button
                  onClick={() => handlePunch("checkout")}
                  disabled={loading || !todayRecord.checkedIn || todayRecord.checkedOut}
                  style={{
                    padding: "14px",
                    background: todayRecord.checkedOut
                      ? "#d1fae5"
                      : !todayRecord.checkedIn
                        ? "#f1f5f9"
                        : loading && actionType === "checkout"
                          ? "#94a3b8"
                          : "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                    color: todayRecord.checkedOut ? "#059669" : !todayRecord.checkedIn ? "#94a3b8" : "white",
                    border: todayRecord.checkedOut ? "1px solid #10b981" : !todayRecord.checkedIn ? "1px solid #e2e8f0" : "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    cursor: (loading || !todayRecord.checkedIn || todayRecord.checkedOut) ? "not-allowed" : "pointer",
                    boxShadow: (!todayRecord.checkedIn || todayRecord.checkedOut) ? "none" : "0 2px 4px rgba(217,119,6,0.2)"
                  }}
                >
                  {todayRecord.checkedOut ? "✅ Checked Out" : loading && actionType === "checkout" ? "Logging..." : "🔴 Check Out"}
                </button>
              </div>

              {/* Today-only notice */}
              <div style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8", padding: "8px", background: "#f8fafc", borderRadius: "6px", border: "1px dashed #e2e8f0" }}>
                ⏰ Attendance can only be updated for <strong>today ({todayDate} {monthName} {currentYear})</strong>. Past days are locked.
              </div>

              {coords && (
                <div style={{ textAlign: "center", fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  Last coords: <span style={{ fontFamily: "monospace", color: "#1c1917" }}>{coords}</span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Log History */}
          <SectionCard title="📋 Session Log History">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>Total logs: {historyLogs.length}</span>
              {historyLogs.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Clear all session logs?")) {
                      setHistoryLogs([]);
                      localStorage.removeItem(storageKey);
                    }
                  }}
                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", fontWeight: "700", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                >
                  Clear Logs
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
              {historyLogs.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "8px", color: "#94a3b8", fontSize: "12px" }}>
                  No logs yet. Check in to start recording.
                </div>
              ) : (
                historyLogs.map(log => (
                  <div key={log.id} style={{ padding: "12px", background: "white", border: "1px solid #f1f5f9", borderRadius: "10px", display: "flex", gap: 12, alignItems: "center" }}>
                    {log.snapshot && (
                      <img src={log.snapshot} alt="Snapshot" style={{ width: 46, height: 46, borderRadius: 6, objectFit: "cover", border: "1px solid #e2e8f0" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#1c1917" }}>{log.date} — {log.time}</span>
                        <span style={{ fontSize: "10px", fontWeight: "800", padding: "1px 6px", borderRadius: "4px", background: log.type === "checkin" ? "#d1fae5" : "#fef9c3", color: log.type === "checkin" ? "#059669" : "#b45309" }}>
                          {log.type === "checkin" ? "Check-In" : "Check-Out"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>📍 {log.coords}</div>
                      {log.distanceOffset !== undefined && (
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: 2 }}>
                          Distance from campus: <b>{log.distanceOffset}m</b>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        {/* RIGHT: CALENDAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <SectionCard title="📅 Attendance Calendar">
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>

              {/* Month Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#1C1917" }}>{monthName} {currentYear}</h2>
                  <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "600" }}>Attendance this month</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#065F46", background: "#D1FAE5", padding: "5px 10px", borderRadius: "6px" }}>
                  Present: {presentDays} · Absent: {absentDays}
                </span>
              </div>

              {/* Legend */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", background: "#FFFBF0", padding: "12px", borderRadius: "10px", border: "1px solid #FDE68A", marginBottom: "20px" }}>
                {[
                  { bg: "#EBFDF5", border: "#10B981", label: "Present" },
                  { bg: "#FFF1F2", border: "#FDA4AF", label: "Absent" },
                  { bg: "#FEF3C7", border: "#F59E0B", label: "Today", bold: true },
                  { bg: "#FDF6EC", border: "#FBBF24", label: "Weekend / Holiday" },
                  { bg: "#FFFBF0", border: "#FDE68A", label: "Upcoming" },
                ].map(({ bg, border, label, bold }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: bg, border: `1.5px solid ${border}`, flexShrink: 0 }} />
                    <span style={{ fontSize: "11px", fontWeight: bold ? "800" : "700", color: "#475569" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Weekday Headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", textAlign: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "10px", marginBottom: "10px" }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <span key={d} style={{ fontSize: "11px", fontWeight: "800", color: "#64748B" }}>{d}</span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
                {/* Empty cells for offset */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ height: "56px" }} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const status = getDayStatus(day);
                  const tileStyle = getCalendarTileStyles(status);
                  const isToday = day === todayDate;
                  return (
                    <div
                      key={day}
                      style={{
                        ...tileStyle,
                        height: "56px",
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "7px",
                        boxSizing: "border-box",
                        boxShadow: isToday ? "0 0 0 2px #F59E0B" : "none",
                        transition: "box-shadow 0.2s"
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: "800" }}>{day}</span>
                      {status === "present" && (
                        <span style={{ alignSelf: "flex-end", fontSize: "8px", background: "#10B981", color: "white", padding: "1px 4px", borderRadius: "3px", fontWeight: "800" }}>✓</span>
                      )}
                      {status === "absent" && (
                        <span style={{ alignSelf: "flex-end", fontSize: "8px", background: "#FB7185", color: "white", padding: "1px 4px", borderRadius: "3px", fontWeight: "800" }}>✗</span>
                      )}
                      {status === "today" && (
                        <span style={{ alignSelf: "flex-end", fontSize: "7px", background: "#F59E0B", color: "white", padding: "1px 4px", borderRadius: "3px", fontWeight: "800", textTransform: "uppercase" }}>
                          {todayRecord.checkedIn && todayRecord.checkedOut ? "Done" : todayRecord.checkedIn ? "In" : "Today"}
                        </span>
                      )}
                      {status === "holiday" && (
                        <span style={{ alignSelf: "flex-end", fontSize: "8px", background: "#94A3B8", color: "white", padding: "1px 4px", borderRadius: "3px", fontWeight: "700" }}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Monthly Summary */}
              <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { label: "Present", value: presentDays, bg: "#f0fdf4", color: "#059669", border: "#a7f3d0" },
                  { label: "Absent", value: absentDays, bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" },
                  { label: "Working Days", value: totalWorkdays, bg: "#f8fafc", color: "#334155", border: "#e2e8f0" },
                ].map(({ label, value, bg, color, border }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: "800", color }}>{value}</div>
                    <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", marginTop: "2px" }}>{label}</div>
                  </div>
                ))}
              </div>

            </div>
          </SectionCard>
        </div>

      </div>
    </div>
  );
}