/**
 * ============================================
 * STORY MODEL
 * Version: 2.0.0
 * Description: Story schema for ephemeral content
 *              with support for images, videos, and interactions
 * ============================================
 */

const mongoose = require('mongoose');

// ============================================
// CONSTANTS
// ============================================

const STORY_MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
};

const STORY_VISIBILITY = {
  PUBLIC: 'public',
  FOLLOWERS: 'followers',
  CLOSE_FRIENDS: 'close_friends',
  CUSTOM: 'custom',
};

const STORY_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
};

// ============================================
// STORY SCHEMA
// ============================================

const storySchema = new mongoose.Schema(
  {
    // ===== Author =====
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },

    // ===== Media =====
    media: {
      type: String,
      required: [true, 'Media URL is required'],
      trim: true,
    },
    mediaType: {
      type: String,
      enum: Object.values(STORY_MEDIA_TYPES),
      default: STORY_MEDIA_TYPES.IMAGE,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    mediaDuration: {
      type: Number, // Duration in seconds for videos
      default: 0,
    },
    mediaSize: {
      type: Number, // Size in bytes
      default: 0,
    },

    // ===== Content =====
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Caption cannot exceed 200 characters'],
    },
    hashtags: [{
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    }],
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    }],

    // ===== Location =====
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
        index: '2dsphere',
      },
    },

    // ===== Visibility =====
    visibility: {
      type: String,
      enum: Object.values(STORY_VISIBILITY),
      default: STORY_VISIBILITY.PUBLIC,
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // ===== Interactions =====
    viewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    viewCount: {
      type: Number,
      default: 0,
    },
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
    reactionCount: {
      type: Number,
      default: 0,
    },
    replies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    }],
    replyCount: {
      type: Number,
      default: 0,
    },

    // ===== Status & Expiry =====
    status: {
      type: String,
      enum: Object.values(STORY_STATUS),
      default: STORY_STATUS.ACTIVE,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expireAfterSeconds: 0 },
    },
    archivedAt: {
      type: Date,
      default: null,
    },

    // ===== Analytics =====
    analytics: {
      avgViewDuration: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
      },
      engagementRate: {
        type: Number,
        default: 0,
      },
    },

    // ===== Metadata =====
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web',
    },
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
    },

    // ===== Close Friends =====
    isCloseFriendsOnly: {
      type: Boolean,
      default: false,
    },
    closeFriendsList: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

// Compound indexes for efficient queries
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ status: 1, expiresAt: 1 });
storySchema.index({ visibility: 1, status: 1 });
storySchema.index({ hashtags: 1, createdAt: -1 });

// Indexes for analytics
storySchema.index({ viewCount: -1 });
storySchema.index({ reactionCount: -1 });

// Geospatial index
storySchema.index({ coordinates: '2dsphere' });

// ============================================
// VIRTUALS
// ============================================

// Virtual for total reactions
storySchema.virtual('totalReactions').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// Virtual for total replies
storySchema.virtual('totalReplies').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for unique viewers
storySchema.virtual('uniqueViewers').get(function() {
  return this.viewers ? this.viewers.length : 0;
});

// Virtual for is expired
storySchema.virtual('isExpired').get(function() {
  return new Date() > new Date(this.expiresAt);
});

// Virtual for is active
storySchema.virtual('isActive').get(function() {
  return this.status === STORY_STATUS.ACTIVE && !this.isExpired;
});

// Virtual for formatted caption with hashtags
storySchema.virtual('formattedCaption').get(function() {
  if (!this.caption) return '';
  let formatted = this.caption;
  formatted = formatted.replace(/#([a-zA-Z0-9_]+)/g, (match, tag) => {
    return `<a href="/explore.html?tag=${tag}" class="hashtag-link">#${tag}</a>`;
  });
  return formatted;
});

// ============================================
// MIDDLEWARE
// ============================================

// ===== Pre-save middleware =====
storySchema.pre('save', function(next) {
  // Trim caption
  if (this.caption) {
    this.caption = this.caption.trim();
  }

  // Extract hashtags from caption
  if (this.isModified('caption')) {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = this.caption.match(hashtagRegex);
    if (matches) {
      const hashtags = matches.map(h => h.substring(1).toLowerCase());
      this.hashtags = [...new Set([...this.hashtags, ...hashtags])];
    }
  }

  // Update view count
  if (this.isModified('viewers')) {
    this.viewCount = this.viewers ? this.viewers.length : 0;
  }

  // Update reaction count
  if (this.isModified('reactions')) {
    this.reactionCount = this.reactions ? this.reactions.length : 0;
  }

  // Update reply count
  if (this.isModified('replies')) {
    this.replyCount = this.replies ? this.replies.length : 0;
  }

  // Auto-set close friends list
  if (this.visibility === STORY_VISIBILITY.CLOSE_FRIENDS) {
    this.isCloseFriendsOnly = true;
  }

  next();
});

// ===== Pre-validate middleware =====
storySchema.pre('validate', function(next) {
  // Ensure media is valid
  if (!this.media) {
    return next(new Error('Media URL is required'));
  }

  // Validate media type matches file
  if (this.mediaType === STORY_MEDIA_TYPES.VIDEO && !this.mediaDuration) {
    // Video duration should be set by controller
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get active stories for a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Stories
 */
storySchema.statics.getActiveStories = async function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const query = {
    status: STORY_STATUS.ACTIVE,
    expiresAt: { $gt: new Date() },
    $or: [
      { visibility: STORY_VISIBILITY.PUBLIC },
      { author: userId },
      { visibility: STORY_VISIBILITY.FOLLOWERS },
      { visibility: STORY_VISIBILITY.CLOSE_FRIENDS },
    ],
  };

  const stories = await this.find(query)
    .populate('author', 'name username avatar isVerified')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get stories by author
 * @param {ObjectId} authorId - Author ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Stories
 */
storySchema.statics.getByAuthor = async function(authorId, options = {}) {
  const { page = 1, limit = 20, includeExpired = false } = options;
  const skip = (page - 1) * limit;

  const query = {
    author: authorId,
    status: STORY_STATUS.ACTIVE,
  };

  if (!includeExpired) {
    query.expiresAt = { $gt: new Date() };
  }

  const stories = await this.find(query)
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get stories by hashtag
 * @param {String} hashtag - Hashtag to search
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Stories
 */
storySchema.statics.getByHashtag = async function(hashtag, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const query = {
    hashtags: hashtag.toLowerCase(),
    status: STORY_STATUS.ACTIVE,
    expiresAt: { $gt: new Date() },
    visibility: STORY_VISIBILITY.PUBLIC,
  };

  const stories = await this.find(query)
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get story stats for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Statistics
 */
storySchema.statics.getStats = async function(userId) {
  const [total, active, expired, totalViews, totalReactions] = await Promise.all([
    this.countDocuments({ author: userId }),
    this.countDocuments({ 
      author: userId, 
      status: STORY_STATUS.ACTIVE,
      expiresAt: { $gt: new Date() },
    }),
    this.countDocuments({ 
      author: userId, 
      status: STORY_STATUS.EXPIRED,
    }),
    this.aggregate([
      { $match: { author: userId } },
      { $group: { _id: null, total: { $sum: '$viewCount' } } },
    ]),
    this.aggregate([
      { $match: { author: userId } },
      { $group: { _id: null, total: { $sum: '$reactionCount' } } },
    ]),
  ]);

  return {
    total,
    active,
    expired,
    totalViews: totalViews[0]?.total || 0,
    totalReactions: totalReactions[0]?.total || 0,
  };
};

/**
 * Get trending stories
 * @param {Number} limit - Limit
 * @returns {Promise<Array>} Stories
 */
storySchema.statics.getTrending = async function(limit = 10) {
  return this.find({
    status: STORY_STATUS.ACTIVE,
    expiresAt: { $gt: new Date() },
    visibility: STORY_VISIBILITY.PUBLIC,
  })
    .populate('author', 'name username avatar')
    .sort({ viewCount: -1, reactionCount: -1 })
    .limit(limit);
};

/**
 * Clean up expired stories
 * @returns {Promise<Object>} Update result
 */
storySchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      status: STORY_STATUS.ACTIVE,
      expiresAt: { $lt: new Date() },
    },
    {
      status: STORY_STATUS.EXPIRED,
    }
  );

  return result;
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Add viewer to story
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated story
 */
storySchema.methods.addViewer = async function(userId) {
  if (!this.viewers.includes(userId)) {
    this.viewers.push(userId);
    this.viewCount = this.viewers.length;
    await this.save();
  }
  return this;
};

/**
 * Add reaction to story
 * @param {ObjectId} userId - User ID
 * @param {String} emoji - Emoji
 * @returns {Promise<Object>} Updated story
 */
storySchema.methods.addReaction = async function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => 
    r.user.toString() !== userId.toString()
  );

  // Add new reaction
  this.reactions.push({ user: userId, emoji });
  this.reactionCount = this.reactions.length;
  await this.save();

  return this;
};

/**
 * Remove reaction from story
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated story
 */
storySchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => 
    r.user.toString() !== userId.toString()
  );
  this.reactionCount = this.reactions.length;
  await this.save();
  return this;
};

/**
 * Archive story
 * @returns {Promise<Object>} Updated story
 */
storySchema.methods.archive = async function() {
  this.status = STORY_STATUS.ARCHIVED;
  this.archivedAt = new Date();
  await this.save();
  return this;
};

/**
 * Delete story
 * @returns {Promise<Object>} Updated story
 */
storySchema.methods.delete = async function() {
  this.status = STORY_STATUS.DELETED;
  await this.save();
  return this;
};

/**
 * Extend story expiry
 * @param {Number} hours - Hours to extend
 * @returns {Promise<Object>} Updated story
 */
storySchema.methods.extendExpiry = async function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await this.save();
  return this;
};

/**
 * Get story viewers with pagination
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} Viewers
 */
storySchema.methods.getViewers = async function(options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const viewers = await mongoose.model('User')
    .find({ _id: { $in: this.viewers } })
    .select('name username avatar')
    .skip(skip)
    .limit(limit);

  return {
    viewers,
    pagination: {
      page,
      limit,
      total: this.viewers.length,
      pages: Math.ceil(this.viewers.length / limit),
    },
  };
};

// ============================================
// EXPORT
// ============================================

const Story = mongoose.model('Story', storySchema);

// Export constants
Story.STORY_MEDIA_TYPES = STORY_MEDIA_TYPES;
Story.STORY_VISIBILITY = STORY_VISIBILITY;
Story.STORY_STATUS = STORY_STATUS;

module.exports = Story;