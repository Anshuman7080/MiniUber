const express = require("express");

const router = express.Router();

const {
    sendNotification,
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead
} = require("../controllers/notificationController");

router.post(
    "/internal/send",
    sendNotification
);

router.get(
    "/my-notifications",
    getMyNotifications
);

router.patch(
    "/:notificationId/read",
    markNotificationRead
);

router.patch(
    "/read-all",
    markAllNotificationsRead
);

module.exports = router;