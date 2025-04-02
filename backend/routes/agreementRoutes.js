const express = require('express');
const router = express.Router();
const { Web3 } = require('web3');
const User = require('../models/User');
const Agreement = require('../models/Agreement');
const { decrypt } = require('../utils/encryption');
const { 
  freelancerContractABI, 
  freelancerContractAddress,
  rentalContractABI,
  rentalContractAddress,
  subscriptionContractABI,
  subscriptionContractAddress
} = require('../contracts');
const { getUserWallet } = require('../utils/wallet');

// Create Agreement
router.post('/create', async (req, res) => {
    try {
        const { 
            title, 
            type,
            terms, 
            counterpartyid,
            amount, 
            startDate, 
            dueDate,
            // Common optional fields
            deliverables,
            milestones,
            propertyAddress,
            securityDeposit,
            subscriptionDetails,
            billingInterval
        } = req.body;
        
        // Validate counterparty
        const counterparty = await User.findById(counterpartyid);
        if (!counterparty) {
            return res.status(400).json({ 
                success: false, 
                message: 'Counterparty not found' 
            });
        }
        
        const counterpartyAddress = decrypt(counterparty.walletAddress);
        
        if (!counterpartyAddress || !amount || !dueDate || !startDate || !title) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Type-specific validation
        if (type === 'Software Freelancing' && (!deliverables || !milestones)) {
            return res.status(400).json({
                success: false,
                message: 'Deliverables and milestones are required for freelancing agreements'
            });
        }
        
        if (type === 'Rental Agreement' && (!securityDeposit || !propertyAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Security deposit and property address are required for rental agreements'
            });
        }
        
        if (type === 'Subscription Agreement' && (!billingInterval || !subscriptionDetails)) {
            return res.status(400).json({
                success: false,
                message: 'Billing interval and subscription details are required for subscription agreements'
            });
        }
        
        // Get authenticated wallet
        const { web3, address, signTransaction } = await getUserWallet(req);
        
        // Select the appropriate contract based on agreement type
        let contractABI, contractAddress, txData, txReceipt;
        const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
        const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
        const deadlineTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
        
        // Create contract instance and prepare transaction based on type
        switch(type) {
            case 'Software Freelancing':
                contractABI = freelancerContractABI;
                contractAddress = freelancerContractAddress;
                
                const freelancerContract = new web3.eth.Contract(contractABI, contractAddress);
                txData = {
                    from: address,
                    to: contractAddress,
                    data: freelancerContract.methods.createAgreement(
                        counterpartyAddress,
                        amountInWei,
                        deadlineTimestamp
                    ).encodeABI(),
                    gas: await freelancerContract.methods.createAgreement(
                        counterpartyAddress,
                        amountInWei,
                        deadlineTimestamp
                    ).estimateGas({ from: address })
                };
                break;
                
            case 'Rental Agreement':
                contractABI = rentalContractABI;
                contractAddress = rentalContractAddress;
                
                const securityDepositInWei = web3.utils.toWei(securityDeposit.toString(), 'ether');
                const rentalContract = new web3.eth.Contract(contractABI, contractAddress);
                txData = {
                    from: address,
                    to: contractAddress,
                    data: rentalContract.methods.createAgreement(
                        counterpartyAddress,
                        amountInWei,
                        securityDepositInWei,
                        startTimestamp,
                        deadlineTimestamp
                    ).encodeABI(),
                    gas: await rentalContract.methods.createAgreement(
                        counterpartyAddress,
                        amountInWei,
                        securityDepositInWei,
                        startTimestamp,
                        deadlineTimestamp
                    ).estimateGas({ from: address })
                };
                break;
                
            case 'Subscription Agreement':
                contractABI = subscriptionContractABI;
                contractAddress = subscriptionContractAddress;
                
                const subscriptionContract = new web3.eth.Contract(contractABI, contractAddress);
                txData = {
                    from: address,
                    to: contractAddress,
                    data: subscriptionContract.methods.createSubscription(
                        counterpartyAddress,
                        amountInWei,
                        billingInterval,
                        startTimestamp
                    ).encodeABI(),
                    gas: await subscriptionContract.methods.createSubscription(
                        counterpartyAddress,
                        amountInWei,
                        billingInterval,
                        startTimestamp
                    ).estimateGas({ from: address })
                };
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid agreement type'
                });
        }

        // Sign and send transaction via Web3Auth
        txReceipt = await signTransaction(txData);
        
        // Extract agreement ID from events
        let agreementId = null;
        
        if (txReceipt.events) {
            if (type === 'Software Freelancing' && txReceipt.events.AgreementCreated) {
                agreementId = txReceipt.events.AgreementCreated.returnValues.agreementId;
            } else if (type === 'Rental Agreement' && txReceipt.events.AgreementCreated) {
                agreementId = txReceipt.events.AgreementCreated.returnValues.agreementId;
            } else if (type === 'Subscription Agreement' && txReceipt.events.SubscriptionCreated) {
                agreementId = txReceipt.events.SubscriptionCreated.returnValues.subscriptionId;
            }
        }
        
        // Create agreement object with all fields
        const agreementData = {
            blockchainId: agreementId,
            title,
            type,
            creator: req.user.userId,
            counterparty: counterpartyid,
            counterpartyAddress,
            amount,
            startDate: new Date(startDate),
            dueDate: new Date(dueDate),
            terms,
            status: "Created",
            txHash: txReceipt.transactionHash,
            // Type-specific fields
            ...(type === 'Software Freelancing' && {
                deliverables,
                milestones
            }),
            ...(type === 'Rental Agreement' && {
                propertyAddress,
                securityDeposit
            }),
            ...(type === 'Subscription Agreement' && {
                subscriptionDetails,
                billingInterval,
                nextBillingDate: new Date(startDate),
                totalPaid: "0"
            })
        };

        // Save to database
        const newAgreement = new Agreement(agreementData);
        await newAgreement.save();

        res.status(201).json({
            success: true,
            id: newAgreement._id,
            agreementId,
            txHash: txReceipt.transactionHash
        });

    } catch (error) {
        console.error('Agreement creation error:', error);
        const status = error.message.includes('expired') ? 401 : 500;
        res.status(status).json({
            success: false,
            message: error.message.includes('expired') 
                ? 'Session expired. Please login again.'
                : 'Agreement creation failed'
        });
    }
});

// Fund Agreement
router.post('/:agreementId/fund', async (req, res) => {
    try {
        const { agreementId } = req.params;
        
        // Get authenticated wallet
        const { web3, address, signTransaction } = await getUserWallet(req);
        const contract = new web3.eth.Contract(contractABI, contractAddress);

        // Get agreement details
        const blockchainAgreement = await contract.methods.agreements(agreementId).call();
        const amountInWei = blockchainAgreement.amount;

        // Prepare funding transaction
        const txData = {
            from: address,
            to: contractAddress,
            value: amountInWei,
            data: contract.methods.fundAgreement(agreementId).encodeABI(),
            gas: await contract.methods.fundAgreement(agreementId).estimateGas({ from: address })
        };

        // Sign and send transaction
        const txReceipt = await signTransaction(txData);

        // Update database
        await Agreement.updateOne(
            { blockchainId: agreementId },
            { 
                status: "Funded",
                fundedAt: new Date(),
                fundTxHash: txReceipt.transactionHash
            }
        );

        res.json({
            success: true,
            txHash: txReceipt.transactionHash
        });

    } catch (error) {
        console.error('Funding error:', error);
        const status = error.message.includes('expired') ? 401 : 500;
        res.status(status).json({
            success: false,
            message: error.message.includes('expired')
                ? 'Session expired. Please login again.'
                : 'Funding failed'
        });
    }
});

// Get Agreements (unchanged)
router.get('/user/:id', async (req, res) => {
  try {
      const agreements = await Agreement.find({ 
          $or: [
              { creator: req.params.id },
              { counterparty: req.params.id }
          ]
      }).populate('creator counterparty', 'email');
      res.json({ success: true, agreements });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch agreements' });
  }
});

// Get Single Agreement (unchanged)
router.get('/:id', async (req, res) => {
  try {
      const agreement = await Agreement.findById(req.params.id)
          .populate('creator counterparty', 'name email');
          
      if (!agreement) {
          return res.status(404).json({ success: false, message: 'Agreement not found' });
      }
      
      res.json({ success: true, agreement });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch agreement' });
  }
});

module.exports = router;