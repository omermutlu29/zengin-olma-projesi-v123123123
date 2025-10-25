import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { authenticateToken } from '../middleware/auth.js';

export async function authRoutes(fastify, options) {
  // Register user
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password, firstName, lastName, department, position } = request.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return reply.status(400).send({ 
          error: 'User already exists with this email or username' 
        });
      }

      // Create user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        department,
        position,
        authProvider: 'local'
      });

      await user.save();

      // Assign default role (viewer)
      const viewerRole = await Role.findOne({ name: 'viewer' });
      if (viewerRole) {
        user.globalRoles.push(viewerRole._id);
        await user.save();
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return reply.status(201).send({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName
        }
      });
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body;

      // Find user
      const user = await User.findOne({ email }).populate('globalRoles teams');
      
      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Check if account is locked
      if (user.isLocked) {
        return reply.status(423).send({ 
          error: 'Account is locked due to too many failed login attempts' 
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        // Increment login attempts
        await user.incLoginAttempts();
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return reply.send({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          roles: user.globalRoles.map(role => role.name),
          teams: user.teams.map(team => ({
            id: team._id,
            name: team.name
          }))
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // Get current user profile
  fastify.get('/profile', { preHandler: authenticateToken }, async (request, reply) => {
    try {
      const user = await User.findById(request.user._id)
        .populate('globalRoles teams')
        .select('-password -passwordResetToken -passwordResetExpires');

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          phone: user.phone,
          department: user.department,
          position: user.position,
          status: user.status,
          roles: user.globalRoles.map(role => ({
            id: role._id,
            name: role.name,
            displayName: role.displayName
          })),
          teams: user.teams.map(team => ({
            id: team._id,
            name: team.name,
            description: team.description
          })),
          emailPreferences: user.emailPreferences,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get profile' });
    }
  });

  // Update user profile
  fastify.put('/profile', { preHandler: authenticateToken }, async (request, reply) => {
    try {
      const { firstName, lastName, phone, department, position, emailPreferences } = request.body;
      
      const user = await User.findById(request.user._id);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Update allowed fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (department !== undefined) user.department = department;
      if (position !== undefined) user.position = position;
      if (emailPreferences) user.emailPreferences = { ...user.emailPreferences, ...emailPreferences };

      await user.save();

      return reply.send({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          phone: user.phone,
          department: user.department,
          position: user.position,
          emailPreferences: user.emailPreferences
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });

  // Change password
  fastify.post('/change-password', { preHandler: authenticateToken }, async (request, reply) => {
    try {
      const { currentPassword, newPassword } = request.body;

      const user = await User.findById(request.user._id);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return reply.status(400).send({ error: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return reply.send({ message: 'Password changed successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to change password' });
    }
  });

  // Logout (client-side token removal)
  fastify.post('/logout', { preHandler: authenticateToken }, async (request, reply) => {
    return reply.send({ message: 'Logged out successfully' });
  });

  // Refresh token
  fastify.post('/refresh', { preHandler: authenticateToken }, async (request, reply) => {
    try {
      const user = await User.findById(request.user._id);
      if (!user || user.status !== 'active') {
        return reply.status(401).send({ error: 'Invalid user' });
      }

      // Generate new token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return reply.send({
        message: 'Token refreshed successfully',
        token
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to refresh token' });
    }
  });

  // Verify token
  fastify.get('/verify', { preHandler: authenticateToken }, async (request, reply) => {
    return reply.send({
      message: 'Token is valid',
      user: {
        id: request.user._id,
        username: request.user.username,
        email: request.user.email,
        fullName: request.user.fullName
      }
    });
  });
}
