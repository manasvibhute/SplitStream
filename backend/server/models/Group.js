const mongoose = require("mongoose");

const groupMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    members: [groupMemberSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

groupSchema.index({ "members.user": 1 });

module.exports = mongoose.model("Group", groupSchema);
