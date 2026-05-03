import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = req.cookies?.accessToken || bearer;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required", errors: [] });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");

  if (!user || !user.isActive || user.tokenVersion !== decoded.tv) {
    return res.status(401).json({ success: false, message: "Invalid session", errors: [] });
  }

  req.user = user;
  next();
});

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Admin access required", errors: [] });
  }
  next();
};
