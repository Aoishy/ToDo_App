const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentPhase: {
      type: String,
      required: true,
      default: 'Backlog',
    },
    phaseHistory: [
      {
        phase: {
          type: String,
          required: true,
        },
        movedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        movedAt: {
          type: Date,
          default: Date.now,
        },
        duration: {
          type: Number, // Minutes spent in previous phase
        },
        notes: {
          type: String,
          maxlength: [500, 'Notes cannot exceed 500 characters'],
        },
      },
    ],
    estimatedHours: {
      type: Number,
      min: 0,
    },
    points: {
      type: Number,
      min: 0,
      default: 0,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'blocked'],
      default: 'pending',
    },
    tags: [String],
    attachments: [String],
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        comment: {
          type: String,
          maxlength: [500, 'Comment cannot exceed 500 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Initialize phase history on creation
taskSchema.pre('save', function (next) {
  if (this.isNew && this.phaseHistory.length === 0) {
    this.phaseHistory.push({
      phase: this.currentPhase,
      movedBy: this.createdBy,
      movedAt: new Date(),
      notes: 'Task created',
    });
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
