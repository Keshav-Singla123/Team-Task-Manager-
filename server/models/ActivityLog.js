import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entity: { type: String, enum: ["project", "task", "comment", "member", "user"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
      }
    ],
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

activityLogSchema.index({ project: 1, createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
