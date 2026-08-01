/**
 * ============================================
 * USER CONTROLLER
 * Version: 2.0.0
 * Description: Handles user operations including
 *              profile, follow, search, and analytics
 * ============================================
 */

const mongoose = require('mongoose');
const User = require('../models/user');
const Post = require('../models/post');
const Notification = require('../models/notification');
const Comment = require('../models/comment');
const { validationResult } = require('express-validator');
const fs = require('fs');

// ============================================
// PROFILE OPERATIONS
// ============================================

/**
 * @desc    Get user profile by username or ID
 * @route   GET /api/users/:username
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user._id;

    const isId = mongoose.Types.ObjectId.isValid(username);
    const query = isId
      ? { $or: [{ username: username }, { _id: username }] }
      : { username: username };

    const user = await User.findOne(query)
      .select('-password -securityPin -__v')
      .populate('followers', 'name username avatar')
      .populate('following', 'name username avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current user follows this user
    const isFollowing = user.followers.some(
      follower => follower._id.toString() === currentUserId.toString()
    );

    const currentUser = await User.findById(currentUserId).select('blockedUsers');
    const isBlocked = currentUser?.blockedUsers?.some(
      (blockedId) => blockedId.toString() === user._id.toString()
    );
    const hasBlockedYou = user.blockedUsers?.some(
      (blockedId) => blockedId.toString() === currentUserId.toString()
    );

    // Increment profile views & record profile viewer (if not own profile)
    if (user._id.toString() !== currentUserId.toString()) {
      user.profileViews = (user.profileViews || 0) + 1;
      
      if (!user.profileViewers) user.profileViewers = [];
      const existingIdx = user.profileViewers.findIndex(
        (v) => v.viewer && v.viewer.toString() === currentUserId.toString()
      );
      if (existingIdx > -1) {
        user.profileViewers[existingIdx].viewedAt = new Date();
      } else {
        user.profileViewers.unshift({
          viewer: currentUserId,
          viewedAt: new Date(),
        });
        if (user.profileViewers.length > 50) {
          user.profileViewers = user.profileViewers.slice(0, 50);
        }
      }

      await user.save({ validateBeforeSave: false });
    }

    const profileData = {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      bio: user.bio,
      location: user.location,
      website: user.website,
      isVerified: user.isVerified || false,
      followers: user.followers || [],
      following: user.following || [],
      postsCount: user.posts?.length || 0,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      profileViews: user.profileViews || 0,
      joinedDate: user.createdAt,
      isFollowing,
      isBlocked: !!isBlocked,
      hasBlockedYou: !!hasBlockedYou,
      isOwnProfile: user._id.toString() === currentUserId.toString(),
    };

    res.json({
      success: true,
      user: profileData,
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/id/:id
 * @access  Private
 */
const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const user = await User.findById(id)
      .select('-password -__v')
      .populate('followers', 'name username avatar')
      .populate('following', 'name username avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isFollowing = user.followers.some(
      follower => follower._id.toString() === currentUserId.toString()
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        location: user.location,
        website: user.website,
        isVerified: user.isVerified || false,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        postsCount: user.posts?.length || 0,
        isFollowing,
        isOwnProfile: user._id.toString() === currentUserId.toString(),
      },
    });

  } catch (error) {
    console.error('Get profile by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const { name, bio, website, location, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (website !== undefined) user.website = website.trim();
    if (location !== undefined) user.location = location.trim();
    if (avatar !== undefined) user.avatar = avatar.trim();
    if (req.body.coverPhoto !== undefined) user.coverPhoto = req.body.coverPhoto.trim();

    // Handle cover photo upload file
    if (req.file) {
      // Remove old cover photo if exists
      if (user.coverPhoto && !user.coverPhoto.startsWith('http') && !user.coverPhoto.startsWith('data:')) {
        try {
          fs.unlinkSync(user.coverPhoto);
        } catch (err) {
          // Ignore if file doesn't exist
        }
      }
      user.coverPhoto = req.file.path;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        location: user.location,
        website: user.website,
      },
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user avatar
 * @route   PUT /api/users/avatar
 * @access  Private
 */
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Avatar image is required'
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove old avatar if exists
    if (user.avatar && !user.avatar.startsWith('http')) {
      try {
        fs.unlinkSync(user.avatar);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }

    user.avatar = req.file.path;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar,
    });

  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user cover photo
 * @route   PUT /api/users/cover
 * @access  Private
 */
const updateCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Cover image is required'
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove old cover photo if exists
    if (user.coverPhoto) {
      try {
        fs.unlinkSync(user.coverPhoto);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }

    user.coverPhoto = req.file.path;
    await user.save();

    res.json({
      success: true,
      message: 'Cover photo updated successfully',
      coverPhoto: user.coverPhoto,
    });

  } catch (error) {
    console.error('Update cover photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating cover photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user and delete all associated data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's posts
    await Post.deleteMany({ author: userId });

    // Delete user's notifications
    await Notification.deleteMany({
      $or: [{ recipient: userId }, { sender: userId }]
    });

    // Delete user's avatar and cover photo files
    if (user.avatar && !user.avatar.startsWith('http')) {
      try {
        fs.unlinkSync(user.avatar);
      } catch (err) {
        // Ignore
      }
    }
    if (user.coverPhoto) {
      try {
        fs.unlinkSync(user.coverPhoto);
      } catch (err) {
        // Ignore
      }
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// FOLLOW OPERATIONS
// ============================================

/**
 * @desc    Follow a user
 * @route   PUT /api/users/:id/follow
 * @access  Private
 */
const followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (id === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    const userToFollow = await User.findById(id);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already following - TOGGLE UNFOLLOW
    const followerIndex = userToFollow.followers.findIndex(
      f => f.toString() === userId.toString()
    );

    const currentUser = await User.findById(userId);

    if (followerIndex > -1) {
      // Unfollow logic
      userToFollow.followers.splice(followerIndex, 1);
      userToFollow.followerCount = userToFollow.followers.length;
      await userToFollow.save();

      const followingIndex = currentUser.following.findIndex(
        f => f.toString() === id.toString()
      );
      if (followingIndex > -1) {
        currentUser.following.splice(followingIndex, 1);
        currentUser.followingCount = currentUser.following.length;
        await currentUser.save();
      }

      return res.json({
        success: true,
        message: 'User unfollowed successfully',
        following: false,
        followersCount: userToFollow.followers.length,
      });
    }

    // Follow logic
    userToFollow.followers.push(userId);
    userToFollow.followerCount = userToFollow.followers.length;
    await userToFollow.save();

    currentUser.following.push(id);
    currentUser.followingCount = currentUser.following.length;
    await currentUser.save();

    // Create notification
    await Notification.create({
      recipient: id,
      sender: userId,
      type: 'follow',
      message: `${req.user.name} started following you`,
    });

    // Real-time Socket.io Notification
    const io = req.app.get('io');
    if (io) {
      io.to(id.toString()).emit('notification', {
        type: 'follow',
        sender: { _id: currentUser._id, name: currentUser.name, username: currentUser.username, avatar: currentUser.avatar },
        message: `${currentUser.name} started following you`,
      });
    }

    res.json({
      success: true,
      message: 'User followed successfully',
      following: true,
      followersCount: userToFollow.followers.length,
    });


  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error following user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Unfollow a user
 * @route   PUT /api/users/:id/unfollow
 * @access  Private
 */
const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const userToUnfollow = await User.findById(id);
    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if following
    const followerIndex = userToUnfollow.followers.indexOf(userId);
    if (followerIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Not following this user'
      });
    }

    // Remove from followers and following
    userToUnfollow.followers.splice(followerIndex, 1);
    userToUnfollow.followerCount = userToUnfollow.followers.length;
    await userToUnfollow.save();

    const currentUser = await User.findById(userId);
    const followingIndex = currentUser.following.indexOf(id);
    if (followingIndex > -1) {
      currentUser.following.splice(followingIndex, 1);
      currentUser.followingCount = currentUser.following.length;
      await currentUser.save();
    }

    res.json({
      success: true,
      message: 'User unfollowed successfully',
      following: false,
      followersCount: userToUnfollow.followers.length,
    });

  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unfollowing user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get user's followers
 * @route   GET /api/users/:id/followers
 * @access  Private
 */
const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const followers = await User.find({
      _id: { $in: user.followers }
    })
      .select('name username avatar bio isVerified')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      followers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: user.followers.length,
        pages: Math.ceil(user.followers.length / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching followers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get users that a user is following
 * @route   GET /api/users/:id/following
 * @access  Private
 */
const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const following = await User.find({
      _id: { $in: user.following }
    })
      .select('name username avatar bio isVerified')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      following,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: user.following.length,
        pages: Math.ceil(user.following.length / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching following',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Check follow status between users
 * @route   GET /api/users/:id/follow-status
 * @access  Private
 */
const checkFollowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isFollowing = user.followers.includes(userId);
    const isFollowedBy = user.following.includes(userId);

    res.json({
      success: true,
      isFollowing,
      isFollowedBy,
    });

  } catch (error) {
    console.error('Check follow status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking follow status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// USER DISCOVERY
// ============================================

/**
 * @desc    Search for users
 * @route   GET /api/users/search
 * @access  Private
 */
const searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    if (!q || q.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const result = await User.searchUsers(q, {
      page: parseInt(page),
      limit: parseInt(limit),
      excludeIds: [userId],
    });

    res.json({
      success: true,
      users: result.users,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get suggested users to follow
 * @route   GET /api/users/suggested
 * @access  Private
 */
const getSuggested = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const suggested = await User.getSuggestedUsers(userId, parseInt(limit));

    res.json({
      success: true,
      users: suggested,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: suggested.length,
        pages: 1,
      },
    });

  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching suggested users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get popular users
 * @route   GET /api/users/popular
 * @access  Private
 */
const getPopularUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find({ status: 'active' })
      .select('name username avatar bio followers isVerified')
      .sort({ followerCount: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ status: 'active' });

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get popular users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching popular users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get users by interest
 * @route   GET /api/users/interests
 * @access  Private
 */
const getUsersByInterest = async (req, res) => {
  try {
    const { interest, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    if (!interest) {
      return res.status(400).json({
        success: false,
        message: 'Interest is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find({
      interests: { $in: [interest.toLowerCase()] },
      _id: { $ne: userId },
      status: 'active',
    })
      .select('name username avatar bio followers isVerified')
      .sort({ followerCount: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({
      interests: { $in: [interest.toLowerCase()] },
      _id: { $ne: userId },
      status: 'active',
    });

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get users by interest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users by interest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// ANALYTICS & STATS
// ============================================

/**
 * @desc    Get user analytics
 * @route   GET /api/users/analytics
 * @access  Private
 */
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await User.getUserStats(userId);
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      analytics: stats,
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/users/stats
 * @access  Private
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await User.getUserStats(userId);
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get profile viewers for current user
 * @route   GET /api/users/profile-viewers
 * @access  Private
 */
const getProfileViewers = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate({
        path: 'profileViewers.viewer',
        select: 'name username avatar bio isVerified followers'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const viewers = (user.profileViewers || [])
      .filter((v) => v.viewer)
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));

    res.json({
      success: true,
      profileViews: user.profileViews || 0,
      viewersCount: viewers.length,
      viewers,
    });
  } catch (error) {
    console.error('Get profile viewers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile viewers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================
// CHECK USERNAME
// ============================================

/**
 * @desc    Check if username is available
 * @route   GET /api/users/check-username
 * @access  Private
 */
const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    res.json({
      success: true,
      available: !user,
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking username',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORT USER DATA (GDPR-style)
// ============================================

/**
 * @desc    Export current user's data
 * @route   GET /api/users/me/export
 * @access  Private
 */
const exportUserData = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select('-password -securityPin -refreshToken -resetPasswordToken -resetPasswordExpiry -emailVerificationToken -emailVerificationExpiry')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const [posts, comments] = await Promise.all([
      Post.find({ author: userId }).select('-__v').lean(),
      Comment.find({ author: userId }).select('-__v').lean(),
    ]);

    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      data: {
        profile: user,
        posts,
        comments,
      },
    });
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error exporting user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Block a user
 * @route   PUT /api/users/:id/block
 * @access  Private
 */
const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (id === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const currentUser = await User.findById(userId);
    const alreadyBlocked = currentUser.blockedUsers.some(
      (blockedId) => blockedId.toString() === id
    );

    if (alreadyBlocked) {
      return res.json({
        success: true,
        message: 'User is already blocked',
        blocked: true,
      });
    }

    currentUser.blockedUsers.push(id);
    currentUser.following = currentUser.following.filter(
      (followingId) => followingId.toString() !== id
    );
    currentUser.followingCount = currentUser.following.length;
    await currentUser.save();

    targetUser.followers = targetUser.followers.filter(
      (followerId) => followerId.toString() !== userId.toString()
    );
    targetUser.followerCount = targetUser.followers.length;
    await targetUser.save();

    res.json({
      success: true,
      message: 'User blocked successfully',
      blocked: true,
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error blocking user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Unblock a user
 * @route   PUT /api/users/:id/unblock
 * @access  Private
 */
const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const currentUser = await User.findById(userId);
    const blockIndex = currentUser.blockedUsers.findIndex(
      (blockedId) => blockedId.toString() === id
    );

    if (blockIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'User is not blocked',
      });
    }

    currentUser.blockedUsers.splice(blockIndex, 1);
    await currentUser.save();

    res.json({
      success: true,
      message: 'User unblocked successfully',
      blocked: false,
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unblocking user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  // Profile Operations
  getProfile,
  getProfileById,
  updateProfile,
  updateAvatar,
  updateCoverPhoto,
  deleteAccount,

  // Follow Operations
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  getFollowers,
  getFollowing,
  checkFollowStatus,

  // User Discovery
  searchUsers,
  getSuggested,
  getPopularUsers,
  getUsersByInterest,

  // Analytics & Stats
  getAnalytics,
  getUserStats,
  getProfileViewers,

  // Utility
  checkUsername,
  exportUserData,
};