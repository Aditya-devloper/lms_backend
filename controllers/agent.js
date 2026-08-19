const fs = require("fs");
const path = require("path");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Agent = require("../models/agentModel");
const Business = require("../models/businessModel");

const SALT_ROUNDS = 10;

const PERMISSION_MODULES = {
  leads: ["view", "add", "edit", "delete"],
  calls: ["view", "add", "edit", "delete"],
  chat: ["view", "add", "edit", "delete"],
  billing: ["view"],
};

function sanitizePermissions(input = {}) {
  const clean = {};
  for (const [mod, actions] of Object.entries(PERMISSION_MODULES)) {
    clean[mod] = {};
    for (const action of actions) {
      if (input?.[mod]?.[action] !== undefined) {
        clean[mod][action] = !!input[mod][action];
      }
    }
  }
  return clean;
}

const createAgent = async (req, res) => {
  try {
    const { name, email, phone, password, businessId, permissions } = req.body;

    if (!name || !email || !password || !businessId) {
      return res.status(400).json({
        status: false,
        message: "name, email, password and businessId are required",
      });
    }

    const business = await Business.findOne({
      _id: businessId,
      owner: req.user._id,
    });
    if (!business) {
      return res.status(403).json({
        status: false,
        message: "You don't have access to this business",
      });
    }

    const existing = await Agent.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        status: false,
        message: "An agent with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const agent = await Agent.create({
      name,
      email: email.toLowerCase(),
      phone,
      image: req.file ? req.file.filename : undefined,
      password: hashedPassword,
      business: businessId,
      created_by: req.user._id,
      permissions: sanitizePermissions(permissions),
      status: "active",
    });

    const { password: _pw, ...agentSafe } = agent.toObject();

    return res.status(201).json({
      status: true,
      message: "Agent created successfully",
      response: agentSafe,
    });
  } catch (error) {
    console.log("createAgent error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAgents = async (req, res) => {
  try {
    const businessId = req.user?.business;

    if (!businessId) {
      return res
        .status(400)
        .json({ status: false, message: "businessId is required" });
    }

    const business = await Business.findOne({
      _id: businessId,
      owner: req.user._id,
    });
    if (!business) {
      return res.status(403).json({
        status: false,
        message: "You don't have access to this business",
      });
    }

    const agents = await Agent.find({ business: businessId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      status: true,
      message: "Agents fetched successfully",
      response: agents,
    });
  } catch (error) {
    console.log("getAgents error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).populate(
      "business",
      "name owner",
    );
    if (!agent) {
      return res
        .status(404)
        .json({ status: false, message: "Agent not found" });
    }
    if (String(agent.business.owner) !== String(req.user._id)) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    return res.status(200).json({
      status: true,
      message: "Agent fetched successfully",
      response: agent,
    });
  } catch (error) {
    console.log("getAgentById error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateAgent = async (req, res) => {
  try {
    const { id } = req.body;
    const agent = await Agent.findById(id).populate("business", "owner");
    if (!agent) {
      return res
        .status(404)
        .json({ status: false, message: "Agent not found" });
    }
    if (String(agent.business.owner) !== String(req.user._id)) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    const { name, phone, permissions, status, password } = req.body;

    if (name !== undefined) agent.name = name;
    if (phone !== undefined) agent.phone = phone;
    if (status !== undefined && ["active", "disabled"].includes(status)) {
      agent.status = status;
    }
    if (permissions !== undefined) {
      const clean = sanitizePermissions(permissions);
      for (const mod of Object.keys(clean)) {
        agent.permissions[mod] = {
          ...agent.permissions[mod].toObject(),
          ...clean[mod],
        };
      }
    }
    if (password) {
      agent.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (req.file) {
      if (agent.image) {
        const oldImagePath = path.join(
          __dirname,
          "../uploads/agents",
          agent.image,
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      agent.image = req.file.filename;
    }

    await agent.save();

    const { password: _pw, ...agentSafe } = agent.toObject();

    return res.status(200).json({
      status: true,
      message: "Agent updated successfully",
      response: agentSafe,
    });
  } catch (error) {
    console.log("updateAgent error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).populate(
      "business",
      "owner",
    );
    if (!agent) {
      return res
        .status(404)
        .json({ status: false, message: "Agent not found" });
    }
    if (String(agent.business.owner) !== String(req.user._id)) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    agent.status = "disabled";
    await agent.save();

    return res.status(200).json({
      status: true,
      message: "Agent disabled successfully",
      response: { _id: agent._id, status: agent.status },
    });
  } catch (error) {
    console.log("deleteAgent error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Agent: login
const agentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, message: "Email and password are required" });
    }

    const agent = await Agent.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );
    if (!agent) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid credentials" });
    }

    if (agent.status !== "active") {
      return res.status(403).json({
        status: false,
        message:
          agent.status === "disabled"
            ? "This account has been disabled"
            : "This account hasn't been activated yet",
      });
    }

    const match = await bcrypt.compare(password, agent.password);
    if (!match) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid password" });
    }

    agent.last_login = new Date();
    await agent.save();

    const token = jwt.sign(
      { user_type: "agent", agentId: agent._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const { password: _pw, ...agentSafe } = agent.toObject();

    return res.status(200).json({
      status: true,
      message: "Login successful",
      response: { token, agent: agentSafe },
    });
  } catch (error) {
    console.log("agentLogin error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getMyAgentProfile = async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      message: "Profile fetched successfully",
      response: req.user,
    });
  } catch (error) {
    console.log("getMyAgentProfile error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  agentLogin,
  getMyAgentProfile,
};
