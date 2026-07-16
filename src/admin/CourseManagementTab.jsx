import { useState, useEffect } from "react";
import { Modal, S, SearchBar, StatCard, Toast } from "../components/Shared";

const API = '/api';

export default function CourseManagementTab({ setToast }) {
  const [courses, setCourses] = useState([]);
  const [centers, setCenters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterCenter, setFilterCenter] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [detailCourse, setDetailCourse] = useState(null);
  const [toast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  useEffect(() => {
    async function fetchData() {
      try {
        const [coursesRes, centersRes] = await Promise.all([
          fetch(`${API}/courses`),
          fetch(`${API}/centers`)
        ]);
        const coursesData = await coursesRes.json();
        const centersData = await centersRes.json();
        setCourses(coursesData);
        setCenters(centersData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch:", err);
        showToast({ msg: "Failed to load courses from database", type: "error" });
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categories = [...new Set(courses.map(c => c.category).filter(Boolean))];

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
    const cId = c.center?._id || c.center;
    const matchCenter = !filterCenter || cId === filterCenter;
    const matchCat = !filterCategory || c.category === filterCategory;
    return matchSearch && matchCenter && matchCat;
  });

  const active = courses.filter(c => c.status === 'active').length;
  const totalModules = courses.reduce((sum, c) => sum + (c.modules?.length || 0), 0);

  const getCategoryColor = (cat) => {
    const colors = {
      'Foundation': '#8b5cf6', 'Language': '#3b82f6', 'Mathematics': '#10b981',
      'Creative Arts': '#f59e0b', 'Special Education': '#ef4444'
    };
    return colors[cat] || '#6b7280';
  };

  const getLevelBadge = (level) => {
    const colors = { 'Beginner': '#10b981', 'Intermediate': '#3b82f6', 'Advanced': '#ef4444' };
    const color = colors[level] || '#6b7280';
    return (
      <span style={{ background: `${color}20`, color, padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
        {level}
      </span>
    );
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this course?')) return;
    try {
      const res = await fetch(`${API}/courses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c._id !== id));
        showToast({ msg: "Course deleted", type: "success" });
      }
    } catch (err) {
      showToast({ msg: "Failed to delete", type: "error" });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Loading courses from database...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease", fontFamily: "inherit" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {detailCourse && (
        <Modal title={detailCourse.title} onClose={() => setDetailCourse(null)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {getLevelBadge(detailCourse.level)}
              <span style={{ background: `${getCategoryColor(detailCourse.category)}20`, color: getCategoryColor(detailCourse.category), padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                {detailCourse.category}
              </span>
              <span style={{ background: "#f1f5f9", color: "#64748b", padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                {detailCourse.duration}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7, marginBottom: 16 }}>
              {detailCourse.description}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Center</div>
              <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{detailCourse.center?.name || "N/A"}</div>
            </div>
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Assigned Teachers</div>
              <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
                {(detailCourse.assignedTeachers || []).map(t => t.name).join(', ') || "None"}
              </div>
            </div>
          </div>

          {/* Modules List */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
              Course Modules ({detailCourse.modules?.length || 0})
            </div>
            {(detailCourse.modules || []).map((mod, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6", marginBottom: 8
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "linear-gradient(135deg, #ede9fe, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{mod.title}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{mod.description}</div>
                </div>
                <span style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 700, background: "#ede9fe", padding: "3px 8px", borderRadius: 8 }}>
                  {mod.duration}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={S.pageTitle}>Course Management</h1>
        <p style={S.pageSub}>{courses.length} courses · {totalModules} total modules across all courses</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard icon="📚" label="Total Courses" val={courses.length} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="✅" label="Active Courses" val={active} color="#10b981" bg="#d1fae5" />
        <StatCard icon="📖" label="Total Modules" val={totalModules} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="🏫" label="Categories" val={categories.length} color="#f59e0b" bg="#fef3c7" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." />
        </div>
        <select style={{ ...S.input, width: "auto", minWidth: 200 }} value={filterCenter}
          onChange={e => setFilterCenter(e.target.value)}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select style={{ ...S.input, width: "auto", minWidth: 160 }} value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* Courses Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 16 }}>
        {filtered.map(c => {
          const centerObj = centers.find(ce => ce._id === (c.center?._id || c.center));
          const teacherNames = (c.assignedTeachers || []).map(t => t.name).join(', ');
          const moduleCount = c.modules?.length || 0;
          const catColor = getCategoryColor(c.category);

          return (
            <div key={c._id} style={{
              background: "white", borderRadius: 18, padding: 22,
              border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              borderTop: `4px solid ${catColor}`
            }}>
              {/* Top */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14,
                  background: `linear-gradient(135deg, ${catColor}20, ${catColor})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, flexShrink: 0
                }}>📚</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{c.title}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {getLevelBadge(c.level)}
                    <span style={{
                      background: `${catColor}20`, color: catColor,
                      padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700
                    }}>{c.category}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14, lineHeight: 1.5 }}>
                {c.description?.length > 150 ? c.description.substring(0, 150) + "..." : c.description}
              </p>

              {/* Info */}
              <div style={{
                display: "flex", flexDirection: "column", gap: 4, padding: 12,
                background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6", marginBottom: 14
              }}>
                <div style={{ fontSize: 12, color: "#374151" }}>
                  <span style={{ color: "#9ca3af" }}>🏫</span> {centerObj?.name || "N/A"}
                </div>
                {teacherNames && (
                  <div style={{ fontSize: 12, color: "#374151" }}>
                    <span style={{ color: "#9ca3af" }}>👩‍🏫</span> {teacherNames}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#374151" }}>
                  <span style={{ color: "#9ca3af" }}>📖</span> {moduleCount} modules · {c.duration}
                </div>
              </div>

              {/* Module Preview */}
              {moduleCount > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 6 }}>Modules</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.modules.slice(0, 3).map((m, i) => (
                      <span key={i} style={{
                        background: "#ede9fe", color: "#6d28d9",
                        padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600
                      }}>
                        {m.title}
                      </span>
                    ))}
                    {moduleCount > 3 && (
                      <span style={{ background: "#f1f5f9", color: "#64748b", padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>
                        +{moduleCount - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <button onClick={() => setDetailCourse(c)} style={{ ...S.tblBtn, flex: 1, color: "#4f46e5", borderColor: "#c4b5fd" }}>
                  View Details
                </button>
                <button onClick={() => handleDelete(c._id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No courses found</div>
        </div>
      )}
    </div>
  );
}