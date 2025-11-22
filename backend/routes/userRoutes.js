const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users (username and id only)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find().select('_id username').sort({ username: 1 });
    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   GET /api/users/online
// @desc    Get all online users
// @access  Private
router.get('/online', protect, async (req, res) => {
  try {
    const onlineUsers = await User.find({ isOnline: true })
      .select('_id username isOnline lastSeen')
      .sort({ username: 1 });
    res.json({
      success: true,
      count: onlineUsers.length,
      data: onlineUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   GET /api/users/:id/status
// @desc    Get specific user status
// @access  Private
router.get('/:id/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('_id username isOnline lastSeen');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
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
