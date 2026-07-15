const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function isPlaceholder(key) {
  return !key || /placeholder/i.test(key) || /^YOUR_/i.test(key);
}

function buildFallback({ title, teacherName, rubricPercent }) {
  const name = (teacherName || "Teacher").split(" ")[0];
  return `Dear ${name},\n\nThank you for submitting "${title}". ` +
    (rubricPercent >= 85
      ? "This is strong work overall — clear structure and good alignment to the course outcomes."
      : rubricPercent >= 60
        ? "This is on the right track. A little more classroom detail and tighter structure would help."
        : "This needs more development before approval. Please revisit the assignment instructions and add more practical examples.") +
    `\n\n(Note: this is a fallback message — the AI service could not be reached.)\n\nBest regards,\nAdmin Team`;
}

function buildPrompt({ title, courseName, teacherName, rubric, rubricPercent }) {
  const rubricLines = (rubric || [])
    .map(r => `- ${r.criterion}: ${r.score ?? "not yet scored"}/${r.maxScore}`)
    .join("\n");
  return `You are an education specialist reviewing a teacher-training assignment for SpacECE India Foundation, an early-childhood/FLN teacher-training organization.

Assignment: "${title}"
Course: ${courseName}
Teacher: ${teacherName}
Rubric:
${rubricLines}
Overall: ${rubricPercent}%

Write warm, constructive feedback (150-200 words) addressed to the teacher by first name, ending "Best regards,\\nAdmin Team". Be specific to the rubric scores.`;
}

export async function generateAssignmentFeedback(input) {
  const { title = "the assignment", courseName = "Unknown Course", teacherName = "Teacher", rubric = [], rubricPercent = 0 } = input || {};
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (isPlaceholder(apiKey)) {
    return { feedback: buildFallback({ title, teacherName, rubricPercent }), isFallback: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: buildPrompt({ title, courseName, teacherName, rubric, rubricPercent }) }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Anthropic request failed (${response.status})`);

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error("Empty AI response");

    return { feedback: text, isFallback: false };
  } catch (error) {
    console.error("[ai-assignment-feedback] failed:", error.message);
    return { feedback: buildFallback({ title, teacherName, rubricPercent }), isFallback: true };
  }
}