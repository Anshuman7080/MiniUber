const User=require("../models/userSchema")
const bcrypt=require("bcrypt")

const {mailSender}=require("../services/emailService")
const {generateOtp}=require("../services/otpService")
const Otp=require("../models/otpSchema")
const emailVerificationTemplate=require("../utils/emailVerificationTemplate")
const jwt = require('jsonwebtoken');
const { createRiderProfile } = require("../services/userService");



const signUp = async (req, res) => {
  try {
    const { name, email, password} = req.body;

    if (!name || !email || !password ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "User already present with this email. Try with a different email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

  

    try {
      await createRiderProfile(
        newUser._id.toString(),
        newUser.name
      );
    } catch (error) {
      console.log("Rider Profile Creation Failed:", error.message);


      await User.findByIdAndDelete(newUser._id);

      return res.status(500).json({
        success: false,
        message: "Failed to create rider profile",
      });
    }



    const otp = await generateOtp(newUser._id);

    await Otp.create({
      userId: newUser._id,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    await mailSender(
      email,
      "Verification Email from Uber",
      emailVerificationTemplate(otp)
    );

    return res.status(201).json({
      success: true,
      userDetail: newUser,
      message:
        "USER CREATED SUCCESSFULLY. PLEASE CHECK YOUR EMAIL FOR VERIFICATION",
    });

  } catch (error) {
    console.log("Error in signing up user", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};


const verifyEmail=async(req,res)=>{
    try{
        const {userId,otp}=req.body;

        if(!userId || !otp){
            return res.status(404).json({
                success:false,
                message:"UserId and OTP are required"
            })
        }


        const opt_res=await Otp.find({userId,otp}).sort({createdAt:-1}).limit(1);

        if (opt_res.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'The OTP is not found',
            });
        } else if (String(otp) !== String(opt_res[0].otp)) {
            return res.status(400).json({
                success: false,
                message: 'The OTP is not valid',
            });
        }
          await Otp.deleteMany({ userId });
        const user=await User.findById(userId);

        if(!user){
            return res.status(400).json({
                success:false,
                message:"User not found"
            })
        }
        user.isVerified=true;

        await user.save()
        return res.status(200).json({
            success:true,
            message:"email verified successfully"

        })
    }catch(error){
        console.log("Error in verifying email",error);
        return res.status(500).json({
            success:false,
            message:error
        })
    }
}


const login=async(req,res)=>{
    try{
         const {email,password}=req.body;
         if(!email || !password){
            return res.status(404).json({
                success:false,
                message:"Email and password are required"
            })
         }

            const user=await User.findOne({email})
            if(!user){
                return res.status(400).json({
                    success:false,
                    message:"User not found with this email"
                })
            }

            const isPasswordMatch=await bcrypt.compare(password,user.password);

            if(!isPasswordMatch){
                return res.status(400).json({
                    success:false,
                    message:"Incorrect password"
                })
            }

            if(!user.isVerified){
                const otp=await generateOtp(user._id);
                await mailSender(email, 'Verification Email from Uber', emailVerificationTemplate(otp));
                return res.status(400).json({
                    success:false,
                    message:"Your email is not verified. Verify email and login again"
                })

            }

            const payload={
                userId:user._id,
                role:user.role,
                name:user.name,
            }
           const token=jwt.sign(payload,process.env.JWT_SECRET_KEY,{expiresIn:"1d"})

           user.token=token;
           user.password=undefined;

            const options = {
                expires: new Date(Date.now() + 3*24*60*60*1000),
              
                httpOnly: true,
            }
   
            res.cookie('token', token, options).status(200).json({
                success: true,
                token,
                user,
                message: `User Login Success`,
            });


    }
    catch(error){

        console.log("error in login",error);
        return res.status(500).json({
            success:false,
            message:error
        })
    }
}


const updateUserRole = async (req, res) => {
  try {

    const { userId, role } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.role = role;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Role updated successfully"
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

module.exports={signUp,verifyEmail,login,updateUserRole}