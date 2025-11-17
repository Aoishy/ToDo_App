const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { protect } = require('../middleware/auth');

// @route   GET /api/teams
// @desc    Get all teams (user is member of or created)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { createdBy: req.user._id },
        { members: req.user._id }
      ]
    })
      .populate('createdBy', 'username')
      .populate('members', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   POST /api/teams
// @desc    Create a new team
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const team = await Team.create({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user._id,
      members: [req.user._id], // Creator is automatically a member
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('createdBy', 'username')
      .populate('members', 'username');

    res.status(201).json({
      success: true,
      data: populatedTeam,
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

// @route   PUT /api/teams/:id/members
// @desc    Add members to team
// @access  Private (only creator can add members)
router.put('/:id/members', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
      });
    }

    // Check if user is the creator
    if (team.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only team creator can add members',
      });
    }

    // Add new members (avoid duplicates)
    const newMembers = req.body.members || [];
    newMembers.forEach(memberId => {
      if (!team.members.includes(memberId)) {
        team.members.push(memberId);
      }
    });

    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate('createdBy', 'username')
      .populate('members', 'username');

    res.json({
      success: true,
      data: updatedTeam,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   DELETE /api/teams/:id
// @desc    Delete a team
// @access  Private (only creator can delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
      });
    }

    // Check if user is the creator
    if (team.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only team creator can delete team',
      });
    }

    await Team.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {},
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
