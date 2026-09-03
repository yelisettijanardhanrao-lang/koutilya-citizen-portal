const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    serviceName: {
      type: String,
      default: "",
      trim: true,
    },

    reference: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    // Provider-side unique reference used for idempotent wallet credits.
    providerReference: {
      type: String,
      default: undefined,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["Success", "Failed", "Pending"],
      default: "Success",
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },

    applicationNumber: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
