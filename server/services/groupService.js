const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const { simplifyDebts } = require("./splitLogic");

async function assertGroupMember(groupId, userId) {
  const group = await Group.findOne({ _id: groupId, "members.user": userId });
  if (!group) {
    const error = new Error("Group not found.");
    error.statusCode = 404;
    throw error;
  }
  return group;
}

async function getGroupSnapshot(groupId) {
  const group = await Group.findById(groupId).populate("members.user").lean();

  if (!group) {
    const error = new Error("Group not found.");
    error.statusCode = 404;
    throw error;
  }

  const expenses = await Expense.find({ group: groupId })
    .populate("paidBy")
    .populate("splits.user")
    .sort({ createdAt: -1 })
    .lean();
  const settlements = await Settlement.find({ group: groupId }).sort({ settledAt: -1 }).lean();
  const snapshot = serializeGroup({ ...group, expenses, settlements });
  const balances = calculateGroupBalances(snapshot);
  return { ...snapshot, balances };
}

function serializeGroup(group) {
  return {
    id: group._id.toString(),
    name: group.name,
    createdAt: group.createdAt,
    members: group.members.map(({ user, joinedAt }) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      joinedAt,
    })),
    expenses: group.expenses.map((expense) => ({
      id: expense._id.toString(),
      description: expense.description,
      amount: Number(expense.amount),
      splitType: expense.splitType,
      createdAt: expense.createdAt,
      paidBy: {
        id: expense.paidBy._id.toString(),
        name: expense.paidBy.name,
        email: expense.paidBy.email,
      },
      splits: expense.splits.map((split) => ({
        userId: split.user._id.toString(),
        name: split.user.name,
        amountOwed: Number(split.amountOwed),
      })),
    })),
    settlements: group.settlements.map((settlement) => ({
      id: settlement._id.toString(),
      fromUserId: settlement.fromUser.toString(),
      toUserId: settlement.toUser.toString(),
      amount: Number(settlement.amount),
      settledAt: settlement.settledAt,
    })),
  };
}

function calculateGroupBalances(group) {
  const memberLookup = new Map(
    group.members.map((user) => [user.id, { userId: user.id, name: user.name, email: user.email, balance: 0 }])
  );

  group.expenses.forEach((expense) => {
    const paidBy = memberLookup.get(expense.paidBy.id);
    if (paidBy) paidBy.balance += Number(expense.amount);

    expense.splits.forEach((split) => {
      const debtor = memberLookup.get(split.userId);
      if (debtor) debtor.balance -= Number(split.amountOwed);
    });
  });

  group.settlements.forEach((settlement) => {
    const from = memberLookup.get(settlement.fromUserId);
    const to = memberLookup.get(settlement.toUserId);
    if (from) from.balance += Number(settlement.amount);
    if (to) to.balance -= Number(settlement.amount);
  });

  const raw = Array.from(memberLookup.values()).map((entry) => ({
    ...entry,
    balance: Number(entry.balance.toFixed(2)),
  }));

  return {
    raw,
    simplified: simplifyDebts(raw),
  };
}

module.exports = { assertGroupMember, getGroupSnapshot, calculateGroupBalances };
