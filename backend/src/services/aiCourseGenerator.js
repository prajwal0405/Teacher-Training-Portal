const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash"; // eslint-disable-line no-undef

function aiLog(event, details = {}) {
  console.log(`[ai-course] ${event}`, JSON.stringify(details));
}

function clampModuleCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 4;
  return Math.min(10, Math.max(2, Math.round(numeric)));
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

function buildLocalLesson(topic, moduleTitle, moduleIndex, lessonIndex) {
  const lessonNo = lessonIndex + 1;
  const lessonTitle = `${moduleTitle} Lesson ${lessonNo}`;
  return {
    title: lessonTitle,
    description: `Practical guidance for ${topic} within ${moduleTitle}.`,
    detailedLearningContent: [
      `This lesson focuses on the practical application of ${topic}. It gives teachers a structured way to explain, model, and reinforce the idea in daily classroom work.`,
      `Learners should connect the lesson to the wider goals of ${moduleTitle}, then test the idea through discussion, observation, and a short reflective task.`,
      `The lesson emphasizes planning, clear demonstration, and follow-up so the skill can be used confidently in a real learning environment.`,
    ].join(" "),
    practicalExamples: [
      `Use a classroom example that shows ${topic} in action.`,
      `Adapt the activity for mixed-ability learners.`,
      `Include a short reflection prompt for teachers.`,
    ],
    suggestedDuration: "45 minutes",
    youtubeVideo: {
      title: `${lessonTitle} video`,
      url: "",
    },
  };
}

function buildLocalModule(topic, category, level, duration, moduleIndex) {
  const moduleNumber = moduleIndex + 1;
  const moduleTitle = `${topic} Module ${moduleNumber}`;
  const lessonCount = 3 + (moduleIndex % 2);
  const lessons = Array.from({ length: lessonCount }, (_item, lessonIndex) => buildLocalLesson(topic, moduleTitle, moduleIndex, lessonIndex));

  const detailedNotes = [
    `Module ${moduleNumber} builds a grounded understanding of ${topic} for ${level.toLowerCase()} learners working in ${category || "teacher training"} contexts.`,
    `It explains the concept in practical language, links it to classroom routines, and shows how the idea supports better teaching during a ${duration || "multi-week"} programme.`,
    `Teachers should read the module once for big-picture meaning, then again while planning how to apply it in their own setting.`,
    `The examples in this module are intentionally action-oriented. They are meant to help a facilitator turn theory into visible practice, not just repeat definitions.`,
    `A good facilitation approach is to pause after each section, ask what would change in the classroom, and gather one example from the learner group.`,
    `By the end of this module, teachers should be able to explain the core idea, identify a realistic classroom use case, and describe one simple adaptation for their own context.`,
  ].join(" ");

  return {
    title: moduleTitle,
    description: `A practical module on ${topic}.`,
    learningOutcomes: [
      `Explain the purpose of ${topic}.`,
      `Apply ${topic} in a real classroom setting.`,
      `Reflect on the impact of ${topic} for teacher practice.`,
    ],
    detailedNotes,
    keyTakeaways: [
      `Core ideas of ${topic} are easy to describe.`,
      `Practical examples make the concept stick.`,
      `Teachers should adapt the idea to their own context.`,
    ],
    lessons,
    assessments: {
      mcqs: [
        {
          question: `Which statement best describes ${topic}?`,
          options: [
            "It is only theoretical.",
            "It can be applied in classroom practice.",
            "It is unrelated to teacher development.",
            "It is used only for administration.",
          ],
          answer: "It can be applied in classroom practice.",
        },
      ],
      practicalAssignments: [
        `Create a short classroom plan showing how ${topic} can be used in one activity.`,
      ],
      reflectionActivities: [
        `Write one paragraph on how ${topic} would change your teaching routine.`,
      ],
    },
    studyMaterials: {
      moduleNotes: detailedNotes,
      summaryNotes: `A concise summary of ${topic} module ${moduleNumber}.`,
      revisionPoints: [
        `Define ${topic} clearly.`,
        `List one classroom application.`,
        `Name one adaptation for your learners.`,
      ],
      importantConcepts: [
        topic,
        `${category || "teacher training"} practice`,
        `Classroom application`,
      ],
    },
  };
}

function buildLocalCourse({ topic, category, level, format, duration, tone, numModules }) {
  const moduleCount = clampModuleCount(numModules);
  const modules = Array.from({ length: moduleCount }, (_item, moduleIndex) => buildLocalModule(topic, category, level, duration, moduleIndex));
  const course = {
    title: `${topic} for Teachers`,
    description: `${tone || "Professional"} training on ${topic} designed for ${level || "Beginner"} learners.`,
    learningObjectives: [
      `Understand the fundamentals of ${topic}.`,
      `Use ${topic} confidently in classroom practice.`,
      `Evaluate how ${topic} supports better teaching outcomes.`,
    ],
    targetAudience: ["Teachers", "Trainers", "School leaders"],
    prerequisites: ["Basic classroom experience"],
    skillsCovered: [topic, "Planning", "Reflection", "Implementation"],
    category: category || "Foundations of ECE",
    level: level || "Beginner",
    tags: [topic, category || "Foundations of ECE", level || "Beginner"].filter(Boolean).join(", "),
    duration: duration || "6 Weeks",
    modules,
    assessments: {
      mcqs: [
        {
          question: `Why is ${topic} important in teacher training?`,
          options: [
            "It helps link theory to practice.",
            "It removes the need for reflection.",
            "It replaces classroom observation.",
            "It is only useful for exams.",
          ],
          answer: "It helps link theory to practice.",
        },
      ],
      practicalAssignments: [
        `Prepare a mini session plan that uses ${topic}.`,
      ],
      reflectionActivities: [
        `Identify one way ${topic} can improve your current teaching approach.`,
      ],
    },
    studyMaterials: {
      moduleNotes: `A full course guide for ${topic}.`,
      summaryNotes: `This course introduces ${topic} through practical training and reflection.`,
      revisionPoints: [
        `Explain the key idea.`,
        `Show classroom use.`,
        `Reflect on impact.`,
      ],
      importantConcepts: [topic, "classroom use", "teacher reflection"],
    },
  };

  return {
    ...course,
    notes: buildCourseNotes(course),
  };
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

  course?.modules?.forEach((module, moduleIndex) => {
    if (!module.title) errors.push(`Module ${moduleIndex + 1} title is required.`);
    if (!Array.isArray(module.contents) || module.contents.length === 0) {
      errors.push(`Module ${moduleIndex + 1} must include lessons.`);
    }

    module.contents?.forEach((lesson, lessonIndex) => {
      const label = `Module ${moduleIndex + 1}, lesson ${lessonIndex + 1}`;
      if (!lesson.title) errors.push(`${label} title is required.`);
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

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!geminiApiKey || /^YOUR_(OPENAI|GEMINI)/i.test(geminiApiKey) || /placeholder/i.test(geminiApiKey)) {
    aiLog("missing_api_key");
    const fallbackCourse = buildLocalCourse({ topic: courseTopic, category, level, format, duration, tone, numModules });
    fallbackCourse.isLocalFallback = true;
    validateGeneratedCourse(fallbackCourse);
    return fallbackCourse;
  }

  try {
    aiLog("request_start", { model: GEMINI_MODEL, topic: courseTopic, category, level, duration, numModules });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildPrompt({ topic: courseTopic, category, level, format, duration, tone, numModules })
              }
            ]
          }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const detail = await response.text();
      let message = "Gemini API request failed.";

      try {
        const parsed = JSON.parse(detail);
        message = parsed.error?.message || detail;
      } catch {
        message = detail || message;
      }

      aiLog("request_failed", { status: response.status, message });
      const fallbackCourse = buildLocalCourse({ topic: courseTopic, category, level, format, duration, tone, numModules });
      fallbackCourse.isLocalFallback = true;
      validateGeneratedCourse(fallbackCourse);
      return fallbackCourse;
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
    aiLog("response_received", {
      model: data.modelVersion || GEMINI_MODEL,
      usage: data.usageMetadata,
      contentLength: raw.length,
    });

    let generated;
    try {
      // Strip markdown code fences if present (LLMs commonly wrap JSON in ```json...```)
      let cleanRaw = raw;
      const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      if (fenceMatch) {
        cleanRaw = fenceMatch[1].trim();
      }
      generated = JSON.parse(cleanRaw);
      aiLog("json_parse_success", {
        title: generated.title,
        moduleCount: Array.isArray(generated.modules) ? generated.modules.length : 0,
      });
    } catch (parseError) {
      aiLog("json_parse_failed", { message: parseError.message, preview: raw.slice(0, 500) });
      const fallbackCourse = buildLocalCourse({ topic: courseTopic, category, level, format, duration, tone, numModules });
      fallbackCourse.isLocalFallback = true;
      validateGeneratedCourse(fallbackCourse);
      return fallbackCourse;
    }

    const course = mapGeneratedToCourse(generated, { topic: courseTopic, title, category, level, format, duration, description, numModules });
    validateGeneratedCourse(course);
    return course;
  } catch (error) {
    aiLog("request_exception", { message: error.message });
    const fallbackCourse = buildLocalCourse({ topic: courseTopic, category, level, format, duration, tone, numModules });
    validateGeneratedCourse(fallbackCourse);
    return fallbackCourse;
  }
}