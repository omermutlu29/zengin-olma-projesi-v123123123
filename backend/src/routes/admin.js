import { Project } from '../models/Project.js';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { Scenario } from '../models/Scenario.js';
import { authenticateToken, requirePermission, requireAdmin } from '../middleware/auth.js';

export async function adminRoutes(fastify, options) {
  // ==================== PROJECTS ====================
  
  // Get all projects
  fastify.get('/projects', { 
    preHandler: [authenticateToken, requirePermission(['project.view', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 10, status, search } = request.query;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const projects = await Project.find(filter)
        .populate('owner', 'username email firstName lastName')
        .populate('teams', 'name description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Project.countDocuments(filter);

      return reply.send({
        projects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch projects' });
    }
  });

  // Get project by ID
  fastify.get('/projects/:id', { 
    preHandler: [authenticateToken, requirePermission(['project.view', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const project = await Project.findById(request.params.id)
        .populate('owner', 'username email firstName lastName')
        .populate('teams', 'name description')
        .populate('teams.members.user', 'username email firstName lastName');
      
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      return reply.send(project);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch project' });
    }
  });

  // Create project
  fastify.post('/projects', { 
    preHandler: [authenticateToken, requirePermission(['project.create', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const projectData = {
        ...request.body,
        owner: request.user._id
      };

      const project = new Project(projectData);
      await project.save();

      await project.populate('owner', 'username email firstName lastName');
      await project.populate('teams', 'name description');

      return reply.status(201).send(project);
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to create project' });
    }
  });

  // Update project
  fastify.put('/projects/:id', { 
    preHandler: [authenticateToken, requirePermission(['project.edit', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const project = await Project.findByIdAndUpdate(
        request.params.id,
        request.body,
        { new: true, runValidators: true }
      )
      .populate('owner', 'username email firstName lastName')
      .populate('teams', 'name description');

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      return reply.send(project);
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to update project' });
    }
  });

  // Delete project
  fastify.delete('/projects/:id', { 
    preHandler: [authenticateToken, requirePermission(['project.delete', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const project = await Project.findByIdAndDelete(request.params.id);
      
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Also delete all scenarios in this project
      await Scenario.deleteMany({ project: request.params.id });

      return reply.send({ message: 'Project deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete project' });
    }
  });

  // ==================== TEAMS ====================
  
  // Get all teams
  fastify.get('/teams', { 
    preHandler: [authenticateToken, requirePermission(['team.view', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 10, search } = request.query;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const teams = await Team.find(filter)
        .populate('owner', 'username email firstName lastName')
        .populate('members.user', 'username email firstName lastName')
        .populate('members.roles', 'name displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Team.countDocuments(filter);

      return reply.send({
        teams,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch teams' });
    }
  });

  // Get team by ID
  fastify.get('/teams/:id', { 
    preHandler: [authenticateToken, requirePermission(['team.view', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const team = await Team.findById(request.params.id)
        .populate('owner', 'username email firstName lastName')
        .populate('members.user', 'username email firstName lastName')
        .populate('members.roles', 'name displayName');
      
      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      return reply.send(team);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch team' });
    }
  });

  // Create team
  fastify.post('/teams', { 
    preHandler: [authenticateToken, requirePermission(['team.create', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const teamData = {
        ...request.body,
        owner: request.user._id
      };

      const team = new Team(teamData);
      await team.save();

      await team.populate('owner', 'username email firstName lastName');

      return reply.status(201).send(team);
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to create team' });
    }
  });

  // Update team
  fastify.put('/teams/:id', { 
    preHandler: [authenticateToken, requirePermission(['team.edit', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const team = await Team.findByIdAndUpdate(
        request.params.id,
        request.body,
        { new: true, runValidators: true }
      )
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName')
      .populate('members.roles', 'name displayName');

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      return reply.send(team);
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to update team' });
    }
  });

  // Delete team
  fastify.delete('/teams/:id', { 
    preHandler: [authenticateToken, requirePermission(['team.delete', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const team = await Team.findByIdAndDelete(request.params.id);
      
      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      return reply.send({ message: 'Team deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete team' });
    }
  });

  // Add member to team
  fastify.post('/teams/:id/members', { 
    preHandler: [authenticateToken, requirePermission(['team.member.add', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const { userId, roles } = request.body;
      
      const team = await Team.findById(request.params.id);
      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      await team.addMember(userId, roles);
      await team.populate('members.user', 'username email firstName lastName');
      await team.populate('members.roles', 'name displayName');

      return reply.send(team);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to add member to team' });
    }
  });

  // Remove member from team
  fastify.delete('/teams/:id/members/:userId', { 
    preHandler: [authenticateToken, requirePermission(['team.member.remove', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const team = await Team.findById(request.params.id);
      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      await team.removeMember(request.params.userId);
      await team.populate('members.user', 'username email firstName lastName');
      await team.populate('members.roles', 'name displayName');

      return reply.send(team);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove member from team' });
    }
  });

  // ==================== USERS ====================
  
  // Get all users
  fastify.get('/users', { 
    preHandler: [authenticateToken, requirePermission(['system.user.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 10, status, search } = request.query;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(filter)
        .populate('globalRoles', 'name displayName')
        .populate('teams', 'name description')
        .select('-password -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(filter);

      return reply.send({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch users' });
    }
  });

  // Get user by ID
  fastify.get('/users/:id', { 
    preHandler: [authenticateToken, requirePermission(['system.user.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const user = await User.findById(request.params.id)
        .populate('globalRoles', 'name displayName')
        .populate('teams', 'name description')
        .select('-password -passwordResetToken -passwordResetExpires');
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send(user);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch user' });
    }
  });

  // Update user
  fastify.put('/users/:id', { 
    preHandler: [authenticateToken, requirePermission(['system.user.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const user = await User.findByIdAndUpdate(
        request.params.id,
        request.body,
        { new: true, runValidators: true }
      )
      .populate('globalRoles', 'name displayName')
      .populate('teams', 'name description')
      .select('-password -passwordResetToken -passwordResetExpires');

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send(user);
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to update user' });
    }
  });

  // Delete user
  fastify.delete('/users/:id', { 
    preHandler: [authenticateToken, requirePermission(['system.user.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const user = await User.findByIdAndDelete(request.params.id);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ message: 'User deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete user' });
    }
  });

  // ==================== ROLES ====================
  
  // Get all roles
  fastify.get('/roles', { 
    preHandler: [authenticateToken, requirePermission(['system.role.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const roles = await Role.find({ active: true })
        .populate('createdBy', 'username email firstName lastName')
        .sort({ level: -1, name: 1 });

      return reply.send(roles);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch roles' });
    }
  });

  // Get role by ID
  fastify.get('/roles/:id', { 
    preHandler: [authenticateToken, requirePermission(['system.role.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const role = await Role.findById(request.params.id)
        .populate('createdBy', 'username email firstName lastName');
      
      if (!role) {
        return reply.status(404).send({ error: 'Role not found' });
      }

      return reply.send(role);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch role' });
    }
  });

  // Create role
  fastify.post('/roles', { 
    preHandler: [authenticateToken, requirePermission(['system.role.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const roleData = {
        ...request.body,
        createdBy: request.user._id
      };

      const role = new Role(roleData);
      await role.save();

      await role.populate('createdBy', 'username email firstName lastName');

      return reply.status(201).send(role);
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to create role' });
    }
  });

  // Update role
  fastify.put('/roles/:id', { 
    preHandler: [authenticateToken, requirePermission(['system.role.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const role = await Role.findByIdAndUpdate(
        request.params.id,
        request.body,
        { new: true, runValidators: true }
      )
      .populate('createdBy', 'username email firstName lastName');

      if (!role) {
        return reply.status(404).send({ error: 'Role not found' });
      }

      return reply.send(role);
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to update role' });
    }
  });

  // Delete role
  fastify.delete('/roles/:id', { 
    preHandler: [authenticateToken, requirePermission(['system.role.manage', 'system.admin'])] 
  }, async (request, reply) => {
    try {
      const role = await Role.findByIdAndDelete(request.params.id);
      
      if (!role) {
        return reply.status(404).send({ error: 'Role not found' });
      }

      return reply.send({ message: 'Role deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete role' });
    }
  });

  // ==================== DASHBOARD ====================
  
  // Get dashboard statistics
  fastify.get('/dashboard', { 
    preHandler: [authenticateToken] 
  }, async (request, reply) => {
    try {
      const [
        totalProjects,
        totalTeams,
        totalUsers,
        totalScenarios,
        recentProjects,
        recentScenarios,
        activeUsers
      ] = await Promise.all([
        Project.countDocuments(),
        Team.countDocuments(),
        User.countDocuments(),
        Scenario.countDocuments(),
        Project.find().populate('owner', 'username email').sort({ createdAt: -1 }).limit(5),
        Scenario.find().populate('owner project', 'username email name').sort({ createdAt: -1 }).limit(5),
        User.find({ status: 'active' }).countDocuments()
      ]);

      return reply.send({
        stats: {
          totalProjects,
          totalTeams,
          totalUsers,
          totalScenarios,
          activeUsers
        },
        recent: {
          projects: recentProjects,
          scenarios: recentScenarios
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch dashboard data' });
    }
  });
}
