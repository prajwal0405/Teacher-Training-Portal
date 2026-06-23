import { useState, useEffect, useMemo } from "react";
import { Modal, S, SearchBar, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getActivities, reviewActivity, getCenters } from "../services/api";
import { t } from "../services/i18n";

// BUG FIX: was hardcoded to http://localhost:5000, which breaks in any
// non-local environment. Now reuses the same base URL the API layer uses.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const REJECT_REASONS = [
  "Incomplete documentation",
  "Missing student attendance data",
  "Photo quality insufficient",
  "Activity does not match curriculum",
  "Duplicate submission",
  "Outside scheduled class time",
  "Other",
];

const API = '/api';

export default function ActivityMonitoringTab({ setToast }) {
  const [activities, setActivities] = useState([]);
  const [centers, setCenters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterCenter, setFilterCenter] = useState("");
  const [filterType, setFilterType] = useState("");
  const [detailActivity, setDetailActivity] = useState(null);
  const [toast, setLocalToast] = useState({ msg: "", type: "" });

  const showToast = setToast || setLocalToast;

  useEffect(() => {
    async function fetchData() {
      try {
        const [activitiesRes, centersRes] = await Promise.all([
          fetch(`${API}/activities`),
          fetch(`${API}/centers`)
        ]);
        const activitiesData = await activitiesRes.json();
        const centersData = await centersRes.json();
        setActivities(activitiesData);
        setCenters(centersData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch:", err);
        showToast({ msg: "Failed to load activities from database", type: "error" });
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = activities.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q);
    const cId = a.center?._id || a.center;
    const matchCenter = !filterCenter || cId === filterCenter;
    const matchType = !filterType || a.type === filterType;
    return matchSearch && matchCenter && matchType;
  });

  const photos = activities.filter(a => a.type === 'photo').length;
  const videos = activities.filter(a => a.type === 'video').length;
  const docs = activities.filter(a => a.type === 'document').length;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'photo': return '📸';
      case 'video': return '🎥';
      case 'document': return '📄';
      default: return '📋';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'photo': return '#3b82f6';
      case 'video': return '#ef4444';
      case 'document': return '#10b981';
      default: return '#6b7280';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this activity?')) return;
    try {
      const res = await fetch(`${API}/activities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActivities(prev => prev.filter(a => a._id !== id));
        showToast({ msg: "Activity deleted", type: "success" });
      }
    } catch (err) {
      showToast({ msg: "Failed to delete", type: "error" });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Loading activities from database...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease", fontFamily: "inherit" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {detailActivity && (
        <Modal title={`Activity: ${detailActivity.title}`} onClose={() => setDetailActivity(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { icon: "📂", label: "Type", val: detailActivity.type },
              { icon: "📅", label: "Date", val: detailActivity.date?.split('T')[0] || "N/A" },
              { icon: "🏫", label: "Center", val: detailActivity.center?.name || "N/A" },
              { icon: "👩‍🏫", label: "Teacher", val: detailActivity.teacher?.name || "N/A" },
              { icon: "👶", label: "Children", val: (detailActivity.children || []).length + " tagged" },
              { icon: "📝", label: "Status", val: detailActivity.status },
            ].map((r, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{r.icon} {r.val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
              {detailActivity.description || "No description"}
            </div>
          </div>
          {detailActivity.notes && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: 13, color: "#6b7280", padding: 12, background: "#fffbeb", borderRadius: 8, border: "1px solid #fef3c7" }}>
                {detailActivity.notes}
              </div>
            </div>
          )}
          {(detailActivity.children || []).length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Tagged Children</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {detailActivity.children.map(ch => (
                  <span key={ch._id} style={{ background: "#ede9fe", color: "#6d28d9", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {ch.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Activity Monitoring</h1>
          <p style={S.pageSub}>{activities.length} total activities uploaded by teachers</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard icon="📋" label="Total Activities" val={activities.length} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="📸" label="Photos" val={photos} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="🎥" label="Videos" val={videos} color="#ef4444" bg="#fee2e2" />
        <StatCard icon="📄" label="Documents" val={docs} color="#10b981" bg="#d1fae5" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search activities..." />
        </div>
        <select style={{ ...S.input, width: "auto", minWidth: 160 }} value={filterCenter}
          onChange={e => setFilterCenter(e.target.value)}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select style={{ ...S.input, width: "auto", minWidth: 130 }} value={filterType}
          onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="photo">Photos</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>
      </div>

      {/* Activities Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
        {filtered.map(a => {
          const centerObj = centers.find(c => c._id === (a.center?._id || a.center));
          const teacherName = a.teacher?.name || "Unknown";
          const childCount = (a.children || []).length;
          const dateStr = a.date?.split('T')[0] || "N/A";

          return (
            <div key={a._id} style={{
              background: "white", borderRadius: 16, padding: 20,
              border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              borderLeft: `4px solid ${getTypeColor(a.type)}`
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${getTypeColor(a.type)}15`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0
                }}>
                  {getTypeIcon(a.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {a.type?.toUpperCase()} · {dateStr}
                  </div>
                </div>
                <span style={{
                  background: `${getTypeColor(a.type)}20`, color: getTypeColor(a.type),
                  padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700
                }}>
                  {a.type}
                </span>
              </div>

              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14, lineHeight: 1.5 }}>
                {a.description?.length > 120 ? a.description.substring(0, 120) + "..." : a.description}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12, background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6", marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#374151" }}>
                  <span style={{ color: "#9ca3af" }}>🏫</span> {centerObj?.name || "N/A"}
                </div>
                <div style={{ fontSize: 12, color: "#374151" }}>
                  <span style={{ color: "#9ca3af" }}>👩‍🏫</span> {teacherName}
                </div>
                {childCount > 0 && (
                  <div style={{ fontSize: 12, color: "#374151" }}>
                    <span style={{ color: "#9ca3af" }}>👶</span> {childCount} children tagged
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setDetailActivity(a)} style={{ ...S.tblBtn, flex: 1, color: "#4f46e5", borderColor: "#c4b5fd" }}>
                  View
                </button>
                <button onClick={() => handleDelete(a._id)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No activities found</div>
        </div>
      )}
    </div>
  );
}
