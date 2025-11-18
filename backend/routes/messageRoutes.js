const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

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

module.exports = router;
