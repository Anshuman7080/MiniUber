
const axios =require('axios');


const createRiderProfile=async(userId,name)=>{
    return axios.post(
       `${process.env.RIDER_SERVICE_URL}/create`, 
       { userId, name }
    )
}

module.exports={
    createRiderProfile
};