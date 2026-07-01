const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/tokens");

const router = express.Router();

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: "Name, email, and a 6+ character password are required." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    res.status(201).json({
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email is already registered." });
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid refresh token." });

    res.json({
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token." });
  }
});

module.exports = router;
