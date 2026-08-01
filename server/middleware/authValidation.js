const { body } = require("express-validator");

const PASSWORD_MIN = 8;

const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: PASSWORD_MIN })
    .withMessage(`Password must be at least ${PASSWORD_MIN} characters`),
  body("inviteCode")
    .optional()
    .trim()
    .isLength({ min: 4, max: 64 })
    .withMessage("Invite code is invalid"),
  body("passcode")
    .optional()
    .trim()
    .isLength({ min: 4, max: 64 })
    .withMessage("Invite code is invalid"),
  body("ageConfirmed")
    .custom((value) => value === true || value === "true")
    .withMessage("You must confirm you are at least 13 years old"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),
];

const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

module.exports = {
  PASSWORD_MIN,
  registerValidation,
  loginValidation,
};
