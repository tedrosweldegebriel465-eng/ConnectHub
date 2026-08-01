const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
  submitReport,
  getReports,
  getReportStats,
  updateReport,
} = require('../controllers/reportController');
const { protect, moderator } = require('../middleware/authMiddleware');

// Validation
const validateReport = [
  body('targetType')
    .isIn(['user', 'post', 'comment', 'message', 'story'])
    .withMessage('Invalid target type'),
  body('targetId')
    .isMongoId()
    .withMessage('Invalid target ID'),
  body('category')
    .isIn(['spam', 'harassment', 'hate_speech', 'nsfw', 'misinformation', 'impersonation', 'copyright', 'privacy', 'self_harm', 'violence', 'other'])
    .withMessage('Invalid category'),
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),
];

// Routes
router.post('/', protect, validateReport, submitReport);
router.get('/', protect, moderator, getReports);
router.get('/stats', protect, moderator, getReportStats);
router.put('/:id', protect, moderator, updateReport);

module.exports = router;