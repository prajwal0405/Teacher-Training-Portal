/* ══════════════════════════════════════════
   AI COURSE GENERATOR — Drop-in section for CourseFormModal
   Add "ai" to the sections array and render this inside the modal body.

   USAGE inside CourseFormModal:
   1. Add to sections array:
      { key:"ai", label:"🤖 AI Generator" }

   2. Import/inline this component and render when activeSection === "ai":
      {activeSection === "ai" && (
        <AICourseGenerator onApply={handleAIApply} categories={categories} />
      )}

   3. Add handleAIApply function in CourseFormModal:
      const handleAIApply = (generated) => {
        if (generated.title)       setTitle(generated.title);
        if (generated.subtitle)    setSubtitle(generated.subtitle);
        if (generated.description) setDescription(generated.description);
        if (generated.tags)        setTags(generated.tags);
        if (generated.duration)    setDuration(generated.duration);
        if (generated.metaTitle)   setMetaTitle(generated.metaTitle);
        if (generated.metaDesc)    setMetaDesc(generated.metaDesc);
        if (generated.keywords)    setKeywords(generated.keywords);
        if (generated.modules)     setModules(generated.modules);
        setActiveSection("basic");
      };
══════════════════════════════════════════ */

import { useState } from "react";
import { t } from "../services/i18n";

const TONES = ["Professional", "Friendly", "Academic", "Motivational"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];
const DURATIONS = ["2 Weeks", "4 Weeks", "6 Weeks", "8 Weeks", "3 Months", "6 Months"];

// Helper: get API base from environment or default
const getApiBase = () => {
  return import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000";
};

export default function AICourseGenerator({ onApply, categories = [] }) {
  const [topic,      setTopic]      = useState("");
  const [tone,       setTone]       = useState("Professional");
  const [level,      setLevel]      = useState("Beginner");
  const [duration,   setDuration]   = useState("6 Weeks");
  const [category,   setCategory]   = useState(categories[0]?.name || "Foundation");
  const [numModules, setNumModules] = useState(4);

  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState("");
  const [applied,    setApplied]    = useState(false);

  const generate = async () => {
    if (!topic.trim()) { setError("Please describe your course topic first."); return; }
    setError("");
    setLoading(true);
    setResult(null);
    setApplied(false);

    try {
      const token = localStorage.getItem("spaceece_auth_token");
      const response = await fetch(`${getApiBase()}/api/courses/generate-from-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ topic, category, level, duration, tone, numModules }),
      });

      if (!response.ok) {
        let detail = `API error: ${response.status}`;
        try {
          const body = await response.json();
          detail = body?.message || detail;
        } catch { /* ignore */ }
        throw new Error(detail);
      }

      const parsed = await response.json();
      if (!parsed.course?.title) throw new Error("AI response was missing a course title. Try again.");

      if (Array.isArray(parsed.course?.modules)) {
        const stamp = Date.now();
        parsed.course.modules = parsed.course.modules.map((m, mi) => {
          const rawLessons = Array.isArray(m.lessons) ? m.lessons : Array.isArray(m.contents) ? m.contents : [];
          const lessons = rawLessons.map((l, li) => {
            const videoUrl = l.videoUrl || l.externalUrl || l.url || "";
            const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:.*[?&]v=|embed\/)|youtu\.be\/)([^"&?\/\s]{11})/); // eslint-disable-line no-useless-escape
            return {
              id: stamp + (mi * 100) + li,
              title: l.title || `Lesson ${li + 1}`,
              description: l.description || l.notes || "",
              type: ytMatch ? "video" : (l.type || "document"),
              videoUrl,
              ytId: ytMatch ? ytMatch[1] : "",
              duration: l.durationMinutes ? `${l.durationMinutes} min` : (l.duration || "10 min"),
              notes: l.notes || l.description || "",
            };
          });
          return {
            ...m,
            id: stamp + mi,
            lessons,
            quiz: !!m.quiz,
            assignment: !!m.assignment,
          };
        });
      } else {
        parsed.course.modules = [];
      }

      setResult(parsed.course);
    } catch (err) {
      setError(err.message || "AI course generation is currently unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result);
    setApplied(true);
  };

  const S = {
    label: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 },
    input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 13, color: "#1c1917", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 0 },
    pill: (active) => ({
      padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${active ? "#f59e0b" : "#e5e7eb"}`,
      background: active ? "#fef3c7" : "white", color: active ? "#92400e" : "#6b7280",
      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    }),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Intro banner */}
      <div style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 60%,#b45309 100%)", borderRadius: 14, padding: "18px 20px", color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fffbeb", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>{t("AI Course Generator")}</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{t("Describe your course → AI builds it")}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{t("Auto-fills title, description, curriculum modules, lessons & SEO fields")}</div>
        </div>
      </div>

      {/* Topic */}
      <div>
        <label style={S.label}>What is this course about? *</label>
        <textarea
          style={{ ...S.input, height: 80, resize: "none", lineHeight: 1.6 }}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. Early childhood classroom management techniques for anganwadi teachers, covering behaviour guidance, activity planning and parent communication..."
        />
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Be specific — more detail = better output</div>
      </div>

      {/* Options grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={S.label}>Category</label>
          <select style={S.input} value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Duration</label>
          <select style={S.input} value={duration} onChange={e => setDuration(e.target.value)}>
            {DURATIONS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Tone */}
      <div>
        <label style={S.label}>Tone</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TONES.map(t => (
            <button key={t} onClick={() => setTone(t)} style={S.pill(tone === t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Level */}
      <div>
        <label style={S.label}>Learner Level</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LEVELS.map(l => (
            <button key={l} onClick={() => setLevel(l)} style={S.pill(level === l)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Number of modules */}
      <div>
        <label style={S.label}>Number of Modules</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[2, 3, 4, 5, 6, 8].map(n => (
            <button key={n} onClick={() => setNumModules(n)} style={{ ...S.pill(numModules === n), flex: 1 }}>{n}</button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading}
        style={{
          width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "#d1d5db" : "linear-gradient(135deg,#f59e0b,#d97706)",
          color: loading ? "#9ca3af" : "white", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
        {loading ? (
          <>
            <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Generating course...
          </>
        ) : "✨ Generate Course with AI"}
      </button>

      {/* Result preview */}
      {result && (
        <div style={{ background: "#f9fafb", border: "1.5px solid #fbbf24", borderRadius: 16, overflow: "hidden" }}>

          {/* Result header */}
          <div style={{ background: "#fef3c7", padding: "14px 18px", borderBottom: "1px solid #fde68a" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>✅ Course Generated — Preview</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#1c1917" }}>{result.title}</div>
            {result.subtitle && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{result.subtitle}</div>}
          </div>

          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Description */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, background: "white", padding: "10px 12px", borderRadius: 10, border: "1px solid #f3f4f6", maxHeight: 120, overflowY: "auto" }}>
                {result.description}
              </div>
            </div>

            {/* Meta row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "white", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Tags</div>
                <div style={{ fontSize: 11, color: "#374151" }}>{result.tags}</div>
              </div>
              <div style={{ background: "white", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Duration</div>
                <div style={{ fontSize: 11, color: "#374151" }}>{result.duration}</div>
              </div>
            </div>

            {/* Modules preview */}
            {result.modules?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                  Curriculum — {result.modules.length} Modules · {result.modules.reduce((a, m) => a + (m.lessons?.length || 0), 0)} Lessons
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                  {result.modules.map((mod, mi) => (
                    <div key={mod.id} style={{ background: "white", borderRadius: 10, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                      <div style={{ padding: "9px 12px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#1c1917" }}>
                          <span style={{ color: "#f59e0b", marginRight: 6 }}>M{mi + 1}</span>{mod.title}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          {mod.quiz && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "#fef3c7", color: "#92400e" }}>Quiz</span>}
                          {mod.assignment && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "#dbeafe", color: "#1d4ed8" }}>Assignment</span>}
                        </div>
                      </div>
                      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {mod.lessons?.map((l, li) => (
                          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#6b7280" }}>
                            <span style={{ color: "#d1d5db", minWidth: 16 }}>L{li + 1}</span>
                            <span style={{ flex: 1, color: "#374151" }}>{l.title}</span>
                            <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: l.type === "video" ? "#dbeafe" : l.type === "live" ? "#d1fae5" : "#f3f4f6", color: l.type === "video" ? "#1d4ed8" : l.type === "live" ? "#065f46" : "#6b7280" }}>
                              {l.type}
                            </span>
                            <span style={{ color: "#d1d5db", fontSize: 10 }}>{l.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEO preview */}
            {result.metaTitle && (
              <div style={{ background: "white", borderRadius: 10, padding: "12px 14px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>SEO Preview</div>
                <div style={{ fontSize: 13, color: "#1a0dab", fontWeight: 600 }}>{result.metaTitle}</div>
                <div style={{ fontSize: 11, color: "#006621" }}>https://spaceece.in/courses/{result.title?.toLowerCase().replace(/\s+/g, "-")}</div>
                <div style={{ fontSize: 12, color: "#545454", marginTop: 2 }}>{result.metaDesc}</div>
              </div>
            )}

            {/* Apply button */}
            <button
              onClick={handleApply}
              disabled={applied}
              style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                cursor: applied ? "default" : "pointer",
                background: applied ? "#d1fae5" : "linear-gradient(135deg,#10b981,#059669)",
                color: applied ? "#065f46" : "white",
                fontSize: 14, fontWeight: 800, fontFamily: "inherit",
              }}>
              {applied ? "✅ Applied to course form — switch to Basic Info to review" : "⬆️ Apply to Course Form"}
            </button>
            {!applied && (
              <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: -10 }}>
                This fills in Title, Description, Tags, Curriculum, and SEO fields. You can edit everything after.
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
