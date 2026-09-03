const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const User = require("../models/User");
const Application = require("../models/Application");
const Transaction = require("../models/Transaction");

router.use(authMiddleware, adminMiddleware);

// =====================================================
// USERS
// =====================================================

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((user) => user._id);

    const [applicationCounts, transactionCounts] =
      await Promise.all([
        Application.aggregate([
          { $match: { userId: { $in: userIds } } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ]),
        Transaction.aggregate([
          { $match: { userId: { $in: userIds } } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ]),
      ]);

    const appMap = new Map(
      applicationCounts.map((item) => [
        String(item._id),
        item.count,
      ])
    );

    const txMap = new Map(
      transactionCounts.map((item) => [
        String(item._id),
        item.count,
      ])
    );

    const result = users.map((user) => ({
      ...user,
      walletBalance: Number(user.walletBalance || 0),
      applicationCount: appMap.get(String(user._id)) || 0,
      transactionCount: txMap.get(String(user._id)) || 0,
    }));

    return res.json({
      success: true,
      users: result,
    });
  } catch (error) {
    console.error("ADMIN USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load users.",
    });
  }
});

// =====================================================
// USER DETAILS
// =====================================================

router.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: { $ne: "admin" },
    })
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const [applications, storedTransactions] =
      await Promise.all([
        Application.find({ userId })
          .sort({ createdAt: -1 })
          .lean(),

        Transaction.find({ userId })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

    // Older projects may contain Paid applications created before
    // wallet transactions were introduced. Show those payments in
    // the admin view as legacy transaction records without changing
    // historical wallet balances.
    const transactionApplicationIds = new Set(
      storedTransactions
        .filter((transaction) => transaction.applicationId)
        .map((transaction) =>
          String(transaction.applicationId)
        )
    );

    const legacyTransactions = applications
      .filter(
        (application) =>
          application.paymentStatus === "Paid" &&
          !transactionApplicationIds.has(
            String(application._id)
          )
      )
      .map((application) => ({
        _id: `legacy-${application._id}`,
        userId: application.userId,
        type: "debit",
        amount: Number(application.paymentAmount || 2),
        balanceBefore: null,
        balanceAfter: null,
        serviceName: application.service,
        reference:
          application.paymentId ||
          `LEGACY-${application.applicationNumber}`,
        status: "Success",
        description:
          `Historical service payment for ${application.applicationNumber}`,
        applicationId: application._id,
        applicationNumber:
          application.applicationNumber,
        createdAt:
          application.createdAt ||
          application.updatedAt,
        legacy: true,
      }));

    const transactions = [
      ...storedTransactions,
      ...legacyTransactions,
    ].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    return res.json({
      success: true,
      user: {
        ...user,
        walletBalance: Number(user.walletBalance || 0),
      },
      applications,
      transactions,
    });
  } catch (error) {
    console.error("ADMIN USER DETAILS ERROR:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to load user details.",
    });
  }
});

// =====================================================
// ADMIN TOP-UP
// =====================================================

router.post("/users/:userId/topup", async (req, res) => {
  try {
    const { userId } = req.params;
    const amount = Number(req.body?.amount);
    const description =
      String(req.body?.description || "Admin wallet top-up").trim();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid top-up amount.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: { $ne: "admin" },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const before = Number(user.walletBalance || 0);
    const after = before + amount;

    user.walletBalance = after;
    await user.save();

    const reference =
      `ADMIN-TOPUP-${Date.now()}-${String(user._id).slice(-6)}`;

    const transaction = await Transaction.create({
      userId: user._id,
      type: "credit",
      amount,
      balanceBefore: before,
      balanceAfter: after,
      serviceName: "Wallet Top-up",
      reference,
      status: "Success",
      description,
      createdBy: req.user?.id || null,
    });

    return res.json({
      success: true,
      message: `₹${amount.toFixed(2)} added successfully.`,
      walletBalance: after,
      transaction,
    });
  } catch (error) {
    console.error("ADMIN TOPUP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Wallet top-up failed.",
    });
  }
});

// =====================================================
// RESET USER PASSWORD
// =====================================================

router.post("/users/:userId/reset-password", async (req, res) => {
  try {
    const { userId } = req.params;
    const newPassword = String(
      req.body?.newPassword || ""
    );

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: { $ne: "admin" },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      success: true,
      message: "User password reset successfully.",
    });
  } catch (error) {
    console.error("ADMIN RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Password reset failed.",
    });
  }
});

// =====================================================
// USER-WISE TRANSACTIONS
// =====================================================

router.get("/users/:userId/transactions", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: { $ne: "admin" },
    })
      .select("fullName mobile email walletBalance")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const query = { userId };

    if (req.query.from || req.query.to) {
      query.createdAt = {};

      if (req.query.from) {
        query.createdAt.$gte = new Date(
          `${req.query.from}T00:00:00.000`
        );
      }

      if (req.query.to) {
        query.createdAt.$lte = new Date(
          `${req.query.to}T23:59:59.999`
        );
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const paidApplicationQuery = {
      userId,
      paymentStatus: "Paid",
      ...(query.createdAt
        ? { createdAt: query.createdAt }
        : {}),
    };

    const paidApplications = await Application.find(
      paidApplicationQuery
    )
      .sort({ createdAt: -1 })
      .lean();

    const existingApplicationIds = new Set(
      transactions
        .filter((transaction) => transaction.applicationId)
        .map((transaction) =>
          String(transaction.applicationId)
        )
    );

    const legacyTransactions = paidApplications
      .filter(
        (application) =>
          !existingApplicationIds.has(
            String(application._id)
          )
      )
      .map((application) => ({
        _id: `legacy-${application._id}`,
        userId: application.userId,
        type: "debit",
        amount: Number(application.paymentAmount || 2),
        balanceBefore: null,
        balanceAfter: null,
        serviceName: application.service,
        reference:
          application.paymentId ||
          `LEGACY-${application.applicationNumber}`,
        status: "Success",
        description:
          `Historical service payment for ${application.applicationNumber}`,
        applicationId: application._id,
        applicationNumber:
          application.applicationNumber,
        createdAt:
          application.createdAt ||
          application.updatedAt,
        legacy: true,
      }));

    const allTransactions = [
      ...transactions,
      ...legacyTransactions,
    ].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    return res.json({
      success: true,
      user,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("ADMIN USER TRANSACTIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to load transactions.",
    });
  }
});

// =====================================================
// CSV EXPORT
// Required fields only:
// Applicant Name, Father Name, Date of Birth,
// Mobile Number, Address
//
// A selected citizen + From Date + To Date is required
// by the admin UI. The export is application-wise.
// =====================================================

router.get("/users/:userId/export.csv", async (req, res) => {
  try {
    const { userId } = req.params;
    const { from, to } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid user ID.");
    }

    if (!from || !to) {
      return res.status(400).send("From date and To date are required.");
    }

    const fromDate = new Date(`${from}T00:00:00.000`);
    const toDate = new Date(`${to}T23:59:59.999`);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).send("Invalid date range.");
    }

    if (fromDate > toDate) {
      return res.status(400).send("From date cannot be after To date.");
    }

    const user = await User.findOne({
      _id: userId,
      role: { $ne: "admin" },
    }).select("-password").lean();

    if (!user) {
      return res.status(404).send("User not found.");
    }

    const applications = await Application.find({
      userId,
      createdAt: { $gte: fromDate, $lte: toDate },
    }).sort({ createdAt: -1 }).lean();

    const first = (...values) =>
      values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";

    const getServiceData = (app) =>
      app && app.serviceData && typeof app.serviceData === "object"
        ? app.serviceData
        : {};

    const getAddress = (app) => {
      const data = getServiceData(app);

      const direct = first(
        data.address,
        data.presentAddress,
        data.permanentAddress,
        data.currentAddress
      );

      if (direct) return direct;

      const parts = [
        first(data.house, app.house),
        first(data.street, app.street),
        first(data.landmark),
        first(data.village, app.village),
        first(data.mandal, app.mandal),
        first(data.district, app.district),
        first(data.state),
        first(data.pincode, data.pinCode),
      ].filter(Boolean);

      return parts.join(", ");
    };

    const rows = applications.map((app) => {
      const data = getServiceData(app);

      return {
        "Applicant Name": first(app.applicantName, data.applicantName, user.fullName),
        "Father Name": first(app.fatherName, data.fatherName, data.fatherHusbandName),
        "Date of Birth": first(
          data.dateOfBirth,
          data.dob,
          app.dateOfBirth
        ),
        "Mobile Number": first(app.mobile, data.mobile, user.mobile),
        "Address": getAddress(app),
      };
    });

    const headers = [
      "Applicant Name",
      "Father Name",
      "Date of Birth",
      "Mobile Number",
      "Address",
    ];

    // Keep a useful blank-data export instead of failing.
    const csvRows = rows.length
      ? rows
      : [{ "Applicant Name": "", "Father Name": "", "Date of Birth": "", "Mobile Number": "", "Address": "" }];

    const escapeCsv = (value) => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.map(escapeCsv).join(","),
      ...csvRows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
    ].join("\r\n");

    const safeName =
      String(user.fullName || "user")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase() || "user";

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="koutilya_${safeName}_${from}_to_${to}.csv"`
    );

    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    console.error("CSV EXPORT ERROR:", error);
    return res.status(500).send(error.message || "CSV export failed.");
  }
});

module.exports = router;
