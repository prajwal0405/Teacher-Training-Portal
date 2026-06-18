import { useState, useEffect } from "react";
import { AttendanceBar, BarChart, S, SectionCard, StatCard, StatusBadge } from "../components/Shared";
import { MONTHLY_ENROLLMENT, MONTHLY_REVENUE } from "../data/mockData";
import { getAdminDashboard, getAdminTeachers } from "../services/api";

export default function OverviewTab({ teachers, courses, batches, sessions, children, centers, activities, attendance }) {
  // DB data
  const totalCenters = (centers || []).length;
  const totalChildren = (children || []).length;
  const totalTeachers = (teachers || []).length;
 const activeTeachers = (teachers || []).filter(t => t.status === "active" || t.status === "approved");
  const pendingTeachers = (teachers || []).filter(t => t.status === "pending");
  const allCourses = (courses || []);

  // Attendance calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const allAttendance = (attendance || []);

  const todayAtt = allAttendance.filter(a => { const d = (a.date || "").split("T")[0]; return d === todayStr; });
  const weekAtt = allAttendance.filter(a => { const d = (a.date || "").split("T")[0]; return d >= weekAgoStr && d <= todayStr; });

  const tPresentToday = todayAtt.filter(a => a.type === "teacher" && a.status === "present").length;
  const tTotalToday = todayAtt.filter(a => a.type === "teacher").length || totalTeachers;
  const cPresentToday = todayAtt.filter(a => a.type === "child" && a.status === "present").length;
  const cTotalToday = todayAtt.filter(a => a.type === "child").length || totalChildren;

  const tPresentWeek = weekAtt.filter(a => a.type === "teacher" && a.status === "present").length;
  const tTotalWeek = weekAtt.filter(a => a.type === "teacher").length || totalTeachers;
  const cPresentWeek = weekAtt.filter(a => a.type === "child" && a.status === "present").length;
  const cTotalWeek = weekAtt.filter(a => a.type === "child").length || totalChildren;

  const teacherTodayPct = tTotalToday > 0 ? Math.round((tPresentToday / tTotalToday) * 100) : 0;
  const childrenTodayPct = cTotalToday > 0 ? Math.round((cPresentToday / cTotalToday) * 100) : 0;
  const teacherWeekPct = tTotalWeek > 0 ? Math.round((tPresentWeek / tTotalWeek) * 100) : 0;
  const childrenWeekPct = cTotalWeek > 0 ? Math.round((cPresentWeek / cTotalWeek) * 100) : 0;

  const avgAttendance = allAttendance.length > 0
    ? Math.round((allAttendance.filter(a => a.status === "present").length / allAttendance.length) * 100)
    : 0;

  // Course completion
  const completedCourses = allCourses.filter(c => c.status === "completed").length;
  const inProgressCourses = allCourses.filter(c => c.status === "in-progress" || c.status === "inprogress" || c.status === "active").length;
  const notStartedCourses = allCourses.filter(c => !c.status || c.status === "not-started" || c.status === "notstarted").length;
  const totalCourses = allCourses.length;
  const completedPct = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
  const inProgressPct = totalCourses > 0 ? Math.round((inProgressCourses / totalCourses) * 100) : 0;
  const notStartedPct = totalCourses > 0 ? Math.round((notStartedCourses / totalCourses) * 100) : 0;
  const completionRate = completedPct;

  // Teacher progress
  const teacherProgress = activeTeachers.slice(0, 5);

  // Activity uploads
  const allActivities = (activities || []);
  const todayActivities = allActivities.filter(a => { const d = (a.createdAt || a.date || "").split("T")[0]; return d === todayStr; }).length;
  const weekActivities = allActivities.filter(a => { const d = (a.createdAt || a.date || "").split("T")[0]; return d >= weekAgoStr && d <= todayStr; }).length;
  const pendingActivities = allActivities.filter(a => a.status === "pending" || !a.status).length;
  const rejectedActivities = allActivities.filter(a => a.status === "rejected").length;

  const teacherGrowth = totalTeachers > 0 ? 12 : 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.pageTitle}>Admin Dashboard 👋</h1>
        <p style={S.pageSub}>
          Here's your SpacECE platform overview for today — {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard icon="🏫" label="Total Centers" val={stats?.totalCenters ?? 0} color="#f59e0b" bg="#fef3c7" sub="Active training centers" />
        <StatCard icon="👩‍🏫" label="Total Teachers" val={stats?.totalTeachers ?? teachers.length} color="#10b981" bg="#d1fae5" sub={`+${teacherGrowth}% this month`} />
        <StatCard icon="👶" label="Total Children" val={stats?.totalChildren ?? 0} color="#3b82f6" bg="#dbeafe" sub="Enrolled across all centers" />
        <StatCard icon="📊" label="Avg Attendance" val={`${avgAttendance}%`} color="#8b5cf6" bg="#ede9fe" sub="Overall teacher rate" />
        <StatCard icon="🎓" label="Course Completion" val={`${completionRate}%`} color="#06b6d4" bg="#cffafe" sub="Completed vs in-progress" />
        <StatCard icon="📋" label="Pending Activities" val={stats?.pendingActivities ?? 0} color="#ef4444" bg="#fee2e2" sub="Awaiting approval" />
      </div>

    {/* KPI Cards */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:16, marginBottom:24 }}>
      <StatCard icon="🏫" label="Total Centers"     val={totalCenters}       color="#f59e0b" bg="#fef3c7" sub="Active training centers"/>
      <StatCard icon="👩‍🏫" label="Total Teachers"    val={totalTeachers}      color="#10b981" bg="#d1fae5" sub={`+${teacherGrowth}% this month`}/>
      <StatCard icon="👶" label="Total Children"    val={totalChildren}      color="#3b82f6" bg="#dbeafe" sub="Enrolled across all centers"/>
      <StatCard icon="📊" label="Avg Attendance"    val={`${avgAttendance}%`} color="#8b5cf6" bg="#ede9fe" sub="Teachers & children today"/>
      <StatCard icon="🎓" label="Course Completion" val={`${completionRate}%`} color="#06b6d4" bg="#cffafe" sub="Completed vs in-progress"/>
      <StatCard icon="📋" label="Activity Uploads"  val={weekActivities}     color="#ef4444" bg="#fee2e2" sub="Submitted this week"/>
    </div>

        <SectionCard title="🎓 Course Completion Status">
          {[
            { label:"Teachers Present",      val:`${tPresentToday}/${tTotalToday}`,      pct:teacherTodayPct,  color:"#10b981" },
            { label:"Children Present",      val:`${cPresentToday}/${cTotalToday}`,      pct:childrenTodayPct,  color:"#3b82f6" },
            { label:"This Week (Teachers)",  val:`${teacherWeekPct}%`,                    pct:teacherWeekPct,   color:"#f59e0b" },
            { label:"This Week (Children)",  val:`${childrenWeekPct}%`,                   pct:childrenWeekPct,  color:"#8b5cf6" },
          ].map((item,i) => (
            <div key={i} style={{ background:"#f9fafb", borderRadius:12, padding:"12px 14px", border:"1px solid #f1f5f9" }}>
              <div style={{ fontSize:11, color:"#9ca3af", marginBottom:4 }}>{item.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#1c1917" }}>{item.val}</div>
              <div style={{ height:5, background:"#e5e7eb", borderRadius:4, overflow:"hidden", marginTop:8 }}>
                <div style={{ height:"100%", width:`${item.pct}%`, background:item.color, borderRadius:4 }}/>
              </div>
            </div>
          ))}
        </SectionCard>
      </div>

      <SectionCard title="🎓 Course Completion Status">
        {[
          { label:"Completed",   val:completedCourses,   pct:completedPct,   color:"#10b981" },
          { label:"In Progress", val:inProgressCourses,  pct:inProgressPct,  color:"#f59e0b" },
          { label:"Not Started", val:notStartedCourses,  pct:notStartedPct,  color:"#ef4444" },
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
        {teacherProgress.length > 0 ? teacherProgress.map((t, i) => {
          const p = t.progress || t.trainingProgress || t.attendance || 0;
          const barColor = p >= 75 ? "#10b981" : p >= 40 ? "#f59e0b" : "#ef4444";
          return (
            <div key={i} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{t.name || t.fullName}</span>
                <span style={{ fontSize:12, fontWeight:700, color:barColor }}>{p}%</span>
              </div>
              <div style={{ height:6, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${p}%`, background:barColor, borderRadius:4 }}/>
              </div>
              <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{t.center?.name || t.center || "—"} · {t.subject || t.specialization || "—"}</div>
            </div>
          );
        }) : (
          <div style={{ textAlign:"center", padding:"30px 0", color:"#9ca3af", fontSize:13 }}>No active teachers found</div>
        )}
      </SectionCard>

      <SectionCard title="📤 Activity Upload Summary">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {[
            { label:"Uploaded Today",     val:todayActivities,     icon:"📅", color:"#10b981", bg:"#d1fae5" },
            { label:"Uploaded This Week", val:weekActivities,     icon:"📆", color:"#3b82f6", bg:"#dbeafe" },
            { label:"Pending Review",     val:pendingActivities,  icon:"⏳", color:"#f59e0b", bg:"#fef3c7" },
            { label:"Rejected",           val:rejectedActivities, icon:"❌", color:"#ef4444", bg:"#fee2e2" },
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
