const mongoose = require('mongoose');

const recoveryActionSchema = new mongoose.Schema(
  {
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      default: null
    },
    serverId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    action: {
      type: String,
      enum: [
        'none',
        'restart_service',
        'scale_up',
        'cleanup_disk',
        'throttle_traffic',
        'failover'
      ],
      required: true
    },
    success: {
      type: Boolean,
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    executedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    durationMs: {
      type: Number,
      default: 0
    }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        if (ret._id) ret._id = ret._id.toString();
        if (ret.alertId) ret.alertId = ret.alertId.toString();
        if (ret.executedAt instanceof Date) ret.executedAt = ret.executedAt.toISOString();
        return ret;
      }
    }
  }
);

const RecoveryAction = mongoose.model('RecoveryAction', recoveryActionSchema);

module.exports = RecoveryAction;

