const express = require('express');
const router = express.Router();
const { 
  createAgreement, 
  getAgreement, 
  updateAgreementStatus 
} = require('../controllers/agreementController');

// Create a new agreement
router.post('/create', createAgreement);

// Get an existing agreement
router.get('/:id', getAgreement);

// Update agreement status
router.patch('/:id/status', updateAgreementStatus);

module.exports = router;