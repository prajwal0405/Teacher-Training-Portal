# Teacher Training Portal Backend

This backend is based on the requirements document for the Spacece and Nestio Preschools teacher training platform.

## Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- bcrypt password hashing

## Setup

1. Install and start MongoDB locally, or use MongoDB Atlas.

Local MongoDB URL:

```text
mongodb://127.0.0.1:27017/teacher_training_portal
```

2. Install backend dependencies:

```powershell
cd backend
npm install
```

3. Create your environment file:

```powershell
copy .env.example .env
```

4. Insert demo data:

```powershell
npm run db:seed
```

5. Start the API:

```powershell
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

## Demo Accounts

Admin:

```text
admin@spaceece.com / Admin@123
```

Teacher:

```text
priya@school.edu / Teacher@123
```

## First API Routes

- `GET /health`
- `POST /api/auth/login`
- `POST /api/auth/register-teacher`
- `GET /api/admin/dashboard`
- `GET /api/centers`
- `POST /api/centers`
- `GET /api/admin/teachers`
- `PATCH /api/admin/teachers/:id/status`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/teacher/me`
- `GET /api/teacher/lesson-plans`
