import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scenarioRoutes } from './routes/scenarios.js';
import { executionRoutes } from './routes/execution.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { websocketHandler } from './websocket/handler.js';

// Load environment variables
dotenv.config({ path: './env.local' });

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Register plugins
await fastify.register(cors, {
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGIN?.split(",") || [];

    if (!origin) return callback(null, true);
    if (allowed.length === 0 || allowed.includes("*")) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);

    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
});

await fastify.register(websocket);

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scenario_execution');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });
await fastify.register(scenarioRoutes, { prefix: '/api/scenarios' });
await fastify.register(executionRoutes, { prefix: '/api/execution' });

// WebSocket handler
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, websocketHandler);
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Start server
const start = async () => {
  try {
    await connectDB();
    
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📡 WebSocket available at ws://${host}:${port}/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await fastify.close();
  await mongoose.connection.close();
  process.exit(0);
});

start();
