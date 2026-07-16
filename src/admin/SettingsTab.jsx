import { useState, useEffect } from "react";
import { Logo, S, SectionCard, Toast, globalCSS } from "../components/Shared";
import { MOCK_ASSESSMENTS, MOCK_ASSIGNMENTS, MOCK_BATCHES, MOCK_CATEGORIES, MOCK_CERTIFICATES, MOCK_CONTENT_ITEMS, MOCK_COURSES, MOCK_FEEDBACKS, MOCK_SESSIONS, MOCK_TEACHERS, MOCK_TRAINERS } from "../data/mockData";
export default function SettingsTab() {
  const [portalName, setPortalName] = useState("SpacECE Teacher Training Portal");
  const [maintenance, setMaintenance] = useState(false);
  const [toast, setToast] = useState({msg:"",type:""});

  const roles = [
    { role:"Super Admin",    access:"Full access to all modules including financial and role management" },
    { role:"Admin",          access:"All modules except role management and financial reports" },
    { role:"Trainer",        access:"Content upload, assignment review, live sessions, forum" },
    { role:"Support Staff",  access:"Teacher management, notifications, feedback only" },
    { role:"Finance Manager",access:"Revenue reports, payment records, invoice generation" },
  ];

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({msg:"",type:""})}/>
      <h1 style={S.pageTitle}>Settings & Roles</h1>
      <p style={S.pageSub}>Manage portal settings, roles, and access control</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Portal Settings */}
        <SectionCard title="⚙️ Portal Settings">
          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Portal Name</label>
            <input style={S.input} value={portalName} onChange={e=>setPortalName(e.target.value)}/>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Default Language</label>
            <select style={S.input}>
              {["English","Hindi","Marathi","Tamil","Telugu"].map(l=><option key={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Timezone</label>
            <select style={S.input}>
              <option>Asia/Kolkata (IST)</option>
              <option>UTC</option>
            </select>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderTop:"1px solid #f3f4f6", marginTop:4 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>🔧 Maintenance Mode</div>
              <div style={{ fontSize:11, color:"#9ca3af" }}>Disable public access to portal</div>
            </div>
            <div onClick={()=>setMaintenance(!maintenance)}
              style={{ width:46, height:26, borderRadius:13, background:maintenance?"#ef4444":"#e5e7eb",
                position:"relative", cursor:"pointer", transition:"background 0.3s" }}>
              <div style={{ position:"absolute", top:3, left:maintenance?22:3, width:20, height:20,
                borderRadius:"50%", background:"white", transition:"left 0.3s",
                boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
            </div>
          </div>
          <button onClick={()=>setToast({msg:"Settings saved!",type:"success"})}
            style={{ ...S.primaryBtn, width:"100%", marginTop:12 }}>Save Settings</button>
        </SectionCard>

        {/* Role-Based Access */}
        <SectionCard title="🛡️ Role-Based Access Control">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {roles.map((r,i)=>(
              <div key={i} style={{ padding:"12px 14px", background:"#f9fafb", borderRadius:10, border:"1px solid #f3f4f6" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{r.role}</span>
                  <button style={S.tblBtn}>Edit</button>
                </div>
                <p style={{ fontSize:11, color:"#9ca3af", margin:0 }}>{r.access}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
