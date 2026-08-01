/**
 * ============================================
 * POST MODEL
 * Version: 2.0.0
 * Description: Post schema for user content
 *              with support for images, videos, polls, and interactions
 * ============================================
 */

const mongoose = require('mongoose');

// ============================================
// POLL OPTION SCHEMA
// ============================================

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Poll option text is required'],
    trim: true,
    maxlength: [80, 'Poll option cannot exceed 80 characters'],
  },
  votes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  voteCount: {
    type: Number,
    default: 0,
  },
});

// ============================================
// POST SCHEMA
// ============================================

const postSchema = new mongoose.Schema(
  {
    // ===== Author =====
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },

    // ===== Content =====
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      minlength: [1, 'Post must be at least 1 character'],
      maxlength: [500, 'Post cannot exceed 500 characters'],
    },

    // ===== Media =====
    image: {
      type: String,
      default: '',
      trim: true,
    },
    video: {
      type: String,
      default: '',
      trim: true,
    },
    images: [{
      type: String,
      trim: true,
    }],
    thumbnail: {
      type: String,
      trim: true,
    },

    // ===== Hashtags & Mentions =====
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

    // ===== Interactions =====
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    }],
    likeCount: {
      type: Number,
      default: 0,
    },
    bookmarks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    }],
    bookmarkCount: {
      type: Number,
      default: 0,
    },
    reposts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    }],
    repostCount: {
      type: Number,
      default: 0,
    },
    comments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    }],
    commentCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },

    // ===== Repost =====
    isRepost: {
      type: Boolean,
      default: false,
    },
    originalPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },

    // ===== Pin =====
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },

    // ===== Poll =====
    isPoll: {
      type: Boolean,
      default: false,
    },
    pollOptions: [pollOptionSchema],
    pollEndsAt: {
      type: Date,
      default: null,
    },
    // NOTE: pollTotalVotes is a virtual — do NOT add it as a real field

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
    isArchived: {
      type: Boolean,
      default: false,
    },
    isScheduled: {
      type: Boolean,
      default: false,
    },
    scheduledFor: {
      type: Date,
      default: null,
    },

    // ===== Privacy & Visibility =====
    isPublic: {
      type: Boolean,
      default: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private', 'mention'],
      default: 'public',
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // ===== Analytics =====
    analytics: {
      avgViewDuration: {
        type: Number,
        default: 0,
      },
      engagementRate: {
        type: Number,
        default: 0,
      },
      reach: {
        type: Number,
        default: 0,
      },
      impressions: {
        type: Number,
        default: 0,
      },
    },

    // ===== Metadata =====
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'embed'],
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

// Compound indexes for feed queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });
postSchema.index({ isPinned: -1, createdAt: -1 });

// Indexes for filtering
postSchema.index({ isPublic: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1, createdAt: -1 });

// Indexes for interactions
postSchema.index({ likeCount: -1 });
postSchema.index({ commentCount: -1 });
postSchema.index({ views: -1 });

// Text index for search
postSchema.index({ content: 'text', hashtags: 'text' });

// ============================================
// VIRTUALS
// ============================================

// Virtual for total likes
postSchema.virtual('totalLikes').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for total bookmarks
postSchema.virtual('totalBookmarks').get(function() {
  return this.bookmarks ? this.bookmarks.length : 0;
});

// Virtual for total reposts
postSchema.virtual('totalReposts').get(function() {
  return this.reposts ? this.reposts.length : 0;
});

// Virtual for total comments
postSchema.virtual('totalComments').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for poll total votes
postSchema.virtual('pollTotalVotes').get(function() {
  if (!this.isPoll || !this.pollOptions) return 0;
  return this.pollOptions.reduce((sum, opt) => sum + (opt.votes ? opt.votes.length : 0), 0);
});

// Virtual for if poll has ended
postSchema.virtual('pollEnded').get(function() {
  if (!this.isPoll || !this.pollEndsAt) return false;
  return new Date() > new Date(this.pollEndsAt);
});

// Virtual for formatted content with hashtags and mentions
postSchema.virtual('formattedContent').get(function() {
  if (!this.content) return '';
  let formatted = this.content;
  // Replace hashtags with links (handled on frontend)
  formatted = formatted.replace(/#([a-zA-Z0-9_]+)/g, (match, tag) => {
    return `<a href="/explore.html?tag=${tag}" class="hashtag-link">#${tag}</a>`;
  });
  // Replace mentions with links (handled on frontend)
  formatted = formatted.replace(/@([a-zA-Z0-9_]+)/g, (match, username) => {
    return `<a href="/profile.html?u=${username}" class="mention-link">@${username}</a>`;
  });
  return formatted;
});

// Virtual for media type
postSchema.virtual('mediaType').get(function() {
  if (this.video) return 'video';
  if (this.image) return 'image';
  if (this.images && this.images.length > 0) return 'gallery';
  return 'text';
});

// ============================================
// MIDDLEWARE
// ============================================

// ===== Pre-save middleware =====
postSchema.pre('save', function(next) {
  // Trim content
  if (this.content) {
    this.content = this.content.trim();
  }

  // Extract hashtags from content
  if (this.isModified('content')) {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = this.content.match(hashtagRegex);
    if (matches) {
      const hashtags = matches.map(h => h.substring(1).toLowerCase());
      // Merge with existing hashtags
      this.hashtags = [...new Set([...this.hashtags, ...hashtags])];
    }
  }

  // Update counts
  if (this.isModified('likes')) {
    this.likeCount = this.likes ? this.likes.length : 0;
  }
  if (this.isModified('bookmarks')) {
    this.bookmarkCount = this.bookmarks ? this.bookmarks.length : 0;
  }
  if (this.isModified('reposts')) {
    this.repostCount = this.reposts ? this.reposts.length : 0;
  }

  // Track edit
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }

  // Ensure only one pinned post per user
  if (this.isPinned && this.isModified('isPinned')) {
    this.constructor.updateMany(
      { author: this.author, _id: { $ne: this._id }, isPinned: true },
      { isPinned: false, pinnedAt: null }
    ).exec();
  }

  next();
});

// ===== Pre-validate middleware =====
postSchema.pre('validate', function(next) {
  // Ensure content or media
  if (!this.content && !this.image && !this.video && (!this.images || this.images.length === 0)) {
    return next(new Error('Post must have content or media'));
  }
  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get feed posts for a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Posts
 */
postSchema.statics.getFeed = async function(userId, options = {}) {
  const { page = 1, limit = 10, following = [] } = options;
  const skip = (page - 1) * limit;

  const filter = {
    isDeleted: false,
    $or: [
      { author: { $in: [...following, userId] } },
      { isPublic: true },
    ],
  };

  const posts = await this.find(filter)
    .populate('author', 'name username avatar isVerified')
    .populate({
      path: 'originalPost',
      populate: {
        path: 'author',
        select: 'name username avatar isVerified',
      },
    })
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(filter);

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get trending posts
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Posts
 */
postSchema.statics.getTrending = async function(options = {}) {
  const { limit = 20, timeframe = 7 } = options;
  const since = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

  return this.find({
    isDeleted: false,
    isPublic: true,
    createdAt: { $gte: since },
  })
    .populate('author', 'name username avatar isVerified')
    .sort({ likeCount: -1, commentCount: -1, views: -1 })
    .limit(limit);
};

/**
 * Get posts by hashtag
 * @param {String} hashtag - Hashtag to search
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Posts
 */
postSchema.statics.getByHashtag = async function(hashtag, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const filter = {
    hashtags: hashtag.toLowerCase(),
    isDeleted: false,
    isPublic: true,
  };

  const posts = await this.find(filter)
    .populate('author', 'name username avatar isVerified')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(filter);

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get popular hashtags
 * @param {Number} limit - Number of hashtags
 * @returns {Promise<Array>} Hashtags
 */
postSchema.statics.getPopularHashtags = async function(limit = 10) {
  return this.aggregate([
    { $match: { isDeleted: false } },
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

/**
 * Search posts
 * @param {String} query - Search query
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Posts
 */
postSchema.statics.searchPosts = async function(query, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const posts = await this.find(
    { $text: { $search: query }, isDeleted: false, isPublic: true },
    { score: { $meta: 'textScore' } }
  )
    .populate('author', 'name username avatar isVerified')
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(
    { $text: { $search: query }, isDeleted: false, isPublic: true }
  );

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get post statistics
 * @param {ObjectId} userId - User ID (optional)
 * @returns {Promise<Object>} Statistics
 */
postSchema.statics.getStats = async function(userId = null) {
  const filter = userId ? { author: userId, isDeleted: false } : { isDeleted: false };

  const [total, withImages, withVideos, withPolls, totalLikes, totalComments, totalViews] =
    await Promise.all([
      this.countDocuments(filter),
      this.countDocuments({ ...filter, image: { $ne: '' } }),
      this.countDocuments({ ...filter, video: { $ne: '' } }),
      this.countDocuments({ ...filter, isPoll: true }),
      this.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$likeCount' } } },
      ]),
      this.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$commentCount' } } },
      ]),
      this.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]),
    ]);

  return {
    total,
    withImages,
    withVideos,
    withPolls,
    totalLikes: totalLikes[0]?.total || 0,
    totalComments: totalComments[0]?.total || 0,
    totalViews: totalViews[0]?.total || 0,
  };
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Toggle like on post
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.toggleLike = async function(userId) {
  const index = this.likes.indexOf(userId);
  let liked = false;

  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
    liked = true;
  }

  this.likeCount = this.likes.length;
  await this.save();

  return { liked, likeCount: this.likes.length };
};

/**
 * Toggle bookmark on post
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.toggleBookmark = async function(userId) {
  const index = this.bookmarks.indexOf(userId);
  let bookmarked = false;

  if (index > -1) {
    this.bookmarks.splice(index, 1);
  } else {
    this.bookmarks.push(userId);
    bookmarked = true;
  }

  this.bookmarkCount = this.bookmarks.length;
  await this.save();

  return { bookmarked, bookmarkCount: this.bookmarks.length };
};

/**
 * Toggle repost on post
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.toggleRepost = async function(userId) {
  const index = this.reposts.indexOf(userId);
  let reposted = false;

  if (index > -1) {
    this.reposts.splice(index, 1);
  } else {
    this.reposts.push(userId);
    reposted = true;
  }

  this.repostCount = this.reposts.length;
  await this.save();

  return { reposted, repostCount: this.reposts.length };
};

/**
 * Increment view count
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
  return this;
};

/**
 * Vote on poll
 * @param {ObjectId} userId - User ID
 * @param {Number} optionIndex - Option index
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.votePoll = async function(userId, optionIndex) {
  if (!this.isPoll) {
    throw new Error('This post does not have a poll');
  }

  if (this.pollEnded) {
    throw new Error('Poll has ended');
  }

  if (optionIndex < 0 || optionIndex >= this.pollOptions.length) {
    throw new Error('Invalid option');
  }

  // Check if user already voted
  const hasVoted = this.pollOptions.some(opt =>
    opt.votes.some(v => v.toString() === userId.toString())
  );

  if (hasVoted) {
    throw new Error('User already voted on this poll');
  }

  // Add vote
  const option = this.pollOptions[optionIndex];
  option.votes.push(userId);
  option.voteCount = option.votes.length;

  this.pollTotalVotes = this.pollOptions.reduce((sum, opt) => sum + opt.votes.length, 0);
  await this.save();

  return this;
};

/**
 * Soft delete post
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[deleted]';
  await this.save();
  return this;
};

/**
 * Archive post
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.archive = async function() {
  this.isArchived = true;
  await this.save();
  return this;
};

/**
 * Unarchive post
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.unarchive = async function() {
  this.isArchived = false;
  await this.save();
  return this;
};

/**
 * Pin post
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.pin = async function() {
  // Unpin all other posts by this author
  await this.constructor.updateMany(
    { author: this.author, _id: { $ne: this._id } },
    { isPinned: false, pinnedAt: null }
  );

  this.isPinned = true;
  this.pinnedAt = new Date();
  await this.save();

  return this;
};

/**
 * Unpin post
 * @returns {Promise<Object>} Updated post
 */
postSchema.methods.unpin = async function() {
  this.isPinned = false;
  this.pinnedAt = null;
  await this.save();
  return this;
};

// ============================================
// EXPORT
// ============================================

const Post = mongoose.model('Post', postSchema);

module.exports = Post;