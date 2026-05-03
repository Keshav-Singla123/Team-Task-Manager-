# Team Task Manager

A production-minded team task management platform for admins and members to create projects, assign work, track execution, and monitor delivery in one place.

Built with a React + Vite frontend, an Express + Node.js API, and MongoDB for persistence, this project focuses on clean permission boundaries, predictable data flow, and a practical workflow that matches how small teams actually operate.

## 1. Project Overview

Team Task Manager solves a common operational problem: teams lose visibility when tasks live in separate tools, ad hoc messages, and manual check-ins. This application centralizes project planning, task assignment, and progress tracking so admins can coordinate work and members can see exactly what they need to do.

The product is designed around two roles:

- Admins can create projects, add members, create tasks, assign work, and manage delivery.
- Members can view assigned work, update permitted task status, and follow project progress without seeing controls they should not use.

The result is a lightweight internal SaaS-style workspace that provides structure without feeling heavy.

## 2. Thought Process

This project was built around a simple engineering goal: make task ownership and project visibility explicit.

The feature set was chosen to support the minimum viable collaboration loop:

1. Create a project.
2. Add the right people.
3. Create tasks and assign responsibility.
4. Track status changes and delivery progress.

That led to a design that emphasizes:

- role-based access instead of client-only UI hiding
- clear data ownership through project and task relationships
- searchable member assignment so larger teams remain usable
- dashboard summaries that help admins see progress quickly

Trade-offs were intentionally made in favor of reliability over complexity. For example, the app uses direct REST endpoints and JWT cookies instead of adding an additional state management or workflow engine layer. That keeps the codebase understandable while still supporting real team usage.

## 3. System Design

### High-Level Architecture

```text
React UI (Vite)
    |
    |  fetch() with credentials: include
    v
Express API (Node.js)
    |
    |  authentication, validation, permissions, business rules
    v
MongoDB (Mongoose models)
```

### Data Flow

The data flow is intentionally straightforward:

1. The user signs in through the React UI.
2. The frontend sends credentials to the Express API.
3. The server returns JWTs in httpOnly cookies.
4. The frontend loads the workspace by calling `/api/users`, `/api/projects`, `/api/tasks`, `/api/dashboard`, and `/api/notifications`.
5. The backend validates each request, checks role permissions, and reads or writes data in MongoDB.
6. Task and project changes are persisted on the server, then the UI refreshes its state from the API.

This architecture prevents the frontend from becoming the source of truth for authorization or task visibility.

## 4. Tech Stack Justification

### React + Vite

React is a strong fit for a role-based dashboard because the UI is stateful, interactive, and component-driven. Vite keeps the development experience fast and the build pipeline simple.

### Node.js + Express

Express provides a minimal, predictable API layer. It is easier to reason about than a heavier framework for a project that needs custom authorization rules, validated payloads, and clean REST endpoints.

### MongoDB + Mongoose

MongoDB fits the project model naturally because projects, tasks, users, memberships, comments, and notifications are related but not rigidly tabular. Mongoose adds schema validation and population support while keeping the code approachable.

### JWT in httpOnly Cookies

JWT cookies allow session handling without storing tokens in localStorage. That reduces exposure to client-side token theft and keeps the auth flow compatible with browser refresh behavior.

### Zod

Zod is used for request validation so the backend can reject invalid or incomplete payloads before they touch business logic or the database.

### Recharts

Recharts powers the dashboard analytics because it provides a lightweight way to visualize workload and status distribution without introducing a complex charting stack.

### nodemailer, bcryptjs, cookie-parser, helmet, rate limiting

These libraries support the production basics: password hashing, secure cookies, HTTP hardening, request throttling, and email workflows where needed.

## 5. Key Features Explained

### Role-Aware Projects and Tasks

Admins are not just visually different from members; they are authorized differently at the API layer. This means project creation, member management, task creation, and destructive actions are all validated server-side.

### Searchable Task Assignment

Task assignment is designed for real teams, not just demos. The task modal includes a searchable member list so admins can quickly find and assign the correct people even as the team grows.

### Project Dashboard

The dashboard gives admins a high-level operational snapshot: active projects, member projects, open work, overdue items, and progress indicators. This helps managers answer "what is blocked?" and "where are we behind?" without opening every project.

### Member-Centric Task Visibility

Members can open the workspace and immediately see the work assigned to them. The API and UI both account for task ownership so assigned work does not disappear because of stale project membership relationships.

### Notifications and Activity Tracking

Task and project actions can trigger notifications and activity records, which gives the application a foundation for collaboration transparency and auditability.

## 6. Database Design

### Collections

- `User` - account identity, role, profile metadata, auth state
- `Project` - project details, status, members, ownership, progress
- `Task` - task metadata, assignees, project link, comments, watcher list, status, time logs
- `Notification` - user-facing alerts for assignments and updates
- `ActivityLog` - event history for project and task actions

### Relationship Model

- One `User` can belong to many `Project` records through the `members` array.
- One `Project` can contain many `Task` records.
- One `Task` belongs to one `Project` and can have multiple assignees.
- One `Task` can generate many `Notification` and `ActivityLog` entries.

### Why this matters

The schema supports the way teams work in practice: projects are the organizing unit, tasks are the execution unit, and users can appear in both through memberships and assignments.

## 7. Authentication and Security

### JWT Usage

Authentication uses short-lived access tokens and refresh tokens stored in httpOnly cookies. That gives the app a browser-friendly session model without exposing tokens to client-side scripts.

### Password Hashing

Passwords are hashed with bcrypt before storage, so no plaintext credentials are persisted.

### Role-Based Access Control

The backend distinguishes between Admin and Member behavior. This is enforced in the routes, not just in the interface.

- Admins can create and manage projects and tasks.
- Members can only perform actions allowed by the server, such as updating assigned task status.

### Additional Safety Controls

- Request validation with Zod
- Helmet-based HTTP hardening
- Rate limiting on API requests
- CORS configured for the frontend origin
- Cookie-based auth with credentialed requests

## 8. Challenges and Learnings

This project surfaced a few real engineering issues that shaped the final design:

- Task visibility broke when the frontend compared MongoDB ObjectIds and strings directly. The fix was to normalize ID comparisons consistently.
- Some task queries were too narrow and only returned data through project membership, which hid assigned tasks from members in certain scenarios. The server-side feed was broadened to include tasks directly involving the user.
- Project and task creation paths needed stronger validation so invalid assignees could not silently break the workflow.
- Email sending in auth flows can block the user experience if treated as a synchronous step. The project was adjusted to avoid waiting on non-essential email operations during critical paths.
- Deployment on Railway required awareness of environment variables, build/start commands, and the fact that the platform manages the runtime port.

These issues reinforced a practical lesson: the UI can only be trusted if the backend and data model enforce the same rules consistently.

## 9. Deployment

The project is configured for Railway deployment.

### Production Notes

- Railway injects the runtime `PORT` value automatically.
- The backend reads `MONGODB_URI`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET` from environment variables.
- The production build runs the Vite client bundle and starts the Node.js server.

### Recommended Railway Commands

- Build: `npm install && npm run build`
- Start: `npm start`

## 10. Future Improvements

Realistic next steps for this codebase:

- Add per-project task filters and saved views
- Expand notifications into a real inbox with read/unread history
- Add due date reminders and overdue escalation rules
- Support task comments and lightweight file attachments in the UI
- Add analytics for team throughput and overdue trends
- Add pagination or infinite scroll for large task lists
- Split the large frontend entry file into feature-based modules

## 11. Setup Instructions

### Prerequisites

- Node.js 20 or newer
- MongoDB Atlas or a local MongoDB instance

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

Set the required variables in `.env`:

```bash
PORT=8081
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=replace_with_a_long_random_string
REFRESH_TOKEN_SECRET=replace_with_another_long_random_string
ENABLE_FIRST_USER_ADMIN=true
ALLOW_PROD_SEED=false
```

### 3. Run the app in development

```bash
npm run dev
```

Frontend: http://localhost:5173

API: http://localhost:8081/api

### 4. Build for production

```bash
npm run build
npm start
```

### 5. Optional helper scripts

```bash
npm run server:dev
npm run client:dev
npm run migrate
```

## Project Structure

```text
server/
  config/         Database connection
  middleware/     Authentication and authorization middleware
  models/         Mongoose schemas
  routes/         REST API endpoints
  utils/          Validation, permissions, tokens, response helpers
src/
  main.jsx        React application entry point
  styles.css      Global UI styles
```

## Closing Note

Team Task Manager was built to feel like a real internal product rather than a demo. The strongest emphasis is on trustworthy data flow, server-side permissions, and a user experience that makes work ownership obvious.
