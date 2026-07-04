import { useEffect } from "react";
import logo from "../assets/logo.png";

/* ── Logo ── */
export function Logo({ size = 130 }) {
  return (
    <div style={{ display:"flex", justifyContent:"center", marginBottom:4 }}>
      <img src={logo} alt="SpacECE" style={{ width:size, objectFit:"contain" }}/>
    </div>
  );
}

/* ── Toast ── */
export function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", top:20, left:"50%", transform:"translateX(-50%)",
      padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:600, color:"white",
      background: type==="success" ? "#10b981" : "#ef4444",
      display:"flex", alignItems:"center", gap:10, zIndex:9999,
      minWidth:280, boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
      fontFamily:"inherit", animation:"fadeIn 0.3s ease",
    }}>
      <span>{type==="success" ? "✓" : "!"}</span>
      {msg}
      <button onClick={onClose} style={{ background:"none", border:"none", color:"white", cursor:"pointer", marginLeft:"auto", fontSize:13, fontWeight:700 }}>✕</button>
    </div>
  );
}

/* ── Badge ── */
export function Badge({ children, color="#f59e0b", bg="#fef3c7" }) {
  return (
    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
      color, background:bg, border:`1px solid ${color}40`, letterSpacing:"0.3px" }}>
      {children}
    </span>
  );
}

/* ── StatusBadge ── */
export function StatusBadge({ status }) {
  const map = {
    approved:    { label:"Active",       color:"#059669", bg:"#d1fae5" },
    pending:     { label:"Pending",      color:"#d97706", bg:"#fef3c7" },
    rejected:    { label:"Rejected",     color:"#dc2626", bg:"#fee2e2" },
    blocked:     { label:"Blocked",      color:"#991b1b", bg:"#fecaca" },
    published:   { label:"Published",    color:"#059669", bg:"#d1fae5" },
    draft:       { label:"Draft",        color:"#6b7280", bg:"#f3f4f6" },
    coming_soon: { label:"Coming Soon",  color:"#2563eb", bg:"#dbeafe" },
    archived:    { label:"Archived",     color:"#9ca3af", bg:"#f9fafb" },
    active:      { label:"Active",       color:"#059669", bg:"#d1fae5" },
    upcoming:    { label:"Upcoming",     color:"#2563eb", bg:"#dbeafe" },
    completed:   { label:"Completed",    color:"#7c3aed", bg:"#ede9fe" },
    inactive:    { label:"Inactive",     color:"#6b7280", bg:"#f3f4f6" },
    reviewed:    { label:"Reviewed",     color:"#059669", bg:"#d1fae5" },
    revision:    { label:"Revision",     color:"#d97706", bg:"#fef3c7" },
    issued:      { label:"Issued",       color:"#059669", bg:"#d1fae5" },
    queued:      { label:"Queued",       color:"#d97706", bg:"#fef3c7" },
    verified:    { label:"Verified",     color:"#2563eb", bg:"#dbeafe" },
    open:        { label:"Open",         color:"#d97706", bg:"#fef3c7" },
    resolved:    { label:"Resolved",     color:"#059669", bg:"#d1fae5" },
    flagged:     { label:"Flagged",      color:"#dc2626", bg:"#fee2e2" },
    sent:        { label:"Sent",         color:"#2563eb", bg:"#dbeafe" },
    delivered:   { label:"Delivered",    color:"#059669", bg:"#d1fae5" },
    failed:      { label:"Failed",       color:"#dc2626", bg:"#fee2e2" },
  };
  const s = map[status] || { label:status, color:"#6b7280", bg:"#f3f4f6" };
  return (
    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
      color:s.color, background:s.bg, border:`1px solid ${s.color}30`, letterSpacing:"0.3px", whiteSpace:"nowrap" }}>
      {s.label}
    </span>
  );
}

/* ── StatCard ── */
export function StatCard({ icon, label, val, sub, color="#f59e0b", bg="#fef3c7", onClick }) {
  return (
    <div onClick={onClick} style={{ background:"white", borderRadius:16, padding:"20px",
      border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
      borderTop:`3px solid ${color}`, cursor:onClick?"pointer":"default" }}>
      <div style={{ width:44, height:44, borderRadius:12, background:bg,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:26, fontWeight:800, color:"#1c1917", letterSpacing:"-1px" }}>{val}</div>
      <div style={{ fontSize:12, color:"#6b7280", fontWeight:500, marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color, fontWeight:600, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

/* ── SectionCard ── */
export function SectionCard({ title, children, action }) {
  return (
    <div style={{ background:"white", borderRadius:16, padding:"20px 24px",
      border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:800, color:"#1c1917", margin:0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Modal ── */
export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"white", borderRadius:20, padding:"28px", width:"100%",
        maxWidth:520, boxShadow:"0 20px 60px rgba(0,0,0,0.2)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontSize:17, fontWeight:800, color:"#1c1917", margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#9ca3af" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── SearchBar ── */
export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position:"relative", marginBottom:16, flex:1 }}>
      <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14 }}>🔍</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"Search..."}
        style={{ width:"100%", padding:"9px 12px 9px 34px", background:"white",
          border:"1.5px solid #e5e7eb", borderRadius:10, fontSize:13, fontFamily:"inherit",
          outline:"none", boxSizing:"border-box", color:"#111827" }}/>
    </div>
  );
}

/* ── BarChart ── */
export function BarChart({ data, color="#f59e0b", height=100, formatVal }) {
  const max = Math.max(...data.map(d=>d.val));
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:height+30 }}>
      {data.map((d,i)=>(
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:9, fontWeight:700, color:"#9ca3af", textAlign:"center" }}>
            {formatVal ? formatVal(d.val) : d.val}
          </span>
          <div style={{ width:"100%", background:color, borderRadius:"4px 4px 0 0",
            height:`${(d.val/max)*height}px`, opacity:0.85, minHeight:4 }}/>
          <span style={{ fontSize:9, color:"#9ca3af", fontWeight:600, textAlign:"center", whiteSpace:"nowrap" }}>
            {d.month||d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── AttendanceBar ── */
export function AttendanceBar({ val, name }) {
  const c = val>=85 ? "#10b981" : val>=70 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:12, color:"#374151", fontWeight:600 }}>{name}</span>
        <span style={{ fontSize:12, fontWeight:700, color:c }}>{val}%</span>
      </div>
      <div style={{ height:6, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${val}%`, background:c, borderRadius:4, transition:"width 1s" }}/>
      </div>
    </div>
  );
}

/* ── Particles Background ── */
export function Particles() {
  const shapes = Array.from({ length:18 }, (_,i) => ({
    id:i, size:8+(i*7)%18, left:(i*17)%100, delay:(i*0.6)%8, dur:10+(i*1.3)%10,
    type:i%3, color:["#f59e0b","#d97706","#0f172a","#10b981","#059669"][i%5],
    opacity:0.07+(i%3)*0.04,
  }));
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      {shapes.map(p=>(
        <div key={p.id} style={{
          position:"absolute", bottom:"-40px", left:`${p.left}%`,
          width:p.size, height:p.size, opacity:p.opacity,
          borderRadius:p.type===0?"50%":p.type===1?"3px":"0",
          background:p.type===2?"none":p.color,
          border:p.type===2?`2px solid ${p.color}`:"none",
          transform:p.type===2?"rotate(45deg)":"none",
          animation:`riseUp ${p.dur}s ${p.delay}s linear infinite`,
        }}/>
      ))}
    </div>
  );
}

/* ── Shared Styles ── */
export const S = {
  pageTitle: { fontSize:24, fontWeight:900, color:"#0f172a", margin:"0 0 4px", letterSpacing:"-0.5px" },
  pageSub:   { fontSize:13, color:"#64748b", margin:"0 0 24px", fontWeight:500 },
  backBtn:   { background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:"#d97706", marginBottom:20, padding:0, display:"flex", alignItems:"center", gap:6, transition:"all 0.2s ease" },
  primaryBtn:{ padding:"10px 20px", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"white", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 12px rgba(217,119,6,0.25)", whiteSpace:"nowrap", transition:"all 0.2s ease" },
  exportBtn: { padding:"7px 14px", background:"white", color:"#475569", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s ease" },
  btnGreen:  { padding:"7px 14px", background:"#d1fae5", color:"#065f46", border:"1px solid #6ee7b7", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s ease" },
  btnRed:    { padding:"7px 14px", background:"#fee2e2", color:"#991b1b", border:"1px solid #fca5a5", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s ease" },
  btnOrange: { padding:"7px 14px", background:"#fef3c7", color:"#92400e", border:"1px solid #fbbf24", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s ease" },
  tblBtn:    { padding:"5px 10px", background:"white", color:"#475569", border:"1px solid #e2e8f0", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", transition:"all 0.2s ease" },
  label:     { display:"block", fontSize:12, color:"#334155", marginBottom:5, fontWeight:600, letterSpacing:"0.3px" },
  input:     { width:"100%", padding:"10px 14px", background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:10, color:"#0f172a", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", transition:"all 0.2s ease" },
  fieldIcon: { position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" },
};

/* ── Global CSS ── */
export const globalCSS = `
  @keyframes riseUp {
    0%   { transform:translateY(0) rotate(0deg); opacity:0; }
    10%  { opacity:1; }
    90%  { opacity:0.8; }
    100% { transform:translateY(-95vh) rotate(180deg); opacity:0; }
  }
  @keyframes fadeIn {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes slideDown {
    from { opacity:0; transform:translateX(-50%) translateY(-10px); }
    to   { opacity:1; transform:translateX(-50%) translateY(0); }
  }
  @keyframes ringPulse {
    from { transform:translate(-50%,-50%) scale(1); opacity:0.5; }
    to   { transform:translate(-50%,-50%) scale(1.08); opacity:1; }
  }
  @keyframes morphA {
    0%   { border-radius:60% 40% 70% 30%/50% 60% 40% 50%; transform:translate(-4px,-6px); }
    50%  { border-radius:40% 60% 30% 70%/60% 40% 60% 40%; transform:translate(6px,4px) scale(1.05); }
    100% { border-radius:70% 30% 50% 50%/30% 70% 50% 60%; transform:translate(-2px,6px); }
  }
  @keyframes morphB {
    0%   { border-radius:50% 50% 40% 60%/60% 40% 70% 30%; transform:translate(6px,4px); }
    100% { border-radius:30% 70% 60% 40%/40% 60% 30% 70%; transform:translate(-6px,-4px) scale(1.08); }
  }
  @keyframes morphC {
    0%   { border-radius:40% 60% 50% 50%/50% 50% 60% 40%; transform:translate(2px,-6px); }
    100% { border-radius:60% 40% 30% 70%/70% 30% 40% 60%; transform:translate(-4px,6px) scale(1.06); }
  }
  @keyframes capBob {
    from { transform:translate(-50%,-52%) rotate(-6deg) scale(1); }
    to   { transform:translate(-50%,-46%) rotate(6deg) scale(1.08); }
  }
  @keyframes spin  { from { transform:rotate(0deg);  } to { transform:rotate(360deg);  } }
  @keyframes spinR { from { transform:rotate(0deg);  } to { transform:rotate(-360deg); } }
  @keyframes progress { 0% { width: 0%; } 50% { width: 85%; } 100% { width: 98%; } }
  @keyframes chipFloat {
    from { transform:translateY(0);    box-shadow:0 4px 14px rgba(0,0,0,0.07); }
    to   { transform:translateY(-9px); box-shadow:0 12px 28px rgba(0,0,0,0.12); }
  }
  .glow-ring { position:absolute; border-radius:50%; top:50%; left:50%; transform:translate(-50%,-50%); border:1.5px solid transparent; pointer-events:none; }
  .ring-1 { width:300px; height:300px; border-color:rgba(245,158,11,0.25); animation:ringPulse 4s ease-in-out infinite alternate; }
  .ring-2 { width:220px; height:220px; border-color:rgba(217,119,6,0.3);  animation:ringPulse 3s 0.8s ease-in-out infinite alternate; }
  .ring-3 { width:150px; height:150px; border-color:rgba(15,23,42,0.15);  animation:ringPulse 3.5s 1.4s ease-in-out infinite alternate; }
  .blob-wrap { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:120px; height:120px; }
  .blob { position:absolute; top:0; left:0; width:120px; height:120px; border-radius:50%; mix-blend-mode:multiply; opacity:0.6; }
  .blob-a { background:radial-gradient(circle at 40% 40%,#f59e0b,#fbbf24); animation:morphA 6s ease-in-out infinite alternate; }
  .blob-b { background:radial-gradient(circle at 60% 35%,#d97706,#fdba74); animation:morphB 7s ease-in-out infinite alternate; }
  .blob-c { background:radial-gradient(circle at 50% 65%,#92400e,#f59e0b); animation:morphC 5s ease-in-out infinite alternate; }
  .cap-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:38px; z-index:2; animation:capBob 3s ease-in-out infinite alternate; filter:drop-shadow(0 0 12px rgba(217,119,6,0.6)); }
  .orbit { position:absolute; top:50%; left:50%; border-radius:50%; pointer-events:none; }
  .orbit-a { width:270px; height:270px; margin:-135px 0 0 -135px; animation:spin  12s linear infinite; }
  .orbit-b { width:200px; height:200px; margin:-100px 0 0 -100px; animation:spinR 9s  linear infinite; }
  .orbit-c { width:240px; height:240px; margin:-120px 0 0 -120px; animation:spin  16s linear infinite; }
  .orbit-d { width:160px; height:160px; margin:-80px  0 0 -80px;  animation:spinR 7s  linear infinite; }
  .planet { position:absolute; top:-6px; left:50%; margin-left:-6px; width:12px; height:12px; border-radius:50%; }
  .p-blue   { background:#f59e0b; box-shadow:0 0 8px 3px rgba(245,158,11,0.5); }
  .p-violet { background:#8b5cf6; box-shadow:0 0 8px 3px rgba(139,92,246,0.5);  }
  .p-teal   { background:#10b981; box-shadow:0 0 8px 3px rgba(16,185,129,0.4);   }
  .p-amber  { background:#059669; box-shadow:0 0 8px 3px rgba(5,150,105,0.5);  }
  .chip { position:absolute; padding:6px 12px; border-radius:20px; font-size:11px; font-weight:700; font-family:'Segoe UI',sans-serif; white-space:nowrap; z-index:3; backdrop-filter:blur(6px); }
  .chip-1 { top:10px;  left:8px;  background:rgba(255,247,230,0.92); border:1.5px solid #fcd34d; color:#92400e; animation:chipFloat 3.5s 0.0s ease-in-out infinite alternate; }
  .chip-2 { top:10px;  right:8px; background:rgba(209,250,229,0.88); border:1.5px solid #6ee7b7; color:#065f46; animation:chipFloat 3.5s 0.5s ease-in-out infinite alternate; }
  .chip-3 { top:115px; left:2px;  background:rgba(243,232,255,0.88); border:1.5px solid #d8b4fe; color:#6b21a8; animation:chipFloat 3.5s 1.0s ease-in-out infinite alternate; }
  .chip-4 { top:115px; right:2px; background:rgba(252,231,243,0.88); border:1.5px solid #f9a8d4; color:#9d174d; animation:chipFloat 3.5s 0.3s ease-in-out infinite alternate; }
  .chip-5 { top:220px; left:8px;  background:rgba(255,237,213,0.88); border:1.5px solid #fdba74; color:#9a3412; animation:chipFloat 3.5s 0.8s ease-in-out infinite alternate; }
  .chip-6 { top:220px; right:8px; background:rgba(254,243,199,0.88); border:1.5px solid #fde047; color:#854d0e; animation:chipFloat 3.5s 1.3s ease-in-out infinite alternate; }
  .arcs-svg { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:340px; height:340px; pointer-events:none; z-index:0; }
  * { box-sizing:border-box; }
  
  /* Focus styles for forms */
  input:focus, select:focus, textarea:focus {
    border-color: #f59e0b !important;
    background-color: #ffffff !important;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15) !important;
  }
  
  /* Stat Card hover transitions */
  .stat-card-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .stat-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.06) !important;
  }
  
  /* Button transitions & hover state scaling */
  button {
    transition: all 0.2s ease-in-out;
  }
  button:hover {
    filter: brightness(1.05);
  }
  button:active {
    transform: scale(0.98);
  }
`;