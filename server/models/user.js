/**
 * ============================================
 * USER MODEL
 * Version: 2.0.0
 * Description: User schema with comprehensive
 *              profile, authentication, and settings
 * ============================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ============================================
// CONSTANTS
// ============================================

const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  PENDING: 'pending',
};

const PRIVACY_OPTIONS = {
  PUBLIC: 'public',
  FOLLOWERS: 'followers',
  PRIVATE: 'private',
};

// ============================================
// USER SCHEMA
// ============================================

const userSchema = new mongoose.Schema(
  {
    // ===== Basic Information =====
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true,
    },

    // ===== Authentication =====
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpiry: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpiry: {
      type: Date,
      select: false,
    },

    // ===== Profile =====
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
    },
    avatar: {
      type: String,
      default: '',
      trim: true,
    },
    coverPhoto: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
      match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Please enter a valid URL'],
    },
    location: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    ageConfirmed: {
      type: Boolean,
      default: false,
    },
    securityPin: {
      type: String,
      default: '',
      select: false,
    },

    // ===== Social =====
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    }],
    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    }],
    followerCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    mutedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // ===== Content =====
    posts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    }],
    postCount: {
      type: Number,
      default: 0,
    },
    pinnedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },

    // ===== Status & Roles =====
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ===== Privacy =====
    privacy: {
      type: String,
      enum: Object.values(PRIVACY_OPTIONS),
      default: PRIVACY_OPTIONS.PUBLIC,
    },
    showEmail: {
      type: Boolean,
      default: false,
    },
    showOnlineStatus: {
      type: Boolean,
      default: true,
    },
    showLastSeen: {
      type: Boolean,
      default: true,
    },

    // ===== Notifications =====
    notificationPreferences: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      reposts: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      stories: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },

    // ===== Analytics =====
    profileViews: {
      type: Number,
      default: 0,
    },
    profileViewers: [{
      viewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    lastActive: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },

    // ===== Account Settings =====
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    recoveryCodes: [{
      type: String,
      select: false,
    }],
    deviceTokens: [{
      token: {
        type: String,
        trim: true,
      },
      device: {
        type: String,
        trim: true,
      },
      lastUsed: {
        type: Date,
        default: Date.now,
      },
    }],

    // ===== Session =====
    sessions: [{
      token: {
        type: String,
        select: false,
      },
      device: {
        type: String,
        trim: true,
      },
      ip: {
        type: String,
        trim: true,
      },
      lastActive: {
        type: Date,
        default: Date.now,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],

    // ===== Metadata =====
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    interests: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    language: {
      type: String,
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'UTC',
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
userSchema.index({ name: 'text', username: 'text' });
userSchema.index({ followers: 1, createdAt: -1 });
userSchema.index({ following: 1, createdAt: -1 });
userSchema.index({ status: 1, role: 1 });

// ============================================
// VIRTUALS
// ============================================

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for profile completeness
userSchema.virtual('profileCompleteness').get(function() {
  let completed = 0;
  const fields = ['bio', 'avatar', 'coverPhoto', 'website', 'location'];
  fields.forEach(field => {
    if (this[field]) completed++;
  });
  return Math.round((completed / fields.length) * 100);
});

// Virtual for is active
userSchema.virtual('isActive').get(function() {
  return this.status === USER_STATUS.ACTIVE;
});

// Virtual for is private
userSchema.virtual('isPrivate').get(function() {
  return this.privacy === PRIVACY_OPTIONS.PRIVATE;
});

// ============================================
// MIDDLEWARE
// ============================================

// ===== Pre-save middleware =====
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Generate referral code if not exists
  if (!this.referralCode) {
    this.referralCode = this.generateReferralCode();
  }

  // Update counts
  if (this.isModified('followers')) {
    this.followerCount = this.followers ? this.followers.length : 0;
  }
  if (this.isModified('following')) {
    this.followingCount = this.following ? this.following.length : 0;
  }
  if (this.isModified('posts')) {
    this.postCount = this.posts ? this.posts.length : 0;
  }

  // Set joined date
  if (!this.joinedDate) {
    this.joinedDate = new Date();
  }

  next();
});

// ===== Pre-validate middleware =====
userSchema.pre('validate', function(next) {
  // Trim fields
  if (this.name) this.name = this.name.trim();
  if (this.username) this.username = this.username.trim().toLowerCase();
  if (this.email) this.email = this.email.trim().toLowerCase();
  if (this.bio) this.bio = this.bio.trim();
  if (this.location) this.location = this.location.trim();
  if (this.website) this.website = this.website.trim();

  next();
});

// ===== Post-save middleware =====
userSchema.post('save', function(doc) {
  // Log user creation/update (optional)
  if (doc.isNew) {
    console.log(`New user created: ${doc.username} (${doc.email})`);
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Compare entered password with stored hash
 * @param {String} enteredPassword - Password to compare
 * @returns {Promise<Boolean>} True if matches
 */
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Generate JWT token
 * @returns {String} JWT token
 */
userSchema.methods.generateToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: this._id, username: this.username, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Generate refresh token
 * @returns {String} Refresh token
 */
userSchema.methods.generateRefreshToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * Generate password reset token
 * @returns {String} Reset token
 */
userSchema.methods.generateResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.resetPasswordExpiry = Date.now() + 3600000; // 1 hour
  return token;
};

/**
 * Generate email verification token
 * @returns {String} Verification token
 */
userSchema.methods.generateVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.emailVerificationExpiry = Date.now() + 86400000; // 24 hours
  return token;
};

/**
 * Generate referral code
 * @returns {String} Referral code
 */
userSchema.methods.generateReferralCode = function() {
  const prefix = this.username.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
};

/**
 * Check if user follows another user
 * @param {ObjectId} userId - User ID to check
 * @returns {Boolean} True if following
 */
userSchema.methods.isFollowing = function(userId) {
  return this.following.some(id => id.toString() === userId.toString());
};

/**
 * Check if user is followed by another user
 * @param {ObjectId} userId - User ID to check
 * @returns {Boolean} True if followed
 */
userSchema.methods.isFollowedBy = function(userId) {
  return this.followers.some(id => id.toString() === userId.toString());
};

/**
 * Add session for user
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} Updated user
 */
userSchema.methods.addSession = async function(sessionData) {
  this.sessions.push({
    token: crypto.randomBytes(32).toString('hex'),
    device: sessionData.device || 'Unknown Device',
    ip: sessionData.ip || '',
    lastActive: new Date(),
  });
  await this.save();
  return this;
};

/**
 * Remove session
 * @param {String} token - Session token
 * @returns {Promise<Object>} Updated user
 */
userSchema.methods.removeSession = async function(token) {
  this.sessions = this.sessions.filter(s => s.token !== token);
  await this.save();
  return this;
};

/**
 * Clear all sessions
 * @returns {Promise<Object>} Updated user
 */
userSchema.methods.clearSessions = async function() {
  this.sessions = [];
  await this.save();
  return this;
};

/**
 * Update last active timestamp
 * @returns {Promise<Object>} Updated user
 */
userSchema.methods.updateLastActive = async function() {
  this.lastActive = new Date();
  await this.save();
  return this;
};

/**
 * Increment login count
 * @returns {Promise<Object>} Updated user
 */
userSchema.methods.incrementLoginCount = async function() {
  this.loginCount = (this.loginCount || 0) + 1;
  this.lastLogin = new Date();
  await this.save();
  return this;
};

/**
 * Toggle follow user
 * @param {ObjectId} userId - User ID to toggle
 * @returns {Promise<Object>} Follow status
 */
userSchema.methods.toggleFollow = async function(userId) {
  const index = this.following.indexOf(userId);
  let isFollowing = false;

  if (index > -1) {
    this.following.splice(index, 1);
  } else {
    this.following.push(userId);
    isFollowing = true;
  }

  await this.save();
  return { isFollowing };
};

/**
 * Get safe user data (exclude sensitive fields)
 * @returns {Object} Safe user object
 */
userSchema.methods.getSafeData = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpiry;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpiry;
  delete user.twoFactorSecret;
  delete user.recoveryCodes;
  delete user.sessions;
  delete user.deviceTokens;
  return user;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find user by credentials (email or username)
 * @param {String} credential - Email or username
 * @returns {Promise<User>} User object
 */
userSchema.statics.findByCredential = async function(credential) {
  return this.findOne({
    $or: [
      { email: credential.toLowerCase() },
      { username: credential.toLowerCase() },
    ],
  });
};

/**
 * Search users
 * @param {String} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Users
 */
userSchema.statics.searchUsers = async function(query, options = {}) {
  const { page = 1, limit = 20, excludeIds = [] } = options;
  const skip = (page - 1) * limit;

  const searchQuery = {
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { username: { $regex: query, $options: 'i' } },
    ],
    _id: { $nin: excludeIds },
    status: USER_STATUS.ACTIVE,
  };

  const users = await this.find(searchQuery)
    .select('name username avatar bio followers isVerified')
    .sort({ followerCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(searchQuery);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get suggested users for a user
 * @param {ObjectId} userId - Current user ID
 * @param {Number} limit - Number of suggestions
 * @returns {Promise<Array>} Suggested users
 */
userSchema.statics.getSuggestedUsers = async function(userId, limit = 10) {
  const user = await this.findById(userId);
  if (!user) return [];

  // Get users followed by people the user follows
  const followedUsers = user.following || [];
  const usersFollowedByFollowed = await this.find({
    _id: { $in: followedUsers },
  }).select('following');

  const suggestedIds = usersFollowedByFollowed.reduce((ids, u) => {
    return [...ids, ...u.following];
  }, []);

  // Filter out current user and already followed users
  const excludeIds = [...followedUsers, userId];

  const suggested = await this.find({
    _id: { $in: suggestedIds, $nin: excludeIds },
    status: USER_STATUS.ACTIVE,
  })
    .select('name username avatar bio followers isVerified')
    .sort({ followerCount: -1 })
    .limit(limit);

  return suggested;
};

/**
 * Get user statistics
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Statistics
 */
userSchema.statics.getUserStats = async function(userId) {
  const user = await this.findById(userId)
    .populate('posts')
    .populate('followers')
    .populate('following');

  if (!user) return null;

  return {
    posts: user.posts?.length || 0,
    followers: user.followers?.length || 0,
    following: user.following?.length || 0,
    profileViews: user.profileViews || 0,
    joinedDate: user.joinedDate,
    lastActive: user.lastActive,
  };
};

// ============================================
// EXPORT
// ============================================

const User = mongoose.model('User', userSchema);

// Export constants
User.USER_ROLES = USER_ROLES;
User.USER_STATUS = USER_STATUS;
User.PRIVACY_OPTIONS = PRIVACY_OPTIONS;

module.exports = User;