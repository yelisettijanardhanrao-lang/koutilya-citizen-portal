const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    service: {
      type: String,
      required: true,
      trim: true,
    },

    applicantName: {
      type: String,
      default: "",
      trim: true,
    },

    fatherName: {
      type: String,
      default: "",
      trim: true,
    },

    motherName: {
      type: String,
      default: "",
      trim: true,
    },

    mobile: {
      type: String,
      default: "",
      trim: true,
    },

    district: {
      type: String,
      default: "",
      trim: true,
    },

    mandal: {
      type: String,
      default: "",
      trim: true,
    },

    village: {
      type: String,
      default: "",
      trim: true,
    },

    house: {
      type: String,
      default: "",
    },

    street: {
      type: String,
      default: "",
    },

    ration: {
      type: String,
      default: "",
    },

    aadhaar: {
      type: String,
      default: "",
    },

    totalVillages: {
      type: String,
      default: "",
    },

    villageDetails: {
      type: String,
      default: "",
    },

    yearDetails: {
      type: String,
      default: "",
    },

    fasaliDetails: {
      type: String,
      default: "",
    },

    totalSurveyNumbers: {
      type: String,
      default: "",
    },

    surveyNo: {
      type: String,
      default: "",
    },

    /*
    =========================================================
    SERVICE-SPECIFIC DATA
    =========================================================

    This stores Caste, Income, EWS, Birth, Death,
    Family Member, OBC and other service fields.
    */
    serviceData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /*
    =========================================================
    PAYMENT
    =========================================================
    */

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Paid",
        "Failed",
      ],
      default: "Pending",
    },

    paymentId: {
      type: String,
      default: "",
    },

    paymentAmount: {
      type: Number,
      default: 2,
    },

    /*
    =========================================================
    APPLICATION STATUS
    =========================================================
    */

    applicationStatus: {
      type: String,
      enum: [
        "Draft",
        "Submitted",
        "Processing",
        "Approved",
        "Rejected",
      ],
      default: "Draft",
    },

    /*
    =========================================================
    PDF
    =========================================================
    */

    pdfUrl: {
      type: String,
      default: "",
      trim: true,
    },

    pdfGeneratedAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
    strict: true,
  }
);

module.exports =
  mongoose.models.Application ||
  mongoose.model(
    "Application",
    ApplicationSchema
  );