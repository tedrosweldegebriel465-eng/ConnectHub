/**
 * ============================================
 * REPORT CONTROLLER
 * Version: 2.0.0
 * Description: Handles reporting and moderation operations
 * ============================================
 */

const Report = require('../models/report');
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const { validationResult } = require('express-validator');

// ============================================
// SUBMIT REPORT
// ============================================

/**
 * @desc    Report a user, post, or comment
 * @route   POST /api/reports
 * @access  Private
 */
const submitReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { targetType, targetId, category, reason, description } = req.body;
    const reporterId = req.user._id;

    // Check if target exists
    let targetExists = false;
    switch (targetType) {
      case 'user':
        targetExists = await User.exists({ _id: targetId });
        break;
      case 'post':
        targetExists = await Post.exists({ _id: targetId, isDeleted: false });
        break;
      case 'comment':
        targetExists = await Comment.exists({ _id: targetId, isDeleted: false });
        break;
      case 'message':
        // Message exists check would go here
        break;
      case 'story':
        // Story exists check would go here
        break;
    }

    if (!targetExists) {
      return res.status(404).json({
        success: false,
        message: 'Target not found'
      });
    }

    // Check if already reported
    const existingReport = await Report.findOne({
      reporter: reporterId,
      targetId,
      targetType,
      status: { $in: ['pending', 'reviewing'] },
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this content'
      });
    }

    // Create report
    const report = await Report.create({
      reporter: reporterId,
      targetType,
      targetId,
      category,
      reason,
      description,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report,
    });

  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET REPORTS
// ============================================

/**
 * @desc    Get reports (Admin only)
 * @route   GET /api/reports
 * @access  Private/Admin
 */
const getReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, priority } = req.query;
    const userId = req.user._id;

    // Check if user is admin
    const user = await User.findById(userId);
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view reports'
      });
    }

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (priority) filters.priority = priority;

    const result = await Report.getReports(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      reports: result.reports,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET REPORT STATS
// ============================================

/**
 * @desc    Get report statistics (Admin only)
 * @route   GET /api/reports/stats
 * @access  Private/Admin
 */
const getReportStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user is admin
    const user = await User.findById(userId);
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view report stats'
      });
    }

    const stats = await Report.getStats();

    res.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching report stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// UPDATE REPORT STATUS
// ============================================

/**
 * @desc    Update report status (Admin only)
 * @route   PUT /api/reports/:id
 * @access  Private/Admin
 */
const updateReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, resolution, resolutionNote } = req.body;
    const userId = req.user._id;

    // Check if user is admin
    const user = await User.findById(userId);
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update reports'
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Update based on status
    switch (status) {
      case 'resolved':
        await report.resolve(userId, resolution, resolutionNote);
        break;
      case 'dismissed':
        await report.dismiss(userId, resolutionNote);
        break;
      case 'reviewing':
        await report.assignTo(userId);
        break;
      case 'escalated':
        await report.escalate(userId, resolutionNote);
        break;
      default:
        report.status = status;
        await report.save();
    }

    res.json({
      success: true,
      message: 'Report updated successfully',
      report,
    });

  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  submitReport,
  getReports,
  getReportStats,
  updateReport,
};