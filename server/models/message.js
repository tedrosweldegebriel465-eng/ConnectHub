/**
 * ============================================
 * MESSAGE MODEL
 * Version: 2.0.0
 * Description: Message schema for private messaging
 *              with support for attachments, reactions, and status
 * ============================================
 */

const mongoose = require('mongoose');

// ============================================
// MESSAGE SCHEMA
// ============================================

const messageSchema = new mongoose.Schema(
  {
    // ===== Sender & Recipient =====
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true,
    },

    // ===== Content =====
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message must be at least 1 character'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },

    // ===== Attachments =====
    attachments: [{
      url: {
        type: String,
        trim: true,
        required: true,
      },
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'file', 'gif'],
        default: 'file',
      },
      filename: {
        type: String,
        trim: true,
      },
      size: {
        type: Number,
        default: 0,
      },
      mimeType: {
        type: String,
        trim: true,
      },
    }],

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
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // ===== Reactions =====
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      emoji: {
        type: String,
        required: true,
        maxlength: 2,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],

    // ===== Reply To =====
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // ===== Metadata =====
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    hasMentions: {
      type: Boolean,
      default: false,
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

// Compound indexes for conversation queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, sender: 1, createdAt: -1 });

// Indexes for status queries
messageSchema.index({ recipient: 1, read: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, delivered: 1, createdAt: -1 });

// Index for deleted messages
messageSchema.index({ deletedFor: 1, createdAt: -1 });

// Index for search
messageSchema.index({ content: 'text' });

// ============================================
// VIRTUALS
// ============================================

// Virtual for formatted content with mentions
messageSchema.virtual('formattedContent').get(function() {
  if (!this.content) return '';
  return this.content;
});

// Virtual for total reactions
messageSchema.virtual('totalReactions').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// Virtual for if message has attachments
messageSchema.virtual('hasAttachments').get(function() {
  return this.attachments && this.attachments.length > 0;
});

// Virtual for if message is a reply
messageSchema.virtual('isReply').get(function() {
  return !!this.replyTo;
});

// Virtual for message status
messageSchema.virtual('status').get(function() {
  if (this.isDeleted) return 'deleted';
  if (this.read) return 'read';
  if (this.delivered) return 'delivered';
  return 'sent';
});

// ============================================
// MIDDLEWARE
// ============================================

// ===== Pre-save middleware =====
messageSchema.pre('save', function(next) {
  // Trim content
  if (this.content) {
    this.content = this.content.trim();
  }

  // Check for mentions
  if (this.isModified('content')) {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = this.content.match(mentionRegex);
    this.hasMentions = !!(matches && matches.length > 0);
    // Note: Actual mention users are resolved in controller
  }

  // Ensure sender and recipient are different
  if (this.sender && this.recipient && 
      this.sender.toString() === this.recipient.toString()) {
    return next(new Error('Cannot send message to yourself'));
  }

  next();
});

// ===== Pre-validate middleware =====
messageSchema.pre('validate', function(next) {
  // Ensure content or attachments
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    return next(new Error('Message must have content or attachments'));
  }
  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get conversation between two users
 * @param {ObjectId} user1 - First user ID
 * @param {ObjectId} user2 - Second user ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} Messages
 */
messageSchema.statics.getConversation = async function(user1, user2, options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  return this.find({
    $or: [
      { sender: user1, recipient: user2 },
      { sender: user2, recipient: user1 },
    ],
    deletedFor: { $nin: [user1] }, // Don't show deleted messages
  })
    .populate('sender', 'name username avatar')
    .populate('recipient', 'name username avatar')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Get inbox for a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} Conversations
 */
messageSchema.statics.getInbox = async function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  // Get distinct conversation partners
  const conversations = await this.aggregate([
    {
      $match: {
        $or: [
          { sender: userId },
          { recipient: userId },
        ],
        deletedFor: { $nin: [userId] },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', userId] },
            '$recipient',
            '$sender',
          ],
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$recipient', userId] },
                { $eq: ['$read', false] },
              ] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: { 'lastMessage.createdAt': -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  return conversations;
};

/**
 * Get unread message count for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Number>} Unread count
 */
messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    read: false,
    isDeleted: false,
  });
};

/**
 * Mark messages as read
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} senderId - Sender ID (optional)
 * @returns {Promise<Object>} Update result
 */
messageSchema.statics.markAsRead = async function(userId, senderId = null) {
  const filter = {
    recipient: userId,
    read: false,
    isDeleted: false,
  };

  if (senderId) {
    filter.sender = senderId;
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
 * Search messages
 * @param {ObjectId} userId - User ID
 * @param {String} query - Search query
 * @param {Object} options - Options
 * @returns {Promise<Array>} Messages
 */
messageSchema.statics.searchMessages = async function(userId, query, options = {}) {
  const { limit = 50 } = options;

  return this.find({
    $or: [
      { sender: userId },
      { recipient: userId },
    ],
    $text: { $search: query },
    deletedFor: { $nin: [userId] },
  })
    .populate('sender', 'name username avatar')
    .populate('recipient', 'name username avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get message stats for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Stats
 */
messageSchema.statics.getStats = async function(userId) {
  const [sent, received, unread, conversations] = await Promise.all([
    this.countDocuments({ sender: userId, isDeleted: false }),
    this.countDocuments({ recipient: userId, isDeleted: false }),
    this.getUnreadCount(userId),
    this.distinct('sender', { recipient: userId, isDeleted: false }),
  ]);

  return {
    sent,
    received,
    unread,
    totalConversations: conversations.length,
  };
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark message as read
 * @returns {Promise<Object>} Updated message
 */
messageSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

/**
 * Mark message as delivered
 * @returns {Promise<Object>} Updated message
 */
messageSchema.methods.markAsDelivered = async function() {
  this.delivered = true;
  this.deliveredAt = new Date();
  await this.save();
  return this;
};

/**
 * Add reaction to message
 * @param {ObjectId} userId - User ID
 * @param {String} emoji - Emoji to add
 * @returns {Promise<Object>} Updated message
 */
messageSchema.methods.addReaction = async function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => 
    r.user.toString() !== userId.toString()
  );

  // Add new reaction
  this.reactions.push({ user: userId, emoji });
  await this.save();
  return this;
};

/**
 * Remove reaction from message
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated message
 */
messageSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => 
    r.user.toString() !== userId.toString()
  );
  await this.save();
  return this;
};

/**
 * Soft delete message for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated message
 */
messageSchema.methods.deleteForUser = async function(userId) {
  if (!this.deletedFor.includes(userId)) {
    this.deletedFor.push(userId);
    await this.save();
  }

  // If both users have deleted, mark as fully deleted
  if (this.deletedFor.length === 2) {
    this.isDeleted = true;
    await this.save();
  }

  return this;
};

/**
 * Edit message content
 * @param {String} newContent - New content
 * @returns {Promise<Object>} Updated message
 */
messageSchema.methods.editContent = async function(newContent) {
  this.content = newContent.trim();
  this.isEdited = true;
  this.editedAt = new Date();
  await this.save();
  return this;
};

// ============================================
// EXPORT
// ============================================

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;