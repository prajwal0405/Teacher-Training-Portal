import { useState } from "react";
import { Modal, S, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
export default function CertificateManagementTab({ certificates, setCertificates, setToast }) {
  const [bulkModal, setBulkModal] = useState(false);
  const [verifyId, setVerifyId] = useState("");
  const [verified, setVerified] = useState(null);
  const [bulk, setBulk] = useState({ course:"", batch:"", count:1, template:"Gold Standard" });

  const templates = [
    { name:"Gold Standard", style:"Premium completion certificate", color:"#f59e0b" },
    { name:"Modern Blue",   style:"Professional institute design", color:"#3b82f6" },
    { name:"Classic",       style:"Minimal print-friendly format", color:"#10b981" },
  ];

  const handleBulkGenerate = (e) => {
    e.preventDefault();

    if (!bulk.course || !bulk.count) {
      setToast({ msg:"Please fill required fields.", type:"error" });
      return;
    }

    const count = Number(bulk.count);

    const newCertificates = Array.from({ length:count }, (_, i) => ({
      id: Date.now() + i,
      certificateId: `SPC-QUEUE-${Date.now()}-${i+1}`,
      learner: `Learner ${i+1}`,
      course: bulk.course,
      template: bulk.template,
      issuedOn: "—",
      qrStatus: "queued",
      status: "queued"
    }));

    setCertificates(prev => [...newCertificates, ...prev]);
    setToast({ msg:`${count} certificates queued for generation!`, type:"success" });
    setBulkModal(false);
    setBulk({ course:"", batch:"", count:1, template:"Gold Standard" });
  };

  const handleVerify = () => {
    const found = certificates.find(c => c.certificateId.toLowerCase() === verifyId.trim().toLowerCase());

    if (found) {
      setVerified(found);
      setToast({ msg:"Certificate verified!", type:"success" });
    } else {
      setVerified(null);
      setToast({ msg:"Certificate not found.", type:"error" });
    }
  };

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={S.pageTitle}>Certificate Management</h1>
          <p style={S.pageSub}>Templates, bulk generation, QR verification, and issuance tracking</p>
        </div>
        <button onClick={()=>setBulkModal(true)} style={S.primaryBtn}>+ Bulk Generate</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:16, marginBottom:20 }}>
        <StatCard icon="🏅" label="Certificates" val={certificates.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Issued" val={certificates.filter(c=>c.status==="issued").length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="⏳" label="Queued" val={certificates.filter(c=>c.status==="queued").length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="🔐" label="Verified" val={certificates.filter(c=>c.qrStatus==="verified").length} color="#3b82f6" bg="#dbeafe" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        <SectionCard title="🎨 Certificate Templates">
          <div style={{ display:"grid", gap:12 }}>
            {templates.map((t,i)=>(
              <div key={i} style={{ border:`1px solid ${t.color}40`, borderRadius:14, padding:"16px", background:"white" }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#1c1917" }}>{t.name}</div>
                <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>{t.style}</div>
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button style={S.tblBtn} onClick={()=>setToast({ msg:`Previewing ${t.name}`, type:"success" })}>Preview</button>
                  <button style={S.tblBtn} onClick={()=>setToast({ msg:`${t.name} selected as default`, type:"success" })}>Set Default</button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="🔍 QR / Certificate Verification">
          <label style={S.label}>Certificate ID</label>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <input
              style={{ ...S.input, marginBottom:0 }}
              value={verifyId}
              onChange={e=>setVerifyId(e.target.value)}
              placeholder="e.g. SPC-2026-001"
            />
            <button onClick={handleVerify} style={S.primaryBtn}>Verify</button>
          </div>

          {verified && (
            <div style={{ background:"#f9fafb", border:"1px solid #f1f5f9", borderRadius:12, padding:"16px" }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#1c1917", marginBottom:8 }}>Certificate Verified ✅</div>
              <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.7 }}>
                Learner: <b>{verified.learner}</b><br/>
                Course: <b>{verified.course}</b><br/>
                Certificate ID: <b>{verified.certificateId}</b><br/>
                Issued On: <b>{verified.issuedOn}</b>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="📄 Issuance Register">
        <div style={{ background:"white", borderRadius:16, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f9fafb", borderBottom:"1px solid #f1f5f9" }}>
                {["Certificate ID","Learner","Course","Template","Issued On","Status"].map(h=>(
                  <th key={h} style={{ padding:"12px 16px", fontSize:11, fontWeight:700, color:"#9ca3af", textAlign:"left", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {certificates.map((c,i)=>(
                <tr key={c.id} style={{ borderBottom:"1px solid #f9fafb", background:i%2===0?"white":"#fafafa" }}>
                  <td style={{ padding:"12px 16px", fontSize:12, fontWeight:700, color:"#374151" }}>{c.certificateId}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:"#374151" }}>{c.learner}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:"#374151" }}>{c.course}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:"#374151" }}>{c.template}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:"#6b7280" }}>{c.issuedOn}</td>
                  <td style={{ padding:"12px 16px" }}><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {bulkModal && (
        <Modal title="Bulk Certificate Generation" onClose={()=>setBulkModal(false)}>
          <form onSubmit={handleBulkGenerate}>
            <label style={S.label}>Course *</label>
            <input style={{ ...S.input, marginBottom:12 }} value={bulk.course} onChange={e=>setBulk({...bulk,course:e.target.value})} placeholder="Course name" />

            <label style={S.label}>Batch</label>
            <input style={{ ...S.input, marginBottom:12 }} value={bulk.batch} onChange={e=>setBulk({...bulk,batch:e.target.value})} placeholder="Batch name" />

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              <div>
                <label style={S.label}>Count</label>
                <input style={S.input} type="number" min="1" value={bulk.count} onChange={e=>setBulk({...bulk,count:e.target.value})} />
              </div>
              <div>
                <label style={S.label}>Template</label>
                <select style={S.input} value={bulk.template} onChange={e=>setBulk({...bulk,template:e.target.value})}>
                  {templates.map(t=><option key={t.name}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" style={{ ...S.primaryBtn, width:"100%" }}>Generate Certificates →</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

