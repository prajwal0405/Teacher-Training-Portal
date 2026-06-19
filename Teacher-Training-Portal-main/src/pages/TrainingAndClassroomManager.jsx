import { useState, useEffect, useRef } from "react";
import { SectionCard, S, Badge, StatusBadge } from "../components/Shared";

export default function TrainingAndClassroomManager({ user }) {
  const [activeSubTab, setActiveSubTab] = useState("courses");
  const [completedLessons, setCompletedLessons] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityType, setNewActivityType] = useState("Image");
  const [reports, setReports] = useState([]);
  const [reportTopic, setReportTopic] = useState("");
  const [reportText, setReportText] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // New state for handling real device file selections
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const storageKeyPrefix = `spaceece_teacher_${user.email || 'default'}`;

  // Load saved configurations from LocalStorage
  useEffect(() => {
    const savedLessons = localStorage.getItem(`${storageKeyPrefix}_lessons`);
    const savedActs = localStorage.getItem(`${storageKeyPrefix}_activities`);
    const savedReps = localStorage.getItem(`${storageKeyPrefix}_reports`);

    if (savedLessons) setCompletedLessons(JSON.parse(savedLessons));
    if (savedActs) {
      setActivities(JSON.parse(savedActs));
    } else {
      setActivities([{ id: 1, title: "Classroom Alphabet Sand Play", date: "08/06/2026", type: "Image", fileName: "sand_play_alpha.png", status: "Approved" }]);
    }
    if (savedReps) {
      setReports(JSON.parse(savedReps));
    } else {
      setReports([{ id: 1, date: "05/06/2026", topic: "Sensory Learning Integration", text: "Children adapted beautifully to sensory bins. High engagement noted with basic phonics." }]);
    }
  }, [storageKeyPrefix]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Mock static course outlines assigned to the logged-in teacher
  const coursesData = [
    { id: 1, title: "Pre-Primary Teacher Training Essentials", description: "Advanced methods for ECCE early childhood care and foundation milestones.", hours: "24 Hrs" },
    { id: 2, title: "Child Psychology & Mental Growth Frameworks", description: "Tracking physical, socio-emotional, and cognitive milestones safely.", hours: "16 Hrs" }
  ];

  const lessonsData = [
    { id: 101, courseId: 1, title: "Module 1: Cognitive Development Principles", duration: "45 mins" },
    { id: 102, courseId: 1, title: "Module 2: Creative Playroom Setup & Operations", duration: "1 hr 15 mins" },
    { id: 201, courseId: 2, title: "Module 1: Emotional Attachment & Toddler Care", duration: "50 mins" }
  ];

  const toggleLessonComplete = (id) => {
    let updated;
    if (completedLessons.includes(id)) {
      updated = completedLessons.filter(l => l !== id);
      triggerToast("Lesson plan marked as incomplete.");
    } else {
      updated = [...completedLessons, id];
      triggerToast("Lesson plan marked complete! Training progress updated.");
    }
    setCompletedLessons(updated);
    localStorage.setItem(`${storageKeyPrefix}_lessons`, JSON.stringify(updated));
  };

  // Handle native device input file change
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB"
      });
    }
  };

  // Trigger file attachment browsing
  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    if (!newActivityTitle.trim()) return;
    
    const updatedActs = [
      {
        id: Date.now(),
        title: newActivityTitle.trim(),
        date: new Date().toLocaleDateString("en-IN"),
        type: newActivityType,
        fileName: selectedFile ? selectedFile.name : "No file attached",
        status: "Approved"
      },
      ...activities
    ];
    setActivities(updatedActs);
    localStorage.setItem(`${storageKeyPrefix}_activities`, JSON.stringify(updatedActs));
    
    // Reset inputs & files
    setNewActivityTitle("");
    setSelectedFile(null);
    triggerToast("Classroom activity media asset uploaded successfully!");
  };

  const handleAddReport = (e) => {
    e.preventDefault();
    if (!reportTopic.trim() || !reportText.trim()) return;
    const updatedReps = [
      {
        id: Date.now(),
        date: new Date().toLocaleDateString("en-IN"),
        topic: reportTopic.trim(),
        text: reportText.trim()
      },
      ...reports
    ];
    setReports(updatedReps);
    localStorage.setItem(`${storageKeyPrefix}_reports`, JSON.stringify(updatedReps));
    setReportTopic("");
    setReportText("");
    triggerToast("Teaching notes and report saved successfully!");
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={S.pageTitle}>Training & Classroom Portal</h1>
        <p style={S.pageSub}>Access assigned courses, monitor training pathways, upload activities, and submit teaching notes.</p>
      </div>

      {toastMsg && (
        <div style={{ padding: "12px", marginBottom: "16px", background: "#d1fae5", color: "#065f46", borderRadius: "10px", fontSize: "13px", fontWeight: "600" }}>
          ✓ {toastMsg}
        </div>
      )}

      {/* Internal Navigation Menu Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
        {[
          { key: "courses", label: "📚 Courses & Lesson Plans", icon: "🎓" },
          { key: "activities", label: "🎨 Upload Activities", icon: "🧩" },
          { key: "reports", label: "📝 Notes & Teaching Reports", icon: "📋" }
        ].map(sub => (
          <button
            key={sub.key}
            onClick={() => setActiveSubTab(sub.key)}
            style={{
              padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700",
              background: activeSubTab === sub.key ? "#fffbeb" : "transparent",
              color: activeSubTab === sub.key ? "#d97706" : "#64748b",
              borderBottom: activeSubTab === sub.key ? "3px solid #d97706" : "none",
              transition: "all 0.2s"
            }}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: Courses Progress Tracking */}
      {activeSubTab === "courses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SectionCard title="📈 Track My Training Progress">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {coursesData.map(c => {
                const related = lessonsData.filter(l => l.courseId === c.id);
                const completeCount = related.filter(l => completedLessons.includes(l.id)).length;
                const pct = related.length ? Math.round((completeCount / related.length) * 100) : 0;

                return (
                  <div key={c.id} style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#1c1917", margin: 0 }}>{c.title}</h4>
                      <Badge children={c.hours} color="#1e40af" bg="#dbeafe" />
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: 4, marginBottom: 12 }}>{c.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", marginBottom: 4 }}>
                      <span style={{ color: "#d97706" }}>Course Progress</span>
                      <span>{pct}% Complete</span>
                    </div>
                    <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #f59e0b, #d97706)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="📖 View & Complete Lesson Plans">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {lessonsData.map(l => {
                const parentCourse = coursesData.find(c => c.id === l.courseId);
                const isDone = completedLessons.includes(l.id);
                return (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "white", border: "1px solid #f1f5f9", borderRadius: "10px" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#94a3b8" }}>{parentCourse?.title}</span>
                      <h5 style={{ fontSize: "13px", fontWeight: "700", color: "#1c1917", margin: "2px 0 0" }}>{l.title}</h5>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>⏱️ Duration: {l.duration}</span>
                    </div>
                    <button
                      onClick={() => toggleLessonComplete(l.id)}
                      style={{
                        border: "none", borderRadius: "20px", padding: "6px 14px", fontSize: "11px", fontWeight: "800", cursor: "pointer",
                        background: isDone ? "#d1fae5" : "#f1f5f9",
                        color: isDone ? "#065f46" : "#475569"
                      }}
                    >
                      {isDone ? "✓ Lesson Complete" : "Mark Complete"}
                    </button>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* SUB-TAB 2: Upload Activities */}
      {activeSubTab === "activities" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
          <SectionCard title="📤 Upload New Classroom Activity">
            <form onSubmit={handleAddActivity}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Activity Title / Goal</label>
                <input required value={newActivityTitle} onChange={e => setNewActivityTitle(e.target.value)} style={S.input} placeholder="e.g., Color Matching Exercise" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Activity Classification Type</label>
                <select value={newActivityType} onChange={e => setNewActivityType(e.target.value)} style={S.input}>
                  <option value="Image">📸 Photographic Upload (.JPG / .PNG)</option>
                  <option value="Video">🎥 Video Demonstration (.MP4)</option>
                  <option value="Document">📄 Classroom Resource Guide (.PDF)</option>
                </select>
              </div>

              {/* Native Hidden Device File Picker Input */}
              <input 
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
                accept="image/*,video/*,application/pdf"
              />

              {/* Action Container for Picking Files */}
              <div 
                onClick={triggerFileBrowser}
                style={{ padding: "24px", border: "2px dashed #fbbf24", borderRadius: "12px", background: "#fffbeb", textAlign: "center", marginBottom: 16, cursor: "pointer" }}
              >
                <span style={{ fontSize: "28px" }}>📎</span>
                {selectedFile ? (
                  <>
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "#059669", margin: "4px 0 0" }}>File attached securely!</p>
                    <p style={{ fontSize: "11px", color: "#1c1917", margin: "4px 0 0", wordBreak: "break-all", fontWeight: "600" }}>{selectedFile.name}</p>
                    <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>Size: {selectedFile.size}</p>
                  </>
                ) : (
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#92400e", margin: "4px 0 0" }}>Drag & drop or browse student classroom files</p>
                )}
              </div>
              <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>Publish Activity Log</button>
            </form>
          </SectionCard>

          <SectionCard title="📂 Activity Submission Archives">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activities.map(act => (
                <div key={act.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                  <div style={{ overflow: "hidden", paddingRight: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#1c1917" }}>{act.title}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: 2, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                      Format: <b>{act.type}</b> · Posted on: {act.date}
                    </div>
                    {act.fileName && (
                      <div style={{ fontSize: "10px", color: "#059669", fontWeight: "600", marginTop: "2px" }}>
                        📄 {act.fileName}
                      </div>
                    )}
                  </div>
                  <StatusBadge status="approved" />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* SUB-TAB 3: Notes & Reports */}
      {activeSubTab === "reports" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
          <SectionCard title="✍️ Draft Teaching Note / Progress Report">
            <form onSubmit={handleAddReport}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Report Core Subject / Focus Topic</label>
                <input required value={reportTopic} onChange={e => setReportTopic(e.target.value)} style={S.input} placeholder="e.g., Weekly Class Performance Log" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Observation Summary Details</label>
                <textarea required value={reportText} onChange={e => setReportText(e.target.value)} style={{ ...S.input, height: "110px", resize: "none" }} placeholder="Type detailed class notes or performance reports here..." />
              </div>
              <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>Save Report Entry</button>
            </form>
          </SectionCard>

          <SectionCard title="🗃️ Historic Saved Notebook Logs">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reports.map(rep => (
                <div key={rep.id} style={{ padding: "14px", background: "white", border: "1px solid #f1f5f9", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: "#d97706" }}>📌 {rep.topic}</span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>{rep.date}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#475569", margin: 0, lineHeight: "1.5" }}>{rep.text}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}