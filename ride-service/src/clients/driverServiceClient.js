const axios = require("axios");

const getAvailableDrivers = async () => {

    const response = await axios.get(
        `${process.env.DRIVER_SERVICE_URL}/available-drivers`
    );

    return response.data.drivers;
};

const updateDriverAvailability = async (
    driverId,
    isAvailable
) => {

    return axios.patch(
        `${process.env.DRIVER_SERVICE_URL}/availability/${driverId}`,
        {
            isAvailable
        }
    );
};

const updateDriverRating = async (
    driverId,
    rating
) => {

    return axios.patch(
        `${process.env.DRIVER_SERVICE_URL}/rating/${driverId}`,
        {
            rating
        }
    );
};

module.exports = {
    getAvailableDrivers,
    updateDriverAvailability,
    updateDriverRating
};