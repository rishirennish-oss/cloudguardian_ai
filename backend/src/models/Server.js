const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema(
  {
    serverId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'down'],
      default: 'healthy'
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    failureProbability: {
      type: Number,
      default: 0
    },
    latestMetrics: {
      type: Object,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        if (ret.lastUpdated instanceof Date) {
          ret.lastUpdated = ret.lastUpdated.toISOString();
        }
        return ret;
      }
    }
  }
);

const Server = mongoose.model('Server', serverSchema);

module.exports = Server;

