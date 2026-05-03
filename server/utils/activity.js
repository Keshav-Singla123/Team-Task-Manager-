import { ActivityLog } from "../models/ActivityLog.js";

export function logActivity({ user, action, entity, entityId, project, changes = [], metadata = {} }) {
  return ActivityLog.create({ user, action, entity, entityId, project, changes, metadata });
}
