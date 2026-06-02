
const express=require("express");
const router=express.Router();


const {createRider,getRiderDetails,updateRiderDetails,deleteRider}=require("../controllers/riderController")

router.post("/internal/create", createRider);

router.get("/profile", getRiderDetails);

router.put("/profile", updateRiderDetails);

router.delete("/profile", deleteRider);


module.exports=router;
