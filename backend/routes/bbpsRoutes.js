const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const BbpsConfig = require("../models/BbpsConfig");
const BbpsOperator = require("../models/BbpsOperator");

const PAY2ALL_BASE_URL = String(process.env.PAY2ALL_BASE_URL || "https://pay2all.in/api/v1").replace(/\/$/, "");

function apiKey() {
  return String(process.env.PAY2ALL_API_KEY || process.env.BBPS_API_KEY || "").trim();
}

async function pay2allFetch(path, options = {}) {
  const key = apiKey();
  if (!key) throw new Error("PAY2ALL_API_KEY (or BBPS_API_KEY) is not configured on the backend.");

  const response = await fetch(`${PAY2ALL_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!response.ok || data?.status_id === 2) {
    const err = new Error(data?.message || data?.error || `Pay2All returned HTTP ${response.status}`);
    err.status = response.status || 502;
    err.provider = data;
    throw err;
  }

  return data;
}

async function getConfig() {
  let config = await BbpsConfig.findOne();
  if (!config) config = await BbpsConfig.create({ provider: "pay2all" });
  if (config.provider !== "pay2all") { config.provider = "pay2all"; await config.save(); }
  return config;
}

function unwrapData(data) {
  return data?.data ?? data;
}

function extractBillers(data) {
  const payload = unwrapData(data);
  const candidates = [
    payload?.billers,
    payload?.rows,
    payload?.operators,
    payload?.results,
    payload,
  ];
  return candidates.find(Array.isArray) || [];
}

function normalizeBiller(item) {
  const billerId = item?.billerId ?? item?.biller_id ?? item?.id ?? item?.code ?? item?.operatorId;
  if (billerId === undefined || billerId === null || String(billerId).trim() === "") return null;

  const category = String(
    item?.category ?? item?.categoryName ?? item?.category_name ?? item?.service ?? item?.serviceName ?? "Other"
  ).trim() || "Other";
  const name = String(item?.name ?? item?.billerName ?? item?.biller_name ?? item?.operatorName ?? item?.operator_name ?? billerId).trim();
  const state = String(item?.state ?? item?.stateName ?? "").trim();

  return {
    operatorId: String(billerId),
    name,
    category,
    state,
    raw: item,
    active: true,
  };
}

// =====================================================
// ADMIN: BBPS CONTROL CENTER (PAY2ALL)
// =====================================================
const admin = express.Router();
admin.use(authMiddleware, adminMiddleware);

admin.get("/config", async (req, res) => {
  try {
    const config = await getConfig();
    res.json({
      success: true,
      configured: Boolean(apiKey()),
      provider: "Pay2All",
      baseUrl: PAY2ALL_BASE_URL,
      config,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

admin.patch("/config", async (req, res) => {
  try {
    const config = await getConfig();
    config.active = req.body?.active === true;
    await config.save();
    res.json({ success: true, config, message: config.active ? "BBPS enabled for users." : "BBPS disabled for users." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

admin.post("/test", async (req, res) => {
  try {
    const data = await pay2allFetch("/balance");
    const config = await getConfig();
    const payload = unwrapData(data);
    const numericBalance = Number(payload?.balance ?? data?.balance ?? NaN);
    config.lastTestedAt = new Date();
    config.lastTestStatus = "Connected";
    if (Number.isFinite(numericBalance)) config.lastBalance = numericBalance;
    await config.save();
    res.json({ success: true, message: "Pay2All API connection successful.", balance: Number.isFinite(numericBalance) ? numericBalance : null, providerResponse: data });
  } catch (error) {
    const config = await getConfig();
    config.lastTestedAt = new Date();
    config.lastTestStatus = "Failed";
    await config.save();
    res.status(error.status || 502).json({ success: false, message: error.message, providerResponse: error.provider || null });
  }
});

admin.post("/operators/sync", async (req, res) => {
  try {
    const data = await pay2allFetch("/bbps/billers");
    const list = extractBillers(data);
    if (!Array.isArray(list)) throw new Error("Unexpected biller-list response from Pay2All.");

    let synced = 0;
    for (const item of list) {
      const normalized = normalizeBiller(item);
      if (!normalized) continue;
      await BbpsOperator.findOneAndUpdate(
        { operatorId: normalized.operatorId },
        normalized,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      synced += 1;
    }

    const config = await getConfig();
    config.operatorCount = await BbpsOperator.countDocuments({});
    config.lastOperatorSyncAt = new Date();
    await config.save();

    res.json({ success: true, synced, operatorCount: config.operatorCount, providerResponse: data });
  } catch (error) {
    res.status(error.status || 502).json({ success: false, message: error.message, providerResponse: error.provider || null });
  }
});

admin.get("/operators", async (req, res) => {
  try {
    const operators = await BbpsOperator.find({}).sort({ category: 1, name: 1 }).lean();
    res.json({ success: true, operators });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

admin.patch("/operators/:operatorId", async (req, res) => {
  try {
    const operatorId = String(req.params.operatorId || "").trim();
    if (!operatorId) return res.status(400).json({ success: false, message: "Invalid biller ID." });
    const operator = await BbpsOperator.findOneAndUpdate(
      { operatorId },
      { active: req.body?.active === true },
      { new: true }
    );
    if (!operator) return res.status(404).json({ success: false, message: "BBPS biller not found." });
    res.json({ success: true, operator, message: operator.active ? "Biller enabled for users." : "Biller disabled for users." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

admin.patch("/operators/category/:category", async (req, res) => {
  try {
    const category = String(req.params.category || "").trim();
    if (!category) return res.status(400).json({ success: false, message: "Category is required." });
    const active = req.body?.active === true;
    const result = await BbpsOperator.updateMany({ category }, { $set: { active } });
    res.json({ success: true, updated: result.modifiedCount ?? result.nModified ?? 0, category, active, message: active ? `${category} services enabled for users.` : `${category} services disabled for users.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

admin.get("/categories", async (req, res) => {
  try {
    const rows = await BbpsOperator.aggregate([
      { $group: { _id: { $cond: [{ $eq: [{ $trim: { input: "$category" } }, ""] }, "Other", { $trim: { input: "$category" } }] }, total: { $sum: 1 }, active: { $sum: { $cond: ["$active", 1, 0] } } } },
      { $project: { _id: 0, category: "$_id", total: 1, active: 1 } },
      { $sort: { category: 1 } }
    ]);
    res.json({ success: true, categories: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================
// USER: READ BBPS CONFIG / BILLERS + BILL FETCH + PAY
// =====================================================
router.use(authMiddleware);

router.get("/config", async (req, res) => {
  try {
    const config = await getConfig();
    res.json({
      success: true,
      enabled: config.active && Boolean(apiKey()),
      name: config.name,
      provider: "Pay2All",
      operatorCount: config.operatorCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/operators", async (req, res) => {
  try {
    const config = await getConfig();
    if (!config.active) return res.status(403).json({ success: false, message: "BBPS is currently disabled." });
    const operators = await BbpsOperator.find({ active: true }).sort({ category: 1, name: 1 }).lean();
    res.json({ success: true, operators });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/view-bill", async (req, res) => {
  try {
    const config = await getConfig();
    if (!config.active) return res.status(403).json({ success: false, message: "BBPS is currently disabled." });

    const billerId = String(req.body?.billerId ?? req.body?.operatorId ?? "").trim();
    const params = req.body?.params && typeof req.body.params === "object" ? req.body.params : {};
    const connectionNumber = String(req.body?.connectionNumber || "").trim();
    if (!billerId) return res.status(400).json({ success: false, message: "Biller is required." });
    if (!Object.keys(params).length && !connectionNumber) return res.status(400).json({ success: false, message: "Consumer / connection number is required." });

    const biller = await BbpsOperator.findOne({ operatorId: billerId, active: true }).lean();
    if (!biller) return res.status(404).json({ success: false, message: "Selected BBPS biller is not enabled." });

    const requestParams = Object.keys(params).length ? params : { consumerNumber: connectionNumber };
    const data = await pay2allFetch("/bbps/fetch-bill", {
      method: "POST",
      body: JSON.stringify({ billerId, params: requestParams }),
    });

    res.json({ success: true, bill: data, biller, params: requestParams });
  } catch (error) {
    res.status(error.status || 502).json({ success: false, message: error.message, providerResponse: error.provider || null });
  }
});

router.post("/pay", async (req, res) => {
  try {
    const config = await getConfig();
    if (!config.active) return res.status(403).json({ success: false, message: "BBPS is currently disabled." });

    const billerId = String(req.body?.billerId || "").trim();
    const amount = Number(req.body?.amount);
    const params = req.body?.params && typeof req.body.params === "object" ? req.body.params : {};
    if (!billerId || !Number.isFinite(amount) || amount <= 0 || !Object.keys(params).length) {
      return res.status(400).json({ success: false, message: "Biller, valid amount and biller parameters are required." });
    }

    const biller = await BbpsOperator.findOne({ operatorId: billerId, active: true }).lean();
    if (!biller) return res.status(404).json({ success: false, message: "Selected BBPS biller is not enabled." });

    const reference = String(req.body?.reference || `KCS-BBPS-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`).slice(0, 64);
    const data = await pay2allFetch("/bbps/pay", {
      method: "POST",
      body: JSON.stringify({ billerId, amount, params, reference }),
    });

    res.json({ success: true, payment: data, reference });
  } catch (error) {
    res.status(error.status || 502).json({ success: false, message: error.message, providerResponse: error.provider || null });
  }
});

module.exports = { router, admin };
