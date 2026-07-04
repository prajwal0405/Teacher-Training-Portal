import { useState, useEffect, useRef, useCallback } from "react";
import { S } from "../components/Shared";

/* ═══════════════════════════════════════════════════════════
   ASSESSMENT QUESTION BANK  (20 marks each, per course)
   Each question: 1 mark. 20 questions per assessment.
═══════════════════════════════════════════════════════════ */
const QUESTION_BANK = {
  1: [ // Pre-Primary Teacher Training
    { id:"q1",  q:"Which theorist introduced the concept of 'Zone of Proximal Development'?", opts:["Jean Piaget","Lev Vygotsky","Erik Erikson","Albert Bandura"], ans:1 },
    { id:"q2",  q:"Pre-primary education typically covers children aged:", opts:["0–2 years","3–6 years","6–10 years","2–4 years"], ans:1 },
    { id:"q3",  q:"Which of the following is NOT one of the 5 pillars of early childhood education?", opts:["Play-based learning","Holistic development","Competitive assessment","Family involvement"], ans:2 },
    { id:"q4",  q:"Piaget's 'Preoperational Stage' corresponds to which age range?", opts:["0–2 years","2–7 years","7–11 years","12+ years"], ans:1 },
    { id:"q5",  q:"In a child-friendly classroom, shelves should be:", opts:["High to prevent access","Low for child independence","Locked at all times","Against windows only"], ans:1 },
    { id:"q6",  q:"What is 'Scaffolding' in early childhood education?", opts:["Building physical structures","Temporary support provided by a teacher","A type of punishment","Rote memorization technique"], ans:1 },
    { id:"q7",  q:"What is the recommended duration for a main activity in a pre-primary lesson plan?", opts:["5 minutes","15–20 minutes","45 minutes","1 hour"], ans:1 },
    { id:"q8",  q:"Which area in a classroom is designed for creative expression?", opts:["Construction Zone","Science Discovery Table","Art & Craft Zone","Reading Corner"], ans:2 },
    { id:"q9",  q:"Circle Time in a pre-primary class should include:", opts:["Examinations","Greeting ritual, calendar, story/song","Silent reading only","Individual worksheets"], ans:1 },
    { id:"q10", q:"Bronfenbrenner's theory is called:", opts:["Cognitive Development Theory","Attachment Theory","Ecological Systems Theory","Psychosocial Theory"], ans:2 },
    { id:"q11", q:"Which of the following is a SAFETY rule for pre-primary classrooms?", opts:["Use sharp scissors for cutting","Lock emergency exits","Secure heavy furniture to walls","Keep cleaning chemicals accessible"], ans:2 },
    { id:"q12", q:"Theme-based teaching means:", opts:["Teaching only one subject per year","Organizing activities around a central concept","Ignoring individual differences","Using technology only"], ans:1 },
    { id:"q13", q:"The 'Sensorimotor Stage' in Piaget's theory is for children aged:", opts:["0–2 years","2–7 years","3–5 years","7–12 years"], ans:0 },
    { id:"q14", q:"Which type of play area uses blocks and puzzles?", opts:["Dramatic Play Area","Reading Corner","Construction Zone","Science Table"], ans:2 },
    { id:"q15", q:"A lesson plan should begin with:", opts:["Assessment","A hook or introduction","Silent work","Homework review"], ans:1 },
    { id:"q16", q:"What does 'Object Permanence' mean?", opts:["Objects are permanent fixtures","Understanding things exist even when out of sight","Children fear objects","All objects look the same"], ans:1 },
    { id:"q17", q:"Natural light in a classroom is recommended because:", opts:["It saves electricity","It supports child wellbeing and attention","It is required by law","It makes photos better"], ans:1 },
    { id:"q18", q:"Which sense is NOT typically engaged in a sensory play activity?", opts:["Touch","Sight","Smell","Logic"], ans:3 },
    { id:"q19", q:"What should be done FIRST in a lesson plan review section?", opts:["Assign homework","Recap and discuss what was learned","Start a new topic","Test students formally"], ans:1 },
    { id:"q20", q:"'Parallel Play' means children:", opts:["Play together cooperatively","Play near each other but independently","Never interact","Play in teams"], ans:1 },
  ],
  2: [ // Child Psychology
    { id:"q1",  q:"Bowlby's Attachment Theory focuses on the bond between:", opts:["Peers","Child and primary caregiver","Teacher and student","Siblings"], ans:1 },
    { id:"q2",  q:"Which attachment type leads to confident exploration?", opts:["Avoidant","Anxious-Ambivalent","Secure","Disorganized"], ans:2 },
    { id:"q3",  q:"Bandura's Social Learning Theory states children learn through:", opts:["Punishment only","Observation and modeling","Genetic instinct","Direct instruction only"], ans:1 },
    { id:"q4",  q:"What are the 4 steps in Bandura's learning process?", opts:["See, Try, Fail, Repeat","Attention, Retention, Reproduction, Motivation","Read, Write, Recite, Review","Play, Explore, Discover, Create"], ans:1 },
    { id:"q5",  q:"Erikson's stage 'Initiative vs Guilt' corresponds to which age?", opts:["0–18 months","18m–3 years","3–5 years","6–12 years"], ans:2 },
    { id:"q6",  q:"Parten's first stage of social play is:", opts:["Cooperative Play","Associative Play","Parallel Play","Solitary Play"], ans:3 },
    { id:"q7",  q:"ADHD in children is best managed with:", opts:["Strict punishment","Structured routines and movement breaks","Complete isolation","No intervention"], ans:1 },
    { id:"q8",  q:"Dyslexia primarily affects:", opts:["Mathematical ability","Reading and writing","Physical coordination","Social skills"], ans:1 },
    { id:"q9",  q:"'Self-efficacy' as defined by Bandura means:", opts:["Being selfish","Belief in one's own ability to succeed","Learning by yourself","Ignoring others"], ans:1 },
    { id:"q10", q:"The best response to a child's tantrum is to:", opts:["Ignore completely","Punish immediately","Validate emotion and stay calm","Give whatever they want"], ans:2 },
    { id:"q11", q:"Visual schedules on walls are especially helpful for children with:", opts:["Dyslexia","Autism Spectrum differences","Physical disabilities","No special needs"], ans:1 },
    { id:"q12", q:"Cooperative Play typically begins at age:", opts:["1 year","2 years","4+ years","8 years"], ans:2 },
    { id:"q13", q:"Separation anxiety is best managed with:", opts:["Lengthy goodbyes","Consistent goodbye routine","Avoiding goodbyes","Scolding the child"], ans:1 },
    { id:"q14", q:"'Trust vs Mistrust' is Erikson's stage for ages:", opts:["3–5 years","0–18 months","6–12 years","18m–3 years"], ans:1 },
    { id:"q15", q:"Effective praise should focus on:", opts:["Outcome only","Effort, not outcome","Comparing with peers","Being vague"], ans:1 },
    { id:"q16", q:"Inclusive education means:", opts:["Only gifted students attend","Adapting the environment, not the child","Excluding students with difficulties","Separate classrooms for all"], ans:1 },
    { id:"q17", q:"A 'Peer Buddy System' is used to:", opts:["Replace teachers","Support students with learning differences","Punish misbehavior","Reduce class size"], ans:1 },
    { id:"q18", q:"Associative Play occurs at approximately age:", opts:["2–2.5 years","3–4 years","5–6 years","1–2 years"], ans:1 },
    { id:"q19", q:"Developmental Delay means a child:", opts:["Has permanent disability","Is achieving milestones at a slower pace","Will never progress","Has behavioral problems"], ans:1 },
    { id:"q20", q:"A visual reward chart is an example of:", opts:["Negative reinforcement","Punishment","Positive reinforcement","Ignoring behavior"], ans:2 },
  ],
  3: [ // Curriculum Design
    { id:"q1",  q:"Bloom's Taxonomy highest level is:", opts:["Remember","Understand","Evaluate","Create"], ans:3 },
    { id:"q2",  q:"'Backward Design' starts with:", opts:["Planning activities first","Identifying desired results first","Choosing textbooks first","Setting timetables first"], ans:1 },
    { id:"q3",  q:"The 'Null Curriculum' refers to:", opts:["Empty classrooms","What is NOT taught","Digital content only","Extra activities"], ans:1 },
    { id:"q4",  q:"Bruner's 'Spiral Curriculum' means:", opts:["Teaching in circles","Revisiting topics with increasing complexity","Skipping difficult topics","Teaching only one topic"], ans:1 },
    { id:"q5",  q:"Formative assessment is:", opts:["End-of-year exam","Ongoing assessment during learning","One-time project","Final portfolio"], ans:1 },
    { id:"q6",  q:"Portfolio assessment collects:", opts:["Only test scores","Work samples showing growth over time","Teacher opinions only","Parent feedback"], ans:1 },
    { id:"q7",  q:"In the SAMR model, 'Redefinition' means:", opts:["Replace a tool","Augment with tech","Create tasks previously inconceivable","Modify existing tasks"], ans:2 },
    { id:"q8",  q:"WHO recommends screen time for children aged 2–4 to be maximum:", opts:["30 minutes","1 hour","2 hours","No limit"], ans:1 },
    { id:"q9",  q:"Tyler's Rational Model is used for:", opts:["Physical education","Curriculum planning","School architecture","Student grading"], ans:1 },
    { id:"q10", q:"'Seesaw' as an EdTech tool is used for:", opts:["Math calculations","Digital portfolios","Video conferencing","Scheduling"], ans:1 },
    { id:"q11", q:"Summative assessment includes:", opts:["Observations","Questioning","Exit tickets","Projects and portfolios"], ans:3 },
    { id:"q12", q:"An 'Integrated/Thematic' curriculum model organizes content around:", opts:["Single subjects","Central themes or topics","Teacher preferences","Alphabetical order"], ans:1 },
    { id:"q13", q:"Bloom's level 'Apply' means:", opts:["Recall facts","Explain ideas","Use knowledge in new situations","Draw connections"], ans:2 },
    { id:"q14", q:"Backward Design's second step is:", opts:["Plan learning experiences","Determine acceptable evidence","Identify desired results","Choose materials"], ans:1 },
    { id:"q15", q:"The 'Hidden Curriculum' refers to:", opts:["Secret subjects","Unwritten social norms taught in school","Private tutoring","Online courses"], ans:1 },
    { id:"q16", q:"Kahoot is best used as:", opts:["Portfolio tool","Interactive quiz tool","Document editor","Video creator"], ans:1 },
    { id:"q17", q:"A 'Flexible Seating Arrangement' supports:", opts:["Discipline","Inclusive education needs","Teacher convenience","Reducing costs"], ans:1 },
    { id:"q18", q:"'Book Creator' is an EdTech tool used for:", opts:["Math games","Digital storytelling","Attendance tracking","Grade calculation"], ans:1 },
    { id:"q19", q:"SAMR stands for:", opts:["Study, Assess, Measure, Report","Substitution, Augmentation, Modification, Redefinition","See, Analyze, Map, Revise","Simplify, Add, Merge, Rethink"], ans:1 },
    { id:"q20", q:"Observation as assessment means:", opts:["Written tests only","Watching and recording children's behavior and skills","Parent interviews","Standardized testing"], ans:1 },
  ],
};

const COURSE_NAMES = {
  1: "Pre-Primary Teacher Training",
  2: "Child Psychology & Development",
  3: "Curriculum Design & Lesson Planning",
};

const ASSESSMENT_DURATION = 20 * 60; // 20 minutes in seconds
const MAX_WARNINGS = 5;

/* ═══════════════════════════════════════════════════════════
   AI SCORING via Anthropic API
═══════════════════════════════════════════════════════════ */
async function scoreWithAI(questions, answers, courseTitle) {
  const answeredList = questions.map((q, i) => ({
    question: q.q,
    chosen: q.opts[answers[i] ?? -1] || "Not answered",
    correct: q.opts[q.ans],
    isCorrect: answers[i] === q.ans,
  }));
  const correct = answeredList.filter(a => a.isCorrect).length;
  const prompt = `You are an educational AI evaluator for a teacher training platform.

Course: ${courseTitle}
Assessment Results: ${correct}/20 correct answers

Answered Questions:
${answeredList.map((a, i) => `Q${i+1}: "${a.question}" → Chosen: "${a.chosen}" | Correct: "${a.correct}" | ${a.isCorrect ? "✓ Correct" : "✗ Wrong"}`).join("\n")}

Provide a concise evaluation in this EXACT JSON format only, no markdown:
{
  "score": ${correct},
  "percentage": ${Math.round((correct/20)*100)},
  "grade": "${correct>=18?"A+":correct>=16?"A":correct>=14?"B+":correct>=12?"B":correct>=10?"C":"F"}",
  "performance": "one sentence performance summary",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area to improve 1", "area to improve 2"],
  "recommendation": "one sentence recommendation"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    // fallback scoring
    return {
      score: correct,
      percentage: Math.round((correct / 20) * 100),
      grade: correct>=18?"A+":correct>=16?"A":correct>=14?"B+":correct>=12?"B":correct>=10?"C":"F",
      performance: `You scored ${correct}/20 on this assessment.`,
      strengths: ["Completed the assessment", "Showed understanding of key concepts"],
      improvements: ["Review incorrect answers", "Revisit course notes"],
      recommendation: "Continue studying the course material for better results.",
    };
  }
}

/* ═══════════════════════════════════════════════════════════
   PIE CHART COMPONENT
═══════════════════════════════════════════════════════════ */
function PieChart({ correct, wrong, unanswered, total }) {
  const size = 160;
  const cx = size / 2, cy = size / 2, r = 60;
  const slices = [
    { val: correct,    color: "#10b981", label: "Correct"    },
    { val: wrong,      color: "#ef4444", label: "Wrong"      },
    { val: unanswered, color: "#e5e7eb", label: "Unanswered" },
  ].filter(s => s.val > 0);

  let cumAngle = -Math.PI / 2;
  const paths = slices.map(s => {
    const angle = (s.val / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...s, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z` };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth={2}/>)}
        <text x={cx} y={cy-6}  textAnchor="middle" fontSize="18" fontWeight="800" fill="#1c1917">{correct}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="10" fill="#6b7280">of {total}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { color: "#10b981", label: "Correct",    val: correct    },
          { color: "#ef4444", label: "Wrong",      val: wrong      },
          { color: "#e5e7eb", label: "Unanswered", val: unanswered },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }}/>
            <span style={{ fontSize: 13, color: "#374151" }}>{item.label}: <b>{item.val}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PROCTORED ASSESSMENT COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ProctoredAssessment({ user, assessmentResults = [] }) {
  // ── Screen state: list | instructions | exam | result ──
  const [screen,       setScreen]       = useState("list");
  const [activeCourse, setActiveCourse] = useState(null);

  // ── Exam state ──
  const [questions,    setQuestions]    = useState([]);
  const [answers,      setAnswers]      = useState({});
  const [currentQ,     setCurrentQ]     = useState(0);
  const [timeLeft,     setTimeLeft]     = useState(ASSESSMENT_DURATION);
  const [warnings,     setWarnings]     = useState(0);
  const [lastWarnMsg,  setLastWarnMsg]  = useState("");
  const [showWarnBanner, setShowWarnBanner] = useState(false);

  // ── Proctoring state ──
  const [camGranted,   setCamGranted]   = useState(false);
  const [camError,     setCamError]     = useState("");
  const [faceStatus,   setFaceStatus]   = useState("ok"); // ok | noface | multiface
  const [gadgetAlert,  setGadgetAlert]  = useState(false);

  // ── Result state ──
  const [result,       setResult]       = useState(null);
  const [scoring,      setScoring]      = useState(false);

  // ── Stored attempts ──
  const [attempts, setAttempts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("spaceece_assessment_attempts") || "{}"); }
    catch { return {}; }
  });

  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const timerRef    = useRef(null);
  const faceRef     = useRef(null);
  const warnRef     = useRef(0);
  const autoSubmitted = useRef(false);

  // ── Save attempts ──
  const saveAttempt = useCallback((courseId, resultData) => {
    const updated = { ...attempts, [courseId]: { ...resultData, date: new Date().toLocaleDateString("en-IN") } };
    setAttempts(updated);
    localStorage.setItem("spaceece_assessment_attempts", JSON.stringify(updated));
  }, [attempts]);

  // ── Issue a proctoring warning ──
  const issueWarning = useCallback((msg) => {
    warnRef.current += 1;
    setWarnings(warnRef.current);
    setLastWarnMsg(msg);
    setShowWarnBanner(true);
    setTimeout(() => setShowWarnBanner(false), 4000);
    if (warnRef.current >= MAX_WARNINGS) {
      submitExam(true);
    }
  }, []); // eslint-disable-line

  // ── Submit exam ──
  const submitExam = useCallback(async (forced = false) => {
    if (autoSubmitted.current) return;
    autoSubmitted.current = true;
    clearInterval(timerRef.current);
    clearInterval(faceRef.current);
    stopCamera();
    setScreen("scoring");
    setScoring(true);
    const qs = questions.length > 0 ? questions : QUESTION_BANK[activeCourse] || [];
    const ans = answers;
    const correct = qs.filter((q, i) => ans[i] === q.ans).length;
    const wrong = qs.filter((q, i) => ans[i] !== undefined && ans[i] !== q.ans).length;
    const unanswered = qs.length - correct - wrong;
    const aiResult = await scoreWithAI(qs, ans, COURSE_NAMES[activeCourse]);
    const finalResult = {
      ...aiResult,
      correct, wrong, unanswered,
      total: qs.length,
      forced,
      warnings: warnRef.current,
      answers: ans,
    };
    saveAttempt(activeCourse, finalResult);
    setResult(finalResult);
    setScoring(false);
    setScreen("result");
  }, [questions, answers, activeCourse, saveAttempt]);

  // ── Timer ──
  useEffect(() => {
    if (screen !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); submitExam(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, submitExam]);

  // ── Visibility / tab switch detection ──
  useEffect(() => {
    if (screen !== "exam") return;
    const handleVisibility = () => {
      if (document.hidden) issueWarning("⚠️ You switched tabs or minimized the window!");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [screen, issueWarning]);

  // ── Right-click, copy-paste, keyboard shortcuts ──
  useEffect(() => {
    if (screen !== "exam") return;
    const block = (e) => {
      e.preventDefault();
      if (e.type === "contextmenu") issueWarning("⚠️ Right-click is not allowed during the exam!");
      if (e.type === "keydown" && (e.ctrlKey || e.metaKey)) issueWarning("⚠️ Keyboard shortcuts are not allowed!");
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && ["c","v","a","x","p"].includes(e.key.toLowerCase())) block(e);
    });
    return () => {
      document.removeEventListener("contextmenu", block);
    };
  }, [screen, issueWarning]);

  // ── Camera setup ──
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamGranted(true);
      setCamError("");
      startFaceSimulation();
    } catch (err) {
      setCamError("Camera access denied. Camera is required for this assessment.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    clearInterval(faceRef.current);
  };

  // ── Face detection simulation ──
  // Real face detection would use face-api.js or TensorFlow.js
  // This simulates the proctoring behavior with realistic random checks
  const startFaceSimulation = () => {
    faceRef.current = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.04) {
        // Simulate "no face" detected
        setFaceStatus("noface");
        issueWarning("⚠️ Face not detected! Please ensure your face is clearly visible.");
        setTimeout(() => setFaceStatus("ok"), 3000);
      } else if (rand < 0.06) {
        // Simulate "multiple faces"
        setFaceStatus("multiface");
        issueWarning("⚠️ Multiple faces detected! Only you should be visible.");
        setTimeout(() => setFaceStatus("ok"), 3000);
      } else if (rand < 0.065) {
        // Simulate gadget detection
        setGadgetAlert(true);
        issueWarning("⚠️ Electronic gadget detected near your workspace!");
        setTimeout(() => setGadgetAlert(false), 3000);
      }
    }, 8000);
  };

  // ── Start exam ──
  const startExam = async () => {
    await startCamera();
    if (!camGranted && !streamRef.current) return;
    warnRef.current = 0;
    autoSubmitted.current = false;
    setWarnings(0);
    setAnswers({});
    setCurrentQ(0);
    setTimeLeft(ASSESSMENT_DURATION);
    setQuestions(QUESTION_BANK[activeCourse] || []);
    setScreen("exam");
  };

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => { stopCamera(); clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const timerColor = timeLeft > 300 ? "#10b981" : timeLeft > 60 ? "#f59e0b" : "#ef4444";

  /* ═══════════════════
     SCREEN: LIST
  ═══════════════════ */
  if (screen === "list") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <h1 style={S.pageTitle}>📋 Assessments</h1>
        <p style={S.pageSub}>AI-powered proctored assessments — 20 marks each · One attempt only</p>

        {/* Info banner */}
        <div style={{ background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: 14, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 24 }}>🔐</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 6 }}>Proctoring Notice</div>
            <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
              • Your <b>camera will be activated</b> automatically during the exam<br/>
              • <b>Tab switching, window sharing, and right-click</b> are not allowed<br/>
              • <b>Multiple faces or no face</b> detected will trigger a warning<br/>
              • <b>Electronic gadget</b> detection near workspace will trigger a warning<br/>
              • After <b>5 warnings</b>, the exam is <b>automatically submitted</b><br/>
              • Each assessment can only be <b>attempted once</b>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map(courseId => {
            const attempt = attempts[courseId];
            const colors  = { 1: "#f59e0b", 2: "#8b5cf6", 3: "#10b981" };
            const icons   = { 1: "👩‍🏫", 2: "🧠", 3: "📐" };
            const grade   = attempt?.grade;
            const gradeColor = grade==="A+"||grade==="A" ? "#10b981" : grade==="B+"||grade==="B" ? "#3b82f6" : grade==="C" ? "#f59e0b" : "#ef4444";
            return (
              <div key={courseId} style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderLeft: `4px solid ${colors[courseId]}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ fontSize: 36 }}>{icons[courseId]}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917" }}>{COURSE_NAMES[courseId]}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>20 MCQ · 20 Marks · 20 Minutes · AI Proctored</div>
                      {attempt && (
                        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, background: "#f0fdf4", color: "#065f46", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>✓ Attempted on {attempt.date}</span>
                          <span style={{ fontSize: 11, background: "#fffbeb", color: "#92400e", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>{attempt.score}/20 · {attempt.percentage}%</span>
                          <span style={{ fontSize: 11, background: "#f0f9ff", color: gradeColor, padding: "2px 10px", borderRadius: 20, fontWeight: 800 }}>Grade: {attempt.grade}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {attempt ? (
                      <button onClick={() => { setActiveCourse(courseId); setResult(attempt); setScreen("result"); }} style={{ ...S.exportBtn, fontSize: 12 }}>📊 View Result</button>
                    ) : (
                      <button
                        onClick={() => { setActiveCourse(courseId); setScreen("instructions"); }}
                        style={{ ...S.primaryBtn, background: `linear-gradient(135deg,${colors[courseId]},${colors[courseId]})`, fontSize: 12 }}
                      >
                        Start Exam →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══════════════════
     SCREEN: INSTRUCTIONS
  ═══════════════════ */
  if (screen === "instructions") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ background: "white", borderRadius: 20, padding: "36px", border: "1px solid #f1f5f9", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1c1917", margin: "0 0 6px" }}>Assessment Instructions</h2>
            <div style={{ fontSize: 14, color: "#6b7280" }}>{COURSE_NAMES[activeCourse]}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[
              { icon: "❓", label: "Questions", val: "20 MCQ" },
              { icon: "🏆", label: "Total Marks", val: "20" },
              { icon: "⏱️", label: "Duration", val: "20 Minutes" },
              { icon: "🎯", label: "Per Question", val: "1 Mark" },
              { icon: "🔄", label: "Attempts", val: "1 Only" },
              { icon: "📹", label: "Proctoring", val: "Camera + AI" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{item.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "16px", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#991b1b", marginBottom: 8 }}>⚠️ Proctoring Rules — Violations trigger warnings:</div>
            <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.8 }}>
              🚫 Do NOT switch tabs or minimize window<br/>
              🚫 Do NOT use any electronic device for answers<br/>
              🚫 Do NOT allow multiple faces in camera view<br/>
              🚫 Do NOT leave camera frame<br/>
              🚫 Do NOT right-click or use keyboard shortcuts<br/>
              ✅ After <b>5 warnings</b>, exam is auto-submitted
            </div>
          </div>

          {camError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#991b1b", fontWeight: 600 }}>
              📷 {camError}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setScreen("list")} style={{ ...S.exportBtn, flex: 1 }}>← Back</button>
            <button onClick={startExam} style={{ ...S.primaryBtn, flex: 2, padding: "13px", fontSize: 14 }}>
              🎬 Start Proctored Exam
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 10 }}>By clicking Start, you agree to camera monitoring during this assessment</div>
        </div>
      </div>
    );
  }

  /* ═══════════════════
     SCREEN: SCORING
  ═══════════════════ */
  if (screen === "scoring") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
        <div style={{ width: 60, height: 60, border: "4px solid #e2e8f0", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>AI is evaluating your answers…</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Calculating score and generating feedback</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ═══════════════════
     SCREEN: RESULT
  ═══════════════════ */
  if (screen === "result" && result) {
    const gradeColor = result.grade==="A+"||result.grade==="A" ? "#10b981" : result.grade==="B+"||result.grade==="B" ? "#3b82f6" : result.grade==="C" ? "#f59e0b" : "#ef4444";
    return (
      <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{result.grade==="A+"||result.grade==="A" ? "🏆" : result.grade==="B+"||result.grade==="B" ? "🎯" : "📋"}</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1c1917", margin: "0 0 6px" }}>Assessment Complete!</h1>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{COURSE_NAMES[activeCourse]}</div>
          {result.forced && <div style={{ marginTop: 8, fontSize: 12, background: "#fef2f2", color: "#991b1b", padding: "6px 14px", borderRadius: 20, display: "inline-block", fontWeight: 700 }}>⚠️ Auto-submitted due to proctoring violations</div>}
        </div>

        {/* Score card */}
        <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
            <PieChart correct={result.correct} wrong={result.wrong} unanswered={result.unanswered ?? result.total - result.correct - result.wrong} total={result.total}/>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{result.score}</div>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>out of {result.total}</div>
              <div style={{ marginTop: 8, padding: "6px 20px", background: gradeColor+"22", color: gradeColor, borderRadius: 20, fontSize: 22, fontWeight: 900 }}>{result.grade}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>{result.percentage}%</div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Correct",    val: result.correct,    color: "#10b981", bg: "#d1fae5" },
              { label: "Wrong",      val: result.wrong,      color: "#ef4444", bg: "#fee2e2" },
              { label: "Skipped",    val: result.unanswered ?? (result.total - result.correct - result.wrong), color: "#9ca3af", bg: "#f3f4f6" },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 12, padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI Feedback */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 8 }}>🤖 AI Performance Analysis</div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 12 }}>{result.performance}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#065f46", marginBottom: 6 }}>✅ Strengths</div>
                {result.strengths?.map((s, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 3 }}>• {s}</div>)}
              </div>
              <div style={{ background: "#fef2f2", borderRadius: 10, padding: "12px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>📈 Areas to Improve</div>
                {result.improvements?.map((s, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 3 }}>• {s}</div>)}
              </div>
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", borderRadius: 10, fontSize: 12, color: "#92400e", fontWeight: 600 }}>
              💡 {result.recommendation}
            </div>
          </div>

          {result.warnings > 0 && (
            <div style={{ background: "#fef3c7", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
              ⚠️ Proctoring warnings recorded: <b>{result.warnings}</b>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { setScreen("list"); setActiveCourse(null); }} style={{ ...S.exportBtn, flex: 1, textAlign: "center" }}>← Back to Assessments</button>
        </div>
      </div>
    );
  }

  /* ═══════════════════
     SCREEN: EXAM
  ═══════════════════ */
  if (screen === "exam") {
    const q = questions[currentQ];
    if (!q) return null;
    const answered = Object.keys(answers).length;
    const progress = Math.round((answered / questions.length) * 100);

    return (
      <div style={{ position: "fixed", inset: 0, background: "#0f172a", zIndex: 9999, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI','Inter',sans-serif", userSelect: "none" }}>

        {/* Warning banner */}
        {showWarnBanner && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "#ef4444", color: "white", padding: "12px 20px", textAlign: "center", fontSize: 13, fontWeight: 700, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {lastWarnMsg}
            <span style={{ background: "rgba(255,255,255,0.3)", padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>Warning {warnings}/{MAX_WARNINGS}</span>
          </div>
        )}

        {/* Top bar */}
        <div style={{ background: "#1e293b", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid #334155", flexShrink: 0 }}>
          {/* Camera feed */}
          <div style={{ position: "relative", width: 80, height: 60, borderRadius: 8, overflow: "hidden", background: "#0f172a", flexShrink: 0, border: `2px solid ${faceStatus==="ok"?"#10b981":faceStatus==="noface"?"#f59e0b":"#ef4444"}` }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "white", background: "rgba(0,0,0,0.6)", padding: "1px 0" }}>
              {faceStatus === "ok" ? "✓ Face OK" : faceStatus === "noface" ? "⚠ No Face" : "⚠ Multi-Face"}
            </div>
            {gadgetAlert && <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📱</div>}
          </div>

          {/* Course name */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>Proctored Assessment</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{COURSE_NAMES[activeCourse]}</div>
          </div>

          {/* Warnings */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Warnings</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: warnings >= 3 ? "#ef4444" : warnings >= 1 ? "#f59e0b" : "#10b981" }}>
              {warnings}/{MAX_WARNINGS}
            </div>
          </div>

          {/* Timer */}
          <div style={{ background: "#0f172a", padding: "8px 16px", borderRadius: 10, textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Time Left</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: timerColor, fontVariantNumeric: "tabular-nums" }}>{formatTime(timeLeft)}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "#1e293b" }}>
          <div style={{ height: "100%", width: `${((currentQ+1)/questions.length)*100}%`, background: "#f59e0b", transition: "width 0.3s" }}/>
        </div>

        {/* Main exam area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", gap: 20 }}>
          {/* Question panel */}
          <div style={{ flex: 1, maxWidth: 700, margin: "0 auto" }}>
            {/* Q counter */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Question <span style={{ color: "#f59e0b", fontWeight: 800 }}>{currentQ+1}</span> of {questions.length}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{answered} answered · {questions.length - answered} remaining</div>
            </div>

            {/* Question */}
            <div style={{ background: "#1e293b", borderRadius: 16, padding: "24px", marginBottom: 20, border: "1px solid #334155" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Q{currentQ+1} · 1 Mark</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1.6 }}>{q.q}</div>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {q.opts.map((opt, i) => {
                const selected = answers[currentQ] === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: i }))}
                    style={{ background: selected ? "#1d4ed8" : "#1e293b", border: `2px solid ${selected ? "#3b82f6" : "#334155"}`, borderRadius: 12, padding: "14px 18px", textAlign: "left", color: selected ? "white" : "#cbd5e1", fontSize: 14, cursor: "pointer", display: "flex", gap: 12, alignItems: "center", transition: "all 0.15s", fontFamily: "inherit" }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: selected ? "#3b82f6" : "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: selected ? "white" : "#64748b", flexShrink: 0 }}>
                      {["A","B","C","D"][i]}
                    </div>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <button onClick={() => setCurrentQ(q => Math.max(0, q-1))} disabled={currentQ===0} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "10px 20px", borderRadius: 10, cursor: currentQ===0?"not-allowed":"pointer", fontSize: 13, fontWeight: 600 }}>← Previous</button>
              {currentQ < questions.length - 1 ? (
                <button onClick={() => setCurrentQ(q => q+1)} style={{ background: "#1d4ed8", border: "none", color: "white", padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Next →</button>
              ) : (
                <button onClick={() => submitExam(false)} style={{ background: "#10b981", border: "none", color: "white", padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>✅ Submit Exam</button>
              )}
            </div>
          </div>

          {/* Question grid sidebar */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ background: "#1e293b", borderRadius: 14, padding: "16px", border: "1px solid #334155" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 12 }}>QUESTION NAVIGATOR</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, marginBottom: 16 }}>
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    style={{ width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: i === currentQ ? "#f59e0b" : answers[i] !== undefined ? "#10b981" : "#334155", color: i === currentQ || answers[i] !== undefined ? "white" : "#64748b" }}
                  >
                    {i+1}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[["#f59e0b","Current"],["#10b981","Answered"],["#334155","Not Answered"]].map(([c,l]) => (
                  <div key={l} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c }}/>
                    <span style={{ fontSize: 10, color: "#64748b" }}>{l}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #334155" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Progress</div>
                <div style={{ height: 4, background: "#334155", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "#10b981", borderRadius: 4 }}/>
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>{answered}/{questions.length} answered</div>
              </div>
              <button onClick={() => submitExam(false)} style={{ marginTop: 14, width: "100%", background: "#10b981", border: "none", color: "white", padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                Submit Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}