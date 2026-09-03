const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =====================================================
// REGISTER
// =====================================================

exports.register = async (req, res) => {
  try {
    const {
      fullName,
      mobile,
      email,
      password,
    } = req.body;

    if (!fullName || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, mobile and password are required",
      });
    }

    const normalizedMobile = String(mobile).trim();
    const normalizedEmail = email
      ? String(email).trim().toLowerCase()
      : undefined;

    // Check mobile
    const existingMobile = await User.findOne({
      mobile: normalizedMobile,
    });

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    // Check email only when supplied
    if (normalizedEmail) {
      const existingEmail = await User.findOne({
        email: normalizedEmail,
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: String(fullName).trim(),
      mobile: normalizedMobile,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    return res.status(201).json({
      success: true,
      message: "Registration Successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

// =====================================================
// LOGIN
// =====================================================

exports.login = async (req, res) => {
  try {
    const {
      mobile,
      email,
      password,
    } = req.body;

    const loginId = String(mobile || email || "").trim();

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile/email and password required",
      });
    }

    const user = await User.findOne({
      $or: [
        {
          mobile: loginId,
        },
        {
          email: loginId.toLowerCase(),
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const jwtSecret =
      process.env.JWT_SECRET || "adangal_secret";

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

// =====================================================
// CHANGE PASSWORD
// =====================================================

exports.changePassword = async (req, res) => {
  try {
    const {
      userId,
      currentPassword,
      newPassword,
    } = req.body;

    if (
      !userId ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User ID, current password and new password are required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password incorrect",
      });
    }

    user.password = await bcrypt.hash(
      newPassword,
      10
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to change password",
    });
  }
};