import express from "express";
import { startOfWeek } from "date-fns";
import { protect } from "../middleware/auth.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/respond.js";

const router = express.Router();

function projectFilter(user) {
  return { "members.user": user._id };
}

function visibleProjectFilter(user) {
  return {
    ...projectFilter(user),
    $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
    status: { $ne: "archived" }
  };
}

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const projectIds = await Project.find(visibleProjectFilter(req.user)).distinct("_id");
    const myTaskFilter = { assignees: req.user._id, project: { $in: projectIds } };

    const [
      myOpenTasks,
      dueToday,
      overdueTasks,
      completedThisWeek,
      projectCount,
      myTasks,
      activeProjects,
      activity,
      statusCounts,
      workload,
      recentSignups,
      totalUsers,
      totalProjects,
      tasksCreatedThisWeek
    ] = await Promise.all([
      Task.countDocuments({ ...myTaskFilter, status: { $ne: "done" } }),
      Task.countDocuments({
        ...myTaskFilter,
        status: { $ne: "done" },
        dueDate: { $gte: new Date(now.toDateString()), $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
      }),
      Task.countDocuments({ ...myTaskFilter, status: { $ne: "done" }, dueDate: { $lt: now } }),
      Task.countDocuments({ ...myTaskFilter, status: "done", updatedAt: { $gte: weekStart } }),
      Project.countDocuments(visibleProjectFilter(req.user)),
      Task.find({ ...myTaskFilter, status: { $ne: "done" } })
        .populate("project", "name color")
        .populate("assignees", "name avatarColor")
        .sort({ dueDate: 1 })
        .limit(8),
      Project.find({ _id: { $in: projectIds } }).populate("members.user", "name avatarColor").limit(8),
      ActivityLog.find({ project: { $in: projectIds } }).populate("user", "name avatarColor").sort({ createdAt: -1 }).limit(20),
      Task.aggregate([{ $match: { project: { $in: projectIds } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Task.aggregate([
        { $match: { project: { $in: projectIds }, status: { $ne: "done" } } },
        { $unwind: "$assignees" },
        { $group: { _id: "$assignees", count: { $sum: 1 } } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { count: 1, name: "$user.name" } }
      ]),
      User.find({ isActive: true }).select("name email role avatarColor createdAt").sort({ createdAt: -1 }).limit(6),
      User.countDocuments({ isActive: true }),
      Project.countDocuments(visibleProjectFilter(req.user)),
      Task.countDocuments({ project: { $in: projectIds }, createdAt: { $gte: weekStart } })
    ]);

    const projects = await Promise.all(
      activeProjects.map(async (project) => {
        const breakdown = await Task.aggregate([
          { $match: { project: project._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        return { ...project.toObject(), breakdown };
      })
    );

    return ok(res, {
      stats: { myOpenTasks, dueToday, overdueTasks, completedThisWeek, projectCount, totalUsers, totalProjects, tasksCreatedThisWeek },
      myTasks,
      overdue: myTasks.filter((task) => task.dueDate && task.dueDate < now),
      upcoming: myTasks.filter((task) => task.dueDate && task.dueDate >= now),
      projects,
      activity,
      statusCounts,
      workload,
      recentSignups
    });
  })
);

export default router;
