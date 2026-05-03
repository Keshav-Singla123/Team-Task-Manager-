import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/respond.js";

const router = express.Router();

const profileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  timezone: z.string().max(80).optional(),
  bio: z.string().max(240).optional(),
  notificationPrefs: z
    .object({
      taskAssigned: z.boolean().optional(),
      comments: z.boolean().optional(),
      mentions: z.boolean().optional(),
      deadlineChanges: z.boolean().optional(),
      statusChanges: z.boolean().optional()
    })
    .optional()
});

function sanitizeProfile(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarColor: user.avatarColor,
    isEmailVerified: user.isEmailVerified,
    timezone: user.timezone,
    bio: user.bio,
    notificationPrefs: user.notificationPrefs
  };
}

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => ok(res, { user: sanitizeProfile(req.user) }))
);

router.patch(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const data = profileSchema.parse(req.body);
    const update = { ...data };
    if (data.notificationPrefs) {
      update.notificationPrefs = {
        ...(req.user.notificationPrefs || {}),
        ...data.notificationPrefs
      };
    }
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
    ok(res, { user: sanitizeProfile(user) });
  })
);

export default router;
