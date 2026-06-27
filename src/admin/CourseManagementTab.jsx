import { useEffect, useState } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";
import { t } from "../services/i18n";
import { createCourse, updateCourse, deleteCourse as deleteCourseApi } from "../services/api";
import AICourseGenerator from "./AICourseGenerator";
/* ── A3: Course Management ── */
/* ═══════════════════════════════════════════════════════════
   COURSE MANAGEMENT TAB — A3.1 + A3.2 + A3.3
   Drop-in replacement for CourseManagementTab in AdminDashboard.jsx
═══════════════════════════════════════════════════════════ */

/* ── MOCK CATEGORIES (add near top of AdminDashboard.jsx with other mock data) ── */
// const MOCK_CATEGORIES = [ ... ] — paste the export below into your mock data section

/* ────────────────────────────────────────────────────────
   INITIAL CATEGORY DATA  (paste into AdminDashboard mock section)
   const MOCK_CATEGORIES = [
     { id:1, name:"Foundation",  sub:["Pre-Primary","ECCE"], icon:"🏫", color:"#f59e0b", order:1, count:2 },
     { id:2, name:"Montessori",  sub:["Materials","Method"], icon:"🎨", color:"#10b981", order:2, count:1 },
     { id:3, name:"Psychology",  sub:["Child Dev","Behavior"],icon:"🧠", color:"#8b5cf6", order:3, count:1 },
     { id:4, name:"Policy",      sub:["NEP 2020","FLN"],     icon:"📜", color:"#3b82f6", order:4, count:1 },
     { id:5, name:"Planning",    sub:["Curriculum","Lesson"],icon:"📋", color:"#06b6d4", order:5, count:1 },
     { id:6, name:"Leadership",  sub:["Admin","Management"], icon:"🏆", color:"#ef4444", order:6, count:1 },
     { id:7, name:"Special Ed",  sub:["Inclusive","Support"],icon:"♿", color:"#ec4899", order:7, count:1 },
     { id:8, name:"Digital",     sub:["EdTech","Tools"],     icon:"💻", color:"#14b8a6", order:8, count:1 },
   ];
──────────────────────────────────────────────────────── */

//import { useState } from "react";
//import { StatusBadge, StatCard, SectionCard, Modal, SearchBar, S } from "../components/Shared";

/* ══════════════════════════════════════════
   AI COURSE GENERATOR — Drop-in section for CourseFormModal
   Rendered inside CourseFormModal when activeSection === "ai"
══════════════════════════════════════════ */

const AI_TONES = ["Professional", "Friendly", "Academic", "Motivational"];
const AI_LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];
const AI_DURATIONS = ["2 Weeks", "4 Weeks", "6 Weeks", "8 Weeks", "3 Months", "6 Months"];

// Backend base URL — point this at your Express server.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const getCourseId = (course) => course?._id || course?.id;

/* ══════════════════════════════════════════
   COURSE PREVIEW MODAL — Watch all lessons/videos in a course
══════════════════════════════════════════ */
function CoursePreviewModal({ course, onClose, onProgress }) {
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [watchedLessons, setWatchedLessons] = useState(() => new Set());

  const modules = course?.modules || [];
  const activeModule = modules[activeModuleIdx];
  const lessons = activeModule?.lessons || activeModule?.contents || [];
  const activeLesson = lessons[activeLessonIdx];

  // Resolve YouTube ID from videoUrl or externalUrl
  const resolveYtId = (url) => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/(?:.*[?&]v=|embed\/)|youtu\.be\/)([^"&?\/\s]{11})/);
    return m ? m[1] : null;
  };

  const ytId = resolveYtId(activeLesson?.videoUrl || activeLesson?.externalUrl || activeLesson?.url || "");
  const directUrl = activeLesson?.videoUrl || activeLesson?.externalUrl || activeLesson?.url || "";

  const totalLessons = modules.reduce((a, m) => a + ((m.lessons || m.contents || []).length), 0);
  const watchedCount = watchedLessons.size;
  const completion = totalLessons > 0 ? Math.round((watchedCount / totalLessons) * 100) : 0;

  useEffect(() => {
    if (!activeLesson) return;
    const lessonKey = `${activeModuleIdx}:${activeLessonIdx}`;
    setWatchedLessons((prev) => {
      if (prev.has(lessonKey)) return prev;
      const next = new Set(prev);
      next.add(lessonKey);
      return next;
    });
  }, [activeLesson, activeLessonIdx, activeModuleIdx]);

  useEffect(() => {
    if (!course || typeof onProgress !== "function") {
      return;
    }
    if (completion > 0) {
      onProgress(completion);
    }
  }, [completion, course, onProgress]);

  if (!course) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "white", borderRadius: 20, width: "94%", maxWidth: 900, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#1c1917" }}>🎬 {course.title}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{modules.length} modules · {totalLessons} lessons</div>
          </div>
          <div style={{ minWidth: 180, marginLeft: "auto", marginRight: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
              <span>Completion</span>
              <span>{completion}%</span>
            </div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${completion}%`, height: "100%", background: completion >= 75 ? "#10b981" : completion >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 6 }} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", flex: 1, overflow: "hidden" }}>
          {/* Sidebar — module/lesson list */}
          <div style={{ borderRight: "1px solid #f1f5f9", overflowY: "auto", background: "#fafafa" }}>
            {modules.length === 0 ? (
              <div style={{ padding: 20, color: "#9ca3af", fontSize: 13, textAlign: "center" }}>No modules found in this course.</div>
            ) : (
              modules.map((mod, mi) => {
                const modLessons = mod.lessons || mod.contents || [];
                return (
                  <div key={mi}>
                    <div
                      onClick={() => { setActiveModuleIdx(mi); setActiveLessonIdx(0); }}
                      style={{ padding: "12px 16px", background: mi === activeModuleIdx ? "#fffbeb" : "white", borderBottom: "1px solid #f1f5f9", cursor: "pointer", borderLeft: `3px solid ${mi === activeModuleIdx ? "#f59e0b" : "transparent"}` }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: mi === activeModuleIdx ? "#92400e" : "#374151" }}>M{mi + 1}: {mod.title}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{modLessons.length} lessons</div>
                    </div>
                    {mi === activeModuleIdx && modLessons.map((lesson, li) => (
                      <div
                        key={li}
                        onClick={() => setActiveLessonIdx(li)}
                        style={{ padding: "9px 16px 9px 28px", background: li === activeLessonIdx ? "#fef3c7" : "#fafafa", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <span style={{ fontSize: 14 }}>{lesson.type === "video" ? "🎬" : lesson.type === "live" ? "📡" : "📄"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: li === activeLessonIdx ? 700 : 500, color: li === activeLessonIdx ? "#92400e" : "#374151", lineHeight: 1.3 }}>{lesson.title || `Lesson ${li + 1}`}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>⏱ {lesson.duration || lesson.suggestedDuration || "—"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* Main content area */}
          <div style={{ overflowY: "auto", padding: "0" }}>
            {!activeLesson ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", gap: 12, padding: 40 }}>
                <div style={{ fontSize: 48 }}>📚</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Select a lesson from the left sidebar</div>
                {modules.length === 0 && <div style={{ fontSize: 12 }}>No modules have been added to this course yet.</div>}
              </div>
            ) : (
              <div>
                {/* Video Player */}
                {ytId ? (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, background: "#000" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=0`}
                      title={activeLesson.title}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                ) : directUrl ? (
                  <div style={{ background: "#1c1917", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, gap: 14, padding: 30 }}>
                    <div style={{ fontSize: 40 }}>🔗</div>
                    <div style={{ fontSize: 14, color: "#f3f4f6", fontWeight: 700 }}>{activeLesson.title}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>External video / resource link</div>
                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: "#f59e0b", color: "#1c1917", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: "none" }}
                    >
                      ▶ Open Video / Resource
                    </a>
                  </div>
                ) : (
                  <div style={{ background: "#1c1917", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, gap: 10, padding: 30 }}>
                    <div style={{ fontSize: 40 }}>🎬</div>
                    <div style={{ fontSize: 14, color: "#f3f4f6", fontWeight: 700 }}>{activeLesson.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>No video URL has been added for this lesson.</div>
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>Edit the course to add a YouTube URL or external link.</div>
                  </div>
                )}

                {/* Lesson info */}
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{activeLesson.title}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
                    {activeModule?.title} · ⏱ {activeLesson.duration || activeLesson.suggestedDuration || "N/A"}
                    {activeLesson.type && <span style={{ marginLeft: 10, background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{activeLesson.type}</span>}
                  </div>
                  {(activeLesson.notes || activeLesson.description) && (
                    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9", fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                      {activeLesson.notes || activeLesson.description}
                    </div>
                  )}
                  {/* Navigation buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                    <button
                      disabled={activeLessonIdx === 0 && activeModuleIdx === 0}
                      onClick={() => {
                        if (activeLessonIdx > 0) { setActiveLessonIdx(activeLessonIdx - 1); }
                        else if (activeModuleIdx > 0) {
                          const prevMod = modules[activeModuleIdx - 1];
                          const prevLessons = prevMod.lessons || prevMod.contents || [];
                          setActiveModuleIdx(activeModuleIdx - 1);
                          setActiveLessonIdx(Math.max(0, prevLessons.length - 1));
                        }
                      }}
                      style={{ ...S.tblBtn, opacity: activeLessonIdx === 0 && activeModuleIdx === 0 ? 0.4 : 1 }}
                    >← Previous</button>
                    <button
                      onClick={() => {
                        const nextLi = activeLessonIdx + 1;
                        if (nextLi < lessons.length) { setActiveLessonIdx(nextLi); }
                        else if (activeModuleIdx + 1 < modules.length) {
                          setActiveModuleIdx(activeModuleIdx + 1);
                          setActiveLessonIdx(0);
                        }
                      }}
                      disabled={activeLessonIdx === lessons.length - 1 && activeModuleIdx === modules.length - 1}
                      style={{ ...S.primaryBtn, opacity: activeLessonIdx === lessons.length - 1 && activeModuleIdx === modules.length - 1 ? 0.4 : 1 }}
                    >Next →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   COURSE FORM — A3.2 (Full Multi-Section)
══════════════════════════════════════════ */
 function CourseFormModal({ course, onSave, onClose, categories, setToast }) {
  const isEdit = !!course;

  /* ── State for all sections ── */
  const [activeSection, setActiveSection] = useState("basic");

  /* Basic Info */
  const [title,       setTitle]       = useState(course?.title       || "");
  const [subtitle,    setSubtitle]    = useState(course?.subtitle    || "");
  const [description, setDescription] = useState(course?.description || "");
  const [thumbnail,   setThumbnail]   = useState(course?.thumbnail   || "");
  const [category,    setCategory]    = useState(course?.category    || "Foundation");
  const [tags,        setTags]        = useState(course?.tags        || "");
  const [duration,    setDuration]    = useState(course?.duration    || "");
  const [status,      setStatus]      = useState(course?.status      || "draft");

  /* Curriculum */
  const [modules, setModules] = useState(course?.modules || [
    { id:1, title:"Module 1 – Introduction", lessons:[
      { id:1, title:"Welcome & Overview", type:"video",    duration:"10 min" },
      { id:2, title:"Course Objectives",  type:"reading",  duration:"5 min"  },
    ], quiz:true, assignment:false },
  ]);
  const [dragModuleId, setDragModuleId] = useState(null);

  /* Pricing */
  const [baseFee,    setBaseFee]    = useState(course?.price    || "");
  const [discFee,    setDiscFee]    = useState(course?.discFee  || "");
  const [emiEnabled, setEmiEnabled] = useState(course?.emi      || false);
  const [emiMonths,  setEmiMonths]  = useState(course?.emiMonths|| 3);
  const [coupons,    setCoupons]    = useState(course?.coupons  || [
    { code:"WELCOME20", discount:"20%", expiry:"31/12/2026", active:true },
  ]);
  const [newCoupon,  setNewCoupon]  = useState({ code:"", discount:"", expiry:"" });

  /* Eligibility */
  const [minQual,    setMinQual]    = useState(course?.minQual    || "Graduate");
  const [minExp,     setMinExp]     = useState(course?.minExp     || "Fresher");
  const [batchRestr, setBatchRestr] = useState(course?.batchRestr || "None");

  /* SEO */
  const [metaTitle,  setMetaTitle]  = useState(course?.metaTitle  || "");
  const [metaDesc,   setMetaDesc]   = useState(course?.metaDesc   || "");
  const [keywords,   setKeywords]   = useState(course?.keywords   || "");

  /* Certificate */
  const [passScore,  setPassScore]  = useState(course?.passScore  || 60);
  const [certTpl,    setCertTpl]    = useState(course?.certTpl    || "Gold Standard");
  const [issuerName, setIssuerName] = useState(course?.issuerName || "SpacECE India Foundation");
  const [issuerDes,  setIssuerDes]  = useState(course?.issuerDes  || "Director, Teacher Training");

  /* Notifications */
  const [notifEnroll,   setNotifEnroll]   = useState(course?.notifEnroll   ?? true);
  const [notifComplete, setNotifComplete] = useState(course?.notifComplete ?? true);
  const [notifReminder, setNotifReminder] = useState(course?.notifReminder ?? true);
  const [reminderDays,  setReminderDays]  = useState(course?.reminderDays  || 3);

  /* Curriculum helpers */
  const addModule = () => {
    const id = Date.now();
    setModules(prev => [...prev, { id, title:`Module ${prev.length + 1} – New Module`, lessons:[], quiz:false, assignment:false }]);
  };
  const removeModule = (id) => setModules(prev => prev.filter(m => m.id !== id));
  const updateModuleTitle = (id, val) => setModules(prev => prev.map(m => m.id === id ? { ...m, title:val } : m));
  const addLesson = (moduleId) => {
    setModules(prev => prev.map(m => m.id === moduleId
      ? { ...m, lessons:[...m.lessons, { id:Date.now(), title:"New Lesson", type:"video", duration:"10 min", videoUrl:"", notes:"" }] }
      : m
    ));
  };
  const removeLesson = (moduleId, lessonId) => {
    setModules(prev => prev.map(m => m.id === moduleId
      ? { ...m, lessons:m.lessons.filter(l => l.id !== lessonId) }
      : m
    ));
  };
  const updateLesson = (moduleId, lessonId, field, val) => {
    setModules(prev => prev.map(m => m.id === moduleId
      ? { ...m, lessons:m.lessons.map(l => l.id === lessonId ? { ...l, [field]:val } : l) }
      : m
    ));
  };

  /* Coupon helpers */
  const addCoupon = () => {
    if (!newCoupon.code || !newCoupon.discount) { setToast({ msg:"Fill coupon code and discount.", type:"error" }); return; }
    setCoupons(prev => [...prev, { ...newCoupon, active:true }]);
    setNewCoupon({ code:"", discount:"", expiry:"" });
  };
  const removeCoupon = (code) => setCoupons(prev => prev.filter(c => c.code !== code));

  /* AI Generator → apply generated fields into the form */
  const handleAIApply = (generated) => {
    if (generated._id || generated.id) {
      const saved = {
        ...generated,
        id: generated._id || generated.id,
        modules: (generated.modules || []).map((module, index) => ({
          ...module,
          id: module._id || module.id || index + 1,
          lessons: module.lessons || (module.contents || []).map((lesson, lessonIndex) => ({
            ...lesson,
            id: lesson._id || lesson.id || `${index + 1}-${lessonIndex + 1}`,
            videoUrl: lesson.externalUrl || lesson.videoUrl || "",
            duration: lesson.suggestedDuration || lesson.duration || `${lesson.durationMinutes || 45} min`,
          })),
        })),
        enrolled: generated.enrolled || 0,
        completion: generated.completion || 0,
        revenue: generated.revenue || 0,
        rating: generated.rating || 0,
      };
      onSave(saved);
      setToast?.({ msg: "AI course generated and saved to MongoDB.", type: "success" });
      return;
    }
    if (generated.title)       setTitle(generated.title);
    if (generated.subtitle)    setSubtitle(generated.subtitle);
    if (generated.description) setDescription(generated.description);
    if (generated.tags)        setTags(generated.tags);
    if (generated.duration)    setDuration(generated.duration);
    if (generated.metaTitle)   setMetaTitle(generated.metaTitle);
    if (generated.metaDesc)    setMetaDesc(generated.metaDesc);
    if (generated.keywords)    setKeywords(generated.keywords);
    if (generated.modules && generated.modules.length > 0) setModules(generated.modules);
    setToast?.({ msg: "AI-generated content applied! Review each section before publishing.", type: "success" });
    setActiveSection("basic");
  };

  /* Save */
  const handleSave = () => {
    if (!title) { setToast({ msg:"Course title is required.", type:"error" }); setActiveSection("basic"); return; }
    const saved = {
      id: course?._id || course?.id || Date.now(),
      title, subtitle, description, thumbnail, category, tags,
      duration, status,
      modules,
      price: Number(baseFee) || 0,
      discFee: Number(discFee) || 0,
      emi: emiEnabled, emiMonths, coupons,
      minQual, minExp, batchRestr,
      metaTitle, metaDesc, keywords,
      passScore: Number(passScore), certTpl, issuerName, issuerDes,
      notifEnroll, notifComplete, notifReminder, reminderDays,
      enrolled: course?.enrolled || 0,
      completion: course?.completion || 0,
      revenue: course?.revenue || 0,
      rating: course?.rating || 0,
    };
    onSave(saved);
  };

  const sections = [
    { key:"basic",       label:"📋 Basic Info"       },
    { key:"ai",          label:"🤖 AI Generator"     },
    { key:"curriculum",  label:"📚 Curriculum"       },
    { key:"pricing",     label:"💰 Pricing"          },
    { key:"eligibility", label:"🎓 Eligibility"      },
    { key:"seo",         label:"🔍 SEO"              },
    { key:"certificate", label:"🏅 Certificate"      },
    { key:"notifications",label:"🔔 Notifications"  },
  ];

  const Toggle = ({ val, onToggle, label }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f3f4f6" }}>
      <span style={{ fontSize:13, color:"#374151", fontWeight:600 }}>{label}</span>
      <div onClick={onToggle} style={{ width:42, height:24, borderRadius:12, background:val?"#10b981":"#e5e7eb", position:"relative", cursor:"pointer", transition:"background 0.3s", flexShrink:0 }}>
        <div style={{ position:"absolute", top:2, left:val?18:2, width:20, height:20, borderRadius:"50%", background:"white", transition:"left 0.3s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"white", borderRadius:20, width:"90%", maxWidth:800, maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding:"20px 28px", borderBottom:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <h3 style={{ fontSize:18, fontWeight:900, color:"#1c1917", margin:0 }}>{isEdit ? "✏️ Edit Course" : "➕ Add New Course"}</h3>
            <p style={{ fontSize:12, color:"#9ca3af", margin:"4px 0 0" }}>Fill all sections for a complete course setup</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#9ca3af" }}>✕</button>
        </div>

        {/* Section Tabs */}
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #f1f5f9", overflowX:"auto", flexShrink:0, padding:"0 20px" }}>
          {sections.map(sec => (
            <button key={sec.key} onClick={() => setActiveSection(sec.key)}
              style={{ padding:"12px 14px", border:"none", borderBottom:`2px solid ${activeSection===sec.key?"#f59e0b":"transparent"}`, background:"none", color:activeSection===sec.key?"#92400e":"#9ca3af", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              {sec.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>

          {/* ── BASIC INFO ── */}
          {activeSection === "basic" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={S.label}>Course Title *</label>
                <input style={S.input} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Pre-Primary Teacher Training"/>
              </div>
              <div>
                <label style={S.label}>Subtitle</label>
                <input style={S.input} value={subtitle} onChange={e=>setSubtitle(e.target.value)} placeholder="A short tagline for the course"/>
              </div>
              <div>
                <label style={S.label}>Description</label>
                <textarea style={{ ...S.input, height:90, resize:"none" }} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Full course description visible to learners..."/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={S.label}>Category</label>
                  <select style={S.input} value={category} onChange={e=>setCategory(e.target.value)}>
                    {categories.length > 0
                      ? categories.map(c => <option key={c.id}>{c.name}</option>)
                      : <option value="Foundation">Foundation</option>}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Duration</label>
                  <input style={S.input} value={duration} onChange={e=>setDuration(e.target.value)} placeholder="e.g. 6 Weeks"/>
                </div>
              </div>
              <div>
                <label style={S.label}>Tags (comma separated)</label>
                <input style={S.input} value={tags} onChange={e=>setTags(e.target.value)} placeholder="e.g. ECCE, Pre-Primary, Child Development"/>
              </div>
              <div>
                <label style={S.label}>Thumbnail URL</label>
                <input style={S.input} value={thumbnail} onChange={e=>setThumbnail(e.target.value)} placeholder="https://...image url"/>
                {thumbnail && <img src={thumbnail} alt="thumb" style={{ marginTop:8, width:120, height:80, objectFit:"cover", borderRadius:8, border:"1px solid #f1f5f9" }} onError={e=>e.target.style.display="none"}/>}
              </div>
              <div>
                <label style={S.label}>Initial Status</label>
                <select style={S.input} value={status} onChange={e=>setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          )}

          {/* ── AI GENERATOR ── */}
          {activeSection === "ai" && (
            <AICourseGenerator onApply={handleAIApply} categories={categories} />
          )}

          {/* ── CURRICULUM ── */}
          {activeSection === "curriculum" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:13, color:"#6b7280" }}>Drag modules to reorder. Add lessons, quizzes, and assignments inside each module.</div>
                <button onClick={addModule} style={S.primaryBtn}>+ Add Module</button>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {modules.map((mod, mi) => (
                  <div key={mod.id}
                    draggable
                    onDragStart={() => setDragModuleId(mod.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (!dragModuleId || dragModuleId === mod.id) return;
                      setModules(prev => {
                        const arr = [...prev];
                        const fromIdx = arr.findIndex(m => m.id === dragModuleId);
                        const toIdx   = arr.findIndex(m => m.id === mod.id);
                        const [moved] = arr.splice(fromIdx, 1);
                        arr.splice(toIdx, 0, moved);
                        return arr;
                      });
                      setDragModuleId(null);
                    }}
                    style={{ background:"#f9fafb", borderRadius:14, border:"1px solid #e5e7eb", overflow:"hidden" }}>

                    {/* Module Header */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"white", borderBottom:"1px solid #f3f4f6" }}>
                      <span style={{ cursor:"grab", color:"#d1d5db", fontSize:16 }}>⠿</span>
                      <span style={{ fontSize:13, fontWeight:800, color:"#f59e0b" }}>M{mi + 1}</span>
                      <input
                        style={{ flex:1, border:"none", background:"transparent", fontSize:13, fontWeight:700, color:"#1c1917", outline:"none", fontFamily:"inherit" }}
                        value={mod.title}
                        onChange={e => updateModuleTitle(mod.id, e.target.value)}
                      />
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#6b7280", cursor:"pointer" }}>
                          <input type="checkbox" checked={mod.quiz} onChange={e => setModules(prev => prev.map(m => m.id===mod.id?{...m,quiz:e.target.checked}:m))}/> Quiz
                        </label>
                        <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#6b7280", cursor:"pointer" }}>
                          <input type="checkbox" checked={mod.assignment} onChange={e => setModules(prev => prev.map(m => m.id===mod.id?{...m,assignment:e.target.checked}:m))}/> Assignment
                        </label>
                        <button onClick={() => removeModule(mod.id)} style={{ ...S.tblBtn, color:"#dc2626", borderColor:"#fca5a5", fontSize:10 }}>✕ Remove</button>
                      </div>
                    </div>

{/* Lessons */}
                     <div style={{ padding:"10px 16px" }}>
                       {mod.lessons.map((lesson, li) => (
                         <div key={lesson.id} style={{ marginBottom:12 }}>
                           <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px", background:"white", borderRadius:8, border:"1px solid #e5e7eb" }}>
                             <span style={{ fontSize:12, color:"#9ca3af", fontWeight:600 }}>L{li + 1}</span>
                             <input
                               style={{ flex:1, border:"none", background:"transparent", fontSize:13, color:"#374151", outline:"none", fontFamily:"inherit" }}
                               value={lesson.title}
                               onChange={e => updateLesson(mod.id, lesson.id, "title", e.target.value)}
                             />
                             <select
                               value={lesson.type}
                               onChange={e => updateLesson(mod.id, lesson.id, "type", e.target.value)}
                               style={{ ...S.input, width:90, padding:"4px 8px", fontSize:12, marginBottom:0 }}>
                               {["video","reading","live","quiz","assignment"].map(t => <option key={t}>{t}</option>)}
                             </select>
                             <input
                               style={{ ...S.input, width:70, padding:"4px 8px", fontSize:12, marginBottom:0 }}
                               value={lesson.duration}
                               onChange={e => updateLesson(mod.id, lesson.id, "duration", e.target.value)}
                               placeholder="10 min"
                             />
                             <button onClick={() => removeLesson(mod.id, lesson.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:16, padding:"0 4px" }}>✕</button>
                           </div>

                           {/* Video URL section for video lessons */}
                           {lesson.type === "video" && (
                             <div style={{ marginTop:8, padding:"12px", background:"#eff6ff", borderRadius:8, border:"1px solid #bfdbfe" }}>
                               <label style={{ ...S.label, fontSize:11, color:"#1d4ed8", marginBottom:4 }}>📹 Video URL</label>
                               <input
                                 style={{ ...S.input, width:"100%", padding:"8px 12px", fontSize:12, marginBottom:0, background:"white" }}
                                 value={lesson.videoUrl || ""}
                                 onChange={e => updateLesson(mod.id, lesson.id, "videoUrl", e.target.value)}
                                 placeholder="https://youtube.com/... or video upload link"
                               />
                               {lesson.videoUrl && (
                                 <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:12 }}>
                                   <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#2563eb" }}>🔗 Preview Video</a>
                                   <span style={{ fontSize:11, color:"#059669", fontWeight:600 }}>✓ Video attached</span>
                                 </div>
                               )}
                             </div>
                           )}

                           {/* Notes section for video and reading lessons */}
                           {(lesson.type === "video" || lesson.type === "reading") && (
                             <div style={{ marginTop:8, padding:"12px", background:"#f0fdf4", borderRadius:8, border:"1px solid #bbf7d0" }}>
                               <label style={{ ...S.label, fontSize:11, color:"#16a34a", marginBottom:4 }}>📝 Notes (visible to students)</label>
                               <textarea
                                 style={{ ...S.input, width:"100%", height:70, padding:"8px 12px", fontSize:12, marginBottom:0, resize:"vertical", background:"white" }}
                                 value={lesson.notes || ""}
                                 onChange={e => updateLesson(mod.id, lesson.id, "notes", e.target.value)}
                                 placeholder="Add notes or key takeaways for this lesson..."
                               />
                             </div>
                           )}
                         </div>
                       ))}
                       <button onClick={() => addLesson(mod.id)} style={{ ...S.tblBtn, marginTop:4, fontSize:12 }}>+ Add Lesson</button>
                       {mod.quiz && (
                         <div style={{ marginTop:6, padding:"8px 10px", background:"#fef3c7", borderRadius:8, fontSize:11, color:"#92400e", border:"1px solid #fbbf24" }}>
                           📝 Quiz attached to this module
                         </div>
                       )}
                       {mod.assignment && (
                         <div style={{ marginTop:6, padding:"8px 10px", background:"#dbeafe", borderRadius:8, fontSize:11, color:"#1d4ed8", border:"1px solid #93c5fd" }}>
                           📋 Assignment attached to this module
                         </div>
                       )}
                     </div>
                  </div>
                ))}
              </div>

              {modules.length === 0 && (
                <div style={{ textAlign:"center", padding:40, color:"#9ca3af" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📚</div>
                  <div style={{ fontSize:13 }}>No modules yet. Click "+ Add Module" to start building.</div>
                </div>
              )}
            </div>
          )}

          {/* ── PRICING ── */}
          {activeSection === "pricing" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={S.label}>Base Fee (₹) *</label>
                  <input style={S.input} type="number" value={baseFee} onChange={e=>setBaseFee(e.target.value)} placeholder="4500"/>
                </div>
                <div>
                  <label style={S.label}>Discounted Fee (₹)</label>
                  <input style={S.input} type="number" value={discFee} onChange={e=>setDiscFee(e.target.value)} placeholder="3800"/>
                </div>
              </div>

              {discFee && baseFee && (
                <div style={{ background:"#d1fae5", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#065f46", border:"1px solid #6ee7b7" }}>
                  💰 Savings: ₹{Number(baseFee) - Number(discFee)} ({Math.round(((Number(baseFee)-Number(discFee))/Number(baseFee))*100)}% off)
                </div>
              )}

              <div style={{ background:"#f9fafb", borderRadius:12, padding:"14px 16px", border:"1px solid #f1f5f9" }}>
                <Toggle val={emiEnabled} onToggle={() => setEmiEnabled(!emiEnabled)} label="📅 Enable EMI / Instalment Options"/>
                {emiEnabled && (
                  <div style={{ marginTop:12 }}>
                    <label style={S.label}>EMI Months</label>
                    <div style={{ display:"flex", gap:8 }}>
                      {[2,3,6,12].map(m => (
                        <button key={m} onClick={() => setEmiMonths(m)}
                          style={{ flex:1, padding:"8px", borderRadius:8, border:`1.5px solid ${emiMonths===m?"#f59e0b":"#e5e7eb"}`, background:emiMonths===m?"#fef3c7":"white", color:emiMonths===m?"#92400e":"#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                          {m}M
                        </button>
                      ))}
                    </div>
                    {baseFee && (
                      <div style={{ marginTop:8, fontSize:12, color:"#6b7280" }}>
                        Monthly instalment: ₹{Math.ceil((Number(discFee)||Number(baseFee)) / emiMonths).toLocaleString("en-IN")} × {emiMonths} months
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Coupon Codes */}
              <div>
                <label style={{ ...S.label, marginBottom:10 }}>🎟️ Coupon Codes</label>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                  {coupons.map((c, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#f9fafb", borderRadius:10, border:"1px solid #f3f4f6" }}>
                      <span style={{ fontSize:12, fontWeight:800, color:"#1c1917", fontFamily:"monospace" }}>{c.code}</span>
                      <span style={{ padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:700, background:"#d1fae5", color:"#065f46" }}>{c.discount}</span>
                      {c.expiry && <span style={{ fontSize:11, color:"#9ca3af" }}>Expires {c.expiry}</span>}
                      <button onClick={() => removeCoupon(c.code)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:14 }}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:8, alignItems:"end" }}>
                  <div>
                    <label style={S.label}>Code</label>
                    <input style={{ ...S.input, marginBottom:0 }} value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon,code:e.target.value.toUpperCase()})} placeholder="SUMMER30"/>
                  </div>
                  <div>
                    <label style={S.label}>Discount</label>
                    <input style={{ ...S.input, marginBottom:0 }} value={newCoupon.discount} onChange={e=>setNewCoupon({...newCoupon,discount:e.target.value})} placeholder="30% or ₹500"/>
                  </div>
                  <div>
                    <label style={S.label}>Expiry</label>
                    <input style={{ ...S.input, marginBottom:0 }} type="date" value={newCoupon.expiry} onChange={e=>setNewCoupon({...newCoupon,expiry:e.target.value})}/>
                  </div>
                  <button onClick={addCoupon} style={{ ...S.btnGreen, height:38 }}>+ Add</button>
                </div>
              </div>
            </div>
          )}

          {/* ── ELIGIBILITY ── */}
          {activeSection === "eligibility" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={S.label}>Minimum Qualification</label>
                <select style={S.input} value={minQual} onChange={e=>setMinQual(e.target.value)}>
                  {["12th","Graduate","Post-Graduate","B.Ed","D.El.Ed","Any"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Minimum Experience</label>
                <select style={S.input} value={minExp} onChange={e=>setMinExp(e.target.value)}>
                  {["Fresher","1-2 yrs","3-5 yrs","5+ yrs","Any"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Batch Restrictions</label>
                <select style={S.input} value={batchRestr} onChange={e=>setBatchRestr(e.target.value)}>
                  {["None","Batch A Only","Batch B Only","Batch C Only","All Batches"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ background:"#fef3c7", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#92400e", border:"1px solid #fbbf24" }}>
                ℹ️ Teachers not meeting eligibility criteria will see a locked state on the course listing page.
              </div>
            </div>
          )}

          {/* ── SEO ── */}
          {activeSection === "seo" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ background:"#f0f9ff", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#0369a1", border:"1px solid #bae6fd", marginBottom:4 }}>
                🔍 SEO settings improve discoverability on Google and within the SpacECE search. Keep meta title under 60 characters.
              </div>
              <div>
                <label style={S.label}>Meta Title</label>
                <input style={S.input} value={metaTitle} onChange={e=>setMetaTitle(e.target.value)} placeholder="Pre-Primary Teacher Training | SpacECE"/>
                <div style={{ fontSize:10, color: metaTitle.length > 60 ? "#dc2626" : "#9ca3af", marginTop:2 }}>{metaTitle.length}/60 characters</div>
              </div>
              <div>
                <label style={S.label}>Meta Description</label>
                <textarea style={{ ...S.input, height:80, resize:"none" }} value={metaDesc} onChange={e=>setMetaDesc(e.target.value)} placeholder="A comprehensive teacher training program for early childhood educators covering ECCE principles..."/>
                <div style={{ fontSize:10, color: metaDesc.length > 160 ? "#dc2626" : "#9ca3af", marginTop:2 }}>{metaDesc.length}/160 characters</div>
              </div>
              <div>
                <label style={S.label}>Keywords (comma separated)</label>
                <input style={S.input} value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="ECCE training, pre-primary teacher, early childhood education"/>
              </div>
              {(metaTitle || metaDesc) && (
                <div style={{ background:"white", borderRadius:10, padding:"14px 16px", border:"1px solid #e5e7eb" }}>
                  <div style={{ fontSize:10, color:"#9ca3af", marginBottom:6 }}>🔍 Google Preview</div>
                  <div style={{ fontSize:14, color:"#1a0dab", fontWeight:600 }}>{metaTitle || title}</div>
                  <div style={{ fontSize:11, color:"#006621" }}>https://spaceece.in/courses/{title.toLowerCase().replace(/\s+/g,"-")}</div>
                  <div style={{ fontSize:12, color:"#545454", marginTop:2 }}>{metaDesc || description}</div>
                </div>
              )}
            </div>
          )}

          {/* ── CERTIFICATE SETTINGS ── */}
          {activeSection === "certificate" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={S.label}>Pass Score (%)</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[50,60,70,80].map(s => (
                    <button key={s} onClick={() => setPassScore(s)}
                      style={{ flex:1, padding:"10px", borderRadius:8, border:`1.5px solid ${passScore===s?"#f59e0b":"#e5e7eb"}`, background:passScore===s?"#fef3c7":"white", color:passScore===s?"#92400e":"#6b7280", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Certificate Template</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  {[
                    { name:"Gold Standard", color:"#f59e0b", desc:"Premium design" },
                    { name:"Modern Blue",   color:"#3b82f6", desc:"Professional look" },
                    { name:"Classic",       color:"#10b981", desc:"Minimal & clean" },
                  ].map(t => (
                    <div key={t.name} onClick={() => setCertTpl(t.name)}
                      style={{ padding:"14px", borderRadius:12, border:`2px solid ${certTpl===t.name?t.color:"#e5e7eb"}`, cursor:"pointer", textAlign:"center", background:certTpl===t.name?`${t.color}10`:"white" }}>
                      <div style={{ fontSize:24, marginBottom:6 }}>🏅</div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#1c1917" }}>{t.name}</div>
                      <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={S.label}>Issuer Name</label>
                  <input style={S.input} value={issuerName} onChange={e=>setIssuerName(e.target.value)} placeholder="Organisation name"/>
                </div>
                <div>
                  <label style={S.label}>Issuer Designation</label>
                  <input style={S.input} value={issuerDes} onChange={e=>setIssuerDes(e.target.value)} placeholder="Director, Teacher Training"/>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection === "notifications" && (
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ background:"#f0f9ff", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#0369a1", border:"1px solid #bae6fd", marginBottom:10 }}>
                🔔 Auto-email triggers are sent from the SpacECE notification system. Toggle each event below.
              </div>
              <Toggle val={notifEnroll}   onToggle={() => setNotifEnroll(!notifEnroll)}     label="📧 Enrollment Confirmation Email"/>
              <Toggle val={notifComplete} onToggle={() => setNotifComplete(!notifComplete)} label="🎓 Course Completion Email + Certificate"/>
              <Toggle val={notifReminder} onToggle={() => setNotifReminder(!notifReminder)} label="⏰ Session / Assignment Reminder Email"/>
              {notifReminder && (
                <div style={{ marginLeft:16, marginTop:8 }}>
                  <label style={S.label}>Send reminder (days before due)</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {[1,2,3,5,7].map(d => (
                      <button key={d} onClick={() => setReminderDays(d)}
                        style={{ flex:1, padding:"8px", borderRadius:8, border:`1.5px solid ${reminderDays===d?"#f59e0b":"#e5e7eb"}`, background:reminderDays===d?"#fef3c7":"white", color:reminderDays===d?"#92400e":"#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 28px", borderTop:"1px solid #f3f4f6", display:"flex", gap:10, justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose} style={S.tblBtn}>Cancel</button>
          <button onClick={() => { setStatus("draft"); handleSave(); }} style={S.exportBtn}>💾 Save as Draft</button>
          <button onClick={handleSave} style={S.primaryBtn}>✅ {isEdit?"Update Course":"Publish Course"} →</button>
        </div>
      </div>
    </div>
  );
}



/* ══════════════════════════════════════════
   CATEGORY MANAGEMENT — A3.3
══════════════════════════════════════════ */
function CategoryManagementModal({ categories, setCategories, setToast, onClose }) {
  const ICONS  = ["🏫","🎨","🧠","📜","📋","🏆","♿","💻","📚","🎓","🌟","🔬","🎯","🌍","🎵"];
  const COLORS = ["#f59e0b","#10b981","#8b5cf6","#3b82f6","#06b6d4","#ef4444","#ec4899","#14b8a6","#f97316","#84cc16"];

  const [editId,    setEditId]    = useState(null);
  const [addMode,   setAddMode]   = useState(false);
  const [newCat,    setNewCat]    = useState({ name:"", sub:"", icon:"📚", color:"#f59e0b" });
  const [dragCatId, setDragCatId] = useState(null);

  const startEdit = (cat) => {
    setEditId(cat.id);
    setNewCat({ name:cat.name, sub:cat.sub.join(", "), icon:cat.icon, color:cat.color });
    setAddMode(false);
  };

  const saveEdit = () => {
    if (!newCat.name) { setToast({ msg:"Category name required.", type:"error" }); return; }
    setCategories(prev => prev.map(c => c.id === editId
      ? { ...c, name:newCat.name, sub:newCat.sub.split(",").map(s=>s.trim()).filter(Boolean), icon:newCat.icon, color:newCat.color }
      : c
    ));
    setToast({ msg:"Category updated!", type:"success" });
    setEditId(null);
  };

  const addCategory = () => {
    if (!newCat.name) { setToast({ msg:"Category name required.", type:"error" }); return; }
    const maxOrder = Math.max(0, ...categories.map(c => c.order));
    setCategories(prev => [...prev, {
      id:    Date.now(),
      name:  newCat.name,
      sub:   newCat.sub.split(",").map(s=>s.trim()).filter(Boolean),
      icon:  newCat.icon,
      color: newCat.color,
      order: maxOrder + 1,
      count: 0,
    }]);
    setToast({ msg:"Category added!", type:"success" });
    setAddMode(false);
    setNewCat({ name:"", sub:"", icon:"📚", color:"#f59e0b" });
  };

  const deleteCategory = (id) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setToast({ msg:"Category deleted.", type:"error" });
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    setCategories(prev => {
      const arr = [...prev];
      [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
      return arr.map((c, i) => ({ ...c, order:i+1 }));
    });
  };

  const moveDown = (idx) => {
    setCategories(prev => {
      if (idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]];
      return arr.map((c, i) => ({ ...c, order:i+1 }));
    });
  };

  const CatForm = ({ onSave, onCancel }) => (
    <div style={{ background:"#f9fafb", borderRadius:12, padding:"16px", border:"1px solid #e5e7eb", marginBottom:10 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <label style={S.label}>Category Name *</label>
          <input style={{ ...S.input, marginBottom:0 }} value={newCat.name} onChange={e=>setNewCat({...newCat,name:e.target.value})} placeholder="e.g. Foundation"/>
        </div>
        <div>
          <label style={S.label}>Sub-categories (comma separated)</label>
          <input style={{ ...S.input, marginBottom:0 }} value={newCat.sub} onChange={e=>setNewCat({...newCat,sub:e.target.value})} placeholder="e.g. Pre-Primary, ECCE"/>
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={S.label}>Icon</label>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {ICONS.map(ic => (
            <button key={ic} onClick={() => setNewCat({...newCat,icon:ic})}
              style={{ width:36, height:36, borderRadius:8, border:`2px solid ${newCat.icon===ic?"#f59e0b":"#e5e7eb"}`, background:newCat.icon===ic?"#fef3c7":"white", fontSize:18, cursor:"pointer" }}>
              {ic}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:12 }}>
        <label style={S.label}>Colour</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {COLORS.map(col => (
            <button key={col} onClick={() => setNewCat({...newCat,color:col})}
              style={{ width:28, height:28, borderRadius:"50%", background:col, border:`3px solid ${newCat.color===col?"#1c1917":"transparent"}`, cursor:"pointer" }}/>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onSave}   style={{ ...S.primaryBtn }}>Save Category</button>
        <button onClick={onCancel} style={S.tblBtn}>Cancel</button>
      </div>
    </div>
  );

  return (
    <Modal title="🗂️ Course Category Management" onClose={onClose}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:12, color:"#9ca3af" }}>{categories.length} categories · Drag or use arrows to reorder</span>
        <button onClick={() => { setAddMode(true); setEditId(null); setNewCat({ name:"", sub:"", icon:"📚", color:"#f59e0b" }); }}
          style={S.primaryBtn}>+ New Category</button>
      </div>

      {addMode && <CatForm onSave={addCategory} onCancel={() => setAddMode(false)}/>}

      <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:420, overflowY:"auto" }}>
        {categories.sort((a,b) => a.order - b.order).map((cat, idx) => (
          <div key={cat.id}>
            {editId === cat.id ? (
              <CatForm onSave={saveEdit} onCancel={() => setEditId(null)}/>
            ) : (
              <div
                draggable
                onDragStart={() => setDragCatId(cat.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!dragCatId || dragCatId === cat.id) return;
                  setCategories(prev => {
                    const arr = [...prev];
                    const fi = arr.findIndex(c => c.id === dragCatId);
                    const ti = arr.findIndex(c => c.id === cat.id);
                    const [moved] = arr.splice(fi, 1);
                    arr.splice(ti, 0, moved);
                    return arr.map((c, i) => ({ ...c, order:i+1 }));
                  });
                  setDragCatId(null);
                }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"white", borderRadius:12, border:"1px solid #f1f5f9", cursor:"grab" }}>
                <span style={{ color:"#d1d5db", fontSize:14 }}>⠿</span>
                <div style={{ width:36, height:36, borderRadius:10, background:`${cat.color}20`, border:`1.5px solid ${cat.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {cat.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:"#1c1917" }}>{cat.name}</div>
                  <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>
                    {cat.sub.join(" · ") || "No sub-categories"} &nbsp;·&nbsp; {cat.count} courses
                  </div>
                </div>
                <div style={{ width:12, height:12, borderRadius:"50%", background:cat.color, flexShrink:0 }}/>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={() => moveUp(idx)}   style={{ ...S.tblBtn, padding:"4px 8px" }}>↑</button>
                  <button onClick={() => moveDown(idx)} style={{ ...S.tblBtn, padding:"4px 8px" }}>↓</button>
                  <button onClick={() => startEdit(cat)} style={{ ...S.tblBtn }}>Edit</button>
                  <button onClick={() => deleteCategory(cat.id)} style={{ ...S.tblBtn, color:"#dc2626", borderColor:"#fca5a5" }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MAIN COURSE MANAGEMENT TAB — A3.1
══════════════════════════════════════════ */
export default function CourseManagementTab({ courses, setCourses, categories, setCategories, setToast }) {
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("all");
  const [catFilter,   setCatFilter]   = useState("all");
  const [formModal,   setFormModal]   = useState(false);
  const [editCourse,  setEditCourse]  = useState(null);
  const [catModal,    setCatModal]    = useState(false);
  const [watchCourse, setWatchCourse] = useState(null);
  const [previewProgress, setPreviewProgress] = useState({});

  /* Filter */
  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchCat    = catFilter    === "all" || c.category === catFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const toggleStatus = (id) => {
    const course = courses.find(c => getCourseId(c) === id);
    if (!course) return;
    const nextStatus = course.status === "published" ? "draft" : "published";
    updateCourse(id, { ...course, status: nextStatus })
      .then((res) => {
        const updated = { ...res.course, id: res.course._id || res.course.id };
        setCourses(prev => prev.map(c => getCourseId(c) === id ? updated : c));
        setToast({ msg:"Course status updated!", type:"success" });
      })
      .catch(err => setToast({ msg: err.message, type:"error" }));
  };

  const archiveCourse = (id) => {
    const course = courses.find(c => getCourseId(c) === id);
    if (!course) return;
    updateCourse(id, { ...course, status: "archived" })
      .then((res) => {
        const updated = { ...res.course, id: res.course._id || res.course.id };
        setCourses(prev => prev.map(c => getCourseId(c) === id ? updated : c));
        setToast({ msg:"Course archived.", type:"success" });
      })
      .catch(err => setToast({ msg: err.message, type:"error" }));
  };

  const deleteCourse = (id) => {
    deleteCourseApi(id)
      .then(() => {
        setCourses(prev => prev.filter(c => getCourseId(c) !== id));
        setToast({ msg:"Course deleted.", type:"error" });
      })
      .catch(err => setToast({ msg: err.message, type:"error" }));
  };

  const handleSave = (saved) => {
    if (editCourse) {
      const id = getCourseId(editCourse);
      updateCourse(id, saved)
        .then((res) => {
          const updated = { ...res.course, id: res.course._id || res.course.id };
          setCourses(prev => prev.map(c => getCourseId(c) === id ? updated : c));
          setToast({ msg:"Course updated!", type:"success" });
        })
        .catch(err => setToast({ msg: err.message, type:"error" }));
    } else {
      if (saved._id) {
        setCourses(prev => [{ ...saved, id: saved._id }, ...prev.filter(c => getCourseId(c) !== saved._id)]);
        setToast({ msg:"Course added!", type:"success" });
      } else {
        createCourse(saved)
          .then((res) => {
            const created = { ...res.course, id: res.course._id || res.course.id };
            setCourses(prev => [created, ...prev]);
            setToast({ msg:"Course added!", type:"success" });
          })
          .catch(err => setToast({ msg: err.message, type:"error" }));
      }
    }
    setFormModal(false);
    setEditCourse(null);
  };

  const openEdit = (course) => {
    setEditCourse(course);
    setFormModal(true);
  };

  const openAdd = () => {
    setEditCourse(null);
    setFormModal(true);
  };

  /* Stats */
  const published  = courses.filter(c => c.status === "published").length;
  const drafts     = courses.filter(c => c.status === "draft").length;
  const archived   = courses.filter(c => c.status === "archived").length;
  const comingSoon = courses.filter(c => c.status === "coming_soon").length;
  const totalRev   = courses.reduce((a,c) => a + (c.revenue||0), 0);

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>

      {/* Modals */}
      {formModal && (
        <CourseFormModal
          course={editCourse}
          onSave={handleSave}
          onClose={() => { setFormModal(false); setEditCourse(null); }}
          categories={categories}
          setToast={setToast}
        />
      )}
      {catModal && (
        <CategoryManagementModal
          categories={categories}
          setCategories={setCategories}
          setToast={setToast}
          onClose={() => setCatModal(false)}
        />
      )}
      {watchCourse && (
        <CoursePreviewModal
          course={watchCourse}
          onProgress={(pct) => {
            const courseId = getCourseId(watchCourse);
            setPreviewProgress((prev) => ({ ...prev, [courseId]: Math.max(prev[courseId] || 0, pct) }));
            setCourses((prev) => prev.map((course) => {
              if (getCourseId(course) !== courseId) return course;
              return { ...course, completion: Math.max(course.completion || 0, pct) };
            }));
          }}
          onClose={() => setWatchCourse(null)}
        />
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={S.pageTitle}>Course Management</h1>
          <p style={S.pageSub}>{published} published · {drafts} drafts · {comingSoon} coming soon · {archived} archived</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setCatModal(true)} style={S.exportBtn}>🗂️ Categories</button>
          <button onClick={openAdd} style={S.primaryBtn}>+ Add Course</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:14, marginBottom:20 }}>
        <StatCard icon="📚" label="Total Courses"  val={courses.length}  color="#f59e0b" bg="#fef3c7"/>
        <StatCard icon="✅" label="Published"       val={published}        color="#10b981" bg="#d1fae5"/>
        <StatCard icon="📝" label="Drafts"          val={drafts}           color="#6b7280" bg="#f3f4f6"/>
        <StatCard icon="🚀" label="Coming Soon"     val={comingSoon}       color="#3b82f6" bg="#dbeafe"/>
        <StatCard icon="💰" label="Total Revenue"   val={`₹${(totalRev/100000).toFixed(1)}L`} color="#8b5cf6" bg="#ede9fe"/>
      </div>

      {/* Filters */}
      <div style={{ background:"white", borderRadius:14, padding:"14px 18px", border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", marginBottom:16 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ flex:1, minWidth:200 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search by course name or category..."/>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["all","published","draft","coming_soon","archived"].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${statusFilter===f?"#f59e0b":"#e5e7eb"}`, background:statusFilter===f?"#fef3c7":"white", color:statusFilter===f?"#92400e":"#6b7280", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                {f==="all"?"All":f==="published"?"✅ Published":f==="draft"?"📝 Draft":f==="coming_soon"?"🚀 Coming Soon":"🗄️ Archived"}
              </button>
            ))}
          </div>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{ ...S.input, width:160, marginBottom:0 }}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
          {(statusFilter!=="all"||catFilter!=="all"||search) && (
            <button onClick={() => { setSearch(""); setStatusFilter("all"); setCatFilter("all"); }} style={{ ...S.tblBtn, color:"#ef4444", borderColor:"#fca5a5" }}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Result count */}
      <div style={{ fontSize:12, color:"#9ca3af", marginBottom:10 }}>
        Showing {filtered.length} of {courses.length} courses
      </div>

      {/* Table — A3.1 */}
      <div style={{ background:"white", borderRadius:16, border:"1px solid #f1f5f9", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f9fafb", borderBottom:"1px solid #f1f5f9" }}>
              {["Course","Category","Enrolled","Completion","Revenue","Rating","Status","Actions"].map(h => (
                <th key={h} style={{ padding:"12px 16px", fontSize:11, fontWeight:700, color:"#9ca3af", textAlign:"left", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={getCourseId(c)} style={{ borderBottom:"1px solid #f9fafb", background:i%2===0?"white":"#fafafa" }}>
                {/* Course */}
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1c1917", maxWidth:220 }}>{c.title}</div>
                  {c.subtitle && <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>{c.subtitle}</div>}
                  <div style={{ fontSize:11, color:"#9ca3af" }}>{c.duration}</div>
                </td>
                {/* Category */}
                <td style={{ padding:"12px 16px" }}>
                  <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:`${categories.find(cat=>cat.name===c.category)?.color||"#f59e0b"}20`,
                    color:categories.find(cat=>cat.name===c.category)?.color||"#92400e" }}>
                    {categories.find(cat=>cat.name===c.category)?.icon||"\uD83D\uDCDA"} {c.category}
                  </span>
                </td>
                {/* Enrolled */}
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:"#374151" }}>{c.enrolled || 0}</td>
                {/* Completion */}
                <td style={{ padding:"12px 16px" }}>
                  {(() => {
                    const progress = typeof c.completion === "number"
                      ? c.completion
                      : (previewProgress[getCourseId(c)] || 0);
                    return (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:52, height:5, background:"#f3f4f6", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${progress}%`, background:progress>=70?"#10b981":"#f59e0b", transition:"width 0.4s" }}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:progress>=70?"#10b981":"#f59e0b" }}>{progress}%</span>
                  </div>
                    );
                  })()}
                </td>
                {/* Revenue */}
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:"#374151" }}>
                  ₹{((c.revenue||0)/1000).toFixed(0)}k
                </td>
                {/* Rating */}
                <td style={{ padding:"12px 16px", fontSize:13, color:"#f59e0b", fontWeight:700 }}>
                  {c.rating > 0 ? `\u2B50 ${c.rating}` : "\u2014"}
                </td>
                {/* Status */}
                <td style={{ padding:"12px 16px" }}><StatusBadge status={c.status}/></td>
                {/* Actions */}
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    <button
                      onClick={() => setWatchCourse(c)}
                      style={{ ...S.tblBtn, color:"#7c3aed", borderColor:"#c4b5fd" }}
                      title="Preview course videos"
                    >
                      \uD83C\uDFAC Watch
                    </button>
                    <button onClick={() => toggleStatus(getCourseId(c))}
                      style={{ ...S.tblBtn, color:c.status==="published"?"#dc2626":"#059669", borderColor:c.status==="published"?"#fca5a5":"#86efac" }}>
                      {c.status==="published" ? "Unpublish" : "Publish"}
                    </button>
                    <button onClick={() => openEdit(c)} style={S.tblBtn}>\u270F\uFE0F Edit</button>
                    {c.status !== "archived" && (
                      <button onClick={() => archiveCourse(getCourseId(c))} style={S.tblBtn}>\uD83D\uDDC4\uFE0F</button>
                    )}
                    <button onClick={() => deleteCourse(getCourseId(c))} style={{ ...S.tblBtn, color:"#dc2626", borderColor:"#fca5a5" }}>\uD83D\uDDD1\uFE0F</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"50px 20px", color:"#9ca3af" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📚</div>
            <div style={{ fontSize:14, fontWeight:700 }}>No courses found</div>
            <div style={{ fontSize:12, marginTop:4 }}>Try adjusting filters or add a new course</div>
          </div>
        )}
      </div>

      {/* Category preview strip */}
      <div style={{ marginTop:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:12 }}>🗂️ Active Categories</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {categories.sort((a,b)=>a.order-b.order).map(cat => (
            <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:20, border:`1.5px solid ${cat.color}40`, background:`${cat.color}10` }}>
              <span style={{ fontSize:16 }}>{cat.icon}</span>
              <span style={{ fontSize:12, fontWeight:700, color:cat.color }}>{cat.name}</span>
              <span style={{ fontSize:10, color:"#9ca3af" }}>{cat.count} courses</span>
            </div>
          ))}
          <button onClick={() => setCatModal(true)}
            style={{ padding:"8px 14px", borderRadius:20, border:"1.5px dashed #e5e7eb", background:"white", color:"#9ca3af", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            + Manage
          </button>
        </div>
      </div>
    </div>
  );
}
