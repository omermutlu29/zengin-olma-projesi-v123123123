import { Scenario } from '../models/Scenario.js';
import { User } from '../models/User.js';

export async function scenarioRoutes(fastify, options) {
  // Get all scenarios
  fastify.get('/', async (request, reply) => {
    try {
      const { page = 1, limit = 10, status, search, searchType = 'name', tags, sortBy = 'createdAt', sortOrder = 'desc' } = request.query;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (status) filter.status = status;
      if (search) {
        switch (searchType) {
          case 'name':
            filter.$or = [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ];
            break;
          case 'url':
            filter['nodes.data.url'] = { $regex: search, $options: 'i' };
            break;
          case 'node':
            filter['nodes.data.label'] = { $regex: search, $options: 'i' };
            break;
          default:
            filter.$or = [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ];
        }
      }
      if (tags) {
        filter.tags = { $in: tags.split(',') };
      }

      // Sort options
      const sortOptions = {};
      switch (sortBy) {
        case 'name':
          sortOptions.name = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'status':
          sortOptions.status = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'project':
          sortOptions['project.name'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'nodes':
          sortOptions['nodes'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'owner':
          sortOptions['owner.firstName'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'createdAt':
        default:
          sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
          break;
      }

      const scenarios = await Scenario.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('owner', 'firstName lastName email')
        .populate('project', 'name')
        .populate('lockInfo.lockedBy', 'firstName lastName')
        .populate('executions', 'status startTime endTime duration');

      const total = await Scenario.countDocuments(filter);

      return {
        scenarios,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch scenarios' });
    }
  });

  // Get scenario by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const scenario = await Scenario.findById(request.params.id)
        .populate('executions', 'status startTime endTime duration summary');
      
      if (!scenario) {
        return reply.status(404).send({ error: 'Scenario not found' });
      }

      return scenario;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch scenario' });
    }
  });

  // Create new scenario
  fastify.post('/', async (request, reply) => {
    try {
      const scenarioData = {
        ...request.body,
        createdBy: request.headers['x-user-id'] || 'anonymous'
      };

      const scenario = new Scenario(scenarioData);
      await scenario.save();

      return reply.status(201).send(scenario);
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to create scenario' });
    }
  });

  // Update scenario
  fastify.put('/:id', async (request, reply) => {
    try {
      const scenario = await Scenario.findByIdAndUpdate(
        request.params.id,
        { 
          ...request.body,
          version: { $inc: 1 }
        },
        { new: true, runValidators: true }
      );

      if (!scenario) {
        return reply.status(404).send({ error: 'Scenario not found' });
      }

      return scenario;
    } catch (error) {
      fastify.log.error(error);
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.status(500).send({ error: 'Failed to update scenario' });
    }
  });

  // Delete scenario
  fastify.delete('/:id', async (request, reply) => {
    try {
      const scenario = await Scenario.findByIdAndDelete(request.params.id);
      
      if (!scenario) {
        return reply.status(404).send({ error: 'Scenario not found' });
      }

      return { message: 'Scenario deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete scenario' });
    }
  });

  // Duplicate scenario
  fastify.post('/:id/duplicate', async (request, reply) => {
    try {
      const originalScenario = await Scenario.findById(request.params.id);
      
      if (!originalScenario) {
        return reply.status(404).send({ error: 'Scenario not found' });
      }

      const duplicatedScenario = new Scenario({
        ...originalScenario.toObject(),
        _id: undefined,
        name: `${originalScenario.name} (Copy)`,
        status: 'draft',
        version: 1,
        executionCount: 0,
        lastExecuted: undefined
      });

      await duplicatedScenario.save();

      return reply.status(201).send(duplicatedScenario);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to duplicate scenario' });
    }
  });

  // Get scenario execution history
  fastify.get('/:id/executions', async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;

      const executions = await fastify.mongo.db.collection('executions')
        .find({ scenarioId: request.params.id })
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await fastify.mongo.db.collection('executions')
        .countDocuments({ scenarioId: request.params.id });

      return {
        executions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch executions' });
    }
  });

  // Get locked scenarios
  fastify.get('/locks', async (request, reply) => {
    try {
      const scenarios = await Scenario.find({ 
        'lockInfo.locked': true 
      }).select('_id lockInfo');
      
      const lockedScenarios = scenarios.map(s => ({
        scenarioId: s._id,
        lockedBy: s.lockInfo.lockedBy,
        lockedAt: s.lockInfo.lockedAt
      }));

      return { lockedScenarios };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch lock status' });
    }
  });

  // Lock scenario
  fastify.post('/:id/lock', async (request, reply) => {
    try {
      const scenarioId = request.params.id;
      const userId = request.user.id;

      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        return reply.status(404).send({ error: 'Scenario not found' });
      }

      // Check if already locked by someone else
      if (scenario.lockInfo?.locked && scenario.lockInfo.lockedBy !== userId) {
        return reply.status(409).send({ 
          error: 'Scenario is already locked by another user',
          lockedBy: scenario.lockInfo.lockedBy
        });
      }

      // Lock the scenario
      scenario.lockInfo = {
        locked: true,
        lockedBy: userId,
        lockedAt: new Date()
      };

      await scenario.save();

      return { 
        success: true, 
        message: 'Scenario locked successfully',
        lockInfo: scenario.lockInfo
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to lock scenario' });
    }
  });

  // Unlock scenario
  fastify.post('/:id/unlock', async (request, reply) => {
    try {
      const scenarioId = request.params.id;
      const userId = request.user.id;

      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        return reply.status(404).send({ error: 'Scenario not found' });
      }

      // Check if locked by current user
      if (!scenario.lockInfo?.locked || scenario.lockInfo.lockedBy !== userId) {
        return reply.status(403).send({ 
          error: 'You can only unlock scenarios that you have locked'
        });
      }

      // Unlock the scenario
      scenario.lockInfo = {
        locked: false,
        lockedBy: null,
        lockedAt: null
      };

      await scenario.save();

      return { 
        success: true, 
        message: 'Scenario unlocked successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to unlock scenario' });
    }
  });
}
