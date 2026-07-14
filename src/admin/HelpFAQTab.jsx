import { useState } from "react";

const FAQ_DATA = [
  { q: "How do I add a new teacher?", a: "Go to Teacher Management > click '+ Add Teacher' > fill in the form. An auto-generated password will be created." },
  { q: "How do I import teachers in bulk?", a: "Go to Teacher Management > click '📥 Import CSV' > upload a CSV file with columns: name, email, role, phone (optional)." },
  { q: "How do I assign a teacher to a center/class?", a: "Go to Center Management > click on a center > use the class management modal to assign teachers to classes." },
  { q: "How do I create a course?", a: "Go to Course Management > click '+ Create Course' > fill in details, add modules, then click 'Publish' when ready." },
  { q: "How does lesson plan auto-generation work?", a: "Go to Lesson Plans > click '🤖 Auto-Generate' > select a course and class > the system distributes activities across Mon-Fri." },
  { q: "How do I review activity submissions?", a: "Go to Activity Monitoring > find pending submissions > click Approve, Request Revision, or Reject." },
  { q: "How do teachers mark attendance?", a: "Teachers go to Daily Attendance tab in their dashboard, select date, and mark each child as Present/Absent." },
  { q: "How do I generate certificates?", a: "Go to Certificates > select teacher and course > click 'Generate Certificate'. Teachers can download PDF from their dashboard." },
  { q: "What is the AI Chatbot?", a: "The chatbot helps teachers with FAQs about attendance, lesson plans, passwords, certificates, and more. Ask it anything!" },
  { q: "How do I configure email notifications?", a: "Go to Settings & Roles > Email (SMTP) tab > enter your SMTP credentials and save." },
  { q: "How do I view reports?", a: "Go to Reports & Analytics > select a report type (Teacher Performance, Class Progress, etc.) > click Generate." },
  { q: "How do children get added to the system?", a: "Teachers add children from their dashboard (My Children tab). Admin can view all children in Children & Classes." },
  { q: "How does the sentiment analysis work?", a: "The system analyzes feedback text to detect positive, negative, or neutral sentiment using keyword analysis." },
  { q: "How do I block a teacher?", a: "Go to Teacher Management > find the teacher > click Block. Blocked teachers cannot log in." },
];

export default function HelpFAQTab() {
  const [openIndex, setOpenIndex] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = FAQ_DATA.filter(f => 
    f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>❓ Help & FAQ</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>Frequently asked questions and help guides</p>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search FAQs..."
        style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box", marginBottom: 20 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No matching FAQs found</div>}
        {filtered.map((faq, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
              style={{ width: "100%", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: openIndex === i ? "#f8fafc" : "white", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1c1917" }}>{faq.q}</span>
              <span style={{ fontSize: 16, color: "#94a3b8", transition: "transform 0.2s", transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>
            {openIndex === i && (
              <div style={{ padding: "0 18px 14px", fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>{faq.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
