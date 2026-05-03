import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../utils/activity.js";
import { canManageProject, canViewProject, isObjectId, loadManageableProject } from "../utils/permissions.js";
import { created, fail, ok } from "../utils/respond.js";

const router = express.Router();

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const projectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional().default(""),
  status: z.enum(["active", "on-hold", "completed", "archived"]).optional().default("active"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional().default("#0f766e"),
  tags: z.array(z.string().max(24)).optional().default([]),
  members: z
    .array(
      z.object({
        user: z.string().refine(isObjectId),
        role: z.enum(["admin", "member"]).default("member")
      })
    )
    .optional()
    .default([])
});

const updateSchema = projectSchema.partial();

function projectFilter(user) {
  return { "members.user": user._id };
}

function visibleProjectFilter(user, includeArchived = false) {
  const query = projectFilter(user);
  if (!includeArchived) {
    query.isArchived = { $ne: true };
    query.status = { $ne: "archived" };
  }
  return query;
}

async function decorateProjects(projects) {
  const counts = await Task.aggregate([
    { $match: { project: { $in: projects.map((project) => project._id) } } },
    { $group: { _id: { project: "$project", status: "$status" }, count: { $sum: 1 } } }
  ]);

  const map = counts.reduce((acc, row) => {
    const key = row._id.project.toString();
    acc[key] ??= { total: 0, done: 0, todo: 0, inProgress: 0 };
    acc[key].total += row.count;
    if (row._id.status === "done") acc[key].done += row.count;
    if (row._id.status === "todo") acc[key].todo += row.count;
    if (row._id.status === "in-progress") acc[key].inProgress += row.count;
    return acc;
  }, {});

  return projects.map((project) => {
    const summary = map[project._id.toString()] || { total: 0, done: 0, todo: 0, inProgress: 0 };
    return { ...project.toObject(), taskSummary: summary, progress: summary.total ? Math.round((summary.done / summary.total) * 100) : project.progress };
  });
}

function roleFor(project, userId) {
  return project.members.find((member) => member.user?._id?.toString?.() === userId.toString() || member.user.toString() === userId.toString())?.role || "member";
}

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const allowedSortFields = new Set(["createdAt", "updatedAt", "dueDate", "name", "progress"]);
    const sort = allowedSortFields.has(req.query.sort) ? req.query.sort : "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;
    const query = visibleProjectFilter(req.user, req.query.archived === "true");

    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search) query.name = { $regex: escapeRegExp(search), $options: "i" };

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("createdBy", "name email role avatarColor")
        .populate("members.user", "name email role avatarColor isActive")
        .sort({ [sort]: order })
        .skip((page - 1) * limit)
        .limit(limit),
      Project.countDocuments(query)
    ]);

    const decorated = await decorateProjects(projects);
    return ok(
      res,
      {
        projects: decorated,
        adminProjects: decorated.filter((project) => roleFor(project, req.user._id) === "admin"),
        memberProjects: decorated.filter((project) => roleFor(project, req.user._id) !== "admin")
      },
      { page, limit, total }
    );
  })
);

router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const data = projectSchema.parse(req.body);
    const requestedIds = [...new Set(data.members.map((member) => member.user).filter((id) => id !== req.user._id.toString()))];
    const existingUsers = await User.find({ _id: { $in: requestedIds }, isActive: true }).select("_id");
    if (existingUsers.length !== requestedIds.length) return fail(res, 400, "One or more members do not exist");

    const members = [
      { user: req.user._id, role: "admin", joinedAt: new Date() },
      ...requestedIds.map((id) => ({ user: id, role: "member", joinedAt: new Date() }))
    ];

    const project = await Project.create({
      ...data,
      createdBy: req.user._id,
      members,
      isArchived: data.status === "archived"
    });

    await Promise.all([
      logActivity({ user: req.user._id, action: "created project", entity: "project", entityId: project._id, project: project._id }),
      ...members
        .filter((member) => member.user.toString() !== req.user._id.toString())
        .map((member) =>
          Notification.create({
            recipient: member.user,
            actor: req.user._id,
            type: "project_added",
            message: `You were added to ${project.name}`,
            project: project._id
          })
        )
    ]);

    const populated = await Project.findById(project._id)
      .populate("createdBy", "name email role avatarColor")
      .populate("members.user", "name email role avatarColor isActive");

    return created(res, { project: populated });
  })
);

router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) return fail(res, 400, "Invalid project id");
    const project = await Project.findById(req.params.id)
      .populate("createdBy", "name email role avatarColor")
      .populate("members.user", "name email role avatarColor isActive");
    if (!project || !canViewProject(req.user, project)) return fail(res, 404, "Project not found");

    const [decorated] = await decorateProjects([project]);
    return ok(res, { project: decorated, canManage: canManageProject(req.user, project) });
  })
);

router.patch(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const existing = await loadManageableProject(req.params.id, req.user);
    if (!existing) return fail(res, 403, "You cannot manage this project");
    const data = updateSchema.parse(req.body);

    if (data.members) {
      const ids = [...new Set(data.members.map((member) => member.user))];
      if (!ids.includes(req.user._id.toString())) return fail(res, 400, "Admin must remain a project member");
      const count = await User.countDocuments({ _id: { $in: ids }, isActive: true });
      if (count !== ids.length) return fail(res, 400, "One or more members do not exist");
      data.members = ids.map((id) => ({
        user: id,
        role: id === req.user._id.toString() ? "admin" : data.members.find((member) => member.user === id)?.role || "member",
        joinedAt: existing.members.find((member) => member.user.toString() === id)?.joinedAt || new Date()
      }));
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { ...data, isArchived: data.status === "archived" ? true : data.status ? false : existing.isArchived },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email role avatarColor")
      .populate("members.user", "name email role avatarColor isActive");

    await logActivity({ user: req.user._id, action: "updated project", entity: "project", entityId: project._id, project: project._id });
    return ok(res, { project });
  })
);

router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) return fail(res, 400, "Invalid project id");
    const project = await Project.findById(req.params.id);
    if (!project) return fail(res, 404, "Project not found");
    if (!canManageProject(req.user, project)) return fail(res, 403, "Only project Admins can delete this project");

    await Promise.all([
      Task.deleteMany({ project: project._id }),
      ActivityLog.deleteMany({ project: project._id }),
      project.deleteOne()
    ]);

    return ok(res, { message: "Project and related tasks deleted" });
  })
);

router.get(
  "/:id/activity",
  protect,
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project || !canViewProject(req.user, project)) return fail(res, 404, "Project not found");
    const activity = await ActivityLog.find({ project: project._id }).populate("user", "name avatarColor").sort({ createdAt: -1 }).limit(50);
    return ok(res, { activity });
  })
);

export default router;
