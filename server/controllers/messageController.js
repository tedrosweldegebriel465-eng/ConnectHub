/**
 * ============================================
 * MESSAGE CONTROLLER
 * Version: 2.0.0
 * Description: Handles messaging operations
 *              including sending, receiving, and management
 * ============================================
 */

const Message = require('../models/message');
const User = require('../models/user');
const { validationResult } = require('express-validator');

// ============================================
// SEND MESSAGE
// ============================================

/**
 * @desc    Send a message to a user
 * @route   POST /api/messages/:recipientId
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { recipientId } = req.params;
    const { content } = req.body;
    const senderId = req.user._id;

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Check if trying to message self
    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send message to yourself'
      });
    }

    // Check if recipient has blocked sender
    if (recipient.blockedUsers && recipient.blockedUsers.includes(senderId)) {
      return res.status(403).json({
        success: false,
        message: 'You are blocked by this user'
      });
    }

    // Create message
    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      content,
    });

    await message.populate('sender', 'name username avatar');
    await message.populate('recipient', 'name username avatar');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('newMessage', message);
      io.to(`user:${senderId}`).emit('newMessage', message);
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET CONVERSATION
// ============================================

/**
 * @desc    Get conversation with a specific user
 * @route   GET /api/messages/:userId
 * @access  Private
 */
const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user._id;

    const messages = await Message.getConversation(currentUserId, userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    const total = await Message.countDocuments({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
      deletedFor: { $nin: [currentUserId] },
    });

    // Mark unread messages as read
    await Message.updateMany(
      {
        sender: userId,
        recipient: currentUserId,
        read: false,
      },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET INBOX
// ============================================

/**
 * @desc    Get user's inbox/conversations
 * @route   GET /api/messages
 * @access  Private
 */
const getInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const conversations = await Message.getInbox(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    // Populate user info for each conversation
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const user = await User.findById(conv._id)
          .select('name username avatar isVerified');
        return {
          partner: user,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount,
        };
      })
    );

    // Filter out conversations where user no longer exists
    const filtered = populatedConversations.filter(conv => conv.partner);

    const total = await Message.distinct(
      'sender',
      { 
        $or: [{ sender: userId }, { recipient: userId }],
        deletedFor: { $nin: [userId] },
      }
    );

    res.json({
      success: true,
      conversations: filtered,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.length,
        pages: Math.ceil(total.length / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching inbox',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET UNREAD COUNT
// ============================================

/**
 * @desc    Get total unread message count
 * @route   GET /api/messages/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Message.getUnreadCount(userId);

    res.json({
      success: true,
      count,
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET SINGLE MESSAGE
// ============================================

/**
 * @desc    Get a single message by ID
 * @route   GET /api/messages/single/:messageId
 * @access  Private
 */
const getMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate('sender', 'name username avatar')
      .populate('recipient', 'name username avatar')
      .populate('replyTo', 'content sender');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    if (message.sender._id.toString() !== userId.toString() &&
        message.recipient._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this message'
      });
    }

    // Check if message is deleted for this user
    if (message.deletedFor && message.deletedFor.includes(userId)) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// DELETE MESSAGE
// ============================================

/**
 * @desc    Delete a message (for both users)
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    if (message.sender.toString() !== userId.toString() &&
        message.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await message.deleteForUser(userId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// MARK AS READ
// ============================================

/**
 * @desc    Mark a single message as read
 * @route   PUT /api/messages/:messageId/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this message as read'
      });
    }

    await message.markAsRead();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${message.sender}`).emit('messageRead', {
        messageId: message._id,
        userId: userId,
      });
    }

    res.json({
      success: true,
      message: 'Message marked as read',
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking message as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// MARK CONVERSATION AS READ
// ============================================

/**
 * @desc    Mark all messages with a user as read
 * @route   PUT /api/messages/:userId/read-all
 * @access  Private
 */
const markConversationAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const result = await Message.markAsRead(currentUserId, userId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('conversationRead', {
        userId: currentUserId,
      });
    }

    res.json({
      success: true,
      message: 'All messages marked as read',
      count: result.modifiedCount,
    });

  } catch (error) {
    console.error('Mark conversation as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking conversation as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET LAST MESSAGE
// ============================================

/**
 * @desc    Get last message with a user
 * @route   GET /api/messages/last/:userId
 * @access  Private
 */
const getLastMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findOne({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
      deletedFor: { $nin: [currentUserId] },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name username avatar')
      .populate('recipient', 'name username avatar');

    res.json({
      success: true,
      message: message || null,
    });

  } catch (error) {
    console.error('Get last message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching last message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// SEARCH MESSAGES
// ============================================

/**
 * @desc    Search messages
 * @route   GET /api/messages/search
 * @access  Private
 */
const searchMessages = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user._id;

    if (!q || q.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const messages = await Message.searchMessages(userId, q, {
      limit: 50,
    });

    res.json({
      success: true,
      messages,
      count: messages.length,
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET MESSAGE STATS
// ============================================

/**
 * @desc    Get message statistics
 * @route   GET /api/messages/stats
 * @access  Private
 */
const getMessageStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Message.getStats(userId);

    res.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching message stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// ADD REACTION TO MESSAGE
// ============================================

/**
 * @desc    Add reaction to a message
 * @route   PUT /api/messages/:messageId/reaction
 * @access  Private
 */
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji || emoji.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid emoji is required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    if (message.sender.toString() !== userId.toString() &&
        message.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to react to this message'
      });
    }

    await message.addReaction(userId, emoji);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const otherUser = message.sender.toString() === userId.toString() 
        ? message.recipient 
        : message.sender;
      io.to(`user:${otherUser}`).emit('messageReaction', {
        messageId: message._id,
        userId: userId,
        emoji: emoji,
      });
    }

    res.json({
      success: true,
      message: 'Reaction added',
      reactions: message.reactions,
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
// REMOVE REACTION FROM MESSAGE
// ============================================

/**
 * @desc    Remove reaction from a message
 * @route   DELETE /api/messages/:messageId/reaction
 * @access  Private
 */
const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    if (message.sender.toString() !== userId.toString() &&
        message.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove reaction from this message'
      });
    }

    await message.removeReaction(userId);

    res.json({
      success: true,
      message: 'Reaction removed',
      reactions: message.reactions,
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
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
  getMessage,
  deleteMessage,
  markAsRead,
  markConversationAsRead,
  getLastMessage,
  searchMessages,
  getMessageStats,
  addReaction,
  removeReaction,
};