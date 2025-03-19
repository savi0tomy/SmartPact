const mongoose = require('mongoose');
const crypto = require('crypto');

const AgreementSchema = new mongoose.Schema({
  templateType: {
    type: String,
    enum: ['software-freelancing', 'rental', 'subscription'],
    required: true
  },
  agreementData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  user1id: {
    type: String, 
    required: true
  },
  user2id: {
    type: String, 
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'terminated'],
    default: 'draft'
  },
});

module.exports = mongoose.model('Agreement', AgreementSchema);