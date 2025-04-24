// src/components/Login.jsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import RoleSelection from './RoleSelection';

// ABI for our deployed contract
const contractABI = [
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "_roleId",
                "type": "uint8"
            }
        ],
        "name": "registerUser",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "enum MedChainRoles.Role",
                "name": "role",
                "type": "uint8"
            }
        ],
        "name": "RoleAssigned",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_user",
                "type": "address"
            }
        ],
        "name": "getUserRole",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_user",
                "type": "address"
            }
        ],
        "name": "isRegistered",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "registeredUsers",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "userRoles",
        "outputs": [
            {
                "internalType": "enum MedChainRoles.Role",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Address of our deployed contract on Hedera Testnet
const contractAddress = "0x55A28270D65b0cEC232249e2422F548e0d9e521D";

function Login({ onLogin }) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [walletData, setWalletData] = useState(null);

    const connectWallet = async () => {
        setIsConnecting(true);
        setError('');

        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
            }

            // Request account access - ethers v6 syntax
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            // Create contract instance
            const contract = new ethers.Contract(contractAddress, contractABI, provider);

            // Check if user is registered
            const isRegistered = await contract.isRegistered(address);

            if (isRegistered) {
                // Existing user - get their role
                const roleId = await contract.getUserRole(address);
                const roleName = getRoleName(roleId);

                // Login successful with existing role
                onLogin({
                    address,
                    provider,
                    signer,
                    role: roleName
                });
            } else {
                // New user - need to select role
                setIsNewUser(true);
                setWalletData({
                    address,
                    provider,
                    signer
                });
            }

        } catch (err) {
            console.error("Connection error:", err);
            setError(err.message || "Failed to connect wallet");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleRoleSelect = async (roleId) => {
        try {
            const contract = new ethers.Contract(
                contractAddress,
                contractABI,
                walletData.signer
            );

            // Register user with selected role
            const tx = await contract.registerUser(roleId);
            await tx.wait();

            // Login successful with new role
            onLogin({
                ...walletData,
                role: getRoleName(roleId)
            });

        } catch (err) {
            console.error("Role selection error:", err);
            setError(err.message || "Failed to register role");
        }
    };

    // Helper function to convert role ID to name
    const getRoleName = (roleId) => {
        switch (Number(roleId)) {
            case 1: return 'patient';
            case 2: return 'doctor';
            case 3: return 'insurance-provider';
            default: return 'unknown';
        }
    };

    if (isNewUser && walletData) {
        return <RoleSelection onRoleSelect={handleRoleSelect} />;
    }

    return (
        <div className="login-container">
            <h1>MedChain</h1>
            <h2>Secure Medical Records on Hedera</h2>

            <div className="login-card">
                <h3>Connect Your Wallet</h3>
                <p>Please connect your MetaMask wallet to access the dashboard</p>

                <button
                    className="connect-button"
                    onClick={connectWallet}
                    disabled={isConnecting}
                >
                    {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                </button>

                {error && <p className="error-message">{error}</p>}
            </div>
        </div>
    );
}

export default Login;
