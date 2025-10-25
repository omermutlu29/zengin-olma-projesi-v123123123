import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Role type: system, project, team
  type: {
    type: String,
    enum: ['system', 'project', 'team'],
    default: 'system'
  },
  // Permissions array
  permissions: [{
    type: String,
    enum: [
      // System permissions
      'system.admin',
      'system.user.manage',
      'system.team.manage',
      'system.project.manage',
      'system.role.manage',
      
      // Project permissions
      'project.create',
      'project.view',
      'project.edit',
      'project.delete',
      'project.manage',
      
      // Scenario permissions
      'scenario.create',
      'scenario.view',
      'scenario.edit',
      'scenario.delete',
      'scenario.execute',
      'scenario.manage',
      
      // Team permissions
      'team.create',
      'team.view',
      'team.edit',
      'team.delete',
      'team.manage',
      'team.member.add',
      'team.member.remove',
      'team.member.role.assign',
      
      // Execution permissions
      'execution.view',
      'execution.execute',
      'execution.stop',
      'execution.manage',
      
      // Analytics permissions
      'analytics.view',
      'analytics.export',
      
      // Notification permissions
      'notification.send',
      'notification.manage'
    ]
  }],
  // Role hierarchy (higher number = more permissions)
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  // Whether this role can be assigned to users
  assignable: {
    type: Boolean,
    default: true
  },
  // Whether this role is active
  active: {
    type: Boolean,
    default: true
  },
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
roleSchema.index({ name: 1 });
roleSchema.index({ type: 1 });
roleSchema.index({ level: 1 });
roleSchema.index({ active: 1 });

// Virtual for permission count
roleSchema.virtual('permissionCount').get(function() {
  return this.permissions.length;
});

// Static methods
roleSchema.statics.getSystemRoles = function() {
  return this.find({ type: 'system', active: true });
};

roleSchema.statics.getProjectRoles = function() {
  return this.find({ type: 'project', active: true });
};

roleSchema.statics.getTeamRoles = function() {
  return this.find({ type: 'team', active: true });
};

roleSchema.statics.getRoleByLevel = function(level) {
  return this.find({ level: { $lte: level }, active: true });
};

// Instance methods
roleSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

roleSchema.methods.addPermission = function(permission) {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
  return this.save();
};

roleSchema.methods.removePermission = function(permission) {
  this.permissions = this.permissions.filter(p => p !== permission);
  return this.save();
};

roleSchema.methods.canAssignTo = function(userId) {
  // Check if user has permission to assign this role
  // This would need to be implemented based on business logic
  return this.assignable && this.active;
};

// Pre-save middleware
roleSchema.pre('save', function(next) {
  // Ensure permissions are unique
  this.permissions = [...new Set(this.permissions)];
  next();
});

export const Role = mongoose.model('Role', roleSchema);
