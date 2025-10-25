import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  data: {
    label: { type: String },
    method: { type: String },
    url: { type: String },
    headers: { type: Map, of: String },
    body: { type: mongoose.Schema.Types.Mixed },
    assertions: [{
      type: { type: String, enum: ['status', 'body', 'header'] },
      field: { type: String },
      operator: { type: String, enum: ['equals', 'contains', 'regex', 'greater', 'less'] },
      expected: { type: String },
      description: { type: String }
    }],
    timeout: { type: Number, default: 30000 },
    retries: { type: Number, default: 0 }
  }
}, { _id: false });

const edgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  sourceHandle: { type: String },
  targetHandle: { type: String },
  type: { type: String, default: 'default' }
}, { _id: false });

const scenarioSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String,
    maxlength: 500
  },
  nodes: [nodeSchema],
  edges: [edgeSchema],
  variables: {
    type: Map,
    of: String,
    default: new Map()
  },
  settings: {
    timeout: { type: Number, default: 300000 }, // 5 minutes default
    parallel: { type: Boolean, default: false },
    retryOnFailure: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 }
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'running', 'completed', 'failed', 'paused'],
    default: 'draft'
  },
  createdBy: { type: String },
  tags: [String],
  version: { type: Number, default: 1 },
  lastExecuted: { type: Date },
  executionCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
scenarioSchema.index({ name: 1 });
scenarioSchema.index({ status: 1 });
scenarioSchema.index({ createdBy: 1 });
scenarioSchema.index({ tags: 1 });
scenarioSchema.index({ createdAt: -1 });

// Virtual for execution history
scenarioSchema.virtual('executions', {
  ref: 'Execution',
  localField: '_id',
  foreignField: 'scenarioId'
});

export const Scenario = mongoose.model('Scenario', scenarioSchema);
