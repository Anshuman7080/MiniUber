
const mongoose=require("mongoose")

const riderSchema=new mongoose.Schema({
    userId:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true,
        trim:true,
    },
    phone:{
        type:String,
        trim :true,
    },
    profilePhoto:{
        type:String,
        default:"",
    },
    rating:{
        type:Number,
        default:5,
        min:0,
        max:5,
    },
    totalRides:{
        type:Number,
        default:0,
        min:0,
    },
    isActive:{
        type:Boolean,
        default:true,
    }
},{timestamps:true})

riderSchema.index(
    {userId:1},
    {unique:true}
);

riderSchema.index(
    {phone:1},
    {
        unique:true,
        sparse:true
    }
);

module.exports=mongoose.model("Rider",riderSchema);