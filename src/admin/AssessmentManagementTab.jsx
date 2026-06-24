 import { useState } from "react";
import { Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
// Question bank is now empty — questions can be added via the form below
const MOCK_QUESTION_BANK = [];
 export default function AssessmentManagementTab({ assessmentsData, setAssessmentsData, setToast }) {
  const [search, setSearch] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [newA, setNewA] = useState({
    title:"",
    course:"",
    questions:10,
    passMark:60,
    dueDate:"",
    status:"draft"
  });

  const filtered = assessmentsData.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.course.toLowerCase().includes(search.toLowerCase())
  );

  const totalAttempts = assessmentsData.reduce((a,x)=>a+x.attempts,0);
  const avgScore = assessmentsData.length
    ? Math.round(assessmentsData.reduce((a,x)=>a+x.avgScore,0) / assessmentsData.length)
    : 0;

  const togglePublish = (id) => {
    setAssessmentsData(prev =>
      prev.map(a => a.id===id ? { ...a, status:a.status==="published" ? "draft" : "published" } : a)
    );
    setToast({ msg:"Assessment status updated!", type:"success" });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newA.title || !newA.course) {
      setToast({ msg:"Please fill required fields.", type:"error" });
      return;
    }

    setAssessmentsData(prev => [
      ...prev,
      {
        id:Date.now(),
        ...newA,
        questions:Number(newA.questions),
        passMark:Number(newA.passMark),
        attempts:0,
        avgScore:0
      }
    ]);

    setToast({ msg:"New assessment created!", type:"success" });
    setAddModal(false);
    setNewA({ title:"", course:"", questions:10, passMark:60, dueDate:"", status:"draft" });
  };

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={S.pageTitle}>Assessment Management</h1>
          <p style={S.pageSub}>Quiz builder, question bank, and results management</p>
        </div>
        <button onClick={()=>setAddModal(true)} style={S.primaryBtn}>+ Create Quiz</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:16, marginBottom:20 }}>
        <StatCard icon="🧠" label="Assessments" val={assessmentsData.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Published" val={assessmentsData.filter(a=>a.status==="published").length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="📚" label="Question Bank" val={MOCK_QUESTION_BANK.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="📈" label="Avg Score" val={`${avgScore}%`} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="👥" label="Attempts" val={totalAttempts} color="#06b6d4" bg="#cffafe" />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search quizzes or courses..." />

      <div style={{ display:"grid", gridTemplateColumns:"1.1fr 0.9fr", gap:20, marginBottom:20 }}>
        <SectionCard title="📝 Quiz Builder">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map(a=>(
              <div key={a.id} style={{ padding:"14px 16px", border:"1px solid #f1f5f9", borderRadius:12, background:"white" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#1c1917" }}>{a.title}</div>
                    <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>
                      {a.course} · {a.questions} questions · Pass mark {a.passMark}% · Due {a.dueDate || "—"}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>

                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button onClick={()=>togglePublish(a.id)} style={S.tblBtn}>
                    {a.status==="published" ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={()=>setToast({ msg:"Question builder opened (demo).", type:"success" })} style={S.tblBtn}>
                    Build Questions
                  </button>
                  <button onClick={()=>setToast({ msg:"Assessment duplicated!", type:"success" })} style={S.tblBtn}>
                    Duplicate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="📚 Question Bank">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {MOCK_QUESTION_BANK.map(q=>(
              <div key={q.id} style={{ padding:"12px 14px", background:"#f9fafb", borderRadius:10, border:"1px solid #f3f4f6" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#1c1917", marginBottom:4 }}>{q.question}</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#dbeafe", color:"#1d4ed8" }}>{q.type}</span>
                  <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#ede9fe", color:"#6d28d9" }}>{q.difficulty}</span>
                  <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#fef3c7", color:"#92400e" }}>{q.category}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="📊 Results Management">
        {assessmentsData.map(a=>{
          const passRate = a.avgScore >= a.passMark ? 100 : Math.max(30, Math.round((a.avgScore / a.passMark) * 100));
          return (
            <div key={a.id} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>{a.title}</span>
                <span style={{ fontSize:12, fontWeight:800, color:a.avgScore>=a.passMark?"#10b981":"#ef4444" }}>
                  Avg {a.avgScore}% · {a.attempts} attempts
                </span>
              </div>
              <div style={{ height:8, background:"#f3f4f6", borderRadius:6, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${passRate}%`, background:a.avgScore>=a.passMark?"#10b981":"#f59e0b", borderRadius:6 }} />
              </div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>Pass mark: {a.passMark}%</div>
            </div>
          );
        })}
      </SectionCard>

      {addModal && (
        <Modal title="Create New Assessment" onClose={()=>setAddModal(false)}>
          <form onSubmit={handleAdd}>
            <label style={S.label}>Assessment Title *</label>
            <input style={{ ...S.input, marginBottom:12 }} value={newA.title} onChange={e=>setNewA({...newA,title:e.target.value})} placeholder="Quiz title" />

            <label style={S.label}>Course *</label>
            <input style={{ ...S.input, marginBottom:12 }} value={newA.course} onChange={e=>setNewA({...newA,course:e.target.value})} placeholder="Course name" />

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={S.label}>Questions</label>
                <input style={S.input} type="number" value={newA.questions} onChange={e=>setNewA({...newA,questions:e.target.value})} />
              </div>
              <div>
                <label style={S.label}>Pass Mark (%)</label>
                <input style={S.input} type="number" value={newA.passMark} onChange={e=>setNewA({...newA,passMark:e.target.value})} />
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              <div>
                <label style={S.label}>Due Date</label>
                <input style={S.input} type="date" value={newA.dueDate} onChange={e=>setNewA({...newA,dueDate:e.target.value})} />
              </div>
              <div>
                <label style={S.label}>Status</label>
                <select style={S.input} value={newA.status} onChange={e=>setNewA({...newA,status:e.target.value})}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <button type="submit" style={{ ...S.primaryBtn, width:"100%" }}>Create Assessment →</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
