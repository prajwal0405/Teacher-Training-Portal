import { useEffect, useMemo, useState } from "react";
import { AttendanceBar, BarChart, S, SectionCard, StatCard, StatusBadge } from "../components/Shared";
import { getCourseAssignments, getTeacherAttendance, getTrainers } from "../services/api";

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildMonthlyEnrollment(teachers) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const val = teachers.filter((teacher) => {
      const createdAt = teacher.createdAt ? new Date(teacher.createdAt) : null;
      return createdAt &&
        createdAt.getMonth() === date.getMonth() &&
        createdAt.getFullYear() === date.getFullYear();
    }).length;
    return {
      month: date.toLocaleString("en-IN", { month: "short" }),
      val,
    };
  });
}

export default function ReportsTab({ teachers = [], courses = [] }) {
  const [activeReport, setActiveReport] = useState("enrollment");
  const [assignments, setAssignments] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  useEffect(() => {
    Promise.all([getCourseAssignments(), getTrainers(), getTeacherAttendance()])
      .then(([assignmentData, trainerData, attendanceData]) => {
        setAssignments(assignmentData?.assignments || []);
        setTrainers(trainerData?.trainers || []);
        setAttendanceRecords(attendanceData?.records || []);
      })
      .catch((error) => {
        console.error("Failed to load reports data", error);
      });
  }, []);

  const approvedTeachers = teachers.filter((teacher) => teacher.status === "approved");
  const publishedCourses = courses.filter((course) => course.status === "published");
  const monthlyEnrollment = useMemo(() => buildMonthlyEnrollment(teachers), [teachers]);

  const completionByCourse = useMemo(() => {
    return publishedCourses.map((course) => {
      const courseAssignments = assignments.filter((assignment) => {
        const courseId = assignment.course?._id || assignment.course;
        return String(courseId) === String(course._id);
      });
      const total = courseAssignments.length;
      const completed = courseAssignments.filter((assignment) => assignment.status === "completed" || assignment.status === "approved").length;
      return {
        course,
        total,
        completed,
        pct: total ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [assignments, publishedCourses]);

  const attendanceByTeacher = useMemo(() => {
    return approvedTeachers.map((teacher) => {
      const records = attendanceRecords.filter((record) => String(record.teacher?._id || record.teacher) === String(teacher._id));
      const present = records.filter((record) => ["present", "late"].includes(record.status)).length;
      const pct = records.length ? Math.round((present / records.length) * 100) : 0;
      return { teacher, pct, records: records.length };
    }).sort((a, b) => b.pct - a.pct);
  }, [approvedTeachers, attendanceRecords]);

  const reportTabs = [
    { key: "enrollment", label: "Enrollment" },
    { key: "completion", label: "Completion" },
    { key: "attendance", label: "Attendance" },
    { key: "trainer", label: "Trainers" },
  ];

  const exportEnrollment = () => {
    downloadCsv("teacher-enrollment-report.csv", [
      ["Name", "Email", "Status", "Center", "Class", "Created At"],
      ...teachers.map((teacher) => [
        teacher.name,
        teacher.email,
        teacher.status,
        teacher.teacherProfile?.center?.name || "",
        teacher.teacherProfile?.class?.name || "",
        teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString("en-IN") : "",
      ]),
    ]);
  };

  const exportCompletion = () => {
    downloadCsv("course-completion-report.csv", [
      ["Course", "Assignments", "Completed", "Completion Percent"],
      ...completionByCourse.map((item) => [item.course.title, item.total, item.completed, `${item.pct}%`]),
    ]);
  };

  const exportAttendance = () => {
    downloadCsv("teacher-attendance-report.csv", [
      ["Teacher", "Attendance Percent", "Records Count"],
      ...attendanceByTeacher.map((item) => [item.teacher.name, `${item.pct}%`, item.records]),
    ]);
  };

  const exportTrainer = () => {
    downloadCsv("trainer-report.csv", [
      ["Trainer", "Subject", "Courses", "Batches", "Sessions", "Rating", "Status"],
      ...trainers.map((trainer) => [trainer.name, trainer.subject, trainer.courses, trainer.batches, trainer.sessions, trainer.rating, trainer.status]),
    ]);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Reports & Analytics</h1>
      <p style={S.pageSub}>Live operational reports generated from current teacher, course, attendance, and trainer data.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon="👥" label="Total Teachers" val={teachers.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Approved Teachers" val={approvedTeachers.length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="📚" label="Published Courses" val={publishedCourses.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="📝" label="Course Assignments" val={assignments.length} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="🎓" label="Completed Assignments" val={assignments.filter((assignment) => assignment.status === "completed" || assignment.status === "approved").length} color="#06b6d4" bg="#cffafe" />
        <StatCard icon="👩‍🏫" label="Active Trainers" val={trainers.filter((trainer) => trainer.status === "active").length} color="#ef4444" bg="#fee2e2" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {reportTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveReport(tab.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1.5px solid ${activeReport === tab.key ? "#f59e0b" : "#e5e7eb"}`,
              background: activeReport === tab.key ? "#fef3c7" : "white",
              color: activeReport === tab.key ? "#92400e" : "#6b7280",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeReport === "enrollment" && (
        <SectionCard title="Teacher enrollment trend" action={<button style={S.exportBtn} onClick={exportEnrollment}>Export CSV</button>}>
          {teachers.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>No teacher records available.</div>
          ) : (
            <>
              <BarChart data={monthlyEnrollment} color="#f59e0b" height={120} />
              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                {teachers.slice(0, 8).map((teacher) => (
                  <div key={teacher._id} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", border: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{teacher.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{teacher.email}</div>
                    <div style={{ marginTop: 8 }}>
                      <StatusBadge status={teacher.status} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      )}

      {activeReport === "completion" && (
        <SectionCard title="Course completion report" action={<button style={S.exportBtn} onClick={exportCompletion}>Export CSV</button>}>
          {completionByCourse.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>No published courses available.</div>
          ) : (
            completionByCourse.map((item) => (
              <div key={item.course._id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.course.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: item.pct >= 80 ? "#10b981" : item.pct >= 50 ? "#f59e0b" : "#ef4444" }}>
                    {item.completed}/{item.total} ({item.pct}%)
                  </span>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.pct}%`, background: item.pct >= 80 ? "#10b981" : item.pct >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                </div>
              </div>
            ))
          )}
        </SectionCard>
      )}

      {activeReport === "attendance" && (
        <SectionCard title="Teacher attendance report" action={<button style={S.exportBtn} onClick={exportAttendance}>Export CSV</button>}>
          {attendanceByTeacher.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>No teacher attendance records found.</div>
          ) : (
            attendanceByTeacher.map((item) => (
              <AttendanceBar key={item.teacher._id} val={item.pct} name={`${item.teacher.name} (${item.records} records)`} />
            ))
          )}
        </SectionCard>
      )}

      {activeReport === "trainer" && (
        <SectionCard title="Trainer performance report" action={<button style={S.exportBtn} onClick={exportTrainer}>Export CSV</button>}>
          {trainers.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>No trainer data available.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                  {["Trainer", "Subject", "Courses", "Batches", "Sessions", "Rating", "Status"].map((header) => (
                    <th key={header} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textAlign: "left", textTransform: "uppercase" }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trainers.map((trainer) => (
                  <tr key={trainer._id} style={{ borderBottom: "1px solid #f9fafb" }}>
                    <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{trainer.name}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{trainer.subject}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{trainer.courses || 0}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{trainer.batches || 0}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{trainer.sessions || 0}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{trainer.rating || 0}</td>
                    <td style={{ padding: "12px" }}><StatusBadge status={trainer.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      )}
    </div>
  );
}
