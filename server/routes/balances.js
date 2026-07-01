const express = require("express");
const Group = require("../models/Group");
const Settlement = require("../models/Settlement");
const requireAuth = require("../middleware/auth");
const { assertGroupMember, getGroupSnapshot } = require("../services/groupService");

const router = express.Router();
router.use(requireAuth);

router.get("/groups/:id/balances", async (req, res, next) => {
  try {
    await assertGroupMember(req.params.id, req.user.sub);
    const snapshot = await getGroupSnapshot(req.params.id);
    res.json(snapshot.balances);
  } catch (error) {
    next(error);
  }
});

router.post("/groups/:id/settle", async (req, res, next) => {
  try {
    await assertGroupMember(req.params.id, req.user.sub);
    const { fromUserId, toUserId, amount } = req.body;
    if (!fromUserId || !toUserId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "From user, to user, and positive amount are required." });
    }

    const group = await Group.findById(req.params.id).lean();
    const memberIds = new Set(group.members.map((member) => member.user.toString()));
    if (!memberIds.has(fromUserId) || !memberIds.has(toUserId)) {
      return res.status(400).json({ message: "Settlement users must be group members." });
    }

    await Settlement.create({ group: req.params.id, fromUser: fromUserId, toUser: toUserId, amount: Number(amount) });

    const snapshot = await getGroupSnapshot(req.params.id);
    req.io.to(req.params.id).emit("settlement:made", snapshot);
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
