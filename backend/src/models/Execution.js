import mongoose from 'mongoose';

const nodeExecutionSchema = new mongoose.Schema({
  nodeId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
    default: 'pending'
  },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number }, // milliseconds
  request: {
    method: { type: String },
    url: { type: String },
    headers: { type: Map, of: String },
    body: { type: mongoose.Schema.Types.Mixed }
  },
  response: {
    status: { type: Number },
    statusText: { type: String },
    headers: { type: Map, of: String },
    body: { type: mongoose.Schema.Types.Mixed },
    size: { type: Number }
  },
  assertions: [{
    type: { type: String },
    field: { type: String },
    operator: { type: String },
    expected: { type: String },
    actual: { type: String },
    passed: { type: Boolean },
    description: { type: String }
  }],
  error: {
    message: { type: String },
    code: { type: String },
    stack: { type: String }
  },
  retries: { type: Number, default: 0 },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'] },
    message: { type: String },
    data: { type: mongoose.Schema.Types.Mixed }
  }]
}, { _id: false });

const executionSchema = new mongoose.Schema({
  scenarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Scenario', 
    required: true 
  },
  scenarioName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'pending'
  },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  duration: { type: Number }, // milliseconds
  nodeExecutions: [nodeExecutionSchema],
  variables: {
    type: Map,
    of: String,
    default: new Map()
  },
  settings: {
    timeout: { type: Number },
    parallel: { type: Boolean },
    retryOnFailure: { type: Boolean },
    maxRetries: { type: Number }
  },
  summary: {
    totalNodes: { type: Number },
    completedNodes: { type: Number },
    failedNodes: { type: Number },
    skippedNodes: { type: Number },
    totalAssertions: { type: Number },
    passedAssertions: { type: Number },
    failedAssertions: { type: Number }
  },
  error: {
    message: { type: String },
    nodeId: { type: String },
    timestamp: { type: Date }
  },
  triggeredBy: { type: String }, // user, api, jenkins, etc.
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
executionSchema.index({ scenarioId: 1 });
executionSchema.index({ status: 1 });
executionSchema.index({ startTime: -1 });
executionSchema.index({ triggeredBy: 1 });

// Pre-save middleware to calculate summary
executionSchema.pre('save', function(next) {
  if (this.nodeExecutions && this.nodeExecutions.length > 0) {
    const summary = {
      totalNodes: this.nodeExecutions.length,
      completedNodes: this.nodeExecutions.filter(n => n.status === 'completed').length,
      failedNodes: this.nodeExecutions.filter(n => n.status === 'failed').length,
      skippedNodes: this.nodeExecutions.filter(n => n.status === 'skipped').length,
      totalAssertions: 0,
      passedAssertions: 0,
      failedAssertions: 0
    };

    this.nodeExecutions.forEach(node => {
      if (node.assertions) {
        summary.totalAssertions += node.assertions.length;
        summary.passedAssertions += node.assertions.filter(a => a.passed).length;
        summary.failedAssertions += node.assertions.filter(a => !a.passed).length;
      }
    });

    this.summary = summary;
  }

  // Calculate duration
  if (this.endTime && this.startTime) {
    this.duration = this.endTime - this.startTime;
  }

  next();
});

export const Execution = mongoose.model('Execution', executionSchema);
