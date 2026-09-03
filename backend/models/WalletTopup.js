const mongoose = require("mongoose");

const walletTopupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 10,
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 1000,
    },

    currency: {
      type: String,
      default: "INR",
    },

    cashfreeOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    cashfreeCfOrderId: {
      type: String,
      default: "",
    },

    cashfreePaymentSessionId: {
      type: String,
      default: "",
    },

    cashfreePaymentId: {
      type: String,
      default: "",
      index: true,
    },

    status: {
      type: String,
      enum: ["Created", "Pending", "Paid", "Failed"],
      default: "Created",
      index: true,
    },

    credited: {
      type: Boolean,
      default: false,
      index: true,
    },

    creditedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.WalletTopup ||
  mongoose.model("WalletTopup", walletTopupSchema);