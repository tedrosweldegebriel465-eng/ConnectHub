/**
 * ============================================
 * COMMENT MODEL
 * Version: 2.0.0
 * Description: Comment schema for post comments
 *              with support for replies, likes, and editing
 * ============================================
 */

const mongoose = require('mongoose');

// ============================================
// COMMENT SCHEMA
// ============================================

const commentSchema = new mongoose.Schema(
  {
    // ===== Content =====
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment must be at least 1 character'],
      maxlength: [300, 'Comment cannot exceed 300 characters'],
    },

    // ===== Relationships =====
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
      index: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },

    // ===== Interactions =====
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===== Replies =====
    replies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    }],
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===== Status =====
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },

    // ===== Metadata =====
    mentionedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    hasMentions: {
      type: Boolean,
      default: false,
    },
    attachments: [{
      url: {
        type: String,
        trim: true,
      },
      type: {
        type: String,
        enum: ['image', 'video', 'file'],
        default: 'image',
      },
      filename: {
        type: String,
        trim: true,
      },
    }],
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

// Compound index for efficient queries
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

// Index for search
commentSchema.index({ content: 'text' });

// ============================================
// VIRTUALS
// ============================================

// Virtual for formatted content with mentions
commentSchema.virtual('formattedContent').get(function() {
  if (!this.content) return '';
  let formatted = this.content;
  // Replace mentions with links (handled on frontend)
  return formatted;
});

// Virtual for total likes
commentSchema.virtual('totalLikes').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for total replies
commentSchema.virtual('totalReplies').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for if comment is a reply
commentSchema.virtual('isReply').get(function() {
  return !!this.parentComment;
});

// ============================================
// MIDDLEWARE
// ============================================

// ===== Pre-save middleware =====
commentSchema.pre('save', function(next) {
  // Update like count
  if (this.isModified('likes')) {
    this.likeCount = this.likes ? this.likes.length : 0;
  }

  // Update reply count (when replies array is modified)
  if (this.isModified('replies')) {
    this.replyCount = this.replies ? this.replies.length : 0;
  }

  // Check for mentions
  if (this.isModified('content')) {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = this.content.match(mentionRegex);
    this.hasMentions = !!(matches && matches.length > 0);
    // Note: Actual mention users are resolved in controller
  }

  next();
});

// ===== Pre-validate middleware =====
commentSchema.pre('validate', function(next) {
  // Ensure content is trimmed
  if (this.content) {
    this.content = this.content.trim();
  }
  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get comments for a post with pagination
 * @param {ObjectId} postId - Post ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} Comments
 */
commentSchema.statics.getCommentsForPost = async function(postId, options = {}) {
  const { page = 1, limit = 20, sort = 'newest' } = options;
  const skip = (page - 1) * limit;

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    mostLiked: { likeCount: -1 },
  };

  return this.find({ 
    post: postId, 
    parentComment: null,
    isDeleted: false,
  })
    .populate('author', 'name username avatar isVerified')
    .populate({
      path: 'replies',
      match: { isDeleted: false },
      populate: {
        path: 'author',
        select: 'name username avatar isVerified',
      },
    })
    .sort(sortOptions[sort] || sortOptions.newest)
    .skip(skip)
    .limit(limit);
};

/**
 * Get replies for a comment with pagination
 * @param {ObjectId} commentId - Comment ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} Replies
 */
commentSchema.statics.getRepliesForComment = async function(commentId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  return this.find({ 
    parentComment: commentId,
    isDeleted: false,
  })
    .populate('author', 'name username avatar isVerified')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Get comment count for a post
 * @param {ObjectId} postId - Post ID
 * @returns {Promise<Number>} Comment count
 */
commentSchema.statics.getCommentCountForPost = async function(postId) {
  return this.countDocuments({ 
    post: postId, 
    isDeleted: false 
  });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Toggle like on comment
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated comment
 */
commentSchema.methods.toggleLike = async function(userId) {
  const index = this.likes.indexOf(userId);
  let liked = false;

  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
    liked = true;
  }

  await this.save();
  return { liked, likeCount: this.likes.length };
};

/**
 * Add a reply to this comment
 * @param {Object} replyData - Reply data
 * @returns {Promise<Object>} Created reply
 */
commentSchema.methods.addReply = async function(replyData) {
  const reply = new this.constructor(replyData);
  await reply.save();

  this.replies.push(reply._id);
  await this.save();

  return reply;
};

/**
 * Soft delete comment
 * @returns {Promise<Object>} Updated comment
 */
commentSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[deleted]';
  await this.save();
  return this;
};

// ============================================
// EXPORT
// ============================================

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;