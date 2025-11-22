const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    phases: [
      {
        name: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        color: {
          type: String,
          default: '#3b82f6',
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'completed', 'archived', 'on-hold'],
      default: 'active',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Default phases if not provided
projectSchema.pre('save', function (next) {
  if (this.isNew && (!this.phases || this.phases.length === 0)) {
    this.phases = [
      { name: 'Backlog', order: 1, color: '#6b7280' },
      { name: 'In Progress', order: 2, color: '#3b82f6' },
      { name: 'Review', order: 3, color: '#f59e0b' },
      { name: 'Testing', order: 4, color: '#8b5cf6' },
      { name: 'Done', order: 5, color: '#10b981' },
    ];
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
