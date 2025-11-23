const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Team = require('../models/Team');
const { protect } = require('../middleware/auth');

// @route   GET /api/messages/unread/count
// @desc    Get unread message count for current user (all chats)
// @access  Private
router.get('/unread/count', protect, async (req, res) => {
  try {
    // Find all teams where user is a member
    const userTeams = await Team.find({
      $or: [
        { members: req.user.id },
        { createdBy: req.user.id }
      ]
    }).select('_id');

    const teamIds = userTeams.map(team => team._id);

    // Count unread messages from:
    // 1. General chat (teamId: null)
    // 2. Teams where user is a member
    const count = await Message.countDocuments({
      userId: { $ne: req.user.id }, // Not sent by current user
      readBy: { $ne: req.user.id }, // Not read by current user
      $or: [
        { teamId: null }, // General chat
        { teamId: { $in: teamIds } } // Teams user is member of
      ]
    });

    res.json({
      success: true,
      count: count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   GET /api/messages
// @desc    Get all messages (filtered by teamId)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { teamId } = req.query;
    const filter = teamId ? { teamId } : { teamId: null }; // null = general chat
    
    const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(100);
    res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   POST /api/messages
// @desc    Create a new message
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const message = await Message.create({
      username: req.user.username,
      userId: req.user.id,
      message: req.body.message,
      teamId: req.body.teamId || null, // null = general chat
    });

    // Convert to plain object for Socket.IO
    const messageData = message.toObject();

    // Emit message via Socket.IO
    if (req.body.teamId) {
      // Emit to specific team room
      console.log(`Emitting to team-${req.body.teamId}:`, messageData);
      req.io.to(`team-${req.body.teamId}`).emit('newMessage', messageData);
    } else {
      // Emit to general chat (all connected clients)
      console.log('Emitting to general chat:', messageData);
      req.io.emit('newMessage', messageData);
    }

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages,
      });
    }

    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   PUT /api/messages/mark-read
// @desc    Mark messages as read for current user
// @access  Private
router.put('/mark-read', protect, async (req, res) => {
  try {
    const { teamId } = req.body;
    const filter = teamId ? { teamId } : { teamId: null };

    // Update all unread messages in this chat
    const result = await Message.updateMany(
      {
        ...filter,
        userId: { $ne: req.user.id }, // Not sent by current user
        readBy: { $ne: req.user.id }, // Not already read
      },
      {
        $addToSet: { readBy: req.user.id }, // Add user to readBy array
      }
    );

    // Emit event to notify user's other sessions about read status change
    if (req.io && result.modifiedCount > 0) {
      req.io.emit('messagesRead', { 
        userId: req.user.id, 
        teamId: teamId || null 
      });
    }

    res.json({
      success: true,
      marked: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

module.exports = router;
