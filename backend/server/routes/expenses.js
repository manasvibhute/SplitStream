const express = require("express");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const requireAuth = require("../middleware/auth");
const { calculateExpenseSplits } = require("../services/splitLogic");
const { assertGroupMember, getGroupSnapshot } = require("../services/groupService");
const { parseExpenseText, validateParseRequest } = require("../services/expenseParser");

const router = express.Router();
router.use(requireAuth);

router.post("/expenses/parse", async (req, res) => {
  const { text, groupMembers = [] } = req.body;
  const validationError = validateParseRequest(text, groupMembers);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const parsed = await parseExpenseText({ text: String(text).trim(), groupMembers });
    const needsClarification =
      parsed.confidence === "low" ||
      !parsed.amount ||
      !parsed.description ||
      parsed.participants.length === 0 ||
      parsed.splitType === "unclear";

    return res.json({
      needsClarification,
      parsed,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.json({
        needsClarification: true,
        parsed: {
          amount: null,
          description: "",
          participants: [],
          paidBy: null,
          splitType: "unclear",
          confidence: "low",
        },
        message: "The expense text needs manual review.",
      });
    }

    console.error("Parse route error:", error);
    return res.status(502).json({
      message:
        error.message || "Could not parse the expense automatically right now. Please use the manual form.",
    });
  }
});

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
    const { description, amount, splitType, splits, category = "Other" } = req.body;
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
      category,
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
