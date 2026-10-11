const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    success: true,
    data: {
      status: 'ok',
      service: 'backend'
    }
  });
});

module.exports = router;

