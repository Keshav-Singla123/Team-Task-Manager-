# Team Task Manager

A full-stack MERN assignment project for managing projects, team members, task assignments, and delivery progress with Admin/Member role-based access control.

## Highlights

- Signup/Login with JWT authentication
- httpOnly cookie sessions with access + refresh tokens
- Forgot password and Ethereal email preview links for development
- Project-level Admin and Member roles
- New users signup, then login with the same email and password
- Users become Admin of projects they create
- Project Admins can add team members, create tasks, assign tasks, and delete records inside their admin projects
- Project Members can view project work and update only their own task status
- Dashboard separates projects the user admins from projects where the user is only a member
- Activity logs and in-app notifications foundation
- Project cards with progress tracking
- Dashboard with total tasks, completion rate, overdue tasks, status chart, and upcoming work
- MongoDB relationships between users, projects, and tasks
- Zod request validation and protected REST APIs
- Railway-ready single-service deployment

## Local Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Create `.env`

   ```bash
   cp .env.example .env
   ```

3. Add your MongoDB connection string and JWT secret to `.env`.

4. Start development

   ```bash
   npm run dev
   ```

Frontend: `http://localhost:5173`

API: `http://localhost:8080/api/health`

## Railway Deployment

1. Push this folder to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Add environment variables:

   ```text
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_long_random_secret
   REFRESH_TOKEN_SECRET=your_second_long_random_secret
   NODE_ENV=production
   ```

4. Railway will run:

   ```bash
   npm install && npm run build
   npm start
   ```

## API Summary

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/projects`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/dashboard`
