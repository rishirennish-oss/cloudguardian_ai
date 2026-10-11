const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema(
  {
    serverId: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    cpuUsage: {
      type: Number,
      required: true
    },
    memoryUsage: {
      type: Number,
      required: true
    },
    diskUsage: {
      type: Number,
      required: true
    },
    networkIn: {
      type: Number,
      required: true
    },
    networkOut: {
      type: Number,
      required: true
    },
    responseTimeMs: {
      type: Number,
      required: true
    },
    errorRate: {
      type: Number,
      required: true
    },
    requestsPerSec: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'down'],
      default: 'healthy'
    }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        if (ret.timestamp instanceof Date) {
          ret.timestamp = ret.timestamp.toISOString();
        }
        return ret;
      }
    }
  }
);

// Indexes per contract: compound {serverId:1, timestamp:-1} and TTL (24h = 86400s) on timestamp
metricSchema.index({ serverId: 1, timestamp: -1 });
metricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

const Metric = mongoose.model('Metric', metricSchema);

module.exports = Metric;

