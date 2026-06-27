// Reference only: this project already applies these lines in backend/src/server.js.
// The backend uses ES modules, so use import syntax instead of require().

export const serverSetupSnippet = `
import courseAiRoute from "./routes/courseAi.js";

app.use(express.json());
app.use("/api/courses", requireAuth, requireRole("admin"), courseAiRoute);
`;
