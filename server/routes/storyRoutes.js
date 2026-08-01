const express = require("express");
const router = express.Router();
const {
  createStory, getStories, viewStory, deleteStory,
} = require("../controllers/storyController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/upload");

router.get("/",            protect, getStories);
router.post("/",           protect, upload.single("media"), createStory);
router.put("/:id/view",    protect, viewStory);
router.delete("/:id",      protect, deleteStory);

module.exports = router;
