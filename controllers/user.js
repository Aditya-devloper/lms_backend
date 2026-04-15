const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const User = require("../models/userModel");
const Business = require("../models/businessModel");

const sendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: "Validation errors",
        response: errors.array(),
      });
    }
    const { email } = req.body;
    let user = await User.findOne({ email });

    if (user && user?.pin) {
      return res.status(400).json({
        status: false,
        message: "Enter your pin to login",
        response: { pin: true },
      });
    }

    if (!user) user = await User.create({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.otp = otp;
    user.otp_expiry = otp_expiry;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "OTP sent to your email",
      response: otp
    });
  } catch (error) {
    console.log("sendOTP error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        status: false,
        message: "Please provide valid email or otp",
      });
    }
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.otp_expiry < new Date()) {
      return res.status(400).json({
        status: false,
        message: "OTP expired",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }


    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    user = await User.findByIdAndUpdate(
      user._id,
      {
        $set: { is_verified: true },
        $unset: { otp: 1, otp_expiry: 1 },
      },
      { new: true },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // production me true
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: true,
      message: "Login successful",
      response: user,
    });
  } catch (error) {
    console.error("verifyOTP error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const verifyPin = async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      return res.status(400).json({
        status: false,
        message: "Please provide valid email or pin",
      });
    }
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);

    if (!isMatch) {
      return res.status(400).json({
        status: false,
        message: "Invalid Pin",
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // production me true
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: true,
      message: "Login successful",
      response: user,
    });
  } catch (error) {
    console.log("verifyPin error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const createAgent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: "Validation errors",
        response: errors.array(),
      });
    }
    const owner = req.user;
    const { name, email, phone, user_type } = req.body;

    const image = req.file ? req.file.filename : null;

    const agent = await User.create({
      name,
      email,
      phone,
      user_type,
      image,
      business: owner.business,
    });

    return res.status(201).json({
      status: true,
      message: "Agent created successfully",
      response: agent,
    });
  } catch (error) {
    console.log("createAgent error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        status: false,
        message: "Email is already taken",
        response: error.message,
      });
    }
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate("business", "business_name")
      .select("-pin -otp");

    return res.status(200).json({
      status: true,
      message: "User get success",
      response: user,
    });
  } catch (error) {
    console.log("getUserById error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const removeAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (user?.image) {
      const imagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "users",
        user.image,
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath, (err) => {
          if (err) {
            console.log("Error deleting image:", err);
          }
        });
      }
    }

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "Can't remove agent",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Agent deleted successfully",
    });
  } catch (error) {
    console.log("removeAgent error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    if (updates?.pin) {
      const hashedPin = await bcrypt.hash(updates.pin, 10);
      updates.pin = hashedPin;
    }

    const newImage = req.file ? req.file.filename : null;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (newImage && user.image) {
      const oldImagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "users",
        user.image,
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }

      updates.image = newImage;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
    });

    return res.status(200).json({
      status: true,
      message: "User updated successfully",
      response: updatedUser,
    });
  } catch (error) {
    console.log("updateUser", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("token");
  return res.json({ status: true, message: "Logged out" });
}

module.exports = {
  sendOTP,
  verifyOTP,
  verifyPin,
  createAgent,
  updateUser,
  getUserById,
  removeAgent,
  logoutUser
};
