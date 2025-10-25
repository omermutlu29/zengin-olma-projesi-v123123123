import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
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
  // Team members with their roles
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Team settings
  settings: {
    allowSelfJoin: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
    maxMembers: { type: Number, default: 50 }
  },
  // Team owner/admin
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Statistics
  stats: {
    memberCount: { type: Number, default: 0 },
    projectCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
teamSchema.index({ name: 1 });
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Methods
teamSchema.methods.addMember = function(userId, roles = []) {
  const existingMember = this.members.find(member => member.user.equals(userId));
  
  if (existingMember) {
    existingMember.isActive = true;
    existingMember.roles = [...new Set([...existingMember.roles, ...roles])];
  } else {
    this.members.push({
      user: userId,
      roles: roles,
      joinedAt: new Date(),
      isActive: true
    });
  }
  
  this.stats.memberCount = this.members.filter(m => m.isActive).length;
  return this.save();
};

teamSchema.methods.removeMember = function(userId) {
  const member = this.members.find(member => member.user.equals(userId));
  if (member) {
    member.isActive = false;
    this.stats.memberCount = this.members.filter(m => m.isActive).length;
  }
  return this.save();
};

teamSchema.methods.updateMemberRoles = function(userId, roles) {
  const member = this.members.find(member => member.user.equals(userId));
  if (member) {
    member.roles = roles;
  }
  return this.save();
};

teamSchema.methods.hasMember = function(userId) {
  return this.members.some(member => 
    member.user.equals(userId) && member.isActive
  );
};

teamSchema.methods.getMemberRoles = function(userId) {
  const member = this.members.find(member => 
    member.user.equals(userId) && member.isActive
  );
  return member ? member.roles : [];
};

export const Team = mongoose.model('Team', teamSchema);
