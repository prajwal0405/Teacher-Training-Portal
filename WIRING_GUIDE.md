# Wiring Guide — small edits to existing files

You do NOT need to rewrite TeacherDashboard.jsx or AdminDashboard.jsx.
Make these small, targeted edits.

--------------------------------------------------------------------
## 1. TeacherDashboard.jsx
--------------------------------------------------------------------

### 1a. Imports — replace:
```js
import ProctoredAssessment from "./Proctoredassessment";
```
with:
```js
import ProctoredAssessment from "./Proctoredassessment";      // now reading/notes based, same filename
import TeacherCourseNotes from "./TeacherCourseNotes";         // NEW — replaces the old video CoursesTab
```
(Remove the old in-file `CoursesTab` function entirely — `TeacherCourseNotes` replaces it.)

### 1b. WORKING_TABS — replace:
```js
const WORKING_TABS = new Set(["overview", "children_att", "geotag", "profile", "training"]);
```
with:
```js
const WORKING_TABS = new Set(["overview", "children_att", "geotag", "profile", "training", "courses", "assessment"]);
```
This removes the "under work" placeholder for My Courses and Assessments.

### 1c. renderContent() switch — replace:
```js
case "courses":       return <CoursesTab assignments={courses} onMarkDone={handleMarkDone}/>;
...
case "assessment":    return <ProctoredAssessment user={enrichedUser} assessmentResults={assessmentResults}/>;
```
with:
```js
case "courses":
  return (
    <TeacherCourseNotes
      assignments={courses}
      onMarkDone={handleMarkDone}
      onGoToAssessment={() => handleTabSwitch("assessment")}
    />
  );
case "assessment":
  return <ProctoredAssessment assignments={courses} />;
```

Everything else in TeacherDashboard.jsx (attendance, schedule, grades,
assignments, certificates, notifications, feedback, profile, the AI
chat widget) is untouched and keeps working exactly as before.

--------------------------------------------------------------------
## 2. AdminDashboard.jsx
--------------------------------------------------------------------

### 2a. Imports — add:
```js
import CurriculumTrainingTab from "../admin/CurriculumTrainingTab"; // already imported — just confirm it points at the new file
import AssessmentResultsTab from "../admin/AssessmentResultsTab";   // NEW
```

### 2b. navItems — add a new nav entry (after "curriculum"):
```js
{ key: "assessments", label: "Assessment Results", icon: "\uD83D\uDCDD" },
```

### 2c. renderContent() switch — add:
```js
case "assessments": return <AssessmentResultsTab setToast={setToast}/>;
```

Nothing else in AdminDashboard.jsx needs to change — Center Management,
Teacher Management, Attendance, Reports, Settings, etc. are untouched.

--------------------------------------------------------------------
## 3. services/api.js
--------------------------------------------------------------------
Paste the contents of `api.additions.js` into your existing
`services/api.js` (adjust `apiFetch` to whatever helper your file
already uses for authenticated requests — every other function in
that file follows the same pattern, so copy it from a neighboring
function such as `getCourseNotes`).

--------------------------------------------------------------------
## 4. Backend
--------------------------------------------------------------------
See `backend/README.md` for the 4 backend files and where they go.

--------------------------------------------------------------------
## 5. Delete/retire (no longer used)
--------------------------------------------------------------------
- The old hardcoded `QUESTION_BANK` and `scoreWithAI` video-era code in
  the previous Proctoredassessment.jsx — fully replaced by the new file.
- The old `CoursesTab` video player function inside TeacherDashboard.jsx
  and the `getCourseContent` video/YouTube helper — no longer needed
  since there is no video content anymore. `TeacherCourseNotes.jsx`
  replaces both.
- `YoutubeThumbnail`, `verifyYoutubeVideo`, `getYoutubeId`, and the
  video URL fields in the old CurriculumTrainingTab.jsx — all removed
  in the new version (courses are notes-only now).
