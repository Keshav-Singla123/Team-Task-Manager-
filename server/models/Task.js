import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 800,
      default: ""
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "in-review", "blocked", "done"],
      default: "todo"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    dueDate: {
      type: Date
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    estimatedHours: { type: Number, default: 0, min: 0 },
    loggedHours: { type: Number, default: 0, min: 0 },
    tags: [{ type: String, trim: true }],
    attachments: [
      {
        filename: String,
        url: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
        size: Number,
        mimeType: String
      }
    ],
    comments: [
      {
        body: { type: String, required: true, maxlength: 2000 },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
        editedAt: Date,
        isEdited: { type: Boolean, default: false }
      }
    ],
    subtasks: [
      {
        title: { type: String, required: true },
        completed: { type: Boolean, default: false },
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        dueDate: Date
      }
    ],
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    customFields: [{ key: String, value: String }],
    order: { type: Number, default: 0 },
    timeLogs: [
      {
        durationMinutes: { type: Number, required: true },
        note: String,
        date: { type: Date, default: Date.now },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
      }
    ]
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignees: 1, dueDate: 1 });
taskSchema.index({ title: "text", description: "text", tags: "text" });

export const Task = mongoose.model("Task", taskSchema);
