const mongoose = require("mongoose");

const BbpsConfigSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "pay2all", enum: ["pay2all", "decentro-neowise"] },
    name: { type: String, default: "BBPS Bill Payments" },
    active: { type: Boolean, default: false },
    lastTestedAt: { type: Date, default: null },
    lastTestStatus: { type: String, default: "Not tested" },
    lastBalance: { type: Number, default: null },
    operatorCount: { type: Number, default: 0 },
    lastOperatorSyncAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BbpsConfig || mongoose.model("BbpsConfig", BbpsConfigSchema);
