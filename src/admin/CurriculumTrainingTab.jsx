import { useState, useEffect } from "react";
import { Modal, S, SearchBar, StatCard } from "../components/Shared";
import {
  getCourses, createCourse, deleteCourse, getCourseAssignments, getAdminTeachers,
  assignCourse, getCourseNotes, createCourseNote, getAdminAssessmentResults,
} from "../services/api";

/* ══════════════════════════════════════════════════════════════
   Training & Curriculum — Admin side (SELF-CONTAINED VERSION)

   Why this version doesn't call /api/course-library or
   /api/courses/from-library anymore:
   Those two backend routes aren't reliably deployed yet, and every
   call to them was surfacing as a generic "Request failed" toast.
   Since the 10-course library is static content (derived once from
   the docx), it's embedded directly below as LOCAL_LIBRARY and the
   "Create Course from Library" flow now builds the course payload
   client-side and saves it through the EXISTING createCourse
   endpoint — the same one the rest of this app already relies on.
   No backend changes are required for this file to work.
══════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  "all",
  "Foundations of ECE",
  "Curriculum Planning",
  "Instructional Strategies",
  "Assessment & Evaluation",
  "Classroom Management",
  "Health, Safety & Nutrition",
];
const LEVEL_COLORS = {
  Beginner: { bg: "#d1fae5", color: "#065f46" },
  Intermediate: { bg: "#dbeafe", color: "#1d4ed8" },
  Advanced: { bg: "#ede9fe", color: "#5b21b6" },
};
const CAT_COLORS = {
  "Foundations of ECE": "#f59e0b",
  "Curriculum Planning": "#10b981",
  "Instructional Strategies": "#3b82f6",
  "Assessment & Evaluation": "#8b5cf6",
  "Classroom Management": "#ef4444",
  "Health, Safety & Nutrition": "#06b6d4",
};

/* ══════════════════════════════════════════════════════════════
   LOCAL COURSE LIBRARY — 10 Pre-Primary courses, derived from
   PreSchool_Teacher_Courses.docx. Static content, embedded so this
   component never depends on a network call to load it.
══════════════════════════════════════════════════════════════ */
const LOCAL_LIBRARY = [
  {
    id: "cse-001",
    title: "Foundations of Early Childhood Care and Education (ECCE)",
    category: "Foundations of ECE",
    level: "Beginner",
    duration: "3 Weeks",
    description: "An introduction to the philosophy, history, and guiding principles of early childhood care and education, and why the pre-primary years shape a child's lifelong learning trajectory.",
    objectives: "Understand ECCE philosophy, key theorists, developmentally appropriate practice, and the teacher's role as a facilitator of early learning.",
    topics: [
      { title: "What is ECCE and Why the Early Years Matter", notes: "Early Childhood Care and Education (ECCE) refers to the holistic development of children from birth to eight years, with the pre-primary phase (3-6 years) being the most intensive period of brain development. During these years, over 90% of a child's brain architecture is formed through everyday experiences, relationships, and play. Neuroscience shows that responsive, stimulating environments in these years build the cognitive, social, emotional, and physical foundations on which all later learning depends. Teachers in this phase are not simply caregivers; they are the architects of a child's first formal learning experiences." },
      { title: "Key Theorists and Their Contributions", notes: "Several foundational theorists shape modern ECCE practice. Friedrich Froebel, the founder of the kindergarten movement, introduced the idea of learning through structured play. Maria Montessori emphasized a prepared environment and child-led exploration. Jean Piaget's theory of cognitive development described the Preoperational Stage (2-7 years) as central to this age group. Lev Vygotsky introduced the Zone of Proximal Development (ZPD) and scaffolding. Erik Erikson's 'Initiative vs Guilt' stage (ages 3-5) is central to this period." },
      { title: "Developmentally Appropriate Practice (DAP)", notes: "Developmentally Appropriate Practice means making decisions about curriculum and teaching based on knowledge of child development generally, the individual child, and the social/cultural context. In practice, DAP means offering open-ended materials, allowing choice and movement, and pacing expectations to match a child's current developmental level rather than a fixed calendar age." },
      { title: "The Role of the Pre-Primary Teacher", notes: "The pre-primary teacher wears many hats: facilitator, observer, environment designer, emotional anchor, and communicator with families. As a facilitator, the teacher poses open-ended questions. As an observer, the teacher continuously watches how children play and interact. As an environment designer, the teacher arranges the classroom into purposeful zones." },
      { title: "Ethics, Safety, and Professionalism in ECCE", notes: "Working with young children carries a special duty of care. Ethical practice begins with treating every child with dignity, avoiding comparison or shaming. Confidentiality matters. Physical safety is non-negotiable. Professionalism also means continuous self-reflection and lifelong learning." },
    ],
  },
  {
    id: "cse-002",
    title: "Child Growth and Development (0-6 Years)",
    category: "Foundations of ECE",
    level: "Beginner",
    duration: "3 Weeks",
    description: "A practical study of physical, cognitive, language, social, and emotional milestones from birth to six years, and how teachers can use milestone knowledge to plan age-appropriate activities.",
    objectives: "Identify typical developmental milestones across domains and design activities that match each stage of growth.",
    topics: [
      { title: "Domains of Development", notes: "Child development is generally described across five interconnected domains: physical (gross and fine motor skills), cognitive (thinking, memory, problem-solving), language, social, and emotional. These domains do not develop in isolation; a delay or strength in one area often influences the others." },
      { title: "Milestones: 3 to 4 Years", notes: "By age three to four, most children can run and jump, hold a crayon with an emerging pincer grip, use three-to-four word sentences, engage in parallel and early cooperative play, and start to name basic emotions, though self-regulation is still developing and tantrums remain common." },
      { title: "Milestones: 4 to 5 Years", notes: "Between four and five years, gross motor skills become more coordinated, fine motor control improves enough to cut along a line, sentences expand to five or more words, children engage in more sustained cooperative play, and they begin to use words instead of only physical reactions to express frustration." },
      { title: "Milestones: 5 to 6 Years", notes: "By five to six years, children display more refined gross and fine motor skills, language becomes more complex with connectors like 'because', social play becomes more cooperative and empathetic, self-regulation strengthens, and early number and letter-sound concepts emerge." },
      { title: "Using Milestones Without Labeling Children", notes: "Milestones are guides, not strict deadlines. Teachers should use milestone charts to plan activities and notice patterns, not to grade or rank children. Consistent variation across multiple domains is a signal to observe more closely and discuss with parents, not to label the child prematurely." },
    ],
  },
  {
    id: "cse-003",
    title: "Play-Based Learning and Pedagogy",
    category: "Instructional Strategies",
    level: "Intermediate",
    duration: "4 Weeks",
    description: "Deep dive into why and how play is the primary vehicle for learning in the early years, covering types of play, play-based lesson design, and the teacher's role during play.",
    objectives: "Design and facilitate structured and unstructured play experiences that build academic, social, and emotional skills.",
    topics: [
      { title: "Why Play is Learning", notes: "Play is not a break from learning in the pre-primary years — it is the primary mechanism through which learning happens. During play, children practice language, mathematics, problem-solving, social skills, and emotional regulation simultaneously." },
      { title: "Types of Play", notes: "Sensory/exploratory play builds curiosity and fine motor skills. Constructive play develops spatial reasoning. Dramatic/pretend play builds language and empathy. Physical/gross motor play supports body control. Games-with-rules introduce shared rules and turn-taking." },
      { title: "Designing a Play-Based Lesson", notes: "A well-designed play-based lesson begins with a clear learning objective disguised inside an inviting activity, includes a short circle-time introduction, a main activity block with multiple stations, embedded teacher interactions, and a closing circle to reinforce vocabulary." },
      { title: "The Teacher's Role During Play", notes: "During play, the teacher moves fluidly between four roles: observer, co-player, scaffolder, and extender. The key skill is restraint — knowing when to step in and when to let the child struggle productively." },
      { title: "Balancing Free Play and Guided Play", notes: "Effective pre-primary programs use a mix of free play (child-initiated) and guided play (adult-initiated setup, child-directed exploration). A well-balanced schedule includes daily blocks of both, along with outdoor free play." },
    ],
  },
  {
    id: "cse-004",
    title: "Curriculum Planning and Lesson Design for Pre-Primary",
    category: "Curriculum Planning",
    level: "Intermediate",
    duration: "4 Weeks",
    description: "How to build a coherent, theme-based pre-primary curriculum, write daily lesson plans, and align activities to learning goals across the year.",
    objectives: "Create a thematic yearly curriculum map and write detailed, developmentally appropriate daily lesson plans.",
    topics: [
      { title: "Principles of Early Years Curriculum Design", notes: "A good pre-primary curriculum is integrated rather than subject-siloed, spiral rather than linear (concepts are revisited with increasing complexity), and responsive to genuine child interest, while staying balanced across all five developmental domains every week." },
      { title: "Backward Design for Early Years", notes: "Backward Design starts with identifying desired results, then determining acceptable evidence of learning, and only then planning learning experiences — preventing the common trap of planning appealing activities first with no clear objective." },
      { title: "Writing a Daily Lesson Plan", notes: "A strong daily lesson plan includes a clear child-friendly objective, a hook or introduction, a main activity with anticipated child responses, materials needed, differentiation notes, and a closing/review section, plus explicitly planned transitions." },
      { title: "Theme-Based and Project-Based Approaches", notes: "Theme-based teaching organizes activities around a unifying topic, giving repeated varied exposure to vocabulary and concepts. The project approach (Reggio Emilia) takes this further with extended investigations emerging from genuine child curiosity." },
      { title: "Aligning Curriculum Across the Year", notes: "A yearly curriculum map should be cross-checked against a skills progression chart covering language, numeracy, social-emotional, physical, and creative goals, with regular review weeks roughly every 6-8 weeks to consolidate recent learning." },
    ],
  },
  {
    id: "cse-005",
    title: "Classroom Management and Positive Discipline",
    category: "Classroom Management",
    level: "Intermediate",
    duration: "3 Weeks",
    description: "Practical strategies for organizing the physical classroom, establishing routines, and guiding behavior positively without punishment or shame.",
    objectives: "Set up a child-friendly, safe physical environment and apply positive discipline techniques to guide behavior.",
    topics: [
      { title: "Designing the Physical Classroom", notes: "A well-organized pre-primary classroom is divided into clearly defined zones with low, open shelving, wide pathways, quiet zones separated from noisy zones, maximized natural light, and secured heavy furniture." },
      { title: "Building Predictable Routines", notes: "Young children thrive on predictability. A visible daily schedule with pictures, a consistent circle-time opening, and clear transition signals reduce anxiety and free mental energy for learning." },
      { title: "Positive Discipline Principles", notes: "Positive discipline treats behavior as communication, not defiance. Core techniques include stating expectations positively, offering limited choices, using natural and logical consequences, and connecting before correcting." },
      { title: "Managing Tantrums and Separation Anxiety", notes: "Tantrums are a normal, developmentally expected response to overwhelming emotion. During a tantrum, safety comes first, followed by staying calm nearby. Separation anxiety is best managed with a consistent, brief, confident goodbye routine." },
      { title: "Preventing Behavior Challenges Through Engagement", notes: "Most behavior challenges stem from unmet needs — boredom, fatigue, hunger, overstimulation — rather than intentional defiance. Prevention starts with engaging activities, movement breaks, and advance notice before transitions." },
    ],
  },
  {
    id: "cse-006",
    title: "Language and Early Literacy Development",
    category: "Instructional Strategies",
    level: "Intermediate",
    duration: "4 Weeks",
    description: "Strategies for building vocabulary, phonological awareness, and pre-writing skills through storytelling, songs, and print-rich environments.",
    objectives: "Plan daily language-rich activities and pre-literacy routines that build the foundation for reading and writing.",
    topics: [
      { title: "The Building Blocks of Early Literacy", notes: "Early literacy rests on oral language and vocabulary, phonological awareness, print awareness, alphabet knowledge, and emergent writing. Oral language and phonological awareness are far more predictive of later reading success than early letter recognition alone." },
      { title: "Read-Alouds and Storytelling", notes: "Daily read-alouds are one of the most powerful literacy practices available. Effective read-alouds are interactive, pause for predictive questions, and revisit the same beloved book multiple times to deepen vocabulary retention." },
      { title: "Building Vocabulary Intentionally", notes: "Vocabulary growth is dramatic in these years. Teachers can build vocabulary by pre-selecting target words per theme, using rich precise language, and pairing new words with real objects and hands-on experiences." },
      { title: "Phonological Awareness Activities", notes: "Phonological awareness develops from whole words and sentences, to syllables, to rhyme, to onset sounds, and finally blending/segmenting individual phonemes — all taught orally through games and songs, with no print required." },
      { title: "Emergent Writing and Fine Motor Preparation", notes: "Writing readiness begins with fine motor strength built through playdough, tongs, and threading beads. Emergent writing progresses through scribbling, mock letters, strings of real letters, and eventually conventional spelling attempts." },
    ],
  },
  {
    id: "cse-007",
    title: "Numeracy and Early Mathematical Thinking",
    category: "Instructional Strategies",
    level: "Intermediate",
    duration: "4 Weeks",
    description: "Building number sense, patterns, shapes, measurement, and early problem-solving through concrete, playful mathematics experiences.",
    objectives: "Sequence early numeracy concepts appropriately and design hands-on math activities that build genuine number sense.",
    topics: [
      { title: "What is Number Sense?", notes: "Number sense is a flexible, intuitive understanding of quantity, requiring one-to-one correspondence, cardinality, and subitizing — much deeper than rote counting. Genuine number sense requires extensive hands-on experience with real, countable objects." },
      { title: "Counting and Cardinality Progression", notes: "Counting develops from the rote number sequence, to one-to-one correspondence, to cardinality (understanding the last number counted represents the total), to counting on and comparing sets." },
      { title: "Patterns, Shapes, and Spatial Reasoning", notes: "Pattern recognition underlies later algebraic thinking. Shape knowledge should go beyond naming shapes to exploring properties through building and sorting. Spatial reasoning is a strong predictor of later mathematical ability." },
      { title: "Measurement and Comparison", notes: "Early measurement begins with direct, non-numerical comparison and non-standard units (blocks, hand-spans) before standard units. Water and sand play build early volume and capacity concepts." },
      { title: "Early Problem-Solving and Mathematical Thinking", notes: "Pre-primary mathematics should build curiosity, persistence, and willingness to try different strategies. Genuine open-ended problems and asking children to explain their thinking build mathematical reasoning and language together." },
    ],
  },
  {
    id: "cse-008",
    title: "Health, Nutrition, Safety and Hygiene in ECCE",
    category: "Health, Safety & Nutrition",
    level: "Beginner",
    duration: "2 Weeks",
    description: "Essential knowledge on child nutrition, hygiene routines, common illnesses, and safety protocols every pre-primary teacher must know.",
    objectives: "Apply health, hygiene, nutrition, and safety best practices to protect and promote the wellbeing of young children.",
    topics: [
      { title: "Nutrition Basics for Pre-Primary Children", notes: "Young children need frequent, smaller meals and healthy snacks rather than three large meals alone. Teachers must always be aware of and strictly respect any food allergies or dietary restrictions on file for each child." },
      { title: "Hygiene Routines", notes: "Consistent hygiene routines protect both individual and classroom health. Handwashing should be taught step by step and practiced at key transition points. Teachers should model correct handwashing themselves consistently." },
      { title: "Recognizing and Responding to Common Illnesses", notes: "Teachers should recognize signs of common childhood illnesses and know the appropriate response. Any head injury, breathing difficulty, or loss of consciousness is a medical emergency requiring immediate escalation." },
      { title: "Physical Safety in the Classroom and Outdoors", notes: "Physical safety requires ongoing vigilance: securing heavy furniture, keeping hazards inaccessible, clear emergency exits indoors, and soft surfacing, active supervision, and sun safety outdoors." },
      { title: "Building Health and Safety Awareness in Children", notes: "Part of a pre-primary teacher's role is building children's own health and safety awareness in age-appropriate ways, including simple body safety concepts taught in a calm, matter-of-fact tone." },
    ],
  },
  {
    id: "cse-009",
    title: "Inclusive Education and Special Needs in Early Years",
    category: "Curriculum Planning",
    level: "Advanced",
    duration: "3 Weeks",
    description: "Understanding developmental delays, common conditions like autism and ADHD, and practical inclusive classroom strategies for supporting every learner.",
    objectives: "Recognize early signs of developmental differences and apply inclusive, individualized strategies within a mainstream pre-primary classroom.",
    topics: [
      { title: "Principles of Inclusive Education", notes: "Inclusive education means adapting the environment, curriculum, and teaching approach to meet the needs of every child, rather than expecting every child to fit an unchanging classroom." },
      { title: "Recognizing Developmental Delay", notes: "Developmental delay means a child is achieving milestones at a slower pace than typical, not a permanent disability. Teachers should observe over time, document specific examples, and raise concerns collaboratively with families." },
      { title: "Understanding Autism Spectrum Differences and ADHD", notes: "Autism spectrum differences involve variations in social communication, sensory processing, and behavior patterns. ADHD involves difficulty with sustained attention, impulse control, or activity level. Both benefit from individualized, predictable supports." },
      { title: "Language and Learning Differences", notes: "Dyslexia primarily affects reading and writing, though early pre-primary signs often appear as difficulty with rhyming or remembering letter names, well before formal reading instruction begins." },
      { title: "Practical Inclusive Classroom Strategies", notes: "Practical inclusion includes universal design (visual schedules, consistent routines), peer buddy systems, flexible seating, and differentiated instruction offering the same activity at multiple levels of challenge." },
    ],
  },
  {
    id: "cse-010",
    title: "Assessment, Observation and Parent-Teacher Communication",
    category: "Assessment & Evaluation",
    level: "Intermediate",
    duration: "3 Weeks",
    description: "How to observe and document young children's progress without formal testing, and how to communicate that progress meaningfully to families.",
    objectives: "Use observation-based assessment tools effectively and communicate children's progress to parents constructively and confidently.",
    topics: [
      { title: "Why Formal Testing Doesn't Work for Young Children", notes: "Standardized testing is developmentally inappropriate for pre-primary children, whose test performance is far more likely to reflect mood, hunger, or comfort with the tester than actual knowledge." },
      { title: "Observation as an Assessment Tool", notes: "Systematic observation involves deliberately watching and recording specific aspects of a child's behavior during regular classroom activities. Effective notes are objective and specific rather than vague impressions." },
      { title: "Portfolio Assessment", notes: "A portfolio is a purposeful collection of a child's work samples and observations gathered over time, specifically selected to show growth rather than simply archiving everything a child produces." },
      { title: "Interpreting and Using Assessment Data", notes: "Collected observations are only valuable if actually used to inform teaching. Teachers should periodically review accumulated observations against a developmental milestone framework and adjust planning accordingly." },
      { title: "Communicating Progress to Parents", notes: "Parent-teacher communication should be frequent, specific, and two-directional. When discussing a concern, teachers should lead with strengths, use factual non-judgmental language, and frame conversations collaboratively." },
    ],
  },
];

const mapCourseFromApi = (c) => ({
  id: String(c._id || c.id),
  title: c.title,
  category: c.category || "Foundations of ECE",
  level: c.level || "Beginner",
  duration: c.duration || c.durationText || "3 Weeks",
  description: c.description || "",
  objectives: c.objectives || "",
  libraryId: c.libraryId || null,
  modules: c.modules || [],
  assignedCount: c.assignedCount || 0,
  completedCount: c.completedCount || 0,
});

/* Assessment scores are saved by ProctoredAssessment.jsx onto the
   CourseAssignment document itself (via updateCourseAssignmentProgress —
   the same endpoint already proven to work for reading-progress), NOT
   only through the separate /api/admin/assessments collection, which
   isn't reliably live. So the authoritative source here is `assignments`
   (already loaded successfully — that's how "100% notes read" shows up
   correctly); the API results are merged in only as a fallback for any
   teacher/course pair not already covered. */
function mergeAssessmentResults(assignments = [], apiResults = []) {
  const fromAssignments = assignments
    .filter((a) => a.assessmentPercentage !== undefined && a.assessmentPercentage !== null)
    .map((a) => ({
      _id: `assign-${a._id || a.id}`,
      teacher: a.teacher,
      course: a.course,
      courseTitle: a.course?.title,
      score: a.assessmentScore,
      total: a.assessmentTotal ?? 10,
      percentage: a.assessmentPercentage,
      grade: a.assessmentGrade,
      warnings: a.assessmentWarnings || 0,
      forced: !!a.assessmentForced,
      submittedAt: a.assessmentCompletedAt,
    }));
  const coveredKeys = new Set(
    fromAssignments.map((r) => `${r.teacher?._id || r.teacher}-${r.courseTitle}`)
  );
  const extra = apiResults.filter(
    (r) => !coveredKeys.has(`${r.teacher?._id || r.teacher}-${r.courseTitle || r.course?.title}`)
  );
  return [...fromAssignments, ...extra];
}

/* Build the payload createCourse() expects, from a LOCAL_LIBRARY entry.
   IMPORTANT: the backend Course schema's `contentType` field is an enum
   that only accepts "Video" | "PDF" | "Document" (the same three options
   the old manual course form used). There is no "Notes" value in that
   enum, so sending "Notes" throws a Mongoose validation error. Since
   these courses are text-based reading material (not video, not a raw
   PDF upload), "Document" is the closest valid enum value — it does NOT
   change how the course renders anywhere in the app; TeacherCourseNotes
   reads from `modules[].contents[].notes` regardless of contentType. */
function buildCoursePayloadFromLibrary(lib) {
  const modules = lib.topics.map((topic, idx) => ({
    title: topic.title,
    description: "",
    contents: [
      {
        title: topic.title,
        type: "reading",
        notes: topic.notes,
        suggestedDuration: `${Math.max(10, Math.round(topic.notes.split(" ").length / 130) * 5)} min read`,
        order: idx,
      },
    ],
  }));
  return {
    title: lib.title,
    category: lib.category,
    level: lib.level,
    duration: lib.duration,
    durationText: lib.duration,
    description: lib.description,
    objectives: lib.objectives,
    contentType: "Document", // valid enum value on the backend (Video | PDF | Document)
    libraryId: lib.id,
    modules,
  };
}

/* Does this course have any readable topic content at all? Used to flag
   stale/legacy courses (created before the notes-based model existed, or
   created from an incomplete upload) so admin can spot and clean them up. */
function getTopicCount(course) {
  return (course.modules || []).reduce((a, m) => a + (m.contents?.length || m.lessons?.length || 0), 0);
}

/* ── Read-only Notes Preview (admin) ── */
function NotesPreviewModal({ course, onClose }) {
  const topics = (course.modules || []).flatMap((m) => m.contents || m.lessons || []);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = topics[activeIdx];
  return (
    <Modal title={`📖 ${course.title} — Notes Preview`} onClose={onClose}>
      {topics.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>
            This course has no topics/notes attached. It was likely created before the notes-based course model, or the upload didn't complete.
          </div>
          <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>
            Recommended: delete this course and recreate it via "+ Create Course from Library".
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, minHeight: 360 }}>
          <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: 12, overflowY: "auto", maxHeight: 480 }}>
            {topics.map((t, i) => (
              <div key={t._id || t.id || i} onClick={() => setActiveIdx(i)}
                style={{ padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, fontSize: 12, fontWeight: i === activeIdx ? 800 : 600,
                  background: i === activeIdx ? "#fef3c7" : "transparent", color: i === activeIdx ? "#92400e" : "#374151" }}>
                {i + 1}. {t.title}
              </div>
            ))}
          </div>
          <div style={{ overflowY: "auto", maxHeight: 480, paddingRight: 4 }}>
            {active && (
              <>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 10 }}>{active.title}</div>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line" }}>{active.notes}</div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Course Form Modal: pick a course from the embedded library ── */
function CourseLibraryPickerModal({ onClose, onCreated, setToast }) {
  const [selectedId, setSelectedId] = useState("");
  const [creating, setCreating] = useState(false);

  const detail = LOCAL_LIBRARY.find((c) => c.id === selectedId) || null;

  const handleCreate = async () => {
    if (!selectedId) { setToast({ msg: "Please select a course from the library.", type: "error" }); return; }
    const lib = LOCAL_LIBRARY.find((c) => c.id === selectedId);
    if (!lib) { setToast({ msg: "That course could not be found in the library.", type: "error" }); return; }
    setCreating(true);
    try {
      const payload = buildCoursePayloadFromLibrary(lib);
      const res = await createCourse(payload);
      const created = res.course || res;
      const createdId = created._id || created.id;

      // IMPORTANT: writing notes onto modules[].contents[].notes above is
      // not enough — the teacher-side "My Courses" page reads notes from
      // the separate CourseNote collection (the same store your "Add
      // Note" button in the Track modal writes to). Without this step,
      // teachers see "No notes found for this course yet" even though
      // the admin preview shows all the topics. moduleIndex/contentIndex
      // mirror the 1-module-per-topic, 1-content-per-module structure
      // built in buildCoursePayloadFromLibrary above.
      let noteFailures = 0;
      if (createdId) {
        const noteResults = await Promise.allSettled(
          lib.topics.map((topic, idx) =>
            createCourseNote(createdId, {
              title: topic.title,
              content: topic.notes,
              moduleIndex: idx,
              contentIndex: 0,
            })
          )
        );
        noteFailures = noteResults.filter((r) => r.status === "rejected").length;
      }

      if (noteFailures > 0) {
        setToast({
          msg: `"${created.title || lib.title}" created, but ${noteFailures} of ${lib.topics.length} topic notes failed to save. Check Track → Additional Admin Notes and add any missing ones manually.`,
          type: "error",
        });
      } else {
        setToast({ msg: `"${created.title || lib.title}" added to Course Management with all ${lib.topics.length} topic notes.`, type: "success" });
      }
      onCreated();
      onClose();
    } catch (err) {
      setToast({ msg: err.message || "Failed to create course. Please check your connection and try again.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title="📚 Create Course from Library" onClose={onClose}>
      <div style={{ background: "#f0f9ff", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 12, color: "#0c4a6e", border: "1px solid #bae6fd" }}>
        📢 Courses are sourced from the SpacECE Pre-Primary Course Library — 10 ready-made courses with comprehensive, topic-wise notes for teachers to read and complete.
      </div>

      <label style={S.label}>Select a Course *</label>
      <select style={{ ...S.input, marginBottom: 14 }} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        <option value="">Choose a course from the library...</option>
        {LOCAL_LIBRARY.map((c) => (
          <option key={c.id} value={c.id}>{c.title} — {c.category} ({c.level})</option>
        ))}
      </select>

      {detail && (
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, border: "1px solid #f1f5f9", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{detail.title}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{detail.description}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>🎯 {detail.objectives}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>{detail.topics.length} Topics (comprehensive reading notes):</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
            {detail.topics.map((t, i) => (
              <div key={i} style={{ fontSize: 12, color: "#374151", padding: "4px 8px", background: "white", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                {i + 1}. {t.title}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleCreate} disabled={creating || !selectedId} style={{ ...S.primaryBtn, width: "100%", opacity: creating ? 0.7 : 1 }}>
        {creating ? "Creating..." : "✅ Create Course →"}
      </button>
    </Modal>
  );
}

/* ── Assign Course Modal (unchanged behaviour, no video references) ── */
function AssignCourseModal({ course, teachers = [], onClose, onAssigned, setToast }) {
  const [teacherId, setTeacherId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!teacherId) { setToast({ msg: "Please select a teacher.", type: "error" }); return; }
    setAssigning(true);
    try {
      await assignCourse(course.id, { teacherId, dueDate: dueDate || undefined });
      setToast({ msg: `"${course.title}" assigned! Teacher can now read the course notes on their dashboard.`, type: "success" });
      onAssigned();
      onClose();
    } catch (err) {
      setToast({ msg: err.message || "Failed to assign course", type: "error" });
    } finally {
      setAssigning(false);
    }
  };
  const approvedTeachers = teachers.filter((t) => t.status === "approved");
  return (
    <Modal title={`📋 Assign Course — ${course.title}`} onClose={onClose}>
      <div style={{ background: "#f0f9ff", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 12, color: "#0c4a6e", border: "1px solid #bae6fd" }}>
        📢 The teacher will see this course's notes on their dashboard, mark topics as read, and take a short assessment once all topics are complete.
      </div>
      <form onSubmit={handleAssign}>
        <label style={S.label}>Select Teacher *</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
          <option value="">Choose an approved teacher...</option>
          {approvedTeachers.map((t) => (
            <option key={t._id || t.id} value={t._id || t.id}>{t.name} — {t.email}</option>
          ))}
        </select>
        {approvedTeachers.length === 0 && (
          <div style={{ fontSize: 12, color: "#d97706", marginBottom: 12 }}>⚠️ No approved teachers found. Approve teachers first in Teacher Management.</div>
        )}
        <label style={S.label}>Due Date (optional)</label>
        <input type="date" style={{ ...S.input, marginBottom: 20 }} value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
        <button type="submit" disabled={assigning || !teacherId} style={{ ...S.primaryBtn, width: "100%", opacity: assigning ? 0.7 : 1 }}>
          {assigning ? "Assigning..." : "📋 Assign to Teacher →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Tracking Modal: reading completion + assessment scores per teacher ── */
function CourseTrackingModal({ course, assignments = [], assessmentResults = [], onClose, setToast }) {
  const courseAssignments = assignments.filter((a) => {
    const cid = a.course?._id || a.course?.id || a.course;
    return cid === course.id;
  });
  const courseResults = assessmentResults.filter((r) => (r.courseTitle || r.course?.title) === course.title);
  const avgScore = courseResults.length
    ? Math.round(courseResults.reduce((s, r) => s + (r.percentage || 0), 0) / courseResults.length)
    : null;

  const [notes, setNotes] = useState([]);
  useEffect(() => {
    if (!course?.id) return;
    getCourseNotes(course.id).then((res) => setNotes(res.notes || [])).catch(() => {});
  }, [course?.id]);

  return (
    <Modal title={`📊 Tracker: ${course.title}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: "14px 16px", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>📖 Reading Completion</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b" }}>
            {course.assignedCount > 0 ? Math.round((course.completedCount / course.assignedCount) * 100) : 0}%
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{course.completedCount}/{course.assignedCount} teachers finished all topics</div>
        </div>
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: "14px 16px", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>📝 Avg. Assessment Score</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: avgScore === null ? "#9ca3af" : avgScore >= 75 ? "#10b981" : avgScore >= 50 ? "#f59e0b" : "#ef4444" }}>
            {avgScore === null ? "—" : `${avgScore}%`}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{courseResults.length} attempt(s) recorded</div>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>👩‍🏫 Teacher Status</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto", marginBottom: 16 }}>
        {courseAssignments.length > 0 ? courseAssignments.map((a) => {
          const tname = a.teacher?.name || "Unknown Teacher";
          const progress = a.progressPercent || 0;
          const statusText = progress === 100 ? "Notes Completed" : "Reading in Progress";
          const teacherResult = courseResults.find((r) => (r.teacher?._id || r.teacher) === (a.teacher?._id || a.teacher));
          return (
            <div key={a._id || a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{tname}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: progress === 100 ? "#16a34a" : "#d97706" }}>
                  ● {statusText} ({progress}%)
                </div>
              </div>
              {teacherResult ? (
                <span style={{ fontSize: 12, fontWeight: 800, color: teacherResult.percentage >= 75 ? "#10b981" : teacherResult.percentage >= 50 ? "#f59e0b" : "#ef4444" }}>
                  📝 {teacherResult.percentage}% ({teacherResult.grade})
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#9ca3af" }}>No assessment yet</span>
              )}
            </div>
          );
        }) : (
          <div style={{ textAlign: "center", padding: 16, color: "#9ca3af", fontSize: 12 }}>No teachers assigned to this course yet.</div>
        )}
      </div>

      {notes.length > 0 && (
        <div style={{ padding: 14, background: "#fffbeb", borderRadius: 10, border: "2px solid #fbbf24" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e", marginBottom: 6 }}>📎 Additional Admin Notes ({notes.length})</div>
          {notes.map((n) => (
            <div key={n._id || n.id} style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>• {n.title}</div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function CurriculumTrainingTab({ setToast }) {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assessmentResults, setAssessmentResults] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [libraryModal, setLibraryModal] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [trackingModal, setTrackingModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Each call is caught individually so one failing endpoint (e.g. the
     assessment-results route not being live yet) never blocks the rest
     of the page — courses/assignments/teachers still load normally. */
  const loadCourses = () => {
    setLoading(true);
    Promise.all([
      getCourses().catch((err) => { console.error("getCourses failed:", err); return { courses: [] }; }),
      getCourseAssignments().catch((err) => { console.error("getCourseAssignments failed:", err); return { assignments: [] }; }),
      getAdminTeachers().catch((err) => { console.error("getAdminTeachers failed:", err); return { teachers: [] }; }),
      getAdminAssessmentResults().catch((err) => { console.error("getAdminAssessmentResults failed:", err); return { results: [] }; }),
    ])
      .then(([coursesRes, assignmentsRes, teachersRes, assessmentsRes]) => {
        const loadedAssignments = assignmentsRes.assignments || [];
        setAssignments(loadedAssignments);
        setTeachers(teachersRes.teachers || []);
        setAssessmentResults(mergeAssessmentResults(loadedAssignments, assessmentsRes.results || []));
        const mapped = [...new Map((coursesRes.courses || []).map((c) => [String(c._id || c.id), c]))]
          .map(([, c]) => mapCourseFromApi(c));
        setCourses(mapped);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, []); // eslint-disable-line

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    const ms = c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const mc = catFilter === "all" || c.category === catFilter;
    const ml = levelFilter === "all" || c.level === levelFilter;
    return ms && mc && ml;
  });

  const handleDelete = (course) => {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    deleteCourse(course.id)
      .then(() => { setToast({ msg: "Course deleted.", type: "success" }); loadCourses(); })
      .catch((err) => setToast({ msg: err.message, type: "error" }));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Courses...
      </div>
    );
  }

  const totalAssigned = courses.reduce((a, c) => a + c.assignedCount, 0);
  const totalCompleted = courses.reduce((a, c) => a + c.completedCount, 0);
  const overallPct = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
  const overallAvgScore = assessmentResults.length
    ? Math.round(assessmentResults.reduce((s, r) => s + (r.percentage || 0), 0) / assessmentResults.length)
    : 0;
  const staleCourseCount = courses.filter((c) => getTopicCount(c) === 0).length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {libraryModal && (
        <CourseLibraryPickerModal onClose={() => setLibraryModal(false)} onCreated={loadCourses} setToast={setToast} />
      )}
      {previewModal && selectedCourse && (
        <NotesPreviewModal course={selectedCourse} onClose={() => { setPreviewModal(false); setSelectedCourse(null); }} />
      )}
      {trackingModal && selectedCourse && (
        <CourseTrackingModal course={selectedCourse} assignments={assignments} assessmentResults={assessmentResults}
          onClose={() => { setTrackingModal(false); setSelectedCourse(null); }} setToast={setToast} />
      )}
      {assignModal && selectedCourse && (
        <AssignCourseModal course={selectedCourse} teachers={teachers}
          onClose={() => { setAssignModal(false); setSelectedCourse(null); }} onAssigned={loadCourses} setToast={setToast} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Training & Curriculum</h1>
          <p style={S.pageSub}>{courses.length} courses · {overallPct}% notes completion · {overallAvgScore}% avg assessment score</p>
        </div>
        <button onClick={() => setLibraryModal(true)} style={S.primaryBtn}>+ Create Course from Library</button>
      </div>

      {staleCourseCount > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: "#991b1b" }}>
          ⚠️ {staleCourseCount} course{staleCourseCount > 1 ? "s have" : " has"} no topics/notes attached (created before the notes-based model, or an incomplete upload). Look for the "No topics" badge below, then delete and recreate via "+ Create Course from Library".
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="📚" label="Total Courses" val={courses.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="📖" label="Notes Completion" val={`${overallPct}%`} color="#10b981" bg="#d1fae5" />
        <StatCard icon="📝" label="Avg Assessment Score" val={`${overallAvgScore}%`} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="👥" label="Total Assignments" val={totalAssigned} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="✅" label="Assessments Taken" val={assessmentResults.length} color="#06b6d4" bg="#cffafe" />
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." />
        </div>
        <select style={{ ...S.input, width: 200, marginBottom: 0 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
        </select>
        <select style={{ ...S.input, width: 150, marginBottom: 0 }} value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="all">All Levels</option>
          <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
        </select>
        {(catFilter !== "all" || levelFilter !== "all" || search) && (
          <button onClick={() => { setCatFilter("all"); setLevelFilter("all"); setSearch(""); }} style={{ ...S.tblBtn, color: "#ef4444", borderColor: "#fca5a5" }}>✕ Clear</button>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Showing {filtered.length} of {courses.length} courses</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
        {filtered.map((c) => {
          const lc = LEVEL_COLORS[c.level] || LEVEL_COLORS.Beginner;
          const pct = c.assignedCount > 0 ? Math.round((c.completedCount / c.assignedCount) * 100) : 0;
          const catColor = CAT_COLORS[c.category] || "#f59e0b";
          const topicCount = getTopicCount(c);
          const isStale = topicCount === 0;
          const courseResults = assessmentResults.filter((r) => (r.courseTitle || r.course?.title) === c.title);
          const avgScore = courseResults.length ? Math.round(courseResults.reduce((s, r) => s + (r.percentage || 0), 0) / courseResults.length) : null;
          return (
            <div key={c.id} style={{ background: "white", borderRadius: 14, border: isStale ? "1px solid #fca5a5" : "1px solid #f1f5f9", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 18px 0" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${catColor}20`, color: catColor }}>{c.category}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: lc.bg, color: lc.color }}>{c.level}</span>
                  {isStale ? (
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#fee2e2", color: "#dc2626" }}>⚠️ No topics</span>
                  ) : (
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#f3f4f6", color: "#6b7280" }}>📖 {topicCount} topics</span>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 6, lineHeight: 1.4 }}>{c.title}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                  <span>⏱️ {c.duration}</span>
                  <span>👥 {c.assignedCount} assigned</span>
                </div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px", lineHeight: 1.5 }}>
                  {c.description.length > 110 ? c.description.substring(0, 110) + "..." : c.description}
                </p>
              </div>

              {/* Reading completion + assessment score */}
              <div style={{ padding: "0 18px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 3 }}>
                  <span>NOTES READ</span><span>{pct}%</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct >= 75 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  📝 Avg assessment: <b style={{ color: avgScore === null ? "#9ca3af" : avgScore >= 75 ? "#10b981" : "#f59e0b" }}>{avgScore === null ? "—" : `${avgScore}%`}</b>
                  {" · "}{courseResults.length} attempt(s)
                </div>
              </div>

              <div style={{ padding: "0 18px 16px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => { setSelectedCourse(c); setPreviewModal(true); }} style={{ ...S.tblBtn, flex: 1, color: "#7c3aed", borderColor: "#c4b5fd" }}>📖 Preview Notes</button>
                <button onClick={() => { setSelectedCourse(c); setAssignModal(true); }} disabled={isStale} style={{ ...S.tblBtn, flex: 1, color: isStale ? "#9ca3af" : "#059669", borderColor: isStale ? "#e5e7eb" : "#6ee7b7", cursor: isStale ? "not-allowed" : "pointer" }}>📋 Assign</button>
                <button onClick={() => { setSelectedCourse(c); setTrackingModal(true); }} style={{ ...S.tblBtn, flex: 1, color: "#2563eb", borderColor: "#bfdbfe" }}>📊 Track</button>
                <button onClick={() => handleDelete(c)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No courses found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Create a course from the library to get started.</div>
        </div>
      )}
    </div>
  );
}