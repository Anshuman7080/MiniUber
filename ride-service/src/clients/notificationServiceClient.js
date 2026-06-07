const axios = require("axios");

const sendNotification = async ({
    userId,
    userRole,
    rideId,
    type,
    title,
    message
}) => {

    return axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/send`,
        {
            userId,
            userRole,
            rideId,
            type,
            title,
            message
        }
    );
};

module.exports = {
    sendNotification
};