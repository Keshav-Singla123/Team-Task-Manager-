import express from "express";
import { protect } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/respond.js";

const router = express.Router();

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { recipient: req.user._id };
    if (req.query.filter === "unread") filter.readAt = undefined;
    const notifications = await Notification.find(filter)
      .populate("actor", "name avatarColor")
      .populate("project", "name color")
      .populate("task", "title status")
      .sort({ createdAt: -1 })
      .limit(50);
    const unread = await Notification.countDocuments({ recipient: req.user._id, readAt: undefined });
    ok(res, { notifications, unread });
  })
);

router.patch(
  "/read-all",
  protect,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, readAt: undefined }, { readAt: new Date() });
    ok(res, { message: "Notifications marked as read" });
  })
);

export default router;
