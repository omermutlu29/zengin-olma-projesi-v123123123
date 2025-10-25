import axios from 'axios';
import { Execution } from '../models/Execution.js';
import { Scenario } from '../models/Scenario.js';

export class ExecutionEngine {
  constructor(fastify) {
    this.fastify = fastify;
    this.activeExecutions = new Map();
  }

  async executeScenario(execution, scenario) {
    try {
      this.activeExecutions.set(execution._id.toString(), execution);
      
      // Initialize node executions
      const nodeExecutions = scenario.nodes.map(node => ({
        nodeId: node.id,
        status: 'pending',
        request: {
          method: node.data.method,
          url: node.data.url,
          headers: node.data.headers,
          body: node.data.body
        },
        assertions: node.data.assertions || [],
        retries: 0,
        logs: []
      }));

      execution.nodeExecutions = nodeExecutions;
      execution.status = 'running';
      await execution.save();

      // Emit execution started event
      this.emitExecutionUpdate(execution, 'execution_started');

      // Execute nodes based on scenario settings
      if (scenario.settings.parallel) {
        await this.executeNodesParallel(execution, scenario);
      } else {
        await this.executeNodesSequential(execution, scenario);
      }

      // Finalize execution
      await this.finalizeExecution(execution);

    } catch (error) {
      this.fastify.log.error('Execution error:', error);
      await this.handleExecutionError(execution, error);
    } finally {
      this.activeExecutions.delete(execution._id.toString());
    }
  }

  async executeNodesSequential(execution, scenario) {
    const edges = scenario.edges;
    const nodeMap = new Map(scenario.nodes.map(node => [node.id, node]));
    
    // Find starting nodes (nodes with no incoming edges)
    const startingNodes = scenario.nodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );

    for (const startNode of startingNodes) {
      await this.executeNodePath(execution, startNode, edges, nodeMap);
    }
  }

  async executeNodesParallel(execution, scenario) {
    const nodePromises = scenario.nodes.map(node => 
      this.executeNode(execution, node)
    );

    await Promise.allSettled(nodePromises);
  }

  async executeNodePath(execution, node, edges, nodeMap) {
    await this.executeNode(execution, node);
    
    // Find next nodes
    const nextEdges = edges.filter(edge => edge.source === node.id);
    for (const edge of nextEdges) {
      const nextNode = nodeMap.get(edge.target);
      if (nextNode) {
        await this.executeNodePath(execution, nextNode, edges, nodeMap);
      }
    }
  }

  async executeNode(execution, node) {
    const nodeExecution = execution.nodeExecutions.find(ne => ne.nodeId === node.id);
    if (!nodeExecution) return;

    try {
      nodeExecution.status = 'running';
      nodeExecution.startTime = new Date();
      
      await execution.save();
      this.emitNodeUpdate(execution, nodeExecution, 'node_started');

      // Add log entry
      this.addNodeLog(nodeExecution, 'info', `Starting execution of node: ${node.data.label || node.id}`);

      // Execute HTTP request
      const response = await this.executeHttpRequest(node, execution.variables);
      
      nodeExecution.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.data,
        size: JSON.stringify(response.data).length
      };

      // Run assertions
      const assertionResults = await this.runAssertions(nodeExecution, response);
      nodeExecution.assertions = assertionResults;

      // Determine final status
      const failedAssertions = assertionResults.filter(a => !a.passed);
      nodeExecution.status = failedAssertions.length > 0 ? 'failed' : 'completed';

      nodeExecution.endTime = new Date();
      nodeExecution.duration = nodeExecution.endTime - nodeExecution.startTime;

      await execution.save();
      this.emitNodeUpdate(execution, nodeExecution, 'node_completed');

    } catch (error) {
      await this.handleNodeError(execution, nodeExecution, error);
    }
  }

  async executeHttpRequest(node, variables) {
    const config = {
      method: node.data.method || 'GET',
      url: this.interpolateVariables(node.data.url, variables),
      headers: this.interpolateObject(node.data.headers, variables),
      timeout: node.data.timeout || 30000,
      validateStatus: () => true // Don't throw on HTTP error status
    };

    if (node.data.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      config.data = this.interpolateVariables(node.data.body, variables);
    }

    this.fastify.log.info(`Executing request: ${config.method} ${config.url}`);
    return await axios(config);
  }

  async runAssertions(nodeExecution, response) {
    const assertions = nodeExecution.assertions;
    const results = [];

    for (const assertion of assertions) {
      try {
        const result = await this.evaluateAssertion(assertion, response);
        results.push({
          ...assertion,
          actual: result.actual,
          passed: result.passed,
          description: assertion.description
        });
      } catch (error) {
        results.push({
          ...assertion,
          actual: 'Error evaluating assertion',
          passed: false,
          description: assertion.description
        });
      }
    }

    return results;
  }

  async evaluateAssertion(assertion, response) {
    let actual;
    let passed = false;

    switch (assertion.type) {
      case 'status':
        actual = response.status.toString();
        passed = this.compareValues(actual, assertion.expected, assertion.operator);
        break;
      
      case 'body':
        const bodyValue = this.extractValueFromBody(response.data, assertion.field);
        actual = bodyValue;
        passed = this.compareValues(actual, assertion.expected, assertion.operator);
        break;
      
      case 'header':
        const headerValue = response.headers[assertion.field.toLowerCase()];
        actual = headerValue || '';
        passed = this.compareValues(actual, assertion.expected, assertion.operator);
        break;
    }

    return { actual, passed };
  }

  extractValueFromBody(body, field) {
    if (!field) return JSON.stringify(body);
    
    // Simple JSON path extraction (can be enhanced)
    const keys = field.split('.');
    let value = body;
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return '';
      }
    }
    
    return value ? value.toString() : '';
  }

  compareValues(actual, expected, operator) {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        return actual.includes(expected);
      case 'regex':
        return new RegExp(expected).test(actual);
      case 'greater':
        return parseFloat(actual) > parseFloat(expected);
      case 'less':
        return parseFloat(actual) < parseFloat(expected);
      default:
        return actual === expected;
    }
  }

  async handleNodeError(execution, nodeExecution, error) {
    nodeExecution.status = 'failed';
    nodeExecution.endTime = new Date();
    nodeExecution.duration = nodeExecution.endTime - nodeExecution.startTime;
    nodeExecution.error = {
      message: error.message,
      code: error.code,
      stack: error.stack
    };

    this.addNodeLog(nodeExecution, 'error', `Node execution failed: ${error.message}`);
    
    await execution.save();
    this.emitNodeUpdate(execution, nodeExecution, 'node_failed');
  }

  async handleExecutionError(execution, error) {
    execution.status = 'failed';
    execution.endTime = new Date();
    execution.error = {
      message: error.message,
      timestamp: new Date()
    };

    await execution.save();
    this.emitExecutionUpdate(execution, 'execution_failed');
  }

  async finalizeExecution(execution) {
    execution.status = 'completed';
    execution.endTime = new Date();
    
    // Update scenario status
    await Scenario.findByIdAndUpdate(execution.scenarioId, { status: 'ready' });
    
    await execution.save();
    this.emitExecutionUpdate(execution, 'execution_completed');
  }

  addNodeLog(nodeExecution, level, message, data = null) {
    nodeExecution.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
  }

  interpolateVariables(text, variables) {
    if (!text || typeof text !== 'string') return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables.get(key) || match;
    });
  }

  interpolateObject(obj, variables) {
    if (!obj) return obj;
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.interpolateVariables(value, variables);
    }
    return result;
  }

  emitExecutionUpdate(execution, event) {
    this.fastify.websocketServer.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'execution_update',
          executionId: execution._id,
          event,
          data: {
            status: execution.status,
            startTime: execution.startTime,
            endTime: execution.endTime,
            duration: execution.duration,
            summary: execution.summary
          }
        }));
      }
    });
  }

  emitNodeUpdate(execution, nodeExecution, event) {
    this.fastify.websocketServer.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'node_update',
          executionId: execution._id,
          nodeId: nodeExecution.nodeId,
          event,
          data: {
            status: nodeExecution.status,
            startTime: nodeExecution.startTime,
            endTime: nodeExecution.endTime,
            duration: nodeExecution.duration,
            assertions: nodeExecution.assertions,
            error: nodeExecution.error
          }
        }));
      }
    });
  }
}
