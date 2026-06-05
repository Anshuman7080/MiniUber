const jwt=require("jsonwebtoken")


const authMiddleware=(req,res,next)=>{
    
    try{

        let token;
        const authHeader = req.headers.authorization;

        console.log("Auth Header at Gateway:", authHeader)

        if(authHeader && authHeader.startsWith("Bearer ")){
            token=authHeader.split(" ")[1];

        }

        if (!token){
            return res.status(401).json({
                success:false,
                message:"Token Missing",
            })
        }

        const decoded=jwt.verify(token,process.env.JWT_SECRET_KEY)

        req.user=decoded;

        next();


    }catch(error){
        console.log("Error in verifying jwt at gateway",error);
        return res.status(401).json({
            success:false,
            message:"Invalid Token"
        })
    }
}

module.exports=authMiddleware