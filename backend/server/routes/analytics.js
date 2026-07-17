const express = require("express");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const requireAuth = require("../middleware/auth");
const { getGroupSnapshot } = require("../services/groupService");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const groupFilter = req.query.groupId;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const groups = await Group.find({ "members.user": userId }).populate("members.user").sort({ createdAt: -1 }).lean();
    const allowedGroupIds = groups.map((group) => group._id.toString());
    const groupIds = groupFilter && allowedGroupIds.includes(groupFilter) ? [groupFilter] : allowedGroupIds;
    const dateMatch = {};
    if (from && !Number.isNaN(from.getTime())) dateMatch.$gte = from;
    if (to && !Number.isNaN(to.getTime())) dateMatch.$lte = to;

    const expenseMatch = { group: { $in: groupIds } };
    if (Object.keys(dateMatch).length) expenseMatch.createdAt = dateMatch;

    const [expenses, settlements, snapshots] = await Promise.all([
      Expense.find(expenseMatch).populate("paidBy").populate("splits.user").sort({ createdAt: -1 }).lean(),
      Settlement.find({ group: { $in: groupIds } }).sort({ settledAt: -1 }).lean(),
      Promise.all(allowedGroupIds.map((id) => getGroupSnapshot(id))),
    ]);

    const groupNameById = new Map(groups.map((group) => [group._id.toString(), group.name]));
    const dashboard = buildDashboard(userId, snapshots, expenses, settlements);
    const charts = buildCharts(userId, expenses, groupNameById);
    const activity = buildActivity(groups, expenses, settlements, groupNameById);

    res.json({
      dashboard,
      charts,
      activity,
      groups: snapshots.map((group) => ({
        id: group.id,
        name: group.name,
        memberCount: group.members.length,
        netBalance: group.balances.raw.find((balance) => balance.userId === userId)?.balance || 0,
        totalExpenses: group.expenses.reduce((sum, expense) => sum + expense.amount, 0),
      })),
    });
  } catch (error) {
    next(error);
  }
});

function buildDashboard(userId, groups, expenses, settlements) {
  let totalOwe = 0;
  let totalOwed = 0;

  groups.forEach((group) => {
    const balance = group.balances.raw.find((item) => item.userId === userId)?.balance || 0;
    if (balance < 0) totalOwe += Math.abs(balance);
    if (balance > 0) totalOwed += balance;
  });

  return {
    totalOwe: round(totalOwe),
    totalOwed: round(totalOwed),
    netBalance: round(totalOwed - totalOwe),
    activeGroups: groups.length,
    expensesLogged: expenses.length,
    lifetimeSettled: round(
      settlements
        .filter((settlement) => settlement.fromUser.toString() === userId || settlement.toUser.toString() === userId)
        .reduce((sum, settlement) => sum + Number(settlement.amount), 0)
    ),
  };
}

function buildCharts(userId, expenses, groupNameById) {
  const byMonth = new Map();
  const byGroup = new Map();
  const byCategory = new Map();

  expenses.forEach((expense) => {
    const month = new Date(expense.createdAt).toISOString().slice(0, 7);
    const monthEntry = byMonth.get(month) || { month, spending: 0, paid: 0, owed: 0 };
    monthEntry.spending += Number(expense.amount);
    if (expense.paidBy._id.toString() === userId) monthEntry.paid += Number(expense.amount);
    const split = expense.splits.find((item) => item.user._id.toString() === userId);
    monthEntry.owed += split ? Number(split.amountOwed) : 0;
    byMonth.set(month, monthEntry);

    const groupId = expense.group.toString();
    byGroup.set(groupId, (byGroup.get(groupId) || 0) + Number(expense.amount));

    const category = expense.category || "Other";
    byCategory.set(category, (byCategory.get(category) || 0) + Number(expense.amount));
  });

  return {
    spendingOverTime: Array.from(byMonth.values()).map(roundObject).sort((a, b) => a.month.localeCompare(b.month)),
    paidVsOwed: Array.from(byMonth.values()).map(roundObject).sort((a, b) => a.month.localeCompare(b.month)),
    spendingByGroup: Array.from(byGroup.entries())
      .map(([groupId, amount]) => ({ groupId, name: groupNameById.get(groupId) || "Group", amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    spendingByCategory: Array.from(byCategory.entries()).map(([name, value]) => ({ name, value: round(value) })),
  };
}

function buildActivity(groups, expenses, settlements, groupNameById) {
  const groupEvents = [];
  groups.forEach((group) => {
    group.members.forEach((member) => {
      groupEvents.push({
        id: `${group._id}-${member.user._id}-joined`,
        type: "member_joined",
        groupId: group._id.toString(),
        groupName: group.name,
        actorName: member.user.name,
        label: `${member.user.name} joined ${group.name}`,
        amount: null,
        createdAt: member.joinedAt,
      });
    });
  });

  const expenseEvents = expenses.map((expense) => ({
    id: expense._id.toString(),
    type: "expense_added",
    groupId: expense.group.toString(),
    groupName: groupNameById.get(expense.group.toString()) || "Group",
    actorName: expense.paidBy.name,
    label: `${expense.paidBy.name} added ${expense.description}`,
    amount: Number(expense.amount),
    category: expense.category || "Other",
    createdAt: expense.createdAt,
  }));

  const settlementEvents = settlements.map((settlement) => ({
    id: settlement._id.toString(),
    type: "settlement_made",
    groupId: settlement.group.toString(),
    groupName: groupNameById.get(settlement.group.toString()) || "Group",
    actorName: null,
    label: "Settlement recorded",
    amount: Number(settlement.amount),
    createdAt: settlement.settledAt,
  }));

  return [...expenseEvents, ...settlementEvents, ...groupEvents]
    .filter((event) => event.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function round(value) {
  return Number(Number(value || 0).toFixed(2));
}

function roundObject(entry) {
  return Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, typeof value === "number" ? round(value) : value]));
}

module.exports = router;
