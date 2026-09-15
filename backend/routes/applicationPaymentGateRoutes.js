const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const gate = require('../controllers/applicationPaymentGateController');

router.post('/:id/submit-payment', authMiddleware, gate.submitAndCharge);
router.post('/:id/generate-pdf', authMiddleware, gate.generatePaidPdf);

module.exports = router;
