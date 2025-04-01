const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const User = require('../models/User');
const Agreement = require('../models/Agreement');
const { decrypt } = require('../utils/encryption');
const { contractABI, contractAddress } = require('../contracts');

// Create Agreement
router.post('/create', async (req, res) => {
    try {
        const { 
            title, 
            type,
            terms, 
            creatorid,  // This should be from req.user.userId
            counterpartyid,
            amount, 
            startDate, 
            dueDate 
        } = req.body;
        
        // Get counterparty wallet address
        const counterparty = await User.findById(counterpartyid);
        if (!counterparty) {
            return res.status(400).json({ 
                success: false, 
                message: 'Counterparty not found' 
            });
        }
        
        const counterpartyAddress = decrypt(counterparty.walletAddress);
        
        if (!counterpartyAddress || !amount || !dueDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Get creator info from middleware
        const creatorId = req.user.userId;
        const creatorWallet = req.user.walletAddress;

        // Create provider using environment RPC endpoint
        const provider = new ethers.JsonRpcProvider(req.session.rpcEndpoint || "https://zksync-sepolia.core.chainstack.com/d9aac8dbec2c4eca4805e00092c4680c");
        
        // Create a wallet instance for the authenticated user
        // In a real app, you'd use the user's Web3Auth wallet to sign transactions
        // For demo purposes we're using ethers wallet
        const wallet = new ethers.Wallet(process.env.DEMO_PRIVATE_KEY, provider);
        
        // Contract interaction
        const contract = new ethers.Contract(
            contractAddress,
            contractABI,
            wallet
        );

        const amountInWei = ethers.parseEther(amount.toString());
        const deadlineTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
        
        const gasEstimate = await contract.createAgreement.estimateGas(
            counterpartyAddress,
            amountInWei,
            deadlineTimestamp
        );

        const tx = await contract.createAgreement(
            counterpartyAddress,
            amountInWei,
            deadlineTimestamp,
            { gasLimit: gasEstimate + BigInt(100000) }
        );

        const receipt = await tx.wait();
        
        // Extract agreement ID from events
        let agreementId = null;
        if (receipt.logs) {
            const iface = new ethers.Interface(contractABI);
            for (const log of receipt.logs) {
                try {
                    const parsed = iface.parseLog({ topics: log.topics, data: log.data });
                    if (parsed?.name === "AgreementCreated") {
                        agreementId = parsed.args.agreementId.toString();
                        break;
                    }
                } catch (e) {
                    console.log("Log parsing error:", e);
                }
            }
        }

        if (!agreementId) {
            throw new Error("Failed to extract agreement ID");
        }
        
        // Save to database
        const newAgreement = new Agreement({
            blockchainId: agreementId,
            title,
            type,
            creator: creatorId,
            counterparty: counterpartyId,
            counterpartyAddress,
            amount,
            startDate: new Date(startDate),
            dueDate: new Date(dueDate),
            terms,
            status: "Created",
            txHash: tx.hash
        });

        await newAgreement.save();

        res.status(201).json({
            success: true,
            id: newAgreement._id,
            agreementId,
            txHash: tx.hash
        });

    } catch (error) {
        console.error('Agreement creation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Agreement creation failed'
        });
    }
})
// Fund Agreement
router.post('/:agreementId/fund', async (req, res) => {
    try {
        const { agreementId } = req.params;
        const creatorId = req.user.userId;
        
        // Create provider using environment RPC endpoint
        const provider = new ethers.JsonRpcProvider(req.session.rpcEndpoint || "https://zksync-sepolia.core.chainstack.com/d9aac8dbec2c4eca4805e00092c4680c");
        
        // For signing transactions, you need a wallet with a private key
        // WARNING: This is a simplification. In production, NEVER handle private keys on the server
        // For demo purposes, we'll create a random wallet (NOT SUITABLE FOR PRODUCTION)
        const randomWallet = ethers.Wallet.createRandom().connect(provider);

        const contract = new ethers.Contract(
            contractAddress,
            contractABI,
            randomWallet
        );

        const blockchainAgreement = await contract.agreements(agreementId);
        const amountInWei = blockchainAgreement.amount;

        const tx = await contract.fundAgreement(agreementId, {
            value: amountInWei
        });

        await tx.wait();

        // Update database
        await Agreement.updateOne(
            { blockchainId: agreementId },
            { 
                status: "Funded",
                fundedAt: new Date(),
                fundTxHash: tx.hash
            }
        );

        res.json({
            success: true,
            txHash: tx.hash
        });

    } catch (error) {
        console.error('Funding error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Funding failed'
        });
    }
});

// Get Agreements
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

// Get Single Agreement
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