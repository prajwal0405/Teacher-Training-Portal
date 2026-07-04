import { useState, useEffect } from "react";
import { Modal, S, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getAdminCertificates, generateCertificate, revokeCertificate, getCourseAssignments, getAdminTeachers, getCourses } from "../services/api";

export default function CertificateManagementTab({ setToast }) {
  const [certificates, setCertificates] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generateModal, setGenerateModal] = useState(false);
  const [form, setForm] = useState({ teacherId: "", courseId: "", assignmentId: "", score: "", googleFormUrl: "" });
  const [localToast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || ((m) => setLocalToast(m));

  const loadData = () => {
    setLoading(true);
    Promise.all([getAdminCertificates(), getAdminTeachers(), getCourses(), getCourseAssignments()])
      .then(([certRes, teacherRes, courseRes, assnRes]) => {
        setCertificates(certRes.certificates || []);
        setTeachers(teacherRes.teachers || []);
        setCourses(courseRes.courses || []);
        setAssignments(assnRes.assignments || []);
      })
      .catch((err) => showToast({ msg: "Failed to load: " + err.message, type: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.teacherId || !form.courseId) {
      showToast({ msg: "Teacher and course are required.", type: "error" });
      return;
    }
    try {
      await generateCertificate({
        teacherId: form.teacherId,
        courseId: form.courseId,
        assignmentId: form.assignmentId || undefined,
        score: form.score ? Number(form.score) : undefined,
        googleFormUrl: form.googleFormUrl || undefined,
      });
      showToast({ msg: "Certificate generated!", type: "success" });
      setGenerateModal(false);
      setForm({ teacherId: "", courseId: "", assignmentId: "", score: "", googleFormUrl: "" });
      loadData();
    } catch (err) {
      showToast({ msg: err.message || "Failed to generate certificate", type: "error" });
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Revoke this certificate? It will become invalid.")) return;
    try {
      await revokeCertificate(id);
      showToast({ msg: "Certificate revoked.", type: "success" });
      loadData();
    } catch (err) {
      showToast({ msg: err.message, type: "error" });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Certificates...
      </div>
    );
  }

  const issued = certificates.filter((c) => c.status === "issued").length;
  const revoked = certificates.filter((c) => c.status === "revoked").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={localToast.msg} type={localToast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {generateModal && (
        <Modal title="🎓 Generate Certificate" onClose={() => setGenerateModal(false)}>
          <form onSubmit={handleGenerate}>
            <label style={S.label}>Teacher *</label>
            <select style={{ ...S.input, marginBottom: 12 }} value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required>
              <option value="">Select teacher...</option>
              {teachers.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>{t.name} — {t.email}</option>
              ))}
            </select>

            <label style={S.label}>Course *</label>
            <select style={{ ...S.input, marginBottom: 12 }} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
              <option value="">Select course...</option>
              {courses.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.title}</option>
              ))}
            </select>

            <label style={S.label}>Score (optional)</label>
            <input style={{ ...S.input, marginBottom: 12 }} type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="e.g. 85" />

            <label style={S.label}>Google Form URL (for course completion submission)</label>
            <input style={{ ...S.input, marginBottom: 20 }} value={form.googleFormUrl} onChange={(e) => setForm({ ...form, googleFormUrl: e.target.value })} placeholder="https://docs.google.com/forms/..." />

            <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>🎓 Generate Certificate</button>
          </form>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Certificate Management</h1>
          <p style={S.pageSub}>{issued} issued · {revoked} revoked</p>
        </div>
        <button onClick={() => setGenerateModal(true)} style={S.primaryBtn}>+ Generate Certificate</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="🎓" label="Total Issued" val={issued} color="#10b981" bg="#d1fae5" />
        <StatCard icon="🚫" label="Revoked" val={revoked} color="#ef4444" bg="#fee2e2" />
        <StatCard icon="👩‍🏫" label="Teachers Certified" val={new Set(certificates.map((c) => String(c.teacher?._id || c.teacher))).size} color="#8b5cf6" bg="#ede9fe" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {certificates.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎓</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No certificates issued yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Assign courses and generate certificates when teachers complete them</div>
          </div>
        ) : (
          certificates.map((cert) => {
            const gradeColor = cert.grade === "A+" || cert.grade === "A" ? "#10b981" : cert.grade === "B+" || cert.grade === "B" ? "#f59e0b" : "#ef4444";
            return (
              <div key={cert._id} style={{
                background: "white",
                borderRadius: 14,
                padding: "16px 20px",
                border: "1px solid #f1f5f9",
                borderLeft: `4px solid ${cert.status === "issued" ? "#10b981" : "#ef4444"}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11,
                    background: "linear-gradient(135deg,#f59e0b,#d97706)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, fontWeight: 800, color: "white", flexShrink: 0,
                  }}>
                    🎓
                  </div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                      {cert.certificateNumber || "Pending"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>👩‍🏫 {cert.teacher?.name || "Unknown"}</span>
                      <span>📚 {cert.course?.title || "Course"}</span>
                      <span>📅 {new Date(cert.issuedAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: gradeColor }}>{cert.grade || "—"}</div>
                    {cert.score != null && <div style={{ fontSize: 11, color: "#9ca3af" }}>{cert.score}%</div>}
                  </div>

                  <StatusBadge status={cert.status} />

                  <div style={{ display: "flex", gap: 6 }}>
                    {cert.status === "issued" && (
                      <>
                        <button onClick={() => {
                          const printWindow = window.open("", "_blank");
                          printWindow.document.write(`
                            <!DOCTYPE html><html><head><title>Certificate - ${cert.certificateNumber}</title>
                            <style>
                              @page { size: landscape; margin: 0; }
                              body { margin: 0; font-family: 'Georgia', serif; }
                              .cert { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
                              .inner { width: 800px; height: 560px; background: white; border: 3px solid #b8860b; padding: 50px; text-align: center; position: relative; }
                              .inner::before { content: ''; position: absolute; inset: 8px; border: 1px solid #daa520; pointer-events: none; }
                              .logo { font-size: 14px; letter-spacing: 4px; color: #b8860b; text-transform: uppercase; margin-bottom: 10px; }
                              .title { font-size: 32px; color: #1a1a2e; margin: 10px 0; font-weight: bold; }
                              .subtitle { font-size: 14px; color: #666; margin-bottom: 30px; }
                              .name { font-size: 28px; color: #1a1a2e; font-weight: bold; margin: 10px 0; border-bottom: 2px solid #b8860b; display: inline-block; padding-bottom: 4px; }
                              .course { font-size: 18px; color: #333; margin: 15px 0; }
                              .date { font-size: 13px; color: #666; margin: 8px 0; }
                              .cert-num { font-size: 11px; color: #999; margin-top: 20px; }
                              .grade { font-size: 16px; color: #b8860b; font-weight: bold; margin: 8px 0; }
                              .footer { position: absolute; bottom: 30px; left: 50px; right: 50px; display: flex; justify-content: space-between; }
                              .sign-line { width: 180px; border-top: 1px solid #333; padding-top: 6px; font-size: 12px; color: #333; text-align: center; }
                            </style></head><body>
                            <div class="cert"><div class="inner">
                              <div class="logo">SpacECE</div>
                              <div class="title">Certificate of Completion</div>
                              <div class="subtitle">This is to certify that</div>
                              <div class="name">${cert.teacher?.name || "Teacher"}</div>
                              <div class="course">has successfully completed the course<br><strong>${cert.course?.title || "Training Program"}</strong></div>
                              ${cert.grade ? `<div class="grade">Grade: ${cert.grade}</div>` : ""}
                              ${cert.score != null ? `<div class="date">Score: ${cert.score}%</div>` : ""}
                              <div class="date">Date of Issue: ${new Date(cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
                              <div class="cert-num">Certificate No: ${cert.certificateNumber || "N/A"}</div>
                              <div class="footer">
                                <div class="sign-line">Admin Signature</div>
                                <div class="sign-line">Director, SpacECE</div>
                              </div>
                            </div></div>
                            <script>window.onload = function() { window.print(); }</script>
                          </body></html>`);
                          printWindow.document.close();
                        }} style={{ ...S.tblBtn, color: "#2563eb", borderColor: "#bfdbfe" }}>📥 Download PDF</button>
                        <button onClick={() => handleRevoke(cert._id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                          🚫 Revoke
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {cert.metadata?.googleFormUrl && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#2563eb" }}>
                    📋 Google Form: <a href={cert.metadata.googleFormUrl} target="_blank" rel="noreferrer">{cert.metadata.googleFormUrl}</a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
