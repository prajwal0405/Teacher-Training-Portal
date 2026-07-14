/**
 * parseCourseLibrary.js
 * ----------------------------------------------------------------------
 * Parses PreSchool_Teacher_Courses.docx into structured JSON using mammoth.
 *
 * Convention (matches generate_docx.js):
 *   Heading 1  -> Course title  (starts a new course)
 *   Heading 2  -> Topic title   (starts a new topic/module within a course)
 *   Paragraph  -> Topic notes content (appended to the current topic)
 *
 * Run this on the server whenever the source .docx changes:
 *    node parseCourseLibrary.js ./PreSchool_Teacher_Courses.docx ./courseLibrary.json
 *
 * The resulting courseLibrary.json is what the backend serves at
 * GET /api/course-library for the admin "Select from Course Library" dropdown,
 * and is what seeds each course's modules/topics + reading notes for teachers.
 * Nothing here is hand-typed on the frontend — it is always derived from
 * the .docx source of truth.
 * ---------------------------------------------------------------------- */
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");

const CATEGORY_COLORS = {
  "Foundations of ECE": "#f59e0b",
  "Curriculum Planning": "#10b981",
  "Instructional Strategies": "#3b82f6",
  "Assessment & Evaluation": "#8b5cf6",
  "Classroom Management": "#ef4444",
  "Health, Safety & Nutrition": "#06b6d4",
};

function decodeEntities(str) {
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&nbsp;/g, " ");
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function parseDocx(inputPath) {
  const { value: html } = await mammoth.convertToHtml(
    { path: inputPath },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Title'] => h0:fresh",
      ],
    }
  );

  // Very small, dependency-free HTML walker (headings + paragraphs only —
  // matches the simple structure produced by generate_docx.js).
  const blocks = [];
  const re = /<(h0|h1|h2|p)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1];
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, "")).trim();
    if (text) blocks.push({ tag, text });
  }

  const courses = [];
  let currentCourse = null;
  let currentTopic = null;

  // Known metadata lines emitted by generate_docx.js right after an H1
  const META_RE = /^Category:\s*(.+?)\s+Level:\s*(.+?)\s+Duration:\s*(.+)$/;

  for (const block of blocks) {
    if (block.tag === "h0") continue; // document title, skip
    if (block.tag === "h1") {
      // Skip the manual "Course List" TOC heading
      if (block.text.trim() === "Course List") { currentCourse = null; continue; }
      currentCourse = {
        id: `cse-${String(courses.length + 1).padStart(3, "0")}`,
        title: block.text,
        slug: slugify(block.text),
        category: "Foundations of ECE",
        level: "Beginner",
        duration: "",
        description: "",
        objectives: "",
        color: "#f59e0b",
        topics: [],
      };
      courses.push(currentCourse);
      currentTopic = null;
      continue;
    }
    if (!currentCourse) continue; // ignore anything before the first course (e.g. TOC list)

    if (block.tag === "h2") {
      currentTopic = { title: block.text.replace(/^\d+\.\d+\s*/, ""), notes: "" };
      currentCourse.topics.push(currentTopic);
      continue;
    }
    // paragraph
    const metaMatch = block.text.match(META_RE);
    if (metaMatch && !currentTopic) {
      currentCourse.category = metaMatch[1].trim();
      currentCourse.level = metaMatch[2].trim();
      currentCourse.duration = metaMatch[3].trim();
      currentCourse.color = CATEGORY_COLORS[currentCourse.category] || "#f59e0b";
      continue;
    }
    if (block.text.startsWith("Description:") && !currentTopic) {
      currentCourse.description = block.text.replace(/^Description:\s*/, "");
      continue;
    }
    if (block.text.startsWith("Learning Objectives:") && !currentTopic) {
      currentCourse.objectives = block.text.replace(/^Learning Objectives:\s*/, "");
      continue;
    }
    if (currentTopic) {
      currentTopic.notes = currentTopic.notes ? `${currentTopic.notes}\n\n${block.text}` : block.text;
    }
  }

  return courses;
}

if (require.main === module) {
  const [, , inFile, outFile] = process.argv;
  const input = inFile || path.join(__dirname, "PreSchool_Teacher_Courses.docx");
  const output = outFile || path.join(__dirname, "courseLibrary.json");
  parseDocx(input).then((courses) => {
    fs.writeFileSync(output, JSON.stringify({ courses }, null, 2));
    console.log(`Parsed ${courses.length} courses -> ${output}`);
  }).catch((err) => {
    console.error("Failed to parse docx:", err);
    process.exit(1);
  });
}

module.exports = { parseDocx };
