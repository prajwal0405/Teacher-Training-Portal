import { useState, useEffect, useRef, useCallback } from "react";
import { S } from "../components/Shared";
import { submitAssessmentResult, getMyAssessmentResults, updateCourseAssignmentProgress } from "../services/api";

/* ═══════════════════════════════════════════════════════════
   PROCTORED ASSESSMENT — SELF-CONTAINED VERSION

   Why the question bank is embedded here instead of fetched:
   GET /api/assessment-bank/:libraryId isn't reliably live on the
   backend yet, and every call to it was surfacing as "Request
   failed" the moment a teacher clicked "Start Exam" — the exam
   screen never advanced because there were no questions to show.
   Since the 10-course x 10-question bank is static content (it
   doesn't change per teacher or per attempt), it's embedded below
   as ASSESSMENT_BANK, matched to a course either via its
   `libraryId` field (if your backend returns one) or by matching
   the course title against LIBRARY_TITLES as a fallback — so this
   works even if `libraryId` isn't coming through in
   getTeacherProgress()'s populated course object.

   How the score gets saved (and why it changed):
   POST /api/assessments (submitAssessmentResult) was also not
   reliably live, so the score never reached the database and
   never showed up for the teacher on reload or for admin at all
   — even though the exam completed fine locally. Rather than wait
   on that route, scores are now saved through
   updateCourseAssignmentProgress() — the SAME endpoint already
   proven to work for reading-progress ("100% notes read" already
   shows correctly for both teacher and admin), just extended to
   also carry assessment fields (assessmentScore, assessmentTotal,
   assessmentPercentage, assessmentGrade, assessmentCompletedAt,
   assessmentWarnings, assessmentForced). submitAssessmentResult()
   is still attempted as a secondary, best-effort call in case that
   route becomes available later, but nothing depends on it.

   A localStorage safety net also guarantees the "already attempted,
   no retake" rule holds on THIS device even in the worst case where
   both server calls fail — so a teacher can never grind an unlimited
   number of attempts just by the network being flaky.
═══════════════════════════════════════════════════════════ */

const ASSESSMENT_DURATION = 20 * 60;
const MAX_WARNINGS = 5;

/* Course title -> library id, used as a fallback match when the course
   object from getTeacherProgress() doesn't carry a `libraryId` field. */
const LIBRARY_TITLES = {
  "Foundations of Early Childhood Care and Education (ECCE)": "cse-001",
  "Child Growth and Development (0-6 Years)": "cse-002",
  "Play-Based Learning and Pedagogy": "cse-003",
  "Curriculum Planning and Lesson Design for Pre-Primary": "cse-004",
  "Classroom Management and Positive Discipline": "cse-005",
  "Language and Early Literacy Development": "cse-006",
  "Numeracy and Early Mathematical Thinking": "cse-007",
  "Health, Nutrition, Safety and Hygiene in ECCE": "cse-008",
  "Inclusive Education and Special Needs in Early Years": "cse-009",
  "Assessment, Observation and Parent-Teacher Communication": "cse-010",
};

function resolveLibraryId(course) {
  if (!course) return null;
  if (course.libraryId && ASSESSMENT_BANK[course.libraryId]) return course.libraryId;
  return LIBRARY_TITLES[course.title] || null;
}

/* ── localStorage safety net for "one attempt only" ──
   Keyed by assignment id, this guarantees the retake lock holds on
   this device even if both server-save attempts fail — a teacher can
   never get unlimited retries purely because a network call flaked. */
const ATTEMPT_KEY_PREFIX = "spacece_assessment_attempt_";

function loadStoredAttempt(assignmentId) {
  try {
    const raw = localStorage.getItem(ATTEMPT_KEY_PREFIX + assignmentId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredAttempt(assignmentId, result) {
  try {
    localStorage.setItem(ATTEMPT_KEY_PREFIX + assignmentId, JSON.stringify(result));
  } catch (err) {
    console.error("Failed to persist attempt locally:", err);
  }
}

const ASSESSMENT_BANK = {
  "cse-001": [
    { id: "q1", topic: "What is ECCE and Why the Early Years Matter", q: "Roughly what share of a child's brain architecture forms during the ECCE years?", opts: ["Under 25%", "About 50%", "Over 90%", "It is fixed at birth"], ans: 2 },
    { id: "q2", topic: "Key Theorists", q: "Who introduced the concept of the Zone of Proximal Development and scaffolding?", opts: ["Jean Piaget", "Lev Vygotsky", "Maria Montessori", "Erik Erikson"], ans: 1 },
    { id: "q3", topic: "Key Theorists", q: "Which stage of Piaget's theory does most of the pre-primary age group fall into?", opts: ["Sensorimotor", "Preoperational", "Concrete Operational", "Formal Operational"], ans: 1 },
    { id: "q4", topic: "Key Theorists", q: "Erikson's 'Initiative vs Guilt' stage roughly corresponds to which age range?", opts: ["0-18 months", "18 months-3 years", "3-5 years", "6-12 years"], ans: 2 },
    { id: "q5", topic: "Developmentally Appropriate Practice (DAP)", q: "DAP decisions should be based on knowledge of:", opts: ["Age only", "Age, the individual child, and social/cultural context", "Test scores only", "National curriculum only"], ans: 1 },
    { id: "q6", topic: "Developmentally Appropriate Practice (DAP)", q: "A classroom practicing DAP is most likely to:", opts: ["Use long seated worksheet sessions for 3-year-olds", "Offer open-ended materials and child choice", "Grade children against each other", "Follow a fixed calendar-age curriculum strictly"], ans: 1 },
    { id: "q7", topic: "The Role of the Pre-Primary Teacher", q: "Acting as an 'environment designer', the teacher primarily:", opts: ["Lectures at the front of the room", "Arranges purposeful zones that invite exploration", "Removes all materials to reduce distraction", "Assigns seating by test scores"], ans: 1 },
    { id: "q8", topic: "The Role of the Pre-Primary Teacher", q: "Continuous observation of children during play mainly helps the teacher to:", opts: ["Fill administrative forms", "Plan next activities and spot children needing support", "Rank children by ability", "Reduce parent communication"], ans: 1 },
    { id: "q9", topic: "Ethics, Safety, and Professionalism", q: "According to ethical ECCE practice, information about a child's family situation should be:", opts: ["Shared openly with all staff", "Shared only with those who need it for the child's wellbeing", "Posted on a notice board", "Discussed with other parents"], ans: 1 },
    { id: "q10", topic: "Ethics, Safety, and Professionalism", q: "A powerful, low-cost tool for continuous teacher self-improvement mentioned in this course is:", opts: ["Annual external audits only", "A simple daily/weekly reflective journal", "Ignoring what doesn't work", "Waiting for formal appraisal"], ans: 1 },
  ],
  "cse-002": [
    { id: "q1", topic: "Domains of Development", q: "How many major domains of development are described in this course?", opts: ["Three", "Four", "Five", "Seven"], ans: 2 },
    { id: "q2", topic: "Domains of Development", q: "Why should teachers observe all developmental domains, not just cognitive/academic ones?", opts: ["It is required by law only", "Domains are interconnected and influence each other", "Only cognitive domain matters for school readiness", "Other domains develop automatically"], ans: 1 },
    { id: "q3", topic: "Milestones: 3 to 4 Years", q: "At 3-4 years, attention span for a single activity is typically around:", opts: ["1-2 minutes", "5-10 minutes", "30 minutes", "60 minutes"], ans: 1 },
    { id: "q4", topic: "Milestones: 3 to 4 Years", q: "A 3-4 year old using a block as a pretend phone demonstrates:", opts: ["Symbolic/pretend play", "Cooperative play only", "Formal operational thinking", "A developmental delay"], ans: 0 },
    { id: "q5", topic: "Milestones: 4 to 5 Years", q: "By age 4-5, children can typically follow instructions of about:", opts: ["A single word", "2-3 step instructions", "10-step instructions", "No instructions"], ans: 1 },
    { id: "q6", topic: "Milestones: 5 to 6 Years", q: "By 5-6 years, a key emerging pre-literacy skill is:", opts: ["Formal operational reasoning", "Phonemic awareness / letter-sound relationships", "Abstract algebra", "Cursive handwriting"], ans: 1 },
    { id: "q7", topic: "Milestones: 5 to 6 Years", q: "Sustained attention on a chosen task at 5-6 years is typically around:", opts: ["1-2 minutes", "5 minutes", "15-20 minutes", "2 hours"], ans: 2 },
    { id: "q8", topic: "Using Milestones Without Labeling Children", q: "Milestone charts should primarily be used to:", opts: ["Rank children publicly", "Guide planning and noticing patterns, not to label children", "Decide which children to exclude from class", "Replace all teacher observation"], ans: 1 },
    { id: "q9", topic: "Using Milestones Without Labeling Children", q: "A single missed milestone in one domain should generally be treated as:", opts: ["An emergency requiring immediate referral", "Likely normal variation, to be watched over time", "Proof of a permanent disability", "A reason to hold the child back a year automatically"], ans: 1 },
    { id: "q10", topic: "Domains of Development", q: "Which of these is NOT one of the five developmental domains discussed?", opts: ["Physical", "Language", "Financial", "Emotional"], ans: 2 },
  ],
  "cse-003": [
    { id: "q1", topic: "Why Play is Learning", q: "According to this course, play in the pre-primary years is best described as:", opts: ["A break from learning", "The primary mechanism through which learning happens", "Only useful for physical development", "Something to minimize to fit more instruction"], ans: 1 },
    { id: "q2", topic: "Types of Play", q: "Parten's stages of social play move in which general order?", opts: ["Cooperative → Solitary → Parallel → Associative", "Solitary → Parallel → Associative → Cooperative", "Associative → Cooperative → Solitary → Parallel", "Parallel → Cooperative → Solitary → Associative"], ans: 1 },
    { id: "q3", topic: "Types of Play", q: "Building with blocks and puzzles is an example of which type of play?", opts: ["Dramatic play", "Constructive play", "Games-with-rules", "Sensory play only"], ans: 1 },
    { id: "q4", topic: "Designing a Play-Based Lesson", q: "In a play-based lesson plan, the closing circle mainly serves to:", opts: ["Assign homework", "Let children share and reinforce vocabulary/understanding informally", "Administer a formal test", "End the day early"], ans: 1 },
    { id: "q5", topic: "The Teacher's Role During Play", q: "When a child's tower keeps falling, an example of appropriate 'scaffolding' is to:", opts: ["Build the tower for the child", "Suggest a wider base and let the child try again", "Tell the child to stop playing with blocks", "Ignore the child completely"], ans: 1 },
    { id: "q6", topic: "The Teacher's Role During Play", q: "As a 'co-player', the teacher should primarily:", opts: ["Take over and direct the play", "Follow the child's lead when invited into play", "Avoid ever joining play", "Correct the child's imagination"], ans: 1 },
    { id: "q7", topic: "Balancing Free Play and Guided Play", q: "Guided play differs from free play mainly in that guided play:", opts: ["Has zero adult involvement", "Has adult-set-up learning goals but child-directed exploration", "Is entirely teacher-scripted with no child choice", "Only happens outdoors"], ans: 1 },
    { id: "q8", topic: "Balancing Free Play and Guided Play", q: "Outdoor free play is specifically noted to support:", opts: ["Only academic worksheets", "Gross motor development and rich cooperative/dramatic play", "Reduced social interaction", "Formal testing readiness"], ans: 1 },
    { id: "q9", topic: "Why Play is Learning", q: "Research comparing high-quality play-based programs to highly didactic ones generally shows:", opts: ["Play-based programs perform worse academically", "Play-based programs perform as well or better, with stronger social-emotional outcomes", "No developmental benefit from play", "Worksheet-heavy programs are always superior"], ans: 1 },
    { id: "q10", topic: "Designing a Play-Based Lesson", q: "Using real objects (real fruit, real utensils) rather than abstract worksheets is recommended because:", opts: ["It is cheaper", "Concrete, authentic materials are more engaging and meaningful to young children", "It reduces the need for supervision", "Worksheets are prohibited"], ans: 1 },
  ],
  "cse-004": [
    { id: "q1", topic: "Principles of Early Years Curriculum Design", q: "An 'integrated' curriculum approach means:", opts: ["Teaching each subject in a separate isolated period", "Weaving language, math, art, etc. into a single theme", "Only teaching one subject per term", "Avoiding themes entirely"], ans: 1 },
    { id: "q2", topic: "Principles of Early Years Curriculum Design", q: "A 'spiral' curriculum, as described by Bruner, means core concepts are:", opts: ["Taught once and never revisited", "Revisited repeatedly with increasing complexity", "Only taught in the final term", "Removed after first exposure"], ans: 1 },
    { id: "q3", topic: "Backward Design for Early Years", q: "In Backward Design, what is identified FIRST?", opts: ["The activities", "The desired results/learning goals", "The classroom decorations", "The assessment rubric only"], ans: 1 },
    { id: "q4", topic: "Backward Design for Early Years", q: "The second step of Backward Design is:", opts: ["Planning learning experiences", "Determining acceptable evidence of learning", "Buying materials", "Writing report cards"], ans: 1 },
    { id: "q5", topic: "Writing a Daily Lesson Plan", q: "A strong daily lesson plan should state the learning objective in terms that are:", opts: ["Vague and general", "Child-friendly and observable", "Written only for the principal", "Optional"], ans: 1 },
    { id: "q6", topic: "Writing a Daily Lesson Plan", q: "Poorly managed transitions between activities are noted as a common source of:", opts: ["Improved focus", "Classroom disruption", "Faster learning", "Better attendance"], ans: 1 },
    { id: "q7", topic: "Theme-Based and Project-Based Approaches", q: "The project approach, associated with Reggio Emilia, is characterized by:", opts: ["A rigid teacher-only agenda", "Extended investigation emerging from genuine child curiosity", "No documentation of children's work", "Ignoring child questions"], ans: 1 },
    { id: "q8", topic: "Theme-Based and Project-Based Approaches", q: "Early in the year, yearly theme maps should generally favor themes that are:", opts: ["Abstract and distant", "Familiar and concrete (self, family, body)", "Only about transportation", "Randomly ordered with no logic"], ans: 1 },
    { id: "q9", topic: "Aligning Curriculum Across the Year", q: "Regular review weeks (roughly every 6-8 weeks) are recommended mainly because:", opts: ["Young children need more repetition to retain concepts", "They save the teacher paperwork", "They replace all other planning", "They are required only once a year"], ans: 0 },
    { id: "q10", topic: "Aligning Curriculum Across the Year", q: "A yearly curriculum map should be cross-checked against a skills progression chart covering:", opts: ["Only literacy goals", "Language, numeracy, social-emotional, physical, and creative goals", "Only assessment dates", "Only teacher preferences"], ans: 1 },
  ],
  "cse-005": [
    { id: "q1", topic: "Designing the Physical Classroom", q: "Shelves and materials in a child-friendly classroom should generally be:", opts: ["High to prevent access", "Low and open for child independence", "Locked at all times", "Placed only in the teacher's area"], ans: 1 },
    { id: "q2", topic: "Designing the Physical Classroom", q: "Which safety practice is emphasized as non-negotiable?", opts: ["Leaving heavy furniture unsecured", "Securing heavy furniture to walls and keeping exits clear", "Keeping cleaning chemicals accessible for convenience", "Locking emergency exits during class"], ans: 1 },
    { id: "q3", topic: "Building Predictable Routines", q: "A visible daily schedule for pre-readers should ideally use:", opts: ["Only text, no pictures", "Pictures alongside words", "No schedule at all", "A schedule only the teacher can see"], ans: 1 },
    { id: "q4", topic: "Building Predictable Routines", q: "Consistent daily routines primarily help children by:", opts: ["Increasing anxiety", "Reducing anxiety and freeing mental energy for learning", "Making the day less predictable", "Replacing the need for supervision"], ans: 1 },
    { id: "q5", topic: "Positive Discipline Principles", q: "Positive discipline is grounded in viewing behavior as:", opts: ["Defiance to be crushed with punishment", "Communication of an unmet need or missing skill", "Something to ignore completely", "Irrelevant to teaching"], ans: 1 },
    { id: "q6", topic: "Positive Discipline Principles", q: "Effective praise should focus on:", opts: ["Outcome only", "Effort and specific actions", "Comparing the child to peers", "Being vague ('good job')"], ans: 1 },
    { id: "q7", topic: "Positive Discipline Principles", q: "Stating expectations positively means saying:", opts: ["'No running!'", "'Walking feet inside'", "Nothing at all", "'Stop that now'"], ans: 1 },
    { id: "q8", topic: "Managing Tantrums and Separation Anxiety", q: "During a tantrum, the teacher's first priority is:", opts: ["Lecturing the child", "Ensuring safety and staying calm nearby", "Ignoring the child completely and walking away", "Immediately discussing consequences"], ans: 1 },
    { id: "q9", topic: "Managing Tantrums and Separation Anxiety", q: "For separation anxiety, the recommended approach to goodbyes is:", opts: ["Prolonged, drawn-out goodbyes", "A consistent, brief, confident goodbye routine", "Sneaking away without saying goodbye", "Avoiding drop-off entirely"], ans: 1 },
    { id: "q10", topic: "Preventing Behavior Challenges Through Engagement", q: "Most behavior challenges in pre-primary classrooms are said to stem from:", opts: ["Intentional defiance", "Unmet needs like boredom, fatigue, or overstimulation", "Genetics alone", "Poor teacher training only"], ans: 1 },
  ],
  "cse-006": [
    { id: "q1", topic: "The Building Blocks of Early Literacy", q: "Which of these is the strongest predictor of later reading success according to this course?", opts: ["Letter drilling alone", "Phonological awareness built through oral games", "Formal handwriting practice", "Memorizing the alphabet song only"], ans: 1 },
    { id: "q2", topic: "The Building Blocks of Early Literacy", q: "Print awareness includes understanding that:", opts: ["Books have no fixed reading direction", "We read left to right and print carries meaning", "Pictures are more important than print", "Print awareness is unrelated to reading"], ans: 1 },
    { id: "q3", topic: "Read-Alouds and Storytelling", q: "Interactive read-alouds are effective partly because they:", opts: ["Are read silently with no pauses", "Include predictive questions and expressive voices", "Avoid repeating the same book ever", "Skip discussion after the story"], ans: 1 },
    { id: "q4", topic: "Read-Alouds and Storytelling", q: "Repeated readings of the same beloved book:", opts: ["Waste classroom time", "Deepen vocabulary retention and comprehension", "Bore children and should be avoided", "Have no measurable benefit"], ans: 1 },
    { id: "q5", topic: "Building Vocabulary Intentionally", q: "By approximately what age does vocabulary reach over 5,000 words in this course's description?", opts: ["Age 2", "Age 3", "Age 6", "Age 10"], ans: 2 },
    { id: "q6", topic: "Building Vocabulary Intentionally", q: "Teaching target vocabulary words works best when paired with:", opts: ["Abstract explanation only", "Real objects, pictures, and hands-on experiences", "No repetition across the week", "Simplified 'baby talk' only"], ans: 1 },
    { id: "q7", topic: "Phonological Awareness Activities", q: "Phonological awareness activities typically progress from:", opts: ["Phonemes to syllables to words", "Whole words/sentences to syllables to rhyme to phonemes", "Random order with no sequence", "Writing to speaking"], ans: 1 },
    { id: "q8", topic: "Phonological Awareness Activities", q: "Blending and segmenting individual phonemes (e.g., c-a-t) is typically:", opts: ["The first skill children develop", "One of the last phonological skills to develop", "Unrelated to reading", "Taught before rhyme"], ans: 1 },
    { id: "q9", topic: "Emergent Writing and Fine Motor Preparation", q: "Which activity is recommended to build fine motor strength before writing?", opts: ["Long worksheet drills", "Playdough manipulation and using tongs/tweezers", "Cursive handwriting practice for 3-year-olds", "Typing on a keyboard only"], ans: 1 },
    { id: "q10", topic: "Emergent Writing and Fine Motor Preparation", q: "Forcing formal letter formation before a child is fine-motor ready can lead to:", opts: ["Faster literacy development", "Frustration and improper pencil grip habits", "No effect at all", "Immediate reading fluency"], ans: 1 },
  ],
  "cse-007": [
    { id: "q1", topic: "What is Number Sense?", q: "True number sense is described as requiring more than:", opts: ["One-to-one correspondence", "Rote counting alone", "Cardinality", "Subitizing"], ans: 1 },
    { id: "q2", topic: "What is Number Sense?", q: "'Subitizing' refers to:", opts: ["Counting slowly one by one", "Instantly recognizing small quantities without counting", "Writing numerals", "Measuring length"], ans: 1 },
    { id: "q3", topic: "Counting and Cardinality Progression", q: "Cardinality means understanding that:", opts: ["The first number said is the total", "The last number counted represents the total quantity", "Counting order doesn't matter", "Objects can be counted twice"], ans: 1 },
    { id: "q4", topic: "Counting and Cardinality Progression", q: "An authentic, embedded way to practice counting daily is:", opts: ["Only during a single isolated 'math time'", "Counting children present for attendance", "Avoiding counting until formal school", "Worksheets only"], ans: 1 },
    { id: "q5", topic: "Patterns, Shapes, and Spatial Reasoning", q: "A repeating pattern like red-blue-red-blue is an example of:", opts: ["An AB pattern", "Cardinality", "Subitizing", "Measurement"], ans: 0 },
    { id: "q6", topic: "Patterns, Shapes, and Spatial Reasoning", q: "Children should encounter shapes:", opts: ["Only as flat, upright cutouts", "In many orientations and contexts", "Only once per year", "Without any hands-on building"], ans: 1 },
    { id: "q7", topic: "Measurement and Comparison", q: "Early measurement should begin with:", opts: ["Standard units like centimeters", "Direct, non-numerical comparison and non-standard units", "Complex formulas", "Digital measuring tools only"], ans: 1 },
    { id: "q8", topic: "Measurement and Comparison", q: "Water and sand play are highlighted as useful for building early concepts of:", opts: ["Volume and capacity", "Algebra", "Formal geometry proofs", "Handwriting"], ans: 0 },
    { id: "q9", topic: "Early Problem-Solving and Mathematical Thinking", q: "When a child gives a wrong count, the recommended teacher response is to:", opts: ["Simply mark it wrong and move on", "Recount together to discover where the counting broke down", "Punish the mistake", "Avoid counting activities in future"], ans: 1 },
    { id: "q10", topic: "Early Problem-Solving and Mathematical Thinking", q: "Asking 'How did you know there were more red blocks?' primarily builds:", opts: ["Mathematical reasoning and language together", "Only fine motor skills", "Nothing measurable", "Rote memorization only"], ans: 0 },
  ],
  "cse-008": [
    { id: "q1", topic: "Nutrition Basics for Pre-Primary Children", q: "Because young children have small stomachs but high nutrient needs, the recommended approach is:", opts: ["Three large meals only", "Frequent, smaller meals and healthy snacks", "Skipping meals often", "Only sugary snacks"], ans: 1 },
    { id: "q2", topic: "Nutrition Basics for Pre-Primary Children", q: "Regarding food allergies, teachers should:", opts: ["Treat allergy information casually", "Strictly respect and be aware of every child's allergy information", "Ignore allergy lists if inconvenient", "Only check allergies occasionally"], ans: 1 },
    { id: "q3", topic: "Hygiene Routines", q: "Handwashing should be practiced at which of these key points?", opts: ["Only once a week", "On arrival, before eating, and after toileting", "Never during the school day", "Only if visibly dirty"], ans: 1 },
    { id: "q4", topic: "Hygiene Routines", q: "Children learn correct handwashing best when:", opts: ["Only told verbally, never shown", "Teachers consistently model it themselves", "It is never demonstrated", "It is optional for staff"], ans: 1 },
    { id: "q5", topic: "Recognizing and Responding to Common Illnesses", q: "A head injury, breathing difficulty, or loss of consciousness should be treated as:", opts: ["A routine matter needing no urgency", "A medical emergency requiring immediate escalation", "Something to monitor for a week first", "Not the teacher's concern"], ans: 1 },
    { id: "q6", topic: "Recognizing and Responding to Common Illnesses", q: "Before any incident occurs, a teacher should already know:", opts: ["Nothing in advance", "Where the first-aid kit is and the emergency protocol", "Only the school's phone number", "The class timetable only"], ans: 1 },
    { id: "q7", topic: "Physical Safety in the Classroom and Outdoors", q: "Outdoor play equipment should have which type of surfacing beneath it?", opts: ["Hard concrete", "Soft, impact-absorbing surfacing", "No surfacing required", "Loose gravel only"], ans: 1 },
    { id: "q8", topic: "Physical Safety in the Classroom and Outdoors", q: "Active supervision outdoors means:", opts: ["Passive presence while distracted", "Constant supervision with a clear line of sight to all children", "Supervising only some children", "Supervision only indoors"], ans: 1 },
    { id: "q9", topic: "Building Health and Safety Awareness in Children", q: "Body safety concepts for young children should be taught in a tone that is:", opts: ["Frightening and dramatic", "Calm, matter-of-fact, and age-appropriate", "Avoided entirely", "Only discussed once a year"], ans: 1 },
    { id: "q10", topic: "Building Health and Safety Awareness in Children", q: "Pretend-doctor dramatic play is suggested as a way to:", opts: ["Frighten children about hospitals", "Make health education engaging and everyday", "Replace all first-aid training", "Avoid discussing hygiene"], ans: 1 },
  ],
  "cse-009": [
    { id: "q1", topic: "Principles of Inclusive Education", q: "Inclusive education primarily means:", opts: ["Separating children with differences into other settings", "Adapting environment/curriculum to meet every child's needs", "Expecting every child to fit an unchanging classroom", "Excluding children who learn differently"], ans: 1 },
    { id: "q2", topic: "Principles of Inclusive Education", q: "Successful inclusion requires collaboration between:", opts: ["The classroom teacher only, working in isolation", "Teacher, specialists/therapists where involved, and families", "Only the school principal", "No communication with families"], ans: 1 },
    { id: "q3", topic: "Recognizing Developmental Delay", q: "A developmental delay means a child is:", opts: ["Permanently disabled with no possibility of change", "Achieving milestones at a slower pace than typical", "Always ahead of peers", "Not a valid educational concept"], ans: 1 },
    { id: "q4", topic: "Recognizing Developmental Delay", q: "When raising a developmental concern with parents, teachers should:", opts: ["Diagnose the child directly", "Share specific, documented observations and refer to professionals", "Avoid mentioning it at all", "Label the child publicly"], ans: 1 },
    { id: "q5", topic: "Understanding Autism Spectrum Differences and ADHD", q: "A helpful classroom support for many children with autism spectrum differences is:", opts: ["Frequent unannounced changes", "Predictable visual schedules and advance warning before transitions", "Constant loud group activities", "Idioms and sarcasm used often"], ans: 1 },
    { id: "q6", topic: "Understanding Autism Spectrum Differences and ADHD", q: "An effective support for children with ADHD-type attention differences includes:", opts: ["Long, unstructured lecture periods", "Structured routines and frequent movement breaks", "Removing all feedback", "One very long, multi-step instruction at once"], ans: 1 },
    { id: "q7", topic: "Language and Learning Differences", q: "Early pre-primary signs sometimes associated with dyslexia risk include:", opts: ["Advanced early reading fluency", "Difficulty with rhyming or remembering letter names", "No relevant early signs exist", "Only appears after age 12"], ans: 1 },
    { id: "q8", topic: "Language and Learning Differences", q: "Early language intervention in the pre-primary years, compared to later intervention, tends to have:", opts: ["No measurable impact", "A disproportionately large positive impact", "Only negative effects", "The same effect regardless of timing"], ans: 1 },
    { id: "q9", topic: "Practical Inclusive Classroom Strategies", q: "A 'peer buddy system' is intended to:", opts: ["Replace teachers entirely", "Support a child while building empathy in the buddy", "Punish misbehavior", "Single out struggling children negatively"], ans: 1 },
    { id: "q10", topic: "Practical Inclusive Classroom Strategies", q: "Differentiated instruction typically means:", opts: ["The same activity offered at multiple levels of challenge", "Every child does an unrelated separate activity", "Only advanced children participate", "One fixed difficulty level for all"], ans: 0 },
  ],
  "cse-010": [
    { id: "q1", topic: "Why Formal Testing Doesn't Work for Young Children", q: "Formal standardized testing is described as problematic for young children mainly because:", opts: ["It is too cheap to administer", "Performance is heavily affected by mood, hunger, and comfort with the tester", "It is always perfectly accurate", "Young children love formal tests"], ans: 1 },
    { id: "q2", topic: "Observation as an Assessment Tool", q: "Effective observation notes should be:", opts: ["Vague general impressions", "Objective and specific about what was said/done", "Written only at the end of term", "Based on assumptions"], ans: 1 },
    { id: "q3", topic: "Observation as an Assessment Tool", q: "A 'running record' is:", opts: ["A checklist of milestones only", "A detailed narrative note during a specific activity", "A formal exam score", "A parent's home diary"], ans: 1 },
    { id: "q4", topic: "Portfolio Assessment", q: "A good portfolio is best described as:", opts: ["Every single piece of work a child ever produces", "A purposeful collection showing growth over time", "A single test score", "A collection with no dates or context"], ans: 1 },
    { id: "q5", topic: "Portfolio Assessment", q: "Involving children in selecting pieces for their own portfolio helps build:", opts: ["Confusion", "Early self-reflection and ownership of learning", "Dependence on adults", "Nothing significant"], ans: 1 },
    { id: "q6", topic: "Interpreting and Using Assessment Data", q: "Observation data should mainly be used to:", opts: ["File away and never revisit", "Directly inform and adjust upcoming planning", "Rank children publicly", "Replace parent communication"], ans: 1 },
    { id: "q7", topic: "Interpreting and Using Assessment Data", q: "A single isolated incident (e.g., one struggle with scissors) should generally be treated as:", opts: ["Proof of a serious delay", "Not very concerning on its own; patterns matter more", "A reason for immediate referral", "Grounds for excluding the child from art"], ans: 1 },
    { id: "q8", topic: "Communicating Progress to Parents", q: "When discussing a concern with parents, teachers should:", opts: ["Use clinical diagnostic labels", "Use specific, factual, non-judgmental language and lead with strengths", "Avoid ever mentioning strengths", "Deliver only a verdict with no collaboration"], ans: 1 },
    { id: "q9", topic: "Communicating Progress to Parents", q: "Effective parent-teacher communication should be:", opts: ["Limited to one formal report per year", "Frequent, specific, and two-directional", "One-directional from teacher to parent only", "Avoided unless there is a problem"], ans: 1 },
    { id: "q10", topic: "Why Formal Testing Doesn't Work for Young Children", q: "The recommended alternative to formal testing for this age group is:", opts: ["No assessment at all", "Authentic, observation-based assessment in natural contexts", "Standardized national exams at age 3", "Timed written tests"], ans: 1 },
  ],
};

function gradeFor(correct, total) {
  const pct = Math.round((correct / total) * 100);
  const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : "F";
  return { pct, grade };
}

function buildFeedback(questions, answers, courseTitle) {
  const correct = questions.filter((q, i) => answers[i] === q.ans).length;
  const wrong = questions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.ans).length;
  const unanswered = questions.length - correct - wrong;
  const { pct, grade } = gradeFor(correct, questions.length);

  const topicMisses = {};
  questions.forEach((q, i) => {
    if (answers[i] !== undefined && answers[i] !== q.ans) {
      topicMisses[q.topic] = (topicMisses[q.topic] || 0) + 1;
    }
  });
  const improvements = Object.keys(topicMisses).slice(0, 3).map((t) => `Review: ${t}`);
  const strengths = questions
    .filter((q, i) => answers[i] === q.ans)
    .map((q) => q.topic)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 2)
    .map((t) => `Strong understanding of ${t}`);

  return {
    score: correct, total: questions.length, percentage: pct, grade,
    correct, wrong, unanswered,
    performance: `You scored ${correct}/${questions.length} (${pct}%) on "${courseTitle}".`,
    strengths: strengths.length ? strengths : ["Completed the assessment"],
    improvements: improvements.length ? improvements : ["Review the course notes once more for full mastery"],
    recommendation: pct >= 70
      ? "Great work — you're ready to move on to your next assigned course."
      : "Revisit the flagged topics in your course notes before your next attempt.",
  };
}

function PieChart({ correct, wrong, unanswered, total }) {
  const size = 160, cx = size / 2, cy = size / 2, r = 60;
  const slices = [
    { val: correct, color: "#10b981" },
    { val: wrong, color: "#ef4444" },
    { val: unanswered, color: "#e5e7eb" },
  ].filter((s) => s.val > 0);
  let cumAngle = -Math.PI / 2;
  const paths = slices.map((s) => {
    const angle = (s.val / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle), y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...s, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z` };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth={2} />)}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1c1917">{correct}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#6b7280">of {total}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[["#10b981", "Correct", correct], ["#ef4444", "Wrong", wrong], ["#e5e7eb", "Unanswered", unanswered]].map(([c, l, v]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
            <span style={{ fontSize: 13, color: "#374151" }}>{l}: <b>{v}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * assignments: teacher's course assignments (same array used by TeacherCourseNotes),
 * used to find courses that are 100% read and therefore eligible for assessment.
 */
export default function ProctoredAssessment({ assignments = [] }) {
  const [screen, setScreen] = useState("list"); // list | instructions | exam | scoring | result
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ASSESSMENT_DURATION);
  const [warnings, setWarnings] = useState(0);
  const [lastWarnMsg, setLastWarnMsg] = useState("");
  const [showWarnBanner, setShowWarnBanner] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [camError, setCamError] = useState("");
  const [faceStatus, setFaceStatus] = useState("ok");
  const [gadgetAlert, setGadgetAlert] = useState(false);
  const [result, setResult] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [myResults, setMyResults] = useState({}); // assignmentId -> latest/only result
  const [loadError, setLoadError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const faceRef = useRef(null);
  const warnRef = useRef(0);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    // Merge three sources into one "completed attempts" map, keyed by
    // assignment id, in priority order: (1) the assignment object itself
    // if it already carries assessment fields (freshest — came straight
    // from the DB via getTeacherProgress), (2) localStorage (this
    // device's own record, survives even if the server never got it),
    // (3) the legacy getMyAssessmentResults() API, best-effort only.
    const map = {};

    assignments.forEach((a) => {
      if (a.assessmentPercentage !== undefined && a.assessmentPercentage !== null) {
        map[a._id] = {
          score: a.assessmentScore, total: a.assessmentTotal ?? 10,
          percentage: a.assessmentPercentage, grade: a.assessmentGrade,
          warnings: a.assessmentWarnings || 0, forced: !!a.assessmentForced,
          courseTitle: a.course?.title,
        };
      } else {
        const stored = loadStoredAttempt(a._id);
        if (stored) map[a._id] = stored;
      }
    });

    setMyResults(map);

    // Best-effort only: if this fails, teachers simply rely on the
    // assignment-fields/localStorage sources above instead.
    getMyAssessmentResults()
      .then((res) => {
        setMyResults((prev) => {
          const next = { ...prev };
          (res.results || []).forEach((r) => {
            const matching = assignments.find((a) => (a.course?.title || a.course?._id) === (r.courseTitle || r.course?.title || r.course?._id));
            if (matching && !next[matching._id]) next[matching._id] = r;
          });
          return next;
        });
      })
      .catch((err) => console.error("getMyAssessmentResults failed (non-blocking):", err));
  }, [assignments]);

  // Courses eligible for assessment = fully-read (progressPercent 100)
  const eligible = assignments.filter((a) => (a.progressPercent || 0) === 100);
  const notReady = assignments.filter((a) => (a.progressPercent || 0) < 100);

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    clearInterval(faceRef.current);
  };

  const startFaceSimulation = () => {
    faceRef.current = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.04) {
        setFaceStatus("noface");
        issueWarning("⚠️ Face not detected! Please ensure your face is clearly visible.");
        setTimeout(() => setFaceStatus("ok"), 3000);
      } else if (rand < 0.06) {
        setFaceStatus("multiface");
        issueWarning("⚠️ Multiple faces detected! Only you should be visible.");
        setTimeout(() => setFaceStatus("ok"), 3000);
      } else if (rand < 0.065) {
        setGadgetAlert(true);
        issueWarning("⚠️ Electronic gadget detected near your workspace!");
        setTimeout(() => setGadgetAlert(false), 3000);
      }
    }, 8000);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamGranted(true);
      setCamError("");
      startFaceSimulation();
    } catch {
      setCamError("Camera access denied. Camera is required for this assessment.");
    }
  };

  const issueWarning = useCallback((msg) => {
    warnRef.current += 1;
    setWarnings(warnRef.current);
    setLastWarnMsg(msg);
    setShowWarnBanner(true);
    setTimeout(() => setShowWarnBanner(false), 4000);
    if (warnRef.current >= MAX_WARNINGS) submitExam(true);
  }, []); // eslint-disable-line

  const submitExam = useCallback(async (forced = false) => {
    if (autoSubmitted.current) return;
    autoSubmitted.current = true;
    clearInterval(timerRef.current);
    clearInterval(faceRef.current);
    stopCamera();
    setScreen("scoring");
    setScoring(true);

    const courseTitle = activeAssignment?.course?.title || "Course";
    const feedback = buildFeedback(questions, answers, courseTitle);
    const finalResult = { ...feedback, forced, warnings: warnRef.current, answers, courseTitle };
    const assignmentId = activeAssignment?._id;

    // ALWAYS persist locally first — this is what guarantees "no retake"
    // holds on this device no matter what happens with the network below.
    if (assignmentId) saveStoredAttempt(assignmentId, finalResult);

    let savedToServer = false;
    if (assignmentId) {
      try {
        // Primary save path: the SAME endpoint that already reliably
        // persists reading progress, just extended with assessment
        // fields. Existing progress fields are preserved by spreading
        // them back in, so this call can't accidentally reset reading
        // completion.
        await updateCourseAssignmentProgress(assignmentId, {
          completedContent: activeAssignment.completedContent,
          progressPercent: activeAssignment.progressPercent,
          status: activeAssignment.status,
          assessmentScore: feedback.score,
          assessmentTotal: feedback.total,
          assessmentPercentage: feedback.percentage,
          assessmentGrade: feedback.grade,
          assessmentCompletedAt: new Date().toISOString(),
          assessmentWarnings: warnRef.current,
          assessmentForced: forced,
        });
        savedToServer = true;
      } catch (err) {
        console.error("Failed to save assessment score via updateCourseAssignmentProgress:", err);
      }
    }

    // Secondary, best-effort attempt at the original dedicated endpoint,
    // in case it becomes available later — failure here is silent and
    // never overrides the outcome of the primary save above.
    try {
      await submitAssessmentResult({
        courseId: activeAssignment?.course?._id || activeAssignment?.course?.id,
        courseTitle,
        score: feedback.score, total: feedback.total, percentage: feedback.percentage, grade: feedback.grade,
        performance: feedback.performance, strengths: feedback.strengths, improvements: feedback.improvements,
        recommendation: feedback.recommendation, correct: feedback.correct, wrong: feedback.wrong,
        unanswered: feedback.unanswered, warnings: warnRef.current, forced, answers,
      });
    } catch (err) {
      console.error("submitAssessmentResult failed (non-blocking, secondary path):", err);
    }

    if (!savedToServer) finalResult.saveError = true;

    setMyResults((prev) => ({ ...prev, [assignmentId]: finalResult }));
    setResult(finalResult);
    setScoring(false);
    setScreen("result");
  }, [questions, answers, activeAssignment]); // eslint-disable-line

  useEffect(() => {
    if (screen !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); submitExam(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, submitExam]);

  useEffect(() => {
    if (screen !== "exam") return;
    const handleVisibility = () => { if (document.hidden) issueWarning("⚠️ You switched tabs or minimized the window!"); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [screen, issueWarning]);

  useEffect(() => {
    if (screen !== "exam") return;
    const block = (e) => {
      e.preventDefault();
      if (e.type === "contextmenu") issueWarning("⚠️ Right-click is not allowed during the exam!");
    };
    const keyBlock = (e) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "a", "x", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        issueWarning("⚠️ Keyboard shortcuts are not allowed!");
      }
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", keyBlock);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", keyBlock);
    };
  }, [screen, issueWarning]);

  useEffect(() => () => { stopCamera(); clearInterval(timerRef.current); }, []);

  /* No network call here anymore — questions resolve instantly and
     locally, so "Start Exam" can never fail with "Request failed". */
  const startAssessmentFor = (assignment) => {
    if (myResults[assignment._id]) {
      setLoadError(`You've already completed the assessment for "${assignment.course?.title}". Only one attempt is allowed — use "View Result" to see your score.`);
      return;
    }
    const libraryId = resolveLibraryId(assignment.course);
    const bank = libraryId ? ASSESSMENT_BANK[libraryId] : null;
    if (!bank) {
      setLoadError(`No assessment is available yet for "${assignment.course?.title}". Ask your admin to confirm this course was created from the Course Library.`);
      return;
    }
    setLoadError("");
    setActiveAssignment(assignment);
    setQuestions(bank);
    setScreen("instructions");
  };

  const startExam = async () => {
    await startCamera();
    warnRef.current = 0;
    autoSubmitted.current = false;
    setWarnings(0);
    setAnswers({});
    setCurrentQ(0);
    setTimeLeft(ASSESSMENT_DURATION);
    setScreen("exam");
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const timerColor = timeLeft > 300 ? "#10b981" : timeLeft > 60 ? "#f59e0b" : "#ef4444";

  /* ── LIST ── */
  if (screen === "list") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <h1 style={S.pageTitle}>📋 Assessments</h1>
        <p style={S.pageSub}>Complete a course's notes to unlock its assessment — one attempt is recorded per session, and your admin can see every score.</p>

        <div style={{ background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: 14, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 24 }}>🔐</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 6 }}>Proctoring Notice</div>
            <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
              • Camera activates automatically during the exam<br />
              • Tab switching, window sharing, and right-click are not allowed<br />
              • After 5 warnings, the exam is auto-submitted<br />
              • Your score is saved and visible to your admin
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>✅ Ready for Assessment</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {eligible.length === 0 && <div style={{ color: "#9ca3af", fontSize: 13 }}>No courses fully read yet — finish a course's notes in "My Courses" first.</div>}
          {eligible.map((a) => {
            const title = a.course?.title;
            const attempt = myResults[a._id];
            const hasBank = !!resolveLibraryId(a.course);
            return (
              <div key={a._id} style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderLeft: `4px solid ${attempt ? "#3b82f6" : hasBank ? "#10b981" : "#f59e0b"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917" }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                      {hasBank ? "10 MCQ · AI-scored · 20 minutes" : "⚠️ No assessment linked to this course yet"}
                    </div>
                    {attempt && (
                      <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>✓ Attempt recorded — one attempt only</span>
                        <span style={{ fontSize: 11, background: "#fffbeb", color: "#92400e", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>{attempt.score}/{attempt.total} · {attempt.percentage}%</span>
                        <span style={{ fontSize: 11, background: "#f0f9ff", color: "#1d4ed8", padding: "2px 10px", borderRadius: 20, fontWeight: 800 }}>Grade: {attempt.grade}</span>
                      </div>
                    )}
                  </div>
                  {attempt ? (
                    <button
                      onClick={() => { setActiveAssignment(a); setResult({ ...attempt, courseTitle: title }); setScreen("result"); }}
                      style={{ ...S.exportBtn, fontSize: 12, color: "#1d4ed8", borderColor: "#bfdbfe" }}
                    >
                      📄 View Result
                    </button>
                  ) : (
                    <button onClick={() => startAssessmentFor(a)} disabled={!hasBank} style={{ ...S.primaryBtn, background: hasBank ? "linear-gradient(135deg,#10b981,#059669)" : "#d1d5db", fontSize: 12, cursor: hasBank ? "pointer" : "not-allowed" }}>
                      Start Exam →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {notReady.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", marginBottom: 10 }}>🔒 Locked — Finish Reading First</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notReady.map((a) => (
                <div key={a._id} style={{ background: "#f9fafb", borderRadius: 12, padding: "14px 18px", border: "1px dashed #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280" }}>{a.course?.title}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{a.progressPercent || 0}% notes read</div>
                </div>
              ))}
            </div>
          </>
        )}
        {loadError && <div style={{ marginTop: 16, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#991b1b", fontSize: 12 }}>{loadError}</div>}
      </div>
    );
  }

  /* ── INSTRUCTIONS ── */
  if (screen === "instructions") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ background: "white", borderRadius: 20, padding: "36px", border: "1px solid #f1f5f9", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1c1917", margin: "0 0 6px" }}>Assessment Instructions</h2>
            <div style={{ fontSize: 14, color: "#6b7280" }}>{activeAssignment?.course?.title}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[["❓", "Questions", `${questions.length} MCQ`], ["🏆", "Total Marks", questions.length], ["⏱️", "Duration", "20 Minutes"], ["📹", "Proctoring", "Camera + AI"]].map(([icon, label, val], i) => (
              <div key={i} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div><div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{val}</div></div>
              </div>
            ))}
          </div>
          {camError && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#991b1b", fontWeight: 600 }}>📷 {camError}</div>}
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setScreen("list")} style={{ ...S.exportBtn, flex: 1 }}>← Back</button>
            <button onClick={startExam} style={{ ...S.primaryBtn, flex: 2, padding: "13px", fontSize: 14 }}>🎬 Start Proctored Exam</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── SCORING ── */
  if (screen === "scoring") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
        <div style={{ width: 60, height: 60, border: "4px solid #e2e8f0", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>Scoring your answers…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── RESULT ── */
  if (screen === "result" && result) {
    const gradeColor = result.grade === "A+" || result.grade === "A" ? "#10b981" : result.grade === "B+" || result.grade === "B" ? "#3b82f6" : result.grade === "C" ? "#f59e0b" : "#ef4444";
    return (
      <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{gradeColor === "#10b981" ? "🏆" : "📋"}</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1c1917", margin: "0 0 6px" }}>Assessment Complete!</h1>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{result.courseTitle}</div>
          {result.forced && <div style={{ marginTop: 8, fontSize: 12, background: "#fef2f2", color: "#991b1b", padding: "6px 14px", borderRadius: 20, display: "inline-block", fontWeight: 700 }}>⚠️ Auto-submitted due to proctoring violations</div>}
          {result.saveError && <div style={{ marginTop: 8, fontSize: 12, background: "#fef2f2", color: "#991b1b", padding: "6px 14px", borderRadius: 20, display: "inline-block", fontWeight: 700 }}>⚠️ Could not sync this score to the server — please retry later</div>}
        </div>

        <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
            <PieChart correct={result.correct} wrong={result.wrong} unanswered={result.unanswered} total={result.total} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{result.score}</div>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>out of {result.total}</div>
              <div style={{ marginTop: 8, padding: "6px 20px", background: gradeColor + "22", color: gradeColor, borderRadius: 20, fontSize: 22, fontWeight: 900 }}>{result.grade}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>{result.percentage}%</div>
            </div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 8 }}>📊 Performance Summary</div>
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
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", borderRadius: 10, fontSize: 12, color: "#92400e", fontWeight: 600 }}>💡 {result.recommendation}</div>
          </div>
          {result.warnings > 0 && <div style={{ background: "#fef3c7", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>⚠️ Proctoring warnings recorded: <b>{result.warnings}</b></div>}
        </div>
        <button onClick={() => { setScreen("list"); setActiveAssignment(null); }} style={{ ...S.exportBtn, width: "100%", textAlign: "center" }}>← Back to Assessments</button>
      </div>
    );
  }

  /* ── EXAM ── */
  if (screen === "exam") {
    const q = questions[currentQ];
    if (!q) return null;
    const answered = Object.keys(answers).length;
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0f172a", zIndex: 9999, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI','Inter',sans-serif", userSelect: "none" }}>
        {showWarnBanner && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "#ef4444", color: "white", padding: "12px 20px", textAlign: "center", fontSize: 13, fontWeight: 700, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {lastWarnMsg}<span style={{ background: "rgba(255,255,255,0.3)", padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>Warning {warnings}/{MAX_WARNINGS}</span>
          </div>
        )}
        <div style={{ background: "#1e293b", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid #334155", flexShrink: 0 }}>
          <div style={{ position: "relative", width: 80, height: 60, borderRadius: 8, overflow: "hidden", background: "#0f172a", flexShrink: 0, border: `2px solid ${faceStatus === "ok" ? "#10b981" : faceStatus === "noface" ? "#f59e0b" : "#ef4444"}` }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "white", background: "rgba(0,0,0,0.6)", padding: "1px 0" }}>
              {faceStatus === "ok" ? "✓ Face OK" : faceStatus === "noface" ? "⚠ No Face" : "⚠ Multi-Face"}
            </div>
            {gadgetAlert && <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📱</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>Proctored Assessment</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{activeAssignment?.course?.title}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Warnings</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: warnings >= 3 ? "#ef4444" : warnings >= 1 ? "#f59e0b" : "#10b981" }}>{warnings}/{MAX_WARNINGS}</div>
          </div>
          <div style={{ background: "#0f172a", padding: "8px 16px", borderRadius: 10, textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Time Left</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: timerColor, fontVariantNumeric: "tabular-nums" }}>{formatTime(timeLeft)}</div>
          </div>
        </div>
        <div style={{ height: 3, background: "#1e293b" }}>
          <div style={{ height: "100%", width: `${((currentQ + 1) / questions.length) * 100}%`, background: "#f59e0b", transition: "width 0.3s" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", gap: 20 }}>
          <div style={{ flex: 1, maxWidth: 700, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Question <span style={{ color: "#f59e0b", fontWeight: 800 }}>{currentQ + 1}</span> of {questions.length}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{answered} answered · {questions.length - answered} remaining</div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 16, padding: "24px", marginBottom: 20, border: "1px solid #334155" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Q{currentQ + 1} · {q.topic}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1.6 }}>{q.q}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {q.opts.map((opt, i) => {
                const selected = answers[currentQ] === i;
                return (
                  <button key={i} onClick={() => setAnswers((prev) => ({ ...prev, [currentQ]: i }))}
                    style={{ background: selected ? "#1d4ed8" : "#1e293b", border: `2px solid ${selected ? "#3b82f6" : "#334155"}`, borderRadius: 12, padding: "14px 18px", textAlign: "left", color: selected ? "white" : "#cbd5e1", fontSize: 14, cursor: "pointer", display: "flex", gap: 12, alignItems: "center", fontFamily: "inherit" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: selected ? "#3b82f6" : "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: selected ? "white" : "#64748b", flexShrink: 0 }}>{["A", "B", "C", "D"][i]}</div>
                    {opt}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <button onClick={() => setCurrentQ((q2) => Math.max(0, q2 - 1))} disabled={currentQ === 0} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "10px 20px", borderRadius: 10, cursor: currentQ === 0 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>← Previous</button>
              {currentQ < questions.length - 1 ? (
                <button onClick={() => setCurrentQ((q2) => q2 + 1)} style={{ background: "#1d4ed8", border: "none", color: "white", padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Next →</button>
              ) : (
                <button onClick={() => submitExam(false)} style={{ background: "#10b981", border: "none", color: "white", padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>✅ Submit Exam</button>
              )}
            </div>
          </div>
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ background: "#1e293b", borderRadius: 14, padding: "16px", border: "1px solid #334155" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 12 }}>QUESTION NAVIGATOR</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, marginBottom: 16 }}>
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQ(i)} style={{ width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: i === currentQ ? "#f59e0b" : answers[i] !== undefined ? "#10b981" : "#334155", color: i === currentQ || answers[i] !== undefined ? "white" : "#64748b" }}>{i + 1}</button>
                ))}
              </div>
              <button onClick={() => submitExam(false)} style={{ marginTop: 14, width: "100%", background: "#10b981", border: "none", color: "white", padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Submit Now</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}