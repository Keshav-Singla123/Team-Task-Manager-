import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 90
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    status: {
      type: String,
      enum: ["active", "on-hold", "completed", "archived"],
      default: "active"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    startDate: Date,
    dueDate: Date,
    tags: [{ type: String, trim: true }],
    isArchived: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    color: {
      type: String,
      default: "#0f766e"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member"
        },
        joinedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

projectSchema.index({ createdBy: 1, name: 1 });
projectSchema.index({ "members.user": 1 });

export const Project = mongoose.model("Project", projectSchema);
