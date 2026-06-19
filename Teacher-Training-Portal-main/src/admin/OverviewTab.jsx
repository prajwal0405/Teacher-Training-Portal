import { useState } from "react";
import { AttendanceBar, BarChart, S, SectionCard, StatCard, StatusBadge } from "../components/Shared";
import { MONTHLY_ENROLLMENT, MONTHLY_REVENUE } from "../data/mockData";

export default function OverviewTab({ teachers, courses, batches, sessions }) {
  /*const [activePeriod, setActivePeriod] = useState("12m");
  const [activities, setActivities] = useState([
    { id:1, action:"Teacher Approved", target:"Priya Sharma", time:"2 mins ago", icon:"✅", type:"success" },
    { id:2, action:"Course Published", target:"NEP 2020 & FLN", time:"15 mins ago", icon:"📚", type:"info" },
    { id:3, action:"New Registration", target:"Anita Joshi", time:"28 mins ago", icon:"👩‍🏫", type:"warning" },
    { id:4, action:"Assignment Submitted", target:"Rahul Verma", time:"1 hr ago", icon:"📝", type:"info" },
    { id:5, action:"Batch Created", target:"Batch C — Jun 2026", time:"2 hrs ago", icon:"🗂️", type:"success" },
    { id:6, action:"Certificate Issued", target:"Meera Patel", time:"3 hrs ago", icon:"🏅", type:"success" },
    { id:7, action:"Session Completed", target:"Classroom Management", time:"4 hrs ago", icon:"🎥", type:"info" },
    { id:8, action:"Revenue Received", target:"₹45,000", time:"5 hrs ago", icon:"💰", type:"success" },
    { id:9, action:"Feedback Received", target:"Neha Joshi", time:"6 hrs ago", icon:"💬", type:"warning" },
    { id:10, action:"Trainer Added", target:"Dr. Vikram Shah", time:"8 hrs ago", icon:"🎓", type:"info" },
  ]); */

  // Calculate metrics
  const approved = teachers.filter(t => t.status === "approved");
  //const pending = teachers.filter(t => t.status === "pending");
  //const totalRevenue = teachers.reduce((a, t) => a + t.revenue, 0);
  
  // MTD Revenue calculation (simplified - assume May 2026)
  //const mtdRevenue = courses.reduce((a, c) => c.status === "published" ? a + (c.revenue / 12 * 5) : a, 0);
  // YTD Revenue (Jan-May 2026)
  //const ytdRevenue = courses.reduce((a, c) => c.status === "published" ? a + (c.revenue / 12 * 5) : a, 0);
  
  const avgAttendance = approved.length ? Math.round(approved.reduce((a, t) => a + t.attendance, 0) / approved.length) : 0;
  const completionRate = courses.filter(c => c.status === "published").length
    ? Math.round(courses.filter(c => c.status === "published").reduce((a, c) => a + c.completion, 0) / courses.filter(c => c.status === "published").length)
    : 0;
  
  // Teachers MoM growth (simulated - compare this month vs last month)
  const teacherGrowth = 12; // +12% vs last month
  const learnerGrowth = 8; // +8% vs last month
  const revenueGrowth = 23; // +23% vs last month

  // AI Insights (simulated data)
  /*const aiAnomaly = {
    enrollmentDrop: false,
    completionDrop: true, // Flag completion rate drop in Batch B
    anomalyDetails: "Completion rate dropped 15% in Montessori Teacher Training batch",
    severity: "medium"
  };
  
  const revenueForecast = {
    day30: 285000,
    day60: 320000,
    day90: 365000,
    confidence: 87
  };
  
  const churnRisks = teachers.filter(t => t.status === "approved" && t.attendance < 60);
  
  // Flagged posts (simulated)
  const flaggedPosts = [
    { id:1, title:" inappropriate content in discussion", author:"User_Anonymous", reported:"2 hrs ago", severity:"high" },
    { id:2, title:"Spam/Advertising detected", author:"External_Bot", reported:"5 hrs ago", severity:"medium" },
  ];*/

  return (
  <div style={{ animation:"fadeIn 0.3s ease" }}>

    {/* Header */}
    <div style={{ marginBottom:24 }}>
      <h1 style={S.pageTitle}>Admin Dashboard 👋</h1>
      <p style={S.pageSub}>
        Here's your SpacECE platform overview for today — {new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
      </p>
    </div>

    {/* KPI Cards */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:16, marginBottom:24 }}>
      <StatCard icon="🏫" label="Total Centers"     val={12}                color="#f59e0b" bg="#fef3c7" sub="Active training centers"/>
      <StatCard icon="👩‍🏫" label="Total Teachers"    val={teachers.length}   color="#10b981" bg="#d1fae5" sub={`+${teacherGrowth}% this month`}/>
      <StatCard icon="👶" label="Total Children"    val={1284}              color="#3b82f6" bg="#dbeafe" sub="Enrolled across all centers"/>
      <StatCard icon="📊" label="Avg Attendance"    val={`${avgAttendance}%`} color="#8b5cf6" bg="#ede9fe" sub="Teachers & children today"/>
      <StatCard icon="🎓" label="Course Completion" val={`${completionRate}%`} color="#06b6d4" bg="#cffafe" sub="Completed vs in-progress"/>
      <StatCard icon="📋" label="Activity Uploads"  val={47}                color="#ef4444" bg="#fee2e2" sub="Submitted this week"/>
    </div>

    {/* Attendance Overview + Course Completion */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
      <SectionCard title="📅 Attendance Overview — Today">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {[
            { label:"Teachers Present",      val:"18/22",      pct:82, color:"#10b981" },
            { label:"Children Present",      val:"1,102/1,284", pct:86, color:"#3b82f6" },
            { label:"This Week (Teachers)",  val:"91%",         pct:91, color:"#f59e0b" },
            { label:"This Week (Children)",  val:"88%",         pct:88, color:"#8b5cf6" },
          ].map((item,i) => (
            <div key={i} style={{ background:"#f9fafb", borderRadius:12, padding:"12px 14px", border:"1px solid #f1f5f9" }}>
              <div style={{ fontSize:11, color:"#9ca3af", marginBottom:4 }}>{item.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#1c1917" }}>{item.val}</div>
              <div style={{ height:5, background:"#e5e7eb", borderRadius:4, overflow:"hidden", marginTop:8 }}>
                <div style={{ height:"100%", width:`${item.pct}%`, background:item.color, borderRadius:4 }}/>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="🎓 Course Completion Status">
        {[
          { label:"Completed",   val:312, pct:52, color:"#10b981" },
          { label:"In Progress", val:198, pct:33, color:"#f59e0b" },
          { label:"Not Started", val:91,  pct:15, color:"#ef4444" },
        ].map((item,i) => (
          <div key={i} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{item.label}</span>
              <span style={{ fontSize:13, fontWeight:800, color:item.color }}>{item.val} ({item.pct}%)</span>
            </div>
            <div style={{ height:8, background:"#f3f4f6", borderRadius:6, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${item.pct}%`, background:item.color, borderRadius:6 }}/>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>

    {/* Teacher Progress + Activity Upload */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
      <SectionCard title="👩‍🏫 Teacher Training Progress">
        {teachers.filter(t=>t.status==="approved").slice(0,5).map((t,i) => (
          <div key={i} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{t.name}</span>
              <span style={{ fontSize:12, fontWeight:700, color:t.attendance>=75?"#10b981":t.attendance>=60?"#f59e0b":"#ef4444" }}>{t.attendance}%</span>
            </div>
            <div style={{ height:6, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${t.attendance}%`, background:t.attendance>=75?"#10b981":t.attendance>=60?"#f59e0b":"#ef4444", borderRadius:4 }}/>
            </div>
            <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{t.course || "—"} · {t.batch || "—"}</div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="📤 Activity Upload Summary">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {[
            { label:"Uploaded Today",     val:12, icon:"📅", color:"#10b981", bg:"#d1fae5" },
            { label:"Uploaded This Week", val:47, icon:"📆", color:"#3b82f6", bg:"#dbeafe" },
            { label:"Pending Review",     val:8,  icon:"⏳", color:"#f59e0b", bg:"#fef3c7" },
            { label:"Rejected",           val:3,  icon:"❌", color:"#ef4444", bg:"#fee2e2" },
          ].map((item,i) => (
            <div key={i} style={{ background:item.bg, borderRadius:12, padding:"12px 14px", border:`1px solid ${item.color}30`, textAlign:"center" }}>
              <div style={{ fontSize:20 }}>{item.icon}</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#1c1917", marginTop:4 }}>{item.val}</div>
              <div style={{ fontSize:11, color:item.color, fontWeight:700 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <button style={{ ...S.primaryBtn, width:"100%", fontSize:12 }}>📋 View All Activity Reports →</button>
      </SectionCard>
    </div>

  </div>
);

  
}
