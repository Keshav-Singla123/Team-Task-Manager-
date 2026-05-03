# Team Task Manager

A full-stack project for organizing projects, teams and tasks with simple role-based access control (Admin vs Member). It includes a React + Vite frontend and an Express + MongoDB backend with JWT authentication.

This README gives a clear overview of what the app does, how to run it locally, and where to find key files and scripts.

## Key Features

- Role-based access: `Admin` and `Member` at project level
- Signup / Login with JWT access + refresh tokens stored in httpOnly cookies
- Project CRUD: create projects, track progress and KPIs
- Task CRUD: create tasks, assign users, status workflow (todo → in-progress → done)
- Member restrictions: Members can only update tasks assigned to them (backend-enforced)
- Project admin tools: add/remove members, create tasks, delete project (UI controls for admins)
- Dashboard: split view for projects you admin vs projects you are a member in, charts and KPIs
- Notifications & activity log foundation (in-app notifications)
- Validation with Zod and safe REST endpoints
- Seed script for demo data and migration helpers

## Tech Stack

- Frontend: React, Vite, Lucide icons, Recharts
- Backend: Node.js (>=20), Express, Mongoose (MongoDB)
- Auth: JWT (access + refresh), cookies
- Validation: Zod
- Dev utilities: nodemon, concurrently

## Quick Start (Local)

1. Install dependencies

```bash
npm install
```

2. Copy example env and edit values

```bash
cp .env.example .env
# then open .env and set MONGODB_URI, JWT_SECRET, REFRESH_TOKEN_SECRET
```

Important env variables (examples):

```
PORT=8081
MONGODB_URI=mongodb+srv://.../team-task-manager
JWT_SECRET=very_long_random_string
REFRESH_TOKEN_SECRET=another_long_random_string
ENABLE_FIRST_USER_ADMIN=true
ALLOW_PROD_SEED=false
```

3. Start the app in development (frontend + backend)

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API (backend): http://localhost:8081/api (default port `8081`)

If you'd rather run only the backend or frontend separately:

```bash
# backend only (with nodemon)
npm run server:dev

# frontend only (vite)
npm run client:dev
```

## Build & Production

Build the frontend bundle and start the server:

```bash
npm run build
npm start
```

The server serves API endpoints from `server/` and expects the built frontend (`dist/`) to be served by your static host or by the Node server in production.

## Useful Scripts

- `npm run dev` — start both client and server concurrently (development)
- `npm run server:dev` — backend only (nodemon)
- `npm run client:dev` — frontend only (vite)
- `npm run build` — build frontend for production
- `npm start` — start backend in production mode
- `npm run migrate` — run legacy migration helpers

## Seed Data (demo)

The `server/seed.js` script creates demo users, projects and tasks — guarded by `ALLOW_PROD_SEED` to avoid seeding production by accident. To run:

```bash
# set ALLOW_PROD_SEED=true in your .env (only for local/testing)
node server/seed.js
```

There is also a `cleanup-demo.js` helper to remove seeded demo accounts if needed.

## Project Structure

- `server/` — Express API, models, routes, middleware and utilities
  - `server/index.js` — server entry
  - `server/models` — Mongoose models (`User.js`, `Project.js`, `Task.js`, etc.)
  - `server/routes` — API route handlers
  - `server/utils` — helpers for auth, tokens, mail, permissions
- `src/` — React app (single-file entry `src/main.jsx` for this project)
- `src/styles.css` — main stylesheet
- `package.json` — scripts and deps

## API Endpoints (summary)

- `POST /api/auth/signup` — create account (first user can be auto-admin)
- `POST /api/auth/login` — login and receive tokens (httpOnly cookies)
- `GET /api/auth/me` — current user
- `GET /api/users` — list users (admin)
- `GET /api/projects` — list projects available to user
- `POST /api/projects` — create project (admins)
- `PATCH /api/projects/:id` — update project
- `DELETE /api/projects/:id` — delete project
- `GET /api/tasks` — list tasks (filtered by membership)
- `POST /api/tasks` — create task
- `PATCH /api/tasks/:id` — update task (status transitions enforced)
- `DELETE /api/tasks/:id` — delete task

For exact request/response shapes check the route handlers in `server/routes` and Zod schemas used there.

## UI Notes

- The UI enforces role-aware controls, but all permission checks are validated on the backend.
- Project cards include quick actions; admins see additional controls.
- Kanban-style Tasks view groups tasks by status and honors the "My Tasks" filter for assigned work.

## Contributing

1. Fork the repo and create a feature branch
2. Make changes and include tests where applicable
3. Run lint/test/build locally
4. Open a PR describing the change

If you want me to push the current local folder to a GitHub repo, follow these commands or provide the repo URL and tell me to run them here:

```bash
git init
git add .
git commit -m "chore: initial import"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Security & Privacy

- Do not commit `.env` or secrets to the repository. Use `.env.example` as a template.
- Email preview URLs are disabled in production by default.

## License

This project template is provided as-is. Add your license file if you plan to open-source it.

---

If you'd like, I can also:

- Add a short project GIF or screenshot to the top of this README
- Generate a `CONTRIBUTING.md` with PR guidelines
- Add a `LICENSE` file

Tell me which of those you'd like next.
