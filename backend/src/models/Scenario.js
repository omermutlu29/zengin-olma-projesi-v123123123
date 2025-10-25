import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  data: {
    label: { type: String },
    method: { type: String },
    url: { type: String },
    headers: { type: Map, of: String },
    body: { type: mongoose.Schema.Types.Mixed },
    assertions: [{
      type: { type: String, enum: ['status', 'body', 'header'] },
      field: { type: String },
      operator: { type: String, enum: ['equals', 'contains', 'regex', 'greater', 'less'] },
      expected: { type: String },
      description: { type: String }
    }],
    timeout: { type: Number, default: 30000 },
    retries: { type: Number, default: 0 }
  }
}, { _id: false });

const edgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String, default: 'default' },
  animated: { type: Boolean, default: false },
  style: { type: Map, of: String },
  label: { type: String }
}, { _id: false });

const scenarioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String,
    maxlength: 500
  },
  // Project association
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  // Owner (creator)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Team that owns this scenario
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  // Scenario data
  nodes: [nodeSchema],
  edges: [edgeSchema],
  variables: {
    type: Map,
    of: String,
    default: new Map()
  },
  settings: {
    timeout: { type: Number, default: 300000 }, // 5 minutes default
    parallel: { type: Boolean, default: false },
    retryOnFailure: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 }
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'running', 'completed', 'failed', 'paused'],
    default: 'draft'
  },
  // Access control
  visibility: {
    type: String,
    enum: ['private', 'team', 'project'],
    default: 'private'
  },
  // Collaborators (users who can edit)
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permissions: [{
      type: String,
      enum: ['view', 'edit', 'execute', 'manage']
    }],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  version: { type: Number, default: 1 },
  lastExecuted: { type: Date },
  executionCount: { type: Number, default: 0 },
  // Statistics
  stats: {
    viewCount: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    avgExecutionTime: { type: Number, default: 0 }
  },
  // Lock system for concurrent editing prevention
  lockInfo: {
    locked: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
scenarioSchema.index({ name: 1 });
scenarioSchema.index({ status: 1 });
scenarioSchema.index({ project: 1 });
scenarioSchema.index({ owner: 1 });
scenarioSchema.index({ team: 1 });
scenarioSchema.index({ tags: 1 });
scenarioSchema.index({ createdAt: -1 });
scenarioSchema.index({ project: 1, status: 1 });

// Virtual for execution history
scenarioSchema.virtual('executions', {
  ref: 'Execution',
  localField: '_id',
  foreignField: 'scenarioId'
});

// Methods
scenarioSchema.methods.addCollaborator = function(userId, permissions = ['view']) {
  const existingCollaborator = this.collaborators.find(collab => collab.user.equals(userId));
  
  if (existingCollaborator) {
    existingCollaborator.permissions = [...new Set([...existingCollaborator.permissions, ...permissions])];
  } else {
    this.collaborators.push({
      user: userId,
      permissions: permissions,
      addedAt: new Date()
    });
  }
  
  return this.save();
};

scenarioSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(collab => !collab.user.equals(userId));
  return this.save();
};

scenarioSchema.methods.updateCollaboratorPermissions = function(userId, permissions) {
  const collaborator = this.collaborators.find(collab => collab.user.equals(userId));
  if (collaborator) {
    collaborator.permissions = permissions;
  }
  return this.save();
};

scenarioSchema.methods.hasCollaborator = function(userId) {
  return this.collaborators.some(collab => collab.user.equals(userId));
};

scenarioSchema.methods.getCollaboratorPermissions = function(userId) {
  const collaborator = this.collaborators.find(collab => collab.user.equals(userId));
  return collaborator ? collaborator.permissions : [];
};

scenarioSchema.methods.canUserAccess = function(userId, permission = 'view') {
  // Owner can do everything
  if (this.owner.equals(userId)) return true;
  
  // Check collaborator permissions
  const collaborator = this.collaborators.find(collab => collab.user.equals(userId));
  if (collaborator && collaborator.permissions.includes(permission)) return true;
  
  // Check team access if visibility is team or project
  if (this.visibility === 'team' || this.visibility === 'project') {
    // This would need to be implemented with team membership check
    // For now, return false
    return false;
  }
  
  return false;
};

scenarioSchema.methods.incrementViewCount = function() {
  this.stats.viewCount += 1;
  return this.save();
};

scenarioSchema.methods.updateExecutionStats = function(success, executionTime) {
  this.executionCount += 1;
  this.lastExecuted = new Date();
  
  // Update success rate
  const currentSuccessRate = this.stats.successRate;
  const newSuccessRate = ((currentSuccessRate * (this.executionCount - 1)) + (success ? 1 : 0)) / this.executionCount;
  this.stats.successRate = Math.round(newSuccessRate * 100) / 100;
  
  // Update average execution time
  const currentAvgTime = this.stats.avgExecutionTime;
  const newAvgTime = ((currentAvgTime * (this.executionCount - 1)) + executionTime) / this.executionCount;
  this.stats.avgExecutionTime = Math.round(newAvgTime);
  
  return this.save();
};

export const Scenario = mongoose.model('Scenario', scenarioSchema);