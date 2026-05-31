const Lead = require("../models/leadModel");
const LeadActivity = require("../models/leadActivityModel");
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

    const userId = req.user._id;
    const business_id = req.user.business;

    const { name, email, phone, status, source, follow_up_date, assigned_to } =
      req.body;

    const newLead = await Lead.create({
      created_by: userId,
      name,
      email,
      phone,
      status,
      source,
      follow_up_date,
      assigned_to: userId,
      business: business_id,
    });

    // Create a lead activity record
    await LeadActivity.create({
      lead: newLead._id,
      created_by: userId,
      business: business_id,
      activity_type: "lead_created",
      description: `Lead "${newLead.name}" created`,
    });

    return res.status(201).json({
      status: true,
      message: "Lead created successfully",
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
    const userId = req.user._id;
    const {
      status,
      search,
      source,
      assigned_to,
      from,
      to,
      date_type,
      page = 1,
      limit = 10,
    } = req.body;

    let query = {
      created_by: userId,
      is_deleted: false,
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;
    if (source) query.source = source;
    if (assigned_to) query.assigned_to = assigned_to;

    const now = new Date();

    switch (date_type) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "last30days": {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: start, $lte: now };
        break;
      }

      case "last60days": {
        const start = new Date();
        start.setDate(start.getDate() - 60);
        start.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: start, $lte: now };
        break;
      }

      case "custom": {
        if (from && to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          query.createdAt = { $gte: new Date(from), $lte: new Date(toDate) };
        }
        break;
      }

      default:
        break;
    }

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
    const updateData = req.body;

    const oldLead = await Lead.findById(updateData?.id);

    if (!oldLead) {
      return res.status(404).json({
        status: false,
        message: "Lead not found",
      });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      updateData?.id,
      updateData,
    );

    // status change activity
    if (updateData.status && updateData.status !== oldLead.status) {
      await LeadActivity.create({
        lead: oldLead._id,
        business: oldLead.business,
        created_by: req.user._id,
        activity_type: "status_changed",
        description: `Status changed from ${oldLead.status} to ${updateData.status}`,
        metadata: {
          from: oldLead.status,
          to: updateData.status,
        },
      });
    }

    // follow up added activity
    if (
      updateData.follow_up_date &&
      new Date(updateData.follow_up_date).getTime() !==
        new Date(oldLead.follow_up_date).getTime()
    ) {
      await LeadActivity.create({
        lead: oldLead._id,
        business: oldLead.business,
        created_by: req.user._id,
        activity_type: "followup_added",
        description: "Follow up date updated",
        metadata: {
          from: oldLead.follow_up_date,
          to: updateData.follow_up_date,
        },
      });
    }

    // assigned to changed activity
    if (
      updateData.assigned_to &&
      updateData.assigned_to.toString() !== oldLead.assigned_to?.toString()
    ) {
      await LeadActivity.create({
        lead: oldLead._id,
        business: oldLead.business,
        created_by: req.user._id,
        activity_type: "assigned",
        description: `Lead assigned to ${updateData.assigned_to}`,
        metadata: {
          from: oldLead.assigned_to,
          to: updateData.assigned_to,
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: "Lead updated successfully",
      // response: updatedLead,
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
    const lead = await Lead.findById(id).populate("assigned_to", "name email");
    // .populate("business", "name");

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

// lead activity
const getLeadActivity = async (req, res) => {
  try {
    const { lead_id } = req.body;
    const lead = await Lead.findById(lead_id);

    if (!lead || lead.is_deleted) {
      return res.status(404).json({
        status: false,
        message: "Lead not found",
      });
    }

    const activities = await LeadActivity.find({ lead: lead_id })
      .populate("created_by", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Lead activities fetched successfully",
      response: { lead, activities },
    });
  } catch (error) {
    console.log("getLeadActivity error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

module.exports = {
  createLead,
  getLeads,
  updateLead,
  deleteLead,
  getLeadById,
  getLeadActivity,
};
