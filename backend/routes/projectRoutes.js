const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

// @route   GET /api/projects
// @desc    Get all projects for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { createdBy: req.user.id },
        { members: req.user.id }
      ]
    })
      .populate('createdBy', 'username')
      .populate('members', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('members', 'username');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is member or creator
    const isMember = project.members.some(m => m._id.toString() === req.user.id) ||
                     project.createdBy._id.toString() === req.user.id;

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, members, phases, deadline } = req.body;

    // Add creator to members if not already included
    const memberIds = Array.isArray(members) ? members : [];
    if (!memberIds.includes(req.user.id)) {
      memberIds.push(req.user.id);
    }

    const project = await Project.create({
      name,
      description,
      createdBy: req.user.id,
      members: memberIds,
      phases: phases || undefined, // Use default if not provided
      deadline,
    });

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'username')
      .populate('members', 'username');

    res.status(201).json({
      success: true,
      data: populatedProject,
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

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private (Creator only)
router.put('/:id', protect, async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is creator
    if (project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only project creator can update',
      });
    }

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'username')
      .populate('members', 'username');

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private (Creator only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is creator
    if (project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only project creator can delete',
      });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ projectId: req.params.id });

    await project.deleteOne();

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

// ==================== TASK ROUTES ====================

// @route   GET /api/projects/:projectId/tasks
// @desc    Get all tasks for a project
// @access  Private
router.get('/:projectId/tasks', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check access
    const isMember = project.members.some(m => m.toString() === req.user.id) ||
                     project.createdBy.toString() === req.user.id;

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const tasks = await Task.find({ projectId: req.params.projectId })
      .populate('assignedTo', 'username')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   POST /api/projects/:projectId/tasks
// @desc    Create new task
// @access  Private (Creator only)
router.post('/:projectId/tasks', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is creator
    if (project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only project creator can create tasks',
      });
    }

    const task = await Task.create({
      ...req.body,
      projectId: req.params.projectId,
      createdBy: req.user.id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username')
      .populate('createdBy', 'username');

    // Emit socket event
    if (req.io) {
      req.io.to(`project-${req.params.projectId}`).emit('taskCreated', populatedTask);
    }

    res.status(201).json({
      success: true,
      data: populatedTask,
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

// @route   PUT /api/projects/:projectId/tasks/:taskId/move
// @desc    Move task to different phase
// @access  Private (Assigned members only)
router.put('/:projectId/tasks/:taskId/move', protect, async (req, res) => {
  try {
    const { toPhase, notes } = req.body;

    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    // Check if task belongs to project
    if (task.projectId.toString() !== req.params.projectId) {
      return res.status(400).json({
        success: false,
        error: 'Task does not belong to this project',
      });
    }

    // Check if user is assigned to this task
    const isAssigned = task.assignedTo.some(u => u.toString() === req.user.id);

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Only assigned members can move this task',
      });
    }

    // Calculate duration in previous phase
    const lastPhaseEntry = task.phaseHistory[task.phaseHistory.length - 1];
    const duration = lastPhaseEntry 
      ? Math.floor((new Date() - new Date(lastPhaseEntry.movedAt)) / 60000)
      : 0;

    // Update last phase entry with duration
    if (lastPhaseEntry) {
      lastPhaseEntry.duration = duration;
    }

    // Add new phase history entry
    task.phaseHistory.push({
      phase: toPhase,
      movedBy: req.user.id,
      movedAt: new Date(),
      notes: notes || '',
    });

    task.currentPhase = toPhase;

    // Update status based on phase
    if (toPhase === 'Done') {
      task.status = 'completed';
      task.completedAt = new Date();
    } else if (toPhase === 'In Progress') {
      task.status = 'in-progress';
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username')
      .populate('createdBy', 'username')
      .populate('phaseHistory.movedBy', 'username');

    // Emit socket event
    if (req.io) {
      req.io.to(`project-${req.params.projectId}`).emit('taskMoved', {
        task: populatedTask,
        movedBy: req.user.username,
      });
    }

    res.json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   PUT /api/projects/:projectId/tasks/:taskId
// @desc    Update task details
// @access  Private
router.put('/:projectId/tasks/:taskId', protect, async (req, res) => {
  try {
    let task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    task = await Task.findByIdAndUpdate(req.params.taskId, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'username')
      .populate('createdBy', 'username');

    // Emit socket event
    if (req.io) {
      req.io.to(`project-${req.params.projectId}`).emit('taskUpdated', task);
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   DELETE /api/projects/:projectId/tasks/:taskId
// @desc    Delete task
// @access  Private
router.delete('/:projectId/tasks/:taskId', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    await task.deleteOne();

    // Emit socket event
    if (req.io) {
      req.io.to(`project-${req.params.projectId}`).emit('taskDeleted', req.params.taskId);
    }

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
