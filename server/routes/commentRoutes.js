const express = require("express");
const router = express.Router();
const {
  addComment, getComments, deleteComment, likeComment,
} = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

router.post("/:postId",   protect, addComment);
router.get("/:postId",    protect, getComments);
router.delete("/:id",     protect, deleteComment);
router.put("/:id/like",   protect, likeComment);

module.exports = router;
