const mongoose = require("mongoose");

const expenseSplitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amountOwed: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    splitType: { type: String, required: true, enum: ["equal", "percentage", "custom"] },
    category: {
      type: String,
      required: true,
      enum: ["Food", "Travel", "Stay", "Shopping", "Other"],
      default: "Other",
    },
    splits: [expenseSplitSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Expense", expenseSchema);
