/**
 * AI Assignment Feedback Service (Groq API)
 *
 * Generates constructive feedback for teacher assignment submissions
 * using the Groq API (LLaMA / Mixtral models). Falls back to
 * locally-generated feedback when the API key is missing or on error.
 */

/**
 * Build a locally-generated fallback feedback message based on rubric
 * percentage thresholds.
 *
 * @param {string} firstName - Teacher's first name
 * @param {string} title     - Assignment title
 * @param {number} pct       - Overall rubric percentage (0-100)
 * @returns {string}
 */
function buildFallbackFeedback(firstName, title, pct) {
  if (pct >= 85) {
    return `Dear ${firstName},\n\nExcellent work on "${title}"! Your submission demonstrates a strong grasp of the core concepts. The content is well-structured, age-appropriate, and shows creativity. Your practical approach to the learning objectives is commendable.\n\nHighlights:\n• Strong content accuracy and curriculum alignment\n• Excellent presentation and layout\n• Creative and engaging activities\n\nKeep up the outstanding work! You are well on track in this course.\n\nBest regards,\nAdmin Team`;
  }

  if (pct >= 60) {
    return `Dear ${firstName},\n\nThank you for submitting "${title}". Your work shows a good foundational understanding. There are a few areas that could be strengthened:\n\n• Review the practical applicability section — consider adding more real classroom examples\n• The presentation could benefit from clearer headings and structure\n• Content accuracy is good overall but double-check alignment with course objectives\n\nPlease review the rubric feedback and feel free to resubmit if required.\n\nBest regards,\nAdmin Team`;
  }

  return `Dear ${firstName},\n\nThank you for submitting "${title}". We appreciate your effort. However, the submission needs significant improvement in the following areas:\n\n• Content accuracy requires more alignment with course objectives\n• Activities need to be more age-appropriate for the target group\n• Presentation and formatting need to meet the assignment guidelines\n\nPlease review the detailed rubric scores, revise accordingly, and resubmit at your earliest.\n\nBest regards,\nAdmin Team`;
}

/**
 * Generate assignment feedback, either via Groq API or local fallback.
 *
 * @param {Object}   input
 * @param {string}   input.title        - Assignment title
 * @param {string}   input.courseName   - Course name
 * @param {string}   input.teacherName  - Full teacher name
 * @param {Array}    input.rubric       - Array of { criterion, score, maxScore }
 * @param {number}   input.rubricPercent - Overall percentage (0-100)
 * @returns {Promise<{ feedback: string, isFallback?: boolean }>}
 */
export async function generateAssignmentFeedback(input = {}) {
  const {
    title = "the assignment",
    courseName = "the course",
    teacherName = "Teacher",
    rubric = [],
    rubricPercent = 0,
  } = input;

  const firstName = String(teacherName).split(" ")[0] || "Teacher";
  const pct = Number(rubricPercent) || 0;

  // ── Check API key ──────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY || "";
  const isPlaceholder =
    !apiKey ||
    /placeholder/i.test(apiKey) ||
    /^YOUR_/i.test(apiKey) ||
    apiKey.length < 10;

  if (isPlaceholder) {
    console.log("[aiAssignmentFeedback] GROQ_API_KEY missing or placeholder — using fallback.");
    return { feedback: buildFallbackFeedback(firstName, title, pct), isFallback: true };
  }

  // ── Build prompt ───────────────────────────────────────────────
  const rubricLines = rubric
    .map((r) => `  • ${r.criterion}: ${r.score ?? "—"} / ${r.maxScore}`)
    .join("\n");

  const prompt = [
    `You are an expert academic reviewer for a teacher training programme.`,
    `Write warm, constructive feedback (150–200 words) for the following assignment submission.`,
    ``,
    `Assignment Title : ${title}`,
    `Course           : ${courseName}`,
    `Teacher Name     : ${teacherName}`,
    `Rubric Scores    :`,
    rubricLines || "  (no rubric data provided)",
    `Overall Percentage: ${pct}%`,
    ``,
    `Format your response exactly as:`,
    `Dear ${firstName},`,
    ``,
    `[Your feedback here — highlight strengths, suggest improvements, be encouraging]`,
    ``,
    `Best regards,`,
    `Admin Team`,
  ].join("\n");

  // ── Call Groq API ──────────────────────────────────────────────
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`Groq API ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const feedback =
      data?.choices?.[0]?.message?.content?.trim() || "";

    if (!feedback) {
      throw new Error("Empty response from Groq API");
    }

    return { feedback };
  } catch (error) {
    clearTimeout(timeout);
    console.error("[aiAssignmentFeedback] Groq API error — falling back:", error.message || error);
    return { feedback: buildFallbackFeedback(firstName, title, pct), isFallback: true };
  }
}
