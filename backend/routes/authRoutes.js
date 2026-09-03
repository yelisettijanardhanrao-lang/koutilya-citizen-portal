const express = require("express");

const router = express.Router();

const {
  register,
  login,
  changePassword,
} = require("../controllers/authController");

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Change password
router.post("/change-password", changePassword);

module.exports = router;