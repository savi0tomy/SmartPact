const express = require('express');
const router = express.Router();
const { 
  createAgreement, 
  getAgreement, 
  updateAgreementStatus ,
  getAgreementsByUser
} = require('../controllers/agreementController');

// Create a new agreement
router.post('/create', createAgreement);
router.get('/user/:id',getAgreementsByUser);
// Get an existing agreement
router.get('/:id', getAgreement);


// Update agreement status
router.patch('/:id/status', updateAgreementStatus);

module.exports = router;