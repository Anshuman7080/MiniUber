const io = require("socket.io-client");

const socket = io("http://localhost:5004");

socket.on("connect", () => {

    console.log(
        "Rider Connected"
    );

    socket.emit(
        "join-room",
        {
            userId: "6a24da685a67ba935b3a4f34",
            role: "rider"
        }
    );
});

socket.on(
    "ride-accepted",
    (data) => {

        console.log(
            "Ride Accepted"
        );

        console.log(data);
    }
);


socket.on(
    "driver-arrived",
    (data)=>{
        console.log(data);
    }
);

socket.on(
    "ride-started",
    (data)=>{
        console.log(data);
    }
);

socket.on(
    "ride-completed",
    (data)=>{
        console.log(data);
    }
);

socket.on(
    "ride-cancelled",
    (data) => {

        console.log(
            "Ride Cancelled"
        );

        console.log(data);
    }
);


socket.on(
    "driver-location-updated",
    (data) => {

        console.log(
            "Driver Location"
        );

        console.log(data);
    }
);