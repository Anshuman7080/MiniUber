
const {createProxyMiddleware}=require("http-proxy-middleware");


const dotenv=require("dotenv")

dotenv.config()

const userProxy=createProxyMiddleware({
    target:process.env.USER_SERVICE_URL,
    changeOrigin:true,
    logLevel:"debug",

    on:{
        proxyReq:(proxyReq,req)=>{
            console.log(`[Gateway] Forwarding ${req.method} ${req.originalUrl} to User Service`)

            if(req.user){
                
                proxyReq.setHeader("x-user-id",req.user.userId)
                proxyReq.setHeader("x-user-role",req.user.role)
            }

        }
    }
})



module.exports=userProxy;