/**
 * ============================================
 * STORY CONTROLLER
 * Version: 2.0.0
 * Description: Handles story operations
 *              including creation, viewing, and management
 * ============================================
 */

const Story = require('../models/story');
const User = require('../models/user');
const Notification = require('../models/notification');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// ============================================
// CREATE STORY
// ============================================

/**
 * @desc    Create a new story
 * @route   POST /api/stories
 * @access  Private
 */
const createStory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { caption, visibility = 'public' } = req.body;
    const userId = req.user._id;

    // Check if user has an active story
    const existingStory = await Story.findOne({
      author: userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });

    if (existingStory) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active story. Wait for it to expire before posting a new one.',
      });
    }

    // Process media
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Media file is required'
      });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'image';
    const filename = path.basename(req.file.path);
    const mediaUrl = `/uploads/stories/${filename}`;

    // Create story
    const story = await Story.create({
      author: userId,
      media: mediaUrl,
      mediaType,
      caption: caption || '',
      visibility,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await story.populate('author', 'name username avatar isVerified');

    // Notify followers (optional)
    const followers = await User.find({ following: userId });
    if (followers.length > 0) {
      await Notification.insertMany(
        followers.map(follower => ({
          recipient: follower._id,
          sender: userId,
          type: 'story',
          story: story._id,
          message: `${req.user.name} posted a new story`,
        }))
      );
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('newStory', story);
    }

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story,
    });

  } catch (error) {
    console.error('Create story error:', error);
    
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (err) {}
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating story',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET STORIES
// ============================================

/**
 * @desc    Get all stories from followed users
 * @route   GET /api/stories
 * @access  Private
 */
const getStories = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const result = await Story.getActiveStories(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      stories: result.stories,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET ACTIVE STORIES
// ============================================

/**
 * @desc    Get active stories (not expired)
 * @route   GET /api/stories/active
 * @access  Private
 */
const getActiveStories = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const result = await Story.getActiveStories(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      stories: result.stories,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get active stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching active stories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET STORY BY ID
// ============================================

/**
 * @desc    Get a single story by ID
 * @route   GET /api/stories/:id
 * @access  Private
 */
const getStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(id)
      .populate('author', 'name username avatar isVerified');

    if (!story || story.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user can view this story
    if (story.visibility === 'private' && story.author._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this story'
      });
    }

    res.json({
      success: true,
      story,
    });

  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching story',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// VIEW STORY
// ============================================

/**
 * @desc    Mark a story as viewed
 * @route   PUT /api/stories/:id/view
 * @access  Private
 */
const viewStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(id);
    if (!story || story.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user can view this story
    if (story.visibility === 'private' && story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this story'
      });
    }

    await story.addViewer(userId);

    res.json({
      success: true,
      message: 'Story marked as viewed',
    });

  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking story as viewed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// DELETE STORY
// ============================================

/**
 * @desc    Delete a story
 * @route   DELETE /api/stories/:id
 * @access  Private
 */
const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this story'
      });
    }

    // Delete media file
    if (story.media) {
      try {
        fs.unlinkSync(story.media);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }

    await story.delete();

    res.json({
      success: true,
      message: 'Story deleted successfully',
    });

  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting story',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// ARCHIVE STORY
// ============================================

/**
 * @desc    Archive a story
 * @route   PUT /api/stories/:id/archive
 * @access  Private
 */
const archiveStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this story'
      });
    }

    await story.archive();

    res.json({
      success: true,
      message: 'Story archived successfully',
    });

  } catch (error) {
    console.error('Archive story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error archiving story',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET STORY VIEWS
// ============================================

/**
 * @desc    Get viewers of a story
 * @route   GET /api/stories/:id/views
 * @access  Private (Owner only)
 */
const getStoryViews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this story\'s viewers'
      });
    }

    const result = await story.getViewers({
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      viewers: result.viewers,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get story views error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching story views',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET STORY ANALYTICS
// ============================================

/**
 * @desc    Get story analytics
 * @route   GET /api/stories/:id/analytics
 * @access  Private (Owner only)
 */
const getStoryAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this story\'s analytics'
      });
    }

    const analytics = {
      viewCount: story.viewers ? story.viewers.length : 0,
      uniqueViewers: story.viewers ? story.viewers.length : 0,
      reactionCount: story.reactions ? story.reactions.length : 0,
      replyCount: story.replies ? story.replies.length : 0,
      completionRate: story.analytics?.completionRate || 0,
      engagementRate: story.analytics?.engagementRate || 0,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
    };

    res.json({
      success: true,
      analytics,
    });

  } catch (error) {
    console.error('Get story analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching story analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET STORIES BY USER
// ============================================

/**
 * @desc    Get stories by a specific user
 * @route   GET /api/stories/user/:userId
 * @access  Private
 */
const getStoriesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await Story.getByAuthor(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      includeExpired: false,
    });

    res.json({
      success: true,
      stories: result.stories,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get stories by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user stories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET STORIES BY HASHTAG
// ============================================

/**
 * @desc    Get stories by hashtag
 * @route   GET /api/stories/hashtag/:tag
 * @access  Private
 */
const getStoriesByHashtag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await Story.getByHashtag(tag, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      stories: result.stories,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get stories by hashtag error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stories by hashtag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// ADD REACTION TO STORY
// ============================================

/**
 * @desc    Add reaction to a story
 * @route   PUT /api/stories/:id/reaction
 * @access  Private
 */
const addStoryReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji || emoji.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid emoji is required'
      });
    }

    const story = await Story.findById(id);
    if (!story || story.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    await story.addReaction(userId, emoji);

    res.json({
      success: true,
      message: 'Reaction added',
      reactions: story.reactions,
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding reaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// REMOVE REACTION FROM STORY
// ============================================

/**
 * @desc    Remove reaction from a story
 * @route   DELETE /api/stories/:id/reaction
 * @access  Private
 */
const removeStoryReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    await story.removeReaction(userId);

    res.json({
      success: true,
      message: 'Reaction removed',
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing reaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  createStory,
  getStories,
  getActiveStories,
  getStoryById,
  viewStory,
  deleteStory,
  archiveStory,
  getStoryViews,
  getStoryAnalytics,
  getStoriesByUser,
  getStoriesByHashtag,
  addStoryReaction,
  removeStoryReaction,
};