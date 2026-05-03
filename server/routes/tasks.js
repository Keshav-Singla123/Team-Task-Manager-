import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../utils/activity.js";
import { canManageProject, canViewProject, getProjectMembership, isObjectId } from "../utils/permissions.js";
import { created, fail, ok } from "../utils/respond.js";

const router = express.Router();

const statusValues = ["todo", "in-progress", "in-review", "blocked", "done"];
const priorityValues = ["low", "medium", "high", "critical"];

const taskSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional().default(""),
  status: z.enum(statusValues).optional().default("todo"),
  priority: z.enum(priorityValues).optional().default("medium"),
  dueDate: z.coerce.date().optional().nullable(),
  assignees: z.array(z.string().refine(isObjectId)).optional().default([]),
  estimatedHours: z.coerce.number().min(0).optional().default(0),
  tags: z.array(z.string().max(24)).optional().default([]),
  subtasks: z
    .array(
      z.object({
        title: z.string().min(1),
        completed: z.boolean().optional().default(false),
        assignee: z.string().refine(isObjectId).optional(),
        dueDate: z.coerce.date().optional()
      })
    )
    .optional()
    .default([]),
  dependencies: z.array(z.string().refine(isObjectId)).optional().default([]),
  order: z.coerce.number().optional().default(0)
});

const updateTaskSchema = taskSchema.partial();
const commentSchema = z.object({ body: z.string().min(1).max(2000) });
const timeLogSchema = z.object({
  durationMinutes: z.coerce.number().min(1).max(24 * 60),
  note: z.string().max(500).optional().default(""),
  date: z.coerce.date().optional()
});

function canCreateTask(user, project) {
  return getProjectMembership(project, user._id)?.role === "admin";
}

function canEditTask(user, project, task) {
  if (canManageProject(user, project)) return true;
  return task.assignees.some((assignee) => assignee.toString() === user._id.toString());
}

async function populateTask(query) {
  return query
    .populate("project", "name color status priority")
    .populate("assignees", "name email role avatarColor isActive")
    .populate("reporter", "name email role avatarColor")
    .populate("watchers", "name email role avatarColor")
    .populate("comments.author", "name avatarColor");
}

async function updateProjectProgress(projectId) {
  const [total, done] = await Promise.all([
    Task.countDocuments({ project: projectId }),
    Task.countDocuments({ project: projectId, status: "done" })
  ]);
  const progress = total ? Math.round((done / total) * 100) : 0;
  await Project.findByIdAndUpdate(projectId, { progress });
}

async function resolveActiveAssignees(assignees = []) {
  const uniqueAssignees = [...new Set(assignees.map(String))];
  if (!uniqueAssignees.length) return [];

  const activeUsers = await User.find({ _id: { $in: uniqueAssignees }, isActive: true }).select("_id");
  if (activeUsers.length !== uniqueAssignees.length) {
    return null;
  }

  return uniqueAssignees;
}

async function resolveProjectAssignees(project, assignees = []) {
  const activeAssignees = await resolveActiveAssignees(assignees);
  if (!activeAssignees) return { error: "One or more assignees do not exist or are inactive" };

  const memberIds = new Set((project.members || []).map((member) => member.user.toString()));
  const outsideProject = activeAssignees.filter((id) => !memberIds.has(id));
  if (outsideProject.length) return { error: "Assignees must be project members" };

  return { assignees: activeAssignees };
}

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const projectIds = await Project.find({ "members.user": req.user._id }).distinct("_id");
    const query = { project: { $in: projectIds } };

    if (req.query.assignee === "me") query.assignees = req.user._id;
    else if (req.query.assignee && isObjectId(req.query.assignee)) query.assignees = req.query.assignee;
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.project && isObjectId(req.query.project)) query.project = req.query.project;
    if (req.query.overdue === "true") query.dueDate = { $lt: new Date() }, (query.status = { $ne: "done" });
    if (req.query.search) query.$text = { $search: req.query.search };

    const [tasks, total] = await Promise.all([
      populateTask(Task.find(query).sort({ dueDate: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit)),
      Task.countDocuments(query)
    ]);

    return ok(res, { tasks }, { page, limit, total });
  })
);

router.get(
  "/projects/:projectId/tasks",
  protect,
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.projectId);
    if (!project || !canViewProject(req.user, project)) return fail(res, 404, "Project not found");
    const tasks = await populateTask(Task.find({ project: project._id }).sort({ order: 1, createdAt: -1 }));
    return ok(res, { tasks });
  })
);

router.post(
  "/projects/:projectId/tasks",
  protect,
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.projectId);
    if (!project || !canViewProject(req.user, project)) return fail(res, 404, "Project not found");
    if (!canCreateTask(req.user, project)) return fail(res, 403, "You cannot create tasks in this project");
    const data = taskSchema.parse(req.body);
    const { assignees, error } = await resolveProjectAssignees(project, data.assignees);
    if (error) return fail(res, 400, error);

    const task = await Task.create({
      ...data,
      dueDate: data.dueDate || undefined,
      project: project._id,
      reporter: req.user._id,
      watchers: [...new Set([...assignees, req.user._id.toString()])]
    });

    await Promise.all([
      updateProjectProgress(project._id),
      logActivity({ user: req.user._id, action: "created task", entity: "task", entityId: task._id, project: project._id }),
      ...assignees
        .filter((id) => id !== req.user._id.toString())
        .map((id) =>
          Notification.create({
            recipient: id,
            actor: req.user._id,
            type: "task_assigned",
            message: `You were assigned to ${task.title}`,
            project: project._id,
            task: task._id
          })
        )
    ]);

    return created(res, { task: await populateTask(Task.findById(task._id)) });
  })
);

router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const projectId = req.body.project;
    if (!projectId) return fail(res, 400, "Project is required");
    req.params.projectId = projectId;
    const project = await Project.findById(projectId);
    if (!project || !canViewProject(req.user, project)) return fail(res, 404, "Project not found");
    if (!canCreateTask(req.user, project)) return fail(res, 403, "You cannot create tasks in this project");
    const data = taskSchema.parse(req.body);
    const { assignees, error } = await resolveProjectAssignees(project, data.assignees);
    if (error) return fail(res, 400, error);
    const task = await Task.create({ ...data, project: project._id, reporter: req.user._id, assignees, watchers: [...new Set([...assignees, req.user._id.toString()])] });
    await Promise.all([
      updateProjectProgress(project._id),
      logActivity({ user: req.user._id, action: "created task", entity: "task", entityId: task._id, project: project._id }),
      ...assignees
        .filter((id) => id !== req.user._id.toString())
        .map((id) =>
          Notification.create({
            recipient: id,
            actor: req.user._id,
            type: "task_assigned",
            message: `You were assigned to ${task.title}`,
            project: project._id,
            task: task._id
          })
        )
    ]);
    return created(res, { task: await populateTask(Task.findById(task._id)) });
  })
);

router.patch(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) return fail(res, 400, "Invalid task id");
    const existing = await Task.findById(req.params.id);
    if (!existing) return fail(res, 404, "Task not found");
    const project = await Project.findById(existing.project);
    if (!project || !canViewProject(req.user, project)) return fail(res, 404, "Task not found");
    if (!canEditTask(req.user, project, existing)) return fail(res, 403, "You cannot edit this task");

    const data = updateTaskSchema.parse(req.body);

    const canManage = canManageProject(req.user, project);

    // Project members may only change their own task status and only through the allowed transitions.
    if (!canManage) {
      const isAssignee = (existing.assignees || []).some((a) => a.toString() === req.user._id.toString());
      if (!isAssignee) return fail(res, 403, "You cannot edit this task");

      const allowedKeys = new Set(["status"]);
      if (Object.keys(data).length > 0 && !Object.keys(data).every((k) => allowedKeys.has(k))) {
        return fail(res, 403, "Members may only update their own task status");
      }

      // Validate status transition: todo -> in-progress -> done
      if (data.status && data.status !== existing.status) {
        const transitions = {
          todo: ["in-progress"],
          "in-progress": ["done"]
        };
        const allowed = transitions[existing.status] || [];
        if (!allowed.includes(data.status)) return fail(res, 400, "Invalid status transition");
      }
    }

    // If assignees are being changed, ensure they are project members and only allowed for project managers.
    if (data.assignees) {
      if (!canManage) return fail(res, 403, "Members cannot reassign tasks");
      const { assignees, error } = await resolveProjectAssignees(project, data.assignees);
      if (error) return fail(res, 400, error);
      data.assignees = assignees;
    }

    const changes = Object.entries(data).map(([field, newValue]) => ({ field, oldValue: existing[field], newValue }));
    const task = await Task.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (data.status) {
      await Notification.insertMany(
        [...new Set([...task.assignees.map(String), ...task.watchers.map(String)])]
          .filter((id) => id !== req.user._id.toString())
          .map((id) => ({
            recipient: id,
            actor: req.user._id,
            type: "status_changed",
            message: `${task.title} moved to ${data.status}`,
            project: project._id,
            task: task._id
          }))
      );
    }
    await updateProjectProgress(project._id);
    await logActivity({ user: req.user._id, action: "updated task", entity: "task", entityId: task._id, project: project._id, changes });
    return ok(res, { task: await populateTask(Task.findById(task._id)) });
  })
);

router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) return fail(res, 404, "Task not found");
    const project = await Project.findById(task.project);
    if (!project || !canManageProject(req.user, project)) return fail(res, 403, "Only project admins can delete tasks");
    await task.deleteOne();
    await updateProjectProgress(project._id);
    await logActivity({ user: req.user._id, action: "deleted task", entity: "task", entityId: task._id, project: project._id });
    return ok(res, { message: "Task deleted" });
  })
);

router.post(
  "/:id/comments",
  protect,
  asyncHandler(async (req, res) => {
    const data = commentSchema.parse(req.body);
    const task = await Task.findById(req.params.id);
    if (!task) return fail(res, 404, "Task not found");
    const project = await Project.findById(task.project);
    if (!project || !canViewProject(req.user, project)) return fail(res, 403, "You cannot comment on this task");

    task.comments.push({ body: data.body, author: req.user._id });
    if (!task.watchers.some((id) => id.toString() === req.user._id.toString())) task.watchers.push(req.user._id);
    await task.save();
    await logActivity({ user: req.user._id, action: "commented on task", entity: "comment", entityId: task._id, project: project._id });
    return created(res, { task: await populateTask(Task.findById(task._id)) });
  })
);

router.post(
  "/:id/time-logs",
  protect,
  asyncHandler(async (req, res) => {
    const data = timeLogSchema.parse(req.body);
    const task = await Task.findById(req.params.id);
    if (!task) return fail(res, 404, "Task not found");
    const project = await Project.findById(task.project);
    if (!project || !canViewProject(req.user, project)) return fail(res, 403, "You cannot log time on this task");

    task.timeLogs.push({ ...data, author: req.user._id });
    task.loggedHours = Math.round((task.timeLogs.reduce((sum, log) => sum + log.durationMinutes, 0) / 60) * 100) / 100;
    await task.save();
    await logActivity({ user: req.user._id, action: "logged time", entity: "task", entityId: task._id, project: project._id });
    return created(res, { task: await populateTask(Task.findById(task._id)) });
  })
);

export default router;
