const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function certLog(event, details = {}) {
  console.log(`[ai-cert] ${event}`, JSON.stringify(details));
}

function buildCertPrompt({ teacherName, courseTitle, score, grade, modulesCompleted, totalModules, completedContent, assessmentResults, skillsCovered, duration }) {
  return `You are an expert education credentialing system. Generate a detailed competency assessment report for a teacher training certificate.

TEACHER: ${teacherName}
COURSE: ${courseTitle}
GRADE: ${grade}${score != null ? ` (Score: ${score}%)` : ""}
MODULES COMPLETED: ${modulesCompleted || "N/A"} of ${totalModules || "N/A"}
DURATION: ${duration || "N/A"}
SKILLS COVERED: ${(skillsCovered || []).join(", ") || "General teaching skills"}
${assessmentResults ? `ASSESSMENT RESULTS: ${assessmentResults}` : ""}
${completedContent ? `COMPLETED CONTENT TOPICS: ${completedContent}` : ""}

Return ONLY valid JSON (no markdown fences) with these exact fields:
{
  "competencyLevel": "one of: Expert, Proficient, Competent, Developing, Beginner — based on score and completion",
  "assessmentReport": "A 3-4 sentence professional paragraph describing what the teacher demonstrated, their understanding of the course material, and their readiness to apply it in the classroom. Be specific to the course topic.",
  "skillsAssessment": ["skill1", "skill2", "skill3", "skill4", "skill5"] — exactly 5 key skills the teacher demonstrated, derived from the course content and score,
  "strengthsSummary": "A 2-sentence summary of the teacher's key strengths based on their performance",
  "recommendations": ["rec1", "rec2"] — exactly 2 specific recommendations for further professional development related to the course topic
}

Requirements:
- The assessment must be specific to the course topic, not generic
- If score >= 85, language should reflect strong mastery
- If score >= 65, language should reflect solid understanding with minor gaps
- If score < 65, language should reflect foundational understanding with room for growth
- Skills must be relevant to the course content, not generic teaching skills
- Recommendations must be actionable and specific`;
}

function buildFallbackContent({ teacherName, courseTitle, score, grade }) {
  const scoreNum = typeof score === "number" ? score : 75;
  let competencyLevel, assessmentReport, strengthsSummary;

  if (scoreNum >= 90) {
    competencyLevel = "Expert";
    assessmentReport = `${teacherName} has demonstrated exceptional mastery of ${courseTitle}. Their performance reflects deep understanding of core concepts, strong analytical skills, and the ability to apply learned principles effectively in educational contexts.`;
    strengthsSummary = "Outstanding conceptual understanding and consistent high-quality performance. Demonstrates ability to transfer knowledge to practical classroom scenarios.";
  } else if (scoreNum >= 75) {
    competencyLevel = "Proficient";
    assessmentReport = `${teacherName} has shown solid competency in ${courseTitle}. They have grasped the key concepts well and demonstrated the ability to apply them in structured educational settings with confidence.`;
    strengthsSummary = "Strong grasp of fundamental concepts with good practical application skills. Shows consistent engagement with course materials.";
  } else if (scoreNum >= 60) {
    competencyLevel = "Competent";
    assessmentReport = `${teacherName} has achieved a competent understanding of ${courseTitle}. They demonstrate foundational knowledge and are developing the skills needed to apply course concepts in classroom practice.`;
    strengthsSummary = "Reliable foundational knowledge with developing practical skills. Shows commitment to professional growth through course completion.";
  } else {
    competencyLevel = "Developing";
    assessmentReport = `${teacherName} has begun building their understanding of ${courseTitle}. While foundational concepts have been introduced, further practice and reinforcement will strengthen their application in educational settings.`;
    strengthsSummary = "Shows willingness to learn and has completed the introductory framework. A foundation exists for continued professional development.";
  }

  const skills = scoreNum >= 80
    ? ["Conceptual Mastery", "Practical Application", "Critical Analysis", "Classroom Integration", "Professional Communication"]
    : ["Foundational Knowledge", "Active Learning", "Structured Planning", "Self-Assessment", "Professional Awareness"];

  return {
    competencyLevel,
    assessmentReport,
    skillsAssessment: skills,
    strengthsSummary,
    recommendations: [
      `Complete an advanced-level follow-up course in ${courseTitle} to deepen expertise`,
      "Apply learned concepts in a classroom setting and document outcomes for portfolio development"
    ]
  };
}

export async function generateCertificateContent(data) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  if (!geminiApiKey || /^YOUR_(OPENAI|GEMINI)/i.test(geminiApiKey) || /placeholder/i.test(geminiApiKey)) {
    certLog("missing_api_key", { teacherName: data.teacherName, courseTitle: data.courseTitle });
    return buildFallbackContent(data);
  }

  try {
    certLog("request_start", { teacherName: data.teacherName, courseTitle: data.courseTitle, grade: data.grade });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildCertPrompt(data) }] }]
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      certLog("request_failed", { status: response.status });
      return buildFallbackContent(data);
    }

    const result = await response.json();
    const raw = result.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim() || "";

    let cleanRaw = raw;
    const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) cleanRaw = fenceMatch[1].trim();

    const parsed = JSON.parse(cleanRaw);

    const required = ["competencyLevel", "assessmentReport", "skillsAssessment", "strengthsSummary", "recommendations"];
    for (const field of required) {
      if (!parsed[field]) throw new Error(`Missing field: ${field}`);
    }

    certLog("success", { teacherName: data.teacherName, competencyLevel: parsed.competencyLevel });
    return parsed;
  } catch (err) {
    certLog("fallback", { error: err.message });
    return buildFallbackContent(data);
  }
}
