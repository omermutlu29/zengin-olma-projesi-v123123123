import { Scenario } from '../models/Scenario.js';

export async function scenarioRoutes(fastify, options) {
  // Get all scenarios
  fastify.get('/', async (request, reply) => {
    try {
      const { page = 1, limit = 10, status, search, tags } = request.query;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      if (tags) {
        filter.tags = { $in: tags.split(',') };
      }

      const scenarios = await Scenario.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
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
}
