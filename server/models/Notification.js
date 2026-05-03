import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["task_assigned", "task_due", "task_overdue", "comment", "mention", "status_changed", "project_added", "deadline_changed"],
      required: true
    },
    message: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    readAt: Date
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
