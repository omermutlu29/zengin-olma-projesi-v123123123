import { Scenario } from '../models/Scenario.js';
import { Execution } from '../models/Execution.js';
import { ExecutionEngine } from '../services/ExecutionEngine.js';

export async function executionRoutes(fastify, options) {
  // Start scenario execution
  fastify.post('/start/:scenarioId', async (request, reply) => {
    try {
      const { scenarioId } = request.params;
      const { variables = {}, settings = {} } = request.body;

      fastify.log.info(`Execution request for scenario: ${scenarioId}`);
      fastify.log.info(`Request body:`, { variables, settings });

      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        fastify.log.error(`Scenario not found: ${scenarioId}`);
        return reply.status(404).send({ error: 'Scenario not found' });
      }

      fastify.log.info(`Found scenario: ${scenario.name}`);

      if (scenario.status === 'running') {
        return reply.status(400).send({ error: 'Scenario is already running' });
      }

      // Create execution record
      const execution = new Execution({
        scenarioId: scenario._id,
        scenarioName: scenario.name,
        variables: new Map(Object.entries(variables)),
        settings: { ...scenario.settings, ...settings },
        triggeredBy: request.headers['x-user-id'] || 'api'
      });

      await execution.save();

      // Ensure required fields are present
      if (!scenario.owner) {
        scenario.owner = request.user?._id || request.headers['x-user-id'];
      }
      if (!scenario.project) {
        // Create a default project or use existing one
        const { Project } = await import('../models/Project.js');
        const defaultProject = await Project.findOne({ name: 'Default Project' });
        if (!defaultProject) {
          const newProject = new Project({
            name: 'Default Project',
            description: 'Default project for scenarios',
            owner: scenario.owner
          });
          await newProject.save();
          scenario.project = newProject._id;
        } else {
          scenario.project = defaultProject._id;
        }
      }

      // Update scenario status
      scenario.status = 'running';
      scenario.lastExecuted = new Date();
      scenario.executionCount += 1;
      await scenario.save();

      // Start execution in background
      const executionEngine = new ExecutionEngine(fastify);
      executionEngine.executeScenario(execution, scenario);

      return reply.status(202).send({
        executionId: execution._id,
        message: 'Execution started',
        status: 'running'
      });
    } catch (error) {
      fastify.log.error('Execution error details:', error);
      fastify.log.error('Error message:', error.message);
      fastify.log.error('Error stack:', error.stack);
      fastify.log.error('Error name:', error.name);
      if (error.errors) {
        fastify.log.error('Validation errors:', error.errors);
      }
      return reply.status(500).send({ 
        error: 'Failed to start execution',
        details: error.message,
        stack: error.stack
      });
    }
  });

  // Get execution status
  fastify.get('/:executionId', async (request, reply) => {
    try {
      const execution = await Execution.findById(request.params.executionId)
        .populate('scenarioId', 'name description');
      
      if (!execution) {
        return reply.status(404).send({ error: 'Execution not found' });
      }

      return execution;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch execution' });
    }
  });

  // Get execution results
  fastify.get('/:executionId/results', async (request, reply) => {
    try {
      const execution = await Execution.findById(request.params.executionId);
      
      if (!execution) {
        return reply.status(404).send({ error: 'Execution not found' });
      }

      const results = {
        executionId: execution._id,
        scenarioName: execution.scenarioName,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.duration,
        summary: execution.summary,
        nodeResults: execution.nodeExecutions.map(node => ({
          nodeId: node.nodeId,
          status: node.status,
          duration: node.duration,
          request: node.request,
          response: node.response,
          assertions: node.assertions,
          error: node.error,
          logs: node.logs
        }))
      };

      return results;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch execution results' });
    }
  });

  // Cancel execution
  fastify.post('/:executionId/cancel', async (request, reply) => {
    try {
      const execution = await Execution.findById(request.params.executionId);
      
      if (!execution) {
        return reply.status(404).send({ error: 'Execution not found' });
      }

      if (execution.status !== 'running') {
        return reply.status(400).send({ error: 'Execution is not running' });
      }

      execution.status = 'cancelled';
      execution.endTime = new Date();
      await execution.save();

      // Update scenario status
      await Scenario.findByIdAndUpdate(execution.scenarioId, { status: 'ready' });

      return { message: 'Execution cancelled successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to cancel execution' });
    }
  });

  // Get all executions
  fastify.get('/', async (request, reply) => {
    try {
      const { page = 1, limit = 10, status, scenarioId } = request.query;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (status) filter.status = status;
      if (scenarioId) filter.scenarioId = scenarioId;

      const executions = await Execution.find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('scenarioId', 'name description');

      const total = await Execution.countDocuments(filter);

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

  // Get execution logs
  fastify.get('/:executionId/logs', async (request, reply) => {
    try {
      const { nodeId, level } = request.query;
      const execution = await Execution.findById(request.params.executionId);
      
      if (!execution) {
        return reply.status(404).send({ error: 'Execution not found' });
      }

      let logs = [];
      execution.nodeExecutions.forEach(node => {
        if (nodeId && node.nodeId !== nodeId) return;
        
        node.logs.forEach(log => {
          if (level && log.level !== level) return;
          logs.push({
            nodeId: node.nodeId,
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            data: log.data
          });
        });
      });

      logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      return { logs };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch logs' });
    }
  });
}
