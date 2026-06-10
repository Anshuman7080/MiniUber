const io=require("socket.io-client");

const socket=io("http://localhost:5004");

socket.on("connect",()=>{
    console.log("Connected to Server");
    console.log("Socket ID",socket.id);
    socket.emit(
        "join-room",
        {
            userId:"6a24dad15a67ba935b3a4f36",
            role:"driver"
        }
    )

    socket.on(
        "test-message",
        (data)=>{
            console.log("Message from server",data);
        }
    )
    socket.on(
        "new-ride-request",
        (data)=>{
            console.log("New Ride Request");
            console.log(data);
        }
    )

})


socket.on(
    "ride-cancelled",
    (data) => {

        console.log(
            "Ride Cancelled"
        );

        console.log(data);
    }
);


setInterval(()=>{
    socket.emit(
        "location-update",
        {
            rideId:"6a2648ce4a5f2b2df1fbec44",
            latitude:25.3176,
            longitude:82.9739

        }
    )
},5000);