const express = require("express");
const router = express.Router();

const {signUp,login,verifyEmail,updateUserRole}=require("../controllers/authController")



router.post("/signup",signUp);
router.post("/login",login);
router.post("/verify-email",verifyEmail)
router.patch("/internal/update-role",updateUserRole);

module.exports=router;