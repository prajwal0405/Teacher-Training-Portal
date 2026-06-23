import { useEffect, useRef, useState } from "react";
import { SectionCard, S, Badge, StatusBadge } from "../components/Shared";
import {
  getActivities,
  getTeacherLessonPlans,
  getTeacherProgress,
  getTeacherMe,
  submitActivity,
  submitLessonCompletion,
  uploadFile
} from "../services/api";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "Not scheduled";
const getId = (value) => value?._id || value?.id || value || "";

export default function TrainingAndClassroomManager() {
  const [activeSubTab, setActiveSubTab] = useState("lessons");
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [activities, setActivities] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));
  const [teachingNotes, setTeachingNotes] = useState("");
  const [completionActivity, setCompletionActivity] = useState("");
  const [completionLessonId, setCompletionLessonId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [progressRes, lessonRes, activityRes, teacherRes] = await Promise.all([
        getTeacherProgress(),
        getTeacherLessonPlans(),
        getActivities(),
        getTeacherMe()
      ]);
      setCourses(progressRes.courses || []);
      setLessons(lessonRes.lessonPlans || []);
      setActivities(activityRes.activities || []);
      setTeacher(teacherRes.teacher || null);
    } catch (error) {
      showToast(error.message || "Failed to load training records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleActivitySubmit = async (event) => {
    event.preventDefault();
    if (!activityDescription.trim()) return;

    try {
      const files = [];
      if (selectedFile) {
        const uploadRes = await uploadFile(selectedFile);
        if (uploadRes.asset?._id) files.push(uploadRes.asset._id);
      }

      await submitActivity({
        center: getId(teacher?.teacherProfile?.center),
        class: getId(teacher?.teacherProfile?.class),
        lessonPlan: selectedLessonId || undefined,
        activityDate,
        description: activityDescription.trim(),
        files
      });

      setActivityDescription("");
      setSelectedLessonId("");
      setSelectedFile(null);
      showToast("Activity submitted for admin review.");
      refreshData();
    } catch (error) {
      showToast(error.message || "Activity submission failed.");
    }
  };

  const handleCompleteLesson = async (event) => {
    event.preventDefault();
    if (!completionLessonId || !teachingNotes.trim() || !completionActivity.trim()) return;

    try {
      const files = [];
      if (selectedFile) {
        const uploadRes = await uploadFile(selectedFile);
        if (uploadRes.asset?._id) files.push(uploadRes.asset._id);
      }

      await submitLessonCompletion(completionLessonId, {
        teachingNotes: teachingNotes.trim(),
        activityDescription: completionActivity.trim(),
        files
      });

      setCompletionLessonId("");
      setTeachingNotes("");
      setCompletionActivity("");
      setSelectedFile(null);
      showToast("Lesson completion sent to admin.");
      refreshData();
    } catch (error) {
      showToast(error.message || "Lesson completion failed.");
    }
  };

  const pendingLessons = lessons.filter((item) => item.status === "pending");

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={S.pageTitle}>Training & Lessons</h1>
        <p style={S.pageSub}>Review admin assigned courses, complete lesson plans, and submit classroom evidence.</p>
      </div>

      {toastMsg && (
        <div style={{ padding: 12, marginBottom: 16, background: "#d1fae5", color: "#065f46", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
          {toastMsg}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #e2e8f0", paddingBottom: 8, flexWrap: "wrap" }}>
        {[
          { key: "lessons", label: "Assigned Lessons" },
          { key: "activities", label: "Activity Submissions" },
          { key: "courses", label: "Course Progress" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 800,
              background: activeSubTab === tab.key ? "#fffbeb" : "transparent",
              color: activeSubTab === tab.key ? "#d97706" : "#64748b",
              borderBottom: activeSubTab === tab.key ? "3px solid #d97706" : "3px solid transparent"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SectionCard title="Loading">Loading training records...</SectionCard>
      ) : activeSubTab === "lessons" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          <SectionCard title="Lesson Plans From Admin">
            {lessons.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 13 }}>No lesson plans assigned yet.</p>
            ) : lessons.map((item) => {
              const lesson = item.lessonPlan || {};
              return (
                <div key={item._id} style={{ padding: 14, border: "1px solid #f1f5f9", borderRadius: 10, marginBottom: 10, background: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{lesson.title || "Untitled lesson"}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{lesson.course?.title || "General lesson"} | {formatDate(lesson.scheduleDate || item.assignedDate)}</div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {(lesson.objectives || lesson.instructions || lesson.activities) && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                      {lesson.objectives && <div><b>Objectives:</b> {lesson.objectives}</div>}
                      {lesson.instructions && <div><b>Instructions:</b> {lesson.instructions}</div>}
                      {lesson.activities && <div><b>Activities:</b> {lesson.activities}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </SectionCard>

          <SectionCard title="Complete Lesson">
            <form onSubmit={handleCompleteLesson}>
              <label style={S.label}>Lesson Plan</label>
              <select required value={completionLessonId} onChange={(e) => setCompletionLessonId(e.target.value)} style={{ ...S.input, marginBottom: 12 }}>
                <option value="">Select a pending lesson</option>
                {pendingLessons.map((item) => (
                  <option key={item._id} value={item._id}>{item.lessonPlan?.title || "Untitled lesson"}</option>
                ))}
              </select>
              <label style={S.label}>Teaching Notes</label>
              <textarea required value={teachingNotes} onChange={(e) => setTeachingNotes(e.target.value)} style={{ ...S.input, minHeight: 90, resize: "vertical", marginBottom: 12 }} />
              <label style={S.label}>Classroom Activity Done</label>
              <textarea required value={completionActivity} onChange={(e) => setCompletionActivity(e.target.value)} style={{ ...S.input, minHeight: 80, resize: "vertical", marginBottom: 12 }} />
              <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>Send Completion</button>
            </form>
          </SectionCard>
        </div>
      ) : activeSubTab === "activities" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
          <SectionCard title="Submit Classroom Activity">
            <form onSubmit={handleActivitySubmit}>
              <label style={S.label}>Related Lesson</label>
              <select value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} style={{ ...S.input, marginBottom: 12 }}>
                <option value="">No specific lesson</option>
                {lessons.map((item) => (
                  <option key={item._id} value={getId(item.lessonPlan)}>{item.lessonPlan?.title || "Untitled lesson"}</option>
                ))}
              </select>
              <label style={S.label}>Activity Date</label>
              <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} style={{ ...S.input, marginBottom: 12 }} />
              <label style={S.label}>Description</label>
              <textarea required value={activityDescription} onChange={(e) => setActivityDescription(e.target.value)} style={{ ...S.input, minHeight: 100, resize: "vertical", marginBottom: 12 }} placeholder="Describe what happened in class." />
              <input ref={fileInputRef} type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} style={{ display: "none" }} accept="image/*,video/*,application/pdf" />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...S.exportBtn, width: "100%", marginBottom: 12 }}>
                {selectedFile ? selectedFile.name : "Attach Evidence File"}
              </button>
              <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>Submit For Review</button>
            </form>
          </SectionCard>

          <SectionCard title="Submitted Activities">
            {activities.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 13 }}>No activity submissions yet.</p>
            ) : activities.map((activity) => (
              <div key={activity._id} style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 8, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{activity.lessonPlan?.title || "Classroom activity"}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{formatDate(activity.activityDate)}</div>
                  </div>
                  <StatusBadge status={activity.status} />
                </div>
                <p style={{ fontSize: 12, color: "#475569", margin: "8px 0 0", lineHeight: 1.5 }}>{activity.description}</p>
                {activity.adminComments && <div style={{ marginTop: 8, fontSize: 12, color: "#92400e" }}><b>Admin feedback:</b> {activity.adminComments}</div>}
              </div>
            ))}
          </SectionCard>
        </div>
      ) : (
        <SectionCard title="Assigned Course Progress">
          {courses.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No courses assigned yet.</p>
          ) : courses.map((assignment) => {
            const progress = assignment.progressPercent || 0;
            return (
              <div key={assignment._id} style={{ padding: 14, border: "1px solid #f1f5f9", borderRadius: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{assignment.course?.title || "Untitled course"}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{assignment.course?.category || "Training"} | Due: {formatDate(assignment.dueDate)}</div>
                  </div>
                  <Badge color="#d97706" bg="#fef3c7">{progress}% complete</Badge>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "#f59e0b" }} />
                </div>
              </div>
            );
          })}
        </SectionCard>
      )}
    </div>
  );
}
