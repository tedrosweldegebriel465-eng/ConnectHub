const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  followUser,
  blockUser,
  unblockUser,
  searchUsers,
  getSuggested,
  getAnalytics,
  exportUserData,
  getProfileViewers,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/upload");

// Specific routes BEFORE wildcards
router.get("/search", protect, searchUsers);
router.get("/suggested", protect, getSuggested);
router.get("/analytics", protect, getAnalytics);
router.get("/profile-viewers", protect, getProfileViewers);
router.get("/me/export", protect, exportUserData);
router.put("/profile", protect, upload.single("cover"), updateProfile);
router.put("/:id/block", protect, blockUser);
router.put("/:id/unblock", protect, unblockUser);

// Wildcard routes last
router.get("/:username", protect, getProfile);
router.put("/:id/follow", protect, followUser);

module.exports = router;
