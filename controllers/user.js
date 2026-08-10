const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/userModel");
const Business = require("../models/businessModel");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const cloudinary = require("../config/cloudinary");

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
      response: otp,
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

const sendAuthResponse = (res, user, message) => {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    status: true,
    message,
    response: {
      user,
      hasBusiness: !!user.business,
      token,
    },
  });
};

const createAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: "Validation errors",
        response: errors.array(),
      });
    }

    const { name, email, password } = req.body;

    let user = await User.findOne({ email });

    // Existing user (Login flow)
    if (user) {
      if (!user.password) {
        return res.status(400).json({
          status: false,
          message: "No password set for this user",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          status: false,
          message: "Incorrect password",
        });
      }

      return sendAuthResponse(res, user, "Login successful");
    }

    // New user (Signup flow)
    const hashedPassword = await bcrypt.hash(password, 10);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      is_verified: true,
      plan: {
        name: "free",
        start_date: new Date(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        is_active: true,
      },
    });

    return sendAuthResponse(res, user, "Account created successfully");
  } catch (error) {
    console.log("createAccount error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (user) {
      if (user.provider !== "google") {
        return res.status(400).json({
          status: false,
          message: `Please login using email and password`,
        });
      }
      return sendAuthResponse(res, user, "Login successful");
    }

    user = await User.create({
      email,
      name,
      googleId,
      profilePic: picture,
      provider: "google",
      is_verified: true,
      plan: {
        name: "free",
        start_date: new Date(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        is_active: true,
      },
    });

    return sendAuthResponse(res, user, "Account created successfully");
  } catch (error) {
    console.log("googleLogin error:", error);
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
      response: { user, hasBusiness: !!user.business },
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
      response: { user, hasBusiness: !!user.business },
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

    const user = await User.findById(id).select("-password -provider");

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Naya image aaya hai to
    if (req.file) {
      // Purani image ko Cloudinary se delete karo
      if (user.imagePublicId) {
        await cloudinary.uploader.destroy(user.imagePublicId);
      }

      updates.image = req.file.path; // Cloudinary secure URL
      updates.imagePublicId = req.file.filename; // Cloudinary public_id (delete ke liye zaroori)
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
  res.clearCookie("token", {
    httpOnly: true,
    secure: false, // production me true
    sameSite: "lax",
  });
  return res.json({ status: true, message: "Logged out" });
};

module.exports = {
  sendOTP,
  verifyOTP,
  verifyPin,
  createAgent,
  updateUser,
  getUserById,
  removeAgent,
  logoutUser,
  createAccount,
  googleLogin,
};
