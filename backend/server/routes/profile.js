const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");
const { signAccessToken, signRefreshToken } = require("../utils/tokens");

const router = express.Router();
router.use(requireAuth);

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

router.patch("/", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name is required." });

    const user = await User.findByIdAndUpdate(req.user.sub, { name }, { new: true });
    res.json({
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.user.sub);
    if (!user || !(await bcrypt.compare(currentPassword || "", user.passwordHash))) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: "Password updated." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
