const Business = require("../models/businessModel");

const checkSubscription = async (req, res, next) => {
  try {
    const businessId = req.user.business;
    const business = await Business.findById(businessId);

    if (!business) {
      return res
        .status(404)
        .json({ status: false, message: "Business not found" });
    }

    // Free plan kabhi expire nahi hota — bas apne limits (lead_limit, agent_limit) mein bound hai
    if (business.plan.name === "free") {
      req.business = business;
    }

    const now = new Date();
    const isExpired = !business.plan.end_date || business.plan.end_date < now;

    if (!business.plan.is_active || isExpired) {
      return res.status(402).json({
        status: false,
        message:
          "Your subscription has expired. Please renew to continue using AI features.",
        code: "subscription_expired",
      });
    }

    req.business = business;
    return next();
  } catch (error) {
    console.log("checkSubscription error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

module.exports = { checkSubscription };
