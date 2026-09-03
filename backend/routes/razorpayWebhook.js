const crypto = require("crypto");
const WalletTopup = require("../models/WalletTopup");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

function safeEqualHex(expected, received) {
  if (!expected || !received) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function creditFromWebhook(topup, payment) {
  if (topup.credited) return;

  const user = await User.findById(topup.userId);
  if (!user) throw new Error("User account not found.");

  const reference = `RZP-TOPUP-${topup.razorpayOrderId}`;
  const existing = await Transaction.findOne({ providerReference: reference }).lean();
  if (existing) {
    topup.credited = true;
    topup.status = "Paid";
    topup.creditedAt = topup.creditedAt || new Date();
    topup.paidAt = topup.paidAt || new Date();
    await topup.save();
    return;
  }

  const before = Number(user.walletBalance || 0);
  const after = before + Number(topup.amount);
  user.walletBalance = after;
  await user.save();

  try {
    await Transaction.create({
      userId: user._id,
      type: "credit",
      amount: Number(topup.amount),
      balanceBefore: before,
      balanceAfter: after,
      serviceName: "Wallet Top-up",
      reference,
      providerReference: reference,
      status: "Success",
      description: `Razorpay wallet top-up (${payment.id})`,
      createdBy: user._id,
    });
  } catch (error) {
    user.walletBalance = before;
    await user.save();
    throw error;
  }

  topup.credited = true;
  topup.status = "Paid";
  topup.paidAt = topup.paidAt || new Date();
  topup.creditedAt = new Date();
  await topup.save();
}

module.exports = async function razorpayWebhook(req, res) {
  try {
    const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
    if (!secret) return res.status(503).json({ success: false, message: "Razorpay webhook secret is not configured." });

    const signature = String(req.headers["x-razorpay-signature"] || "");
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!safeEqualHex(expected, signature)) return res.status(400).json({ success: false, message: "Invalid webhook signature." });

    const payload = JSON.parse(rawBody.toString("utf8"));
    if (payload.event !== "payment.captured") return res.status(200).json({ success: true, ignored: true });

    const payment = payload.payload?.payment?.entity;
    const orderId = payment?.order_id;
    if (!payment?.id || !orderId) return res.status(400).json({ success: false, message: "Incomplete payment webhook." });

    const topup = await WalletTopup.findOne({ razorpayOrderId: orderId });
    if (!topup) return res.status(200).json({ success: true, ignored: true });

    if (Number(payment.amount) !== Number(topup.amountPaise) || String(payment.currency || "INR") !== "INR") {
      return res.status(400).json({ success: false, message: "Webhook payment does not match the top-up amount." });
    }

    topup.razorpayPaymentId = payment.id;
    topup.status = "Pending";
    topup.paidAt = topup.paidAt || new Date();
    await topup.save();

    await creditFromWebhook(topup, payment);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("RAZORPAY WEBHOOK ERROR:", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed." });
  }
};
