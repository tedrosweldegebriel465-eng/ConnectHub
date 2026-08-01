/**
 * ============================================
 * COMMENT CONTROLLER
 * Version: 2.0.0
 * Description: Handles comment operations
 *              including CRUD and interactions
 * ============================================
 */

const Comment = require('../models/comment');
const Post = require('../models/post');
const Notification = require('../models/notification');
const { validationResult } = require('express-validator');

// ============================================
// ADD COMMENT
// ============================================

const addComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = await Comment.create({
      content,
      author: userId,
      post: postId,
    });

    await comment.populate('author', 'name username avatar isVerified');

    // Update post comment count
    post.commentCount = (post.commentCount || 0) + 1;
    post.comments.push(comment._id);
    await post.save();

    // Create notification
    if (post.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: userId,
        type: 'comment',
        post: postId,
        comment: comment._id,
        message: `${req.user.name} commented on your post`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment,
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET COMMENTS
// ============================================

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20, sort = 'newest' } = req.query;

    const comments = await Comment.getCommentsForPost(postId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
    });

    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      isDeleted: false,
    });

    res.json({
      success: true,
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching comments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET SINGLE COMMENT
// ============================================

const getComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id)
      .populate('author', 'name username avatar isVerified')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'name username avatar isVerified',
        },
      });

    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    res.json({
      success: true,
      comment,
    });

  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// UPDATE COMMENT
// ============================================

const updateComment = async (req, res) => {
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

    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    await comment.populate('author', 'name username avatar isVerified');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment,
    });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// DELETE COMMENT
// ============================================

const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const post = await Post.findById(comment.post);
    const isPostOwner = post && post.author.toString() === userId.toString();
    const isCommentOwner = comment.author.toString() === userId.toString();

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await comment.softDelete();

    if (post) {
      post.commentCount = Math.max(0, (post.commentCount || 1) - 1);
      await post.save();
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// LIKE COMMENT
// ============================================

const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const result = await comment.toggleLike(userId);

    // Create notification
    if (result.liked && comment.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: comment.author,
        sender: userId,
        type: 'like',
        comment: comment._id,
        message: `${req.user.name} liked your comment`,
      });
    }

    res.json({
      success: true,
      message: result.liked ? 'Comment liked' : 'Comment unliked',
      liked: result.liked,
      likes: result.likeCount,
    });

  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// UNLIKE COMMENT
// ============================================

const unlikeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Comment not liked'
      });
    }

    comment.likes.splice(likeIndex, 1);
    comment.likeCount = comment.likes.length;
    await comment.save();

    res.json({
      success: true,
      message: 'Comment unliked',
      liked: false,
      likes: comment.likes.length,
    });

  } catch (error) {
    console.error('Unlike comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unliking comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// COMMENT REPLIES
// ============================================

const getCommentReplies = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const replies = await Comment.getRepliesForComment(id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    const total = await Comment.countDocuments({
      parentComment: id,
      isDeleted: false,
    });

    res.json({
      success: true,
      replies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching replies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const addReply = async (req, res) => {
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

    const parentComment = await Comment.findById(id);
    if (!parentComment || parentComment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found'
      });
    }

    const reply = await parentComment.addReply({
      content,
      author: userId,
      post: parentComment.post,
      parentComment: id,
    });

    await reply.populate('author', 'name username avatar isVerified');

    // Create notification
    if (parentComment.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: parentComment.author,
        sender: userId,
        type: 'reply',
        comment: parentComment._id,
        message: `${req.user.name} replied to your comment`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      reply,
    });

  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding reply',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    const userId = req.user._id;

    const parentComment = await Comment.findById(id);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found'
      });
    }

    const reply = await Comment.findById(replyId);
    if (!reply || reply.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }

    if (reply.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reply'
      });
    }

    await reply.softDelete();

    parentComment.replies = parentComment.replies.filter(
      r => r.toString() !== replyId
    );
    parentComment.replyCount = parentComment.replies.length;
    await parentComment.save();

    res.json({
      success: true,
      message: 'Reply deleted successfully',
    });

  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting reply',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const likeReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    const userId = req.user._id;

    const reply = await Comment.findById(replyId);
    if (!reply || reply.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }

    const result = await reply.toggleLike(userId);

    res.json({
      success: true,
      message: result.liked ? 'Reply liked' : 'Reply unliked',
      liked: result.liked,
      likes: result.likeCount,
    });

  } catch (error) {
    console.error('Like reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking reply',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  addComment,
  getComments,
  getComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentReplies,
  addReply,
  deleteReply,
  likeReply,
};