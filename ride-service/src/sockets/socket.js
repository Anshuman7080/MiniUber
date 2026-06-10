const Ride=require("../models/rideSchema");

const {redisClient}=require("../config/redis");

const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {

    io = new Server(server, {
        cors: {
            origin: "*"
        }
    });

    io.on("connection", async(socket) => {

        console.log(
            "Socket Connected:",
            socket.id
        );
         

    socket.on(
        "join-room",
        async(data) => {

        const {userId, role } = data;

        socket.userId =userId;

        socket.role =role;

        const roomName =
            `${role}:${userId}`;

        socket.join(roomName);

        console.log(
            `${userId} joined ${roomName}`
        );
 
        io.to(roomName).emit(
            "test-message",
            {
                message:
                    "Welcome to mini uber",
                room:
                    roomName
            }
        );

        if(role=="driver"){
            await redisClient.sAdd("online-drivers",userId);
        }
    }
     );
      
 

     socket.on(
        "location-update",
        async(data)=>{
            try{

                const {rideId,latitude,longitude}=data;

             await redisClient.geoAdd(
                "drivers:geo",
                {
                    longitude: Number(longitude),
                    latitude: Number(latitude),
                    member: socket.userId
                }
            );
               
                const ride=await Ride.findById(
                    rideId
                );

                if(!ride){

                    console.log("no ride found");
                    return
                }

                // console.log("riderID",ride.riderId)

                io.to(`rider:${ride.riderId}`)
                .emit(
                    "driver-location-updated",
                    {
                        rideId,
                        driverId:socket.userId,
                        latitude,
                        longitude
                    }
                )

            }catch(error){
             console.log("Location update Error",error);
            }
        }
     )

        
        socket.on(
            "disconnect",
            async() => {
             
                if(socket.role=='driver'){
                    await redisClient.sRem("online-drivers", socket.userId);
                }
                console.log(
                    "Socket Disconnected:",
                    socket.id
                );
            }
        );
    });
};

const getIO = () => {

    if (!io) {
        throw new Error(
            "Socket not initialized"
        );
    }

    return io;
};

module.exports = {
    initializeSocket,
    getIO
};