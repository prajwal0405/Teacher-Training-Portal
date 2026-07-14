import { useState, useEffect } from "react";
import { getSystemHealth } from "../services/api";

export default function SystemHealthTab({ setToast }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSystemHealth()
      .then(setHealth)
      .catch(e => setToast({ msg: e.message || "Failed to load system health", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>🔄 Loading system health...</div>;
  if (!health) return <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>Failed to load system health</div>;

  const statusColor = health.status === "healthy" ? "#16a34a" : "#ef4444";
  const cards = [
    { label: "Users", value: health.counts?.users || 0, icon: "👥", color: "#2563eb" },
    { label: "Teachers", value: health.counts?.teachers || 0, icon: "👩‍🏫", color: "#7c3aed" },
    { label: "Children", value: health.counts?.children || 0, icon: "👶", color: "#f59e0b" },
    { label: "Courses", value: health.counts?.courses || 0, icon: "📚", color: "#10b981" },
    { label: "Centers", value: health.counts?.centers || 0, icon: "🏢", color: "#ef4444" },
    { label: "Classes", value: health.counts?.classes || 0, icon: "🏫", color: "#06b6d4" },
    { label: "Notifications", value: health.counts?.notifications || 0, icon: "🔔", color: "#f97316" },
    { label: "Submissions", value: health.counts?.submissions || 0, icon: "📝", color: "#8b5cf6" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🖥️ System Health</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Real-time system status and database statistics</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: statusColor + "15", border: `1px solid ${statusColor}40` }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: statusColor, textTransform: "uppercase" }}>{health.status}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "white", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{c.value.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>🗄️ Database</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>State</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: health.database?.state === "connected" ? "#16a34a" : "#ef4444" }}>{health.database?.state}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Database</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{health.database?.name}</span>
            </div>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>⚡ Server</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Uptime</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Memory Used</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{health.memory?.used} MB / {health.memory?.total} MB</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Node.js</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{health.nodeVersion}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Last Checked</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{new Date(health.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
