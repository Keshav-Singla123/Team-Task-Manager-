import express from "express";
import { adminOnly, protect } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fail, ok } from "../utils/respond.js";

const router = express.Router();

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const query = { isActive: true };
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search) {
      const pattern = new RegExp(escapeRegExp(search), "i");
      query.$or = [
        { name: pattern },
        { email: pattern }
      ];
    }
    const users = await User.find(query).select("name email role avatarColor isActive lastActiveAt createdAt bio timezone").sort({ name: 1 });
    ok(res, { users });
  })
);

router.patch(
  "/:id/role",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    if (!["Admin", "Member"].includes(req.body.role)) return fail(res, 400, "Invalid role");

    const user = await User.findById(req.params.id).select("role isActive");
    if (!user) return fail(res, 404, "User not found");

    const activeAdminCount = await User.countDocuments({ role: "Admin", isActive: true });
    if (user.role === "Admin" && req.body.role !== "Admin" && activeAdminCount <= 1) {
      return fail(res, 400, "At least one active admin must remain");
    }

    user.role = req.body.role;
    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    ok(res, { user: updatedUser });
  })
);

router.patch(
  "/:id/deactivate",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("role isActive tokenVersion");
    if (!user) return fail(res, 404, "User not found");

    const activeAdminCount = await User.countDocuments({ role: "Admin", isActive: true });
    if (user.role === "Admin" && activeAdminCount <= 1) {
      return fail(res, 400, "At least one active admin must remain");
    }

    user.isActive = false;
    user.tokenVersion += 1;
    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    ok(res, { user: updatedUser });
  })
);

export default router;
