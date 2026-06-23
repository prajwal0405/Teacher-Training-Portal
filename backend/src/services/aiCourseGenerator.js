const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"; // eslint-disable-line no-undef

function aiLog(event, details = {}) {
  console.log(`[ai-course] ${event}`, JSON.stringify(details));
}

function clampModuleCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 6;
  return Math.min(10, Math.max(6, Math.round(numeric)));
}

function extractYoutubeId(url) {
  if (!url) return null;
  const match = String(url).match(/(?:youtube\.com\/(?:.*[?&]v=|embed\/)|youtu\.be\/)([^"&?/\s]{11})/);
  return match ? match[1] : null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(/\n|,/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function asText(value, fallback = "") {
  if (Array.isArray(value)) return value.filter(Boolean).join("\n");
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
}

function pickUniqueVideo(seen, preferred) {
  const preferredId = extractYoutubeId(preferred);
  if (preferredId && !seen.has(preferredId)) {
    seen.add(preferredId);
    return preferred;
  }

  return "";
}

function buildPrompt({ topic, category, level, format, duration, tone, numModules }) {
  const moduleCount = clampModuleCount(numModules);

  return `Generate a complete, production-ready teacher training LMS course as clean JSON only.

Return exactly this JSON shape:
{
  "title": "Professional course title",
  "description": "Course description for an LMS catalog",
  "learningObjectives": ["objective"],
  "targetAudience": ["audience"],
  "prerequisites": ["prerequisite"],
  "duration": "course duration",
  "skillsCovered": ["skill"],
  "category": "category",
  "level": "level",
  "tags": ["tag"],
  "modules": [
    {
      "title": "Module title",
      "description": "Module description",
      "learningOutcomes": ["outcome"],
      "detailedNotes": "Minimum 500 words of detailed module notes.",
      "keyTakeaways": ["takeaway"],
      "lessons": [
        {
          "title": "Lesson title",
          "description": "Lesson description",
          "detailedLearningContent": "Rich teacher-facing learning content",
          "practicalExamples": ["example"],
          "suggestedDuration": "45 minutes",
          "youtubeVideo": {
            "title": "relevant public YouTube video title",
            "url": "https://www.youtube.com/watch?v=validVideoId"
          }
        }
      ],
      "assessments": {
        "mcqs": [
          {
            "question": "Question text",
            "options": ["A", "B", "C", "D"],
            "answer": "Correct option text"
          }
        ],
        "practicalAssignments": ["assignment"],
        "reflectionActivities": ["reflection"]
      },
      "studyMaterials": {
        "moduleNotes": "Module-specific study material",
        "summaryNotes": "Concise module summary",
        "revisionPoints": ["revision point"],
        "importantConcepts": ["concept"]
      }
    }
  ],
  "assessments": {
    "mcqs": [
      {
        "question": "Course-level question",
        "options": ["A", "B", "C", "D"],
        "answer": "Correct option text"
      }
    ],
    "practicalAssignments": ["course assignment"],
    "reflectionActivities": ["course reflection"]
  },
  "studyMaterials": {
    "moduleNotes": ["note"],
    "summaryNotes": "Course summary notes",
    "revisionPoints": ["revision point"],
    "importantConcepts": ["concept"]
  }
}

Strict requirements:
- Generate exactly ${moduleCount} modules.
- Generate 3 to 5 lessons in every module.
- Every module's detailedNotes must be 500+ words.
- Every lesson must include one relevant, public YouTube video URL.
- Do not duplicate module titles, lesson titles, MCQs, assignments, reflection activities, or YouTube URLs.
- Do not include placeholder, dummy, sample, lorem ipsum, or generic filler content.
- Make the content professional, detailed, industry-standard, and suitable for a real teacher training LMS.
- Use clear language for practicing teachers and school/center administrators.
- Return JSON only. No markdown.

Course topic from Admin: ${topic}
Category: ${category || "Foundations of ECE"}
Level: ${level || "Beginner"}
Format: ${format || "Video"}
Duration: ${duration || "6 Weeks"}
Tone: ${tone || "Professional"}`;
}

function buildCourseNotes(course) {
  const notes = [];
  notes.push({
    title: "Course Study Guide",
    content: [
      course.description,
      "",
      "Learning Objectives:",
      ...asArray(course.learningObjectives).map(item => `- ${item}`),
      "",
      "Target Audience:",
      ...asArray(course.targetAudience).map(item => `- ${item}`),
      "",
      "Prerequisites:",
      ...asArray(course.prerequisites).map(item => `- ${item}`),
      "",
      "Skills Covered:",
      ...asArray(course.skillsCovered).map(item => `- ${item}`)
    ].join("\n")
  });

  notes.push({
    title: "Course Revision Pack",
    content: [
      asText(course.studyMaterials?.summaryNotes),
      "",
      "Revision Points:",
      ...asArray(course.studyMaterials?.revisionPoints).map(item => `- ${item}`),
      "",
      "Important Concepts:",
      ...asArray(course.studyMaterials?.importantConcepts).map(item => `- ${item}`)
    ].join("\n").trim()
  });

  return notes.filter(note => note.content);
}

function mapGeneratedToCourse(generated, overrides) {
  const seenVideos = new Set();
  const sourceModules = asArray(generated.modules).slice(0, clampModuleCount(overrides.numModules));

  const modules = sourceModules.map((module, moduleIndex) => {
    const lessons = asArray(module.lessons).slice(0, 5).map((lesson, lessonIndex) => {
      const videoUrl = pickUniqueVideo(seenVideos, lesson.youtubeVideo?.url || lesson.videoUrl || lesson.externalUrl);
      const suggestedDuration = asText(lesson.suggestedDuration || lesson.duration || lesson.durationMinutes, "45 minutes");
      return {
        title: asText(lesson.title, `Lesson ${lessonIndex + 1}`),
        type: "video",
        externalUrl: videoUrl,
        order: lessonIndex + 1,
        isRequired: true,
        description: asText(lesson.description),
        detailedLearningContent: asText(lesson.detailedLearningContent || lesson.content),
        practicalExamples: asArray(lesson.practicalExamples),
        suggestedDuration,
        durationMinutes: Number.parseInt(suggestedDuration, 10) || 45,
        videoTitle: asText(lesson.youtubeVideo?.title || lesson.videoTitle),
        notes: asText(lesson.detailedLearningContent || lesson.notes || lesson.description)
      };
    });

    return {
      title: asText(module.title, `Module ${moduleIndex + 1}`),
      order: moduleIndex + 1,
      description: asText(module.description),
      learningOutcomes: asArray(module.learningOutcomes),
      detailedNotes: asText(module.detailedNotes),
      keyTakeaways: asArray(module.keyTakeaways),
      assessments: module.assessments || { mcqs: [], practicalAssignments: [], reflectionActivities: [] },
      studyMaterials: module.studyMaterials || {},
      contents: lessons
    };
  });

  const firstVideo = modules.flatMap(module => module.contents).find(content => content.externalUrl)?.externalUrl || "";

  const course = {
    title: asText(generated.title, overrides.topic || overrides.title || "Teacher Training Course"),
    description: asText(generated.description, overrides.description || ""),
    objectives: asArray(generated.learningObjectives || generated.objectives).join(", "),
    learningObjectives: asArray(generated.learningObjectives || generated.objectives),
    targetAudience: asArray(generated.targetAudience),
    prerequisites: asArray(generated.prerequisites),
    skillsCovered: asArray(generated.skillsCovered),
    category: asText(generated.category, overrides.category || "Foundations of ECE"),
    level: asText(generated.level, overrides.level || "Beginner"),
    topic: overrides.topic || overrides.title,
    duration: asText(generated.duration, overrides.duration || "6 Weeks"),
    durationText: asText(generated.duration, overrides.duration || "6 Weeks"),
    contentType: "Video",
    contentLink: firstVideo,
    youtubeId: extractYoutubeId(firstVideo),
    status: "published",
    tags: asArray(generated.tags).join(", "),
    assessments: generated.assessments || { mcqs: [], practicalAssignments: [], reflectionActivities: [] },
    studyMaterials: generated.studyMaterials || {},
    modules
  };

  return {
    ...course,
    notes: buildCourseNotes(course)
  };
}

export function validateGeneratedCourse(course) {
  const errors = [];
  if (!course?.title) errors.push("Course title is required.");
  if (!course?.description) errors.push("Course description is required.");
  if (!Array.isArray(course?.modules) || course.modules.length === 0) {
    errors.push("At least one generated module is required.");
  }

  const moduleTitles = new Set();
  const lessonTitles = new Set();
  const videoIds = new Set();

  course?.modules?.forEach((module, moduleIndex) => {
    if (!module.title) errors.push(`Module ${moduleIndex + 1} title is required.`);
    if (module.title && moduleTitles.has(module.title.toLowerCase())) {
      errors.push(`Duplicate module title: ${module.title}`);
    }
    if (module.title) moduleTitles.add(module.title.toLowerCase());
    if (!Array.isArray(module.contents) || module.contents.length === 0) {
      errors.push(`Module ${moduleIndex + 1} must include lessons.`);
    }

    module.contents?.forEach((lesson, lessonIndex) => {
      const label = `Module ${moduleIndex + 1}, lesson ${lessonIndex + 1}`;
      if (!lesson.title) errors.push(`${label} title is required.`);
      if (lesson.title && lessonTitles.has(lesson.title.toLowerCase())) {
        errors.push(`Duplicate lesson title: ${lesson.title}`);
      }
      if (lesson.title) lessonTitles.add(lesson.title.toLowerCase());
      const videoId = extractYoutubeId(lesson.externalUrl);
      if (!videoId) {
        errors.push(`${label} must include a valid YouTube URL.`);
      } else if (videoIds.has(videoId)) {
        errors.push(`${label} duplicates YouTube video ${videoId}.`);
      } else {
        videoIds.add(videoId);
      }
    });
  });

  if (errors.length) {
    aiLog("validation_failed", { errors });
    const err = new Error(errors.join(" "));
    err.status = 422;
    throw err;
  }

  aiLog("validation_passed", {
    title: course.title,
    modules: course.modules.length,
    lessons: course.modules.reduce((sum, module) => sum + module.contents.length, 0),
  });
}

export async function generateAICourse(input) {
  const { topic, title, category, level, format = "Video", duration, description, tone, numModules } = input || {};
  const courseTopic = topic || title || "";

  if (!courseTopic || !duration) {
    const err = new Error("Course topic/title and duration are required.");
    err.status = 400;
    throw err;
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    aiLog("missing_api_key");
    const err = new Error("OPENAI_API_KEY is not configured on the backend.");
    err.status = 503;
    throw err;
  }

  aiLog("request_start", { model: OPENAI_MODEL, topic: courseTopic, category, level, duration, numModules });
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 16000,
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a senior curriculum designer for teacher training LMS platforms. Return valid JSON only."
        },
        {
          role: "user",
          content: buildPrompt({ topic: courseTopic, category, level, format, duration, tone, numModules })
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    let message = "OpenAI API request failed.";
    let status = 502;

    try {
      const parsed = JSON.parse(detail);
      message = parsed.error?.message || detail;
      status = response.status === 401 ? 401 : response.status === 429 ? 429 : 502;
    } catch {
      message = detail || message;
    }

    aiLog("request_failed", { status: response.status, message });
    const err = new Error(message);
    err.status = status;
    throw err;
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  aiLog("response_received", {
    id: data.id,
    model: data.model,
    usage: data.usage,
    contentLength: raw.length,
  });

  let generated;
  try {
    generated = JSON.parse(raw);
    aiLog("json_parse_success", {
      title: generated.title,
      moduleCount: Array.isArray(generated.modules) ? generated.modules.length : 0,
    });
  } catch (parseError) {
    aiLog("json_parse_failed", { message: parseError.message, preview: raw.slice(0, 500) });
    const err = new Error("AI returned an invalid response. Please try again.");
    err.status = 502;
    throw err;
  }

  const course = mapGeneratedToCourse(generated, { topic: courseTopic, title, category, level, format, duration, description, numModules });
  validateGeneratedCourse(course);
  return course;
}
