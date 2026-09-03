const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const WalletTopup = require("../models/WalletTopup");

const MIN_TOPUP = 10;
const CASHFREE_API_VERSION = "2025-01-01";

const CASHFREE_BASE_URL =
  String(process.env.CASHFREE_ENV || "SANDBOX").toUpperCase() ===
  "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const RETURN_URL =
  process.env.CASHFREE_RETURN_URL ||
  "https://csp.koutilyasolutions.in/wallet";

const WEBHOOK_URL =
  process.env.CASHFREE_WEBHOOK_URL ||
  "https://koutilya-citizen-api.onrender.com/api/wallet/cashfree/webhook";

// =====================================================
// CASHFREE CONFIG
// =====================================================

function getCashfreeCredentials() {
  const appId = String(
    process.env.CASHFREE_APP_ID || ""
  ).trim();

  const secretKey = String(
    process.env.CASHFREE_SECRET_KEY || ""
  ).trim();

  if (!appId || !secretKey) {
    const error = new Error(
      "Cashfree credentials are not configured on the backend."
    );

    error.code = "CASHFREE_CONFIG_MISSING";

    throw error;
  }

  return {
    appId,
    secretKey,
  };
}

// =====================================================
// CASHFREE REQUEST
// =====================================================

async function cashfreeRequest(
  path,
  { method = "GET", body, idempotencyKey } = {}
) {
  const { appId, secretKey } =
    getCashfreeCredentials();

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-version": CASHFREE_API_VERSION,
    "x-client-id": appId,
    "x-client-secret": secretKey,
  };

  if (idempotencyKey) {
    headers["x-idempotency-key"] =
      idempotencyKey;
  }

  const response = await fetch(
    `${CASHFREE_BASE_URL}${path}`,
    {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    }
  );

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error_description ||
      data?.error ||
      `Cashfree request failed with HTTP ${response.status}`;

    const error = new Error(message);

    error.status = response.status;
    error.cashfree = data;

    throw error;
  }

  return data;
}

// =====================================================
// CREDIT TOPUP
// =====================================================

async function creditTopup(
  topup,
  paymentId = ""
) {
  const reference =
    `CF-TOPUP-${topup.cashfreeOrderId}`;

  if (topup.credited) {
    const user =
      await User.findById(topup.userId)
        .select("walletBalance")
        .lean();

    return {
      walletBalance:
        Number(user?.walletBalance || 0),
      alreadyCredited: true,
    };
  }

  const user =
    await User.findById(topup.userId);

  if (!user) {
    throw new Error(
      "User account not found."
    );
  }

  const existingTransaction =
    await Transaction.findOne({
      providerReference: reference,
    }).lean();

  if (existingTransaction) {
    user.walletBalance =
      Number(
        existingTransaction.balanceAfter ??
          user.walletBalance ??
          0
      );

    await user.save();

    topup.credited = true;
    topup.status = "Paid";
    topup.paidAt =
      topup.paidAt || new Date();
    topup.creditedAt =
      topup.creditedAt || new Date();

    await topup.save();

    return {
      walletBalance:
        Number(user.walletBalance || 0),
      alreadyCredited: true,
    };
  }

  const balanceBefore =
    Number(user.walletBalance || 0);

  const balanceAfter =
    balanceBefore +
    Number(topup.amount);

  let transaction;
  let alreadyCredited = false;

  try {
    transaction =
      await Transaction.create({
        userId: user._id,

        type: "credit",

        amount:
          Number(topup.amount),

        balanceBefore,

        balanceAfter,

        serviceName:
          "Wallet Top-up",

        reference,

        providerReference:
          reference,

        status: "Success",

        description:
          `Cashfree wallet top-up${
            paymentId
              ? ` (${paymentId})`
              : ""
          }`,

        createdBy: user._id,
      });
  } catch (error) {
    const duplicate =
      await Transaction.findOne({
        providerReference: reference,
      }).lean();

    if (!duplicate) {
      throw error;
    }

    transaction = duplicate;
    alreadyCredited = true;
  }

  user.walletBalance =
    Number(
      transaction.balanceAfter ??
        balanceAfter
    );

  await user.save();

  topup.credited = true;
  topup.status = "Paid";
  topup.paidAt =
    topup.paidAt || new Date();
  topup.creditedAt =
    new Date();

  if (paymentId) {
    topup.cashfreePaymentId =
      paymentId;
  }

  await topup.save();

  return {
    walletBalance:
      Number(user.walletBalance || 0),
    alreadyCredited,
  };
}

// =====================================================
// AUTHENTICATION
// =====================================================

router.use(authMiddleware);

// =====================================================
// GET WALLET
// =====================================================

router.get("/", async (req, res) => {
  try {
    const user =
      await User.findById(req.user.id)
        .select(
          "fullName mobile email role walletBalance"
        )
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,

      wallet: {
        balance:
          Number(user.walletBalance || 0),
      },

      user,
    });
  } catch (error) {
    console.error(
      "GET WALLET ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load wallet.",
    });
  }
});

// =====================================================
// CASHFREE CREATE ORDER
// POST /api/wallet/topup/order
// =====================================================

router.post(
  "/topup/order",
  async (req, res) => {
    try {
      const amount =
        Number(req.body?.amount);

      if (
        !Number.isInteger(amount) ||
        amount < MIN_TOPUP
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Minimum wallet top-up is ₹${MIN_TOPUP}. Enter a whole-rupee amount.`,
        });
      }

      const user =
        await User.findById(req.user.id)
          .select(
            "fullName mobile email role"
          )
          .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const orderId =
        `KCS-${Date.now()}-${String(
          user._id
        ).slice(-8)}`;

      const cashfreeOrder =
        await cashfreeRequest(
          "/orders",
          {
            method: "POST",

            idempotencyKey:
              crypto
                .randomUUID(),

            body: {
              order_id: orderId,

              order_amount:
                Number(amount),

              order_currency:
                "INR",

              customer_details: {
                customer_id:
                  String(user._id),

                customer_name:
                  user.fullName ||
                  "Portal Customer",

                customer_email:
                  user.email ||
                  "support@koutilyasolutions.in",

                customer_phone:
                  user.mobile ||
                  "9999999999",
              },

              order_meta: {
                return_url:
                  `${RETURN_URL}?order_id=${encodeURIComponent(
                    orderId
                  )}`,

                notify_url:
                  WEBHOOK_URL,
              },

              order_note:
                "Koutilya Citizen Services Wallet Top-up",
            },
          }
        );
        console.log("CASHFREE ORDER ENV:", process.env.CASHFREE_ENV);
console.log("CASHFREE API:", CASHFREE_BASE_URL);
console.log("CASHFREE CF ORDER ID:", cashfreeOrder.cf_order_id);
console.log(
  "CASHFREE SESSION RECEIVED:",
  Boolean(cashfreeOrder.payment_session_id)
);
      await WalletTopup.create({
        userId: user._id,

        amount,

        amountPaise:
          amount * 100,

        currency: "INR",

        cashfreeOrderId:
          orderId,

        cashfreeCfOrderId:
          cashfreeOrder.cf_order_id ||
          "",

        cashfreePaymentSessionId:
          cashfreeOrder.payment_session_id ||
          "",

        status: "Created",
      });

      return res.status(201).json({
        success: true,

        orderId,

        paymentSessionId:
          cashfreeOrder.payment_session_id,

        order: {
          id: orderId,

          amount:
            cashfreeOrder.order_amount,

          currency:
            cashfreeOrder.order_currency,
        },
      });
    } catch (error) {
      console.error(
        "CASHFREE CREATE ORDER ERROR:",
        error.cashfree || error
      );

      const status =
        error.code ===
        "CASHFREE_CONFIG_MISSING"
          ? 503
          : error.status &&
              error.status < 500
            ? error.status
            : 500;

      return res.status(status).json({
        success: false,
        message:
          error.message ||
          "Unable to create Cashfree payment order.",
      });
    }
  }
);

// =====================================================
// CASHFREE VERIFY / STATUS
// POST /api/wallet/topup/verify
// =====================================================

router.post(
  "/topup/verify",
  async (req, res) => {
    try {
      const orderId =
        String(
          req.body?.order_id ||
          req.body?.orderId ||
          ""
        ).trim();

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message:
            "Cashfree order ID is required.",
        });
      }

      const topup =
        await WalletTopup.findOne({
          cashfreeOrderId:
            orderId,

          userId:
            req.user.id,
        });

      if (!topup) {
        return res.status(404).json({
          success: false,
          message:
            "Wallet top-up order not found.",
        });
      }

      if (topup.credited) {
        const user =
          await User.findById(
            req.user.id
          )
            .select("walletBalance")
            .lean();

        return res.json({
          success: true,
          alreadyCredited: true,

          walletBalance:
            Number(
              user?.walletBalance || 0
            ),

          orderId,
        });
      }

      // -------------------------------------------------
      // Fetch Cashfree order
      // -------------------------------------------------

      const order =
        await cashfreeRequest(
          `/orders/${encodeURIComponent(
            orderId
          )}`
        );

      if (
        Number(order.order_amount) !==
          Number(topup.amount) ||
        String(
          order.order_currency ||
          "INR"
        ) !== "INR"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount or currency does not match the wallet top-up.",
        });
      }

      // -------------------------------------------------
      // Cashfree order PAID
      // -------------------------------------------------

      if (
        String(
          order.order_status
        ).toUpperCase() ===
        "PAID"
      ) {
        let paymentId = "";

        try {
          const payments =
            await cashfreeRequest(
              `/orders/${encodeURIComponent(
                orderId
              )}/payments`
            );

          if (
            Array.isArray(payments) &&
            payments.length
          ) {
            const successful =
              payments.find(
                (payment) =>
                  String(
                    payment.payment_status ||
                    ""
                  ).toUpperCase() ===
                  "SUCCESS"
              );

            paymentId =
              successful?.cf_payment_id ||
              payments[0]?.cf_payment_id ||
              "";
          }
        } catch (paymentError) {
          console.warn(
            "Unable to fetch Cashfree payment list:",
            paymentError.message
          );
        }

        topup.status = "Pending";
        topup.paidAt =
          topup.paidAt ||
          new Date();

        if (paymentId) {
          topup.cashfreePaymentId =
            paymentId;
        }

        await topup.save();

        const result =
          await creditTopup(
            topup,
            paymentId
          );

        return res.json({
          success: true,

          message:
            result.alreadyCredited
              ? "Wallet top-up was already credited."
              : `₹${topup.amount.toFixed(
                  2
                )} added to your wallet.`,

          walletBalance:
            result.walletBalance,

          orderId,

          paymentId,
        });
      }

      // -------------------------------------------------
      // Still pending
      // -------------------------------------------------

      if (
        ["ACTIVE", "PENDING"].includes(
          String(
            order.order_status
          ).toUpperCase()
        )
      ) {
        topup.status = "Pending";
        await topup.save();

        return res.status(202).json({
          success: false,
          pending: true,

          message:
            "Payment is still being processed. Please wait for confirmation.",

          orderId,
        });
      }

      // -------------------------------------------------
      // Failed / expired
      // -------------------------------------------------

      topup.status = "Failed";

      topup.failureReason =
        String(
          order.order_status ||
            "Payment failed"
        );

      await topup.save();

      return res.status(400).json({
        success: false,

        message:
          "Cashfree payment was not successful.",

        status:
          order.order_status,

        orderId,
      });
    } catch (error) {
      console.error(
        "CASHFREE VERIFY ERROR:",
        error.cashfree || error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Payment verification failed.",
      });
    }
  }
);

// =====================================================
// CASHFREE WEBHOOK
//
// IMPORTANT:
// This route expects req.rawBody.
// server.js must preserve raw body for this route.
// =====================================================

async function processCashfreeWebhook(
  req,
  res
) {
  try {
    const signature =
      String(
        req.headers[
          "x-webhook-signature"
        ] || ""
      );

    const timestamp =
      String(
        req.headers[
          "x-webhook-timestamp"
        ] || ""
      );

    const rawBody =
      req.rawBody ||
      (Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(""));

    if (
      !signature ||
      !timestamp ||
      !rawBody.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Incomplete Cashfree webhook.",
      });
    }

    const { secretKey } =
      getCashfreeCredentials();

    const signedPayload =
      timestamp +
      rawBody.toString("utf8");

    const expected =
      crypto
        .createHmac(
          "sha256",
          secretKey
        )
        .update(signedPayload)
        .digest("base64");

    const a =
      Buffer.from(expected);

    const b =
      Buffer.from(signature);

    if (
      a.length !== b.length ||
      !crypto.timingSafeEqual(
        a,
        b
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Cashfree webhook signature.",
      });
    }

    const payload =
      JSON.parse(
        rawBody.toString("utf8")
      );

    const orderId =
      payload?.data?.order?.order_id ||
      payload?.data?.order?.orderId ||
      payload?.order?.order_id ||
      payload?.order_id;

    const paymentId =
      payload?.data?.payment
        ?.cf_payment_id ||
      payload?.data?.payment
        ?.cfPaymentId ||
      "";

    if (!orderId) {
      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    const topup =
      await WalletTopup.findOne({
        cashfreeOrderId:
          String(orderId),
      });

    if (!topup) {
      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    const webhookPaymentStatus =
      String(
        payload?.data?.payment
          ?.payment_status ||
          ""
      ).toUpperCase();

    if (
      webhookPaymentStatus &&
      webhookPaymentStatus !==
        "SUCCESS"
    ) {
      topup.status =
        webhookPaymentStatus ===
        "FAILED"
          ? "Failed"
          : "Pending";

      if (paymentId) {
        topup.cashfreePaymentId =
          paymentId;
      }

      await topup.save();

      return res.status(200).json({
        success: true,
      });
    }

    // Always verify the order server-side.
    const order =
      await cashfreeRequest(
        `/orders/${encodeURIComponent(
          orderId
        )}`
      );

    if (
      String(
        order.order_status
      ).toUpperCase() !==
      "PAID"
    ) {
      return res.status(200).json({
        success: true,
        pending: true,
      });
    }

    if (
      Number(order.order_amount) !==
        Number(topup.amount) ||
      String(
        order.order_currency ||
        "INR"
      ) !== "INR"
    ) {
      console.error(
        "CASHFREE WEBHOOK AMOUNT MISMATCH",
        {
          orderId,
          orderAmount:
            order.order_amount,
          topupAmount:
            topup.amount,
        }
      );

      return res.status(400).json({
        success: false,
        message:
          "Payment amount mismatch.",
      });
    }

    topup.status = "Pending";

    topup.paidAt =
      topup.paidAt ||
      new Date();

    if (paymentId) {
      topup.cashfreePaymentId =
        paymentId;
    }

    await topup.save();

    await creditTopup(
      topup,
      paymentId
    );

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error(
      "CASHFREE WEBHOOK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Webhook processing failed.",
    });
  }
}

// Export webhook separately so server.js
// can register it before express.json().
router.processCashfreeWebhook =
  processCashfreeWebhook;

// =====================================================
// PVC CARD PRINTING / SERVICE PAYMENT
// ₹2 PER PDF
// =====================================================

router.post(
  "/service-payment",
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const amount =
        Number(req.body?.amount);

      const serviceName =
        String(
          req.body?.serviceName ||
            ""
        ).trim();

      const reference =
        String(
          req.body?.reference ||
            ""
        ).trim();

      if (
        !Number.isInteger(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment amount.",
        });
      }

      if (!serviceName) {
        return res.status(400).json({
          success: false,
          message:
            "Service name is required.",
        });
      }

      if (!reference) {
        return res.status(400).json({
          success: false,
          message:
            "Payment reference is required.",
        });
      }

      if (
        serviceName.toLowerCase() ===
          "pvc card printing" &&
        amount !== 2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "PVC Card Printing charge is ₹2 per PDF.",
        });
      }

      session.startTransaction();

      const existingTransaction =
        await Transaction.findOne({
          userId: req.user.id,
          reference,
          type: "debit",
          status: "Success",
        }).session(session);

      if (existingTransaction) {
        await session.commitTransaction();

        return res.json({
          success: true,
          alreadyPaid: true,
          message:
            "Payment was already completed.",
          amount:
            Number(
              existingTransaction.amount
            ),
          walletBalance:
            Number(
              existingTransaction.balanceAfter
            ),
          transactionId:
            existingTransaction._id,
        });
      }

      const user =
        await User.findById(
          req.user.id
        ).session(session);

      if (!user) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message:
            "User account not found.",
        });
      }

      const balanceBefore =
        Number(
          user.walletBalance || 0
        );

      if (
        balanceBefore < amount
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          code:
            "INSUFFICIENT_WALLET_BALANCE",
          message:
            `Insufficient wallet balance. Required ₹${amount}. Available ₹${balanceBefore}.`,
          walletBalance:
            balanceBefore,
        });
      }

      const balanceAfter =
        balanceBefore - amount;

      const transaction =
        await Transaction.create(
          [
            {
              userId: user._id,

              type: "debit",

              amount,

              balanceBefore,

              balanceAfter,

              serviceName,

              reference,

              providerReference:
                `SERVICE-${reference}`,

              status: "Success",

              description:
                `${serviceName} payment`,

              createdBy: user._id,
            },
          ],
          { session }
        );

      user.walletBalance =
        balanceAfter;

      await user.save({
        session,
      });

      await session.commitTransaction();

      return res.json({
        success: true,

        message:
          `₹${amount} payment successful.`,

        amount,

        walletBalance:
          balanceAfter,

        transactionId:
          transaction[0]._id,

        reference,

        serviceName,
      });
    } catch (error) {
      await session.abortTransaction();

      console.error(
        "SERVICE WALLET PAYMENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to process wallet payment.",
      });
    } finally {
      await session.endSession();
    }
  }
);

module.exports = router;
module.exports.processCashfreeWebhook =
  processCashfreeWebhook;