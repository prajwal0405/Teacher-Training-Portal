# Teacher Training Portal MongoDB Design

The Mongoose models in `backend/src/models` follow the requirements document:

- Admin and Teacher role separation
- Center management
- Teacher profile and approval flow
- Children and class management
- Teacher and child attendance
- Course creation, content upload, and course assignment
- Lesson plan creation and auto/manual assignment
- Lesson completion reports with evidence files
- Activity uploads with admin review
- Notifications and report jobs

## Main Collections

Authentication:

- `users`

Centers and classroom structure:

- `centers`
- `classes`
- `children`

Training curriculum:

- `courses`
- `course_assignments`

Lesson workflow:

- `lessonplans`
- `lessonplanassignments`
- `lessoncompletionreports`

Attendance:

- `childattendancesessions`
- `teacherattendancerecords`

Uploads and review:

- `fileassets`
- `activitysubmissions`

Operations:

- `notifications`
- `reportjobs`

## Backend API Direction

The backend currently includes the first route layer for auth, centers, classes, teachers, children, courses, dashboard metrics, and teacher lesson-plan access. The next development step is to connect the React screens to these routes one module at a time, replacing `localStorage` and mock arrays with API calls.
