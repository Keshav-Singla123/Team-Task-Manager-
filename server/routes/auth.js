import crypto from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendMail } from "../utils/mail.js";
import { clearAuthCookies, setAuthCookies } from "../utils/token.js";
import { created, fail, ok } from "../utils/respond.js";

const router = express.Router();

const signupSchema = z
  .object({
    name: z.string().min(2, "Full name is required").max(60),
    email: z.string().email("Enter a valid email").max(120),
    password: z.string().min(8, "Password must be at least 8 characters").max(80),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

function sanitizeUser(user) {
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

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const data = signupSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email.toLowerCase() });

    if (existing) return fail(res, 409, "Email already in use");

    const palette = ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#be123c"];
    const user = new User({
      name: data.name,
      email: data.email,
      password: data.password,
      role: "Member",
      avatarColor: palette[Math.floor(Math.random() * palette.length)]
    });
    const verificationToken = user.createToken("emailVerificationToken", 24 * 60);
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    // Send email in background without blocking response
    sendMail({
      to: user.email,
      subject: "Verify your TaskFlow account",
      html: `<p>Welcome to TaskFlow.</p><p>Verify your account: <a href="${clientUrl}/verify-email?token=${verificationToken}">Verify email</a></p>`
    }).catch((err) => console.error("Email send failed:", err.message));

    return created(res, {
      message: "Account created. Login with the same email and password to open your workspace."
    });
  })
);

router.post(
  "/claim-admin",
  protect,
  asyncHandler(async (req, res) => {
    return fail(res, 410, "Admin claiming is disabled. Project admin access starts when a user creates or manages a project.");
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });
    const generic = "Invalid email or password";

    if (!user) return fail(res, 401, generic);
    if (!user.isActive) return fail(res, 403, "Account is deactivated");

    if (user.lockUntil && user.lockUntil > new Date()) {
      const seconds = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
      return fail(res, 423, `Account locked. Try again in ${Math.ceil(seconds / 60)} minute(s).`, [{ seconds }]);
    }

    const valid = await user.comparePassword(data.password);
    if (!valid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return fail(res, user.lockUntil ? 423 : 401, user.lockUntil ? "Too many failed attempts. Account locked for 15 minutes." : generic);
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastActiveAt = new Date();
    await user.save();
    setAuthCookies(res, user);
    return ok(res, { user: sanitizeUser(user) });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) return fail(res, 401, "Refresh token missing");

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive || user.tokenVersion !== decoded.tv) return fail(res, 401, "Invalid refresh token");

    user.lastActiveAt = new Date();
    await user.save();
    setAuthCookies(res, user);
    return ok(res, { user: sanitizeUser(user) });
  })
);

router.post(
  "/logout",
  protect,
  asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
    clearAuthCookies(res);
    return ok(res, { message: "Logged out" });
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = forgotSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    const response = { message: "If that email exists, a reset link has been sent." };

    if (!user) return ok(res, response);

    const resetToken = user.createToken("passwordResetToken", 60);
    await user.save();
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    // Send email in background without blocking response
    sendMail({
      to: user.email,
      subject: "Reset your TaskFlow password",
      html: `<p>Reset your password within 1 hour: <a href="${clientUrl}/reset-password?token=${resetToken}">Reset password</a></p>`
    }).catch((err) => console.error("Email send failed:", err.message));

    return ok(res, response);
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const data = resetSchema.parse(req.body);
    const user = await User.findOne({
      passwordResetToken: hashToken(data.token),
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) return fail(res, 400, "Reset link is invalid or expired");

    user.password = data.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion += 1;
    await user.save();
    clearAuthCookies(res);
    return ok(res, { message: "Password reset successful. Please login again." });
  })
);

router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => ok(res, { user: sanitizeUser(req.user) }))
);

export default router;
