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
  encryptionKey: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'terminated'],
    default: 'draft'
  }
});

// Method to generate a unique encryption key
AgreementSchema.methods.generateEncryptionKey = function() {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('Agreement', AgreementSchema);