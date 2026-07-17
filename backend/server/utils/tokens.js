const jwt = require("jsonwebtoken");

const accessSecret = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, accessSecret, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, refreshSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
