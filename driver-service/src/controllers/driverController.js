const Driver=require("../models/driverSchema")
const {updateUserRole}=require("../service/authService")


const applyDriver=async(req,res)=>{
    try{
             const userId=req.headers['x-user-id']
             const name=req.headers['x-user-name']


             if(!userId || !name){
                return res.status(404).json({
                    success:false,
                    message:"UserId and Name are required"
                })
             }

             const {phone,vehicleType,vehicleNumber,drivingLicense}=req.body;

                if (
                    !phone ||
                    !vehicleType ||
                    !vehicleNumber ||
                    !drivingLicense
                    ) {
                    return res.status(400).json({
                        success: false,
                        message: "All fields are required"
                    });
                  }

              const existingDriver=await Driver.findOne({userId})
              
              if (existingDriver){
                return res.status(400).json({
                    success:false,
                    message:"Driver profile already exists"
                })
              }


              const driver=await Driver.create({
                userId,name,phone,vehicleType,vehicleNumber,drivingLicense
              })
 
               return res.status(201).json({
                success:true,
                message:"Driver application submitted successfully",
                driver
               })


    }
    catch(error){
        console.log("error in applying for driver",error);

        return res.status(500).json({
            success:false,
            error:error
        })
    }
}


const getDriverProfile=async(req,res)=>{
    try{

        const userId=req.headers['x-user-id']
        
        if(!userId){
            return res.status(400).json({
                success:false,
                message:"UserId required",
            })
        }


        const driver=await Driver.findOne({userId});
        if(!driver){
            return res.status(404).json({
                success:false,
                message:"Driver profile not found"
            })
        }


        return res.status(200).json({
            success:true,
            driver
        })

    }
    catch(error){
        console.log("error in getting driver profile",error);
        return res.status(500).json({
            success:false,
            error:error
        })
    }
}


const updateDriverProfile = async (req, res) => {
  try {

    const userId = req.headers["x-user-id"];

    if(!userId){
        return res.status(400).json({
            success:false,
            message:"UserId required"
        })
    }

    const driver = await Driver.findOne({ userId });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found"
      });
    }

    const {
      phone,
      vehicleType,
      vehicleNumber,
      drivingLicense
    } = req.body;

    if (phone) driver.phone = phone;
    if (vehicleType) driver.vehicleType = vehicleType;
    if (vehicleNumber) driver.vehicleNumber = vehicleNumber;
    if (drivingLicense) driver.drivingLicense = drivingLicense;

    await driver.save();

    return res.status(200).json({
      success: true,
      message: "Driver profile updated successfully",
      driver
    });

  } catch (error) {

    console.log("Error in updateDriverProfile", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


const toggleAvailability = async (req, res) => {
  try {

    const userId = req.headers["x-user-id"];


      if(!userId){
        return res.status(400).json({
            success:false,
            message:"UserId required"
        })
    }

    const { isAvailable } = req.body;

    const driver = await Driver.findOne({ userId });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found"
      });
    }

    driver.isAvailable = isAvailable;

    await driver.save();

    return res.status(200).json({
      success: true,
      message: "Availability updated",
      driver
    });

  } catch (error) {

    console.log("Error in toggleAvailability", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const approveDriver = async (req, res) => {
  try {

    const { driverId } = req.params;

    if(!driverId){
        return res.status(404).json({
            success:false,
            message:"DriverId required"
        })
    }

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    driver.isApproved = true;

    await driver.save();

    await updateUserRole(
      driver.userId,
      "driver"
    );

    return res.status(200).json({
      success: true,
      message: "Driver approved successfully"
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};



const getAvailableDrivers = async (req,res) => {

    try {

        const drivers = await Driver.find({
            isApproved:true,
            isAvailable:true
        });

        console.log("Coming here");

        return res.status(200).json({
            success:true,
            drivers
        });

    } catch(error) {

        console.log(error);

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
    }
};


const updateAvailability = async (req, res) => {

    try {

        const { driverId } = req.params;

        const { isAvailable } = req.body;

        const driver = await Driver.findOne({
            userId: driverId
        });

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        driver.isAvailable = isAvailable;

        await driver.save();

        return res.status(200).json({
            success: true,
            message: "Availability updated",
            driver
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



const updateDriverRating = async (req, res) => {
    try {

        const { driverId } = req.params;
        const { rating } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        const driver = await Driver.findOne({
            userId: driverId
        });

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        const newRating =
            (
                (driver.rating * driver.totalTrips)
                + rating
            ) /
            (driver.totalTrips + 1);

        driver.rating = Number(newRating.toFixed(2));

        driver.totalTrips += 1;

        await driver.save();

        return res.status(200).json({
            success: true,
            driver
        });

    } catch (error) {

        console.log("Error updating driver rating", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



module.exports = {
  applyDriver,
  getDriverProfile,
  updateDriverProfile,
  toggleAvailability,
  approveDriver,
  getAvailableDrivers,
  updateAvailability,
  updateDriverRating
};
