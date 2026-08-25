const Plan = require("../models/planModel");

const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    return res.status(200).json({
      status: true,
      message: "Plans fetched successfully",
      response: plans,
    });
  } catch (error) {
    console.log("getPlans error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getPlans,
};
