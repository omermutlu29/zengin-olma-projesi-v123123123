import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Team } from '../models/Team.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scenario_execution');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedPermissions = async () => {
  console.log('Seeding permissions...');
  
  const permissions = [
    // System permissions
    { name: 'system.admin', displayName: 'System Administrator', category: 'system', level: 10, resourceType: 'system', action: 'manage' },
    { name: 'system.user.manage', displayName: 'Manage Users', category: 'system', level: 8, resourceType: 'user', action: 'manage' },
    { name: 'system.team.manage', displayName: 'Manage Teams', category: 'system', level: 8, resourceType: 'team', action: 'manage' },
    { name: 'system.project.manage', displayName: 'Manage Projects', category: 'system', level: 8, resourceType: 'project', action: 'manage' },
    { name: 'system.role.manage', displayName: 'Manage Roles', category: 'system', level: 9, resourceType: 'system', action: 'manage' },
    
    // Project permissions
    { name: 'project.create', displayName: 'Create Projects', category: 'project', level: 5, resourceType: 'project', action: 'create' },
    { name: 'project.view', displayName: 'View Projects', category: 'project', level: 3, resourceType: 'project', action: 'read' },
    { name: 'project.edit', displayName: 'Edit Projects', category: 'project', level: 6, resourceType: 'project', action: 'update' },
    { name: 'project.delete', displayName: 'Delete Projects', category: 'project', level: 8, resourceType: 'project', action: 'delete' },
    { name: 'project.manage', displayName: 'Manage Projects', category: 'project', level: 7, resourceType: 'project', action: 'manage' },
    
    // Scenario permissions
    { name: 'scenario.create', displayName: 'Create Scenarios', category: 'scenario', level: 4, resourceType: 'scenario', action: 'create' },
    { name: 'scenario.view', displayName: 'View Scenarios', category: 'scenario', level: 2, resourceType: 'scenario', action: 'read' },
    { name: 'scenario.edit', displayName: 'Edit Scenarios', category: 'scenario', level: 5, resourceType: 'scenario', action: 'update' },
    { name: 'scenario.delete', displayName: 'Delete Scenarios', category: 'scenario', level: 7, resourceType: 'scenario', action: 'delete' },
    { name: 'scenario.execute', displayName: 'Execute Scenarios', category: 'scenario', level: 4, resourceType: 'scenario', action: 'execute' },
    { name: 'scenario.manage', displayName: 'Manage Scenarios', category: 'scenario', level: 6, resourceType: 'scenario', action: 'manage' },
    
    // Team permissions
    { name: 'team.create', displayName: 'Create Teams', category: 'team', level: 5, resourceType: 'team', action: 'create' },
    { name: 'team.view', displayName: 'View Teams', category: 'team', level: 3, resourceType: 'team', action: 'read' },
    { name: 'team.edit', displayName: 'Edit Teams', category: 'team', level: 6, resourceType: 'team', action: 'update' },
    { name: 'team.delete', displayName: 'Delete Teams', category: 'team', level: 8, resourceType: 'team', action: 'delete' },
    { name: 'team.manage', displayName: 'Manage Teams', category: 'team', level: 7, resourceType: 'team', action: 'manage' },
    { name: 'team.member.add', displayName: 'Add Team Members', category: 'team', level: 5, resourceType: 'team', action: 'assign' },
    { name: 'team.member.remove', displayName: 'Remove Team Members', category: 'team', level: 6, resourceType: 'team', action: 'assign' },
    { name: 'team.member.role.assign', displayName: 'Assign Team Roles', category: 'team', level: 6, resourceType: 'team', action: 'assign' },
    
    // Execution permissions
    { name: 'execution.view', displayName: 'View Executions', category: 'execution', level: 3, resourceType: 'execution', action: 'read' },
    { name: 'execution.execute', displayName: 'Execute Scenarios', category: 'execution', level: 4, resourceType: 'execution', action: 'execute' },
    { name: 'execution.stop', displayName: 'Stop Executions', category: 'execution', level: 5, resourceType: 'execution', action: 'execute' },
    { name: 'execution.manage', displayName: 'Manage Executions', category: 'execution', level: 6, resourceType: 'execution', action: 'manage' },
    
    // Analytics permissions
    { name: 'analytics.view', displayName: 'View Analytics', category: 'analytics', level: 4, resourceType: 'analytics', action: 'read' },
    { name: 'analytics.export', displayName: 'Export Analytics', category: 'analytics', level: 5, resourceType: 'analytics', action: 'read' },
    
    // Notification permissions
    { name: 'notification.send', displayName: 'Send Notifications', category: 'notification', level: 4, resourceType: 'notification', action: 'create' },
    { name: 'notification.manage', displayName: 'Manage Notifications', category: 'notification', level: 6, resourceType: 'notification', action: 'manage' }
  ];

  for (const permissionData of permissions) {
    await Permission.findOneAndUpdate(
      { name: permissionData.name },
      permissionData,
      { upsert: true, new: true }
    );
  }

  console.log('Permissions seeded successfully');
};

const seedRoles = async () => {
  console.log('Seeding roles...');
  
  const roles = [
    {
      name: 'super-admin',
      displayName: 'Super Administrator',
      description: 'Full system access with all permissions',
      type: 'system',
      level: 10,
      permissions: [
        'system.admin',
        'system.user.manage',
        'system.team.manage',
        'system.project.manage',
        'system.role.manage',
        'project.create',
        'project.view',
        'project.edit',
        'project.delete',
        'project.manage',
        'scenario.create',
        'scenario.view',
        'scenario.edit',
        'scenario.delete',
        'scenario.execute',
        'scenario.manage',
        'team.create',
        'team.view',
        'team.edit',
        'team.delete',
        'team.manage',
        'team.member.add',
        'team.member.remove',
        'team.member.role.assign',
        'execution.view',
        'execution.execute',
        'execution.stop',
        'execution.manage',
        'analytics.view',
        'analytics.export',
        'notification.send',
        'notification.manage'
      ],
      assignable: false
    },
    {
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administrator with most permissions',
      type: 'system',
      level: 8,
      permissions: [
        'system.user.manage',
        'system.team.manage',
        'system.project.manage',
        'project.create',
        'project.view',
        'project.edit',
        'project.delete',
        'project.manage',
        'scenario.create',
        'scenario.view',
        'scenario.edit',
        'scenario.delete',
        'scenario.execute',
        'scenario.manage',
        'team.create',
        'team.view',
        'team.edit',
        'team.delete',
        'team.manage',
        'team.member.add',
        'team.member.remove',
        'team.member.role.assign',
        'execution.view',
        'execution.execute',
        'execution.stop',
        'execution.manage',
        'analytics.view',
        'analytics.export',
        'notification.send',
        'notification.manage'
      ],
      assignable: true
    },
    {
      name: 'project-manager',
      displayName: 'Project Manager',
      description: 'Can manage projects and scenarios',
      type: 'project',
      level: 6,
      permissions: [
        'project.create',
        'project.view',
        'project.edit',
        'project.manage',
        'scenario.create',
        'scenario.view',
        'scenario.edit',
        'scenario.execute',
        'scenario.manage',
        'team.view',
        'team.member.add',
        'team.member.remove',
        'execution.view',
        'execution.execute',
        'execution.stop',
        'analytics.view',
        'notification.send'
      ],
      assignable: true
    },
    {
      name: 'analyst',
      displayName: 'Analyst',
      description: 'Can create and execute scenarios',
      type: 'project',
      level: 4,
      permissions: [
        'project.view',
        'scenario.create',
        'scenario.view',
        'scenario.edit',
        'scenario.execute',
        'execution.view',
        'execution.execute',
        'analytics.view'
      ],
      assignable: true
    },
    {
      name: 'developer',
      displayName: 'Developer',
      description: 'Can create and edit scenarios',
      type: 'project',
      level: 4,
      permissions: [
        'project.view',
        'scenario.create',
        'scenario.view',
        'scenario.edit',
        'scenario.execute',
        'execution.view',
        'execution.execute',
        'analytics.view'
      ],
      assignable: true
    },
    {
      name: 'viewer',
      displayName: 'Viewer',
      description: 'Can only view scenarios and executions',
      type: 'project',
      level: 2,
      permissions: [
        'project.view',
        'scenario.view',
        'execution.view',
        'analytics.view'
      ],
      assignable: true
    }
  ];

  for (const roleData of roles) {
    await Role.findOneAndUpdate(
      { name: roleData.name },
      roleData,
      { upsert: true, new: true }
    );
  }

  console.log('Roles seeded successfully');
};

const seedDefaultData = async () => {
  console.log('Seeding default data...');
  
  // Create super admin user
  const superAdminRole = await Role.findOne({ name: 'super-admin' });
  const adminRole = await Role.findOne({ name: 'admin' });
  
  // Delete existing admin user first
  await User.deleteOne({ email: 'admin@example.com' });
  
  const superAdmin = new User({
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Super',
    lastName: 'Admin',
    department: 'IT',
    position: 'System Administrator',
    status: 'active',
    globalRoles: [superAdminRole._id],
    authProvider: 'local'
  });
  
  await superAdmin.save();

  // Create demo project
  const demoProject = await Project.findOneAndUpdate(
    { name: 'Demo Project' },
    {
      name: 'Demo Project',
      description: 'A demo project for testing scenarios',
      status: 'active',
      owner: superAdmin._id,
      jenkinsConfig: {
        enabled: false
      },
      emailConfig: {
        notifications: {
          onFailure: true,
          onSuccess: false,
          onExecution: false
        }
      }
    },
    { upsert: true, new: true }
  );

  // Create demo team
  const analystRole = await Role.findOne({ name: 'analyst' });
  const developerRole = await Role.findOne({ name: 'developer' });
  
  const demoTeam = await Team.findOneAndUpdate(
    { name: 'Demo Team' },
    {
      name: 'Demo Team',
      description: 'A demo team for testing',
      owner: superAdmin._id,
      settings: {
        allowSelfJoin: true,
        requireApproval: false,
        maxMembers: 10
      }
    },
    { upsert: true, new: true }
  );

  // Add super admin to demo team
  await demoTeam.addMember(superAdmin._id, [analystRole._id, developerRole._id]);
  
  // Add demo team to demo project
  await demoProject.addTeam(demoTeam._id);

  console.log('Default data seeded successfully');
  console.log('Super Admin User:');
  console.log('  Email: admin@example.com');
  console.log('  Password: admin123');
  console.log('  Role: Super Administrator');
};

const seed = async () => {
  try {
    await connectDB();
    
    await seedPermissions();
    await seedRoles();
    await seedDefaultData();
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export { seed };
