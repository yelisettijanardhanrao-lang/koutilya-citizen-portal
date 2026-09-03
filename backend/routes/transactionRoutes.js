const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const Transaction = require("../models/Transaction");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("GET TRANSACTIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to load transactions.",
    });
  }
});

module.exports = router;
