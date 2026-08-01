const express = require("express");
const router = express.Router();
const {
  createPost, getPosts, getPostById, deletePost,
  likePost, bookmarkPost, repostPost, editPost, pinPost, votePoll,
  getPostsByUser, getUserMediaPosts, getBookmarks, getTrending, getLikedPosts,
  getPostsByHashtag, getTrendingHashtags, getExploreStats, getClips,
} = require("../controllers/postController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/upload");

// Specific routes BEFORE wildcards
router.get("/clips",            protect, getClips);
router.get("/bookmarks",         protect, getBookmarks);
router.get("/trending",          protect, getTrending);
router.get("/liked",             protect, getLikedPosts);
router.get("/stats/explore",     protect, getExploreStats);
router.get("/hashtags/trending", protect, getTrendingHashtags);
router.get("/hashtag/:tag",      protect, getPostsByHashtag);
router.get("/user/:userId/media", protect, getUserMediaPosts);
router.get("/user/:userId",      protect, getPostsByUser);

router.get("/",   protect, getPosts);
router.post("/",  protect, upload.single("media"), createPost);
router.get("/:id",               protect, getPostById);
router.delete("/:id",            protect, deletePost);
router.put("/:id/like",          protect, likePost);
router.put("/:id/bookmark",      protect, bookmarkPost);
router.put("/:id/repost",        protect, repostPost);
router.put("/:id/edit",          protect, editPost);
router.put("/:id/pin",           protect, pinPost);
router.put("/:id/poll/:optionIndex", protect, votePoll);

module.exports = router;
