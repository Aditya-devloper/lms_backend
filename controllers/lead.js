const Lead = require("../models/leadModel");
const { validationResult } = require("express-validator");

const createLead = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: "Validation Error",
        response: errors.array(),
      });
    }

    // const business_id = req.user.business;
    const {
      name,
      email,
      phone,
      status,
      source,
      follow_up_date,
      assigned_to,
      business_id,
    } = req.body;

    const newLead = await Lead.create({
      name,
      email,
      phone,
      status,
      source,
      follow_up_date,
      assigned_to,
      business: business_id,
    });

    return res.status(201).json({
      status: true,
      message: "Lead created successfully",
      response: newLead,
    });
  } catch (error) {
    console.log("createLead error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const getLeads = async (req, res) => {
  try {
    const {
      status,
      name,
      email,
      phone,
      source,
      assigned_to,
      page = 1,
      limit = 10,
    } = req.body;

    let query = {};
    query.is_deleted = false;

    if (name) query.name = { $regex: name, $options: "i" };
    if (email) query.email = { $regex: email, $options: "i" };
    if (status) query.status = status;
    if (phone) query.phone = phone;
    if (source) query.source = source;
    if (assigned_to) query.assigned_to = assigned_to;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const totalLeads = await Lead.countDocuments(query);

    const leads = await Lead.find(query)
      .populate("assigned_to", "name email")
      .populate("business", "name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Leads fetched successfully",
      response: leads,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalLeads / limit),
        totalLeads,
      },
    });
  } catch (error) {
    console.log("getLeads error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return res.status(200).json({
      status: true,
      message: "Lead updated successfully",
      response: updatedLead,
    });
  } catch (error) {
    console.log("updateLead error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    await Lead.findByIdAndUpdate(id, { is_deleted: true });
    return res.status(200).json({
      status: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.log("deleteLead error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id)
      .populate("assigned_to", "name email")
      .populate("business", "name");

    if (!lead || lead.is_deleted) {
      return res.status(404).json({
        status: false,
        message: "Lead not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Lead fetched successfully",
      response: lead,
    });
  } catch (error) {
    console.log("getLeadById error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

module.exports = { createLead, getLeads, updateLead, deleteLead, getLeadById };
