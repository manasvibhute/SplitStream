const express = require("express");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const requireAuth = require("../middleware/auth");
const { calculateExpenseSplits } = require("../services/splitLogic");
const { assertGroupMember, getGroupSnapshot } = require("../services/groupService");

const router = express.Router();
router.use(requireAuth);

router.get("/groups/:id/expenses", async (req, res, next) => {
  try {
    await assertGroupMember(req.params.id, req.user.sub);
    const snapshot = await getGroupSnapshot(req.params.id);
    res.json(snapshot.expenses);
  } catch (error) {
    next(error);
  }
});

router.post("/groups/:id/expenses", async (req, res, next) => {
  try {
    await assertGroupMember(req.params.id, req.user.sub);
    const { description, amount, splitType, splits } = req.body;
    if (!description || !amount || !splitType) {
      return res.status(400).json({ message: "Description, amount, and split type are required." });
    }

    const group = await Group.findById(req.params.id).lean();
    const memberIds = new Set(group.members.map((member) => member.user.toString()));
    const calculatedSplits = calculateExpenseSplits(amount, splitType, splits);
    if (calculatedSplits.some((split) => !memberIds.has(split.userId))) {
      return res.status(400).json({ message: "All split participants must be group members." });
    }

    await Expense.create({
      group: req.params.id,
      paidBy: req.user.sub,
      description: description.trim(),
      amount: Number(amount),
      splitType,
      splits: calculatedSplits.map((split) => ({
        user: split.userId,
        amountOwed: split.amountOwed,
      })),
    });

    const snapshot = await getGroupSnapshot(req.params.id);
    req.io.to(req.params.id).emit("expense:added", snapshot);
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.delete("/expenses/:id", async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found." });
    const groupId = expense.group.toString();
    await assertGroupMember(groupId, req.user.sub);

    await Expense.findByIdAndDelete(req.params.id);
    const snapshot = await getGroupSnapshot(groupId);
    req.io.to(groupId).emit("expense:deleted", snapshot);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
