const fs = require("fs");
const { Readable } = require("stream");
const { json2csv } = require("json-2-csv");
const moment = require("moment");
const csv = require("csv-parser");

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

    let { name, email, phone, status, source, follow_up_date } = req.body;

    if (follow_up_date) {
      follow_up_date = new Date(`${follow_up_date}T00:00:00`);
    }

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
      message: "Can't create lead, Please try again",
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
      // .populate("assigned_to", "name email")
      // .populate("business", "name")
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
    let updateData = req.body;

    const oldLead = await Lead.findById(updateData?.id);

    if (!oldLead) {
      return res.status(404).json({
        status: false,
        message: "Lead not found",
      });
    }

    if (updateData?.follow_up_date) {
      updateData.follow_up_date = new Date(
        `${updateData.follow_up_date}T00:00:00`,
      );
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

// export
const exportLeads = async (req, res) => {
  try {
    console.log("exports hitt..");

    const userId = req.user._id;
    const { status, search, source, assigned_to, from, to, date_type } =
      req.body;

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

    const leads = await Lead.find(query)
      .populate("assigned_to", "name email")
      .sort({ createdAt: -1 });

    console.log("exports leads:", leads);

    const leadsData = leads.map((lead) => ({
      Name: lead?.name || "",
      Email: lead?.email || "",
      Phone: lead?.phone || "",
      Status: lead?.status || "",
      Source: lead?.source || "",
      // assigned_to: lead.assigned_to ? lead.assigned_to.name : "",
      "Follow Up Date": lead?.follow_up_date
        ? moment(lead.follow_up_date).format("DD MMM YYYY")
        : "",
      "Created At": moment(lead?.createdAt).format("DD MMM YYYY"),
    }));

    const csvData = await json2csv(leadsData);

    console.log("exports csvData:", csvData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=leads_${Date.now()}.csv`,
    );

    return res.send(csvData);
  } catch (error) {
    console.log("exportLeads error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

// bulk upload
const uploadLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "CSV file is required",
      });
    }

    const userId = req.user._id;
    const businessId = req.user.business;

    const rows = [];

    await new Promise((resolve, reject) => {
      Readable.from(req.file.buffer)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    if (!rows.length) {
      return res.status(400).json({
        status: false,
        message: "CSV is empty",
      });
    }

    if (rows.length > 500) {
      return res.status(400).json({
        status: false,
        message: "Maximum 500 leads allowed",
      });
    }

    const failed = [];
    const duplicateLeads = [];

    const csvPhoneSet = new Set();
    const phones = [];

    rows.forEach((row) => {
      const phone = row.phone?.trim();

      if (phone) {
        phones.push(phone);
      }
    });

    const existingLeads = await Lead.find({
      business: businessId,
      phone: { $in: phones },
    })
      .select("phone")
      .lean();

    const existingPhoneSet = new Set(existingLeads.map((lead) => lead.phone));

    const validLeads = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const name = row.name?.trim();
      const email = row.email?.trim();
      const phone = row.phone?.trim();
      const status = row.status?.trim() || "new";
      const source = row.source?.trim();

      if (!name || !phone) {
        failed.push({
          row: i + 2,
          data: row,
          reason: "Name and phone are required",
        });

        continue;
      }

      if (csvPhoneSet.has(phone)) {
        duplicateLeads.push({
          row: i + 2,
          phone,
          reason: "Duplicate phone in CSV",
        });

        continue;
      }

      csvPhoneSet.add(phone);

      if (existingPhoneSet.has(phone)) {
        duplicateLeads.push({
          row: i + 2,
          phone,
          reason: "Phone already exists",
        });

        continue;
      }

      let followUpDate = null;

      if (row.follow_up_date) {
        const parsedDate = moment(
          row.follow_up_date?.trim(),
          ["DD-MM-YYYY", "YYYY-MM-DD"],
          true,
        );

        if (!parsedDate.isValid()) {
          failed.push({
            row: i + 2,
            data: row,
            reason: "Invalid follow_up_date. Use DD-MM-YYYY",
          });

          continue;
        }

        followUpDate = parsedDate.toDate();
      }

      validLeads.push({
        created_by: userId,
        business: businessId,
        assigned_to: userId,
        name,
        email,
        phone,
        status,
        source,
        follow_up_date: followUpDate,
      });
    }

    let insertedLeads = [];

    if (validLeads.length) {
      insertedLeads = await Lead.insertMany(validLeads);
    }

    if (insertedLeads.length) {
      await LeadActivity.insertMany(
        insertedLeads.map((lead) => ({
          lead: lead._id,
          created_by: userId,
          business: businessId,
          activity_type: "lead_created",
          description: `Lead "${lead.name}" created via bulk upload`,
        })),
      );
    }

    return res.status(200).json({
      status: true,
      message: "Leads upload completed",
      response: {
        failed_leads: failed,
        duplicate_leads: duplicateLeads,
      },
      summary: {
        total: rows.length,
        uploaded: insertedLeads.length,
        failed: failed.length,
        duplicates: duplicateLeads.length,
      },
    });
  } catch (error) {
    console.log("uploadLeads error:", error);

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
  exportLeads,
  uploadLeads,
};
