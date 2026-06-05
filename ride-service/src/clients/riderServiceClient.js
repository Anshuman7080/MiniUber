const axios = require("axios");

const updateRiderRating = async (
    riderId,
    rating
) => {

    return axios.patch(
        `${process.env.RIDER_SERVICE_URL}/internal/rating/${riderId}`,
        {
            rating
        }
    );
};

module.exports = {
    updateRiderRating
};