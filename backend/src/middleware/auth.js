import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';

// JWT Authentication Middleware
export const authenticateToken = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return reply.status(401).send({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).populate('globalRoles teams');
    
    if (!user || user.status !== 'active') {
      return reply.status(401).send({ error: 'Invalid or inactive user' });
    }

    request.user = user;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return reply.status(401).send({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return reply.status(401).send({ error: 'Token expired' });
    }
    return reply.status(500).send({ error: 'Authentication error' });
  }
};

// Role-based Authorization Middleware
export const requireRole = (requiredRoles) => {
  return async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const userRoles = request.user.globalRoles.map(role => role.name);
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return reply.status(403).send({ 
          error: 'Insufficient permissions',
          required: requiredRoles,
          current: userRoles
        });
      }
    } catch (error) {
      return reply.status(500).send({ error: 'Authorization error' });
    }
  };
};

// Permission-based Authorization Middleware
export const requirePermission = (requiredPermissions) => {
  return async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      // Get user permissions from roles
      const userPermissions = await request.user.getPermissions();
      const hasRequiredPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasRequiredPermission) {
        return reply.status(403).send({ 
          error: 'Insufficient permissions',
          required: requiredPermissions,
          current: userPermissions
        });
      }
    } catch (error) {
      return reply.status(500).send({ error: 'Permission check error' });
    }
  };
};

// Project Access Control
export const requireProjectAccess = (permission = 'view') => {
  return async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const projectId = request.params.projectId || request.body.projectId;
      if (!projectId) {
        return reply.status(400).send({ error: 'Project ID required' });
      }

      // Check if user has access to the project
      const hasAccess = await checkProjectAccess(request.user, projectId, permission);
      
      if (!hasAccess) {
        return reply.status(403).send({ 
          error: 'No access to this project',
          projectId,
          permission
        });
      }
    } catch (error) {
      return reply.status(500).send({ error: 'Project access check error' });
    }
  };
};

// Scenario Access Control
export const requireScenarioAccess = (permission = 'view') => {
  return async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const scenarioId = request.params.scenarioId || request.body.scenarioId;
      if (!scenarioId) {
        return reply.status(400).send({ error: 'Scenario ID required' });
      }

      // Check if user has access to the scenario
      const hasAccess = await checkScenarioAccess(request.user, scenarioId, permission);
      
      if (!hasAccess) {
        return reply.status(403).send({ 
          error: 'No access to this scenario',
          scenarioId,
          permission
        });
      }
    } catch (error) {
      return reply.status(500).send({ error: 'Scenario access check error' });
    }
  };
};

// Helper function to check project access
async function checkProjectAccess(user, projectId, permission) {
  try {
    const { Project } = await import('../models/Project.js');
    const project = await Project.findById(projectId).populate('teams');
    
    if (!project) return false;

    // Check if user is project owner
    if (project.owner.equals(user._id)) return true;

    // Check if user is in any of the project teams
    const userTeamIds = user.teams.map(team => team._id.toString());
    const projectTeamIds = project.teams.map(team => team._id.toString());
    const hasTeamAccess = userTeamIds.some(teamId => projectTeamIds.includes(teamId));

    if (hasTeamAccess) {
      // Check if user has required permission in any of the teams
      const userPermissions = await user.getPermissions();
      return userPermissions.includes(`project.${permission}`) || 
             userPermissions.includes('system.admin');
    }

    return false;
  } catch (error) {
    console.error('Project access check error:', error);
    return false;
  }
}

// Helper function to check scenario access
async function checkScenarioAccess(user, scenarioId, permission) {
  try {
    const { Scenario } = await import('../models/Scenario.js');
    const scenario = await Scenario.findById(scenarioId).populate('project team');
    
    if (!scenario) return false;

    // Check if user is scenario owner
    if (scenario.owner.equals(user._id)) return true;

    // Check if user is collaborator
    if (scenario.hasCollaborator(user._id)) {
      const collaboratorPermissions = scenario.getCollaboratorPermissions(user._id);
      return collaboratorPermissions.includes(permission);
    }

    // Check project access
    const hasProjectAccess = await checkProjectAccess(user, scenario.project._id, permission);
    if (hasProjectAccess) return true;

    // Check team access
    if (scenario.team && user.teams.some(team => team._id.equals(scenario.team._id))) {
      const userPermissions = await user.getPermissions();
      return userPermissions.includes(`scenario.${permission}`) || 
             userPermissions.includes('system.admin');
    }

    return false;
  } catch (error) {
    console.error('Scenario access check error:', error);
    return false;
  }
}

// Admin only middleware
export const requireAdmin = requireRole(['admin', 'super-admin']);

// System admin only middleware
export const requireSuperAdmin = requireRole(['super-admin']);
