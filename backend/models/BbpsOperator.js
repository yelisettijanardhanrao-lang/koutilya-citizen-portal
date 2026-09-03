const mongoose = require("mongoose");

const BbpsOperatorSchema = new mongoose.Schema(
  {
    operatorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    category: { type: String, default: "" },
    state: { type: String, default: "" },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BbpsOperator || mongoose.model("BbpsOperator", BbpsOperatorSchema);
