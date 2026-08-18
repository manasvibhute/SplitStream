const express = require("express");
const { prisma } = require("../utils/db");
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
    const parsed = await parseExpenseText({ text: String(text).trim(), groupMembers, currentUserId: req.user.sub });
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

    let message = "Could not parse the expense automatically right now. Please use the manual form.";
    if (
      error.statusCode === 401 ||
      error.status === 401 ||
      (error.message && (error.message.includes("invalid_api_key") || error.message.includes("Invalid API Key")))
    ) {
      message = "Invalid Groq API Key. Please verify your GROQ_API_KEY environment variable or enter details manually.";
    } else if (error.message && !error.message.startsWith("401 ") && !error.message.includes('{"error"')) {
      message = error.message;
    }

    return res.status(error.statusCode || error.status || 502).json({
      message,
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

    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.id },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    const calculatedSplits = calculateExpenseSplits(amount, splitType, splits);

    if (calculatedSplits.some((split) => !memberIds.has(split.userId))) {
      return res.status(400).json({ message: "All split participants must be group members." });
    }

    await prisma.expense.create({
      data: {
        groupId: req.params.id,
        paidById: req.user.sub,
        description: description.trim(),
        amount: Number(amount),
        splitType,
        category,
        splits: {
          create: calculatedSplits.map((split) => ({
            userId: split.userId,
            amountOwed: Number(split.amountOwed),
          })),
        },
      },
    });

    const snapshot = await getGroupSnapshot(req.params.id);
    req.io.to(req.params.id).emit("expense:added", snapshot);
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.put("/expenses/:id", async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
    });
    if (!expense) return res.status(404).json({ message: "Expense not found." });

    const groupId = expense.groupId;
    await assertGroupMember(groupId, req.user.sub);

    const { description, amount, splitType, splits, category } = req.body;
    if (!description || !amount || !splitType) {
      return res.status(400).json({ message: "Description, amount, and split type are required." });
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    const calculatedSplits = calculateExpenseSplits(amount, splitType, splits);

    if (calculatedSplits.some((split) => !memberIds.has(split.userId))) {
      return res.status(400).json({ message: "All split participants must be group members." });
    }

    await prisma.$transaction([
      prisma.expenseSplit.deleteMany({
        where: { expenseId: req.params.id },
      }),
      prisma.expense.update({
        where: { id: req.params.id },
        data: {
          description: description.trim(),
          amount: Number(amount),
          splitType,
          category: category || expense.category,
          splits: {
            create: calculatedSplits.map((split) => ({
              userId: split.userId,
              amountOwed: Number(split.amountOwed),
            })),
          },
        },
      }),
    ]);

    const snapshot = await getGroupSnapshot(groupId);
    req.io.to(groupId).emit("expense:updated", snapshot);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.delete("/expenses/:id", async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
    });
    if (!expense) return res.status(404).json({ message: "Expense not found." });

    const groupId = expense.groupId;
    await assertGroupMember(groupId, req.user.sub);

    await prisma.expense.delete({
      where: { id: req.params.id },
    });

    const snapshot = await getGroupSnapshot(groupId);
    req.io.to(groupId).emit("expense:deleted", snapshot);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
