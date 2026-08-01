const express = require("express");
const router = express.Router();
const {
  getNotifications, getUnreadCount, markAllRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.get("/",             protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.put("/read-all",     protect, markAllRead);

module.exports = router;
