import jwt from "jsonwebtoken";

export function signAccessToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, tv: user.tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: "15m"
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ id: user._id.toString(), tv: user.tokenVersion }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

export function setAuthCookies(res, user) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("accessToken", signAccessToken(user), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000
  });
  res.cookie("refreshToken", signRefreshToken(user), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookies(res) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
}
