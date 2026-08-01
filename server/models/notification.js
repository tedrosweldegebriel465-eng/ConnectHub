/**
 * ============================================
 * NOTIFICATION MODEL
 * Version: 2.0.0
 * Description: Notification schema for user notifications
 *              with support for multiple types, priorities, and actions
 * ============================================
 */

const mongoose = require('mongoose');

// ============================================
// CONSTANTS
// ============================================

const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  REPOST: 'repost',
  MENTION: 'mention',
  MESSAGE: 'message',
  REPLY: 'reply',
  STORY: 'story',
  REACTION: 'reaction',
  SHARE: 'share',
  SYSTEM: 'system',
  REMINDER: 'reminder',
  ACHIEVEMENT: 'achievement',
};

const NOTIFICATION_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

const NOTIFICATION_CATEGORIES = {
  SOCIAL: 'social',
  INTERACTION: 'interaction',
  SYSTEM: 'system',
  ACHIEVEMENT: 'achievement',
};

// ============================================
// NOTIFICATION SCHEMA
// ============================================

const notificationSchema = new mongoose.Schema(
  {
    // ===== Recipient & Sender =====
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
      index: true,
    },

    // ===== Type & Category =====
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: [true, 'Notification type is required'],
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(NOTIFICATION_CATEGORIES),
      default: NOTIFICATION_CATEGORIES.INTERACTION,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITIES),
      default: NOTIFICATION_PRIORITIES.MEDIUM,
    },

    // ===== Content =====
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ===== Related Entities =====
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story',
      default: null,
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // ===== Status =====
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    viewed: {
      type: Boolean,
      default: false,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },

    // ===== Actions =====
    actions: [{
      type: {
        type: String,
        enum: ['view', 'reply', 'like', 'follow', 'dismiss', 'open'],
        required: true,
      },
      label: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        trim: true,
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    }],

    // ===== Metadata =====
    isSystem: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    groupId: {
      type: String,
      trim: true,
    },
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
    image: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, priority: 1, createdAt: -1 });

// Index for cleanup
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for grouping
notificationSchema.index({ groupId: 1 });

// ============================================
// VIRTUALS
// ============================================

// Virtual for formatted message with emoji
notificationSchema.virtual('formattedMessage').get(function() {
  let message = this.message;
  const emojis = {
    [NOTIFICATION_TYPES.LIKE]: '❤️',
    [NOTIFICATION_TYPES.COMMENT]: '💬',
    [NOTIFICATION_TYPES.FOLLOW]: '👤',
    [NOTIFICATION_TYPES.REPOST]: '🔄',
    [NOTIFICATION_TYPES.MENTION]: '@',
    [NOTIFICATION_TYPES.MESSAGE]: '💌',
    [NOTIFICATION_TYPES.REPLY]: '↩️',
    [NOTIFICATION_TYPES.STORY]: '📸',
    [NOTIFICATION_TYPES.REACTION]: '😊',
    [NOTIFICATION_TYPES.SHARE]: '📤',
    [NOTIFICATION_TYPES.SYSTEM]: '⚙️',
    [NOTIFICATION_TYPES.REMINDER]: '⏰',
    [NOTIFICATION_TYPES.ACHIEVEMENT]: '🏆',
  };
  return `${emojis[this.type] || '📢'} ${message}`;
});

// Virtual for notification URL
notificationSchema.virtual('url').get(function() {
  if (this.post) {
    return `/post.html?id=${this.post}`;
  }
  if (this.comment) {
    return `/post.html?id=${this.comment}`;
  }
  if (this.story) {
    return `/story.html?id=${this.story}`;
  }
  if (this.message) {
    return `/messages.html?id=${this.message}`;
  }
  return '#';
});

// Virtual for if notification is unread
notificationSchema.virtual('isUnread').get(function() {
  return !this.read;
});

// ============================================
// MIDDLEWARE
// ============================================

// ===== Pre-save middleware =====
notificationSchema.pre('save', function(next) {
  // Set category based on type
  if (!this.category) {
    const categoryMap = {
      [NOTIFICATION_TYPES.LIKE]: NOTIFICATION_CATEGORIES.INTERACTION,
      [NOTIFICATION_TYPES.COMMENT]: NOTIFICATION_CATEGORIES.INTERACTION,
      [NOTIFICATION_TYPES.FOLLOW]: NOTIFICATION_CATEGORIES.SOCIAL,
      [NOTIFICATION_TYPES.REPOST]: NOTIFICATION_CATEGORIES.INTERACTION,
      [NOTIFICATION_TYPES.MENTION]: NOTIFICATION_CATEGORIES.SOCIAL,
      [NOTIFICATION_TYPES.MESSAGE]: NOTIFICATION_CATEGORIES.SOCIAL,
      [NOTIFICATION_TYPES.REPLY]: NOTIFICATION_CATEGORIES.INTERACTION,
      [NOTIFICATION_TYPES.STORY]: NOTIFICATION_CATEGORIES.SOCIAL,
      [NOTIFICATION_TYPES.REACTION]: NOTIFICATION_CATEGORIES.INTERACTION,
      [NOTIFICATION_TYPES.SHARE]: NOTIFICATION_CATEGORIES.INTERACTION,
      [NOTIFICATION_TYPES.SYSTEM]: NOTIFICATION_CATEGORIES.SYSTEM,
      [NOTIFICATION_TYPES.REMINDER]: NOTIFICATION_CATEGORIES.SYSTEM,
      [NOTIFICATION_TYPES.ACHIEVEMENT]: NOTIFICATION_CATEGORIES.ACHIEVEMENT,
    };
    this.category = categoryMap[this.type] || NOTIFICATION_CATEGORIES.INTERACTION;
  }

  // Set priority based on type
  if (!this.priority) {
    const priorityMap = {
      [NOTIFICATION_TYPES.LIKE]: NOTIFICATION_PRIORITIES.LOW,
      [NOTIFICATION_TYPES.COMMENT]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.FOLLOW]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.REPOST]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.MENTION]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.MESSAGE]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.REPLY]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.STORY]: NOTIFICATION_PRIORITIES.LOW,
      [NOTIFICATION_TYPES.REACTION]: NOTIFICATION_PRIORITIES.LOW,
      [NOTIFICATION_TYPES.SHARE]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.SYSTEM]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.REMINDER]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.ACHIEVEMENT]: NOTIFICATION_PRIORITIES.HIGH,
    };
    this.priority = priorityMap[this.type] || NOTIFICATION_PRIORITIES.MEDIUM;
  }

  // Set default expiry for non-critical notifications
  if (!this.expiresAt && this.type !== NOTIFICATION_TYPES.SYSTEM) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get notifications for a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Notifications
 */
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    category = null,
    read = null,
    priority = null,
    before = null,
  } = options;

  const skip = (page - 1) * limit;
  const filter = { recipient: userId };

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (read !== null) filter.read = read;
  if (priority) filter.priority = priority;
  if (before) filter.createdAt = { $lt: new Date(before) };

  const notifications = await this.find(filter)
    .populate('sender', 'name username avatar isVerified')
    .populate('post', 'content image')
    .populate('comment', 'content')
    .populate('story', 'media caption')
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(filter);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get unread notification count for a user
 * @param {ObjectId} userId - User ID
 * @param {String} type - Optional notification type
 * @returns {Promise<Number>} Unread count
 */
notificationSchema.statics.getUnreadCount = async function(userId, type = null) {
  const filter = {
    recipient: userId,
    read: false,
    dismissed: false,
  };

  if (type) filter.type = type;

  return this.countDocuments(filter);
};

/**
 * Mark notifications as read
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Update result
 */
notificationSchema.statics.markAsRead = async function(userId, options = {}) {
  const { notificationIds = null, type = null, all = false } = options;

  const filter = {
    recipient: userId,
    read: false,
  };

  if (notificationIds && notificationIds.length > 0) {
    filter._id = { $in: notificationIds };
  } else if (type) {
    filter.type = type;
  } else if (!all) {
    return { modifiedCount: 0 };
  }

  const result = await this.updateMany(
    filter,
    {
      read: true,
      readAt: new Date(),
    },
    { new: true }
  );

  return result;
};

/**
 * Dismiss notifications for a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Update result
 */
notificationSchema.statics.dismissNotifications = async function(userId, options = {}) {
  const { notificationIds = null, olderThan = null } = options;

  const filter = {
    recipient: userId,
    dismissed: false,
  };

  if (notificationIds && notificationIds.length > 0) {
    filter._id = { $in: notificationIds };
  } else if (olderThan) {
    filter.createdAt = { $lt: new Date(olderThan) };
  } else {
    return { modifiedCount: 0 };
  }

  const result = await this.updateMany(
    filter,
    {
      dismissed: true,
      dismissedAt: new Date(),
    },
    { new: true }
  );

  return result;
};

/**
 * Create grouped notification
 * @param {Object} data - Notification data
 * @param {String} groupKey - Group key
 * @returns {Promise<Object>} Created/Updated notification
 */
notificationSchema.statics.createGrouped = async function(data, groupKey) {
  const existing = await this.findOne({
    recipient: data.recipient,
    groupId: groupKey,
    read: false,
    dismissed: false,
  });

  if (existing) {
    existing.count += 1;
    existing.updatedAt = new Date();
    await existing.save();
    return existing;
  }

  const notification = new this({
    ...data,
    groupId: groupKey,
    count: 1,
  });

  await notification.save();
  return notification;
};

/**
 * Clean up old notifications
 * @param {Number} days - Days to keep
 * @returns {Promise<Object>} Delete result
 */
notificationSchema.statics.cleanupOld = async function(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.deleteMany({
    read: true,
    dismissed: true,
    createdAt: { $lt: cutoff },
  });
};

/**
 * Get notification stats for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Stats
 */
notificationSchema.statics.getStats = async function(userId) {
  const [total, unread, byType] = await Promise.all([
    this.countDocuments({ recipient: userId }),
    this.getUnreadCount(userId),
    this.aggregate([
      { $match: { recipient: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
  ]);

  const stats = {
    total,
    unread,
    byType: {},
    byCategory: {},
    byPriority: {},
  };

  byType.forEach(item => {
    stats.byType[item._id] = item.count;
  });

  return stats;
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark notification as read
 * @returns {Promise<Object>} Updated notification
 */
notificationSchema.methods.markRead = async function() {
  this.read = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

/**
 * Mark notification as viewed
 * @returns {Promise<Object>} Updated notification
 */
notificationSchema.methods.markViewed = async function() {
  this.viewed = true;
  this.viewedAt = new Date();
  await this.save();
  return this;
};

/**
 * Dismiss notification
 * @returns {Promise<Object>} Updated notification
 */
notificationSchema.methods.dismiss = async function() {
  this.dismissed = true;
  this.dismissedAt = new Date();
  await this.save();
  return this;
};

/**
 * Add action to notification
 * @param {Object} action - Action data
 * @returns {Promise<Object>} Updated notification
 */
notificationSchema.methods.addAction = async function(action) {
  this.actions.push(action);
  await this.save();
  return this;
};

// ============================================
// EXPORT
// ============================================

const Notification = mongoose.model('Notification', notificationSchema);

// Export constants
Notification.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
Notification.NOTIFICATION_PRIORITIES = NOTIFICATION_PRIORITIES;
Notification.NOTIFICATION_CATEGORIES = NOTIFICATION_CATEGORIES;

module.exports = Notification;