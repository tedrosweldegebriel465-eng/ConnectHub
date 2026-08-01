/**
 * ============================================
 * POST CONTROLLER
 * Version: 2.0.0
 * Description: Handles post operations
 *              including CRUD, interactions, and feed
 * ============================================
 */

const Post = require('../models/post');
const User = require('../models/user');
const Notification = require('../models/notification');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// ============================================
// CREATE POST
// ============================================

const createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { content, pollOptions, pollDuration } = req.body;
    const userId = req.user._id;

    const postData = {
      content: content || '',
      author: userId,
    };

    // Handle media upload
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video/');
      const filename = path.basename(req.file.path);
      const webPath = `/uploads/posts/${filename}`;
      if (isVideo) {
        postData.video = webPath;
      } else {
        postData.image = webPath;
      }
    }

    // Handle poll
    if (pollOptions && pollOptions.length >= 2) {
      const options = typeof pollOptions === 'string' ? JSON.parse(pollOptions) : pollOptions;
      postData.isPoll = true;
      postData.pollOptions = options.map(opt => ({
        text: opt,
        votes: [],
      }));
      postData.pollEndsAt = new Date(Date.now() + (parseInt(pollDuration) || 24) * 3600000);
    }

    const post = await Post.create(postData);
    await post.populate('author', 'name username avatar isVerified');

    // Update user's post count
    await User.findByIdAndUpdate(userId, {
      $inc: { postCount: 1 },
      $push: { posts: post._id }
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('newPost', post);
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post,
    });

  } catch (error) {
    console.error('Create post error:', error);
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (err) {}
    }
    res.status(500).json({
      success: false,
      message: 'Server error creating post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET POSTS (Feed)
// ============================================

const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const following = user.following || [];

    const result = await Post.getFeed(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      following,
    });

    res.json({
      success: true,
      posts: result.posts,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET TRENDING POSTS
// ============================================

const getTrending = async (req, res) => {
  try {
    const { limit = 20, timeframe = 7 } = req.query;

    const posts = await Post.getTrending({
      limit: parseInt(limit),
      timeframe: parseInt(timeframe),
    });

    res.json({
      success: true,
      posts,
    });

  } catch (error) {
    console.error('Get trending error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trending posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET FOLLOWING FEED
// ============================================

const getFollowingFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const following = user.following || [];

    const result = await Post.getFeed(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      following,
    });

    res.json({
      success: true,
      posts: result.posts,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get following feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching following feed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET EXPLORE FEED
// ============================================

const getExploreFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({
      isDeleted: false,
      isPublic: true,
    })
      .populate('author', 'name username avatar isVerified')
      .sort({ likeCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({
      isDeleted: false,
      isPublic: true,
    });

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get explore feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching explore feed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET POST BY ID
// ============================================

const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate('author', 'name username avatar isVerified')
      .populate({
        path: 'originalPost',
        populate: {
          path: 'author',
          select: 'name username avatar isVerified',
        },
      });

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment views
    await post.incrementViews();

    res.json({
      success: true,
      post,
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// UPDATE POST
// ============================================

const updatePost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    post.content = content;
    post.isEdited = true;
    post.editedAt = new Date();
    await post.save();

    res.json({
      success: true,
      message: 'Post updated successfully',
      post,
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// DELETE POST
// ============================================

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await post.softDelete();

    await User.findByIdAndUpdate(userId, {
      $inc: { postCount: -1 },
      $pull: { posts: post._id }
    });

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// LIKE POST
// ============================================

const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const result = await post.toggleLike(userId);

    // Create notification
    if (result.liked && post.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: userId,
        type: 'like',
        post: post._id,
        message: `${req.user.name} liked your post`,
      });
    }

    res.json({
      success: true,
      message: result.liked ? 'Post liked' : 'Post unliked',
      liked: result.liked,
      likes: result.likeCount,
    });

  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// UNLIKE POST
// ============================================

const unlikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Post not liked'
      });
    }

    post.likes.splice(likeIndex, 1);
    post.likeCount = post.likes.length;
    await post.save();

    res.json({
      success: true,
      message: 'Post unliked',
      liked: false,
      likes: post.likes.length,
    });

  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unliking post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// BOOKMARK POST
// ============================================

const bookmarkPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const result = await post.toggleBookmark(userId);

    res.json({
      success: true,
      message: result.bookmarked ? 'Post bookmarked' : 'Post unbookmarked',
      bookmarked: result.bookmarked,
    });

  } catch (error) {
    console.error('Bookmark post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error bookmarking post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// UNBOOKMARK POST
// ============================================

const unbookmarkPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const bookmarkIndex = post.bookmarks.indexOf(userId);
    if (bookmarkIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Post not bookmarked'
      });
    }

    post.bookmarks.splice(bookmarkIndex, 1);
    post.bookmarkCount = post.bookmarks.length;
    await post.save();

    res.json({
      success: true,
      message: 'Post unbookmarked',
      bookmarked: false,
    });

  } catch (error) {
    console.error('Unbookmark post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unbookmarking post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// REPOST POST
// ============================================

const repostPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const originalPost = await Post.findById(id);
    if (!originalPost || originalPost.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const result = await originalPost.toggleRepost(userId);

    if (result.reposted) {
      // Create repost as new post
      const repost = await Post.create({
        content: '',
        author: userId,
        originalPost: originalPost._id,
        isRepost: true,
      });

      await repost.populate('author', 'name username avatar');
      await repost.populate('originalPost');

      res.json({
        success: true,
        message: 'Post reposted',
        reposted: true,
        repost,
        reposts: result.repostCount,
      });
    } else {
      // Delete the repost post
      await Post.findOneAndDelete({
        author: userId,
        originalPost: originalPost._id,
        isRepost: true,
      });

      res.json({
        success: true,
        message: 'Repost removed',
        reposted: false,
        reposts: result.repostCount,
      });
    }

  } catch (error) {
    console.error('Repost post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error reposting post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// UNREPOST POST
// ============================================

const unrepostPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const originalPost = await Post.findById(id);
    if (!originalPost || originalPost.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const repostIndex = originalPost.reposts.indexOf(userId);
    if (repostIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Post not reposted'
      });
    }

    originalPost.reposts.splice(repostIndex, 1);
    originalPost.repostCount = originalPost.reposts.length;
    await originalPost.save();

    // Delete the repost post
    await Post.findOneAndDelete({
      author: userId,
      originalPost: originalPost._id,
      isRepost: true,
    });

    res.json({
      success: true,
      message: 'Repost removed',
      reposted: false,
      reposts: originalPost.reposts.length,
    });

  } catch (error) {
    console.error('Unrepost post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing repost',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// VIEW POST
// ============================================

const viewPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await post.incrementViews();

    res.json({
      success: true,
      views: post.views,
    });

  } catch (error) {
    console.error('View post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating view count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EDIT POST
// ============================================

const editPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this post'
      });
    }

    post.content = content;
    post.isEdited = true;
    post.editedAt = new Date();
    await post.save();

    res.json({
      success: true,
      message: 'Post updated successfully',
      content: post.content,
      isEdited: post.isEdited,
    });

  } catch (error) {
    console.error('Edit post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error editing post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// PIN POST
// ============================================

const pinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pin this post'
      });
    }

    await post.pin();

    res.json({
      success: true,
      message: 'Post pinned successfully',
      pinned: true,
    });

  } catch (error) {
    console.error('Pin post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error pinning post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// UNPIN POST
// ============================================

const unpinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to unpin this post'
      });
    }

    await post.unpin();

    res.json({
      success: true,
      message: 'Post unpinned successfully',
      pinned: false,
    });

  } catch (error) {
    console.error('Unpin post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unpinning post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// VOTE POLL
// ============================================

const votePoll = async (req, res) => {
  try {
    const { id, optionIndex } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || !post.isPoll || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    const updatedPost = await post.votePoll(userId, parseInt(optionIndex));

    const totalVotes = updatedPost.pollOptions.reduce(
      (sum, opt) => sum + (opt.votes ? opt.votes.length : 0),
      0
    );

    const results = updatedPost.pollOptions.map(opt => ({
      text: opt.text,
      votes: opt.votes ? opt.votes.length : 0,
      percentage: totalVotes > 0 ? ((opt.votes ? opt.votes.length : 0) / totalVotes) * 100 : 0,
    }));

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      results,
      totalVotes,
    });

  } catch (error) {
    console.error('Vote poll error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error voting on poll',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET POLL RESULTS
// ============================================

const getPollResults = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post || !post.isPoll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    const totalVotes = post.pollOptions.reduce(
      (sum, opt) => sum + (opt.votes ? opt.votes.length : 0),
      0
    );

    const results = post.pollOptions.map(opt => ({
      text: opt.text,
      votes: opt.votes ? opt.votes.length : 0,
      percentage: totalVotes > 0 ? ((opt.votes ? opt.votes.length : 0) / totalVotes) * 100 : 0,
    }));

    res.json({
      success: true,
      results,
      totalVotes,
      ended: post.pollEnded,
    });

  } catch (error) {
    console.error('Get poll results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching poll results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET POSTS BY USER
// ============================================

const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({
      author: userId,
      isDeleted: false,
    })
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
      .limit(parseInt(limit));

    const total = await Post.countDocuments({
      author: userId,
      isDeleted: false,
    });

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get posts by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET MEDIA POSTS BY USER
// ============================================

const getUserMediaPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({
      author: userId,
      isDeleted: false,
      $or: [
        { image: { $exists: true, $ne: '' } },
        { video: { $exists: true, $ne: '' } },
      ],
    })
      .populate('author', 'name username avatar isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({
      author: userId,
      isDeleted: false,
      $or: [
        { image: { $exists: true, $ne: '' } },
        { video: { $exists: true, $ne: '' } },
      ],
    });

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get user media posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user media posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET LIKED POSTS
// ============================================

const getLikedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({
      likes: { $in: [userId] },
      isDeleted: false,
    })
      .populate('author', 'name username avatar isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({
      likes: { $in: [userId] },
      isDeleted: false,
    });

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get liked posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching liked posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET BOOKMARKS
// ============================================

const getBookmarks = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({
      bookmarks: { $in: [userId] },
      isDeleted: false,
    })
      .populate('author', 'name username avatar isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({
      bookmarks: { $in: [userId] },
      isDeleted: false,
    });

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bookmarks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET POSTS BY HASHTAG
// ============================================

const getPostsByHashtag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await Post.getByHashtag(tag, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      posts: result.posts,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get posts by hashtag error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching posts by hashtag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET TRENDING HASHTAGS
// ============================================

const getTrendingHashtags = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const hashtags = await Post.getPopularHashtags(parseInt(limit));

    res.json({
      success: true,
      hashtags,
    });

  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trending hashtags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// SEARCH HASHTAGS
// ============================================

const searchHashtags = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const hashtags = await Post.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: '$hashtags' },
      { $match: { hashtags: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.json({
      success: true,
      hashtags,
    });

  } catch (error) {
    console.error('Search hashtags error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching hashtags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET POST ANALYTICS
// ============================================

const getPostAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics for this post'
      });
    }

    const analytics = {
      views: post.views || 0,
      likes: post.likes?.length || 0,
      comments: post.comments?.length || 0,
      reposts: post.reposts?.length || 0,
      bookmarks: post.bookmarks?.length || 0,
      shares: post.shares || 0,
      engagementRate: post.analytics?.engagementRate || 0,
      createdAt: post.createdAt,
    };

    res.json({
      success: true,
      analytics,
    });

  } catch (error) {
    console.error('Get post analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching post analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET EXPLORE STATS
// ============================================

const getExploreStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const postsTodayCount = await Post.countDocuments({
      isDeleted: false,
      createdAt: { $gte: today },
    });

    const totalPostsCount = await Post.countDocuments({ isDeleted: false });
    const activeUsersCount = await User.countDocuments({});

    const hashtagsAgg = await Post.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags' } },
      { $count: 'total' }
    ]);
    const trendingTagsCount = hashtagsAgg[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        postsToday: postsTodayCount > 0 ? postsTodayCount : totalPostsCount,
        activeUsers: activeUsersCount,
        trendingTags: trendingTagsCount,
      }
    });

  } catch (error) {
    console.error('Get explore stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching explore stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET CLIPS (Short Video Feed)
// ============================================

const getClips = async (req, res) => {
  try {
    const clips = await Post.find({
      video: { $exists: true, $ne: '' },
      isDeleted: false,
    })
      .populate('author', 'name username avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      clips,
    });

  } catch (error) {
    console.error('Get clips error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching clips feed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  // CRUD Operations
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,

  // Feed & Discovery
  getTrending,
  getFollowingFeed,
  getExploreFeed,
  getClips,

  // User Posts
  getPostsByUser,
  getUserMediaPosts,
  getLikedPosts,
  getBookmarks,

  // Interactions
  likePost,
  unlikePost,
  bookmarkPost,
  unbookmarkPost,
  repostPost,
  unrepostPost,
  viewPost,

  // Management
  editPost,
  pinPost,
  unpinPost,

  // Polls
  votePoll,
  getPollResults,

  // Hashtags
  getPostsByHashtag,
  getTrendingHashtags,
  searchHashtags,

  // Analytics
  getPostAnalytics,
  getExploreStats,
};