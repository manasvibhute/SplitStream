const express = require("express");
const Group = require("../models/Group");
const User = require("../models/User");
const Expense = require("../models/Expense");
const requireAuth = require("../middleware/auth");
const { assertGroupMember, getGroupSnapshot } = require("../services/groupService");

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required." });
    }

    const group = await Group.create({
      name: name.trim(),
      members: [{ user: req.user.sub }],
    });

    res.status(201).json(await getGroupSnapshot(group._id.toString()));
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const groups = await Group.find({ "members.user": req.user.sub }).sort({ createdAt: -1 }).lean();
    const groupIds = groups.map((group) => group._id);
    const lastExpenses = await Expense.aggregate([
      { $match: { group: { $in: groupIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$group", lastExpenseAt: { $first: "$createdAt" } } },
    ]);
    const lastByGroup = new Map(lastExpenses.map((expense) => [expense._id.toString(), expense.lastExpenseAt]));

    res.json(
      groups.map((group) => ({
        id: group._id.toString(),
        name: group.name,
        createdAt: group.createdAt,
        memberCount: group.members.length,
        lastExpenseAt: lastByGroup.get(group._id.toString()) || null,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    await assertGroupMember(req.params.id, req.user.sub);
    res.json(await getGroupSnapshot(req.params.id));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/members", async (req, res, next) => {
  try {
    await assertGroupMember(req.params.id, req.user.sub);
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() });
    if (!user) return res.status(404).json({ message: "No user exists with that email." });

    const group = await Group.findById(req.params.id);
    if (group.members.some((member) => member.user.toString() === user.id)) {
      return res.status(409).json({ message: "That user is already in the group." });
    }
    group.members.push({ user: user.id });
    await group.save();

    const snapshot = await getGroupSnapshot(req.params.id);
    req.io.to(req.params.id).emit("member:joined", snapshot);
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
