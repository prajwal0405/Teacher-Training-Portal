import jwt from "jsonwebtoken";

// Generate access token (short-lived)
export const generateAccessToken = (userId, role = "teacher") => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

// Generate refresh token (long-lived)
export const generateRefreshToken = (userId, role = "teacher") => {
  return jwt.sign(
    { userId, role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "30d" }
  );
};

// Generate both tokens
export const generateTokenPair = (userId, role = "teacher") => {
  return {
    accessToken: generateAccessToken(userId, role),
    refreshToken: generateRefreshToken(userId, role)
  };
};
