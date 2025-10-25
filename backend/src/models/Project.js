import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  // Project metadata
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  // Jenkins integration
  jenkinsConfig: {
    url: String,
    jobName: String,
    token: String,
    enabled: { type: Boolean, default: false }
  },
  // Email notifications
  emailConfig: {
    smtp: {
      host: String,
      port: Number,
      secure: Boolean,
      auth: {
        user: String,
        pass: String
      }
    },
    notifications: {
      onFailure: { type: Boolean, default: true },
      onSuccess: { type: Boolean, default: false },
      onExecution: { type: Boolean, default: false }
    }
  },
  // Teams that can access this project
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  // Project owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Statistics
  stats: {
    scenarioCount: { type: Number, default: 0 },
    executionCount: { type: Number, default: 0 },
    lastExecuted: Date
  }
}, {
  timestamps: true
});

// Indexes
projectSchema.index({ name: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ teams: 1 });

// Virtual for scenario count
projectSchema.virtual('scenarioCount').get(function() {
  return this.stats.scenarioCount;
});

// Methods
projectSchema.methods.addTeam = function(teamId) {
  if (!this.teams.includes(teamId)) {
    this.teams.push(teamId);
  }
  return this.save();
};

projectSchema.methods.removeTeam = function(teamId) {
  this.teams = this.teams.filter(id => !id.equals(teamId));
  return this.save();
};

projectSchema.methods.hasTeamAccess = function(teamId) {
  return this.teams.includes(teamId);
};

export const Project = mongoose.model('Project', projectSchema);
