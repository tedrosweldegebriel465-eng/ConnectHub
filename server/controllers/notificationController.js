/**
 * ============================================
 * NOTIFICATION CONTROLLER
 * Version: 2.0.0
 * Description: Handles notification operations
 *              including fetching, marking read, and management
 * ============================================
 */

const Notification = require('../models/notification');
const User = require('../models/user');
const { validationResult } = require('express-validator');

// ============================================
// GET NOTIFICATIONS
// ============================================

/**
 * @desc    Get user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, read, priority, before } = req.query;
    const userId = req.user._id;

    const result = await Notification.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      category,
      read: read !== undefined ? read === 'true' : undefined,
      priority,
      before,
    });

    // Mark as viewed
    await Notification.updateMany(
      { recipient: userId, viewed: false },
      { viewed: true, viewedAt: new Date() }
    );

    res.json({
      success: true,
      notifications: result.notifications,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET RECENT NOTIFICATIONS
// ============================================

/**
 * @desc    Get recent notifications (for dropdown)
 * @route   GET /api/notifications/recent
 * @access  Private
 */
const getRecentNotifications = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user._id;

    const notifications = await Notification.find({
      recipient: userId,
      dismissed: false,
    })
      .populate('sender', 'name username avatar')
      .populate('post', 'content image')
      .populate('comment', 'content')
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      notifications,
      unreadCount,
    });

  } catch (error) {
    console.error('Get recent notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recent notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET UNREAD COUNT
// ============================================

/**
 * @desc    Get total unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      count,
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET SINGLE NOTIFICATION
// ============================================

/**
 * @desc    Get a single notification by ID
 * @route   GET /api/notifications/:id
 * @access  Private
 */
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id)
      .populate('sender', 'name username avatar')
      .populate('post', 'content image')
      .populate('comment', 'content');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this notification'
      });
    }

    res.json({
      success: true,
      notification,
    });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// MARK ALL AS READ
// ============================================

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.markAsRead(userId, { all: true });

    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: result.modifiedCount,
    });

  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// MARK SINGLE AS READ
// ============================================

/**
 * @desc    Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markSingleRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this notification as read'
      });
    }

    await notification.markRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
    });

  } catch (error) {
    console.error('Mark single read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// MARK MULTIPLE AS READ
// ============================================

/**
 * @desc    Mark multiple notifications as read
 * @route   PUT /api/notifications/read-multiple
 * @access  Private
 */
const markMultipleRead = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { notificationIds } = req.body;
    const userId = req.user._id;

    const result = await Notification.markAsRead(userId, { notificationIds });

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      count: result.modifiedCount,
    });

  } catch (error) {
    console.error('Mark multiple read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// DELETE NOTIFICATION
// ============================================

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await notification.dismiss();

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// DELETE ALL READ NOTIFICATIONS
// ============================================

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/notifications/read-all
 * @access  Private
 */
const deleteAllRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({
      recipient: userId,
      read: true,
      dismissed: false,
    });

    res.json({
      success: true,
      message: `${result.deletedCount} read notifications deleted`,
      count: result.deletedCount,
    });

  } catch (error) {
    console.error('Delete all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting read notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * @desc    Get user's notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
const getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('notificationPreferences');

    res.json({
      success: true,
      preferences: user.notificationPreferences || {
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        reposts: true,
        messages: true,
        stories: true,
        system: true,
        emailNotifications: true,
      },
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user's notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
const updateNotificationPreferences = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { preferences } = req.body;
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { notificationPreferences: preferences },
      { new: true, runValidators: true }
    ).select('notificationPreferences');

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: user.notificationPreferences,
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  getNotifications,
  getRecentNotifications,
  getUnreadCount,
  getNotificationById,
  markAllRead,
  markSingleRead,
  markMultipleRead,
  deleteNotification,
  deleteAllRead,
  getNotificationPreferences,
  updateNotificationPreferences,
};