
const Rider=require("../models/riderSchema");


const createRider = async (req, res) => {
  try {
    const {
      userId,
      name,
      phone,
      profilePhoto
    } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        message: "userId and name are required",
      });
    }

    const existingRider = await Rider.findOne({
      userId,
    });

    if (existingRider) {
      return res.status(409).json({
        success: false,
        message: "Rider already exists",
      });
    }

    const rider = await Rider.create({
      userId,
      name,
      phone,
      profilePhoto,
    });

    return res.status(201).json({
      success: true,
      message: "Rider created successfully",
      rider,
    });

  } catch (error) {
    console.log("Error in creating rider", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getRiderDetails = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
       console.log("Getting rider details for userId:", userId);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "UserId is required",
      });
    }

    const rider = await Rider.findOne({
      userId,
      isActive: true,
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    return res.status(200).json({
      success: true,
      details: rider,
    });
  } catch (error) {
    console.log("Error in getting rider details", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



const updateRiderDetails = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "UserId is required",
      });
    }

    const { name, phone, profilePhoto } = req.body;

    if (!name && !phone && !profilePhoto) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required",
      });
    }

    const rider = await Rider.findOne({
      userId,
      isActive: true,
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    if (name) rider.name = name;
    if (phone) rider.phone = phone;
    if (profilePhoto) rider.profilePhoto = profilePhoto;

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Rider updated successfully",
      details: rider,
    });
  } catch (error) {
    console.log("Error in updating rider", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const deleteRider = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "UserId is required",
      });
    }

    const rider = await Rider.findOne({
      userId,
      isActive: true,
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    rider.isActive = false;

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Rider deactivated successfully",
    });
  } catch (error) {
    console.log("Error in deleting rider", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports={ createRider, getRiderDetails, updateRiderDetails, deleteRider }