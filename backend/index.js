require("dotenv").config();
console.log("Client ID:", process.env.WEB3AUTH_CLIENT_ID);
global.crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Web3Auth } = require("@web3auth/single-factor-auth");
const { CHAIN_NAMESPACES } = require("@web3auth/base");
const { EthereumPrivateKeyProvider } = require("@web3auth/ethereum-provider");
const connectDB = require("./config/db"); // Import Mongoose connection
const User = require("./models/User");
const agreementRoutes = require('./routes/agreementRoutes');

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5001;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("Server running on port 5001");
    });
});
module.exports = app;


app.get("/", (req, res) => {
    res.send("Web3Auth backend is running");
});

app.use('/api/agreements', agreementRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const clientId = process.env.WEB3AUTH_CLIENT_ID;

// Chain configuration for zkSync Era Testnet
const chainConfig = {
    chainId: "0x12c", // zkSync Era Testnet Chain ID
    displayName: "ZKSync Era sepolia",
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    tickerName: "Ethereum",
    ticker: "ETH",
    decimals: 18,
    rpcTarget: "https://zksync-sepolia.core.chainstack.com/d9aac8dbec2c4eca4805e00092c4680c", // zkSync Era Testnet RPC
    blockExplorerUrl: "https://goerli.explorer.zksync.io", // zkSync Era Testnet Explorer
};

// Initialize Ethereum private key provider
const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig },
});

// Initialize Web3Auth
const web3authSfa = new Web3Auth({
    clientId,
    web3AuthNetwork: "testnet", // Use "mainnet" for production
    privateKeyProvider,
    chainConfig: chainConfig,
});

// Initialize Web3Auth with the private key provider
web3authSfa.init(privateKeyProvider);

// Parse JWT token to extract user information
const parseToken = (token) => {
    try {
        const base64Url = token.split(".")[1]; // Get the payload part of the token
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(Buffer.from(base64, "base64").toString());
        return payload;
    } catch (err) {
        console.error("Error parsing token:", err);
        return null;
    }
};

// Handle user login
let flag = 0 //to check for connection
app.post("/login", async (req, res) => {
    try {
        const { idToken } = req.body; // Assume the frontend sends the ID token
        if (!idToken) {
            return res.status(400).json({ error: "ID token is required" });
        }

        // Parse the token to get user email
        const { email } = parseToken(idToken);
        if (!email) {
            return res.status(400).json({ error: "Invalid ID token" });
        }

        // Connect the user to Web3Auth
        await web3authSfa.connect({
            verifier: "google-auth-web3auth",
            verifierId: email,
            idToken: idToken,
        });

        const { Web3 } = require('web3');
        const provider = await web3authSfa.provider;
        if (!provider) {
            throw new Error("Provider not initialized");
        }
        const web3 = new Web3(provider);

        const getBalance = async () => {
            try {
                if (!web3) {
                    console.log("Web3 is not initialized yet");
                    return;
                }

                const accounts = await web3.eth.getAccounts();
                if (accounts.length === 0) {
                    console.log("No accounts found. Make sure your provider is connected.");
                    return;
                }

                const balance = await web3.eth.getBalance(accounts[0]);
                const walletAddress = accounts[0];

                let existingUser = await User.findOne({ email });

                if (existingUser) {
                    flag = 1
                    console.log("User already exists:", existingUser);
                    const user = existingUser;
                }
                else {
                    const user = new User({ email, walletAddress });
                    await user.save();
                }
                console.log("Balance:", web3.utils.fromWei(balance, "ether"), "ETH ", "wallet-address: ", walletAddress);
            } catch (err) {
                console.error("Error getting balance:", err);
            }
        };
        getBalance();



        // Return success response
        if (flag) {
            res.status(200).json({ message: "Login successful", email });
        }
        else if (!flag) {
            res.status(200).json({ message: "Successfully created account", email });
        }
    } catch (err) {
        if (flag) {
            console.log("Signed in and connected")
        }
        else if (!flag) {
            console.error("Error during login:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    }
});

