import mongoose from "mongoose";
import { Project } from "../models/Project.js";

export function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

export function getProjectMembership(project, userId) {
  return project.members.find((member) => member.user.toString() === userId.toString());
}

export function isProjectMember(project, userId) {
  return Boolean(getProjectMembership(project, userId));
}

export function canViewProject(user, project) {
  return isProjectMember(project, user._id);
}

export function canManageProject(user, project) {
  return getProjectMembership(project, user._id)?.role === "admin";
}

export async function loadViewableProject(projectId, user) {
  if (!isObjectId(projectId)) return null;
  const project = await Project.findById(projectId);
  if (!project || !canViewProject(user, project)) return null;
  return project;
}

export async function loadManageableProject(projectId, user) {
  if (!isObjectId(projectId)) return null;
  const project = await Project.findById(projectId);
  if (!project || !canManageProject(user, project)) return null;
  return project;
}
