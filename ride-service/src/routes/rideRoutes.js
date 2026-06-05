const express = require("express");

const router = express.Router();

const {
    createRide,
    getRideDetails,cancelRide,getDriverRequests,acceptRide,driverArrived,startRide,completeRide
    ,rejectRide,driverCancelRide
} = require("../controllers/rideController");


router.post("/create", createRide);

router.get("/request", getDriverRequests);

router.patch("/:rideId/cancel", cancelRide);

router.get("/:rideId", getRideDetails);

router.patch( "/:rideId/accept", acceptRide);

router.patch("/:rideId/reject",rejectRide);

router.patch("/:rideId/arrive",driverArrived);

router.patch("/:rideId/start",startRide);

router.patch("/:rideId/complete",completeRide);

router.patch("/:rideId/driver-cancel",driverCancelRide);


module.exports = router;