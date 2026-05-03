import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flame,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { format, isBefore, parseISO } from "date-fns";
import "./styles.css";

const API_URL = "/api";
const STATUS = ["todo", "in-progress", "in-review", "blocked", "done"];
const PRIORITY = ["low", "medium", "high", "critical"];
const PROJECT_STATUS = ["active", "on-hold", "completed", "archived"];
const COLORS = ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#be123c"];

function request(path, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...options.headers,
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const error = new Error(data.message || "Request failed");
      error.errors = data.errors || [];
      throw error;
    }
    return data.data ?? data;
  });
}

function initials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isOverdue(task) {
  return (
    task.dueDate &&
    task.status !== "done" &&
    isBefore(parseISO(task.dueDate), new Date())
  );
}

function projectRole(project, currentUser) {
  const currentUserId = currentUser?.id || currentUser?._id;
  return (
    project?.members?.find(
      (member) => (member.user?._id || member.user) === currentUserId,
    )?.role || "member"
  );
}

function App() {
  const [auth, setAuth] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeView, setActiveView] = useState("dashboard");

  useEffect(() => {
    request("/auth/refresh")
      .then((data) => setAuth(data?.user ? { user: data.user } : null))
      .catch(() => setAuth(null))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <SessionLoader />;
  if (!auth) return <AuthScreen onAuth={setAuth} />;

  return (
    <Workspace
      auth={auth}
      setAuth={setAuth}
      activeView={activeView}
      setActiveView={setActiveView}
    />
  );
}

function SessionLoader() {
  return (
    <main className="session-loader">
      <div className="skeleton-logo" />
      <div className="skeleton-line wide-line" />
      <div className="skeleton-grid">
        <div />
        <div />
        <div />
      </div>
    </main>
  );
}

function AuthScreen({ onAuth }) {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("token");
  const initialMode =
    window.location.pathname.includes("reset-password") && resetToken
      ? "reset"
      : "login";
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "forgot") {
        const data = await request("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: form.email }),
        });
        setSuccess(data.message);
        return;
      }

      if (mode === "reset") {
        const data = await request("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            token: resetToken,
            password: form.password,
            confirmPassword: form.confirmPassword,
          }),
        });
        setSuccess(data.message);
        setMode("login");
        return;
      }

      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : {
              name: form.name,
              email: form.email,
              password: form.password,
              confirmPassword: form.confirmPassword,
            };
      const data = await request(
        `/auth/${mode === "login" ? "login" : "signup"}`,
        { method: "POST", body: JSON.stringify(payload) },
      );

      if (mode === "signup") {
        setSuccess(data.message);
        setMode("login");
      } else {
        onAuth({ user: data.user });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand-mark">
          <Sparkles size={20} />
          TaskFlow
        </div>
        <h1>Team delivery, controlled from one sharp workspace.</h1>
        <p>
          Plan projects, assign work, monitor overdue risk, and keep
          admin/member permissions clean from day one.
        </p>
        <div className="hero-grid">
          <div>
            <ShieldCheck />
            <strong>Admin/Member</strong>
            <span>Role-based access</span>
          </div>
          <div>
            <BarChart3 />
            <strong>Live Insights</strong>
            <span>Live progress dashboard</span>
          </div>
          <div>
            <FolderKanban />
            <strong>Team Control</strong>
            <span>Project and team control</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Signup
          </button>
        </div>
        <form onSubmit={submit} className="form-stack">
          {mode === "signup" && (
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
          )}
          {mode !== "forgot" && (
            <label>
              Password
              <input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
          )}
          {mode === "login" && (
            <p className="helper-text">
              Use your registered workspace account to continue. Project access
              depends on whether you created it or were added to it.
            </p>
          )}
          {(mode === "signup" || mode === "reset") && (
            <label>
              Confirm Password
              <input
                type="password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                required
              />
            </label>
          )}
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
          <button className="primary-btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Enter Workspace"
                : mode === "forgot"
                  ? "Send Reset Link"
                  : mode === "reset"
                    ? "Reset Password"
                    : "Create Account"}
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => setMode(mode === "forgot" ? "login" : "forgot")}
          >
            {mode === "forgot" ? "Back to login" : "Forgot password?"}
          </button>
          <p className="demo-note">
            Use your registered workspace account to continue.
          </p>
        </form>
      </section>
    </main>
  );
}

function Workspace({ auth, setAuth, activeView, setActiveView }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskModal, setTaskModal] = useState(null);
  const [projectModal, setProjectModal] = useState(false);
  const [notifications, setNotifications] = useState({
    notifications: [],
    unread: 0,
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [query, setQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");

  const adminProjects = useMemo(
    () =>
      projects.filter((project) => projectRole(project, auth.user) === "admin"),
    [projects, auth.user],
  );
  const memberProjects = useMemo(
    () =>
      projects.filter((project) => projectRole(project, auth.user) !== "admin"),
    [projects, auth.user],
  );
  const adminProjectIds = useMemo(
    () => new Set(adminProjects.map((project) => project._id)),
    [adminProjects],
  );

  if (!auth?.user) {
    return <SessionLoader />;
  }

  async function loadAll() {
    setError("");
    setLoading(true);
    try {
      const [userData, projectData, taskData, dashData, notificationData] =
        await Promise.all([
          request("/users").catch(() => ({ users: [] })), // Fallback to empty if API fails
          request("/projects"),
          request("/tasks"),
          request("/dashboard"),
          request("/notifications"),
        ]);

      let usersList = userData.users || [];

      // Fallback: if users list is empty, extract from project members
      if (usersList.length === 0) {
        const memberMap = new Map();
        projectData.projects.forEach((project) => {
          (project.members || []).forEach((member) => {
            if (member.user?._id) {
              memberMap.set(member.user._id, member.user);
            }
          });
        });
        usersList = Array.from(memberMap.values());
      }

      setUsers(usersList);
      setProjects(projectData.projects);
      setTasks(taskData.tasks);
      setDashboard(dashData);
      setNotifications(notificationData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function logout() {
    request("/auth/logout", { method: "POST" }).finally(() => setAuth(null));
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filter by "My Tasks" vs "All Tasks"
      if (taskFilter === "my") {
        const isAssigned = (task.assignees || []).some(
          (assignee) =>
            (assignee._id || assignee) === (auth.user.id || auth.user._id),
        );
        if (!isAssigned) return false;
      }

      // Filter by search query
      const assigneeNames = (task.assignees || [])
        .map((user) => user.name)
        .join(" ");
      const haystack =
        `${task.title} ${task.project?.name} ${assigneeNames}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [tasks, query, taskFilter, auth.user]);

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-box">TF</div>
          <div>
            <strong>TaskFlow</strong>
            <span>Team Task Manager</span>
          </div>
        </div>
        <nav>
          <NavButton
            id="dashboard"
            activeView={activeView}
            setActiveView={setActiveView}
            icon={<LayoutDashboard />}
          >
            Dashboard
          </NavButton>
          <NavButton
            id="projects"
            activeView={activeView}
            setActiveView={setActiveView}
            icon={<FolderKanban />}
          >
            Projects
          </NavButton>
          <NavButton
            id="tasks"
            activeView={activeView}
            setActiveView={setActiveView}
            icon={<ClipboardList />}
          >
            Tasks
          </NavButton>
          <NavButton
            id="team"
            activeView={activeView}
            setActiveView={setActiveView}
            icon={<Users />}
          >
            Team
          </NavButton>
        </nav>
        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {adminProjects.length} admin projects · {memberProjects.length}{" "}
              member projects
            </p>
            <h2>
              {activeView === "dashboard"
                ? "Delivery Dashboard"
                : titleCase(activeView)}
            </h2>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input
                placeholder="Search tasks..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {activeView === "tasks" && (
              <button
                className={`ghost-btn ${taskFilter === "my" ? "active" : ""}`}
                onClick={() =>
                  setTaskFilter(taskFilter === "my" ? "all" : "my")
                }
                title={
                  taskFilter === "my" ? "Show all tasks" : "Show my tasks only"
                }
              >
                {taskFilter === "my" ? "My Tasks" : "All Tasks"}
              </button>
            )}
            <button className="ghost-btn" onClick={() => setProjectModal(true)}>
              <Plus size={17} />
              Project
            </button>
            {adminProjects.length > 0 && (
              <button
                className="primary-btn compact"
                onClick={() => setTaskModal({ projectId: "" })}
              >
                <Plus size={17} />
                Task
              </button>
            )}
            <div className="notification-wrap">
              <button
                className="icon-btn bell-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {notifications.unread > 0 && (
                  <span>{notifications.unread}</span>
                )}
              </button>
              {showNotifications && (
                <div className="notification-panel">
                  <div className="section-head">
                    <h3>Notifications</h3>
                    <button
                      className="link-btn"
                      onClick={() =>
                        request("/notifications/read-all", {
                          method: "PATCH",
                        }).then(() =>
                          setNotifications((current) => ({
                            ...current,
                            unread: 0,
                          })),
                        )
                      }
                    >
                      Mark all read
                    </button>
                  </div>
                  {notifications.notifications.length ? (
                    notifications.notifications.slice(0, 8).map((item) => (
                      <div
                        className={`notification-item ${item.readAt ? "" : "unread"}`}
                        key={item._id}
                      >
                        <Avatar user={item.actor || auth.user} small />
                        <div>
                          <strong>{item.message}</strong>
                          <span>
                            {item.project?.name || "TaskFlow"} ·{" "}
                            {format(parseISO(item.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No notifications yet.</div>
                  )}
                </div>
              )}
            </div>
            <div className="profile-chip">
              <Avatar user={auth.user} small />
              <span>{auth.user.name}</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="notice error-state">
            <strong>{error}</strong>
            <button className="ghost-btn" onClick={loadAll}>
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="loading-panel">Loading your workspace...</div>
        ) : (
          <>
            {activeView === "dashboard" && (
              <Dashboard
                dashboard={dashboard}
                tasks={filteredTasks}
                adminProjects={adminProjects}
                memberProjects={memberProjects}
                adminProjectIds={adminProjectIds}
                currentUser={auth.user}
                onRefresh={loadAll}
              />
            )}
            {activeView === "projects" && (
              <Projects
                adminProjects={adminProjects}
                memberProjects={memberProjects}
                tasks={tasks}
                users={users}
                currentUser={auth.user}
                onCreateProject={() => setProjectModal(true)}
                onCreateTask={(projectId) => setTaskModal({ projectId })}
                onRefresh={loadAll}
              />
            )}
            {activeView === "tasks" && (
              <Tasks
                tasks={filteredTasks}
                adminProjectIds={adminProjectIds}
                currentUser={auth.user}
                onRefresh={loadAll}
              />
            )}
            {activeView === "team" && (
              <Team
                users={users}
                projects={projects}
                tasks={tasks}
                currentUser={auth.user}
              />
            )}
          </>
        )}
      </section>

      {taskModal && (
        <TaskModal
          projects={adminProjects}
          users={users}
          initialProjectId={taskModal.projectId}
          onClose={() => setTaskModal(null)}
          onSaved={loadAll}
        />
      )}
      {projectModal && (
        <ProjectModal
          users={users}
          onClose={() => setProjectModal(false)}
          onSaved={loadAll}
          currentUser={auth.user}
        />
      )}
    </main>
  );
}

function NavButton({ id, activeView, setActiveView, icon, children }) {
  return (
    <button
      className={activeView === id ? "active" : ""}
      onClick={() => setActiveView(id)}
    >
      {React.cloneElement(icon, { size: 18 })}
      {children}
    </button>
  );
}

function Dashboard({
  dashboard,
  tasks,
  adminProjects,
  memberProjects,
  adminProjectIds,
  currentUser,
  onRefresh,
}) {
  const [detailProject, setDetailProject] = useState(null);
  const visibleTotal = Math.max(tasks.length, 1);
  const completionRate = Math.round(
    (tasks.filter((task) => task.status === "done").length / visibleTotal) *
      100,
  );
  const statusData = STATUS.map((status) => ({
    name: status,
    value: dashboard.statusCounts.find((row) => row._id === status)?.count || 0,
  })).filter((row) => row.value > 0);

  return (
    <div className="view-grid">
      <section className="command-center">
        <div>
          <p className="eyebrow light">Command center</p>
          <h3>Stay ahead of deadlines before they become blockers.</h3>
          <p>
            Track workload health, overdue risk, and team execution from one
            focused operational dashboard.
          </p>
        </div>
        <div className="command-metrics">
          <div>
            <Flame size={22} />
            <strong>{dashboard.stats.overdueTasks}</strong>
            <span>urgent follow-ups</span>
          </div>
          <div>
            <Target size={22} />
            <strong>{completionRate}%</strong>
            <span>delivery rate</span>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <Stat
          icon={<FolderKanban />}
          label="Admin Projects"
          value={adminProjects.length}
          tone="blue"
          trend="Full control"
        />
        <Stat
          icon={<Users />}
          label="Member Projects"
          value={memberProjects.length}
          tone="blue"
          trend="Limited access"
        />
        <Stat
          icon={<ClipboardList />}
          label="My Open Tasks"
          value={dashboard.stats.myOpenTasks}
          tone="green"
          trend="Assigned to me"
        />
        <Stat
          icon={<CheckCircle2 />}
          label="Done This Week"
          value={dashboard.stats.completedThisWeek}
          tone="amber"
          trend="Weekly momentum"
        />
        <Stat
          icon={<AlertTriangle />}
          label="Overdue"
          value={dashboard.stats.overdueTasks}
          tone="red"
          trend="Needs action"
        />
      </section>

      <section className="panel wide role-split-panel">
        <ProjectMiniList
          title="Projects I Admin"
          projects={adminProjects}
          onOpenDetails={setDetailProject}
        />
        <ProjectMiniList
          title="Projects I Am Member In"
          projects={memberProjects}
          onOpenDetails={setDetailProject}
        />
      </section>

      <section className="panel chart-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Status mix</p>
            <h3>Progress by workflow</h3>
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={94}
                paddingAngle={4}
              >
                {statusData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-head">
          <div>
            <p className="eyebrow">Immediate focus</p>
            <h3>Upcoming and overdue tasks</h3>
          </div>
        </div>
        <TaskList
          tasks={tasks.slice(0, 7)}
          compact
          adminProjectIds={adminProjectIds}
          currentUser={currentUser}
          onRefresh={onRefresh}
        />
      </section>

      {detailProject && (
        <ProjectDetailModal
          project={detailProject}
          tasks={tasks.filter(
            (task) =>
              task.project?._id === detailProject._id ||
              task.project === detailProject._id,
          )}
          canManage={projectRole(detailProject, currentUser) === "admin"}
          currentUser={currentUser}
          onClose={() => setDetailProject(null)}
          onCreateTask={() => setDetailProject(null)}
          onManageMembers={() => setDetailProject(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

function ProjectMiniList({ title, projects, onOpenDetails }) {
  return (
    <div className="mini-project-list">
      <div className="section-head">
        <h3>{title}</h3>
        <span className="pill">{projects.length}</span>
      </div>
      {projects.length ? (
        projects.slice(0, 4).map((project) => (
          <div className="mini-project-row" key={project._id}>
            <span style={{ background: project.color }} />
            <strong>{project.name}</strong>
            <small>{project.taskSummary?.total || 0} tasks</small>
            <button
              className="icon-btn mini-menu-btn"
              type="button"
              aria-label="Open project details"
              onClick={() => onOpenDetails?.(project)}
            >
              <MoreVertical size={14} />
            </button>
          </div>
        ))
      ) : (
        <div className="empty-state">Nothing here yet.</div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, tone, trend }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-card-top">
        <div className="stat-icon">
          {React.cloneElement(icon, { size: 21 })}
        </div>
        <TrendingUp size={17} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}

function Projects({
  adminProjects,
  memberProjects,
  tasks,
  users,
  currentUser,
  onCreateProject,
  onCreateTask,
  onRefresh,
}) {
  const [memberProject, setMemberProject] = useState(null);
  const [detailProjectId, setDetailProjectId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const allProjects = useMemo(() => {
    const byId = new Map();
    [...adminProjects, ...memberProjects].forEach((project) => {
      byId.set(project._id, project);
    });
    return Array.from(byId.values());
  }, [adminProjects, memberProjects]);

  function tasksForProject(project) {
    return tasks.filter(
      (task) =>
        task.project?._id === project._id || task.project === project._id,
    );
  }

  async function removeProject(id) {
    if (!confirm("Delete this project and all related tasks?")) return;
    await request(`/projects/${id}`, { method: "DELETE" });
    onRefresh();
  }

  function renderProject(project) {
    const canManage = projectRole(project, currentUser) === "admin";
    const projectTasks = tasksForProject(project);
    const total = projectTasks.length || project.taskSummary?.total || 0;
    const done =
      projectTasks.filter((task) => task.status === "done").length ||
      project.taskSummary?.done ||
      0;
    const open = projectTasks.filter((task) => task.status !== "done").length;
    const overdue = projectTasks.filter(isOverdue).length;
    const progress = total ? Math.round((done / total) * 100) : 0;

    return (
      <article className="project-card" key={project._id}>
        <div className="project-accent" style={{ background: project.color }} />
        <div className="section-head">
          <div>
            <div className="badge-row">
              <span className="pill">{canManage ? "Admin" : "Member"}</span>
              <span className="pill">{labelize(project.status)}</span>
              <span className={`priority ${project.priority}`}>
                {labelize(project.priority)}
              </span>
            </div>
            <h3>{project.name}</h3>
          </div>
          <div className="card-actions">
            <div className="menu-wrapper">
              <button
                className="icon-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpenId(
                    menuOpenId === project._id ? null : project._id,
                  );
                }}
                aria-label="More options"
              >
                <MoreVertical size={17} />
              </button>
              {menuOpenId === project._id && (
                <div className="dropdown-menu">
                  <button
                    className="dropdown-item"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDetailProjectId(project._id);
                      setMenuOpenId(null);
                    }}
                  >
                    Go to Details
                  </button>
                </div>
              )}
            </div>
            {canManage && (
              <>
                <button
                  className="icon-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCreateTask(project._id);
                  }}
                  aria-label="Create task"
                >
                  <Plus size={17} />
                </button>
                {/* Manage members removed from project card menu per request */}
                <button
                  className="icon-btn danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeProject(project._id);
                  }}
                  aria-label="Delete project"
                >
                  <Trash2 size={17} />
                </button>
              </>
            )}
          </div>
        </div>
        <p>{project.description}</p>
        <div className="progress-row">
          <span>{progress}% complete</span>
          <span>
            {done}/{total} tasks
          </span>
        </div>
        <div className="project-kpis">
          <span>{open} open</span>
          <span>{overdue} overdue</span>
        </div>
        <div className="task-meta project-meta">
          <span>
            <CalendarClock size={14} />
            {project.dueDate
              ? format(parseISO(project.dueDate), "MMM d, yyyy")
              : "No due date"}
          </span>
          <span>{project.members.length} members</span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${progress}%`, background: project.color }} />
        </div>
        <div className="avatar-row">
          {project.members.map((member) => (
            <Avatar
              key={member.user?._id || member.user}
              user={member.user || member}
              small
            />
          ))}
        </div>
      </article>
    );
  }

  return (
    <section className="project-sections">
      <div className="section-head">
        <div>
          <p className="eyebrow">All projects</p>
          <h3>Projects</h3>
        </div>
        <div className="card-actions">
          <span className="pill">{allProjects.length}</span>
          <button className="primary-btn compact" onClick={onCreateProject}>
            <Plus size={17} />
            Project
          </button>
        </div>
      </div>
      <div className="project-grid">
        {allProjects.length ? (
          allProjects.map((project) => renderProject(project))
        ) : (
          <div className="empty-state">Create a project to get started.</div>
        )}
      </div>

      {memberProject && (
        <ProjectMembersModal
          project={memberProject}
          users={users}
          currentUser={currentUser}
          onClose={() => setMemberProject(null)}
          onSaved={() => {
            setMemberProject(null);
            onRefresh();
          }}
        />
      )}

      {detailProjectId && (
        <ProjectDetailModal
          project={allProjects.find((p) => p._id === detailProjectId)}
          tasks={tasksForProject(
            allProjects.find((p) => p._id === detailProjectId),
          )}
          canManage={
            projectRole(
              allProjects.find((p) => p._id === detailProjectId),
              currentUser,
            ) === "admin"
          }
          currentUser={currentUser}
          onClose={() => setDetailProjectId(null)}
          onCreateTask={() => onCreateTask(detailProjectId)}
          onManageMembers={() =>
            setMemberProject(allProjects.find((p) => p._id === detailProjectId))
          }
          onRefresh={onRefresh}
        />
      )}
    </section>
  );
}

function Tasks({ tasks, adminProjectIds, currentUser, onRefresh }) {
  return (
    <section className="kanban">
      {STATUS.map((status) => (
        <div className="kanban-column" key={status}>
          <div className="column-head">
            <h3>{labelize(status)}</h3>
            <span>{tasks.filter((task) => task.status === status).length}</span>
          </div>
          <TaskList
            tasks={tasks.filter((task) => task.status === status)}
            adminProjectIds={adminProjectIds}
            currentUser={currentUser}
            onRefresh={onRefresh}
          />
        </div>
      ))}
    </section>
  );
}

function ProjectDetail({
  project,
  tasks,
  canManage,
  currentUser,
  onCreateTask,
  onManageMembers,
  onRefresh,
}) {
  const done = tasks.filter((task) => task.status === "done").length;
  const open = tasks.filter((task) => task.status !== "done").length;
  const overdue = tasks.filter(isOverdue).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const adminProjectIds = canManage ? new Set([project._id]) : new Set();

  return (
    <section className="panel project-detail">
      <div className="section-head">
        <div>
          <p className="eyebrow">
            {canManage ? "Admin controls" : "Member view"}
          </p>
          <h3>{project.name}</h3>
        </div>
        {canManage && (
          <div className="card-actions">
            <button className="primary-btn compact" onClick={onCreateTask}>
              <Plus size={17} />
              Task
            </button>
            {/* Members button removed per request */}
          </div>
        )}
      </div>

      <p>{project.description || "No description added."}</p>
      <div className="detail-metrics">
        <span>{tasks.length} total tasks</span>
        <span>{open} open</span>
        <span>{done} done</span>
        <span>{overdue} overdue</span>
        <span>{progress}% complete</span>
        <span>
          {project.dueDate
            ? `Deadline ${format(parseISO(project.dueDate), "MMM d, yyyy")}`
            : "No project deadline"}
        </span>
      </div>

      <div className="detail-grid">
        <div>
          <div className="section-head">
            <h3>Members</h3>
            <span className="pill">{project.members.length}</span>
          </div>
          <div className="detail-members">
            {project.members.map((member) => (
              <div key={member.user?._id || member.user}>
                <Avatar user={member.user || member} small />
                <strong>{member.user?.name || "Member"}</strong>
                <span>{labelize(member.role)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="section-head">
            <h3>Task Status</h3>
            <span className="pill">{tasks.length}</span>
          </div>
          <div className="status-summary">
            {STATUS.map((status) => (
              <div key={status}>
                <strong>
                  {tasks.filter((task) => task.status === status).length}
                </strong>
                <span>{labelize(status)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-head">
        <h3>Tasks In This Project</h3>
        {canManage && (
          <button className="primary-btn compact" onClick={onCreateTask}>
            <Plus size={17} />
            Task
          </button>
        )}
      </div>
      <ProjectTaskRows
        tasks={tasks}
        adminProjectIds={adminProjectIds}
        currentUser={currentUser}
        onRefresh={onRefresh}
      />
    </section>
  );
}

function ProjectTaskRows({
  tasks,
  adminProjectIds = new Set(),
  currentUser = null,
  onRefresh = () => {},
}) {
  function isAssignedToCurrentUser(task) {
    return (task.assignees || []).some((user) => user._id === currentUser?.id);
  }

  function isProjectAdminTask(task) {
    return adminProjectIds.has(task.project?._id || task.project);
  }

  function statusOptions(task) {
    if (isProjectAdminTask(task)) return STATUS;
    const nextByStatus = {
      todo: "in-progress",
      "in-progress": "done",
    };
    return [task.status, nextByStatus[task.status]].filter(Boolean);
  }

  async function updateStatus(task, status) {
    await request(`/tasks/${task._id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    onRefresh();
  }

  async function removeTask(id) {
    if (!confirm("Delete this task?")) return;
    await request(`/tasks/${id}`, { method: "DELETE" });
    onRefresh();
  }

  if (!tasks.length) {
    return <div className="empty-state">No tasks in this project yet.</div>;
  }

  return (
    <div className="project-task-table">
      {tasks.map((task) => {
        const isProjectAdmin = isProjectAdminTask(task);
        const canChangeStatus = isProjectAdmin || isAssignedToCurrentUser(task);
        return (
          <div className={isOverdue(task) ? "overdue" : ""} key={task._id}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.description || "No description"}</span>
            </div>
            <span>
              {(task.assignees || []).map((user) => user.name).join(", ") ||
                "Unassigned"}
            </span>
            <span>
              {task.dueDate
                ? format(parseISO(task.dueDate), "MMM d, yyyy")
                : "No deadline"}
            </span>
            {canChangeStatus ? (
              <select
                value={task.status}
                onChange={(event) => updateStatus(task, event.target.value)}
              >
                {statusOptions(task).map((status) => (
                  <option key={status} value={status}>
                    {labelize(status)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="status-readonly">{labelize(task.status)}</span>
            )}
            {isProjectAdmin && (
              <button
                className="icon-btn danger"
                onClick={() => removeTask(task._id)}
                aria-label="Delete task"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskList({
  tasks,
  compact = false,
  adminProjectIds = new Set(),
  currentUser = null,
  onRefresh = () => {},
}) {
  function isAssignedToCurrentUser(task) {
    return (task.assignees || []).some((user) => user._id === currentUser?.id);
  }

  function statusOptions(task) {
    if (isProjectAdminTask(task)) return STATUS;
    const nextByStatus = {
      todo: "in-progress",
      "in-progress": "done",
    };
    return [task.status, nextByStatus[task.status]].filter(Boolean);
  }

  function isProjectAdminTask(task) {
    return adminProjectIds.has(task.project?._id || task.project);
  }

  async function updateStatus(task, status) {
    await request(`/tasks/${task._id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    onRefresh();
  }

  async function removeTask(id) {
    if (!confirm("Delete this task?")) return;
    await request(`/tasks/${id}`, { method: "DELETE" });
    onRefresh();
  }

  if (!tasks.length)
    return <div className="empty-state">No tasks here yet.</div>;

  return (
    <div className={compact ? "task-list compact-list" : "task-list"}>
      {tasks.map((task) =>
        (() => {
          const isProjectAdmin = isProjectAdminTask(task);
          const canChangeStatus =
            isProjectAdmin || isAssignedToCurrentUser(task);
          return (
            <article
              className={`task-card ${isOverdue(task) ? "overdue" : ""}`}
              key={task._id}
            >
              <div className="task-top">
                <span className={`priority ${task.priority}`}>
                  {labelize(task.priority)}
                </span>
                {isOverdue(task) && (
                  <span className="overdue-pill">Overdue</span>
                )}
              </div>
              <h4>{task.title}</h4>
              {!compact && <p>{task.description}</p>}
              <div className="task-meta">
                <span>
                  <FolderKanban size={14} />
                  {task.project?.name}
                </span>
                <span>
                  <CalendarClock size={14} />
                  {task.dueDate
                    ? format(parseISO(task.dueDate), "MMM d")
                    : "No due date"}
                </span>
              </div>
              <div className="task-footer">
                <div className="avatar-row tight">
                  {(task.assignees || []).slice(0, 3).map((user) => (
                    <Avatar key={user._id} user={user} small />
                  ))}
                </div>
                {canChangeStatus ? (
                  <select
                    value={task.status}
                    onChange={(event) => updateStatus(task, event.target.value)}
                  >
                    {statusOptions(task).map((status) => (
                      <option key={status} value={status}>
                        {labelize(status)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="status-readonly">
                    {labelize(task.status)}
                  </span>
                )}
                {isProjectAdmin && (
                  <button
                    className="icon-btn danger"
                    onClick={() => removeTask(task._id)}
                    aria-label="Delete task"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </article>
          );
        })(),
      )}
    </div>
  );
}

function Team({ users, projects, tasks, currentUser }) {
  const [detailProject, setDetailProject] = useState(null);

  return (
    <section className="team-grid">
      {projects.map((project) => {
        const members = project.members || [];
        const projectTasks = tasks.filter(
          (task) =>
            task.project?._id === project._id || task.project === project._id,
        );
        const recentTasks = [...projectTasks]
          .sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt || 0).getTime() -
              new Date(a.updatedAt || a.createdAt || 0).getTime(),
          )
          .slice(0, 4);
        const teamSize = members.length;
        const completed = projectTasks.filter(
          (task) => task.status === "done",
        ).length;
        const overdue = projectTasks.filter(isOverdue).length;
        const openTasks = projectTasks.filter(
          (task) => task.status !== "done",
        ).length;
        const progress = projectTasks.length
          ? Math.round((completed / projectTasks.length) * 100)
          : 0;

        return (
          <article className="team-card" key={project._id}>
            <div className="team-card-layout">
              <div className="team-card-main">
                <div className="team-card-top">
                  <div className="team-card-title">
                    <span
                      className="team-dot"
                      style={{ background: project.color }}
                    />
                    <div>
                      <h3>{project.name}</h3>
                      <p>
                        {teamSize} members · {projectTasks.length} tasks
                      </p>
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label="Open team details"
                    onClick={() => setDetailProject(project)}
                  >
                    <MoreVertical size={17} />
                  </button>
                </div>

                <div className="team-progress">
                  <div>
                    <strong>{progress}%</strong>
                    <span>completion</span>
                  </div>
                  <div className="progress-track slim">
                    <div
                      style={{
                        width: `${progress}%`,
                        background: project.color,
                      }}
                    />
                  </div>
                </div>

                <div className="team-card-stats">
                  <span>{teamSize} members</span>
                  <span>{completed} completed</span>
                  <span>{openTasks} open</span>
                  <span>{overdue} overdue</span>
                </div>

                <div className="team-preview-row">
                  <div className="avatar-row tight">
                    {members.slice(0, 4).map((member) => (
                      <Avatar
                        key={member.user?._id || member.user}
                        user={member.user || member}
                        small
                      />
                    ))}
                  </div>
                  <small>{overdue} overdue</small>
                </div>
              </div>

              <aside className="team-recent-panel">
                <div className="section-head compact-head">
                  <div>
                    <p className="eyebrow">Recent tasks</p>
                    <h3>Latest work</h3>
                  </div>
                  <span className="pill">{recentTasks.length}</span>
                </div>

                {recentTasks.length ? (
                  <div className="team-task-list">
                    {recentTasks.map((task) => {
                      const assignees = (task.assignees || []).map(
                        (assignee) => assignee.name,
                      );
                      const assigneeText = assignees.length
                        ? assignees.slice(0, 2).join(", ")
                        : "Unassigned";
                      return (
                        <div className="team-task-item" key={task._id}>
                          <div className="team-task-top">
                            <strong>{task.title}</strong>
                            <span
                              className={`task-status-badge ${task.status}`}
                            >
                              {labelize(task.status)}
                            </span>
                          </div>
                          <small>{assigneeText}</small>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state compact-empty">
                    No recent tasks yet.
                  </div>
                )}
              </aside>
            </div>
          </article>
        );
      })}

      {detailProject && (
        <TeamDetailModal
          project={detailProject}
          tasks={tasks.filter(
            (task) =>
              task.project?._id === detailProject._id ||
              task.project === detailProject._id,
          )}
          currentUser={currentUser}
          onClose={() => setDetailProject(null)}
        />
      )}
    </section>
  );
}

function TeamDetailModal({ project, tasks, currentUser, onClose }) {
  const members = project.members || [];
  return (
    <Modal title={`${project.name} Team`} onClose={onClose}>
      <div className="project-detail-modal-content">
        <div
          className="team-detail-hero"
          style={{ borderColor: project.color }}
        >
          <div>
            <p className="eyebrow">Team overview</p>
            <h3>{project.name}</h3>
            <p>
              See the full project team and which tasks are assigned to each
              member.
            </p>
          </div>
          <div className="team-detail-hero-stats">
            <span>{members.length} members</span>
            <span>{tasks.length} tasks</span>
            <span>
              {tasks.filter((task) => task.status === "done").length} completed
            </span>
            <span>{tasks.filter(isOverdue).length} overdue</span>
          </div>
        </div>

        <div className="detail-metrics">
          <span>{members.length} members</span>
          <span>{tasks.length} tasks</span>
          <span>
            {tasks.filter((task) => task.status === "done").length} completed
          </span>
          <span>{tasks.filter(isOverdue).length} overdue</span>
        </div>

        <div className="section-head">
          <h3>Project Members</h3>
          <span className="pill">{members.length}</span>
        </div>

        <div className="team-member-list">
          {members.map((member) => {
            const memberUser = member.user || member;
            const memberId = memberUser._id || memberUser;
            const memberTasks = tasks.filter((task) =>
              (task.assignees || []).some(
                (assignee) => (assignee._id || assignee) === memberId,
              ),
            );
            const isMe = (currentUser?.id || currentUser?._id) === memberId;

            return (
              <div className="team-member-row" key={memberId}>
                <Avatar user={memberUser} small />
                <div>
                  <strong>{memberUser.name || "Member"}</strong>
                  <span>
                    {labelize(member.role)}
                    {isMe ? " · You" : ""}
                  </span>
                </div>
                <small>{memberTasks.length} tasks</small>
              </div>
            );
          })}
        </div>

        <div className="section-head">
          <h3>Assigned Tasks</h3>
          <span className="pill">{tasks.length}</span>
        </div>
        <TaskList tasks={tasks} compact currentUser={currentUser} />
      </div>
    </Modal>
  );
}

function TaskModal({
  projects,
  users,
  initialProjectId = "",
  onClose,
  onSaved,
}) {
  const firstProject =
    projects.find((project) => project._id === initialProjectId) || projects[0];
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    project: firstProject?._id || "",
    assignees: [],
  });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = (users || []).filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  function toggleAssignee(userId) {
    setForm((current) => ({
      ...current,
      assignees: current.assignees.includes(userId)
        ? current.assignees.filter((id) => id !== userId)
        : [...current.assignees, userId],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (form.assignees.length === 0) {
      alert("Please select at least one assignee");
      return;
    }
    await request("/tasks", {
      method: "POST",
      body: JSON.stringify({ ...form, dueDate: form.dueDate || null }),
    });
    onSaved();
    onClose();
  }

  return (
    <Modal title="Create Task" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Task title
          <input
            placeholder="Build login page"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>
        <label>
          Description
          <textarea
            placeholder="What needs to be done?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            Project
            <select
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              required
            >
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {PRIORITY.map((priority) => (
                <option key={priority} value={priority}>
                  {labelize(priority)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deadline
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </label>
        </div>

        <label>
          Assign to (search and select)
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: "12px" }}
          />
        </label>

        <div
          className="member-picker"
          style={{
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <label
                key={user._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.assignees.includes(user._id)}
                  onChange={() => toggleAssignee(user._id)}
                />
                <Avatar user={user} small />
                <span>{user.name}</span>
              </label>
            ))
          ) : (
            <p style={{ padding: "8px", color: "#999" }}>No members found</p>
          )}
        </div>

        {form.assignees.length > 0 && (
          <p style={{ fontSize: "0.875rem", color: "#666" }}>
            {form.assignees.length} member(s) selected
          </p>
        )}

        <button className="primary-btn">Create Task</button>
      </form>
    </Modal>
  );
}

function ProjectModal({ users, currentUser, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "active",
    priority: "medium",
    color: COLORS[0],
    members: [{ user: currentUser.id, role: "admin" }],
  });

  function toggleMember(id) {
    setForm((current) => ({
      ...current,
      members: current.members.some((member) => member.user === id)
        ? current.members.filter((member) => member.user !== id)
        : [...current.members, { user: id, role: "member" }],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    await request("/projects", { method: "POST", body: JSON.stringify(form) });
    onSaved();
    onClose();
  }

  return (
    <Modal title="Create Project" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <input
          placeholder="Project name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <textarea
          placeholder="Project description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="form-grid">
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {PROJECT_STATUS.map((status) => (
              <option key={status} value={status}>
                {labelize(status)}
              </option>
            ))}
          </select>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {PRIORITY.map((priority) => (
              <option key={priority} value={priority}>
                {labelize(priority)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-grid">
          <input
            type="date"
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <input
            type="date"
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <div className="swatches">
            {COLORS.map((color) => (
              <button
                type="button"
                key={color}
                className={form.color === color ? "selected" : ""}
                style={{ background: color }}
                onClick={() => setForm({ ...form, color })}
                aria-label={`Use ${color}`}
              />
            ))}
          </div>
        </div>
        <div className="member-picker">
          {users.map((user) => (
            <label key={user._id}>
              <input
                type="checkbox"
                checked={form.members.some(
                  (member) => member.user === user._id,
                )}
                disabled={user._id === currentUser.id}
                onChange={() => toggleMember(user._id)}
              />
              <Avatar user={user} small />
              {user.name}
            </label>
          ))}
        </div>
        <button className="primary-btn">Create Project</button>
      </form>
    </Modal>
  );
}

function ProjectDetailModal({
  project,
  tasks,
  canManage,
  currentUser,
  onClose,
  onCreateTask,
  onManageMembers,
  onRefresh,
}) {
  if (!project) return null;

  const currentUserId = currentUser?.id || currentUser?._id;
  const assignedTasks = tasks.filter((task) =>
    (task.assignees || []).some(
      (assignee) => (assignee._id || assignee) === currentUserId,
    ),
  );
  const visibleTasks = canManage ? tasks : assignedTasks;
  const done = visibleTasks.filter((task) => task.status === "done").length;
  const open = visibleTasks.filter((task) => task.status !== "done").length;
  const overdue = visibleTasks.filter(isOverdue).length;
  const progress = visibleTasks.length
    ? Math.round((done / visibleTasks.length) * 100)
    : 0;

  return (
    <Modal title={project.name} onClose={onClose}>
      <div className="project-detail-modal-content">
        <p className="modal-description">
          {project.description || "No description added."}
        </p>

        <div className="detail-metrics">
          <span>{visibleTasks.length} total tasks</span>
          <span>{open} open</span>
          <span>{done} done</span>
          <span>{overdue} overdue</span>
          <span>{progress}% complete</span>
          <span>
            {project.dueDate
              ? `Deadline ${format(parseISO(project.dueDate), "MMM d, yyyy")}`
              : "No project deadline"}
          </span>
        </div>

        <div className="detail-grid">
          <div>
            <div className="section-head">
              <h3>Members</h3>
              <span className="pill">{project.members.length}</span>
            </div>
            <div className="detail-members">
              {project.members.map((member) => (
                <div key={member.user?._id || member.user}>
                  <Avatar user={member.user || member} small />
                  <strong>{member.user?.name || "Member"}</strong>
                  <span>{labelize(member.role)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-head">
              <h3>{canManage ? "Task Status" : "Your Assigned Tasks"}</h3>
              <span className="pill">{visibleTasks.length}</span>
            </div>
            {canManage ? (
              <div className="status-summary">
                {STATUS.map((status) => (
                  <div key={status}>
                    <strong>
                      {
                        visibleTasks.filter((task) => task.status === status)
                          .length
                      }
                    </strong>
                    <span>{labelize(status)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="status-summary member-task-summary">
                  <div>
                    <strong>
                      {
                        visibleTasks.filter((task) => task.status === "todo")
                          .length
                      }
                    </strong>
                    <span>Todo</span>
                  </div>
                  <div>
                    <strong>
                      {
                        visibleTasks.filter(
                          (task) => task.status === "in-progress",
                        ).length
                      }
                    </strong>
                    <span>In Progress</span>
                  </div>
                  <div>
                    <strong>
                      {
                        visibleTasks.filter((task) => task.status === "done")
                          .length
                      }
                    </strong>
                    <span>Completed</span>
                  </div>
                  <div>
                    <strong>{progress}%</strong>
                    <span>Progress</span>
                  </div>
                </div>
                <TaskList
                  tasks={visibleTasks}
                  compact
                  currentUser={currentUser}
                  onRefresh={onRefresh}
                />
              </>
            )}
          </div>
        </div>

        <div className="modal-actions">
          {canManage && (
            <>
              <button className="primary-btn" onClick={onCreateTask}>
                <Plus size={17} />
                Add Task
              </button>
              {/* "Manage Members" removed per request */}
            </>
          )}
          <button className="link-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ProjectMembersModal({
  project,
  users,
  currentUser,
  onClose,
  onSaved,
}) {
  if (!project) return null;

  const initialMembers = (project.members || [])
    .map((member) => member.user?._id || member.user)
    .filter((id) => id);

  const [members, setMembers] = useState(initialMembers);
  const [loading, setLoading] = useState(false);

  function toggleMember(userId) {
    if (!userId) return;
    const currentUserId = currentUser?.id || currentUser?._id;
    if (userId === currentUserId) return;
    setMembers((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const validMembers = members.filter((id) => id && typeof id === "string");
      const initialSet = new Set(initialMembers);
      const currentSet = new Set(validMembers);
      const addedIds = validMembers.filter((id) => !initialSet.has(id));
      const removedIds = initialMembers.filter((id) => !currentSet.has(id));

      if (validMembers.length === 0) {
        alert("Project must have at least one member");
        setLoading(false);
        return;
      }

      await request(`/projects/${project._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          members: validMembers.map((id) => ({ user: id, role: "member" })),
        }),
      });

      const resolveNames = (ids) =>
        ids
          .map(
            (id) =>
              validUsers.find((user) => (user._id || user.id) === id)?.name,
          )
          .filter(Boolean);
      const addedNames = resolveNames(addedIds);
      const removedNames = resolveNames(removedIds);
      const parts = [];
      if (addedNames.length)
        parts.push(`${addedNames.join(", ")} added successfully`);
      if (removedNames.length)
        parts.push(`${removedNames.join(", ")} removed successfully`);
      alert(parts.length ? parts.join(" | ") : "Members updated successfully");
      onSaved();
    } catch (error) {
      console.error("Save error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const validUsers = (users || []).filter((user) => user._id || user.id);
  const currentUserId = currentUser?.id || currentUser?._id;

  return (
    <Modal title="Add / Remove Members" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        {validUsers.length === 0 ? (
          <p style={{ color: "red" }}>No users available</p>
        ) : (
          <div className="member-picker">
            {validUsers.map((user) => {
              const userId = user._id || user.id;
              const isSelf = userId === currentUserId;
              return (
                <label key={userId} style={{ opacity: isSelf ? 0.6 : 1 }}>
                  <input
                    type="checkbox"
                    checked={members.includes(userId)}
                    disabled={isSelf}
                    onChange={() => toggleMember(userId)}
                  />
                  <Avatar user={user} small />
                  <span>{user.name}</span>
                  {isSelf && <span> (You)</span>}
                </label>
              );
            })}
          </div>
        )}
        <button
          className="primary-btn"
          disabled={loading || validUsers.length === 0}
          type="submit"
        >
          {loading ? "Updating..." : "Add Member"}
        </button>
      </form>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Avatar({ user, small = false }) {
  return (
    <div
      className={small ? "avatar small" : "avatar"}
      style={{ background: user?.avatarColor || "#475569" }}
    >
      {initials(user?.name)}
    </div>
  );
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function labelize(value = "") {
  return value
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

createRoot(document.getElementById("root")).render(<App />);
