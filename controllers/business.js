const path = require("path");
const fs = require("fs").promises;

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

    const image = req.file ? req.file.filename : null;

    const newBusiness = await Business.create({
      business_name,
      owner: userId,
      business_type,
      address,
      image,
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
    const {
      id,
      business_name,
      business_type,
      address,
      business_email,
      business_phone,
      plan,
      widget_config,
    } = req.body;

    const newImage = req.file ? req.file.filename : null;

    const business = await Business.findById(id);
    if (!business) {
      return res
        .status(404)
        .json({ status: false, message: "Business not found" });
    }

    if (newImage && business.image) {
      const oldImagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "businesses",
        business.image,
      );
      try {
        await fs.unlink(oldImagePath);
        console.log("Old image deleted");
      } catch (error) {
        if (error.code == "ENOENT") {
          console.error("File not found:", error);
        }
        console.error("Error deleting old image:", error);
      }
    }

    const updateData = {
      business_name,
      business_type,
      address,
      business_email,
      business_phone,
      plan,
      image: newImage,
      widget_config,
    };

    const updatedBusiness = await Business.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return res.status(200).json({
      status: true,
      message: "Business updated successfully",
      // response: updatedBusiness,
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

const getBusinessContext = async (businessId) => {
  const business = await Business.findById(businessId);

  if (!business) {
    return { name: "the business", type: "", description: "" };
  }

  return {
    name: business?.name || "the business",
    type: business?.business_type || "",
    description: business?.description || "",
  };
};

const getWidgetConfig = async (req, res) => {
  try {
    const { businessId } = req.params;
    const widget_config =
      await Business.findById(businessId).select("widget_config");

    if (!widget_config) {
      return res.status(404).json({
        status: false,
        message: "widget_config not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Widget config fetched successfully",
      response: widget_config,
    });
  } catch (error) {
    console.log("getWidgetConfig error:", error);
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
  getBusinessContext,
  getWidgetConfig,
};
