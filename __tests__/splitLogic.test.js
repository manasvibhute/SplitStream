const {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateCustomSplit,
  calculateExpenseSplits,
  simplifyDebts,
} = require("../server/services/splitLogic");

describe("split calculation", () => {
  test("splits equally across participants", () => {
    expect(calculateEqualSplit(300, ["u1", "u2", "u3"])).toEqual([
      { userId: "u1", amountOwed: 100 },
      { userId: "u2", amountOwed: 100 },
      { userId: "u3", amountOwed: 100 },
    ]);
  });

  test("keeps equal split remainders to the cent", () => {
    expect(calculateEqualSplit(100, ["u1", "u2", "u3"])).toEqual([
      { userId: "u1", amountOwed: 33.34 },
      { userId: "u2", amountOwed: 33.33 },
      { userId: "u3", amountOwed: 33.33 },
    ]);
  });

  test("rejects empty equal split participants", () => {
    expect(() => calculateEqualSplit(100, [])).toThrow("At least one participant");
  });

  test("calculates percentage splits", () => {
    expect(
      calculatePercentageSplit(1000, [
        { userId: "u1", percentage: 50 },
        { userId: "u2", percentage: 30 },
        { userId: "u3", percentage: 20 },
      ])
    ).toEqual([
      { userId: "u1", amountOwed: 500 },
      { userId: "u2", amountOwed: 300 },
      { userId: "u3", amountOwed: 200 },
    ]);
  });

  test("rejects percentages that do not sum to 100", () => {
    expect(() =>
      calculatePercentageSplit(1000, [
        { userId: "u1", percentage: 80 },
        { userId: "u2", percentage: 10 },
      ])
    ).toThrow("Percentages must sum to 100");
  });

  test("calculates custom splits", () => {
    expect(
      calculateCustomSplit(450, [
        { userId: "u1", amountOwed: 200 },
        { userId: "u2", amountOwed: 250 },
      ])
    ).toEqual([
      { userId: "u1", amountOwed: 200 },
      { userId: "u2", amountOwed: 250 },
    ]);
  });

  test("rejects custom splits that do not sum to total", () => {
    expect(() =>
      calculateCustomSplit(450, [
        { userId: "u1", amountOwed: 200 },
        { userId: "u2", amountOwed: 200 },
      ])
    ).toThrow("Custom split amounts must sum");
  });

  test("routes split calculation by type", () => {
    expect(calculateExpenseSplits(100, "equal", ["u1", "u2"])).toEqual([
      { userId: "u1", amountOwed: 50 },
      { userId: "u2", amountOwed: 50 },
    ]);
  });
});

describe("debt simplification", () => {
  test("minimizes a simple creditor and debtor pair", () => {
    expect(
      simplifyDebts([
        { userId: "u1", name: "Asha", balance: 500 },
        { userId: "u2", name: "Riya", balance: -500 },
      ])
    ).toEqual([
      { fromUserId: "u2", fromName: "Riya", toUserId: "u1", toName: "Asha", amount: 500 },
    ]);
  });

  test("matches largest debtors to creditors greedily", () => {
    expect(
      simplifyDebts([
        { userId: "u1", name: "Asha", balance: 700 },
        { userId: "u2", name: "Riya", balance: -400 },
        { userId: "u3", name: "Kabir", balance: -300 },
        { userId: "u4", name: "Dev", balance: 0 },
      ])
    ).toEqual([
      { fromUserId: "u2", fromName: "Riya", toUserId: "u1", toName: "Asha", amount: 400 },
      { fromUserId: "u3", fromName: "Kabir", toUserId: "u1", toName: "Asha", amount: 300 },
    ]);
  });

  test("returns no settlements when everyone is balanced", () => {
    expect(
      simplifyDebts([
        { userId: "u1", name: "Asha", balance: 0 },
        { userId: "u2", name: "Riya", balance: 0 },
      ])
    ).toEqual([]);
  });
});
