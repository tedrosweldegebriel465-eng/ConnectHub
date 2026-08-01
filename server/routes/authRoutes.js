const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  registerValidation,
  loginValidation,
} = require("../middleware/authValidation");

router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

module.exports = router;
