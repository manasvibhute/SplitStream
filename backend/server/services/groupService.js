const { prisma } = require("../utils/db");
const { simplifyDebts } = require("./splitLogic");

async function assertGroupMember(groupId, userId) {
  const member = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId },
    },
  });

  if (!member) {
    const error = new Error("Group not found.");
    error.statusCode = 404;
    throw error;
  }

  return member;
}

async function getGroupSnapshot(groupId) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: true },
      },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: {
          paidBy: true,
          splits: {
            include: { user: true },
          },
        },
      },
      settlements: {
        orderBy: { settledAt: "desc" },
      },
    },
  });

  if (!group) {
    const error = new Error("Group not found.");
    error.statusCode = 404;
    throw error;
  }

  const snapshot = serializeGroup(group);
  const balances = calculateGroupBalances(snapshot);
  return { ...snapshot, balances };
}

function serializeGroup(group) {
  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt,
    members: group.members.map(({ user, joinedAt }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      joinedAt,
    })),
    expenses: group.expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      splitType: expense.splitType,
      category: expense.category || "Other",
      createdAt: expense.createdAt,
      paidBy: {
        id: expense.paidBy.id,
        name: expense.paidBy.name,
        email: expense.paidBy.email,
      },
      splits: expense.splits.map((split) => ({
        userId: split.user.id,
        name: split.user.name,
        amountOwed: Number(split.amountOwed),
      })),
    })),
    settlements: group.settlements.map((settlement) => ({
      id: settlement.id,
      fromUserId: settlement.fromUserId,
      toUserId: settlement.toUserId,
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
