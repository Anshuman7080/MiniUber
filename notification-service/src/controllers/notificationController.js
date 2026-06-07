const Notification = require("../models/notificationSchema");

const sendNotification = async (req, res) => {

    try {

        const {
            userId,
            userRole,
            rideId,
            type,
            title,
            message
        } = req.body;

        if (
            !userId ||
            !userRole ||
            !type ||
            !title ||
            !message
        ) {
            return res.status(400).json({
                success: false,
                message: "All required fields are mandatory"
            });
        }

        const notification = await Notification.create({
            userId,
            userRole,
            rideId,
            type,
            title,
            message
        });

        return res.status(201).json({
            success: true,
            notification,
            message: "Notification created successfully"
        });

    } catch (error) {

        console.log("Error creating notification", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const getMyNotifications=async(req,res)=>{
try{

    const userId=req.headers["x-user-id"];

    if(!userId){
        return res.status(401).json({
            success:false,
            message:"Unauthorized"
        })
    }
    const notifications=await Notification.find({
        userId
    }).sort({createdAt:-1});
    
    return res.status(200).json({
        success:true,
        notifications
    })

}
catch(error){

    console.log("error in fetching notifications",error);
    return res.status(500).json({
        success:false,
        message:"Internal Server Error"
    })
}
}


const markNotificationRead=async(req,res)=>{
    try{
        
        const {notificationId}=req.params;

        const userId=req.headers['x-user-id'];

        if(!userId){
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            })
        }

        const notification=await Notification.findById(
            notificationId
        );

        if(!notification){
            return res.status(404).json({
                success:false,
                message:"Notification not found"
            });
        }

        if(notification.userId!==userId){
             return res.status(403).json({
                success:false,
                message:"Unauthorized"
             });
        }

        notification.isRead=true;

        await notification.save();

        return res.status(200).json({
            success:true,
            message:"Notification marked as read"
        });
     

    }catch(error){
        console.log("Error marking notifications",error);

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}

const markAllNotificationsRead=async(req,res)=>{
    try{
         const userId=req.headers['x-user-id'];

         if(!userId){
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            })
         }


         await Notification.updateMany({
            userId,
            isRead:false,
         },{
            $set:{
                isRead:true
            }
         })

         return res.status(200).json({
            success:true,
            message:"All notifications marked as read"
         });

    }
    catch(error){
        console.log("Error marking notifications",error);
        
        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}


module.exports = {
    sendNotification,
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead
};