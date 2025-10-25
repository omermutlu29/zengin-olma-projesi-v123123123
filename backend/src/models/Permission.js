import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
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
  // Permission category
  category: {
    type: String,
    enum: ['system', 'project', 'scenario', 'team', 'execution', 'analytics', 'notification'],
    required: true
  },
  // Permission level (1-10, higher = more critical)
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  // Whether this permission is active
  active: {
    type: Boolean,
    default: true
  },
  // Dependencies (other permissions required)
  dependencies: [{
    type: String,
    ref: 'Permission'
  }],
  // Resource type this permission applies to
  resourceType: {
    type: String,
    enum: ['system', 'project', 'scenario', 'team', 'user', 'execution', 'analytics'],
    required: true
  },
  // Action this permission allows
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'execute', 'manage', 'view', 'edit', 'assign'],
    required: true
  }
}, {
  timestamps: true
});

// Indexes
permissionSchema.index({ name: 1 });
permissionSchema.index({ category: 1 });
permissionSchema.index({ level: 1 });
permissionSchema.index({ active: 1 });
permissionSchema.index({ resourceType: 1, action: 1 });

// Virtual for full permission string
permissionSchema.virtual('fullName').get(function() {
  return `${this.resourceType}.${this.action}`;
});

// Static methods
permissionSchema.statics.getByCategory = function(category) {
  return this.find({ category, active: true });
};

permissionSchema.statics.getByLevel = function(level) {
  return this.find({ level: { $lte: level }, active: true });
};

permissionSchema.statics.getByResourceType = function(resourceType) {
  return this.find({ resourceType, active: true });
};

permissionSchema.statics.getSystemPermissions = function() {
  return this.find({ category: 'system', active: true });
};

permissionSchema.statics.getProjectPermissions = function() {
  return this.find({ category: 'project', active: true });
};

permissionSchema.statics.getScenarioPermissions = function() {
  return this.find({ category: 'scenario', active: true });
};

permissionSchema.statics.getTeamPermissions = function() {
  return this.find({ category: 'team', active: true });
};

// Instance methods
permissionSchema.methods.hasDependency = function(permissionName) {
  return this.dependencies.includes(permissionName);
};

permissionSchema.methods.addDependency = function(permissionName) {
  if (!this.dependencies.includes(permissionName)) {
    this.dependencies.push(permissionName);
  }
  return this.save();
};

permissionSchema.methods.removeDependency = function(permissionName) {
  this.dependencies = this.dependencies.filter(dep => dep !== permissionName);
  return this.save();
};

permissionSchema.methods.canBeGrantedBy = function(userPermissions) {
  // Check if user has all required dependencies
  return this.dependencies.every(dep => userPermissions.includes(dep));
};

// Pre-save middleware
permissionSchema.pre('save', function(next) {
  // Ensure dependencies are unique
  this.dependencies = [...new Set(this.dependencies)];
  next();
});

export const Permission = mongoose.model('Permission', permissionSchema);
