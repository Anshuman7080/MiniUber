const {createProxyMiddleware}=require("http-proxy-middleware");

const dotenv=require("dotenv");

dotenv.config()


const notificationProxy=createProxyMiddleware({
    target:process.env.NOTIFICATION_SERVICE_URL,
    changeOrigin:true,
    logLevel:"debug",

    on:{
        proxyReq:(proxyReq,req)=>{
            console.log(`[Gateway] Forwarding ${req.method} ${req.originalUrl} to notification service`)
            
            if (req.user){
                console.log("req.user is",req.user);
                proxyReq.setHeader("x-user-id",req.user.userId)
                proxyReq.setHeader("x-user-role",req.user.role)
                proxyReq.setHeader("x-user-name",req.user.name)
            }
        }
    }
})


module.exports = notificationProxy