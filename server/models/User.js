import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ["Admin", "Member"],
      default: "Member"
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    tokenVersion: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastActiveAt: Date,
    timezone: {
      type: String,
      default: "Asia/Kolkata"
    },
    bio: {
      type: String,
      default: "",
      maxlength: 240
    },
    notificationPrefs: {
      taskAssigned: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      deadlineChanges: { type: Boolean, default: true },
      statusChanges: { type: Boolean, default: true }
    },
    avatarColor: {
      type: String,
      default: "#2563eb"
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.createToken = function createToken(field, minutes) {
  const token = crypto.randomBytes(32).toString("hex");
  this[field] = crypto.createHash("sha256").update(token).digest("hex");
  this[`${field.replace("Token", "Expires")}`] = new Date(Date.now() + minutes * 60 * 1000);
  return token;
};

export const User = mongoose.model("User", userSchema);
