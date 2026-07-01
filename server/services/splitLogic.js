function toCents(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a positive number.");
  }
  return Math.round(value * 100);
}

function centsToMoney(cents) {
  return Number((cents / 100).toFixed(2));
}

function normalizeParticipants(participants) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error("At least one participant is required.");
  }
  return participants.map((participant) =>
    typeof participant === "string" ? { userId: participant } : participant
  );
}

function calculateEqualSplit(amount, participants) {
  const members = normalizeParticipants(participants);
  const total = toCents(amount);
  const base = Math.floor(total / members.length);
  let remainder = total - base * members.length;

  return members.map((member) => {
    const amountOwed = base + (remainder > 0 ? 1 : 0);
    remainder -= remainder > 0 ? 1 : 0;
    return { userId: member.userId, amountOwed: centsToMoney(amountOwed) };
  });
}

function calculatePercentageSplit(amount, splits) {
  const members = normalizeParticipants(splits);
  const totalPercentage = members.reduce((sum, split) => sum + Number(split.percentage || 0), 0);
  if (Math.round(totalPercentage * 100) !== 10000) {
    throw new Error("Percentages must sum to 100.");
  }

  const total = toCents(amount);
  let allocated = 0;
  return members.map((split, index) => {
    const cents =
      index === members.length - 1
        ? total - allocated
        : Math.round((total * Number(split.percentage)) / 100);
    allocated += cents;
    return { userId: split.userId, amountOwed: centsToMoney(cents) };
  });
}

function calculateCustomSplit(amount, splits) {
  const members = normalizeParticipants(splits);
  const total = toCents(amount);
  const mapped = members.map((split) => ({
    userId: split.userId,
    amountOwed: centsToMoney(toCents(split.amountOwed)),
  }));
  const splitTotal = mapped.reduce((sum, split) => sum + toCents(split.amountOwed), 0);
  if (splitTotal !== total) {
    throw new Error("Custom split amounts must sum to the expense total.");
  }
  return mapped;
}

function calculateExpenseSplits(amount, splitType, participantsOrSplits) {
  if (splitType === "equal") return calculateEqualSplit(amount, participantsOrSplits);
  if (splitType === "percentage") return calculatePercentageSplit(amount, participantsOrSplits);
  if (splitType === "custom") return calculateCustomSplit(amount, participantsOrSplits);
  throw new Error("Unsupported split type.");
}

function simplifyDebts(rawBalances) {
  const debtors = [];
  const creditors = [];

  rawBalances.forEach((balance) => {
    const cents = Math.round(Number(balance.balance) * 100);
    const entry = { userId: balance.userId, name: balance.name, cents: Math.abs(cents) };
    if (cents < 0) debtors.push(entry);
    if (cents > 0) creditors.push(entry);
  });

  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const transactions = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const cents = Math.min(debtor.cents, creditor.cents);

    if (cents > 0) {
      transactions.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount: centsToMoney(cents),
      });
    }

    debtor.cents -= cents;
    creditor.cents -= cents;
    if (debtor.cents === 0) debtorIndex += 1;
    if (creditor.cents === 0) creditorIndex += 1;
  }

  return transactions;
}

module.exports = {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateCustomSplit,
  calculateExpenseSplits,
  simplifyDebts,
};
