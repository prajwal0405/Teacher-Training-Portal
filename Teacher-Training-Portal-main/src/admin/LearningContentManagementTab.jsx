import { useState, useRef } from "react";
import { Modal, S, Toast } from "../components/Shared";
import { LC_BTN_GHOST, LC_BTN_PRIMARY, LC_CLOSE, LC_HDR, LC_MODAL, LC_OVERLAY } from "./adminStyles";
export default function LearningContentManagementTab({ contentItems, setContentItems, setToast }) {
  const [activeTab,    setActiveTab]    = useState("library");   // library | organiser | ai
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [dragId,       setDragId]       = useState(null);
  const [dragModule,   setDragModule]   = useState(null);
  const [detailItem,   setDetailItem]   = useState(null);
  const [uploads,      setUploads]      = useState([]);           // bulk upload queue
  const [aiModal,      setAiModal]      = useState(null);         // { tool, item }
  const [aiResult,     setAiResult]     = useState("");
  const [aiLoading,    setAiLoading]    = useState(false);
  const [prereqEdit,   setPrereqEdit]   = useState(null);
  const [dripEdit,     setDripEdit]     = useState(null);
  const fileInputRef = useRef(null);
 
  const FORMAT_LIMITS = {
    video:    { exts: ["MP4","MOV","AVI","MKV"],        maxMB: 2048, label: "2 GB"  },
    audio:    { exts: ["MP3","WAV","AAC"],               maxMB: 200,  label: "200 MB"},
    pdf:      { exts: ["PDF"],                           maxMB: 50,   label: "50 MB" },
    document: { exts: ["DOCX","DOC","XLSX","XLS","TXT"], maxMB: 50,   label: "50 MB" },
    slide:    { exts: ["PPTX","PPT"],                    maxMB: 50,   label: "50 MB" },
    image:    { exts: ["PNG","JPG","JPEG","GIF","WEBP"], maxMB: 10,   label: "10 MB" },
  };
 
  const TYPE_ICON  = { video:"🎥", audio:"🎵", pdf:"📄", document:"📝", slide:"📊", image:"🖼️" };
  const TYPE_COLOR = { video:"#3b82f6", audio:"#8b5cf6", pdf:"#ef4444", document:"#10b981", slide:"#f59e0b", image:"#06b6d4" };
 
  const allCourses = [...new Set(contentItems.map(i => i.course))];
  const allModules = [...new Set(contentItems.map(i => i.module))];
 
  // ── Filtered items ──
  const filtered = contentItems.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = item.title.toLowerCase().includes(q) || item.course.toLowerCase().includes(q) || item.format.toLowerCase().includes(q);
    const matchType   = typeFilter   === "all" || item.type   === typeFilter;
    const matchCourse = courseFilter === "all" || item.course === courseFilter;
    return matchSearch && matchType && matchCourse;
  });
 
  // ── Grouped by Course > Module ──
  const grouped = {};
  contentItems.forEach(item => {
    if (!grouped[item.course]) grouped[item.course] = {};
    if (!grouped[item.course][item.module]) grouped[item.course][item.module] = [];
    grouped[item.course][item.module].push(item);
  });
 
  // ── Actions ──
  const togglePublish = id => {
    setContentItems(p => p.map(i => i.id === id ? { ...i, status: i.status === "published" ? "draft" : "published" } : i));
    setToast({ msg: "Status updated!", type: "success" });
  };
 
  const deleteItem = id => {
    setContentItems(p => p.filter(i => i.id !== id));
    setToast({ msg: "Content deleted.", type: "error" });
    if (detailItem?.id === id) setDetailItem(null);
  };
 
  const moveToModule = (id, module) => {
    setContentItems(p => p.map(i => i.id === id ? { ...i, module } : i));
    setToast({ msg: `Moved to ${module}`, type: "success" });
  };
 
  const reorderWithinModule = (draggedId, targetId) => {
    if (draggedId === targetId) return;
    setContentItems(prev => {
      const arr = [...prev];
      const fi = arr.findIndex(x => x.id === draggedId);
      const ti = arr.findIndex(x => x.id === targetId);
      const [moved] = arr.splice(fi, 1);
      arr.splice(ti, 0, moved);
      return arr;
    });
  };
 
  const savePrereq = (id, prereqId) => {
    setContentItems(p => p.map(i => i.id === id ? { ...i, prerequisite: prereqId === "" ? null : Number(prereqId) } : i));
    setPrereqEdit(null);
    setToast({ msg: "Prerequisite saved!", type: "success" });
  };
 
  const saveDrip = (id, week, date) => {
    setContentItems(p => p.map(i => i.id === id ? { ...i, dripWeek: Number(week), releaseDate: date } : i));
    setDripEdit(null);
    setToast({ msg: "Content schedule saved!", type: "success" });
  };
 
  // ── Bulk upload simulation ──
  const handleFileSelect = e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newUploads = files.map(f => {
      const ext = f.name.split(".").pop().toUpperCase();
      let type = "document";
      if (["MP4","MOV","AVI","MKV"].includes(ext)) type = "video";
      else if (["MP3","WAV","AAC"].includes(ext)) type = "audio";
      else if (ext === "PDF") type = "pdf";
      else if (["PPTX","PPT"].includes(ext)) type = "slide";
      else if (["PNG","JPG","JPEG","GIF","WEBP"].includes(ext)) type = "image";
      const sizeMB = (f.size / 1048576).toFixed(1);
      const limit = FORMAT_LIMITS[type]?.maxMB || 50;
      const overLimit = f.size / 1048576 > limit;
      return { id: Date.now() + Math.random(), name: f.name, ext, type, sizeMB, overLimit, progress: 0, done: false, error: overLimit };
    });
    setUploads(p => [...p, ...newUploads]);
    // Simulate progress
    newUploads.forEach(u => {
      if (u.overLimit) return;
      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 25;
        if (prog >= 100) {
          prog = 100;
          clearInterval(interval);
          setUploads(p => p.map(x => x.id === u.id ? { ...x, progress: 100, done: true } : x));
          // Add to library
          const newItem = {
            id: Date.now() + Math.random(),
            title: u.name.replace(/\.[^.]+$/, ""),
            type: u.type,
            course: "Unassigned",
            module: "Unassigned",
            lesson: "Lesson 1",
            format: u.ext,
            size: `${u.sizeMB} MB`,
            sizeBytes: 0,
            duration: u.type === "video" ? "—" : "—",
            status: "draft",
            ai: "",
            updated: new Date().toLocaleDateString("en-IN"),
            thumbnail: "",
            transcript: "",
            prerequisite: null,
            releaseDate: "",
            dripWeek: 1,
            duplicate: false,
            uploadProgress: 100,
          };
          setContentItems(p => [...p, newItem]);
          setToast({ msg: `${u.name} uploaded!`, type: "success" });
        } else {
          setUploads(p => p.map(x => x.id === u.id ? { ...x, progress: Math.round(prog) } : x));
        }
      }, 200);
    });
    e.target.value = "";
  };
 
  // ── AI Tools ──
  const runAiTool = async (tool, item) => {
    setAiLoading(true);
    setAiResult("");
    await new Promise(r => setTimeout(r, 1800));
    let result = "";
    if (tool === "transcribe") {
      result = item?.transcript || `[Auto-generated transcript for "${item?.title}"]\n\nWelcome to this lesson. In this session we will explore key concepts related to ${item?.course}. The content covers foundational principles, practical examples, and assessment strategies for early childhood educators...\n\n[00:00] Introduction\n[02:15] Key Concepts\n[06:40] Practical Examples\n[10:00] Summary & Next Steps`;
      setContentItems(p => p.map(i => i.id === item?.id ? { ...i, ai: "Captions", transcript: result } : i));
    } else if (tool === "summarise") {
      result = `📋 AI Summary for "${item?.title}"\n\nThis content covers the following key points:\n• Introduction to core concepts in ${item?.course}\n• Practical strategies for classroom implementation\n• Assessment and feedback methods\n• Recommended resources for further learning\n\nEstimated reading time: 8 minutes\nDifficulty: Intermediate`;
    } else if (tool === "quiz") {
      result = `🧠 AI-Generated Quiz (5 MCQs)\n\n1. What is the primary goal of early childhood education?\n   a) Academic achievement  b) Holistic development ✓  c) Exam preparation  d) Discipline\n\n2. Which approach emphasises child-led learning?\n   a) Traditional  b) Montessori ✓  c) Behavioural  d) Lecture-based\n\n3. What does FLN stand for?\n   a) Foundational Literacy & Numeracy ✓  b) Formal Learning Network  c) Federal Literacy Norm  d) None\n\n4. NEP 2020 recommends starting formal education at age:\n   a) 3  b) 5  c) 6 ✓  d) 8\n\n5. A prerequisite lesson ensures:\n   a) Faster completion  b) Sequential learning ✓  c) Shorter courses  d) Higher fees`;
    } else if (tool === "duplicate") {
      const dups = contentItems.filter(i => i.title === item?.title && i.id !== item?.id);
      result = dups.length > 0
        ? `⚠️ Duplicate Detected!\n\nFound ${dups.length} item(s) with the same title:\n${dups.map(d => `• "${d.title}" in ${d.course} / ${d.module}`).join("\n")}\n\nRecommendation: Remove duplicates or rename for clarity.`
        : `✅ No Duplicates Found\n\n"${item?.title}" appears only once in the media library.`;
    }
    setAiResult(result);
    setAiLoading(false);
  };
 
  // ── Stats ──
  const totalSize = contentItems.reduce((a, i) => a + (i.sizeBytes || 0), 0);
  const fmtSize = b => b > 1073741824 ? `${(b/1073741824).toFixed(1)} GB` : b > 1048576 ? `${(b/1048576).toFixed(0)} MB` : `${(b/1024).toFixed(0)} KB`;
 
  // ─────────────────────────────────────────────
  //  DETAIL PANEL
  // ─────────────────────────────────────────────
  if (detailItem) {
    const item = contentItems.find(i => i.id === detailItem.id) || detailItem;
    const prereqItem = contentItems.find(i => i.id === item.prerequisite);
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {/* AI Modal */}
        {aiModal && (
          <div style={LC_OVERLAY}>
            <div style={LC_MODAL}>
              <div style={LC_HDR}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{aiModal.label}</span>
                <button onClick={() => { setAiModal(null); setAiResult(""); }} style={LC_CLOSE}>✕</button>
              </div>
              <div style={{ padding: "20px 24px 24px" }}>
                {aiLoading ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</div>
                    <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>AI is processing "{item.title}"...</div>
                    <div style={{ marginTop: 16, height: 6, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "70%", background: "#f59e0b", borderRadius: 6, animation: "shimmer 1.5s infinite" }} />
                    </div>
                  </div>
                ) : aiResult ? (
                  <div>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#374151", background: "#f9fafb", borderRadius: 10, padding: 14, border: "1px solid #f3f4f6", maxHeight: 320, overflowY: "auto", fontFamily: "inherit", lineHeight: 1.7 }}>{aiResult}</pre>
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <button onClick={() => { navigator.clipboard?.writeText(aiResult); setToast({ msg: "Copied!", type: "success" }); }} style={{ ...LC_BTN_GHOST, flex: 1 }}>📋 Copy</button>
                      <button onClick={() => { setAiModal(null); setAiResult(""); }} style={{ ...LC_BTN_PRIMARY, flex: 1 }}>Done</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>{aiModal.icon}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>{aiModal.desc}</div>
                    <button onClick={() => runAiTool(aiModal.tool, item)} style={{ ...LC_BTN_PRIMARY, width: "100%" }}>▶ Run {aiModal.label}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
 
        <button onClick={() => setDetailItem(null)} style={S.backBtn}>← Back to Library</button>
 
        <div style={{ background: "white", borderRadius: 20, padding: 28, border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${TYPE_COLOR[item.type]}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
              {TYPE_ICON[item.type]}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>{item.title}</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${TYPE_COLOR[item.type]}20`, color: TYPE_COLOR[item.type] }}>{item.format}</span>
                <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: item.status === "published" ? "#d1fae5" : "#f3f4f6", color: item.status === "published" ? "#059669" : "#6b7280" }}>{item.status}</span>
                {item.duplicate && <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#dc2626" }}>⚠️ Duplicate</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => togglePublish(item.id)} style={{ ...LC_BTN_GHOST }}>
                {item.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button onClick={() => { deleteItem(item.id); }} style={{ ...LC_BTN_GHOST, color: "#dc2626", borderColor: "#fca5a5" }}>🗑 Delete</button>
            </div>
          </div>
 
          {/* Details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Course",     val: item.course   },
              { label: "Module",     val: item.module   },
              { label: "Lesson",     val: item.lesson   },
              { label: "Format",     val: item.format   },
              { label: "File Size",  val: item.size     },
              { label: "Duration",   val: item.duration },
              { label: "Updated",    val: item.updated  },
              { label: "Drip Week",  val: `Week ${item.dripWeek}` },
              { label: "Release",    val: item.releaseDate || "Immediate" },
            ].map((r, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 13px", border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.val}</div>
              </div>
            ))}
          </div>
 
          {/* Prerequisite */}
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, border: "1px solid #f3f4f6", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>🔒 Prerequisite Lesson</div>
              <button onClick={() => setPrereqEdit(item.id)} style={LC_BTN_GHOST}>Edit</button>
            </div>
            {prereqItem
              ? <div style={{ fontSize: 12, color: "#374151" }}>Must complete: <b>{prereqItem.title}</b> ({prereqItem.module})</div>
              : <div style={{ fontSize: 12, color: "#9ca3af" }}>No prerequisite — accessible immediately</div>}
            {prereqEdit === item.id && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <select id="prereq-sel" defaultValue={item.prerequisite || ""} style={{ ...S.input, marginBottom: 0, flex: 1 }}>
                  <option value="">No prerequisite</option>
                  {contentItems.filter(i => i.id !== item.id).map(i => (
                    <option key={i.id} value={i.id}>{i.title} ({i.module})</option>
                  ))}
                </select>
                <button onClick={() => savePrereq(item.id, document.getElementById("prereq-sel").value)} style={LC_BTN_PRIMARY}>Save</button>
                <button onClick={() => setPrereqEdit(null)} style={LC_BTN_GHOST}>✕</button>
              </div>
            )}
          </div>
 
          {/* Drip schedule */}
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, border: "1px solid #f3f4f6", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>📅 Content Drip Schedule</div>
              <button onClick={() => setDripEdit(item.id)} style={LC_BTN_GHOST}>Edit</button>
            </div>
            <div style={{ fontSize: 12, color: "#374151" }}>
              Release: <b>Week {item.dripWeek}</b>{item.releaseDate ? ` · Date: ${item.releaseDate}` : ""}
            </div>
            {dripEdit === item.id && (
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8, alignItems: "end" }}>
                <div>
                  <label style={S.label}>Batch Week</label>
                  <input id="drip-week" type="number" min="1" max="52" defaultValue={item.dripWeek} style={{ ...S.input, marginBottom: 0 }} />
                </div>
                <div>
                  <label style={S.label}>Release Date</label>
                  <input id="drip-date" type="date" defaultValue={item.releaseDate} style={{ ...S.input, marginBottom: 0 }} />
                </div>
                <button onClick={() => saveDrip(item.id, document.getElementById("drip-week").value, document.getElementById("drip-date").value)} style={{ ...LC_BTN_PRIMARY, height: 38 }}>Save</button>
                <button onClick={() => setDripEdit(null)} style={{ ...LC_BTN_GHOST, height: 38 }}>✕</button>
              </div>
            )}
          </div>
 
          {/* AI Tools for this item */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>🤖 AI Tools</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
            {[
              { tool: "transcribe", label: "AI Transcription", icon: "📝", desc: "Auto-generate subtitles and captions from this video", show: item.type === "video" || item.type === "audio" },
              { tool: "summarise",  label: "AI Summariser",    icon: "🧠", desc: "Generate a lesson summary and reading preview",         show: true },
              { tool: "quiz",       label: "AI Quiz Generator",icon: "❓", desc: "Create MCQs from this content automatically",           show: true },
              { tool: "duplicate",  label: "Duplicate Detector",icon:"🔍", desc: "Check if this content exists elsewhere in the library", show: true },
            ].filter(t => t.show).map((tool, i) => (
              <button key={i} onClick={() => { setAiModal(tool); setAiResult(""); setAiLoading(false); }}
                style={{ padding: 14, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .2s" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{tool.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 3 }}>{tool.label}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}>{tool.desc}</div>
              </button>
            ))}
          </div>
 
          {/* Transcript preview */}
          {item.transcript && (
            <div style={{ marginTop: 16, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>📝 Transcript Preview</div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, maxHeight: 100, overflowY: "auto" }}>{item.transcript}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
 
  // ─────────────────────────────────────────────
  //  MAIN VIEW
  // ─────────────────────────────────────────────
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{width:10%} 50%{width:80%} 100%{width:10%} }
      `}</style>
 
      {/* AI Tool Modal (from main view) */}
      {aiModal && (
        <div style={LC_OVERLAY}>
          <div style={LC_MODAL}>
            <div style={LC_HDR}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{aiModal.label}</span>
              <button onClick={() => { setAiModal(null); setAiResult(""); }} style={LC_CLOSE}>✕</button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              {aiLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
                  <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Processing...</div>
                  <div style={{ marginTop: 16, height: 6, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "60%", background: "#f59e0b", borderRadius: 6 }} />
                  </div>
                </div>
              ) : aiResult ? (
                <div>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#374151", background: "#f9fafb", borderRadius: 10, padding: 14, border: "1px solid #f3f4f6", maxHeight: 320, overflowY: "auto", fontFamily: "inherit", lineHeight: 1.7 }}>{aiResult}</pre>
                  <button onClick={() => { setAiModal(null); setAiResult(""); }} style={{ ...LC_BTN_PRIMARY, width: "100%", marginTop: 14 }}>Done</button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>{aiModal.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{aiModal.label}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>{aiModal.desc}</div>
                  {aiModal.tool === "duplicate" ? (
                    <div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Select a content item to check:</div>
                      <select id="ai-item-sel" style={{ ...S.input, marginBottom: 16 }}>
                        {contentItems.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
                      </select>
                      <button onClick={async () => {
                        const selId = Number(document.getElementById("ai-item-sel").value);
                        const selItem = contentItems.find(i => i.id === selId);
                        setAiLoading(true); setAiResult("");
                        await new Promise(r => setTimeout(r, 1500));
                        const dups = contentItems.filter(i => i.title === selItem?.title && i.id !== selItem?.id);
                        setAiResult(dups.length > 0
                          ? `⚠️ Duplicate Detected!\n\nFound ${dups.length} item(s) matching "${selItem?.title}":\n${dups.map(d => `• ${d.title} in ${d.course} / ${d.module}`).join("\n")}`
                          : `✅ No Duplicates Found for "${selItem?.title}"`);
                        setAiLoading(false);
                      }} style={{ ...LC_BTN_PRIMARY, width: "100%" }}>▶ Scan for Duplicates</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Select content to process:</div>
                      <select id="ai-item-sel" style={{ ...S.input, marginBottom: 16 }}>
                        {contentItems.filter(i => aiModal.tool !== "transcribe" || i.type === "video" || i.type === "audio").map(i => (
                          <option key={i.id} value={i.id}>{i.title} ({i.format})</option>
                        ))}
                      </select>
                      <button onClick={async () => {
                        const selId = Number(document.getElementById("ai-item-sel").value);
                        const selItem = contentItems.find(i => i.id === selId);
                        await runAiTool(aiModal.tool, selItem);
                      }} style={{ ...LC_BTN_PRIMARY, width: "100%" }}>▶ Run {aiModal.label}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
 
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Learning Content Management</h1>
          <p style={S.pageSub}>Media library · Module organiser · AI content tools</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...S.exportBtn }}>⬆ Bulk Upload</button>
          <input ref={fileInputRef} type="file" multiple accept=".mp4,.mp3,.pdf,.pptx,.docx,.png,.jpg,.jpeg,.mov,.avi" style={{ display: "none" }} onChange={handleFileSelect} />
        </div>
      </div>
 
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { icon: "🗃️", label: "Total Items",  val: contentItems.length,                                            color: "#f59e0b", bg: "#fef3c7" },
          { icon: "🎥", label: "Videos",        val: contentItems.filter(i => i.type === "video").length,           color: "#3b82f6", bg: "#dbeafe" },
          { icon: "✅", label: "Published",     val: contentItems.filter(i => i.status === "published").length,     color: "#10b981", bg: "#d1fae5" },
          { icon: "⚠️", label: "Duplicates",    val: contentItems.filter(i => i.duplicate).length,                 color: "#ef4444", bg: "#fee2e2" },
          { icon: "💾", label: "Total Size",    val: fmtSize(totalSize),                                            color: "#8b5cf6", bg: "#ede9fe" },
          { icon: "🤖", label: "AI Processed",  val: contentItems.filter(i => i.ai).length,                        color: "#06b6d4", bg: "#cffafe" },
        ].map((k, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: `1px solid ${k.color}30`, borderLeft: `3px solid ${k.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{k.val}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".3px" }}>{k.label}</div>
          </div>
        ))}
      </div>
 
      {/* Bulk Upload Queue */}
      {uploads.length > 0 && (
        <div style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #f1f5f9", marginBottom: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>⬆ Upload Queue ({uploads.length} files)</div>
            <button onClick={() => setUploads([])} style={LC_BTN_GHOST}>Clear All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {uploads.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: u.overLimit ? "1px solid #fca5a5" : "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 18 }}>{TYPE_ICON[u.type] || "📄"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{u.sizeMB} MB · {u.ext}</div>
                  {u.overLimit
                    ? <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>✕ Exceeds file size limit ({FORMAT_LIMITS[u.type]?.label})</div>
                    : u.done
                      ? <div style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>✓ Upload complete</div>
                      : (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${u.progress}%`, background: "#f59e0b", borderRadius: 4, transition: "width .2s" }} />
                          </div>
                          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{u.progress}%</div>
                        </div>
                      )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* Format Limits info */}
      <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 12, padding: "10px 16px", marginBottom: 18, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "#92400e", fontWeight: 600 }}>
        <span>📋 File Limits:</span>
        <span>🎥 Video: 2 GB</span>
        <span>🎵 Audio: 200 MB</span>
        <span>📄 PDF/Docs: 50 MB</span>
        <span>🖼️ Images: 10 MB</span>
        <span>Supported: MP4, MP3, PDF, PPTX, DOCX, PNG, JPG</span>
      </div>
 
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "2px solid #f3f4f6", paddingBottom: 0 }}>
        {[
          { key: "library",   label: "🗂️ Media Library"   },
          { key: "organiser", label: "🧩 Module Organiser" },
          { key: "ai",        label: "🤖 AI Tools"         },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: "10px 18px", border: "none", borderBottom: `2px solid ${activeTab === t.key ? "#f59e0b" : "transparent"}`, background: "none", color: activeTab === t.key ? "#92400e" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ── LIBRARY TAB ── */}
      {activeTab === "library" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search title, course, format..."
                style={{ ...S.input, paddingLeft: 34, marginBottom: 0 }}
              />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...S.input, marginBottom: 0, width: 140 }}>
              <option value="all">All Types</option>
              {Object.keys(TYPE_ICON).map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} style={{ ...S.input, marginBottom: 0, width: 220 }}>
              <option value="all">All Courses</option>
              {allCourses.map(c => <option key={c} value={c}>{c.substring(0, 30)}</option>)}
            </select>
            {(search || typeFilter !== "all" || courseFilter !== "all") && (
              <button onClick={() => { setSearch(""); setTypeFilter("all"); setCourseFilter("all"); }} style={{ ...LC_BTN_GHOST, color: "#ef4444", borderColor: "#fca5a5" }}>✕ Clear</button>
            )}
          </div>
 
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>Showing {filtered.length} of {contentItems.length} items</div>
 
          {/* Library table */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f1f5f9" }}>
                  {["Content", "Course › Module", "Format", "Size", "Drip", "AI", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textAlign: "left", textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f9fafb", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${TYPE_COLOR[item.type]}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{TYPE_ICON[item.type]}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                          {item.duplicate && <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>⚠️ Duplicate</div>}
                          {item.prerequisite && <div style={{ fontSize: 10, color: "#7c3aed" }}>🔒 Has prerequisite</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6b7280", maxWidth: 180 }}>
                      <div style={{ fontWeight: 600, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.course.substring(0, 25)}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.module} › {item.lesson}</div>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${TYPE_COLOR[item.type]}20`, color: TYPE_COLOR[item.type] }}>{item.format}</span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#374151", fontWeight: 600 }}>{item.size}</td>
                    <td style={{ padding: "11px 14px", fontSize: 11, color: "#6b7280" }}>Wk {item.dripWeek}{item.releaseDate ? `\n${item.releaseDate}` : ""}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {item.ai ? <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#ede9fe", color: "#6d28d9" }}>{item.ai}</span> : <span style={{ color: "#d1d5db", fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: item.status === "published" ? "#d1fae5" : "#f3f4f6", color: item.status === "published" ? "#059669" : "#6b7280" }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button onClick={() => setDetailItem(item)} style={{ ...LC_BTN_GHOST, fontSize: 11, padding: "4px 9px" }}>View</button>
                        <button onClick={() => togglePublish(item.id)} style={{ ...LC_BTN_GHOST, fontSize: 11, padding: "4px 9px", color: item.status === "published" ? "#dc2626" : "#059669" }}>
                          {item.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => deleteItem(item.id)} style={{ ...LC_BTN_GHOST, fontSize: 11, padding: "4px 9px", color: "#dc2626", borderColor: "#fca5a5" }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🗂️</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>No content found</div>
              </div>
            )}
          </div>
        </div>
      )}
 
      {/* ── ORGANISER TAB ── */}
      {activeTab === "organiser" && (
        <div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Drag lessons within a module to reorder. Click a lesson to set prerequisites or drip schedule.
          </div>
          {Object.entries(grouped).map(([course, modules]) => (
            <div key={course} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 12, padding: "8px 14px", background: "#fef3c7", borderRadius: 10, border: "1px solid #fbbf24" }}>
                📚 {course}
              </div>
              {Object.entries(modules).map(([module, items]) => (
                <div key={module} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8, paddingLeft: 8 }}>
                    📁 {module} <span style={{ fontSize: 10, color: "#9ca3af" }}>({items.length} items)</span>
                  </div>
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (dragId) moveToModule(dragId, module);
                      setDragId(null); setDragModule(null);
                    }}
                    style={{ minHeight: 60, background: dragModule === module ? "#fef3c7" : "#f9fafb", borderRadius: 12, border: `2px dashed ${dragModule === module ? "#f59e0b" : "#e5e7eb"}`, padding: 10, transition: "all .2s" }}
                  >
                    {items.map((item, idx) => {
                      const prereqItem = contentItems.find(i => i.id === item.prerequisite);
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => { setDragId(item.id); setDragModule(module); }}
                          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={e => { e.stopPropagation(); reorderWithinModule(dragId, item.id); setDragId(null); setDragModule(null); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "white", borderRadius: 10, marginBottom: 6, border: "1px solid #f1f5f9", cursor: "grab", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                        >
                          <span style={{ color: "#d1d5db", fontSize: 16, flexShrink: 0 }}>⠿</span>
                          <span style={{ fontSize: 16 }}>{TYPE_ICON[item.type]}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.title}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                              {item.lesson} · {item.format} · {item.size}
                              {prereqItem && <span style={{ color: "#7c3aed", marginLeft: 6 }}>🔒 After: {prereqItem.title}</span>}
                              {item.releaseDate && <span style={{ color: "#2563eb", marginLeft: 6 }}>📅 {item.releaseDate}</span>}
                              {item.dripWeek && <span style={{ color: "#059669", marginLeft: 6 }}>Wk {item.dripWeek}</span>}
                            </div>
                          </div>
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: item.status === "published" ? "#d1fae5" : "#f3f4f6", color: item.status === "published" ? "#059669" : "#6b7280" }}>{item.status}</span>
                          <button onClick={() => setDetailItem(item)} style={{ ...LC_BTN_GHOST, fontSize: 11, padding: "4px 9px" }}>Edit</button>
                        </div>
                      );
                    })}
                    {items.length === 0 && <div style={{ textAlign: "center", padding: 16, fontSize: 12, color: "#9ca3af" }}>Drop content here</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
 
      {/* ── AI TOOLS TAB ── */}
      {activeTab === "ai" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { tool: "transcribe", label: "AI Video Transcription", icon: "📝", desc: "Auto-generate subtitles and closed captions from uploaded video or audio files.", color: "#3b82f6", bg: "#dbeafe" },
              { tool: "summarise",  label: "AI Content Summariser",  icon: "🧠", desc: "Generate lesson summaries and reading previews from PDFs, videos, and documents.", color: "#8b5cf6", bg: "#ede9fe" },
              { tool: "quiz",       label: "AI Quiz Generator",      icon: "❓", desc: "Automatically create MCQ quizzes from uploaded PDF content or video transcripts.", color: "#f59e0b", bg: "#fef3c7" },
              { tool: "duplicate",  label: "Duplicate Detector",     icon: "🔍", desc: "Scan the media library to flag re-uploaded or duplicate content files.", color: "#ef4444", bg: "#fee2e2" },
            ].map((tool, i) => (
              <div key={i} style={{ background: "white", border: `1px solid ${tool.color}30`, borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: tool.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 12 }}>{tool.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{tool.label}</div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, marginBottom: 16 }}>{tool.desc}</div>
                <button onClick={() => { setAiModal(tool); setAiResult(""); setAiLoading(false); }}
                  style={{ ...LC_BTN_PRIMARY, width: "100%", background: tool.color }}>
                  ▶ Run Tool
                </button>
              </div>
            ))}
          </div>
 
          {/* Duplicates list */}
          <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>⚠️ Flagged Duplicates</div>
            {contentItems.filter(i => i.duplicate).length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                <div style={{ fontSize: 12 }}>No duplicates found in library</div>
              </div>
            ) : (
              contentItems.filter(i => i.duplicate).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fca5a5", marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICON[item.type]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#dc2626" }}>{item.course} · {item.module}</div>
                  </div>
                  <button onClick={() => deleteItem(item.id)} style={{ ...LC_BTN_GHOST, color: "#dc2626", borderColor: "#fca5a5", fontSize: 11 }}>🗑 Remove</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
