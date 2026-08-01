/**
 * ============================================
 * AUTH MIDDLEWARE
 * Version: 2.0.0
 * Description: Authentication and authorization middleware
 *              including JWT verification, role checks, and rate limiting
 * ============================================
 */

const jwt = require('jsonwebtoken');
const User = require('../models/user');

// ============================================
// CONSTANTS
// ============================================

const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

// ============================================
// MAIN AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * @desc    Protect routes - verify JWT token
 * @access  Private
 * @example router.get('/profile', protect, getProfile);
 */
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Check for token in cookies (optional)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
      code: 'NO_TOKEN',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token type
    if (decoded.type && decoded.type === TOKEN_TYPES.REFRESH) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type, use access token',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    // Find user
    const user = await User.findById(decoded.id)
      .select('-password -securityPin -refreshToken -resetPasswordToken -resetPasswordExpiry -emailVerificationToken -emailVerificationExpiry');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if user is active
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been permanently banned.',
        code: 'ACCOUNT_BANNED',
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    req.tokenDecoded = decoded;

    // Update last active
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    next();
  } catch (error) {
    let message = 'Not authorized, invalid token';
    let code = 'INVALID_TOKEN';

    if (error.name === 'TokenExpiredError') {
      message = 'Token expired, please login again';
      code = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
      code = 'INVALID_TOKEN_FORMAT';
    }

    return res.status(401).json({
      success: false,
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

// ============================================
// REFRESH TOKEN MIDDLEWARE
// ============================================

/**
 * @desc    Verify refresh token
 * @access  Private
 * @example router.post('/refresh-token', verifyRefreshToken, refreshToken);
 */
const verifyRefreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token required',
      code: 'REFRESH_TOKEN_REQUIRED',
    });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== TOKEN_TYPES.REFRESH) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    const user = await User.findById(decoded.id)
      .select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = user;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    let message = 'Invalid refresh token';
    let code = 'INVALID_REFRESH_TOKEN';

    if (error.name === 'TokenExpiredError') {
      message = 'Refresh token expired, please login again';
      code = 'REFRESH_TOKEN_EXPIRED';
    }

    return res.status(401).json({
      success: false,
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

// ============================================
// ROLE-BASED AUTHORIZATION
// ============================================

/**
 * @desc    Check if user has required role
 * @param   {string|Array} roles - Required role(s)
 * @returns {Function} Middleware
 * @example router.post('/admin/content', protect, authorize('admin', 'moderator'), manageContent);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this resource`,
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: roles,
      });
    }

    next();
  };
};

/**
 * @desc    Check if user is admin
 * @access  Private/Admin
 * @example router.delete('/admin/users/:id', protect, admin, deleteUser);
 */
const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, user not found',
      code: 'USER_NOT_FOUND',
    });
  }

  if (req.user.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
};

/**
 * @desc    Check if user is moderator or admin
 * @access  Private/Moderator
 * @example router.put('/reports/:id', protect, moderator, updateReport);
 */
const moderator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, user not found',
      code: 'USER_NOT_FOUND',
    });
  }

  if (req.user.role !== USER_ROLES.MODERATOR && req.user.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Moderator access required',
      code: 'MODERATOR_REQUIRED',
    });
  }

  next();
};

// ============================================
// OWNERSHIP CHECK
// ============================================

/**
 * @desc    Check if user owns the resource or is admin
 * @param   {Function} getResourceId - Function to get resource ID from request
 * @param   {Model} model - Mongoose model
 * @param   {string} userIdField - Field name for user ID (default: 'author')
 * @returns {Function} Middleware
 * @example router.put('/posts/:id', protect, checkOwnership((req) => req.params.id, Post, 'author'), updatePost);
 */
const checkOwnership = (getResourceId, model, userIdField = 'author') => {
  return async (req, res, next) => {
    try {
      const resourceId = getResourceId(req);
      const userId = req.user._id;

      // Check if user is admin (bypass ownership check)
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }

      const resource = await model.findById(resourceId);
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND',
        });
      }

      // Check if user owns the resource
      const ownerId = resource[userIdField];
      if (ownerId && ownerId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource',
          code: 'NOT_OWNER',
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking ownership',
        code: 'OWNERSHIP_CHECK_ERROR',
      });
    }
  };
};

// ============================================
// RATE LIMITING BY ROLE
// ============================================

/**
 * @desc    Get rate limit based on user role
 * @param   {Object} limits - Rate limits per role
 * @returns {Function} Middleware
 * @example router.post('/api/messages', protect, rateLimitByRole({ admin: { window: 60000, max: 100 }, user: { window: 60000, max: 30 } }), sendMessage);
 */
const rateLimitByRole = (limits) => {
  return (req, res, next) => {
    const role = req.user ? req.user.role : USER_ROLES.USER;
    const limit = limits[role] || limits[USER_ROLES.USER] || { window: 60000, max: 10 };

    // This would be integrated with a rate limiter like express-rate-limit
    // For now, we pass the limit to the next middleware
    req.rateLimit = limit;
    next();
  };
};

// ============================================
// ACCOUNT STATUS CHECK
// ============================================

/**
 * @desc    Check if account is verified
 * @access  Private
 * @example router.post('/posts', protect, isVerified, createPost);
 */
const isVerified = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, user not found',
      code: 'USER_NOT_FOUND',
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address first',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  next();
};

/**
 * @desc    Check if account has 2FA enabled
 * @access  Private
 * @example router.post('/auth/2fa/verify', protect, isTwoFactorEnabled, verify2FA);
 */
const isTwoFactorEnabled = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, user not found',
      code: 'USER_NOT_FOUND',
    });
  }

  if (req.user.isTwoFactorEnabled) {
    // Store flag for 2FA check
    req.twoFactorRequired = true;
  }

  next();
};

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * @desc    Check if user has an active session
 * @access  Private
 * @example router.post('/messages', protect, checkSession, sendMessage);
 */
const checkSession = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, user not found',
      code: 'USER_NOT_FOUND',
    });
  }

  // Check if session is still valid
  const session = req.user.sessions?.find(
    s => s.token === req.token
  );

  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid',
      code: 'INVALID_SESSION',
    });
  }

  // Update session last active
  session.lastActive = new Date();
  await req.user.save({ validateBeforeSave: false });

  next();
};

// ============================================
// BLOCK CHECK
// ============================================

/**
 * @desc    Check if user has blocked the target or vice versa
 * @param   {Function} getTargetId - Function to get target ID from request
 * @returns {Function} Middleware
 * @example router.post('/messages/:userId', protect, checkBlocked((req) => req.params.userId), sendMessage);
 */
const checkBlocked = (getTargetId) => {
  return async (req, res, next) => {
    try {
      const targetId = getTargetId(req);
      const userId = req.user._id;

      const target = await User.findById(targetId);
      if (!target) {
        return res.status(404).json({
          success: false,
          message: 'Target user not found',
          code: 'TARGET_NOT_FOUND',
        });
      }

      // Check if user is blocked by target
      if (target.blockedUsers && target.blockedUsers.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You are blocked by this user',
          code: 'USER_BLOCKED',
        });
      }

      // Check if user has blocked target
      if (req.user.blockedUsers && req.user.blockedUsers.includes(targetId)) {
        return res.status(403).json({
          success: false,
          message: 'You have blocked this user',
          code: 'USER_BLOCKED',
        });
      }

      next();
    } catch (error) {
      console.error('Block check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking block status',
        code: 'BLOCK_CHECK_ERROR',
      });
    }
  };
};

// ============================================
// OPTIONAL AUTH
// ============================================

/**
 * @desc    Optional authentication - doesn't require token
 * @access  Public (but attaches user if token present)
 * @example router.get('/public/posts', optionalAuth, getPublicPosts);
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.status === 'active') {
        req.user = user;
        req.token = token;
      }
    } catch (error) {
      // Silently fail - user remains unauthenticated
    }
  }

  next();
};

// ============================================
// API KEY AUTHENTICATION (for external services)
// ============================================

/**
 * @desc    API Key authentication for external services
 * @access  Private (API Key)
 * @example router.post('/api/external', apiKeyAuth, externalHandler);
 */
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required',
      code: 'API_KEY_REQUIRED',
    });
  }

  try {
    // Find user with matching API key
    const user = await User.findOne({ apiKey })
      .select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    req.user = user;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error authenticating API key',
      code: 'API_KEY_ERROR',
    });
  }
};

// ============================================
// COMPLETE ROUTE EXAMPLES
// ============================================

/**
 * This section demonstrates how to use all the middleware functions
 * in your route files. Uncomment and modify as needed.
 */

/*
// ===== AUTH ROUTES =====
const express = require('express');
const router = express.Router();

// Public routes (no auth)
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/refresh-token', verifyRefreshToken, refreshToken);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// Protected routes (require auth)
router.get('/auth/me', protect, getMe);
router.post('/auth/logout', protect, logout);
router.get('/auth/check-username', checkUsername);
router.get('/auth/verify-email/:token', verifyEmail);

// ===== USER ROUTES =====
// Profile routes
router.get('/users/:username', protect, getProfile);
router.get('/users/id/:id', protect, getProfileById);
router.put('/users/profile', protect, updateProfile);
router.put('/users/avatar', protect, upload.single('avatar'), updateAvatar);
router.put('/users/cover', protect, upload.single('cover'), updateCoverPhoto);
router.delete('/users/account', protect, deleteAccount);

// Follow routes
router.put('/users/:id/follow', protect, followUser);
router.put('/users/:id/unfollow', protect, unfollowUser);
router.get('/users/:id/followers', protect, getFollowers);
router.get('/users/:id/following', protect, getFollowing);
router.get('/users/:id/follow-status', protect, checkFollowStatus);

// User discovery
router.get('/users/search', protect, searchUsers);
router.get('/users/suggested', protect, getSuggested);
router.get('/users/popular', protect, getPopularUsers);
router.get('/users/interests', protect, getUsersByInterest);

// User analytics
router.get('/users/analytics', protect, getAnalytics);
router.get('/users/stats', protect, getUserStats);

// Admin routes
router.get('/users/admin/all', protect, admin, getAllUsers);
router.put('/users/admin/role/:id', protect, admin, updateUserRole);
router.put('/users/admin/suspend/:id', protect, admin, suspendUser);
router.delete('/users/admin/:id', protect, admin, deleteUserByAdmin);

// ===== POST ROUTES =====
// CRUD operations
router.get('/posts', protect, getPosts);
router.post('/posts', protect, upload.single('media'), createPost);
router.get('/posts/:id', protect, getPostById);
router.put('/posts/:id', protect, checkOwnership((req) => req.params.id, Post, 'author'), updatePost);
router.delete('/posts/:id', protect, checkOwnership((req) => req.params.id, Post, 'author'), deletePost);

// Feed routes
router.get('/posts/trending', protect, getTrending);
router.get('/posts/following', protect, getFollowingFeed);
router.get('/posts/explore', protect, getExploreFeed);
router.get('/posts/bookmarks', protect, getBookmarks);
router.get('/posts/liked', protect, getLikedPosts);

// User posts
router.get('/posts/user/:userId', protect, getPostsByUser);
router.get('/posts/hashtag/:tag', protect, getPostsByHashtag);
router.get('/posts/hashtags/trending', protect, getTrendingHashtags);
router.get('/posts/hashtags/search', protect, searchHashtags);

// Interactions
router.put('/posts/:id/like', protect, likePost);
router.put('/posts/:id/unlike', protect, unlikePost);
router.put('/posts/:id/bookmark', protect, bookmarkPost);
router.put('/posts/:id/unbookmark', protect, unbookmarkPost);
router.put('/posts/:id/repost', protect, repostPost);
router.put('/posts/:id/unrepost', protect, unrepostPost);
router.put('/posts/:id/view', protect, viewPost);

// Management
router.put('/posts/:id/edit', protect, checkOwnership((req) => req.params.id, Post, 'author'), editPost);
router.put('/posts/:id/pin', protect, checkOwnership((req) => req.params.id, Post, 'author'), pinPost);
router.put('/posts/:id/unpin', protect, checkOwnership((req) => req.params.id, Post, 'author'), unpinPost);

// Polls
router.put('/posts/:id/poll/:optionIndex', protect, votePoll);
router.get('/posts/:id/poll/results', protect, getPollResults);

// Analytics
router.get('/posts/:id/analytics', protect, checkOwnership((req) => req.params.id, Post, 'author'), getPostAnalytics);

// ===== COMMENT ROUTES =====
router.post('/comments/:postId', protect, addComment);
router.get('/comments/:postId', protect, getComments);
router.get('/comments/single/:id', protect, getComment);
router.put('/comments/:id', protect, checkOwnership((req) => req.params.id, Comment, 'author'), updateComment);
router.delete('/comments/:id', protect, checkOwnership((req) => req.params.id, Comment, 'author'), deleteComment);
router.put('/comments/:id/like', protect, likeComment);
router.put('/comments/:id/unlike', protect, unlikeComment);
router.get('/comments/:id/replies', protect, getCommentReplies);
router.post('/comments/:id/replies', protect, addReply);
router.delete('/comments/:id/replies/:replyId', protect, checkOwnership((req) => req.params.replyId, Comment, 'author'), deleteReply);
router.put('/comments/:id/replies/:replyId/like', protect, likeReply);

// ===== MESSAGE ROUTES =====
router.get('/messages', protect, checkSession, getInbox);
router.get('/messages/unread-count', protect, getUnreadCount);
router.get('/messages/stats', protect, getMessageStats);
router.get('/messages/search', protect, searchMessages);
router.get('/messages/last/:userId', protect, getLastMessage);
router.get('/messages/:userId', protect, checkSession, getConversation);
router.post('/messages/:recipientId', protect, checkSession, checkBlocked((req) => req.params.recipientId), sendMessage);
router.get('/messages/single/:messageId', protect, getMessage);
router.delete('/messages/:messageId', protect, deleteMessage);
router.put('/messages/:messageId/read', protect, markAsRead);
router.put('/messages/:userId/read-all', protect, markConversationAsRead);
router.put('/messages/:messageId/reaction', protect, addReaction);
router.delete('/messages/:messageId/reaction', protect, removeReaction);

// ===== NOTIFICATION ROUTES =====
router.get('/notifications', protect, getNotifications);
router.get('/notifications/recent', protect, getRecentNotifications);
router.get('/notifications/unread-count', protect, getUnreadCount);
router.get('/notifications/:id', protect, getNotificationById);
router.put('/notifications/read-all', protect, markAllRead);
router.put('/notifications/:id/read', protect, markSingleRead);
router.put('/notifications/read-multiple', protect, markMultipleRead);
router.delete('/notifications/:id', protect, deleteNotification);
router.delete('/notifications/read-all', protect, deleteAllRead);
router.get('/notifications/preferences', protect, getNotificationPreferences);
router.put('/notifications/preferences', protect, updateNotificationPreferences);

// ===== STORY ROUTES =====
router.get('/stories', protect, getStories);
router.get('/stories/active', protect, getActiveStories);
router.get('/stories/:id', protect, getStoryById);
router.post('/stories', protect, upload.single('media'), createStory);
router.delete('/stories/:id', protect, checkOwnership((req) => req.params.id, Story, 'author'), deleteStory);
router.put('/stories/:id/archive', protect, checkOwnership((req) => req.params.id, Story, 'author'), archiveStory);
router.put('/stories/:id/view', protect, viewStory);
router.get('/stories/:id/views', protect, checkOwnership((req) => req.params.id, Story, 'author'), getStoryViews);
router.get('/stories/:id/analytics', protect, checkOwnership((req) => req.params.id, Story, 'author'), getStoryAnalytics);
router.get('/stories/user/:userId', protect, getStoriesByUser);
router.get('/stories/hashtag/:tag', protect, getStoriesByHashtag);
router.put('/stories/:id/reaction', protect, addStoryReaction);
router.delete('/stories/:id/reaction', protect, removeStoryReaction);

// ===== REPORT ROUTES =====
router.post('/reports', protect, submitReport);
router.get('/reports', protect, moderator, getReports);
router.get('/reports/stats', protect, moderator, getReportStats);
router.put('/reports/:id', protect, moderator, updateReport);

// ===== PUBLIC ROUTES (with optional auth) =====
router.get('/public/posts', optionalAuth, getPublicPosts);
router.get('/public/users/:username', optionalAuth, getPublicProfile);

// ===== EXTERNAL API ROUTES =====
router.post('/api/external', apiKeyAuth, externalHandler);

module.exports = router;
*/

// ============================================
// EXPORT
// ============================================

module.exports = {
  // Main auth
  protect,
  verifyRefreshToken,
  optionalAuth,

  // Role-based
  authorize,
  admin,
  moderator,

  // Ownership
  checkOwnership,

  // Account status
  isVerified,
  isTwoFactorEnabled,

  // Session
  checkSession,

  // Block check
  checkBlocked,

  // Rate limiting
  rateLimitByRole,

  // API Key auth
  apiKeyAuth,

  // Constants
  TOKEN_TYPES,
  USER_ROLES,
};