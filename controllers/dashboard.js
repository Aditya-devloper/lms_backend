const Lead = require("../models/leadModel");

const getDashboardData = async (req, res) => {
  try {
    const businessId = req.user.business;

    const query = {
      business: businessId,
      is_deleted: false,
    };

    const totalLeads = await Lead.countDocuments(query);
    const leadsByStatus = await Lead.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Get today's follow-ups
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    query.follow_up_date = { $gte: startOfDay, $lte: endOfDay };
    query.status = { $nin: ["converted", "lost"] }; // Exclude converted and lost leads from follow-ups

    const todayFollowUps = await Lead.find(query)
      .select("name phone status email follow_up_date")
      .lean()
      .sort({ follow_up_date: 1 });

    return res.status(200).json({
      status: true,
      message: "Dashboard data fetched successfully",
      response: { totalLeads, leadsByStatus, todayFollowUps },
    });
  } catch (error) {
    console.log("getDashboardData error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

module.exports = {
  getDashboardData,
};
