const express = require("express");

const router = express.Router();

const applicationController = require("../controllers/applicationController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// CREATE APPLICATION
router.post(
  "/",
  authMiddleware,
  applicationController.saveApplication
);

// ADMIN: GET ALL APPLICATIONS
// Keep both /all and / for compatibility with existing frontend versions.
router.get(
  "/all",
  authMiddleware,
  adminMiddleware,
  applicationController.getAllApplications
);

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  applicationController.getAllApplications
);

// ADMIN DASHBOARD STATS - MUST COME BEFORE /:id
router.get(
  "/dashboard/stats",
  authMiddleware,
  adminMiddleware,
  applicationController.getDashboardStats
);

// USER: GET MY APPLICATIONS
router.get(
  "/user/:userId",
  authMiddleware,
  applicationController.getMyApplications
);

// Compatibility alias used by an older frontend build.
router.get(
  "/my/:userId",
  authMiddleware,
  applicationController.getMyApplications
);

// PAYMENT + PDF
router.post(
  "/:id/payment",
  authMiddleware,
  applicationController.markPaymentSuccess
);

// Compatibility alias used by the previous Payment.jsx build.
router.put(
  "/pay/:id",
  authMiddleware,
  applicationController.markPaymentSuccess
);

// UPDATE APPLICATION STATUS - ADMIN ONLY
router.put(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  applicationController.updateApplicationStatus
);

// GET SINGLE APPLICATION
router.get(
  "/:id",
  authMiddleware,
  applicationController.getApplicationById
);

module.exports = router;
