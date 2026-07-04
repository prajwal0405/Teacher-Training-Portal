import { useEffect, useState } from "react";
import { Modal, S, SectionCard, StatCard, StatusBadge } from "../components/Shared";
import { getFeedbacks, updateFeedback } from "../services/api";

export default function FeedbackManagementTab({ setToast }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reviews");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [responseModal, setResponseModal] = useState(null);
  const [shareModal, setShareModal] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [savingId, setSavingId] = useState(null);

  const refreshFeedbacks = () => {
    setLoading(true);
    getFeedbacks()
      .then((data) => {
        const mapped = (data.feedbacks || []).map((f) => ({
          id: f._id,
          learner: f.learner || "Anonymous Learner",
          course: f.course || "Unknown Course",
          batch: f.batch || "",
          trainer: f.trainer || "Unassigned",
          rating: f.rating || 0,
          trainerRating: f.trainerRating || 0,
          tag: f.tag || "",
          suggestion: f.suggestion || "",
          status: f.status || "pending",
          date: f.date || (f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-IN") : ""),
          anonymous: f.anonymous || false,
          adminResponse: f.adminResponse || "",
          sharedWithTrainer: f.sharedWithTrainer || false,
        }));
        setFeedbacks(mapped);
      })
      .catch((error) => {
        setToast?.({ msg: error.message || "Failed to load feedbacks.", type: "error" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshFeedbacks();
  }, []);

  const TAGS = ["Content Quality", "Platform UX", "Trainer", "Schedule", "Price"];
  const TAG_COLOR = {
    "Content Quality": { bg: "#dbeafe", color: "#1d4ed8" },
    "Platform UX": { bg: "#ede9fe", color: "#6d28d9" },
    "Trainer": { bg: "#d1fae5", color: "#065f46" },
    "Schedule": { bg: "#fef3c7", color: "#92400e" },
    "Price": { bg: "#fee2e2", color: "#991b1b" },
  };

  const allCourses = ["all", ...new Set(feedbacks.map((f) => f.course).filter(Boolean))];
  const allBatches = ["all", ...new Set(feedbacks.map((f) => f.batch).filter(Boolean))];

  // Filtered
  const filtered = feedbacks.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch = f.learner.toLowerCase().includes(q) || f.course.toLowerCase().includes(q) || f.suggestion.toLowerCase().includes(q);
    const matchRating = ratingFilter === "all" || f.rating === Number(ratingFilter);
    const matchCourse = courseFilter === "all" || f.course === courseFilter;
    const matchBatch = batchFilter === "all" || f.batch === batchFilter;
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    const matchTag = tagFilter === "all" || f.tag === tagFilter;
    const matchFrom = !dateFrom || !f.date || new Date(f.date.split("/").reverse().join("-")) >= new Date(dateFrom);
    const matchTo = !dateTo || !f.date || new Date(f.date.split("/").reverse().join("-")) <= new Date(dateTo);
    return matchSearch && matchRating && matchCourse && matchBatch && matchStatus && matchTag && matchFrom && matchTo;
  });

  // Actions
  const handleUpdateFeedback = async (id, changes) => {
    setSavingId(id);
    try {
      const data = await updateFeedback(id, changes);
      if (data?.feedback) {
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  ...changes,
                  ...(data.feedback._id ? { id: data.feedback._id } : {}),
                }
              : f
          )
        );
      }
    } catch (error) {
      setToast?.({ msg: error.message || "Failed to update feedback.", type: "error" });
    } finally {
      setSavingId(null);
    }
  };

  const approve = (id) => {
    handleUpdateFeedback(id, { status: "approved" });
    setToast?.({ msg: "Review approved!", type: "success" });
  };

  const reject = (id) => {
    handleUpdateFeedback(id, { status: "rejected" });
    setToast?.({ msg: "Review rejected.", type: "error" });
  };

  const submitResponse = async (id) => {
    if (!responseText.trim()) {
      setToast?.({ msg: "Response cannot be empty.", type: "error" });
      return;
    }
    await handleUpdateFeedback(id, { adminResponse: responseText.trim() });
    setToast?.({ msg: "Response saved!", type: "success" });
    setResponseModal(null);
    setResponseText("");
  };

  const shareWithTrainer = async (id) => {
    await handleUpdateFeedback(id, { sharedWithTrainer: true });
    setToast?.({ msg: "Review shared with trainer as motivation!", type: "success" });
    setShareModal(null);
  };

  // Weighted average
  const weightedAvg = (arr) => {
    if (!arr.length) return 0;
    const total = arr.reduce((a, f) => a + f.rating, 0);
    return (total / arr.length).toFixed(1);
  };

  // Per-course aggregates
  const courseStats = [...new Set(feedbacks.map((f) => f.course).filter(Boolean))].map((course) => {
    const cf = feedbacks.filter((f) => f.course === course);
    const avg = weightedAvg(cf);
    const dist = [5, 4, 3, 2, 1].map((r) => ({ star: r, count: cf.filter((f) => f.rating === r).length }));
    const approved = cf.filter((f) => f.status === "approved").length;
    return { course, avg, dist, total: cf.length, approved };
  });

  // Per-trainer NPS
  const trainerStats = [...new Set(feedbacks.map((f) => f.trainer).filter(Boolean))].map((trainer) => {
    const tf = feedbacks.filter((f) => f.trainer === trainer);
    const avg = tf.length ? (tf.reduce((a, f) => a + f.trainerRating, 0) / tf.length).toFixed(1) : 0;
    const promoters = tf.filter((f) => f.trainerRating >= 4).length;
    const detractors = tf.filter((f) => f.trainerRating <= 2).length;
    const nps = tf.length ? Math.round(((promoters - detractors) / tf.length) * 100) : 0;
    const byCourse = [...new Set(tf.map((f) => f.course).filter(Boolean))].map((c) => ({
      course: c,
      avg: (
        tf.filter((f) => f.course === c).reduce((a, f) => a + f.trainerRating, 0) /
        Math.max(1, tf.filter((f) => f.course === c).length)
      ).toFixed(1),
      count: tf.filter((f) => f.course === c).length,
    }));
    const positives = tf.filter((f) => f.trainerRating >= 4 && f.tag === "Trainer");
    return { trainer, avg, nps, total: tf.length, promoters, detractors, byCourse, positives };
  });

  // Tag frequency
  const tagStats = TAGS.map((tag) => {
    const tagged = feedbacks.filter((f) => f.tag === tag);
    const freq = tagged.length;
    const impact = tagged.length ? Math.round(tagged.reduce((a, f) => a + f.rating, 0) / tagged.length * 20) : 0;
    return { tag, freq, impact, items: tagged };
  }).sort((a, b) => b.freq - a.freq);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Learner", "Course", "Batch", "Trainer", "Rating", "Trainer Rating", "Tag", "Suggestion", "Status", "Date", "Anonymous"];
    const rows = feedbacks.map((f) => [
      f.anonymous ? "Anonymous" : f.learner,
      f.course,
      f.batch,
      f.trainer,
      f.rating,
      f.trainerRating,
      f.tag,
      `"${f.suggestion}"`,
      f.status,
      f.date,
      f.anonymous ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feedback_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stars = (n, size = 13) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ fontSize: size, color: i < n ? "#f59e0b" : "#e5e7eb" }}>
        ★
      </span>
    ));

  const tabs = [
    { key: "reviews", label: "⭐ Course Reviews" },
    { key: "trainers", label: "🎓 Trainer Ratings" },
    { key: "suggestions", label: "💡 Improvement Suggestions" },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Response Modal */}
      {responseModal && (
        <Modal title={`💬 Admin Response — ${responseModal.learner}`} onClose={() => { setResponseModal(null); setResponseText(""); }}>
          <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 12, color: "#6b7280" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Review:</div>
            <div style={{ fontStyle: "italic" }}>"{responseModal.suggestion}"</div>
          </div>
          <label style={S.label}>Your Response *</label>
          <textarea
            style={{ ...S.input, height: 100, resize: "none", marginBottom: 16 }}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Write a public response to this review..."
          />

          <button onClick={() => submitResponse(responseModal.id)} style={{ ...S.primaryBtn, width: "100%" }}>
            📤 Post Response
          </button>
        </Modal>
      )}

      {/* Share Modal */}
      {shareModal && (
        <Modal title={`🌟 Share with Trainer — ${shareModal.trainer}`} onClose={() => setShareModal(null)}>
          <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46", marginBottom: 6 }}>Positive Review to Share:</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>{stars(shareModal.rating)}</div>
            <div style={{ fontSize: 12, color: "#065f46", fontStyle: "italic" }}>"{shareModal.suggestion}"</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>— {shareModal.anonymous ? "Anonymous" : shareModal.learner}</div>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
            This review will be marked as shared with <b>{shareModal.trainer}</b> as motivational feedback.
          </div>
          <button onClick={() => shareWithTrainer(shareModal.id)} style={{ ...S.primaryBtn, width: "100%" }}>
            🌟 Share as Motivation
          </button>
        </Modal>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Feedback Management</h1>
          <p style={S.pageSub}>Course reviews · Trainer ratings · Improvement suggestions</p>
        </div>
        <button onClick={exportCSV} style={S.exportBtn}>
          ⬇ Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="💬" label="Total Reviews" val={feedbacks.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="⭐" label="Weighted Avg" val={weightedAvg(feedbacks)} color="#10b981" bg="#d1fae5" />
        <StatCard icon="⏳" label="Pending Approval" val={feedbacks.filter((f) => f.status === "pending").length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Approved" val={feedbacks.filter((f) => f.status === "approved").length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="🚫" label="Rejected" val={feedbacks.filter((f) => f.status === "rejected").length} color="#ef4444" bg="#fee2e2" />
        <StatCard icon="🔒" label="Anonymous" val={feedbacks.filter((f) => f.anonymous).length} color="#6366f1" bg="#ede9fe" />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>
          Loading feedbacks from database...
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "2px solid #f3f4f6" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: "10px 18px",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === t.key ? "#f59e0b" : "transparent"}`,
                  background: "none",
                  color: activeTab === t.key ? "#92400e" : "#9ca3af",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginBottom: -2,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB: COURSE REVIEWS */}
          {activeTab === "reviews" && (
            <div>
              {/* Filters */}
              <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                    <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search learner, course, review text..."
                      style={{ ...S.input, paddingLeft: 34, marginBottom: 0 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["all", "5", "4", "3", "2", "1"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRatingFilter(r)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 8,
                          border: `1.5px solid ${ratingFilter === r ? "#f59e0b" : "#e5e7eb"}`,
                          background: ratingFilter === r ? "#fef3c7" : "white",
                          color: ratingFilter === r ? "#92400e" : "#6b7280",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {r === "all" ? "All" : r === "5" ? "⭐⭐⭐⭐⭐" : r === "4" ? "⭐⭐⭐⭐" : r === "3" ? "⭐⭐⭐" : r === "2" ? "⭐⭐" : "⭐"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={{ ...S.input, width: 220, marginBottom: 0 }}>
                    {allCourses.map((c) => (
                      <option key={c} value={c}>
                        {c === "all" ? "All Courses" : c.substring(0, 30)}
                      </option>
                    ))}
                  </select>
                  <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} style={{ ...S.input, width: 150, marginBottom: 0 }}>
                    {allBatches.map((b) => (
                      <option key={b} value={b}>
                        {b === "all" ? "All Batches" : b}
                      </option>
                    ))}
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...S.input, width: 150, marginBottom: 0 }}>
                    {["all", "pending", "approved", "rejected"].map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>From:</span>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...S.input, width: 140, marginBottom: 0 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>To:</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...S.input, width: 140, marginBottom: 0 }} />
                  </div>
                  {(search || ratingFilter !== "all" || courseFilter !== "all" || batchFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo) && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setRatingFilter("all");
                        setCourseFilter("all");
                        setBatchFilter("all");
                        setStatusFilter("all");
                        setDateFrom("");
                        setDateTo("");
                      }}
                      style={{ ...S.tblBtn, color: "#ef4444", borderColor: "#fca5a5" }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Aggregate rating per course */}
              {courseStats.length > 0 && (
                <SectionCard title="📊 Aggregate Ratings by Course">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
                    {courseStats.map((cs, i) => (
                      <div key={i} style={{ background: "#f9fafb", borderRadius: 14, padding: "14px 16px", border: "1px solid #f3f4f6" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917", marginBottom: 6, lineHeight: 1.3 }}>
                          {cs.course.substring(0, 35)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>{cs.avg}</span>
                          <div>
                            <div style={{ display: "flex", gap: 2 }}>{stars(Math.round(Number(cs.avg)))}</div>
                            <div style={{ fontSize: 10, color: "#9ca3af" }}>
                              {cs.total} reviews · {cs.approved} approved
                            </div>
                          </div>
                        </div>
                        {cs.dist.map((d) => (
                          <div key={d.star} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: "#9ca3af", width: 12 }}>
                              {d.star}★
                            </span>
                            <div style={{ flex: 1, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  width: `${cs.total > 0 ? (d.count / cs.total) * 100 : 0}%`,
                                  background: "#f59e0b",
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 10, color: "#9ca3af", width: 14 }}>{d.count}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Reviews inbox */}
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
                Showing {filtered.length} of {feedbacks.length} reviews
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      background: "white",
                      borderRadius: 14,
                      padding: "16px 20px",
                      border: `1px solid ${f.status === "pending" ? "#fbbf24" : f.status === "rejected" ? "#fca5a5" : "#f1f5f9"}`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 11,
                          background: "linear-gradient(135deg,#f59e0b,#d97706)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          fontWeight: 800,
                          color: "white",
                          flexShrink: 0,
                        }}
                      >
                        {f.anonymous ? "?" : f.learner[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>
                              {f.anonymous ? "Anonymous Learner" : f.learner}
                              {f.anonymous && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#6366f1",
                                    background: "#ede9fe",
                                    padding: "2px 8px",
                                    borderRadius: 20,
                                  }}
                                >
                                  🔒 Anonymous
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                              {f.course} · {f.batch} · {f.date}
                            </div>
                          </div>
                          <StatusBadge status={f.status} />
                        </div>

                        {/* Ratings row */}
                        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "#6b7280" }}>Course:</span>
                            <div style={{ display: "flex", gap: 2 }}>{stars(f.rating)}</div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>({f.rating})</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "#6b7280" }}>Trainer:</span>
                            <div style={{ display: "flex", gap: 2 }}>{stars(f.trainerRating)}</div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>({f.trainerRating})</span>
                          </div>
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              background: TAG_COLOR[f.tag]?.bg || "#f3f4f6",
                              color: TAG_COLOR[f.tag]?.color || "#6b7280",
                            }}
                          >
                            {f.tag}
                          </span>
                          {f.sharedWithTrainer && (
                            <span style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>🌟 Shared with trainer</span>
                          )}
                        </div>

                        {/* Review text */}
                        <p style={{ fontSize: 13, color: "#374151", margin: "10px 0 0", lineHeight: 1.6, fontStyle: "italic" }}>
                          "{f.suggestion}"
                        </p>

                        {/* Admin response */}
                        {f.adminResponse && (
                          <div style={{ marginTop: 10, padding: "10px 14px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", marginBottom: 4 }}>💬 Admin Response:</div>
                            <div style={{ fontSize: 12, color: "#0369a1" }}>{f.adminResponse}</div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                          {savingId === f.id && (
                            <span style={{ fontSize: 11, color: "#6b7280", alignSelf: "center" }}>Saving...</span>
                          )}
                          {f.status === "pending" && (
                            <>
                              <button onClick={() => approve(f.id)} style={{ ...S.btnGreen, fontSize: 11, padding: "5px 12px" }}>
                                ✓ Approve
                              </button>
                              <button onClick={() => reject(f.id)} style={{ ...S.btnRed, fontSize: 11, padding: "5px 12px" }}>
                                ✕ Reject
                              </button>
                            </>
                          )}
                          {f.status === "approved" && (
                            <button onClick={() => reject(f.id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5", fontSize: 11 }}>
                              Unpublish
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setResponseModal(f);
                              setResponseText(f.adminResponse || "");
                            }}
                            style={{ ...S.tblBtn, color: "#2563eb", borderColor: "#93c5fd", fontSize: 11 }}
                          >
                            💬 {f.adminResponse ? "Edit Response" : "Respond"}
                          </button>
                          {f.rating >= 4 && (
                            <button
                              onClick={() => setShareModal(f)}
                              style={{ ...S.tblBtn, color: "#059669", borderColor: "#6ee7b7", fontSize: 11 }}
                            >
                              🌟 Share with Trainer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: 50, color: "#9ca3af" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No reviews found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters or add feedback data.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: TRAINER RATINGS */}
          {activeTab === "trainers" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
                {trainerStats.map((t, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 18, padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          fontWeight: 800,
                          color: "white",
                          flexShrink: 0,
                        }}
                      >
                        {t.trainer[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{t.trainer}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.total} reviews total</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b" }}>{t.avg}</div>
                        <div style={{ display: "flex", gap: 2 }}>{stars(Math.round(Number(t.avg)))}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                      <div
                        style={{
                          textAlign: "center",
                          padding: "10px 8px",
                          background: `${t.nps >= 50 ? "#d1fae5" : t.nps >= 0 ? "#fef3c7" : "#fee2e2"}`,
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 900, color: t.nps >= 50 ? "#059669" : t.nps >= 0 ? "#d97706" : "#dc2626" }}>
                          {t.nps}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>NPS Score</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "10px 8px", background: "#d1fae5", borderRadius: 10 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#059669" }}>{t.promoters}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Promoters</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "10px 8px", background: "#fee2e2", borderRadius: 10 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#dc2626" }}>{t.detractors}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Detractors</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
                        <span>NPS: {t.nps >= 50 ? "Excellent" : t.nps >= 0 ? "Good" : "Needs Work"}</span>
                        <span>{t.nps >= 0 ? "+" : ""}{t.nps}</span>
                      </div>
                      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, Math.max(0, t.nps + 50))}%`,
                            background: t.nps >= 50 ? "#10b981" : t.nps >= 0 ? "#f59e0b" : "#ef4444",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>By Course</div>
                    {t.byCourse.map((bc, j) => (
                      <div
                        key={j}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 10px",
                          background: "#f9fafb",
                          borderRadius: 8,
                          marginBottom: 5,
                          border: "1px solid #f3f4f6",
                        }}
                      >
                        <span style={{ fontSize: 11, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {bc.course.substring(0, 28)}
                        </span>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>⭐ {bc.avg}</span>
                          <span style={{ fontSize: 10, color: "#9ca3af" }}>({bc.count})</span>
                        </div>
                      </div>
                    ))}

                    <div style={{ marginTop: 10, padding: "8px 12px", background: "#ede9fe", borderRadius: 8, fontSize: 11, color: "#6d28d9", border: "1px solid #c4b5fd" }}>
                      🔒 Anonymous reviews included in stats — visible to admin only
                    </div>

                    {t.positives.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>🌟 Positive Reviews to Share</div>
                        {t.positives.slice(0, 2).map((p, j) => (
                          <div key={j} style={{ padding: "8px 10px", background: "#ecfdf5", borderRadius: 8, marginBottom: 6, border: "1px solid #6ee7b7" }}>
                            <div style={{ fontSize: 11, color: "#065f46", fontStyle: "italic", marginBottom: 4 }}>
                              "{p.suggestion.substring(0, 70)}..."
                            </div>
                            <button onClick={() => setShareModal(p)} style={{ ...S.btnGreen, fontSize: 10, padding: "3px 10px" }}>
                              🌟 Share as Motivation
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {trainerStats.length === 0 && (
                  <div style={{ textAlign: "center", padding: 50, color: "#9ca3af" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🎓</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No trainer ratings yet</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Ratings appear once learners submit feedback with trainer ratings.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: IMPROVEMENT SUGGESTIONS */}
          {activeTab === "suggestions" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <button
                  onClick={() => setTagFilter("all")}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: `1.5px solid ${tagFilter === "all" ? "#f59e0b" : "#e5e7eb"}`,
                    background: tagFilter === "all" ? "#fef3c7" : "white",
                    color: tagFilter === "all" ? "#92400e" : "#6b7280",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  All Tags
                </button>
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: `1.5px solid ${tagFilter === tag ? TAG_COLOR[tag]?.color || "#f59e0b" : "#e5e7eb"}`,
                      background: tagFilter === tag ? TAG_COLOR[tag]?.bg || "#fef3c7" : "white",
                      color: tagFilter === tag ? TAG_COLOR[tag]?.color || "#92400e" : "#6b7280",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <SectionCard title="🎯 Priority Matrix — Frequency vs Impact">
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
                  Bubble size = number of suggestions · Position = frequency (x) vs impact (y)
                </div>
                <div style={{ position: "relative", height: 220, background: "#f9fafb", borderRadius: 12, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: "#d1d5db", fontWeight: 700 }}>HIGH IMPACT · LOW FREQUENCY</div>
                  <div style={{ position: "absolute", top: 8, right: 8, fontSize: 10, color: "#d1d5db", fontWeight: 700 }}>HIGH IMPACT · HIGH FREQUENCY</div>
                  <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 10, color: "#d1d5db", fontWeight: 700 }}>LOW IMPACT · LOW FREQUENCY</div>
                  <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, color: "#d1d5db", fontWeight: 700 }}>LOW IMPACT · HIGH FREQUENCY</div>
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#e5e7eb" }} />
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#e5e7eb" }} />
                  {tagStats.map((ts, i) => {
                    const maxFreq = Math.max(...tagStats.map((x) => x.freq), 1);
                    const x = (ts.freq / maxFreq) * 75 + 5;
                    const y = 85 - ((ts.impact / 100) * 75);
                    const size = 24 + (ts.freq / maxFreq) * 32;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: "translate(-50%,-50%)",
                          width: size,
                          height: size,
                          borderRadius: "50%",
                          background: TAG_COLOR[ts.tag]?.bg || "#fef3c7",
                          border: `2px solid ${TAG_COLOR[ts.tag]?.color || "#f59e0b"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 2,
                        }}
                        title={`${ts.tag}: ${ts.freq} suggestions`}
                      >
                        <span style={{ fontSize: 9, fontWeight: 800, color: TAG_COLOR[ts.tag]?.color || "#92400e", textAlign: "center", lineHeight: 1.2 }}>
                          {ts.freq}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                  {tagStats.map((ts, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: TAG_COLOR[ts.tag]?.bg, border: `1.5px solid ${TAG_COLOR[ts.tag]?.color}` }} />
                      <span style={{ fontSize: 11, color: "#6b7280" }}>
                        {ts.tag} ({ts.freq})
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14, marginBottom: 20 }}>
                {tagStats
                  .filter((ts) => tagFilter === "all" || ts.tag === tagFilter)
                  .map((ts, i) => (
                    <div
                      key={i}
                      style={{
                        background: "white",
                        borderRadius: 14,
                        padding: "16px",
                        border: `1px solid ${TAG_COLOR[ts.tag]?.color || "#e5e7eb"}30`,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                            background: TAG_COLOR[ts.tag]?.bg || "#f3f4f6",
                            color: TAG_COLOR[ts.tag]?.color || "#6b7280",
                          }}
                        >
                          {ts.tag}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: TAG_COLOR[ts.tag]?.color || "#6b7280" }}>{ts.freq}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>suggestions</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
                        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "6px 10px", flex: 1, textAlign: "center" }}>
                          <div style={{ fontWeight: 700, color: "#1c1917" }}>{ts.impact}%</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>Impact Score</div>
                        </div>
                        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "6px 10px", flex: 1, textAlign: "center" }}>
                          <div style={{ fontWeight: 700, color: "#1c1917" }}>{ts.items.filter((x) => x.status === "pending").length}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>Pending</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {ts.items.slice(0, 3).map((item, j) => (
                          <div key={j} style={{ fontSize: 11, color: "#6b7280", padding: "6px 8px", background: "#f9fafb", borderRadius: 6, lineHeight: 1.4 }}>
                            "{item.suggestion.substring(0, 65)}..."
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>


            </div>
          )}
        </>
      )}
    </div>
  );
}
