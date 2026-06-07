const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

    userId: {
        type: String,
        required: true
    },

    userRole: {
        type: String,
        enum: ["rider", "driver"],
        required: true
    },

    rideId: {
        type: String,
        default: null
    },

    type: {
        type: String,
        required: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    message: {
        type: String,
        required: true,
        trim: true
    },

    isRead: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

notificationSchema.index({ userId: 1 });

notificationSchema.index({ rideId: 1 });

notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);