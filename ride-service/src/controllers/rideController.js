const Ride=require("../models/rideSchema");
const RideStatusHistory=require("../models/rideStatusHistorySchema");
const RideRequest=require("../models/rideRequestSchema")
const {calculateFare}=require("../utils/fareCalculator");
const {getAvailableDrivers}=require("../clients/driverServiceClient")
const {updateDriverAvailability}=require("../clients/driverServiceClient")
const { updateDriverRating } = require("../clients/driverServiceClient");
const { updateRiderRating } = require("../clients/riderServiceClient");
const {sendNotification}=require("../clients/notificationServiceClient")
const { redisClient } =require("../config/redis");
const {getIO}=require("../sockets/socket");

const createRide = async (req, res) => {
    try {

        const riderId = req.headers["x-user-id"];

        if (!riderId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const {
            pickup,
            dropoff,
            distanceKm
        } = req.body;

        if (!pickup || !dropoff || !distanceKm) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const estimatedFare =
            calculateFare(distanceKm);

        const ride = await Ride.create({
            riderId,
            pickup,
            dropoff,
            distanceKm,
            estimatedFare,
            status: "REQUESTED"
        });

        const nearbyDrivers =
            await redisClient.sendCommand([
                "GEOSEARCH",
                "drivers:geo",
                "FROMLONLAT",
                ride.pickup.longitude.toString(),
                ride.pickup.latitude.toString(),
                "BYRADIUS",
                "5",
                "km",
                "WITHDIST"
            ]);



        const onlineDrivers =
            await redisClient.sMembers(
                "online-drivers"
            );


        const eligibleDrivers =
            nearbyDrivers.filter(
                ([driverId]) =>
                    onlineDrivers.includes(
                        driverId
                    )
            );


        eligibleDrivers.sort(
            (a, b) =>
                Number(a[1]) -
                Number(b[1])
        );


       if (eligibleDrivers.length === 0) {

            await Ride.findByIdAndDelete(
                ride._id
            );

            return res.status(404).json({
                success:false,
                message:
                    "No nearby drivers available"
            });
}


        const requests =
            eligibleDrivers.map(
                ([driverId]) => ({
                    rideId: ride._id,
                    driverId
                })
            );

        await RideRequest.insertMany(
            requests
        );

        const io=getIO();

        for(const [driverId,distance] of eligibleDrivers){
            io.to(
                `driver:${driverId}`
            ).emit(
                "new-ride-request",
                {
                    rideId:ride._id,
                    riderId,
                    pickup,
                    dropoff,
                    estimatedFare,
                    distanceKm
                }
            )
        }



        await RideStatusHistory.create({
            rideId: ride._id,
            status: "REQUESTED",
            changedBy: "rider",
            note: "Ride created"
        });

        return res.status(201).json({
            success: true,
            message:
                "Ride created successfully",
            ride,

            nearbyDrivers:
                eligibleDrivers.map(
                    ([driverId, distance]) => ({
                        driverId,
                        distanceKm:
                            Number(distance)
                    })
                )
        });

    } catch (error) {

        console.log(
            "Error creating ride",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal Server Error"
        });
    }
};


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

        const io=getIO();

        io.to(`driver:${ride.driverId}`).
        emit(
            "ride-cancelled",
            {
                rideId,
                cancelledBy:"rider",
                reason:ride.cancellationReason
            }
        )

        await sendNotification({
            userId: ride.riderId,
            userRole: "rider",
            rideId: ride._id,
            type: "RIDE_CANCELLED",
            title: "Ride Cancelled",
            message: reason || "Ride was cancelled"
        });

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


const acceptRide = async (req, res) => {

    let lockKey = null;

    try {

        const { rideId } = req.params;

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: "Ride Id missing"
            });
        }

        const driverId =
            req.headers["x-user-id"];

        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: "Driver Id missing"
            });
        }

        const ride =
            await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.status !== "REQUESTED") {
            return res.status(400).json({
                success: false,
                message: `Ride is already ${ride.status}`
            });
        }

        lockKey = `ride-lock:${rideId}`;

        const lock =
            await redisClient.set(
                lockKey,
                driverId,
                {
                    NX: true,
                    EX: 30
                }
            );

        if (!lock) {
            return res.status(409).json({
                success: false,
                message:
                    "Ride is being accepted by another driver"
            });
        }

        const request =
            await RideRequest.findOne({
                rideId,
                driverId,
                status: "PENDING"
            });

        if (!request) {

            await redisClient.del(lockKey);

            return res.status(404).json({
                success: false,
                message:
                    "No pending ride request found"
            });
        }

        request.status = "ACCEPTED";
        request.respondedAt =
            new Date();

        await request.save();

        ride.driverId = driverId;
        ride.status = "ACCEPTED";
        ride.acceptedAt =
            new Date();

        await ride.save();

        const io=getIO();
        
        io.to(
            `rider:${ride.riderId}`
        ).emit(
            "ride-accepted",
            {
                rideId:ride._id,
                driverId,
                status:"ACCEPTED"
            }
        )


        await sendNotification({
            userId: ride.riderId,
            userRole: "rider",
            rideId: ride._id,
            type: "DRIVER_ASSIGNED",
            title: "Driver Assigned",
            message:
                "A driver has accepted your ride request"
        });


        await updateDriverAvailability(
            driverId,
            false
        );


        await RideStatusHistory.create({
            rideId: ride._id,
            status: "ACCEPTED",
            changedBy: "driver",
            note:
                "Driver accepted ride"
        });

        await RideRequest.updateMany(
            {
                rideId,
                _id: {
                    $ne: request._id
                }
            },
            {
                status: "EXPIRED",
                respondedAt:
                    new Date()
            }
        );

        await redisClient.del(
            lockKey
        );

        return res.status(200).json({
            success: true,
            message:
                "Ride accepted successfully",
            ride
        });

    } catch (error) {

        if (lockKey) {

            try {

                await redisClient.del(
                    lockKey
                );

            } catch (err) {

                console.log(
                    "Lock cleanup error",
                    err
                );
            }
        }

        console.log(
            "Error in accepting ride",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal Server Error"
        });
    }
};


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

        await sendNotification({
            userId: ride.riderId,
            userRole: "rider",
            rideId: ride._id,
            type: "DRIVER_ARRIVED",
            title: "Driver Arrived",
            message: "Your driver has arrived"
        });

        await RideStatusHistory.create({
            rideId: ride._id,
            status: "DRIVER_ARRIVED",
            changedBy: "driver",
            note: "Driver arrived at pickup location"
        });


        const io=getIo();
        io.to(`rider:${ride.riderId}`).
        emit("driver-arrived",
            {
                rideId,
                status:"DRIVER_ARRIVED"
            }
        )

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

        await sendNotification({
            userId: ride.riderId,
            userRole: "rider",
            rideId: ride._id,
            type: "RIDE_STARTED",
            title: "Ride Started",
            message: "Your ride has started"
        });

        await RideStatusHistory.create({
            rideId: ride._id,
            status: "IN_PROGRESS",
            changedBy: "driver",
            note: "Ride started"
        });


        const io=getIO();

        io.to(
            `rider:${ride.riderId}`
        ).emit(
            "ride-started",
            {
                rideId,
                status:"IN_PROGRESS"
            }
        )

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

       
        ride.finalFare = ride.estimatedFare;

        await ride.save();
        
        await sendNotification({
            userId: ride.riderId,
            userRole: "rider",
            rideId: ride._id,
            type: "RIDE_COMPLETED",
            title: "Ride Completed",
            message: "Thank you for riding with us"
        });

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
        
         const io=getIO();
         
         io.to(
            `rider:${ride.riderId}`
         ).emit(
            "ride-completed",
            {
                rideId,
                finalFare:ride.finalFare
            }
         )

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

        const io = getIO();

        io.to(
            `rider:${ride.riderId}`
        ).emit(
            "ride-cancelled",
            {
                rideId,
                cancelledBy: "driver",
                reason:
                    ride.cancellationReason
            }
        );

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

const updateDriverLocation=async(req,res)=>{
    try{

        const driverId=req.headers['x-user-id'];

        if(!driverId){
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            })
        }

        const {latitude,longitude}=req.body;

        if(!latitude || ! longitude){
            return res.status(400).json({
                success:false,
                message:"Latitude and Longitude required"
            })
        }

        await redisClient.hSet(
            `driver:${driverId}`,
            {
                latitude,
                longitude,
                updatedAt:Date.now()
            }
        )

        await redisClient.geoAdd(
            "drivers:geo",
            {
                longitude: Number(longitude),
                latitude: Number(latitude),
                member: driverId
            }
        );

        return res.status(200).json({
            success:true,
            message:"Location updated"
        })

    }
    catch(error){
        console.log("error in updating driver location",error);

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
    }
}

const setDriverOnline=async(req,res)=>{
    try{

        const driverId=req.headers['x-user-id'];
           
        if(!driverId){
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            })
        }

        await redisClient.sAdd("online-drivers",driverId);

        return res.status(200).json({
            success:true,
            message:"Driver is online"
        });

    }
    catch(error){
        console.log("error in making driver online",error);

        return res.status(500).json({
            success:false,
            message:error
        })
    }
}


const setDriverOffline=async(req,res)=>{
    try{
        const driverId=req.headers['x-user-id'];

        await redisClient.sRem(
            "online-drivers",
            driverId
        );

        return res.status(200).json({
            success:true,
            message:"Driver is offline"
        })

    }catch(error){
        console.log("error in making driver offline",error);

        return res.status(500).json({
            success:false,
            error:error
        })
    }
}

const getOnlineDrivers=async(req,res)=>{
    try{

         const drivers=await redisClient.sMembers("online-drivers");

         return res.status(200).json({
            success:true,
            drivers
         })
    }
    catch(error){
        console.log("Error in getting online drivers",error);

        return res.status(500).json({
            success:false,
            error:error
        })
    }
}


const getNearbyDrivers=async(req,res)=>{
    try{

        const {latitude,longitude}=req.query;

     const nearbyDrivers =
    await redisClient.sendCommand([
        "GEOSEARCH",
        "drivers:geo",
        "FROMLONLAT",
        longitude,
        latitude,
        "BYRADIUS",
        "5",
        "km",
        "WITHDIST"
    ]);

        return res.status(200).json({
            success:true,
            drivers:nearbyDrivers
        })

    }
    catch(error){
        console.log("error in getting nearby drivers",error);

        return res.status(500).json({
            success:false,
            error:error
        })
    }
}


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
    rateRider,
    updateDriverLocation ,
    setDriverOnline,
    setDriverOffline,
    getOnlineDrivers,
    getNearbyDrivers
};