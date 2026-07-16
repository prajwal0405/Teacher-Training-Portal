import { useState } from "react";
import { AttendanceBar, BarChart, S, SectionCard, StatCard } from "../components/Shared";
import { MOCK_TRAINERS, MONTHLY_ENROLLMENT, MONTHLY_REVENUE } from "../data/mockData";
/* ── A9: Reports & Analytics ── */
export default function ReportsTab({ teachers, courses, batches }) {
  const [activeReport, setActiveReport] = useState("enrollment");
  const approved = teachers.filter(t=>t.status==="approved");
  const totalRevenue = teachers.reduce((a,t)=>a+t.revenue,0);

  const reports = [
    { key:"enrollment", label:"📋 Enrollment",  icon:"📋" },
    { key:"completion", label:"🎓 Completion",  icon:"🎓" },
    { key:"revenue",    label:"💰 Revenue",      icon:"💰" },
    { key:"attendance", label:"📊 Attendance",  icon:"📊" },
    { key:"trainer",    label:"👩‍🏫 Trainers",    icon:"👩‍🏫" },
  ];

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Reports & Analytics</h1>
      <p style={S.pageSub}>Comprehensive platform insights and data exports</p>

      {/* Summary KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
        <StatCard icon="👥" label="Total Enrolled"   val={teachers.length}      color="#f59e0b" bg="#fef3c7"/>
        <StatCard icon="✅" label="Completed"        val={approved.length}      color="#10b981" bg="#d1fae5"/>
        <StatCard icon="💰" label="Total Revenue"    val={`₹${(totalRevenue/100000).toFixed(1)}L`} color="#8b5cf6" bg="#ede9fe"/>
        <StatCard icon="📚" label="Active Courses"   val={courses.filter(c=>c.status==="published").length} color="#3b82f6" bg="#dbeafe"/>
        <StatCard icon="🗂️" label="Active Batches"   val={batches.filter(b=>b.status==="active").length}   color="#06b6d4" bg="#cffafe"/>
      </div>

      {/* Report tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {reports.map(r=>(
          <button key={r.key} onClick={()=>setActiveReport(r.key)}
            style={{ padding:"8px 16px", borderRadius:8, border:`1.5px solid ${activeReport===r.key?"#f59e0b":"#e5e7eb"}`,
              background:activeReport===r.key?"#fef3c7":"white", color:activeReport===r.key?"#92400e":"#6b7280",
              fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{r.label}</button>
        ))}
      </div>

      {activeReport==="enrollment" && (
        <SectionCard title="📋 Enrollment Report — Last 12 Months"
          action={<button style={S.exportBtn}>⬇ Export CSV</button>}>
          <BarChart data={MONTHLY_ENROLLMENT} color="#f59e0b" height={120}/>
          <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            {courses.slice(0,6).map((c,i)=>(
              <div key={i} style={{ background:"#f9fafb", borderRadius:10, padding:"10px 14px", border:"1px solid #f3f4f6" }}>
                <div style={{ fontSize:11, color:"#9ca3af", marginBottom:2 }}>{c.category}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{c.enrolled} enrolled</div>
                <div style={{ fontSize:11, color:"#6b7280" }}>{c.title.substring(0,30)}...</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeReport==="completion" && (
        <SectionCard title="🎓 Course Completion Report"
          action={<button style={S.exportBtn}>⬇ Export PDF</button>}>
          {courses.filter(c=>c.status==="published").map((c,i)=>(
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{c.title.split("(")[0].trim()}</span>
                <span style={{ fontSize:12, fontWeight:800, color:c.completion>=80?"#10b981":c.completion>=60?"#f59e0b":"#ef4444" }}>{c.completion}%</span>
              </div>
              <div style={{ height:8, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${c.completion}%`, background:c.completion>=80?"#10b981":c.completion>=60?"#f59e0b":"#ef4444", borderRadius:4 }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:2, fontSize:11, color:"#9ca3af" }}>
                <span>{c.enrolled} enrolled</span>
                <span>₹{(c.revenue/1000).toFixed(0)}k revenue</span>
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {activeReport==="revenue" && (
        <SectionCard title="💰 Revenue Report"
          action={<button style={S.exportBtn}>⬇ Export Excel</button>}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
            <div style={{ background:"#fef3c7", borderRadius:12, padding:"16px", border:"1px solid #fbbf24" }}>
              <div style={{ fontSize:11, color:"#92400e", fontWeight:700, marginBottom:4 }}>THIS MONTH</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#1c1917" }}>₹2.72L</div>
            </div>
            <div style={{ background:"#d1fae5", borderRadius:12, padding:"16px", border:"1px solid #6ee7b7" }}>
              <div style={{ fontSize:11, color:"#065f46", fontWeight:700, marginBottom:4 }}>THIS YEAR</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#1c1917" }}>₹21.9L</div>
            </div>
            <div style={{ background:"#ede9fe", borderRadius:12, padding:"16px", border:"1px solid #c4b5fd" }}>
              <div style={{ fontSize:11, color:"#5b21b6", fontWeight:700, marginBottom:4 }}>ALL TIME</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#1c1917" }}>₹{(totalRevenue/100000).toFixed(1)}L</div>
            </div>
          </div>
          <BarChart data={MONTHLY_REVENUE} color="#10b981" height={120} formatVal={v=>`${(v/1000).toFixed(0)}k`}/>
        </SectionCard>
      )}

      {activeReport==="attendance" && (
        <SectionCard title="📊 Attendance Report"
          action={<button style={S.exportBtn}>⬇ Export PDF</button>}>
          {teachers.filter(t=>t.status==="approved").map((t,i)=>(
            <AttendanceBar key={i} val={t.attendance} name={`${t.name} (${t.batch||"No batch"})`}/>
          ))}
        </SectionCard>
      )}

      {activeReport==="trainer" && (
        <SectionCard title="👩‍🏫 Trainer Performance Report"
          action={<button style={S.exportBtn}>⬇ Export CSV</button>}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:"2px solid #f3f4f6" }}>
              {["Trainer","Subject","Batches","Sessions","Rating"].map(h=>(
                <th key={h} style={{ padding:"10px 12px", fontSize:11, fontWeight:700, color:"#9ca3af", textAlign:"left", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {MOCK_TRAINERS.map((t,i)=>(
                <tr key={i} style={{ borderBottom:"1px solid #f9fafb" }}>
                  <td style={{ padding:"12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white" }}>{t.name[0]}</div>
                      <span style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>{t.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"12px", fontSize:12, color:"#6b7280" }}>{t.subject}</td>
                  <td style={{ padding:"12px", fontSize:13, fontWeight:600, color:"#374151" }}>{t.batches}</td>
                  <td style={{ padding:"12px", fontSize:13, fontWeight:600, color:"#374151" }}>{t.sessions}</td>
                  <td style={{ padding:"12px" }}><span style={{ fontSize:14, color:"#f59e0b" }}>⭐</span><span style={{ fontSize:13, fontWeight:800, color:"#1c1917" }}> {t.rating}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  );
}