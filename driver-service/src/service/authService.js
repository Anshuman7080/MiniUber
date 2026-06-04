const axios = require("axios");

const updateUserRole = async (
  userId,
  role
) => {

  return axios.patch(
    `${process.env.AUTH_SERVICE_URL}/internal/update-role`,
    {
      userId,
      role
    }
  );
};

module.exports = {
  updateUserRole
};