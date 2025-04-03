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
        
        // Create contract instance based on type
        let contract, method, methodParams;
        let agreementId = null;
        const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
        const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
        const deadlineTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
        
        // Prepare transaction based on type
        switch(type) {
            case 'Software Freelancing':
                contract = new web3.eth.Contract(freelancerContractABI, freelancerContractAddress);
                method = 'createAgreement';
                methodParams = [
                    counterpartyAddress,
                    amountInWei,
                    deadlineTimestamp
                ];
                break;
                
            case 'Rental Agreement':
                contract = new web3.eth.Contract(rentalContractABI, rentalContractAddress);
                method = 'createAgreement';
                const securityDepositInWei = web3.utils.toWei(securityDeposit.toString(), 'ether');
                methodParams = [
                    counterpartyAddress,
                    amountInWei,
                    securityDepositInWei,
                    startTimestamp,
                    deadlineTimestamp
                ];
                break;
                
            case 'Subscription Agreement':
                contract = new web3.eth.Contract(subscriptionContractABI, subscriptionContractAddress);
                method = 'createSubscription';
                methodParams = [
                    counterpartyAddress,
                    amountInWei,
                    billingInterval,
                    startTimestamp
                ];
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid agreement type'
                });
        }

        // Call the contract method directly to get the return value
        try {
            const estimatedId = await contract.methods[method](...methodParams).call({ from: address });
            // Convert BigInt to string to avoid serialization issues
            agreementId = estimatedId.toString();
            console.log(`Estimated agreement ID: ${agreementId}`);
        } catch (error) {
            console.warn('Failed to estimate agreement ID:', error);
            // Continue anyway since we'll get the real ID after the transaction
        }

        // Prepare transaction data
        const txData = {
            from: address,
            to: contract.options.address,
            data: contract.methods[method](...methodParams).encodeABI(),
            gas: await contract.methods[method](...methodParams).estimateGas({ from: address })
        };

        // Sign and send transaction
        const txReceipt = await signTransaction(txData);

        // Try to extract the agreement ID from the transaction receipt if we don't have it yet
        if (!agreementId) {
            // If no return value, try to extract from events
            if (txReceipt.logs && txReceipt.logs.length > 0) {
                for (const log of txReceipt.logs) {
                    if (log.address.toLowerCase() === contract.options.address.toLowerCase()) {
                        try {
                            let eventName, idField;
                            
                            if (type === 'Subscription Agreement') {
                                eventName = 'SubscriptionCreated';
                                idField = 'subscriptionId';
                            } else {
                                eventName = 'AgreementCreated';
                                idField = 'agreementId';
                            }
                            
                            const eventAbi = contract._jsonInterface.find(
                                intf => intf.name === eventName && intf.type === 'event'
                            );
                            
                            if (eventAbi) {
                                const decodedLog = web3.eth.abi.decodeLog(
                                    eventAbi.inputs,
                                    log.data,
                                    log.topics.slice(1)
                                );
                                
                                if (decodedLog && decodedLog[idField] !== undefined) {
                                    // Convert to string to prevent BigInt serialization issues
                                    agreementId = decodedLog[idField].toString();
                                    break;
                                }
                            }
                        } catch (error) {
                            console.warn('Failed to decode log:', error);
                        }
                    }
                }
            }
            
            // If still no ID, query the contract for the latest agreement
            if (!agreementId) {
                try {
                    if (type === 'Subscription Agreement') {
                        const count = await contract.methods.subscriptionCount().call();
                        // Convert to string and subtract 1
                        agreementId = (parseInt(count.toString()) - 1).toString();
                    } else {
                        const count = await contract.methods.agreementCount().call();
                        // Convert to string and subtract 1
                        agreementId = (parseInt(count.toString()) - 1).toString();
                    }
                } catch (error) {
                    console.warn('Failed to get agreement count:', error);
                    // If all else fails, use a placeholder and log the issue
                    agreementId = "unknown";
                    console.error("Unable to determine blockchain ID for this agreement");
                }
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
            blockchainId: agreementId,
            txHash: txReceipt.transactionHash
        });

    } catch (error) {
        console.error('Agreement creation error:', error);
        const status = error.message.includes('expired') ? 401 : 500;
        res.status(status).json({
            success: false,
            message: error.message.includes('expired') 
                ? 'Session expired. Please login again.'
                : 'Agreement creation failed: ' + error.message
        });
    }
});

// Fund/Activate Agreement (Updated method names and status)
router.post('/:agreementId/fund', async (req, res) => {
    try {
        const { agreementId } = req.params;
        
        // Find the agreement in the database first to determine type
        const agreement = await Agreement.findById(agreementId);
        if (!agreement) {
            return res.status(404).json({
                success: false,
                message: 'Agreement not found'
            });
        }

        if (agreement.status !== "Accepted") {
            return res.status(400).json({
                success: false,
                message: 'Agreement must be accepted before funding'
            });
        }

        if (!agreement.creator.equals(req.user.userId)) {
            return res.status(403).json({
                success: false,
                message: 'Only the agreement creator can fund this agreement'
            });
        }

        // Get authenticated wallet
        const { web3, address, signTransaction } = await getUserWallet(req);
        
        // Select appropriate contract based on agreement type
        let contractABI, contractAddress, methodName;
        
        switch(agreement.type) {
            case 'Software Freelancing':
                contractABI = freelancerContractABI;
                contractAddress = freelancerContractAddress;
                methodName = 'fundAgreement'; // Keep original method name for freelancing
                break;
            case 'Rental Agreement':
                contractABI = rentalContractABI;
                contractAddress = rentalContractAddress;
                methodName = 'activateAgreement'; // Updated method name for rental
                break;
            case 'Subscription Agreement':
                contractABI = subscriptionContractABI;
                contractAddress = subscriptionContractAddress;
                methodName = 'activateSubscription'; // Updated method name for subscription
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid agreement type'
                });
        }
        
        const contract = new web3.eth.Contract(contractABI, contractAddress);

        // Get agreement details from blockchain
        let blockchainAgreement;
        let amountInWei;
        
        if (agreement.type === 'Subscription Agreement') {
            blockchainAgreement = await contract.methods.subscriptions(agreement.blockchainId).call();
            amountInWei = blockchainAgreement.feeAmount || web3.utils.toWei(agreement.amount.toString(), 'ether');
        } else if (agreement.type === 'Rental Agreement') {
            blockchainAgreement = await contract.methods.agreements(agreement.blockchainId).call();
            amountInWei = blockchainAgreement.securityDeposit || web3.utils.toWei(agreement.securityDeposit.toString(), 'ether');
        } else {
            blockchainAgreement = await contract.methods.agreements(agreement.blockchainId).call();
            amountInWei = web3.utils.toWei(agreement.amount.toString(), 'ether');
        }

        // Prepare funding transaction
        const txData = {
            from: address,
            to: contractAddress,
            value: amountInWei,
            data: contract.methods[methodName](agreement.blockchainId).encodeABI(),
            gas: await contract.methods[methodName](agreement.blockchainId).estimateGas({ 
                from: address,
                value: amountInWei
            })
        };

        // Sign and send transaction
        const txReceipt = await signTransaction(txData);

        // Update database - change status to "Active" instead of "Funded"
        await Agreement.updateOne(
            { _id: agreementId },
            { 
                status: "Active",  // Changed from "Funded" to "Active"
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
                : 'Funding failed: ' + error.message
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

// agreementRoutes.js
router.post('/:agreementId/accept', async (req, res) => {
    try {
      const agreement = await Agreement.findByIdAndUpdate(
        req.params.agreementId,
        { status: "Accepted" },
        { new: true }
      ).populate('creator counterparty');
  
      if (!agreement) {
        return res.status(404).json({ success: false, message: 'Agreement not found' });
      }
  
      res.json({ 
        success: true,
        agreement // Return the updated agreement
      });
      
    } catch (error) {
      console.error('Accept error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
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