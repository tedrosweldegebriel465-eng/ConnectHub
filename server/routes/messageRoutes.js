const express = require("express");
const router = express.Router();
const {
  sendMessage, getConversation, getInbox, getUnreadCount,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

router.get("/",                protect, getInbox);
router.get("/unread-count",    protect, getUnreadCount);
router.get("/:userId",         protect, getConversation);
router.post("/:recipientId",   protect, sendMessage);

module.exports = router;
