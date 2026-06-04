const mongoose=require("mongoose");

const driverSchema=new mongoose.Schema({
    userId:{
        type:String,
        required:true,
    },
    name:{
        type:String,
        required:true,
        trim:true
    },
    phone:{
        type:String,
        default:"",
    },
    vehicleType:{
        type:String,
        enum:["bike","car","auto"],
        required:true,
    },
    vehicleNumber:{
        type:String,
        required:true,
        uppercase:true,
        trim:true,
    },
    drivingLicense:{
        type:String,
        required:true,
        trim:true
    },
    isApproved:{
        type:Boolean,
        default:false,
    },
    isAvailable:{
        type:Boolean,
        default:false,
    },
    rating:{
        type:Number,
        default:5,
        min:0,
        max:5
    },
    totalTrips:{
        type:Number,
        default:0,
    }
},{timestamps:true});

driverSchema.index(
    {userId:1},
    {unique:true}
)

driverSchema.index(
    {vehicleNumber:1},
    {unique:true}
);

driverSchema.index(
    { isAvailable: 1 }
);

module.exports=mongoose.model("Driver",driverSchema);