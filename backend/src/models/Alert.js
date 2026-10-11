const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    serverId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    failureType: {
      type: String,
      enum: [
        'none',
        'cpu_overload',
        'memory_leak',
        'disk_full',
        'network_congestion',
        'service_crash'
      ],
      default: 'none'
    },
    failureProbability: {
      type: Number,
      default: 0
    },
    anomalyScore: {
      type: Number,
      default: 0
    },
    explanation: {
      type: String,
      default: ''
    },
    recommendedActions: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['open', 'recovering', 'resolved'],
      default: 'open',
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        if (ret._id) ret._id = ret._id.toString();
        if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
        if (ret.resolvedAt instanceof Date) ret.resolvedAt = ret.resolvedAt.toISOString();
        return ret;
      }
    }
  }
);

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;

