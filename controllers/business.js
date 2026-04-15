const Business = require("../models/businessModel");
const User = require("../models/userModel");

const createBusiness = async (req, res) => {
  try {
    const userId = req.user?._id;
    const {
      business_name,
      business_type,
      address,
      business_email,
      business_phone,
      plan,
    } = req.body;

    const newBusiness = await Business.create({
      business_name,
      owner: userId,
      business_type,
      address,
      business_email,
      business_phone,
      plan,
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { business: newBusiness._id } },
      { new: true },
    );

    return res.status(201).json({
      status: true,
      message: "Business created successfully",
      response: { newBusiness, updatedUser },
    });
  } catch (error) {
    console.log("createBusiness error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const getBusiness = async (req, res) => {
  try {
    const userId = req.user?._id;

    const business = await Business.find({ owner: userId }).populate(
      "owner",
      "name",
    );

    return res.status(200).json({
      status: true,
      message: "Business fetched successfully",
      response: business,
    });
  } catch (error) {
    console.log("getBusiness error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBusiness = await Business.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return res.status(200).json({
      status: true,
      message: "Business updated successfully",
      response: updatedBusiness,
    });
  } catch (error) {
    console.log("updateBusiness error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    await Business.findByIdAndDelete(id);
    return res.status(200).json({
      status: true,
      message: "Business deleted successfully",
    });
  } catch (error) {
    console.log("deleteBusiness error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id).populate("owner", "-pin");

    if (!business) {
      return res.status(404).json({
        status: false,
        message: "Business not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Business fetched successfully",
      response: business,
    });
  } catch (error) {
    console.log("getBusinessById error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

module.exports = {
  createBusiness,
  getBusiness,
  updateBusiness,
  deleteBusiness,
  getBusinessById,
};
