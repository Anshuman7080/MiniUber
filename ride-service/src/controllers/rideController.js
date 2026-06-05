const Ride=require("../models/rideSchema");
const RideStatusHistory=require("../models/rideStatusHistorySchema");
const RideRequest=require("../models/rideRequestSchema")
const {calculateFare}=require("../utils/fareCalculator");
const {getAvailableDrivers}=require("../clients/driverServiceClient")
const {updateDriverAvailability}=require("../clients/driverServiceClient")
const { updateDriverRating } = require("../clients/driverServiceClient");
const { updateRiderRating } = require("../clients/riderServiceClient");

const createRide=async(req,res)=>{
    try{
         const riderId=req.headers["x-user-id"]
         console.log("riderId is",riderId);

         if(!riderId){
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            })
         }
              const {pickup,dropoff,distanceKm}=req.body;

              if(!pickup || !dropoff || !distanceKm){
                return res.status(400).json({
                    success:false,
                    message:"All fields are required"
                })
              }


              const estimatedFare=calculateFare(distanceKm);

              const ride=await Ride.create({
                riderId,pickup,dropoff,distanceKm,estimatedFare,
                status:"REQUESTED"
              });


              const drivers =await getAvailableDrivers();
              const requests = drivers.map(driver => ({
                            rideId: ride._id,
                            driverId: driver.userId
                        }));

              await RideRequest.insertMany(requests);

              await RideStatusHistory.create({
                rideId:ride._id,
                status:"REQUESTED",
                changedBy:"rider",
                note:"Ride created"
              })

             return res.status(201).json({
                success:true,
                message:"Ride created successfully",
                ride
             })



    }
    catch(error){
         console.log("Error creating ride", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
}

const getRideDetails = async (req, res) => {

    try {

        const { rideId } = req.params;

        if (!rideId) {
            return res.status(404).json({
                success: false,
                message: "RideId not found"
            });
        }

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        return res.status(200).json({
            success: true,
            ride
        });

    } catch (error) {

        console.log("Error fetching ride", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const cancelRide = async (req, res) => {

    try {

        const { rideId } = req.params;

        
        if (!rideId) {
            return res.status(404).json({
                success: false,
                message: "RideId not found"
            });
        }
           

        const riderId = req.headers["x-user-id"];

        if (!riderId) {
            return res.status(404).json({
                success: false,
                message: "RiderId not found"
            });
        }

        const { reason } = req.body;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.riderId !== riderId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (
            ride.status !== "REQUESTED" &&
            ride.status !== "ACCEPTED"
        ) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel ride in ${ride.status} state`
            });
        }

        ride.status = "CANCELLED";

        ride.cancelledAt = new Date();

        ride.cancelledBy = "rider";

        ride.cancellationReason =
            reason || "Cancelled by rider";

        await ride.save();

        await RideStatusHistory.create({
            rideId: ride._id,
            status: "CANCELLED",
            changedBy: "rider",
            note: reason || "Cancelled by rider"
        });

        return res.status(200).json({
            success: true,
            message: "Ride cancelled successfully"
        });

    } catch (error) {

        console.log("Error cancelling ride", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


const getDriverRequests = async (req, res) => {

    try {

        const driverId =
            req.headers["x-user-id"];

            if(!driverId){
                return res.status(404).json({
                    success:false,
                    message:"User is not authorized"
                })
            }

        const requests =
            await RideRequest.find({
                driverId,
                status: "PENDING"
            });

        return res.status(200).json({
            success: true,
            requests
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
    }
};



const acceptRide=async(req,res)=>{
    try{
        
        const {rideId}=req.params;
         if(!rideId){
            return res.status(401).json({
                success:false,
                message:"ride Id missing"
            })
        }

        const driverId=req.headers['x-user-id']

        if(!driverId){
            return res.status(401).json({
                success:false,
                message:"Driver Id missing"
            })
        }

        const ride=await Ride.findById(rideId);


        if(!ride){
            return res.status(404).json({
                success:false,
                message:"Ride not found"
            })
        }

        if(ride.status!=='REQUESTED'){
            return res.status(400).json({
                success:false,
                message:`Ride is already ${ride.status}`
            })
        }
         

        const request=await RideRequest.findOne({
            rideId,
            driverId,
            status:"PENDING"
        });

        if(!request){
            return res.status(404).json({
                success:false,
                message:"No pending ride request found"
            })
        }

        request.status='ACCEPTED';
        request.respondedAt=new Date();

        await request.save();

        ride.driverId=driverId;
        ride.status='ACCEPTED';
        ride.acceptedAt=new Date();
        
        await ride.save();

        await updateDriverAvailability(
                driverId,
                false
            );

        await RideStatusHistory.create({
            rideId:ride._id,
            status:"ACCEPTED",
            changedBy:"driver",
            note:"Driver accepted ride"
        })

        await RideRequest.updateMany({
            rideId,
            _id:{$ne:request._id}
        },{status:"REJECTED",respondedAt:new Date()})
           

        return res.status(200).json({
            success:true,
            message:"Ride accepted successfully",
            ride
        })

    }
    catch(error){
        console.log("Error in accepting ride",error);

        return res.status(500).json({
            success:false,
            error:error
        })
    }
}


const rejectRide = async (req, res) => {

    try {

        const { rideId } = req.params;
         if(!rideId){
            return res.status(404).json({
                success:false,
                message:"RideId is required"
            })
         }

        const driverId = req.headers["x-user-id"];

        const request = await RideRequest.findOne({
            rideId,
            driverId,
            status: "PENDING"
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "No pending ride request found"
            });
        }

        request.status = "REJECTED";
        request.respondedAt = new Date();

        await request.save();

        return res.status(200).json({
            success: true,
            message: "Ride request rejected"
        });

    } catch (error) {

        console.log("Error rejecting ride", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const driverArrived = async (req, res) => {
    try {

        const { rideId } = req.params;

        if(!rideId){
            return res.status(404).json({
                success:false,
                message:"Ride Id missing"
            })
        }

        const driverId = req.headers["x-user-id"];

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (ride.status !== "ACCEPTED") {
            return res.status(400).json({
                success: false,
                message: "Ride must be ACCEPTED first"
            });
        }

        ride.status = "DRIVER_ARRIVED";
        ride.driverArrivedAt = new Date();

        await ride.save();

        await RideStatusHistory.create({
            rideId: ride._id,
            status: "DRIVER_ARRIVED",
            changedBy: "driver",
            note: "Driver arrived at pickup location"
        });

        return res.status(200).json({
            success: true,
            message: "Driver arrival recorded"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



const startRide = async (req, res) => {

    try {

        const { rideId } = req.params;

        if(!rideId){
            return res.status(404).json({
                success:false,
                message:"Ride Id missing"
            })
        }

        const driverId = req.headers["x-user-id"];

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (ride.status !== "DRIVER_ARRIVED") {
            return res.status(400).json({
                success: false,
                message: "Driver must arrive first"
            });
        }

        ride.status = "IN_PROGRESS";
        ride.startedAt = new Date();

        await ride.save();

        await RideStatusHistory.create({
            rideId: ride._id,
            status: "IN_PROGRESS",
            changedBy: "driver",
            note: "Ride started"
        });

        return res.status(200).json({
            success: true,
            message: "Ride started"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const completeRide = async (req, res) => {

    try {

        const { rideId } = req.params;

        const driverId = req.headers["x-user-id"];

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (ride.status !== "IN_PROGRESS") {
            return res.status(400).json({
                success: false,
                message: "Ride is not in progress"
            });
        }

        ride.status = "COMPLETED";
        ride.completedAt = new Date();

        // Fixed pricing version
        ride.finalFare = ride.estimatedFare;

        await ride.save();

        await updateDriverAvailability(
                driverId,
                true
            );

        await RideStatusHistory.create({
            rideId: ride._id,
            status: "COMPLETED",
            changedBy: "driver",
            note: "Ride completed"
        });

        return res.status(200).json({
            success: true,
            message: "Ride completed successfully",
            finalFare: ride.finalFare
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


const driverCancelRide = async (req, res) => {

    try {

        const { rideId } = req.params;

        if(!rideId){
            return res.status(404).json({
                success:false,
                message:"rideId is required"
            })
        }

        const driverId = req.headers["x-user-id"];

        const { reason } = req.body;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (
            ride.status !== "ACCEPTED" &&
            ride.status !== "DRIVER_ARRIVED"
        ) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel ride in ${ride.status} state`
            });
        }

        ride.status = "CANCELLED";

        ride.cancelledAt = new Date();

        ride.cancelledBy = "driver";

        ride.cancellationReason =
            reason || "Cancelled by driver";

        await ride.save();

        await RideStatusHistory.create({
            rideId: ride._id,
            status: "CANCELLED",
            changedBy: "driver",
            note: reason || "Cancelled by driver"
        });

        // Driver becomes available again
        await updateDriverAvailability(
            driverId,
            true
        );

        return res.status(200).json({
            success: true,
            message: "Ride cancelled successfully"
        });

    } catch (error) {

        console.log("Error cancelling ride", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};




const rateDriver = async (req, res) => {

    try {

        const { rideId } = req.params;

        const riderId = req.headers["x-user-id"];

        const { rating } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.riderId !== riderId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (ride.status !== "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: "Ride is not completed"
            });
        }

        if (ride.riderRating) {
            return res.status(400).json({
                success: false,
                message: "Driver already rated"
            });
        }

        ride.riderRating = rating;

        await ride.save();

        await updateDriverRating(
            ride.driverId,
            rating
        );

        return res.status(200).json({
            success: true,
            message: "Driver rated successfully"
        });

    } catch (error) {

        console.log("Error rating driver", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};




const rateRider = async (req, res) => {

    try {

        const { rideId } = req.params;

        const driverId = req.headers["x-user-id"];

        const { rating } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (ride.status !== "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: "Ride is not completed"
            });
        }

        if (ride.driverRating) {
            return res.status(400).json({
                success: false,
                message: "Rider already rated"
            });
        }

        ride.driverRating = rating;

        await ride.save();

        await updateRiderRating(
            ride.riderId,
            rating
        );

        return res.status(200).json({
            success: true,
            message: "Rider rated successfully"
        });

    } catch (error) {

        console.log("Error rating rider", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

module.exports = {
    createRide,
    getRideDetails,
    cancelRide,
    getDriverRequests,
    acceptRide,
    driverArrived,
    startRide,
    completeRide,
    rejectRide,
    driverCancelRide,
    rateDriver,
    rateRider
};