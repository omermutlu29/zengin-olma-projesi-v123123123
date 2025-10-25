export async function websocketHandler(connection, request) {
  const fastify = this;
  
  fastify.log.info('New WebSocket connection established');
  
  // Send welcome message
  connection.socket.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: new Date().toISOString(),
    message: 'WebSocket connection established'
  }));

  // Handle incoming messages
  connection.socket.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      await handleWebSocketMessage(connection, data, fastify);
    } catch (error) {
      fastify.log.error('WebSocket message error:', error);
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle connection close
  connection.socket.on('close', (code, reason) => {
    fastify.log.info(`WebSocket connection closed: ${code} - ${reason}`);
  });

  // Handle connection error
  connection.socket.on('error', (error) => {
    fastify.log.error('WebSocket error:', error);
  });
}

async function handleWebSocketMessage(connection, data, fastify) {
  const { type, payload } = data;

  switch (type) {
    case 'subscribe_execution':
      await handleSubscribeExecution(connection, payload, fastify);
      break;
    
    case 'subscribe_scenario':
      await handleSubscribeScenario(connection, payload, fastify);
      break;
    
    case 'ping':
      connection.socket.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;
    
    default:
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${type}`,
        timestamp: new Date().toISOString()
      }));
  }
}

async function handleSubscribeExecution(connection, payload, fastify) {
  const { executionId } = payload;
  
  if (!executionId) {
    connection.socket.send(JSON.stringify({
      type: 'error',
      message: 'executionId is required for execution subscription',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  try {
    // Verify execution exists
    const { Execution } = await import('../models/Execution.js');
    const execution = await Execution.findById(executionId);
    
    if (!execution) {
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Execution not found',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Store subscription info in connection
    connection.subscriptions = connection.subscriptions || new Set();
    connection.subscriptions.add(`execution:${executionId}`);

    connection.socket.send(JSON.stringify({
      type: 'subscription_confirmed',
      subscription: 'execution',
      executionId,
      timestamp: new Date().toISOString()
    }));

    fastify.log.info(`Client subscribed to execution: ${executionId}`);
  } catch (error) {
    fastify.log.error('Subscribe execution error:', error);
    connection.socket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to subscribe to execution',
      timestamp: new Date().toISOString()
    }));
  }
}

async function handleSubscribeScenario(connection, payload, fastify) {
  const { scenarioId } = payload;
  
  if (!scenarioId) {
    connection.socket.send(JSON.stringify({
      type: 'error',
      message: 'scenarioId is required for scenario subscription',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  try {
    // Verify scenario exists
    const { Scenario } = await import('../models/Scenario.js');
    const scenario = await Scenario.findById(scenarioId);
    
    if (!scenario) {
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Scenario not found',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Store subscription info in connection
    connection.subscriptions = connection.subscriptions || new Set();
    connection.subscriptions.add(`scenario:${scenarioId}`);

    connection.socket.send(JSON.stringify({
      type: 'subscription_confirmed',
      subscription: 'scenario',
      scenarioId,
      timestamp: new Date().toISOString()
    }));

    fastify.log.info(`Client subscribed to scenario: ${scenarioId}`);
  } catch (error) {
    fastify.log.error('Subscribe scenario error:', error);
    connection.socket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to subscribe to scenario',
      timestamp: new Date().toISOString()
    }));
  }
}

// Helper function to broadcast to specific subscribers
export function broadcastToSubscribers(fastify, subscription, data) {
  fastify.websocketServer.clients.forEach(client => {
    if (client.readyState === 1 && client.subscriptions && client.subscriptions.has(subscription)) {
      client.send(JSON.stringify(data));
    }
  });
}
