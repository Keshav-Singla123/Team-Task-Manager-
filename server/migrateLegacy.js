import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { Project } from "./models/Project.js";
import { Task } from "./models/Task.js";

dotenv.config();

const projectStatusMap = {
  Planning: "active",
  Active: "active",
  Completed: "completed",
  "On Hold": "on-hold"
};

const taskStatusMap = {
  Todo: "todo",
  "In Progress": "in-progress",
  Review: "in-review",
  Done: "done"
};

const priorityMap = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Urgent: "critical"
};

function normalizeProjectMembers(doc) {
  const rawMembers = Array.isArray(doc.members) ? doc.members : [];
  const owner = doc.createdBy || doc.owner || rawMembers[0];

  return rawMembers
    .filter(Boolean)
    .map((member) => {
      if (member.user) {
        return {
          user: member.user,
          role: member.role || (owner && member.user.toString() === owner.toString() ? "admin" : "member"),
          joinedAt: member.joinedAt || new Date()
        };
      }

      return {
        user: member,
        role: owner && member.toString() === owner.toString() ? "admin" : "member",
        joinedAt: new Date()
      };
    });
}

async function migrateProjects() {
  const docs = await Project.collection.find({}).toArray();
  let changed = 0;

  for (const doc of docs) {
    const members = normalizeProjectMembers(doc);
    const createdBy = doc.createdBy || doc.owner || members[0]?.user;
    const status = projectStatusMap[doc.status] || doc.status || "active";
    const update = {
      status,
      priority: priorityMap[doc.priority] || doc.priority || "medium",
      isArchived: doc.isArchived ?? status === "archived",
      members,
      progress: doc.progress ?? 0
    };

    if (createdBy) update.createdBy = createdBy;
    if (!doc.tags) update.tags = [];
    if (!doc.color) update.color = "#0f766e";

    await Project.collection.updateOne({ _id: doc._id }, { $set: update, $unset: { owner: "" } });
    changed += 1;
  }

  return changed;
}

async function migrateTasks() {
  const docs = await Task.collection.find({}).toArray();
  let changed = 0;

  for (const doc of docs) {
    const assignees = Array.isArray(doc.assignees) && doc.assignees.length ? doc.assignees : doc.assignedTo ? [doc.assignedTo] : [];
    const reporter = doc.reporter || doc.createdBy || assignees[0];
    const watchers = Array.from(new Set([...assignees.map(String), ...(reporter ? [reporter.toString()] : [])])).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const update = {
      status: taskStatusMap[doc.status] || doc.status || "todo",
      priority: priorityMap[doc.priority] || doc.priority || "medium",
      assignees,
      watchers,
      estimatedHours: doc.estimatedHours ?? 0,
      loggedHours: doc.loggedHours ?? 0,
      tags: doc.tags || [],
      attachments: doc.attachments || [],
      comments: doc.comments || [],
      subtasks: doc.subtasks || [],
      dependencies: doc.dependencies || [],
      customFields: doc.customFields || [],
      order: doc.order ?? 0
    };

    if (reporter) update.reporter = reporter;

    await Task.collection.updateOne({ _id: doc._id }, { $set: update, $unset: { assignedTo: "", createdBy: "" } });
    changed += 1;
  }

  return changed;
}

async function migrate() {
  await connectDB();
  const projects = await migrateProjects();
  const tasks = await migrateTasks();
  console.log(`Migration complete. Projects checked: ${projects}. Tasks checked: ${tasks}.`);
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
