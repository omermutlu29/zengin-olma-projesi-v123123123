import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic info
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  // Authentication
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    }
  },
  authProvider: {
    type: String,
    enum: ['local', 'oauth2', 'ldap'],
    default: 'local'
  },
  authProviderId: {
    type: String, // OAuth2 provider ID or LDAP DN
    sparse: true
  },
  // Profile
  avatar: String,
  phone: String,
  department: String,
  position: String,
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  // Email preferences
  emailPreferences: {
    notifications: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
    security: { type: Boolean, default: true }
  },
  // Security
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // Global roles (system-wide)
  globalRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  // Teams (populated)
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  // Statistics
  stats: {
    scenarioCount: { type: Number, default: 0 },
    executionCount: { type: Number, default: 0 },
    lastActivity: Date
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ authProvider: 1, authProviderId: 1 });
userSchema.index({ status: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Update last activity
  this.stats.lastActivity = new Date();
  
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

userSchema.methods.hasGlobalRole = function(roleId) {
  return this.globalRoles.some(role => role.equals(roleId));
};

userSchema.methods.hasTeamRole = function(teamId, roleId) {
  // This would need to be populated with teams and their roles
  return false; // TODO: Implement team role checking
};

userSchema.methods.getPermissions = async function() {
  // Get all permissions from global roles
  const Role = mongoose.model('Role');
  const roles = await Role.find({ _id: { $in: this.globalRoles } });
  
  const permissions = new Set();
  roles.forEach(role => {
    role.permissions.forEach(permission => {
      permissions.add(permission);
    });
  });
  
  return Array.from(permissions);
};

export const User = mongoose.model('User', userSchema);
