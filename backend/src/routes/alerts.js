const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const { ok, fail } = require('../utils/response');

// GET /api/alerts?status=open -> data [ALERT...] newest first (status optional)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const alerts = await Alert.find(filter).sort({ createdAt: -1 });
    return ok(res, alerts);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// PATCH /api/alerts/:id/resolve -> data ALERT
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return fail(res, 'Invalid alert ID', 400);
    }

    const alert = await Alert.findById(id);
    if (!alert) {
      return fail(res, 'Alert not found', 404);
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    await alert.save();

    return ok(res, alert);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;

