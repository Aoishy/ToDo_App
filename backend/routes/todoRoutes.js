const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const { protect } = require('../middleware/auth');

// @route   GET /api/todos
// @desc    Get all todos for logged-in user (created by them OR assigned to them)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Find todos where user is either the creator OR in the assignedTo array
    const todos = await Todo.find({
      $or: [
        { userId: req.user._id },
        { assignedTo: req.user._id }
      ]
    })
      .populate('assignedTo', 'username')
      .populate('userId', 'username')
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      count: todos.length,
      data: todos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   GET /api/todos/:id
// @desc    Get single todo
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found',
      });
    }

    // Check if todo belongs to user or is assigned to user
    const isOwner = todo.userId.toString() === req.user._id.toString();
    const isAssigned = todo.assignedTo && todo.assignedTo.some(userId => userId.toString() === req.user._id.toString());
    
    if (!isOwner && !isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this todo',
      });
    }

    res.json({
      success: true,
      data: todo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   POST /api/todos
// @desc    Create a new todo
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const todo = await Todo.create({
      ...req.body,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: todo,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   PUT /api/todos/:id
// @desc    Update a todo
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found',
      });
    }

    // Check if todo belongs to user or is assigned to user
    const isOwner = todo.userId.toString() === req.user._id.toString();
    const isAssigned = todo.assignedTo && todo.assignedTo.some(userId => userId.toString() === req.user._id.toString());
    
    if (!isOwner && !isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this todo',
      });
    }

    todo = await Todo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: todo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   DELETE /api/todos/:id
// @desc    Delete a todo
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found',
      });
    }

    // Check if todo belongs to user
    if (todo.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this todo',
      });
    }

    await Todo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

module.exports = router;
