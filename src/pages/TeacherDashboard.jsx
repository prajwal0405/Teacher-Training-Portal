import { useState, useEffect, useRef } from "react";
import { Logo, Toast, Badge, StatusBadge, StatCard, SectionCard, S, globalCSS, SearchBar } from "../components/Shared";
import AttendanceManager from "./AttendanceManager";
import TrainingAndClassroomManager from "./TrainingAndClassroomManager";
import GeotagAttendance from "./GeotagAttendance";
import ProctoredAssessment from "./Proctoredassessment";
import {
  getTeacherProgress,
  getNotifications,
  markNotificationRead,
  askTeacherChatbot,
  updateCourseAssignmentProgress,
  updateTeacherMe,
  getCourses,
  uploadFile,
  changeTeacherPassword,
  markAllNotificationsRead,
  deleteTeacherNotification,
  getCertificates,
  getAssignments,
  submitAssignment
} from "../services/api";
/* ═══════════════════════════════════════════
   TAB COMPONENTS
═══════════════════════════════════════════ */

function OverviewTab({ user, setActiveTab, courses = [], assignments = [], lessons = [], activities = [], summary = {}, realAssignments = [], certificates = [] }) {
  const attendance = summary.attendanceRate !== undefined ? summary.attendanceRate : 0;
  const attColor = attendance >= 85 ? "#10b981" : attendance >= 70 ? "#f59e0b" : "#ef4444";

  const certificatesCount = certificates.length;
  const pendingTasksCount = realAssignments.filter(a => a.calculatedStatus === "pending" || a.calculatedStatus === "overdue").length;
  const gradedAssignments = realAssignments.filter(a => a.calculatedStatus === "graded");
  const averageScore = gradedAssignments.length ? Math.round(gradedAssignments.reduce((sum, a) => sum + Number(a.submission?.marksObtained || 0), 0) / gradedAssignments.length) : 0;
  const centerName = user.workingCenter || user.teacherProfile?.center?.name || "Center not assigned";
  const className = user.teacherProfile?.class?.name || "No class assigned";
  const studentsCount = summary.totalChildren || user.students || 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Good morning, {user.name?.split(" ")[0] || "Teacher"}!</h1>
          <p style={{ fontSize: 13, margin: 0, opacity: 0.88 }}>{user.subject || user.teacherProfile?.subject || "Teacher"} - {className} - {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div style={{ fontSize: 32, opacity: 0.8 }}>Teacher</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
        <span style={{ fontSize: 18 }}>@</span>
        <span>Working Center: {centerName}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 24, marginTop: 16 }}>
        <StatCard icon="CL" label="My Class" val={className} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="ST" label="Total Students" val={studentsCount} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="AT" label="Attendance" val={`${attendance}%`} color={attColor} bg={attendance >= 85 ? "#d1fae5" : attendance >= 70 ? "#fef3c7" : "#fee2e2"} />
        <StatCard icon="GR" label="Avg Grade" val={gradedAssignments.length ? `${averageScore}%` : "N/A"} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="CE" label="Certificates" val={certificatesCount} color="#06b6d4" bg="#cffafe" />
        <StatCard icon="TK" label="Pending Tasks" val={pendingTasksCount} color="#ef4444" bg="#fee2e2" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <SectionCard title="My Attendance Summary">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 220, paddingTop: 15 }}>
            {[{ month: "Current", val: attendance }].map((d, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <span style={{ marginBottom: 8, fontSize: 12, fontWeight: 800, color: d.val >= 90 ? "#10b981" : d.val >= 80 ? "#f59e0b" : "#ef4444" }}>{d.val}%</span>
                <div style={{ width: 36, height: `${d.val * 1.6}px`, borderRadius: "12px 12px 0 0", background: d.val >= 90 ? "linear-gradient(180deg,#34d399,#10b981)" : d.val >= 80 ? "linear-gradient(180deg,#fbbf24,#f59e0b)" : "linear-gradient(180deg,#f87171,#ef4444)", transition: "all .6s ease" }} />
                <span style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{d.month}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Course Progress">
          {courses.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No assigned courses yet.</div>
          ) : (
            courses.slice(0, 3).map((c, i) => {
              const progress = c.progressPercent || 0;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{c.course?.title?.split(" ").slice(0, 3).join(" ") || "Course"}...</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 2 }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#f59e0b,#d97706)", borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{c.status || "Assigned"} · Due: {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "No deadline"}</div>
                </div>
              );
            })
          )}
          <button onClick={() => setActiveTab("courses")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}>View all courses →</button>
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SectionCard title="Upcoming Lessons">
          {lessons.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No lessons assigned yet.</div>
          ) : (
            lessons.slice(0, 4).map((item) => (
              <div key={item._id} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.status === "completed" ? "#10b981" : "#f59e0b", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{item.lessonPlan?.title || "Assigned lesson"}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{item.lessonPlan?.scheduleDate ? new Date(item.lessonPlan.scheduleDate).toLocaleDateString("en-IN") : "No date"}</div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))
          )}
          <button onClick={() => setActiveTab("schedule")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 8 }}>Full schedule {">"}</button>
        </SectionCard>

        <SectionCard title="Assignment Status">
          {assignments.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No assignments available.</div>
          ) : (
            assignments.slice(0, 4).map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: a.status === "approved" ? "#10b981" : a.status === "revision" ? "#ef4444" : "#f59e0b" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>{(a.title || a.course?.title || "Assignment").substring(0, 28)}...</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {a.score !== null && a.score !== undefined && <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981" }}>{a.score}/100</span>}
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))
          )}
          <button onClick={() => setActiveTab("assignments")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 8 }}>View all →</button>
        </SectionCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COURSE CONTENT DATA
═══════════════════════════════════════════ */
const getCourseContent = (assignment) => {
  const dbCourse = assignment?.course;
  if (!dbCourse) return null;

  const modules = (dbCourse.modules || []).map((module, moduleIndex) => {
    const contents = (module.contents || []).map((content, contentIndex) => {
      const id = content._id || `content-${moduleIndex}-${contentIndex}`;
      const url = content.externalUrl || content.file?.publicUrl || "";
      const youtubeMatch = url.match(/(?:youtube\.com\/(?:.*[?&]v=|embed\/)|youtu\.be\/)([^"&?\/\s]{11})/);
      return {
        id,
        title: content.title || `Content ${contentIndex + 1}`,
        type: content.type || "document",
        url,
        ytId: youtubeMatch?.[1] || "",
        duration: content.type === "video" ? "Video" : content.type || "Content"
      };
    });

    return {
      id: module._id || `module-${moduleIndex}`,
      title: module.title || `Module ${moduleIndex + 1}`,
      description: module.description || "",
      contents,
      items: contents,
      notes: module.description || dbCourse.description || "No notes added by admin yet."
    };
  });

  return {
    color: "#f59e0b",
    icon: "Course",
    description: dbCourse.description || "",
    modules
  };
};

function CoursesTab({ assignments = [], onMarkDone }) {
  const [activeAssignmentId, setActiveAssignmentId] = useState(null);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [activeTab, setActiveTab] = useState("video"); // "video"|"notes"

  const activeAssignment = assignments.find(a => a._id === activeAssignmentId);
  const enrichedContent = getCourseContent(activeAssignment);

  const isVideoDone = (assign, videoId) => {
    return assign?.completedContent?.includes(videoId) || false;
  };

  const getModuleProgress = (assign, module) => {
    const allKeys = module.items.map(v => v.id);
    const done = allKeys.filter(k => isVideoDone(assign, k)).length;
    return { done, total: allKeys.length };
  };

  const handleMarkDone = (assign, videoId) => {
    if (!assign) return;
    const completedContent = [...(assign.completedContent || [])];
    if (!completedContent.includes(videoId)) {
      completedContent.push(videoId);
    }
    const allVids = enrichedContent.modules.flatMap(m => m.items);
    const progressPercent = Math.round((completedContent.length / allVids.length) * 100);

    onMarkDone && onMarkDone(assign._id, {
      completedContent,
      progressPercent,
      status: progressPercent === 100 ? "completed" : "ongoing"
    });
  };

  // ── Course list view ──
  if (!activeAssignmentId) {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <h1 style={S.pageTitle}>My Courses</h1>
        <p style={S.pageSub}>Your enrolled courses and learning progress</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {assignments.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
              No enrolled courses found.
            </div>
          ) : (
            assignments.map((c) => {
              const progress = c.progressPercent || 0;
              const content = getCourseContent(c);
              const totalVids = content ? content.modules.reduce((a, m) => a + m.items.length, 0) : 0;
              const doneVids = content ? content.modules.reduce((a, m) => a + m.items.filter(v => isVideoDone(c, v.id)).length, 0) : 0;
              return (
                <div key={c._id} style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderLeft: `4px solid ${content?.color || "#f59e0b"}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ fontSize: 36 }}>{content?.icon || "📚"}</div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>{c.course?.title}</h3>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <StatusBadge status={c.status} />
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>📅 Due: {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "No due date"}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>🎬 {doneVids}/{totalVids} items</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: content?.color || "#f59e0b" }}>{progress}%</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>Complete</div>
                    </div>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${content?.color || "#f59e0b"},${content?.color || "#d97706"})`, borderRadius: 4, transition: "width 0.8s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>📖 {content?.modules?.length || 0} modules · {doneVids}/{totalVids} items done</span>
                    <button
                      onClick={() => {
                        setActiveAssignmentId(c._id);
                        const firstModule = content?.modules[0];
                        setActiveModuleId(firstModule?.id || null);
                        setActiveVideoId(firstModule?.items[0]?.id || null);
                        setActiveTab("video");
                      }}
                      style={{ ...S.primaryBtn, padding: "8px 20px", fontSize: 12, background: `linear-gradient(135deg,${content?.color || "#f59e0b"},${content?.color || "#d97706"})` }}
                    >
                      {progress > 0 ? "Continue →" : "Start Course →"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── Course player view ──
  const activeModule = enrichedContent?.modules.find(m => m.id === activeModuleId);
  const activeVideo = activeModule?.items.find(v => v.id === activeVideoId);
  const overallProg = activeAssignment?.progressPercent || 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setActiveAssignmentId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#374151" }}>← Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...S.pageTitle, margin: 0 }}>{enrichedContent?.icon} {activeAssignment?.course?.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", maxWidth: 300 }}>
              <div style={{ height: "100%", width: `${overallProg}%`, background: `linear-gradient(90deg,${enrichedContent?.color || "#f59e0b"},${enrichedContent?.color || "#f59e0b"})`, borderRadius: 4, transition: "width 0.6s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: enrichedContent?.color || "#f59e0b" }}>{overallProg}% complete</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* ── Sidebar: module/video list ── */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "14px 16px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>Course Content</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{enrichedContent?.modules?.length} modules</div>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 600 }}>
            {enrichedContent?.modules.map((mod) => {
              const mp = getModuleProgress(activeAssignment, mod);
              const isModActive = mod.id === activeModuleId;
              return (
                <div key={mod.id}>
                  {/* Module header */}
                  <div
                    onClick={() => { setActiveModuleId(mod.id); setActiveVideoId(mod.items[0]?.id); setActiveTab("video"); }}
                    style={{ padding: "12px 16px", background: isModActive ? "#fffbeb" : "white", borderBottom: "1px solid #f9fafb", cursor: "pointer", borderLeft: `3px solid ${isModActive ? (enrichedContent?.color || "#f59e0b") : "transparent"}` }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: isModActive ? "#92400e" : "#374151" }}>{mod.title}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>
                      {mp.done}/{mp.total} items
                      <span style={{ marginLeft: 6, background: mp.done === mp.total ? "#d1fae5" : "#f3f4f6", color: mp.done === mp.total ? "#065f46" : "#9ca3af", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                        {mp.done === mp.total ? "✓ Done" : `${Math.round((mp.done / mp.total) * 100)}%`}
                      </span>
                    </div>
                  </div>
                  {/* items under module */}
                  {isModActive && mod.items.map((vid) => {
                    const isActive = vid.id === activeVideoId;
                    const done = isVideoDone(activeAssignment, vid.id);
                    return (
                      <div
                        key={vid.id}
                        onClick={() => { setActiveVideoId(vid.id); setActiveTab("video"); }}
                        style={{ padding: "9px 16px 9px 28px", background: isActive ? "#fef3c7" : "#fafafa", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#10b981" : isActive ? (enrichedContent?.color || "#f59e0b") : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", flexShrink: 0 }}>
                          {done ? "✓" : isActive ? "▶" : ""}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? "#92400e" : "#374151", lineHeight: 1.3 }}>{vid.title}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>⏱ {vid.duration}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main content area ── */}
        <div>
          {activeVideo ? (
            <>
              {/* Video + Notes tabs */}
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 16 }}>
                {/* Tab bar */}
                <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
                  {["video", "notes"].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: "12px", border: "none", background: activeTab === t ? "#fffbeb" : "white", color: activeTab === t ? "#92400e" : "#6b7280", fontWeight: activeTab === t ? 800 : 600, fontSize: 13, cursor: "pointer", borderBottom: `2px solid ${activeTab === t ? (enrichedContent?.color || "#f59e0b") : "transparent"}`, transition: "all 0.15s" }}>
                      {t === "video" ? "🎬 Content" : "📝 Notes"}
                    </button>
                  ))}
                </div>

                {activeTab === "video" ? (
                  <div>
                    {/* YouTube embed */}
                    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, background: "#000" }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${activeVideo.ytId}?rel=0&modestbranding=1`}
                        title={activeVideo.title}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{activeVideo.title}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>{activeModule?.title} · ⏱ {activeVideo.duration}</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {isVideoDone(activeAssignment, activeVideoId) ? (
                          <span style={{ background: "#d1fae5", color: "#065f46", padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800 }}>✓ Completed</span>
                        ) : (
                          <button
                            onClick={() => handleMarkDone(activeAssignment, activeVideoId)}
                            style={{ ...S.primaryBtn, background: `linear-gradient(135deg,${enrichedContent?.color || "#f59e0b"},${enrichedContent?.color || "#f59e0b"})`, fontSize: 13 }}
                          >
                            ✅ Mark as Complete
                          </button>
                        )}
                        <button onClick={() => setActiveTab("notes")} style={{ ...S.exportBtn, fontSize: 12 }}>📝 View Notes</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "20px 24px", maxHeight: 520, overflowY: "auto" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 12 }}>📝 Notes — {activeModule?.title}</div>
                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line", fontFamily: "inherit" }}>
                      {activeModule?.notes?.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", margin: "16px 0 8px" }}>{line.replace('## ', '')}</h3>;
                        if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 700, color: "#374151", margin: "8px 0 4px" }}>{line.replace(/\*\*/g, '')}</div>;
                        if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: 16, margin: "3px 0", color: "#4b5563" }}>• {line.slice(2)}</div>;
                        if (line.match(/^\d+\./)) return <div key={i} style={{ paddingLeft: 16, margin: "3px 0", color: "#4b5563" }}>{line}</div>;
                        if (line.startsWith('✅')) return <div key={i} style={{ paddingLeft: 16, margin: "3px 0", color: "#059669", fontWeight: 600 }}>{line}</div>;
                        if (line.startsWith('|')) return <div key={i} style={{ fontFamily: "monospace", fontSize: 12, background: "#f8fafc", padding: "3px 8px", margin: "1px 0" }}>{line}</div>;
                        if (line === '') return <div key={i} style={{ height: 6 }} />;
                        return <div key={i} style={{ margin: "3px 0" }}>{line}</div>;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Next video navigation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {(() => {
                    const allVids = enrichedContent.modules.flatMap(m => m.items.map(v => ({ ...v, moduleId: m.id })));
                    const idx = allVids.findIndex(v => v.id === activeVideoId);
                    return `Video ${idx + 1} of ${allVids.length}`;
                  })()}
                </div>
                <button
                  onClick={() => {
                    const allVids = enrichedContent.modules.flatMap(m => m.items.map(v => ({ ...v, moduleId: m.id })));
                    const idx = allVids.findIndex(v => v.id === activeVideoId);
                    if (idx < allVids.length - 1) {
                      handleMarkDone(activeAssignment, activeVideoId);
                      const next = allVids[idx + 1];
                      setActiveModuleId(next.moduleId);
                      setActiveVideoId(next.id);
                      setActiveTab("video");
                    }
                  }}
                  style={{ ...S.primaryBtn, fontSize: 12, background: `linear-gradient(135deg,${enrichedContent?.color || "#f59e0b"},${enrichedContent?.color || "#f59e0b"})` }}
                >
                  Next Video →
                </button>
              </div>
            </>
          ) : (
            <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👆</div>
              <div style={{ fontSize: 14, color: "#6b7280" }}>Select a video from the left to start learning</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const formatTeacherDate = (value, options = {}) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", ...options });
};

const getAssignmentTitle = (item) => item.title || item.course?.title || "Assignment";
const isReviewedAssignment = (item) => item.score !== null && item.score !== undefined;
const isCertificateReady = (item) => item.status === "completed" || item.progressPercent === 100 || item.status === "approved" || item.status === "reviewed";

function ScheduleTab({ user, lessons = [] }) {
  const [filter, setFilter] = useState("all");
  const items = lessons
    .map((item) => ({
      id: item._id,
      title: item.lessonPlan?.title || "Assigned lesson",
      course: item.lessonPlan?.course?.title || "Training",
      date: item.lessonPlan?.scheduleDate || item.assignedDate,
      status: item.status || "pending",
      objectives: item.lessonPlan?.objectives || item.lessonPlan?.description || ""
    }))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = items.filter((item) => item.date && new Date(item.date) >= today && item.status !== "completed");
  const completed = items.filter((item) => item.status === "completed").length;
  const visibleItems = items.filter((item) => {
    if (filter === "upcoming") return item.date && new Date(item.date) >= today && item.status !== "completed";
    if (filter === "completed") return item.status === "completed";
    if (filter === "pending") return item.status !== "completed";
    return true;
  });
  const filterBtn = (key, label) => (
    <button onClick={() => setFilter(key)} style={{ ...S.exportBtn, background: filter === key ? "#1e40af" : "white", color: filter === key ? "white" : "#6b7280", borderColor: filter === key ? "#1e40af" : "#e5e7eb" }}>
      {label}
    </button>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Schedule</h1>
      <p style={S.pageSub}>Subject: {user.subject || user.teacherProfile?.subject || "Assigned teacher"} · {user.teacherProfile?.class?.name || "Class not assigned"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard icon="📅" label="Scheduled Lessons" val={items.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="⏳" label="Upcoming" val={upcoming.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Completed" val={completed} color="#10b981" bg="#d1fae5" />
      </div>
      <SectionCard title="Assigned Lesson Schedule">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {filterBtn("all", "All")}
          {filterBtn("upcoming", "Upcoming")}
          {filterBtn("pending", "Pending")}
          {filterBtn("completed", "Completed")}
        </div>
        {visibleItems.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", border: "1px dashed #cbd5e1", borderRadius: 12 }}>No lesson schedule found for this filter.</div>
        ) : visibleItems.map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: "white", borderRadius: 10, marginBottom: 8, border: "1px solid #f3f4f6", borderLeft: `4px solid ${item.status === "completed" ? "#10b981" : "#f59e0b"}` }}>
            <div style={{ width: 118, fontSize: 13, fontWeight: 800, color: "#d97706", flexShrink: 0 }}>{formatTeacherDate(item.date)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{item.course}</div>
              {item.objectives && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>{String(item.objectives).slice(0, 120)}</div>}
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function GradesTab({ assignments = [] }) {
  const [filter, setFilter] = useState("all");
  const graded = assignments.filter(isReviewedAssignment);
  const average = graded.length ? Math.round(graded.reduce((sum, item) => sum + Number(item.score || 0), 0) / graded.length) : 0;
  const topScore = graded.length ? Math.max(...graded.map((item) => Number(item.score || 0))) : 0;
  const revisions = assignments.filter((item) => item.status === "revision").length;
  const visibleGrades = graded.filter((item) => {
    if (filter === "excellent") return Number(item.score || 0) >= 85;
    if (filter === "needs-work") return Number(item.score || 0) < 60;
    return true;
  });
  const filterBtn = (key, label) => (
    <button onClick={() => setFilter(key)} style={{ ...S.exportBtn, background: filter === key ? "#7c3aed" : "white", color: filter === key ? "white" : "#6b7280", borderColor: filter === key ? "#7c3aed" : "#e5e7eb" }}>
      {label}
    </button>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Grades</h1>
      <p style={S.pageSub}>Scores and feedback added by admin after review.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard icon="%" label="Average Score" val={graded.length ? average + "%" : "--"} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="#" label="Reviewed Assignments" val={graded.length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="★" label="Best Score" val={graded.length ? topScore + "%" : "--"} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="↻" label="Needs Revision" val={revisions} color="#ef4444" bg="#fee2e2" />
      </div>
      <SectionCard title="Reviewed Work">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {filterBtn("all", "All reviewed")}
          {filterBtn("excellent", "85% and above")}
          {filterBtn("needs-work", "Below 60%")}
        </div>
        {visibleGrades.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", border: "1px dashed #cbd5e1", borderRadius: 12 }}>No grades published for this filter.</div>
        ) : visibleGrades.map((item) => (
          <div key={item._id} style={{ padding: 14, border: "1px solid #f1f5f9", borderRadius: 10, marginBottom: 10, background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{getAssignmentTitle(item)}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{item.feedback || "No written feedback added."}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>Reviewed: {formatTeacherDate(item.reviewedAt || item.updatedAt || item.createdAt)}</div>
              </div>
              <div style={{ minWidth: 92, textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: Number(item.score) >= 75 ? "#10b981" : Number(item.score) >= 60 ? "#f59e0b" : "#ef4444" }}>{item.score}/100</div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function CountdownTimer({ dueDate }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      const diffMs = new Date(dueDate) - new Date();
      if (diffMs <= 0) {
        setTimeLeft("Overdue");
        return;
      }
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`⏳ ${days}d ${hours}h left`);
      } else {
        setTimeLeft(`⏳ ${hours}h ${minutes}m left`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [dueDate]);

  return <span style={{ fontSize: 11, fontWeight: 700, color: timeLeft === "Overdue" ? "#ef4444" : "#d97706" }}>{timeLeft}</span>;
}

function AssignmentsTab({ assignments = [], onSubmitAssignment }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("dueDate");
  const [uploadModal, setUploadModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Submission Form States
  const [submissionText, setSubmissionText] = useState("");
  const [filesList, setFilesList] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const processFiles = async (files) => {
    setUploading(true);
    const newFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploadRes = await uploadFile(file);
        if (uploadRes && uploadRes.asset) {
          newFiles.push({
            name: uploadRes.asset.originalName || file.name,
            url: uploadRes.asset.publicUrl,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            uploadedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        alert(`Failed to upload ${file.name}: ` + err.message);
      }
    }
    setFilesList(prev => [...prev, ...newFiles]);
    setUploading(false);
  };

  const handleRemoveFile = (index) => {
    setFilesList(prev => prev.filter((_, i) => i !== index));
  };

  const handleCloseModal = () => {
    setUploadModal(false);
    setSelectedAssignment(null);
    setSubmissionText("");
    setFilesList([]);
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    setUploading(true);
    try {
      await onSubmitAssignment(selectedAssignment._id, {
        submissionText,
        submittedFiles: filesList
      });
      handleCloseModal();
    } catch (err) {
      alert("Submission failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Metrics
  const total = assignments.length;
  const pendingCount = assignments.filter(a => a.calculatedStatus === "pending").length;
  const submittedCount = assignments.filter(a => a.calculatedStatus === "submitted").length;
  const overdueCount = assignments.filter(a => a.calculatedStatus === "overdue").length;
  const gradedCount = assignments.filter(a => a.calculatedStatus === "graded").length;

  // Search & Filter
  const filtered = assignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || a.calculatedStatus === filter;
    return matchesSearch && matchesFilter;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "dueDate") {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (sort === "title") {
      return a.title.localeCompare(b.title);
    }
    if (sort === "marks") {
      return b.totalMarks - a.totalMarks;
    }
    return 0;
  });

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Assignments Board</h1>
          <p style={S.pageSub}>Manage your coursework, submit activities, and review feedback.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard icon="📚" label="Total Assigned" val={total} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="✏️" label="Pending" val={pendingCount} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="📤" label="Submitted" val={submittedCount} color="#06b6d4" bg="#ecfeff" />
        <StatCard icon="⚠️" label="Overdue" val={overdueCount} color="#ef4444" bg="#fee2e2" />
        <StatCard icon="✅" label="Graded" val={gradedCount} color="#10b981" bg="#d1fae5" />
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search assignments..." />

        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 13, background: "white", outline: "none", cursor: "pointer" }}>
          <option value="dueDate">Sort by Due Date</option>
          <option value="title">Sort by Title</option>
          <option value="marks">Sort by Total Marks</option>
        </select>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "pending", "submitted", "overdue", "graded"].map((k) => (
            <button key={k} onClick={() => setFilter(k)} style={{ ...S.exportBtn, background: filter === k ? "#f59e0b" : "white", color: filter === k ? "white" : "#6b7280", borderColor: filter === k ? "#f59e0b" : "#e5e7eb" }}>
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sorted.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", background: "white", borderRadius: 16, border: "1.5px dashed #cbd5e1", color: "#64748b" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>No assignments found</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Check back later or adjust your filters.</div>
          </div>
        ) : (
          sorted.map(a => {
            const isSubmitted = a.calculatedStatus === "submitted";
            const isGraded = a.calculatedStatus === "graded";
            const isOverdue = a.calculatedStatus === "overdue";
            const hasSubmission = a.submission;

            return (
              <div key={a._id} style={{ background: "white", borderRadius: 18, padding: "20px 24px", border: "1px solid #f1f5f9", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", transition: "transform 0.2s, box-shadow 0.2s", borderLeft: `6px solid ${isGraded ? "#10b981" : isOverdue ? "#ef4444" : isSubmitted ? "#06b6d4" : "#f59e0b"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#1c1917" }}>{a.title}</span>
                      <StatusBadge status={a.calculatedStatus} />
                      {a.calculatedStatus === "pending" && <CountdownTimer dueDate={a.dueDate} />}
                    </div>

                    <p style={{ fontSize: 12.5, color: "#4b5563", lineHeight: 1.5, margin: "0 0 12px" }}>{a.description}</p>

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11.5, color: "#6b7280" }}>
                      <div>📅 <b>Due Date:</b> {new Date(a.dueDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      <div>🏆 <b>Total Marks:</b> {a.totalMarks}</div>
                      <div>📖 <b>Course:</b> {a.courseId?.title || "General"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 120 }}>
                    {isGraded && (
                      <div style={{ background: "#d1fae5", border: "1px solid #10b981", borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#065f46", fontWeight: 700 }}>SCORE</div>
                        <div style={{ fontSize: 20, fontWeight: 950, color: "#065f46" }}>{a.submission?.marksObtained} <span style={{ fontSize: 11, fontWeight: 600 }}>/ {a.totalMarks}</span></div>
                      </div>
                    )}

                    {(!isGraded && !isSubmitted) && (
                      <button onClick={() => { setSelectedAssignment(a); setUploadModal(true); }} style={S.primaryBtn}>
                        📤 Submit Assignment
                      </button>
                    )}

                    {isSubmitted && (
                      <button onClick={() => { setSelectedAssignment(a); setUploadModal(true); }} style={{ ...S.exportBtn, background: "#ecfeff", color: "#0891b2", borderColor: "#a5f3fc" }}>
                        ✏️ Edit Submission
                      </button>
                    )}
                  </div>
                </div>

                {/* Attachments Section */}
                {a.attachments && a.attachments.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#374151", marginBottom: 6 }}>📎 Reference Material:</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {a.attachments.map((file, idx) => (
                        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#2563eb", textDecoration: "none", padding: "4px 8px", background: "#f0f4ff", borderRadius: 6, border: "1px solid #d9e2fc", fontWeight: 600 }}>
                          📄 {file.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress Tracker (Assigned -> Submitted -> Graded) */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 400, margin: "0 auto", position: "relative" }}>
                    <div style={{ position: "absolute", top: 10, left: "10%", right: "10%", height: 3, background: "#e5e7eb", zIndex: 0 }} />
                    <div style={{ position: "absolute", top: 10, left: "10%", width: isGraded ? "80%" : isSubmitted ? "40%" : "0%", height: 3, background: "#f59e0b", zIndex: 0, transition: "width 0.4s" }} />

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700 }}>1</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#374151", marginTop: 4 }}>Assigned</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: isSubmitted || isGraded ? "#f59e0b" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: isSubmitted || isGraded ? "white" : "#9ca3af", fontSize: 10, fontWeight: 700 }}>2</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: isSubmitted || isGraded ? "#374151" : "#9ca3af", marginTop: 4 }}>Submitted</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: isGraded ? "#f59e0b" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: isGraded ? "white" : "#9ca3af", fontSize: 10, fontWeight: 700 }}>3</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: isGraded ? "#374151" : "#9ca3af", marginTop: 4 }}>Graded</div>
                    </div>
                  </div>
                </div>

                {/* Feedback / Review Notes */}
                {hasSubmission && a.submission.feedback && (
                  <div style={{ marginTop: 14, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: 12, color: "#166534" }}>
                    💬 <b>Trainer Feedback:</b> {a.submission.feedback}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Submission Upload Modal */}
      {uploadModal && selectedAssignment && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(5px)" }}>
          <div style={{ background: "white", borderRadius: 24, padding: "28px", width: "90%", maxWidth: 500, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16.5, fontWeight: 800, color: "#1c1917", margin: 0 }}>Upload Coursework</h3>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{selectedAssignment.title}</div>
              </div>
              <button onClick={handleCloseModal} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>

            <label style={S.label}>Submission Notes / Text Response</label>
            <textarea style={{ ...S.input, height: 100, resize: "none", marginBottom: 14 }} value={submissionText} onChange={e => setSubmissionText(e.target.value)} placeholder="Type your written response or submission details here..." />

            <label style={S.label}>File Attachments</label>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple style={{ display: "none" }} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: dragOver ? "2px dashed #059669" : "2px dashed #fbbf24", borderRadius: 12, padding: "20px", textAlign: "center", marginBottom: 14, background: dragOver ? "#ecfdf5" : "#fffbeb", cursor: "pointer", transition: "all 0.2s" }}
            >
              <div style={{ fontSize: 32, marginBottom: 6 }}>📎</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#92400e" }}>
                {uploading ? "Uploading files..." : "Drag & drop files or click to upload"}
              </div>
              <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 4 }}>PDF, DOCX, PPT, PNG, JPG up to 20MB</div>
            </div>

            {/* List Uploaded Files */}
            {filesList.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Attached Files ({filesList.length}):</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filesList.map((file, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                      <span style={{ fontWeight: 600, color: "#374151", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 300 }}>📄 {file.name} ({file.size})</span>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={uploading || (!submissionText.trim() && filesList.length === 0)} style={{ ...S.primaryBtn, width: "100%", padding: "12px" }}>
              {uploading ? "⏳ Uploading..." : "📤 Complete Submission"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificatesTab({ assignments = [] }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("issueDate");
  const [previewCert, setPreviewCert] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCertificates = async () => {
    try {
      const res = await getCertificates();
      if (res && res.certificates) {
        setCertificates(res.certificates);
      }
    } catch (err) {
      console.error("Failed to load certificates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleDownload = (cert) => {
    setDownloadingId(cert._id);
    // Fake nice download micro-animation before opening url
    setTimeout(() => {
      setDownloadingId(null);
      if (cert.pdfUrl) {
        window.open(cert.pdfUrl, "_blank");
      } else {
        // Fallback: Trigger print preview of certificate
        setPreviewCert(cert);
        setTimeout(() => window.print(), 500);
      }
    }, 1500);
  };

  // Stats
  const total = certificates.length;
  const activeCount = certificates.filter(c => c.status === "active").length;
  const expiredCount = certificates.filter(c => c.status === "expired").length;
  const expiringCount = certificates.filter(c => c.status === "expiring_soon").length;

  // Search & Filter
  const filtered = certificates.filter(c => {
    const matchesSearch = c.certificateName.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName.toLowerCase().includes(search.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "issueDate") return new Date(b.issueDate) - new Date(a.issueDate);
    if (sort === "name") return a.certificateName.localeCompare(b.certificateName);
    return 0;
  });

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>🔄 Loading certificates...</div>;
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>My Certificates</h1>
          <p style={S.pageSub}>View and download your earned credentials and specializations.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard icon="🏆" label="Total Credentials" val={total} color="#d97706" bg="#fef3c7" />
        <StatCard icon="✅" label="Active" val={activeCount} color="#10b981" bg="#d1fae5" />
        <StatCard icon="⏳" label="Expiring Soon" val={expiringCount} color="#f59e0b" bg="#fffbeb" />
        <StatCard icon="❌" label="Expired" val={expiredCount} color="#ef4444" bg="#fee2e2" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search certificates..." />

        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 13, background: "white", outline: "none", cursor: "pointer" }}>
          <option value="issueDate">Sort by Issue Date</option>
          <option value="name">Sort by Name</option>
        </select>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "active", "expiring_soon", "expired"].map((k) => (
            <button key={k} onClick={() => setFilter(k)} style={{ ...S.exportBtn, background: filter === k ? "#d97706" : "white", color: filter === k ? "white" : "#6b7280", borderColor: filter === k ? "#d97706" : "#e5e7eb" }}>
              {k.toUpperCase().replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grid listing */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
        {sorted.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", padding: 50, textAlign: "center", background: "white", borderRadius: 16, border: "1.5px dashed #cbd5e1", color: "#64748b" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>No credentials found</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Earn certificates by completing assigned training courses.</div>
          </div>
        ) : (
          sorted.map((cert) => {
            const isDownloading = downloadingId === cert._id;
            return (
              <div key={cert._id} style={{ background: "linear-gradient(135deg, #fffcf5 0%, #fef8e7 100%)", borderRadius: 20, padding: "24px", border: "2px solid #f59e0b", boxShadow: "0 6px 20px rgba(245,158,11,0.08)", transition: "transform 0.2s, box-shadow 0.2s", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: 32 }}>🎓</div>
                  <StatusBadge status={cert.status} />
                </div>

                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: "#1c1917", margin: "0 0 6px", lineHeight: 1.4 }}>{cert.certificateName}</h3>
                <div style={{ fontSize: 12, color: "#4b5563", fontWeight: 600, marginBottom: 14 }}>{cert.courseName}</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#6b7280", marginBottom: 18, borderTop: "1px solid #fcd34d30", paddingTop: 10 }}>
                  <div>💳 ID: <b>{cert.certificateNumber}</b></div>
                  <div>📅 Issued: {new Date(cert.issueDate).toLocaleDateString("en-IN")}</div>
                  {cert.expiryDate && (
                    <div style={{ color: cert.status === "expired" ? "#ef4444" : cert.status === "expiring_soon" ? "#d97706" : "#6b7280" }}>
                      ⏳ Expiry: {new Date(cert.expiryDate).toLocaleDateString("en-IN")}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setPreviewCert(cert)} style={{ ...S.tblBtn, flex: 1, padding: "8px" }}>
                    👁️ Preview
                  </button>
                  <button onClick={() => handleDownload(cert)} disabled={isDownloading} style={{ ...S.primaryBtn, flex: 1, padding: "8px", fontSize: 11.5, background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 3px 8px rgba(16,185,129,0.2)" }}>
                    {isDownloading ? "⏳ Fetching..." : "⬇️ Download"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Certificate Preview Modal */}
      {previewCert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "white", borderRadius: 24, padding: "28px", width: "95%", maxWidth: 800, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1c1917", margin: 0 }}>Certificate Viewer</h3>
              <button onClick={() => setPreviewCert(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>

            {/* Printable Certificate Frame */}
            <div id="print-certificate-target" style={{ border: "10px double #d97706", padding: "40px", background: "#fdfbf7", textAlign: "center", fontFamily: "Georgia, serif", color: "#1c1917", position: "relative", borderRadius: 12, boxShadow: "inset 0 0 40px rgba(217,119,6,0.06)", boxSizing: "border-box" }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#d97706", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>SpacECE Academy</div>
              <div style={{ fontSize: 32, fontWeight: "normal", color: "#1c1917", fontFamily: "'Times New Roman', serif", marginBottom: 20 }}>Certificate of Completion</div>

              <div style={{ fontSize: 12, fontStyle: "italic", color: "#6b7280", marginBottom: 14 }}>This certifies that teacher</div>
              <div style={{ fontSize: 26, fontWeight: "bold", borderBottom: "2px solid #f59e0b", display: "inline-block", paddingBottom: 6, minWidth: 260, color: "#1c1917", marginBottom: 14 }}>{user.name}</div>

              <div style={{ fontSize: 12.5, fontStyle: "italic", color: "#6b7280", marginBottom: 10 }}>has successfully completed training requirements for</div>
              <div style={{ fontSize: 18, fontWeight: "bold", color: "#d97706", marginBottom: 22 }}>{previewCert.courseName}</div>

              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>{previewCert.certificateName}</div>

              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", marginTop: 30, borderTop: "1px dashed #e5e7eb", paddingTop: 20 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: "bold" }}>SpacECE Registrar</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Authorized Signatory</div>
                </div>

                {/* Visual Seal */}
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fffbeb", border: "3px double #fbbf24", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#d97706", fontSize: 10, fontWeight: 800, boxShadow: "0 4px 10px rgba(245,158,11,0.15)" }}>
                  <div>OFFICIAL</div>
                  <div style={{ fontSize: 18 }}>⭐</div>
                  <div>SEAL</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Certificate Number</div>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: "#1c1917", marginTop: 2 }}>{previewCert.certificateNumber}</div>
                  <div style={{ fontSize: 9.5, color: "#9ca3af", marginTop: 4 }}>Issued: {new Date(previewCert.issueDate).toLocaleDateString("en-IN")}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => window.print()} style={{ ...S.primaryBtn, flex: 1, padding: "12px", background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 3px 10px rgba(37,99,235,0.3)" }}>
                🖨️ Print / Save PDF
              </button>
              <button onClick={() => setPreviewCert(null)} style={{ ...S.exportBtn, flex: 1, padding: "12px" }}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Printable Media CSS helper */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-certificate-target, #print-certificate-target * {
            visibility: visible;
          }
          #print-certificate-target {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 15px double #d97706 !important;
            padding: 80px 40px !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────
   PROFILE TAB  (Complete Implementation)
───────────────────────────────────────── */
function ProfileTab({ user, onWorkingCenterChange, onUserUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"

  // Profile picture state
  const [profilePhoto, setProfilePhoto] = useState(user.photoUrl || null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Debug: log initial state
  console.log("ProfileTab - Initial user.photoUrl:", user.photoUrl);
  console.log("ProfileTab - Initial profilePhoto state:", profilePhoto);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });

  const teacherProfile = user.teacherProfile || {};
  const center = teacherProfile.center;
  const centerName = typeof center === "object" ? [center.name, center.city].filter(Boolean).join(", ") : user.workingCenter;

  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    address: teacherProfile.address || user.address || "",
    workingCenter: centerName || "",
    subject: teacherProfile.subject || user.subject || "",
    degree: teacherProfile.qualification || user.qualification || "",
    expBio: teacherProfile.experience || user.experience || ""
  });

  const [savedForm, setSavedForm] = useState({ ...form });

  // Sync profile photo when user prop changes
  useEffect(() => {
    console.log("ProfileTab - user.photoUrl changed:", user.photoUrl);
    console.log("ProfileTab - current profilePhoto:", profilePhoto);
    if (user.photoUrl && user.photoUrl !== profilePhoto) {
      console.log("ProfileTab - updating profilePhoto from user prop");
      setProfilePhoto(user.photoUrl);
      setImageLoadError(false); // Reset error state when photo URL changes
    }
  }, [user.photoUrl]);

  // Profile picture upload handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file (PNG/JPG/JPEG).");
      setMessageType("error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image is too large. Please select a photo under 2MB.");
      setMessageType("error");
      return;
    }

    setUploadingPhoto(true);
    setMessage("");
    try {
      const uploadRes = await uploadFile(file);
      console.log("Upload response:", uploadRes);

      if (uploadRes && uploadRes.asset) {
        let photoUrl = uploadRes.asset.publicUrl;
        console.log("Photo URL from upload:", photoUrl);

        // Convert relative URL to absolute if needed
        if (photoUrl.startsWith("/uploads/")) {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
          photoUrl = `${API_BASE_URL}${photoUrl}`;
          console.log("Converted to absolute URL:", photoUrl);
        }

        // Set the photo URL immediately for display
        setProfilePhoto(photoUrl);
        setImageLoadError(false);

        // Then save to backend
        const res = await updateTeacherMe({ photoUrl });
        console.log("Update teacher response:", res);

        // Update parent user object if callback provided
        if (res.teacher && onUserUpdate) {
          console.log("Updating parent user with photoUrl:", res.teacher.photoUrl);
          onUserUpdate(res.teacher);
        }

        setMessage("Profile picture updated successfully!");
        setMessageType("success");
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      setMessage(error.message || "Failed to upload profile picture.");
      setMessageType("error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Profile save handler
  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        photoUrl: profilePhoto,
        teacherProfile: {
          address: form.address,
          subject: form.subject,
          qualification: form.degree,
          experience: form.expBio
        }
      };
      console.log("Profile save payload:", payload);

      const res = await updateTeacherMe(payload);
      console.log("Profile save response:", res);

      const updated = res.teacher || {};
      console.log("Updated teacher object:", updated);
      console.log("Updated teacher photoUrl:", updated.photoUrl);

      const updatedCenter = updated.teacherProfile?.center;
      const updatedCenterName = typeof updatedCenter === "object" ? [updatedCenter.name, updatedCenter.city].filter(Boolean).join(", ") : form.workingCenter;

      const nextForm = {
        ...form,
        name: updated.name || form.name,
        phone: updated.phone || form.phone,
        address: updated.teacherProfile?.address || form.address,
        subject: updated.teacherProfile?.subject || form.subject,
        degree: updated.teacherProfile?.qualification || form.degree,
        expBio: updated.teacherProfile?.experience || form.expBio,
        workingCenter: updatedCenterName
      };

      setForm(nextForm);
      setSavedForm(nextForm);

      // Update profile photo state if backend returned a different URL
      if (updated.photoUrl && updated.photoUrl !== profilePhoto) {
        console.log("Updating profilePhoto from backend response:", updated.photoUrl);
        setProfilePhoto(updated.photoUrl);
      }

      // Update parent user object if callback provided
      if (onUserUpdate) {
        onUserUpdate(updated);
      }

      onWorkingCenterChange && onWorkingCenterChange(updatedCenterName);
      setMessage("Profile saved successfully!");
      setMessageType("success");
      setEditing(false);
    } catch (error) {
      console.error("Profile save error:", error);
      setMessage(error.message || "Profile update failed.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  // Password change handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage("Please fill in all password fields.");
      setMessageType("error");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage("New password must be at least 8 characters long.");
      setMessageType("error");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("New password and confirm password do not match.");
      setMessageType("error");
      return;
    }

    setChangingPassword(true);
    try {
      await changeTeacherPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setMessage("Password changed successfully!");
      setMessageType("success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage(error.message || "Failed to change password.");
      setMessageType("error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...savedForm });
    setEditing(false);
    setMessage("");
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 800 }}>
      <Toast msg={message} type={messageType} onClose={() => { setMessage(""); setMessageType(""); }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <h1 style={S.pageTitle}>My Profile</h1>
          <p style={S.pageSub}>View and manage your account information</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editing && (
            <button onClick={handleCancel} style={S.exportBtn} disabled={saving}>✕ Cancel</button>
          )}
          <button
            onClick={editing ? handleSave : () => setEditing(true)}
            style={editing ? { ...S.primaryBtn, background: "linear-gradient(135deg,#10b981,#059669)", opacity: saving ? 0.7 : 1 } : S.primaryBtn}
            disabled={saving}
          >
            {editing ? (saving ? "💾 Saving..." : "💾 Save Changes") : "✏️ Edit Profile"}
          </button>
        </div>
      </div>

      {/* Profile Picture Card */}
      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>📷 Profile Picture</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative" }}>
            {profilePhoto && !imageLoadError ? (
              <img
                src={profilePhoto}
                alt="Profile"
                style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "3px solid #f59e0b" }}
                onError={(e) => {
                  console.error("Image failed to load:", profilePhoto);
                  console.error("Error event:", e);
                  setImageLoadError(true);
                }}
                onLoad={() => {
                  console.log("Image loaded successfully:", profilePhoto);
                  setImageLoadError(false);
                }}
              />
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "white" }}>
                {form.name?.[0] || "U"}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: "50%", background: "#f59e0b", border: "2px solid white", color: "white", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? "⏳" : "📷"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              {uploadingPhoto ? "Uploading..." : profilePhoto && !imageLoadError ? "Profile picture uploaded" : "No profile picture"}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Upload a professional photo (PNG/JPG, max 2MB)
            </div>
            {profilePhoto && (
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, wordBreak: "break-all" }}>
                {profilePhoto}
              </div>
            )}
            {imageLoadError && (
              <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>
                Failed to load image
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>👤 Personal Information</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Full Name</label>
            {editing ? (
              <input
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
              />
            ) : (
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", padding: "8px 0" }}>{form.name}</div>
            )}
          </div>

          <div>
            <label style={S.label}>Email Address</label>
            <div style={{ fontSize: 14, color: "#6b7280", padding: "8px 0" }}>{user.email}</div>
          </div>

          <div>
            <label style={S.label}>Phone Number</label>
            {editing ? (
              <input
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            ) : (
              <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{form.phone || "Not added"}</div>
            )}
          </div>

          <div>
            <label style={S.label}>Subject Specialization</label>
            {editing ? (
              <input
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }}
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Mathematics"
              />
            ) : (
              <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{form.subject || "Not specified"}</div>
            )}
          </div>
        </div>

        <div>
          <label style={S.label}>Residential Address</label>
          {editing ? (
            <textarea
              style={{ ...S.input, height: 80, fontSize: 14, background: "white", resize: "vertical" }}
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Your complete address"
            />
          ) : (
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0", lineHeight: 1.5 }}>{form.address || "Not added"}</div>
          )}
        </div>
      </div>

      {/* Professional Information Card */}
      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>💼 Professional Information</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Highest Qualification</label>
            {editing ? (
              <input
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }}
                value={form.degree}
                onChange={e => setForm({ ...form, degree: e.target.value })}
                placeholder="e.g. B.Ed, M.Ed"
              />
            ) : (
              <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{form.degree || "Not specified"}</div>
            )}
          </div>

          <div>
            <label style={S.label}>Working Center</label>
            {editing ? (
              <input
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }}
                value={form.workingCenter}
                onChange={e => setForm({ ...form, workingCenter: e.target.value })}
                placeholder="e.g. Dhayri, Pune, Maharashtra"
              />
            ) : (
              <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{form.workingCenter || "Not assigned"}</div>
            )}
          </div>
        </div>

        <div>
          <label style={S.label}>Professional Work Experience</label>
          {editing ? (
            <textarea
              style={{ ...S.input, height: 100, fontSize: 14, background: "white", resize: "vertical" }}
              value={form.expBio}
              onChange={e => setForm({ ...form, expBio: e.target.value })}
              placeholder="Describe your teaching experience, previous roles, and achievements..."
            />
          ) : (
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0", lineHeight: 1.6 }}>{form.expBio || "No experience details added"}</div>
          )}
        </div>
      </div>

      {/* Account Information Card */}
      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>🔐 Account Information</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Account Status</label>
            <div style={{ padding: "8px 0" }}>
              <Badge children={user.status || "Active"} color={user.status === "approved" ? "#059669" : "#d97706"} bg={user.status === "approved" ? "#d1fae5" : "#fef3c7"} />
            </div>
          </div>

          <div>
            <label style={S.label}>Role</label>
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0", textTransform: "capitalize" }}>{user.role || "Teacher"}</div>
          </div>

          <div>
            <label style={S.label}>Batch/Cohort</label>
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{user.batch || "SpacECE"}</div>
          </div>

          <div>
            <label style={S.label}>Member Since</label>
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not available"}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>🔒 Change Password</h3>

        <form onSubmit={handlePasswordChange}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...S.input, paddingRight: "40px" }}
                  type={showPassword.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af" }}
                >
                  {showPassword.current ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label style={S.label}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...S.input, paddingRight: "40px" }}
                  type={showPassword.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min. 8 characters"
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af" }}
                >
                  {showPassword.new ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label style={S.label}>Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...S.input, paddingRight: "40px" }}
                  type={showPassword.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af" }}
                >
                  {showPassword.confirm ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            style={{ ...S.primaryBtn, background: "linear-gradient(135deg,#ef4444,#dc2626)", opacity: changingPassword ? 0.7 : 1 }}
            disabled={changingPassword}
          >
            {changingPassword ? "Updating Password..." : "🔒 Update Password"}
          </button>
        </form>

        <div style={{ marginTop: 12, padding: "12px", background: "#fef3c7", borderRadius: 8, border: "1px solid #fbbf24" }}>
          <div style={{ fontSize: 11, color: "#92400e", fontWeight: 700, marginBottom: 4 }}>🔐 Security Tips:</div>
          <ul style={{ fontSize: 11, color: "#78350f", margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
            <li>Use a strong password with at least 8 characters</li>
            <li>Include a mix of letters, numbers, and special characters</li>
            <li>Don't reuse passwords from other accounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ notifications = [], onMarkRead, onMarkAllRead, onDeleteNotification }) {
  const icons = { session: "📹", assignment: "📝", approval: "✅", certificate: "🏆", course: "📚", announcement: "📢", info: "🔔" };
  const priorityColors = { high: "#ef4444", normal: "#f59e0b", low: "#3b82f6" };

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Local Search & Filtering
  const filtered = notifications.filter(n => {
    const matchesSearch = n.msg.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || n.type === filterType;
    const matchesPriority = filterPriority === "all" || n.priority === filterPriority;
    return matchesSearch && matchesType && matchesPriority;
  });

  // Simple Page Pagination
  const paginated = filtered.slice(0, page * itemsPerPage);
  const hasMore = filtered.length > paginated.length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={S.pageTitle}>Notifications Centre</h1>
          <p style={S.pageSub}>{notifications.filter(n => !n.read).length} unread alerts</p>
        </div>
        <button onClick={onMarkAllRead} style={{ ...S.exportBtn, background: "#fffbeb", color: "#d97706", borderColor: "#fcd34d" }}>✓ Mark all read</button>
      </div>

      {/* Filter and Search Panel */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search notifications..." />

        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={{ padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 13, background: "white", outline: "none", cursor: "pointer" }}>
          <option value="all">All Types</option>
          <option value="session">Live Sessions</option>
          <option value="assignment">Assignments</option>
          <option value="certificate">Certificates</option>
          <option value="course">Courses</option>
          <option value="announcement">Announcements</option>
        </select>

        <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }} style={{ padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 13, background: "white", outline: "none", cursor: "pointer" }}>
          <option value="all">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="normal">🟡 Normal</option>
          <option value="low">🔵 Low</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {paginated.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No notifications found</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>You are all caught up!</div>
          </div>
        ) : (
          paginated.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && onMarkRead(n.id)}
              style={{
                background: n.read ? "white" : "#fffbeb",
                borderRadius: 14,
                padding: "14px 18px",
                border: `1px solid ${n.read ? "#f1f5f9" : "#fbbf24"}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                borderLeft: `4px solid ${n.read ? "#e5e7eb" : priorityColors[n.priority] || "#f59e0b"}`
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: n.read ? "#f3f4f6" : "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {icons[n.type] || "🔔"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: n.read ? 600 : 800, color: "#1c1917" }}>{n.msg}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 10.5, color: "#9ca3af" }}>{n.time}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: priorityColors[n.priority] || "#6b7280" }}>• {n.priority || "normal"}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />}
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteNotification(n.id); }}
                  style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer", padding: "4px 8px" }}
                  title="Delete Notification"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <button onClick={() => setPage(prev => prev + 1)} style={S.primaryBtn}>
            ➕ Load More Notifications
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN TEACHER DASHBOARD
═══════════════════════════════════════════ */
export default function TeacherDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState({ msg: "", type: "" });
  const [workingCenter, setWorkingCenter] = useState(user.workingCenter || "Dhayri, Pune, Maharashtra");
  const [currentUser, setCurrentUser] = useState(user);

  // Backend States
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [realAssignments, setRealAssignments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  // Handle user updates from profile tab
  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  // Chatbot States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: `Hello ${user.name?.split(" ")[0] || "there"}! I'm your SpaceCE AI Assistant. How can I assist you with your class, attendance, courses, or lesson plans today?` }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const refreshData = async () => {
    try {
      const progressRes = await getTeacherProgress();
      if (progressRes) {
        setCourses(progressRes.courses || []);
        setLessons(progressRes.lessons || []);
        setActivities(progressRes.activities || []);
        setSummary(progressRes.summary || {});
      }
      const assignmentsRes = await getCourses();
      if (assignmentsRes && assignmentsRes.courses) {
        setAssignments(assignmentsRes.courses);
      }

      // Fetch database-driven Assignments
      const realAssignRes = await getAssignments();
      if (realAssignRes && realAssignRes.assignments) {
        setRealAssignments(realAssignRes.assignments);
      }

      // Fetch database-driven Certificates
      const certRes = await getCertificates();
      if (certRes && certRes.certificates) {
        setCertificates(certRes.certificates);
      }

      const notificationsRes = await getNotifications();
      if (notificationsRes && notificationsRes.notifications) {
        const mapped = notificationsRes.notifications.map(n => {
          let timeVal = "Just now";
          if (n.createdAt) {
            const diffMs = new Date() - new Date(n.createdAt);
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 60) timeVal = `${diffMins}m ago`;
            else {
              const diffHrs = Math.floor(diffMins / 60);
              if (diffHrs < 24) timeVal = `${diffHrs}h ago`;
              else timeVal = `${Math.floor(diffHrs / 24)}d ago`;
            }
          }
          return {
            id: n._id,
            type: n.type || "info",
            priority: n.priority || "normal",
            msg: n.message || n.body || n.title || "",
            time: timeVal,
            read: n.read
          };
        });
        setNotifications(mapped);
      }
      // Fetch updated teacher profile including photoUrl
      const teacherRes = await getTeacherMe();
      if (teacherRes && teacherRes.teacher) {
        console.log("Updated teacher profile from refresh:", teacherRes.teacher);
        setCurrentUser(teacherRes.teacher);
      }
    } catch (err) {
      console.error("Error fetching teacher dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const handleMarkDone = async (assignId, payload) => {
    try {
      await updateCourseAssignmentProgress(assignId, payload);
      setToast({ msg: "Progress saved! ✓", type: "success" });
      refreshData();
    } catch (err) {
      setToast({ msg: "Failed to save progress.", type: "error" });
    }
  };

  const handleSubmitAssignment = async (assignId, payload) => {
    try {
      await submitAssignment(assignId, payload);
      setToast({ msg: "Assignment submitted successfully! 📤", type: "success" });
      refreshData();
    } catch (err) {
      setToast({ msg: "Failed to submit assignment.", type: "error" });
    }
  };

  const handleMarkNotifRead = async (notifId) => {
    try {
      await markNotificationRead(notifId);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifRead = async () => {
    try {
      await markAllNotificationsRead();
      setToast({ msg: "All notifications marked as read.", type: "success" });
      refreshData();
    } catch (err) {
      console.error(err);
      setToast({ msg: "Failed to mark all notifications as read.", type: "error" });
    }
  };

  const handleDeleteNotif = async (notifId) => {
    try {
      await deleteTeacherNotification(notifId);
      setToast({ msg: "Notification deleted.", type: "success" });
      refreshData();
    } catch (err) {
      console.error(err);
      setToast({ msg: "Failed to delete notification.", type: "error" });
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await askTeacherChatbot(userMsg);
      if (res && res.reply) {
        setChatMessages(prev => [...prev, { sender: "bot", text: res.reply }]);
      } else {
        setChatMessages(prev => [...prev, { sender: "bot", text: "I'm sorry, I'm having trouble connecting right now." }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "bot", text: "Something went wrong. Please try again later." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingAssignmentsCount = realAssignments.filter(a => a.calculatedStatus === "pending" || a.calculatedStatus === "overdue").length;

  const navItems = [
    { key: "overview", label: "Teacher's Dashboard", icon: "📊" },
    { key: "children_att", label: "Daily Attendance", icon: "📋" },
    { key: "geotag", label: "Geotag Attendance", icon: "📍" },
    { key: "training", label: "Training & Lessons", icon: "🎓" },
    { key: "courses", label: "My Courses", icon: "📚" },
    { key: "assessment", label: "Assessments", icon: "📝" },
    { key: "schedule", label: "Schedule", icon: "📅" },
    { key: "grades", label: "Grades", icon: "📊" },
    { key: "assignments", label: "Assignments", icon: "✏️", badge: pendingAssignmentsCount },
    { key: "certificates", label: "Certificates", icon: "🏆" },
    { key: "notifications", label: "Notifications", icon: "🔔", badge: unreadCount },
    { key: "profile", label: "My Profile", icon: "👤" },
  ];

  const enrichedUser = { ...currentUser, workingCenter };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", fontSize: 16, fontWeight: 700, color: "#64748b" }}>
          🔄 Loading Portal Data...
        </div>
      );
    }
    switch (activeTab) {
      case "overview": return <OverviewTab user={enrichedUser} setActiveTab={setActiveTab} courses={courses} assignments={assignments} lessons={lessons} activities={activities} summary={summary} realAssignments={realAssignments} certificates={certificates} />;
      case "children_att": return <AttendanceManager user={enrichedUser} />;
      case "geotag": return <GeotagAttendance user={enrichedUser} />;
      case "training": return <TrainingAndClassroomManager user={enrichedUser} />;
      case "courses": return <CoursesTab assignments={assignments} onMarkDone={handleMarkDone} />;
      case "assessment": return <ProctoredAssessment user={enrichedUser} />;
      case "schedule": return <ScheduleTab user={enrichedUser} lessons={lessons} />;
      case "grades": return <GradesTab assignments={assignments} />;
      case "assignments": return <AssignmentsTab assignments={realAssignments} onSubmitAssignment={handleSubmitAssignment} />;
      case "certificates": return <CertificatesTab assignments={realAssignments} />;
      case "notifications": return <NotificationsTab notifications={notifications} onMarkRead={handleMarkNotifRead} onMarkAllRead={handleMarkAllNotifRead} onDeleteNotification={handleDeleteNotif} />;
      case "profile": return <ProfileTab user={enrichedUser} onWorkingCenterChange={setWorkingCenter} onUserUpdate={handleUserUpdate} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI','Inter',-apple-system,sans-serif" }}>
      <style>{globalCSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />

      {/* Sidebar */}
      <div style={{ width: 240, background: "white", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 12px rgba(0,0,0,0.04)", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <Logo size={120} />
          <div style={{ textAlign: "center", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", margin: "6px auto 0", display: "inline-block", width: "fit-content" }}>
            🎓 Teacher Panel
          </div>
        </div>
        <nav style={{ padding: "4px 10px", flex: 1 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "none", borderRadius: 10, background: activeTab === item.key ? "#dbeafe" : "transparent", color: activeTab === item.key ? "#1e40af" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 2, transition: "all 0.18s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "1px 7px" }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>{user.name?.[0]}</div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{user.name?.split(" ")[0]}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.subject}</div>
          </div>
          <button onClick={onLogout} title="Sign Out" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 4 }}>⏻</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, width: "0px", minWidth: "0px", padding: "28px 32px", overflowY: "auto", maxHeight: "100vh" }}>
        {renderContent()}
      </div>

      {/* Floating Chatbot Widget */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        {chatOpen && (
          <div style={{ width: 340, height: 460, background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(12px)", border: "1px solid #fbbf24", borderRadius: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginBottom: 16, display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUp 0.3s ease" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)", padding: "16px 20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>🤖</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.2px" }}>SpaceCE Assistant</div>
                  <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 700 }}>Online · Portal Helper</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer", padding: 0 }}>✕</button>
            </div>
            {/* Messages Area */}
            <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, background: "#fafbfc" }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: msg.sender === "user" ? "16px 16px 0 16px" : "16px 16px 16px 0",
                    background: msg.sender === "user" ? "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)" : "white",
                    color: msg.sender === "user" ? "white" : "#1c1917",
                    fontSize: 12.5,
                    fontWeight: 600,
                    lineHeight: 1.45,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    border: msg.sender === "user" ? "none" : "1px solid #f1f5f9"
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "white", padding: "12px 18px", borderRadius: "16px 16px 16px 0", border: "1px solid #f1f5f9", display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ width: 6, height: 6, background: "#d97706", borderRadius: "50%", display: "inline-block", animation: "bounce 1.4s infinite ease-in-out both" }} />
                    <span style={{ width: 6, height: 6, background: "#d97706", borderRadius: "50%", display: "inline-block", animation: "bounce 1.4s infinite ease-in-out both 0.2s" }} />
                    <span style={{ width: 6, height: 6, background: "#d97706", borderRadius: "50%", display: "inline-block", animation: "bounce 1.4s infinite ease-in-out both 0.4s" }} />
                  </div>
                </div>
              )}
            </div>
            {/* Input Area */}
            <div style={{ padding: 12, background: "white", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Ask about attendance, courses..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendChatMessage()}
                style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 12px", fontSize: 12, outline: "none", fontWeight: 600 }}
              />
              <button
                onClick={handleSendChatMessage}
                style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)", border: "none", color: "white", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(217,119,6,0.3)" }}
              >
                ➔
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
            border: "none",
            color: "white",
            fontSize: 24,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(217,119,6,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s ease"
          }}
        >
          💬
        </button>
      </div>
    </div>
  );
}

