// models/Agreement.js
const mongoose = require('mongoose');

const AgreementSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Software Freelancing', 'Subscription Agreement', 'Rental Agreement']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  counterparty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  counterpartyAddress: {
    type: String,
    required: false
  },
  amount: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  terms: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['Created', 'Funded', 'Completed', 'Cancelled', 'Disputed'],
    default: 'Created'
  },
  txHash: {
    type: String,
    required: false
  },
  fundTxHash: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  fundedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Agreement', AgreementSchema);