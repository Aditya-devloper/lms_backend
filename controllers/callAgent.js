const crypto = require("crypto");
const { graph } = require("../call-agent/graph");
const Business = require("../models/businessModel");
const CallHistory = require("../models/callHistoryModel");

const CALL_COST = Number(process.env.CALL_COST) || 0.06;

const triggerCallAgent = async (req, res) => {
  try {
    const business_id = req.user?.business;
    const { leadId, context } = req.body;

    if (!leadId) {
      return res
        .status(400)
        .json({ status: false, message: "leadId is required" });
    }

    const business = await Business.findById(business_id);
    if (!business || business.call_balance < 1) {
      return res.status(402).json({
        status: false,
        message: "No calls remaining. Please purchase a call pack to continue.",
      });
    }

    const requestId = crypto.randomUUID();

    res.status(202).json({
      status: true,
      message:
        "Call started. You'll see the outcome on the lead's page shortly.",
      response: { requestId },
    });

    try {
      const result = await graph.invoke({
        leadId,
        attemptNumber: 1,
        requestId,
        userContext: context || "",
      });

      console.log(`Call agent finished for lead ${leadId}:`, result.callStatus);
    } catch (error) {
      console.log(`Call agent failed for lead ${leadId}:`, error.message);
    }
  } catch (error) {
    console.log("triggerCallAgent error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        status: false,
        message: error.message || "Internal Server Error",
      });
    }

    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getCallHistory = async (req, res) => {
  try {
    const businessId = req.user.business;
    const { page = 1, limit = 10 } = req.body;

    const skip = (page - 1) * limit;
    const total = await CallHistory.countDocuments({ business: businessId });

    const calls = await CallHistory.find({ business: businessId })
      .populate("lead", "name phone")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Call history fetched",
      response: calls,
      pagination: { page, limit, totalPages: Math.ceil(total / limit), total },
    });
  } catch (error) {
    console.log("getCallHistory error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getCallStats = async (req, res) => {
  try {
    const businessId = req.user.business;

    const [stats, business] = await Promise.all([
      CallHistory.aggregate([
        {
          $match: {
            business: businessId,
          },
        },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            converted: {
              $sum: {
                $cond: [{ $eq: ["$call_result.interested", "yes"] }, 1, 0],
              },
            },

            failed: {
              $sum: {
                $cond: [{ $eq: ["$call_status", "failed"] }, 1, 0],
              },
            },

            usedCredits: {
              $sum: {
                $cond: [{ $eq: ["$was_charged", true] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalCalls: 1,
            converted: 1,
            failed: 1,
            usedCredits: 1,
          },
        },
      ]),

      Business.findById(businessId).select("call_balance").lean(),
    ]);

    const callStats = stats[0] || {
      totalCalls: 0,
      converted: 0,
      failed: 0,
      usedCredits: 0,
    };

    return res.status(200).json({
      status: true,
      message: "Call stats fetched",
      response: {
        ...callStats,
        creditsRemaining: business?.call_balance ?? 0,
      },
    });
  } catch (error) {
    console.log("getCallStats error:", error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = { triggerCallAgent, getCallHistory, getCallStats };
