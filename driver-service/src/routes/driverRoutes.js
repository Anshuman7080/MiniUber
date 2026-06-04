const express=require("express")
const router=express.Router()

const {applyDriver,getDriverProfile,updateDriverProfile,
    toggleAvailability,approveDriver
}=require("../controllers/driverController")

const adminMiddleware=require("../middleware/adminMiddleware")


router.post("/apply", applyDriver);

router.get("/profile", getDriverProfile);

router.put("/profile", updateDriverProfile);

router.patch("/availability", toggleAvailability);

router.patch("/approve/:driverId",adminMiddleware, approveDriver);

module.exports = router;