const express=require("express")
const router=express.Router()

const {applyDriver,getDriverProfile,updateDriverProfile,
    toggleAvailability,approveDriver,getAvailableDrivers,updateAvailability,
    updateDriverRating
}=require("../controllers/driverController")

const adminMiddleware=require("../middleware/adminMiddleware")


router.post("/apply", applyDriver);

router.get("/profile", getDriverProfile);

router.put("/profile", updateDriverProfile);

router.patch("/availability", toggleAvailability);

router.get("/internal/available-drivers",getAvailableDrivers);
router.patch("/internal/availability/:driverId",  updateAvailability);

router.patch("/approve/:driverId",adminMiddleware, approveDriver);

router.patch("/internal/rating/:driverId",updateDriverRating);



module.exports = router;