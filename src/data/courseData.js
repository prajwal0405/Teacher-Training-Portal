export async function generateCourseWithAI(form) {
  const token = localStorage.getItem("spaceece_auth_token");
  const response = await fetch("/api/courses/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(form)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Course generation failed.");
  }

  return data.course;
}
