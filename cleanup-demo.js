import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./server/config/db.js";
import { User } from "./server/models/User.js";
import { Project } from "./server/models/Project.js";
import { Task } from "./server/models/Task.js";
import { ActivityLog } from "./server/models/ActivityLog.js";
import { Notification } from "./server/models/Notification.js";

dotenv.config();

const DEMO_EMAILS = [
  "admin@taskflow.dev",
  "mira@taskflow.dev",
  "kabir@taskflow.dev",
  "naina@taskflow.dev"
];

async function cleanup() {
  try {
    await connectDB();
    console.log("Connected to database. Removing demo data...");

    // Delete demo users
    const result = await User.deleteMany({ email: { $in: DEMO_EMAILS } });
    console.log(`Deleted ${result.deletedCount} demo users.`);

    // Clean up orphaned projects and tasks
    const projectResult = await Project.deleteMany({ createdBy: { $exists: false } });
    console.log(`Deleted ${projectResult.deletedCount} orphaned projects.`);

    const taskResult = await Task.deleteMany({ project: { $exists: false } });
    console.log(`Deleted ${taskResult.deletedCount} orphaned tasks.`);

    // Clean up activity logs and notifications from demo users
    const activityResult = await ActivityLog.deleteMany({ user: { $exists: false } });
    console.log(`Deleted ${activityResult.deletedCount} orphaned activity logs.`);

    const notifResult = await Notification.deleteMany({ recipient: { $exists: false } });
    console.log(`Deleted ${notifResult.deletedCount} orphaned notifications.`);

    console.log("✓ Cleanup complete. Only your real signups remain.");
    await mongoose.disconnect();
  } catch (error) {
    console.error("Cleanup failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanup();
