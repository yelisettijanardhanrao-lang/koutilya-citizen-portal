const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const Service = require("../models/Service");

router.use(authMiddleware, adminMiddleware);

function cleanList(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function servicePayload(body = {}) {
  return {
    code: String(body.code || "").trim().toUpperCase(),
    name: String(body.name || "").trim(),
    description: String(body.description || "").trim(),
    category: String(body.category || "General").trim(),
    fee: Number(body.fee || 0),
    icon: String(body.icon || "📄").trim(),
    route: String(body.route || "").trim(),
    fields: cleanList(body.fields),
    documents: cleanList(body.documents),
    active: body.active !== false,
  };
}

router.get("/", async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, services });
  } catch (error) {
    console.error("ADMIN SERVICES GET ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load services." });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = servicePayload(req.body);

    if (!payload.code || !payload.name) {
      return res.status(400).json({ success: false, message: "Service code and name are required." });
    }
    if (!Number.isFinite(payload.fee) || payload.fee < 0) {
      return res.status(400).json({ success: false, message: "Enter a valid service fee." });
    }

    const service = await Service.create(payload);
    res.status(201).json({ success: true, service, message: "Service created successfully." });
  } catch (error) {
    console.error("ADMIN SERVICE CREATE ERROR:", error);
    const message = error.code === 11000 ? "Service code already exists." : (error.message || "Unable to create service.");
    res.status(400).json({ success: false, message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid service ID." });
    }

    const payload = servicePayload(req.body);
    if (!payload.code || !payload.name) {
      return res.status(400).json({ success: false, message: "Service code and name are required." });
    }

    const service = await Service.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!service) return res.status(404).json({ success: false, message: "Service not found." });

    res.json({ success: true, service, message: "Service updated successfully." });
  } catch (error) {
    console.error("ADMIN SERVICE UPDATE ERROR:", error);
    const message = error.code === 11000 ? "Service code already exists." : (error.message || "Unable to update service.");
    res.status(400).json({ success: false, message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid service ID." });
    }
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { active: req.body?.active === true },
      { new: true, runValidators: true }
    ).lean();

    if (!service) return res.status(404).json({ success: false, message: "Service not found." });

    res.json({ success: true, service });
  } catch (error) {
    console.error("ADMIN SERVICE STATUS ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update service status." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid service ID." });
    }
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found." });
    res.json({ success: true, message: "Service deleted successfully." });
  } catch (error) {
    console.error("ADMIN SERVICE DELETE ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to delete service." });
  }
});

module.exports = router;
